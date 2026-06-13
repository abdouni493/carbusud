import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Users, 
  Plus, 
  Calendar, 
  Clock, 
  X, 
  CheckCircle2, 
  User, 
  Fuel, 
  Database,
  TrendingUp,
  FileText,
  Printer,
  ChevronDown,
  Check,
  AlertCircle,
  ArrowRight,
  Droplets,
  DollarSign,
  UserCog,
  Sun,
  Sunset,
  Moon,
  Store,
  Building2,
  MoreVertical,
  Pencil,
  Eye as EyeIcon,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  LoaderCircle,
  History,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, newId } from "@/src/lib/utils";
import { useAppState, useAppDispatch, Brigade, Pump, Tank, Pompiste } from "../store/AppContext";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import BrigadeDetailModal from "../components/BrigadeDetailModal";
import BrigadeAccountingModal from "../components/BrigadeAccountingModal";
import BrigadeFicheModal from "../components/BrigadeFicheModal";

const Brigades = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { brigades, pumps, tanks, pompistes, brigadeChefs, settings, currentUserRole, currentUserId, currentUserName, workers, gerants, magasinWorkers, tracks, pumpNozzles = [], brigadeAccountings = [], shopSales = [], clients = [] } = useAppState();
  const dispatch = useAppDispatch();

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedBrigade, setSelectedBrigade] = useState<Brigade | null>(null);
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'print'>('info');
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [activateIndices, setActivateIndices] = useState<Record<string, number>>({});
  const [activateTankLevels, setActivateTankLevels] = useState<Record<string, { degrees: number; liters: number }>>({});
  const [deactivateTankLevels, setDeactivateTankLevels] = useState<Record<string, { degrees: number; liters: number }>>({});
  const [activateStep, setActivateStep] = useState(1);
  const [deactivateStep, setDeactivateStep] = useState(1);

  // Per-nozzle activation state
  const [activateNozzleIndices, setActivateNozzleIndices] = useState<Record<string, number>>({});
  const [activeNozzleIds, setActiveNozzleIds] = useState<string[]>([]);
  const [nozzleIndexErrors, setNozzleIndexErrors] = useState<Record<string, boolean>>({});
  const [nozzleShake, setNozzleShake] = useState<Record<string, boolean>>({});

  // Per-nozzle cloture state
  const [endNozzleIndices, setEndNozzleIndices] = useState<Record<string, number>>({});
  const [nozzleEndErrors, setNozzleEndErrors] = useState<Record<string, boolean>>({});
  const [tankEndErrors, setTankEndErrors] = useState<Record<string, boolean>>({});

  // Creation wizard extra state
  const [pompistePresence, setPompistePresence] = useState<Record<string, 'present' | 'absent'>>({});
  const [pisteOverrides, setPisteOverrides] = useState<Record<string, string>>({});
  const [chefAsPompiste, setChefAsPompiste] = useState(false);
  const [chefPisteId, setChefPisteId] = useState('');
  const [canReactivate, setCanReactivate] = useState(false);

  // Accounting modal state
  const [showAccountingModal, setShowAccountingModal] = useState(false);

  // Fiche modal state
  const [showFicheModal, setShowFicheModal] = useState(false);

  // Filters
  const [filterChef, setFilterChef] = useState('');
  const [filterPompiste, setFilterPompiste] = useState('');
  const [searchId, setSearchId] = useState('');
  
  const [step, setStep] = useState(1);
  const [chefId, setChefId] = useState("");
  const [selectedPompisteIds, setSelectedPompisteIds] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<'Matin' | 'Soir' | 'Nuit'>('Matin');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");
  const [startIndices, setStartIndices] = useState<Record<string, number>>({});
  const [startTankLevels, setStartTankLevels] = useState<Record<string, { degrees: number; liters: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const shiftTimes = {
    'Matin': { start: '06:00', end: '14:00' },
    'Soir': { start: '14:00', end: '22:00' },
    'Nuit': { start: '22:00', end: '06:00' }
  };

  useEffect(() => {
    const times = shiftTimes[shiftType];
    setStartTime(times.start);
    setEndTime(times.end);
  }, [shiftType]);

  const activePompisteIds = useMemo(() => {
    const activeBrigades = brigades.filter(b => b.status === 'Ouverte');
    const allActiveIds = activeBrigades.flatMap(b => b.pompisteIds || []);
    return new Set(allActiveIds);
  }, [brigades]);
  const [endIndices, setEndIndices] = useState<Record<string, number>>({});
  const [endTankLevels, setEndTankLevels] = useState<Record<string, { degrees: number; liters: number }>>({});
  const [pompisteEncaissements, setPompisteEncaissements] = useState<Record<string, { cash: number; bons: number; cheques: number; pricePerLiter: number }>>({});

  const activeBrigade = brigades.find(b => b.status === "Ouverte");

  const [elapsed, setElapsed] = useState("00:00:00");
   
  useEffect(() => {
    if (!activeBrigade?.startTimestamp) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeBrigade.startTimestamp!).getTime();
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBrigade]);

  // Helper: Convert degrees to liters
  const convertDegreesToLiters = (tankId: string, degrees: number) => {
    const table = settings.conversionTables?.[tankId];
    if (!table || table.length === 0) return degrees * 100; // Fallback
    const sorted = [...table].sort((a, b) => a.degree - b.degree);
    const match = sorted.find(row => row.degree >= degrees);
    return match ? match.liters : (sorted.length > 0 ? sorted[sorted.length - 1].liters : 0);
  };

  const handleStartBrigade = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      // Build pompisteAssignments with presence/piste info
      const chef = brigadeChefs.find(c => c.id === chefId);
      const chefPompisteIds = chef?.pompisteIds || [];
      const assignments: Brigade['pompisteAssignments'] = chefPompisteIds.map(pid => ({
        pompisteId: pid,
        trackId: pisteOverrides[pid] || pompistes.find(p => p.id === pid)?.trackId || '',
        present: (pompistePresence[pid] || 'present') === 'present',
        chefActingAsPompiste: false,
      }));
      if (chefAsPompiste && chefId) {
        assignments.push({ pompisteId: chefId, trackId: chefPisteId, present: true, chefActingAsPompiste: true });
      }

      // Only present pompistes in pompisteIds
      const presentIds = chefPompisteIds.filter(pid => (pompistePresence[pid] || 'present') === 'present');

      const newBrigade: Brigade = {
        id: newId(),
        date: shiftDate,
        shift: shiftType,
        chefId: chefId || undefined,
        status: 'Planifiée',
        isActive: false,
        startTimestamp: new Date().toISOString(),
        startTime,
        endTime,
        pompisteIds: presentIds,
        pompisteAssignments: assignments,
        startIndices: {},
        startTankLevels: {},
        startNozzleIndices: {},
        activeNozzleIds: [],
        canReactivate,
      };

      dispatch({ type: 'ADD_BRIGADE', payload: newBrigade });

      // Record absences
      chefPompisteIds.filter(pid => pompistePresence[pid] === 'absent').forEach(pid => {
        const pompiste = pompistes.find(p => p.id === pid);
        if (pompiste) {
          dispatch({
            type: 'UPDATE_POMPISTE',
            payload: {
              ...pompiste,
              absences: [...(pompiste.absences || []), {
                id: newId(),
                date: shiftDate,
                cost: 0,
                description: `Absent brigade ${shiftDate} ${shiftType}`,
                isPaid: false,
              }]
            }
          });
        }
      });

      dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Brigade créée avec succès !" } });
      setShowModal(false);
      resetForm();
      setIsSubmitting(false);
    }, 600);
  };

  const resetForm = () => {
    setStep(1);
    setChefId("");
    setSelectedPompisteIds([]);
    setStartIndices({});
    setStartTankLevels({});
    setShiftType('Matin');
    setShiftDate(new Date().toISOString().split('T')[0]);
    setActionMenuOpen(null);
    setActivateStep(1);
    setDeactivateStep(1);
    setPompistePresence({});
    setPisteOverrides({});
    setChefAsPompiste(false);
    setChefPisteId('');
    setCanReactivate(false);
  };

  const handleSaveEditBrigade = () => {
    if (!editingBrigade) return;
    
    const updatedBrigade: Brigade = {
      ...editingBrigade,
      chefId: chefId || undefined,
      shift: shiftType,
      date: shiftDate,
      startTime,
      endTime
    };

    dispatch({ type: 'UPDATE_BRIGADE', payload: updatedBrigade });
    dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Brigade mise à jour" } });
    setShowEditModal(false);
    setEditingBrigade(null);
    resetForm();
  };

  const handleClotureSubmit = () => {
    if (!activeBrigade) return;

    // 1. Calculate and Update Pompistes Payment Records
    activeBrigade.pompisteIds?.forEach(pid => {
      const data = pompisteBilan[pid];
      if (data && data.decalage !== 0) {
        const pompiste = pompistes.find(p => p.id === pid);
        if (pompiste) {
          const newPayment = {
            date: new Date().toISOString(),
            amount: Math.abs(data.decalage),
            type: (data.decalage > 0 ? "BONUS_DECALAGE" : "RETENUE_DECALAGE") as any
          };
          dispatch({ 
            type: 'UPDATE_POMPISTE', 
            payload: { 
              ...pompiste, 
              paymentRecord: [...(pompiste.paymentRecord || []), newPayment] 
            } 
          });
        }
      }
    });

    // 2. Update Tanks
    Object.entries(endTankLevels).forEach(([tankId, level]: [string, any]) => {
      const tank = tanks.find(t => t.id === tankId);
      if (tank) {
        dispatch({ type: 'UPDATE_TANK', payload: { ...tank, degrees: level.degrees, current: level.liters } });
      }
    });

    // 3. Update Pumps
    Object.entries(endIndices).forEach(([pumpId, index]) => {
      const pump = pumps.find(p => p.id === pumpId);
      if (pump) {
        dispatch({ type: 'UPDATE_PUMP', payload: { ...pump, lastIndex: index, currentBrigadeStartIndex: undefined } });
      }
    });

    // 4. Update Brigade Status
    const closedBrigade: Brigade = {
      ...activeBrigade,
      status: 'Clôturée',
      endIndices,
      endTankLevels,
      pompisteData: pompisteBilan,
      endTimestamp: new Date().toISOString()
    };
    dispatch({ type: 'UPDATE_BRIGADE', payload: closedBrigade });

    dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Brigade clôturée avec succès" } });
    setShowClotureModal(false);
    
    // Suggest seeing the daily report
    if (confirm("Voulez-vous voir la fiche journalière ?")) {
      navigate(`/daily-report?date=${activeBrigade.date}`);
    }
  };

  const activePompistesInBrigade = useMemo(() => {
    if (!activeBrigade) return [];
    return pompistes.filter(p => activeBrigade.pompisteIds?.includes(p.id));
  }, [activeBrigade, pompistes]);

  const activePumpsForCloture = useMemo(() => {
    if (!activeBrigade) return [];
    const trackIds = activePompistesInBrigade.map(p => p.trackId).filter(Boolean);
    return pumps.filter(p => trackIds.includes(p.trackId));
  }, [activeBrigade, activePompistesInBrigade, pumps]);

  const activePumpsForSelection = useMemo(() => {
    const trackIds = pompistes.filter(p => selectedPompisteIds.includes(p.id)).map(p => p.trackId).filter(Boolean);
    return pumps.filter(p => trackIds.includes(p.trackId));
  }, [selectedPompisteIds, pompistes, pumps]);

  const pompisteBilan = useMemo(() => {
    const data: Record<string, any> = {};
    activePompistesInBrigade.forEach(pompiste => {
      const pPumps = activePumpsForCloture.filter(p => p.trackId === pompiste.trackId);
      const litersSold = pPumps.reduce((acc, pump) => {
        const start = activeBrigade?.startIndices?.[pump.id] || 0;
        const end = endIndices[pump.id] || start;
        return acc + (end - start);
      }, 0);

      const enc = pompisteEncaissements[pompiste.id] || { cash: 0, bons: 0, cheques: 0, pricePerLiter: settings.fuelPrices[pPumps[0]?.type] || 0 };
      const theoretical = litersSold * enc.pricePerLiter;
      const totalCollected = enc.cash + enc.bons + enc.cheques;
      const decalage = totalCollected - theoretical;

      data[pompiste.id] = {
        litersSold,
        theoretical,
        collected: { cash: enc.cash, bons: enc.bons, cheques: enc.cheques },
        totalCollected,
        decalage,
        pricePerLiter: enc.pricePerLiter
      };
    });
    return data;
  }, [activeBrigade, activePompistesInBrigade, activePumpsForCloture, endIndices, pompisteEncaissements, settings.fuelPrices]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 italic text-left">
      {activeBrigade && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden shadow-2xl border border-blue-700">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400 rounded-full opacity-5 blur-3xl" />
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-yellow-400/20 backdrop-blur-sm text-yellow-400 rounded-2xl flex items-center justify-center animate-pulse border border-yellow-400/50 shadow-lg shadow-yellow-400/20"><Clock className="w-8 h-8" /></div>
            <div>
              <span className="text-[10px] font-black text-yellow-400 tracking-widest uppercase mb-1 block italic">BRIGADE ACTIVE</span>
              <h2 className="text-3xl font-black italic text-white">{brigadeChefs.find(c => c.id === activeBrigade.chefId)?.name}</h2>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 lg:grid-cols-3 gap-8 text-center md:text-left z-10">
            <div><p className="text-[10px] uppercase text-yellow-300/60 mb-1 italic font-black">Rotation</p><p className="text-xl font-black text-yellow-400">{activeBrigade.date} • {activeBrigade.shift}</p></div>
            <div><p className="text-[10px] uppercase text-yellow-300/60 mb-1 italic font-black">Temps Écoulé</p><p className="text-xl font-black text-yellow-400">{elapsed}</p></div>
            <div><p className="text-[10px] uppercase text-yellow-300/60 mb-1 italic font-black">Agents</p><p className="text-xl font-black text-yellow-400">{activeBrigade.pompisteIds?.length} Actifs</p></div>
          </div>
        </motion.div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-blue-900 uppercase italic tracking-tighter leading-none">
            {currentUserRole === 'gerant' ? 'Brigades - Vue Gérant' : 'Journal des Brigades'}
          </h1>
          <p className="text-slate-500 font-medium mt-2 italic leading-relaxed">
            {currentUserRole === 'gerant' 
              ? 'Historique des brigades et détails des rotations' 
              : 'Historique des rotations et relevés d\'index.'}
          </p>
        </div>
        {(currentUserRole === 'admin' || currentUserRole === 'chef_brigade') && (
          <button onClick={() => { setStep(1); setShowModal(true); }} className="h-14 px-8 bg-gradient-to-r from-[#001f5c] via-[#002d85] to-[#001f5c] text-[#FFB800] border border-blue-900 hover:border-[#FFB800] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-950/20 hover:scale-105 transition-all flex items-center gap-3 italic">
            <Plus className="w-5 h-5 text-[#FFB800]" /> CRÉER NOUVELLE BRIGADE
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="🔍 Rechercher par ID..." value={searchId} onChange={e => setSearchId(e.target.value)}
            className="pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold w-56 focus:border-yellow-400 outline-none transition-colors" />
        </div>
        <select value={filterChef} onChange={e => setFilterChef(e.target.value)}
          className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none bg-white">
          <option value="">Tous les Chefs</option>
          {brigadeChefs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPompiste} onChange={e => setFilterPompiste(e.target.value)}
          className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none bg-white">
          <option value="">Tous les Pompistes</option>
          {pompistes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(filterChef || filterPompiste || searchId) && (
          <button onClick={() => { setFilterChef(''); setFilterPompiste(''); setSearchId(''); }}
            className="text-xs text-red-500 font-bold hover:underline">✕ Effacer filtres</button>
        )}
      </div>

      {/* Vue Gérant — désactivée, gérée par le bloc unifié ci-dessous */}
      {false && (() => {
        const filteredBrigades = [...brigades].reverse().filter(b => {
          if (searchId && !b.id.toLowerCase().includes(searchId.toLowerCase())) return false;
          if (filterChef && b.chefId !== filterChef) return false;
          if (filterPompiste && !b.pompisteIds?.includes(filterPompiste)) return false;
          return true;
        });
        return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrigades.length > 0 ? filteredBrigades.map((b) => {
              const chef = brigadeChefs.find(c => c.id === b.chefId);
              const pompistesList = pompistes.filter(p => b.pompisteIds?.includes(p.id));
              const tanksList = tanks.filter(t => Object.keys(b.startTankLevels || {}).includes(t.id));
              
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-glass p-6 rounded-2xl border border-slate-50 hover:border-primary/30 transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-primary uppercase mb-1">{b.date}</h3>
                      <p className="text-[10px] text-slate-400 font-bold">{b.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter whitespace-nowrap", b.status === "Ouverte" ? "bg-green-100 text-green-700" : b.status === "Planifiée" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>
                        {b.status === "Ouverte" ? "En cours" : b.status}
                      </span>
                      
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === b.id ? null : b.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-300 group-hover:text-primary transition-all"
                          aria-label="Menu"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {actionMenuOpen === b.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              <div className="divide-y divide-slate-100">
                                <button
                                  onClick={() => { setSelectedBrigade(b); setShowDetail(true); setDetailTab('info'); setActionMenuOpen(null); }}
                                  className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                  <EyeIcon className="w-4 h-4" /> Voir Détails
                                </button>
                                <button
                                  onClick={() => { setSelectedBrigade(b); setShowHistoryModal(true); setActionMenuOpen(null); }}
                                  className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                  <History className="w-4 h-4" /> Historique
                                </button>
                                {b.status === 'Clôturée' && (currentUserRole === 'admin' || currentUserRole === 'gerant') && (
                                  <button
                                    onClick={() => { setSelectedBrigade(b); setShowAccountingModal(true); setActionMenuOpen(null); }}
                                    className="w-full px-4 py-3 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                                  >
                                    <DollarSign className="w-4 h-4" /> Comptabilité
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Chef Info */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-xs">
                      {chef?.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700">{chef?.name}</p>
                      <p className="text-[9px] text-slate-400">{b.shift}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3 mb-4">
                    {/* Pompistes */}
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Agents ({pompistesList.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {pompistesList.slice(0, 3).map(p => (
                          <span key={p.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[9px] font-bold">{p.name.split(' ')[0]}</span>
                        ))}
                        {pompistesList.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">+{pompistesList.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Cuves */}
                    {tanksList.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Cuves ({tanksList.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {tanksList.map(t => (
                            <span key={t.id} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">{t.name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shift Info */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Horaires</p>
                        <p className="text-[10px] font-black text-slate-700">{b.startTime} - {b.endTime}</p>
                      </div>
                      {b.pompisteData && (
                        <div className="p-2 bg-slate-50 rounded">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Décalage</p>
                          <p className={cn("text-[10px] font-black", Object.values(b.pompisteData).some((d: any) => d.decalage < 0) ? "text-red-600" : "text-green-600")}>
                            {Object.values(b.pompisteData).reduce((acc: number, d: any) => acc + (d.decalage || 0), 0).toLocaleString()} DZD
                          </p>
                        </div>
                      )}
                    </div>
                  </div>


                </motion.div>
              );
            }) : (
              <div className="col-span-full">
                <EmptyState icon={Users} title="Aucune brigade" description="L'historique est vide pour le moment" />
              </div>
            )}
          </div>
        </motion.div>
        );
      })()}

      {/* Grille de Brigades — toutes les rôles */}
      {(() => {
        const filteredBrigades = [...brigades].reverse().filter(b => {
          if (searchId && !b.id.toLowerCase().includes(searchId.toLowerCase())) return false;
          if (filterChef && b.chefId !== filterChef) return false;
          if (filterPompiste && !b.pompisteIds?.includes(filterPompiste)) return false;
          return true;
        });
        return (
        <div className="space-y-6">
          {filteredBrigades.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBrigades.map((b, index) => {
                const brigadeChef = brigadeChefs.find(c => c.id === b.chefId);
                const pompisteList = pompistes.filter(p => b.pompisteIds?.includes(p.id)) || [];
                const pompisteCount = pompisteList.length;
                
                const getShiftColor = (shift: string) => {
                  switch(shift) {
                    case 'Matin': return 'from-amber-50 to-orange-50';
                    case 'Soir': return 'from-orange-50 to-red-50';
                    case 'Nuit': return 'from-indigo-50 to-blue-50';
                    default: return 'from-slate-50 to-slate-100';
                  }
                };

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    {/* Colored top accent based on status */}
                    <div
                      className={cn(
                        "h-2 absolute top-0 left-0 right-0",
                        {
                          "bg-gradient-to-r from-green-400 to-emerald-400": b.status === 'Ouverte',
                          "bg-gradient-to-r from-blue-400 to-cyan-400": b.status === 'Planifiée',
                          "bg-gradient-to-r from-slate-300 to-slate-200": b.status === 'Clôturée',
                        }
                      )}
                    />

                    <div className="p-5">
                      {/* Header with Brigade ID and Date */}
                      {(() => {
                        const accounting = brigadeAccountings.find(a => a.brigadeId === b.id);
                        return (
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{b.id}</p>
                          <p className="text-2xl font-black text-slate-800 italic">{b.date}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {b.canReactivate && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full">🔄 Réactivable</span>}
                            {accounting?.status === 'completed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded-full">✓ Comptabilisée</span>}
                            {b.status === 'Clôturée' && !accounting && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-black rounded-full">En attente</span>}
                            {accounting?.totalDue && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full">{accounting.totalDue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>}
                          </div>
                        </div>

                        {/* Status badge + Three dots menu */}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap",
                              b.status === "Ouverte"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : b.status === "Planifiée"
                                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                            )}
                          >
                            {b.status === "Ouverte" ? "🔴 En cours" : b.status}
                          </span>

                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === b.id ? null : b.id)}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-300 group-hover:text-primary transition-all"
                              aria-label="Menu"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            <AnimatePresence>
                              {actionMenuOpen === b.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden"
                                >
                                  <div className="divide-y divide-slate-100">
                                    {currentUserRole !== 'gerant' && (
                                      <button
                                        onClick={() => {
                                          setEditingBrigade(b);
                                          setChefId(b.chefId);
                                          setShiftType(b.shift as 'Matin' | 'Soir' | 'Nuit');
                                          setShiftDate(b.date);
                                          setStartTime(b.startTime);
                                          setEndTime(b.endTime);
                                          setShowEditModal(true);
                                          setActionMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                      >
                                        <Pencil className="w-4 h-4" /> Modifier
                                      </button>
                                    )}

                                    <button
                                      onClick={() => { setSelectedBrigade(b); setShowDetail(true); setDetailTab('info'); setActionMenuOpen(null); }}
                                      className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                      <EyeIcon className="w-4 h-4" /> Voir Détails
                                    </button>

                                    <button
                                      onClick={() => { setSelectedBrigade(b); setShowHistoryModal(true); setActionMenuOpen(null); }}
                                      className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                      <History className="w-4 h-4" /> Historique
                                    </button>

                                    {currentUserRole !== 'gerant' && (b.status === 'Planifiée' || (b.status === 'Clôturée' && b.canReactivate)) && (
                                      <button
                                        onClick={() => {
                                          setSelectedBrigade(b);
                                          setActivateIndices(b.startIndices || {});
                                          const brigadeTrackIds = (b.pompisteAssignments || []).filter(a => a.present).map(a => a.trackId);
                                          const displayPumps = brigadeTrackIds.length > 0
                                            ? pumps.filter(p => brigadeTrackIds.includes(p.trackId))
                                            : pumps;
                                          const relevantNozzles = pumpNozzles.filter(n => displayPumps.some(p => p.id === n.pumpId));
                                          setActiveNozzleIds(relevantNozzles.map(n => n.id));
                                          const initIndices: Record<string, number> = {};
                                          relevantNozzles.forEach(n => { initIndices[n.id] = n.lastIndex; });
                                          setActivateNozzleIndices(initIndices);
                                          setNozzleIndexErrors({});
                                          setShowActivateModal(true);
                                          setActionMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors"
                                      >
                                        <Play className="w-4 h-4" /> Activer
                                      </button>
                                    )}

                                    {currentUserRole !== 'gerant' && b.status === 'Ouverte' && (
                                      <button
                                        onClick={() => {
                                          setSelectedBrigade(b);
                                          setEndIndices(b.startIndices || {});
                                          setShowDeactivateModal(true);
                                          setActionMenuOpen(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors"
                                      >
                                        <Pause className="w-4 h-4" /> Désactiver
                                      </button>
                                    )}

                                    {b.status === 'Clôturée' && (currentUserRole === 'admin' || currentUserRole === 'gerant') && (
                                      <button
                                        onClick={() => { setSelectedBrigade(b); setShowAccountingModal(true); setActionMenuOpen(null); }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors"
                                      >
                                        <DollarSign className="w-4 h-4" /> Comptabilité
                                      </button>
                                    )}

                                    <button
                                      onClick={() => { setSelectedBrigade(b); setShowFicheModal(true); setActionMenuOpen(null); }}
                                      className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                      <FileText className="w-4 h-4" /> Fiche
                                    </button>

                                    {currentUserRole !== 'gerant' && (
                                      <button
                                        onClick={() => { setSelectedBrigade(b); setShowConfirmDelete(true); setActionMenuOpen(null); }}
                                        className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" /> Supprimer
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                        );
                      })()}

                      {/* Shift pill with time */}
                      {(() => {
                        const config = {
                          Matin: { icon: Sun, className: "text-amber-600 bg-amber-50 border-amber-200", label: "Matin" },
                          Soir: { icon: Sunset, className: "text-orange-600 bg-orange-50 border-orange-200", label: "Soir" },
                          Nuit: { icon: Moon, className: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "Nuit" },
                        }[(b.shift as any) || 'Matin'] || { icon: Sun, className: "text-amber-600 bg-amber-50", label: b.shift };
                        const Icon = (config as any).icon as any;
                        return (
                          <div className="flex items-center gap-2 mb-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border",
                                (config as any).className
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {(config as any).label}
                            </span>
                            {b.startTime && b.endTime && (
                              <span className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                                🕐 {b.startTime}–{b.endTime}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Chef Section */}
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">👨‍💼 Chef de Brigade</p>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-blue-500 text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md">
                            {brigadeChef?.name ? brigadeChef.name[0] : '—'}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-slate-800 text-sm">{brigadeChef?.name || 'Non assigné'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{brigadeChef?.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Pompistes Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">⛽ Pompistes ({pompisteCount})</p>
                        </div>
                        {pompisteList.length > 0 ? (
                          <div className="space-y-2">
                            {pompisteList.map(p => (
                              <div key={p.id} className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:shadow-sm transition-all">
                                <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {p.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                                  <p className="text-[9px] text-slate-500">{p.phone || 'N/A'}</p>
                                </div>
                                {p.status === 'Actif' && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">✓ Actif</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold">Aucun pompiste assigné</p>
                          </div>
                        )}
                      </div>

                      {/* Stats row for clôturée brigades */}
                      {b.status === 'Clôturée' && b.pompisteData && (
                        <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                          <div className="p-3 bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                            <p className="text-[9px] font-black text-slate-500 uppercase">Agents</p>
                            <p className="text-lg font-black text-slate-700 mt-1">{Object.keys(b.pompisteData).length}</p>
                          </div>
                          <div className="p-3 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                            <p className="text-[9px] font-black text-blue-600 uppercase">Litres</p>
                            <p className="text-lg font-black text-blue-700 mt-1">{Number(Object.values(b.pompisteData).reduce((s: any, d: any) => s + d.litersSold, 0)).toFixed(0)}L</p>
                          </div>
                          <div className="p-3 bg-gradient-to-b from-green-50 to-green-100 rounded-xl border border-green-200">
                            <p className="text-[9px] font-black text-green-600 uppercase">Montant</p>
                            <p className="text-lg font-black text-green-700 mt-1">{((Object.values(b.pompisteData).reduce((s: any, d: any) => s + (d.totalCollected || 0), 0) as number) / 1000).toFixed(0)}K</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="card-glass overflow-hidden shadow-xl border-slate-50">
              <EmptyState
                icon={Users}
                title="Aucune brigade"
                description="L'historique est vide pour le moment"
                {...(currentUserRole !== 'gerant' ? { actionLabel: "Ouvrir Brigade", action: () => { setStep(1); setShowModal(true); } } : {})}
              />
            </div>
          )}
        </div>
        );
      })()}

      {/* Edit Brigade Modal */}
      <AnimatePresence>
        {showEditModal && editingBrigade && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 italic text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-3xl rounded-[2.5rem] relative z-10 overflow-hidden flex flex-col h-auto shadow-2xl border border-blue-200 max-h-[90vh]">
              {/* Header - Blue gradient matching create modal */}
              <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">✏️ Modifier Brigade</h3>
                  <p className="text-[11px] text-blue-200 font-bold mt-1">Mise à jour des informations</p>
                </div>
                <button onClick={() => { setShowEditModal(false); setEditingBrigade(null); }} className="hover:bg-blue-700/50 p-2 rounded-lg transition-all"><X className="w-6 h-6" /></button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Step 1: Chef & Shift Selection */}
                <div className="space-y-4">
                  {/* Chef Selection */}
                  <div className="space-y-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                    <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">👨‍💼 Chef de Brigade</label>
                    <select 
                      className="input-field h-12 font-black italic border-2 border-blue-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" 
                      value={chefId} 
                      onChange={e => setChefId(e.target.value)}
                    >
                      <option value="">Sélectionner un chef...</option>
                      {brigadeChefs.filter(c => c.status === 'Actif').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shift Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">⏰ Type de Shift</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Matin', 'Soir', 'Nuit'].map((type: any) => (
                        <motion.button
                          key={type}
                          onClick={() => setShiftType(type)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn("py-3 rounded-xl border-2 transition-all font-black text-xs uppercase",
                            shiftType === type
                              ? "border-yellow-400 bg-gradient-to-br from-blue-900/10 to-yellow-400/10 shadow-md"
                              : "border-slate-200 hover:border-yellow-300 bg-white hover:bg-slate-50"
                          )}
                        >
                          {type === 'Matin' && '🌅'} {type === 'Soir' && '🌆'} {type === 'Nuit' && '🌙'} {type}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: Date & Times */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  {/* Date */}
                  <div className="space-y-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                    <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">📅 Date</label>
                    <input 
                      type="date" 
                      className="input-field h-12 font-black italic border-2 border-blue-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" 
                      value={shiftDate}
                      onChange={e => setShiftDate(e.target.value)}
                    />
                  </div>

                  {/* Horaires */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                      <label className="text-[10px] font-black text-green-700 uppercase tracking-widest pl-1">🕐 Heure de Début</label>
                      <input 
                        type="time" 
                        className="input-field h-12 font-black italic border-2 border-green-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" 
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-red-200">
                      <label className="text-[10px] font-black text-red-700 uppercase tracking-widest pl-1">🕕 Heure de Fin</label>
                      <input 
                        type="time" 
                        className="input-field h-12 font-black italic border-2 border-red-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" 
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pompistes Selection */}
                {chefId && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">👥 Pompistes de {brigadeChefs.find(c => c.id === chefId)?.name}</label>
                      <span className="text-xs font-black text-white bg-gradient-to-r from-blue-900 to-blue-800 px-3 py-1 rounded-full">{selectedPompisteIds.length} sélectionné(s)</span>
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const chef = brigadeChefs.find(c => c.id === chefId);
                        const chefPompisteIds = chef?.pompisteIds || [];
                        const chefPompistes = pompistes.filter(p => chefPompisteIds.includes(p.id) && p.status === 'Actif');
                        
                        if (chefPompistes.length === 0) {
                          return (
                            <div className="p-4 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                              <p className="text-sm text-slate-400 italic">Aucun pompiste assigné</p>
                            </div>
                          );
                        }

                        return chefPompistes.map((p) => (
                          <motion.button
                            key={p.id}
                            onClick={() => setSelectedPompisteIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                            whileHover={{ scale: 1.01 }}
                            className={cn(
                              "p-3 rounded-xl border-2 transition-all flex items-center justify-between",
                              selectedPompisteIds.includes(p.id)
                                ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md"
                                : "border-slate-200 hover:border-yellow-300 bg-white hover:bg-yellow-50"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white flex-shrink-0", selectedPompisteIds.includes(p.id) ? "bg-gradient-to-br from-yellow-500 to-yellow-600" : "bg-gradient-to-br from-slate-600 to-slate-700")}>
                                {p.name[0]}
                              </div>
                              <div className="text-left">
                                <p className={cn("text-xs font-black", selectedPompisteIds.includes(p.id) ? "text-yellow-900" : "text-slate-800")}>{p.name}</p>
                                <p className="text-[9px] text-slate-500">Piste: {p.trackId || 'N/A'}</p>
                              </div>
                            </div>
                            <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0", selectedPompisteIds.includes(p.id) ? "bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-500" : "border-slate-300 bg-white")}>
                              {selectedPompisteIds.includes(p.id) && <Check className="w-2 h-2 text-yellow-600" />}
                            </div>
                          </motion.button>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => { setShowEditModal(false); setEditingBrigade(null); }}
                  className="flex-[1] py-3 px-4 bg-white text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-100 transition-all border-2 border-slate-200 hover:border-slate-300"
                >
                  ✕ Annuler
                </button>
                <button
                  onClick={handleSaveEditBrigade}
                  className="flex-[2] bg-gradient-to-r from-blue-900 to-blue-800 hover:shadow-lg text-white font-black uppercase tracking-widest rounded-xl py-3 transition-all transform hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 border border-blue-700"
                >
                  ✓ Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal */}
      <AnimatePresence>
        {showModal && (() => {
          const chef = brigadeChefs.find(c => c.id === chefId);
          const chefPompisteIds = chef?.pompisteIds || [];
          const chefPompistes = pompistes.filter(p => chefPompisteIds.includes(p.id) && p.status === 'Actif');
          const presentCount = chefPompisteIds.filter(pid => (pompistePresence[pid] || 'present') === 'present').length;
          const absentCount = chefPompisteIds.filter(pid => pompistePresence[pid] === 'absent').length;
          const anyAbsent = absentCount > 0;

          // Auto-fill from last brigade
          const lastBrigade = [...brigades]
            .filter(b => b.endTime)
            .sort((a, b) => new Date(b.endTimestamp || b.date).getTime() - new Date(a.endTimestamp || a.date).getTime())[0];

          const STEPS = [
            { num: 1, label: 'Chef', icon: UserCog },
            { num: 2, label: 'Pompistes', icon: Users },
            { num: 3, label: 'Planning', icon: Calendar },
          ];

          const canGoNext = step === 1 ? !!chefId :
                            step === 2 ? (presentCount > 0 || chefAsPompiste) : true;

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl rounded-[2.5rem] relative z-10 overflow-hidden flex flex-col h-[92vh] shadow-2xl border border-slate-100">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest italic">➕ Nouvelle Brigade</h3>
                    <p className="text-[10px] text-yellow-300 font-bold mt-1">Création d'une nouvelle brigade d'équipe</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-all"><X className="w-6 h-6" /></button>
                </div>

                {/* Progress Bar */}
                <div className="px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center justify-between">
                    {STEPS.map((s, idx) => {
                      const Icon = s.icon;
                      const isActive = step === s.num;
                      const isCompleted = step > s.num;
                      return (
                        <React.Fragment key={s.num}>
                          <div className="flex flex-col items-center flex-1">
                            <motion.div
                              initial={false}
                              animate={{ scale: isActive ? 1.1 : 1 }}
                              className={cn("w-9 h-9 rounded-full flex items-center justify-center font-black text-xs mb-1.5 transition-all", isActive || isCompleted ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-blue-900 shadow-lg" : "bg-slate-100 text-slate-400")}
                            >
                              {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </motion.div>
                            <p className="text-[9px] font-bold text-center text-slate-500">{s.label}</p>
                          </div>
                          {idx < 2 && (
                            <motion.div
                              initial={false}
                              animate={{ background: step > s.num ? '#FFB800' : '#E5E7EB' }}
                              className="h-1.5 flex-1 mx-2 mb-5 rounded-full"
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                  {/* STEP 1: Chef */}
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">📋 Chefs de Brigade Disponibles</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {brigadeChefs.filter(c => c.status === 'Actif' || c.status === 'En service').map(c => (
                          <motion.button
                            key={c.id}
                            onClick={() => { setChefId(c.id); setPompistePresence({}); }}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className={cn("p-4 rounded-2xl border-2 transition-all text-left", chefId === c.id ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-md" : "border-slate-200 hover:border-yellow-400 bg-white hover:bg-slate-50")}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-11 h-11 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0", chefId === c.id ? "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white" : "bg-gradient-to-br from-blue-900 to-blue-800 text-yellow-300")}>
                                {c.name[0]}
                              </div>
                              <div className="flex-1">
                                <p className={cn("text-sm font-black", chefId === c.id ? "text-yellow-900" : "text-slate-800")}>{c.name}</p>
                                <p className="text-[10px] text-slate-500">Tél: {c.phone || 'N/A'}</p>
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full inline-block mt-1">✓ {c.status}</span>
                              </div>
                              {chefId === c.id && <CheckCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                      {brigadeChefs.filter(c => c.status === 'Actif' || c.status === 'En service').length === 0 && (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-sm text-slate-400 italic">Aucun chef disponible</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 2: Pompistes — Présent/Absent + Piste override */}
                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">👥 Pompistes de {chef?.name}</label>
                        <div className="flex gap-2 text-[10px] font-black">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">{presentCount} présent(s)</span>
                          {absentCount > 0 && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">{absentCount} absent(s)</span>}
                        </div>
                      </div>

                      {chefPompistes.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-sm text-slate-400 italic">Aucun pompiste assigné à ce chef</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chefPompistes.map(p => {
                            const presence = pompistePresence[p.id] || 'present';
                            const isAbsent = presence === 'absent';
                            const defaultTrack = tracks.find(t => t.id === p.trackId);
                            return (
                              <div key={p.id} className={cn("p-4 rounded-2xl border-2 transition-all", isAbsent ? "border-red-200 bg-red-50/50 opacity-75" : "border-slate-200 bg-white")}>
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0", isAbsent ? "bg-red-400" : "bg-gradient-to-br from-blue-700 to-blue-900")}>
                                    {p.name[0]}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-slate-800">{p.name}</p>
                                    <p className="text-[10px] text-slate-500">Piste par défaut: {defaultTrack?.name || 'N/A'}</p>
                                  </div>
                                  {/* Présent/Absent toggle */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setPompistePresence(prev => ({ ...prev, [p.id]: 'present' }))}
                                      className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", presence === 'present' ? "bg-green-500 text-white shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-green-100")}
                                    >Présent</button>
                                    <button
                                      onClick={() => setPompistePresence(prev => ({ ...prev, [p.id]: 'absent' }))}
                                      className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", presence === 'absent' ? "bg-red-500 text-white shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-red-100")}
                                    >Absent</button>
                                  </div>
                                </div>
                                {/* Piste override (only if present) */}
                                {!isAbsent && (
                                  <div className="mt-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Piste pour cette brigade</label>
                                    <select
                                      value={pisteOverrides[p.id] || p.trackId || ''}
                                      onChange={e => setPisteOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                      <option value="">— Piste par défaut ({defaultTrack?.name || 'N/A'}) —</option>
                                      {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Chef as pompiste option */}
                      {anyAbsent && (
                        <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={chefAsPompiste}
                              onChange={e => { setChefAsPompiste(e.target.checked); if (!e.target.checked) setChefPisteId(''); }}
                              className="w-4 h-4 accent-blue-700"
                            />
                            <span className="text-sm font-black text-blue-900">Le chef de brigade travaille comme pompiste</span>
                          </label>
                          {chefAsPompiste && (
                            <div className="mt-3">
                              <label className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1 block">Piste du chef</label>
                              <select
                                value={chefPisteId}
                                onChange={e => setChefPisteId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                <option value="">Sélectionner une piste...</option>
                                {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 3: Planning — Time + Date + auto-fill */}
                  {step === 3 && (() => {
                    const autoFillBanner = lastBrigade && lastBrigade.endTime
                      ? `⏱ Basé sur la dernière brigade (fin: ${lastBrigade.endTime})`
                      : null;
                    return (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        {autoFillBanner && (
                          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] font-bold text-blue-700 italic">
                            {autoFillBanner}
                          </div>
                        )}
                        {/* Date */}
                        <div className="space-y-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                          <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">📅 Date de la Brigade</label>
                          <input type="date" className="input-field h-12 font-black italic border-2 border-blue-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
                        </div>

                        {/* Shift Type */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest pl-1">⏰ Type de Quart</label>
                          <div className="grid grid-cols-3 gap-3">
                            {([{ type: 'Matin' as const, icon: Sun }, { type: 'Soir' as const, icon: Sunset }, { type: 'Nuit' as const, icon: Moon }]).map(({ type, icon: Icon }) => (
                              <motion.button key={type} onClick={() => setShiftType(type)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className={cn("py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2", shiftType === type ? "border-yellow-400 bg-gradient-to-br from-blue-900/10 to-yellow-400/10 shadow-md" : "border-slate-200 hover:border-yellow-300 bg-white hover:bg-slate-50")}>
                                <Icon className={cn("w-5 h-5", shiftType === type ? "text-blue-900" : "text-slate-400")} />
                                <span className={cn("text-xs font-black uppercase tracking-widest italic", shiftType === type ? "text-blue-900" : "text-slate-400")}>{type}</span>
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Time Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                            <label className="text-[10px] font-black text-green-700 uppercase tracking-widest pl-1">🕐 Début</label>
                            <input type="time" className="input-field h-12 font-black italic border-2 border-green-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" value={startTime} onChange={e => setStartTime(e.target.value)} />
                          </div>
                          <div className="space-y-2 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-red-200">
                            <label className="text-[10px] font-black text-red-700 uppercase tracking-widest pl-1">🕕 Fin</label>
                            <input type="time" className="input-field h-12 font-black italic border-2 border-red-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" value={endTime} onChange={e => setEndTime(e.target.value)} />
                          </div>
                        </div>

                        {/* canReactivate toggle */}
                        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 mt-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-amber-900">Autoriser la réactivation après clôture</p>
                              <p className="text-[10px] text-amber-700">Permettre d'activer à nouveau cette brigade une fois clôturée</p>
                            </div>
                            <button type="button" onClick={() => setCanReactivate(v => !v)}
                              className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0", canReactivate ? "bg-amber-500" : "bg-slate-300")}>
                              <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow", canReactivate ? "left-7" : "left-1")} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gradient-to-r from-slate-50 to-yellow-50 border-t border-slate-200 flex gap-4 shrink-0">
                  {step > 1 && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(s => s - 1)} disabled={isSubmitting}
                      className="flex-1 text-[10px] font-black uppercase text-blue-900 italic hover:text-blue-800 transition-colors disabled:opacity-50 border-2 border-blue-900 rounded-lg py-3 hover:bg-white bg-gradient-to-r from-white to-yellow-50">
                      ← Retour
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (step === 3) {
                        handleStartBrigade();
                      } else {
                        if (step === 2) {
                          // initialize presence for chef's pompistes if not set
                          const chef2 = brigadeChefs.find(c => c.id === chefId);
                          const ids = chef2?.pompisteIds || [];
                          setPompistePresence(prev => {
                            const next = { ...prev };
                            ids.forEach(pid => { if (!next[pid]) next[pid] = 'present'; });
                            return next;
                          });
                        }
                        if (step === 2 && lastBrigade?.endTime) {
                          const h = parseInt(lastBrigade.endTime.split(':')[0]);
                          setStartTime(lastBrigade.endTime);
                          if (h >= 6 && h < 14) setShiftType('Matin');
                          else if (h >= 14 && h < 22) setShiftType('Soir');
                          else setShiftType('Nuit');
                        }
                        setStep(s => s + 1);
                      }
                    }}
                    disabled={isSubmitting || !canGoNext}
                    className="flex-[2] bg-gradient-to-r from-blue-900 to-blue-800 hover:shadow-lg text-white font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg py-3 transition-all transform hover:-translate-y-0.5 text-[10px]"
                  >
                    {isSubmitting ? (<><LoaderCircle className="w-4 h-4 animate-spin" />Traitement...</>) : step < 3 ? (<>Suivant <ArrowRight className="w-4 h-4" /></>) : 'Créer la Brigade'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* History Modal - Gérant View */}
      <AnimatePresence>
        {showHistoryModal && selectedBrigade && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistoryModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl rounded-[2rem] relative z-10 overflow-hidden flex flex-col h-[90vh] shadow-2xl">
              {/* Header */}
              <div className="p-8 bg-gradient-to-r from-primary to-blue-600 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-widest italic mb-1">Historique Brigade</h3>
                  <p className="text-[10px] text-white/80">{selectedBrigade.date} • {selectedBrigade.shift}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)}><X className="w-7 h-7" /></button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                {/* Brigade Info */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Informations Brigade</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Chef</p>
                      <p className="text-sm font-black text-slate-700">{brigadeChefs.find(c => c.id === selectedBrigade.chefId)?.name}</p>
                      <p className="text-[9px] text-slate-500 mt-2">{selectedBrigade.id}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Horaires</p>
                      <p className="text-sm font-black text-slate-700">{selectedBrigade.startTime} - {selectedBrigade.endTime}</p>
                      <p className="text-[9px] text-slate-500 mt-2">{selectedBrigade.shift}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Status</p>
                      <span className={cn("px-3 py-1 rounded-full text-[9px] font-bold uppercase inline-block", selectedBrigade.status === "Ouverte" ? "bg-green-100 text-green-700" : selectedBrigade.status === "Planifiée" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>
                        {selectedBrigade.status === "Ouverte" ? "En cours" : selectedBrigade.status}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Pompistes */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Agents ({selectedBrigade.pompisteIds?.length || 0})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pompistes.filter(p => selectedBrigade.pompisteIds?.includes(p.id)).map(p => (
                      <div key={p.id} className="p-4 border border-slate-100 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center font-bold text-primary">
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{p.name}</p>
                          <p className="text-[9px] text-slate-500">Piste: {p.trackId || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Pistolets */}
                {(() => {
                  const hasNozzleData = Object.keys(selectedBrigade.startNozzleIndices || {}).length > 0;
                  const brigadeNozzles = hasNozzleData
                    ? pumpNozzles.filter(n => selectedBrigade.startNozzleIndices![n.id] !== undefined)
                    : [];
                  if (brigadeNozzles.length === 0) return null;
                  return (
                    <section className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Index Pistolets</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brigadeNozzles.map(n => {
                          const pump = pumps.find(p => p.id === n.pumpId);
                          const startIdx = selectedBrigade.startNozzleIndices![n.id];
                          const endIdx = selectedBrigade.endNozzleIndices?.[n.id];
                          const liters = endIdx !== undefined ? endIdx - startIdx : null;
                          return (
                            <div key={n.id} className="p-4 border border-slate-100 rounded-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", n.status === 'Actif' ? 'bg-green-400' : 'bg-slate-300')} />
                                <p className="text-sm font-bold text-slate-700">{n.name}</p>
                                {pump && <span className="text-[9px] text-slate-400 uppercase ml-auto">{pump.name} · {pump.type}</span>}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[9px]">
                                <div className="bg-blue-50 p-2 rounded">
                                  <p className="text-slate-400 font-bold uppercase mb-1">Début</p>
                                  <p className="font-black text-blue-600 tabular-nums">{startIdx.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded">
                                  <p className="text-slate-400 font-bold uppercase mb-1">Fin</p>
                                  <p className="font-black text-slate-700 tabular-nums">{endIdx !== undefined ? endIdx.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : 'En cours'}</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                  <p className="text-slate-400 font-bold uppercase mb-1">Vendus</p>
                                  <p className="font-black text-green-700 tabular-nums">{liters !== null ? `${liters.toFixed(2)} L` : '—'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })()}

                {/* Cuves */}
                {tanks.length > 0 && (
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Cuves</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tanks.filter(t => Object.keys(selectedBrigade.startTankLevels || {}).includes(t.id)).map(t => {
                        const startLevel = selectedBrigade.startTankLevels?.[t.id];
                        const endLevel = selectedBrigade.endTankLevels?.[t.id];
                        return (
                          <div key={t.id} className="p-4 border border-slate-100 rounded-xl">
                            <p className="text-sm font-bold text-slate-700 mb-3">{t.name}</p>
                            <div className="grid grid-cols-2 gap-3 text-[9px]">
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-slate-400 font-bold uppercase mb-1">Début</p>
                                <p className="font-black text-blue-600">{startLevel?.liters || 0} L</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded">
                                <p className="text-slate-400 font-bold uppercase mb-1">Fin</p>
                                <p className="font-black text-slate-700">{endLevel?.liters || 0} L</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Décalages */}
                {selectedBrigade.pompisteData && (
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Résumé Financier</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedBrigade.pompisteData).map(([pompisteId, data]: [string, any]) => {
                        const pompiste = pompistes.find(p => p.id === pompisteId);
                        return (
                          <div key={pompisteId} className="p-4 border-l-4 border-primary bg-slate-50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-bold text-slate-700">{pompiste?.name}</p>
                              <span className={cn("text-sm font-black", data.decalage < 0 ? "text-red-600" : "text-green-600")}>
                                {data.decalage.toLocaleString()} DZD
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-600">
                              <div>Théorique: <span className="font-bold">{data.theoretical.toLocaleString()} DZD</span></div>
                              <div>Collecté: <span className="font-bold">{data.totalCollected.toLocaleString()} DZD</span></div>
                              <div>Litres: <span className="font-bold">{data.litersSold.toLocaleString()} L</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 bg-slate-50 border-t flex gap-4 shrink-0 shadow-inner">
                <button onClick={() => window.print()} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg font-bold text-[10px] uppercase hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> Imprimer
                </button>
                <button onClick={() => setShowHistoryModal(false)} className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-bold text-[10px] uppercase hover:bg-primary/90 transition-colors">
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cloture Modal */}
      <AnimatePresence>
        {showClotureModal && activeBrigade && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClotureModal(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-4xl rounded-[2rem] relative z-10 overflow-hidden flex flex-col h-[90vh] shadow-2xl">
                <div className="p-8 bg-red-500 text-white flex justify-between items-center shrink-0">
                   <h3 className="font-black text-xs uppercase tracking-widest italic">Clôture Administrative de Brigade</h3>
                   <button onClick={() => setShowClotureModal(false)}><X className="w-7 h-7" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                   <section className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic border-b pb-2">Index de Fin</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {activePumpsForCloture.map(pump => (
                           <div key={pump.id} className="p-5 bg-slate-50 rounded-2xl space-y-3">
                              <div className="flex justify-between items-center italic"><span className="font-black text-primary uppercase text-xs">{pump.name}</span><span className="text-[9px] text-slate-400">Début: {(activeBrigade.startIndices?.[pump.id] || 0).toLocaleString()} L</span></div>
                              <input type="number" className="input-field h-12 font-black italic bg-white" placeholder="Index Fin" 
                                 value={endIndices[pump.id] || ""} onChange={e => setEndIndices({...endIndices, [pump.id]: parseFloat(e.target.value)})} />
                              <p className="text-[10px] font-black text-primary text-right italic uppercase">Débité : {( (endIndices[pump.id] || 0) - (activeBrigade.startIndices?.[pump.id] || 0) ).toLocaleString()} L</p>
                           </div>
                         ))}
                      </div>
                   </section>
                   <section className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic border-b pb-2">Bilan Encaissements</h4>
                      {activePompistesInBrigade.map(p => (
                        <div key={p.id} className="p-8 border-2 border-slate-50 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-8 hover:border-primary/10 transition-all italic">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-primary text-secondary rounded-xl flex items-center justify-center font-black">{p.name[0]}</div><span className="font-black text-primary uppercase">{p.name}</span></div>
                              <div className="p-4 bg-slate-50 rounded-xl"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Théorique</p><p className="text-lg font-black text-primary">{pompisteBilan[p.id]?.theoretical.toLocaleString()} DZD</p></div>
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                              <input type="number" className="input-field h-10 font-bold" placeholder="Espèces" value={pompisteEncaissements[p.id]?.cash || ""} onChange={e => setPompisteEncaissements({...pompisteEncaissements, [p.id]: {...(pompisteEncaissements[p.id] || {cash:0,bons:0,cheques:0,pricePerLiter:0}), cash: parseFloat(e.target.value)}})} />
                              <input type="number" className="input-field h-10 font-bold" placeholder="Bons" value={pompisteEncaissements[p.id]?.bons || ""} onChange={e => setPompisteEncaissements({...pompisteEncaissements, [p.id]: {...(pompisteEncaissements[p.id] || {cash:0,bons:0,cheques:0,pricePerLiter:0}), bons: parseFloat(e.target.value)}})} />
                              <input type="number" className="input-field h-10 font-bold" placeholder="Chèques" value={pompisteEncaissements[p.id]?.cheques || ""} onChange={e => setPompisteEncaissements({...pompisteEncaissements, [p.id]: {...(pompisteEncaissements[p.id] || {cash:0,bons:0,cheques:0,pricePerLiter:0}), cheques: parseFloat(e.target.value)}})} />
                           </div>
                           <div className="flex flex-col justify-center items-end">
                              <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">Écart de caisse</p>
                              <p className={cn("text-2xl font-black italic", (pompisteBilan[p.id]?.decalage || 0) < 0 ? "text-red-500" : "text-green-500")}>{(pompisteBilan[p.id]?.decalage || 0).toLocaleString()} DZD</p>
                           </div>
                        </div>
                      ))}
                   </section>
                </div>
                <div className="p-8 bg-slate-50 border-t flex justify-end shrink-0 shadow-inner">
                   <button onClick={handleClotureSubmit} className="px-10 py-5 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/20">VALIDER & CLÔTURER</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activate Modal — Per-Nozzle */}
      <AnimatePresence>
        {showActivateModal && selectedBrigade && (() => {
          const brigadeTrackIds = (selectedBrigade.pompisteAssignments || []).filter(a => a.present).map(a => a.trackId);
          const brigadePumps = pumps.filter(p => brigadeTrackIds.includes(p.trackId) || (brigadeTrackIds.length === 0 && pumps));
          const displayPumps = brigadePumps.length > 0 ? brigadePumps : pumps;

          const hasErrors = Object.values(nozzleIndexErrors).some(Boolean);

          const doActivate = () => {
            // Build aggregate startIndices per pump from nozzles
            const aggIndices: Record<string, number> = {};
            displayPumps.forEach(pump => {
              const pNozzles = pumpNozzles.filter(n => n.pumpId === pump.id && activeNozzleIds.includes(n.id));
              if (pNozzles.length > 0) {
                aggIndices[pump.id] = Math.max(...pNozzles.map(n => activateNozzleIndices[n.id] ?? n.lastIndex));
              }
            });

            dispatch({ type: 'UPDATE_BRIGADE', payload: {
              ...selectedBrigade,
              status: 'Ouverte',
              isActive: true,
              startTimestamp: new Date().toISOString(),
              startIndices: aggIndices,
              startTankLevels: activateTankLevels,
              startNozzleIndices: activateNozzleIndices,
              activeNozzleIds,
            }});
            Object.entries(aggIndices).forEach(([pumpId, index]) => {
              const pump = pumps.find(p => p.id === pumpId);
              if (pump) dispatch({ type: 'UPDATE_PUMP', payload: { ...pump, currentBrigadeStartIndex: index } });
            });
            Object.entries(activateTankLevels).forEach(([tankId, level]) => {
              const tank = tanks.find(t => t.id === tankId);
              if (tank) dispatch({ type: 'UPDATE_TANK', payload: { ...tank, degrees: (level as any).degrees, current: (level as any).liters } });
            });
            dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: 'Brigade activée avec succès' } });
            setShowActivateModal(false);
            setActivateStep(1);
            setActivateNozzleIndices({});
            setActiveNozzleIds([]);
            setNozzleIndexErrors({});
            setNozzleShake({});
            setActivateTankLevels({});
          };

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 italic text-left">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowActivateModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] border border-slate-100">
                <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 text-yellow-400 rounded-2xl flex items-center justify-center"><Play className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-xl font-black text-yellow-400 uppercase tracking-widest italic">ACTIVATION BRIGADE</h2>
                      <p className="text-blue-200 text-xs font-semibold mt-0.5">{selectedBrigade.date} · {selectedBrigade.shift}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowActivateModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition"><X className="w-6 h-6" /></button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-slate-100 shrink-0">
                  {['Cuves', 'Pistolets'].map((label, idx) => (
                    <button key={label} onClick={() => setActivateStep(idx + 1)}
                      className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all",
                        activateStep === idx + 1 ? "border-b-2 border-yellow-400 text-blue-900 bg-yellow-50" : "text-slate-400 hover:text-slate-600")}>
                      {idx + 1}. {label}
                    </button>
                  ))}
                </div>

                {/* Step 1 — Tank levels */}
                {activateStep === 1 && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tanks.map(tank => (
                        <div key={tank.id} className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-800 text-yellow-400 rounded-xl flex items-center justify-center"><Droplets className="w-5 h-5" /></div>
                            <div><p className="font-black text-blue-900">{tank.name}</p><p className="text-[10px] text-slate-500">{tank.type} · Actuel: {tank.current.toLocaleString()} L</p></div>
                          </div>
                          <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 block">Degrés (°)</label>
                          <input type="number" step="0.1" className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                            value={activateTankLevels[tank.id]?.degrees || ''}
                            onChange={e => { const deg = parseFloat(e.target.value) || 0; setActivateTankLevels(prev => ({ ...prev, [tank.id]: { degrees: deg, liters: convertDegreesToLiters(tank.id, deg) } })); }} />
                          <div className="px-4 py-2 bg-blue-100 rounded-xl font-black text-blue-900 text-sm">{(activateTankLevels[tank.id]?.liters || 0).toLocaleString()} L</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2 — Per-nozzle */}
                {activateStep === 2 && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {displayPumps.map(pump => {
                      const nozzles = pumpNozzles.filter(n => n.pumpId === pump.id);
                      return (
                        <div key={pump.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="px-5 py-3 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center gap-3">
                            <span className="w-8 h-8 bg-yellow-400/20 text-yellow-300 rounded-lg flex items-center justify-center font-black text-sm">{pump.name[0]}</span>
                            <div>
                              <p className="font-black text-white text-sm">{pump.name}</p>
                              <p className="text-[10px] text-blue-200">{pump.type} · {nozzles.length} pistolet(s)</p>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {nozzles.length === 0 ? (
                              <p className="text-center text-slate-400 text-sm py-3">Aucun pistolet configuré</p>
                            ) : nozzles.map(nozzle => {
                              const isActive = activeNozzleIds.includes(nozzle.id);
                              const idx = activateNozzleIndices[nozzle.id] ?? nozzle.lastIndex;
                              const hasErr = nozzleIndexErrors[nozzle.id];
                              const gap = idx - nozzle.lastIndex;
                              return (
                                <motion.div key={nozzle.id}
                                  animate={nozzleShake[nozzle.id] ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
                                  transition={{ duration: 0.4 }}
                                  className={cn("p-4 rounded-xl border-2 transition-all", hasErr ? "border-red-400 bg-red-50" : isActive ? "border-blue-300 bg-white" : "border-slate-200 bg-slate-100 opacity-60")}
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <button
                                      onClick={() => {
                                        setActiveNozzleIds(prev => isActive ? prev.filter(id => id !== nozzle.id) : [...prev, nozzle.id]);
                                        if (!isActive) setActivateNozzleIndices(prev => ({ ...prev, [nozzle.id]: nozzle.lastIndex }));
                                      }}
                                      className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex-shrink-0", isActive ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500 hover:bg-green-100")}
                                    >{isActive ? '● Actif' : '○ Inactif'}</button>
                                    <div className="flex-1">
                                      <p className="font-black text-slate-800 text-sm">{nozzle.name}</p>
                                      <p className="text-[10px] text-slate-500">Dernier index: <span className="font-black">{nozzle.lastIndex.toLocaleString()}</span> L</p>
                                    </div>
                                    {isActive && gap !== 0 && (
                                      <span className={cn("px-2 py-1 rounded-lg text-[10px] font-black", gap > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                                        Décalage: {gap > 0 ? '+' : ''}{gap.toFixed(2)} L
                                      </span>
                                    )}
                                  </div>
                                  {isActive && (
                                    <>
                                      <label className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1 block">Index de Départ</label>
                                      <input type="number" step="0.01"
                                        className={cn("w-full px-4 py-2.5 border-2 rounded-xl font-bold outline-none focus:ring-2", hasErr ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-blue-300 bg-white focus:ring-blue-400")}
                                        value={idx}
                                        onChange={e => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setActivateNozzleIndices(prev => ({ ...prev, [nozzle.id]: val }));
                                          const err = val < nozzle.lastIndex;
                                          setNozzleIndexErrors(prev => ({ ...prev, [nozzle.id]: err }));
                                          if (err) { setNozzleShake(prev => ({ ...prev, [nozzle.id]: true })); setTimeout(() => setNozzleShake(prev => ({ ...prev, [nozzle.id]: false })), 500); }
                                        }}
                                      />
                                      {hasErr && <p className="text-red-600 text-[10px] font-black mt-1">⚠ L'index ne peut pas être inférieur à {nozzle.lastIndex} L</p>}
                                    </>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                  {activateStep === 2 && <button onClick={() => setActivateStep(1)} className="flex-1 text-[10px] font-black uppercase text-slate-600 border-2 border-slate-300 rounded-xl py-3 hover:bg-slate-100 italic">← Retour</button>}
                  {activateStep === 1 && <button onClick={() => setActivateStep(2)} className="flex-1 text-[10px] font-black uppercase text-blue-900 border-2 border-blue-900 rounded-xl py-3 hover:bg-blue-50 italic">Suivant →</button>}
                  {activateStep === 2 && (
                    <button onClick={doActivate} disabled={hasErrors}
                      className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-500 disabled:opacity-50 hover:shadow-lg text-white font-black uppercase tracking-widest rounded-xl py-3 transition-all transform hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2 italic">
                      <Play className="w-4 h-4" /> ACTIVER LA BRIGADE
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Deactivate/Cloture Modal */}
      <AnimatePresence>
        {showDeactivateModal && selectedBrigade && (() => {
          const brigadeTrackIds = (selectedBrigade.pompisteAssignments || []).filter(a => a.present).map(a => a.trackId);
          const displayPumps = brigadeTrackIds.length > 0 ? pumps.filter(p => brigadeTrackIds.includes(p.trackId)) : pumps;
          const brigadeActiveNozzles = selectedBrigade.activeNozzleIds && selectedBrigade.activeNozzleIds.length > 0
            ? pumpNozzles.filter(n => selectedBrigade.activeNozzleIds!.includes(n.id))
            : pumpNozzles.filter(n => displayPumps.some(p => p.id === n.pumpId) && n.status === 'Actif');

          const hasTankErrors = Object.values(tankEndErrors).some(Boolean);
          const hasNozzleEndErrors = Object.values(nozzleEndErrors).some(Boolean);

          // Money summary
          const totalRevenue = brigadeActiveNozzles.reduce((sum, nozzle) => {
            const start = selectedBrigade.startNozzleIndices?.[nozzle.id] ?? (selectedBrigade.startIndices?.[pumpNozzles.find(n=>n.id===nozzle.id)?.pumpId||''] || 0);
            const end = endNozzleIndices[nozzle.id] ?? start;
            const liters = Math.max(0, end - start);
            const pump = pumps.find(p => p.id === nozzle.pumpId);
            const price = settings.fuelPrices[pump?.type || 'SUPER'] || 0;
            return sum + liters * price;
          }, 0);

          const doCloture = () => {
            // Build aggregate endIndices per pump
            const aggEnd: Record<string, number> = {};
            displayPumps.forEach(pump => {
              const pNozzles = brigadeActiveNozzles.filter(n => n.pumpId === pump.id);
              if (pNozzles.length > 0) {
                aggEnd[pump.id] = Math.max(...pNozzles.map(n => endNozzleIndices[n.id] ?? (selectedBrigade.startNozzleIndices?.[n.id] ?? n.lastIndex)));
              }
            });

            // Update active nozzles' lastIndex
            brigadeActiveNozzles.forEach(nozzle => {
              const endIdx = endNozzleIndices[nozzle.id] ?? nozzle.lastIndex;
              dispatch({ type: 'UPDATE_NOZZLE', payload: { ...nozzle, lastIndex: endIdx } });
            });

            // Update pumps
            Object.entries(aggEnd).forEach(([pumpId, index]) => {
              const pump = pumps.find(p => p.id === pumpId);
              if (pump) dispatch({ type: 'UPDATE_PUMP', payload: { ...pump, lastIndex: index, currentBrigadeStartIndex: undefined } });
            });

            // Update tanks
            Object.entries(deactivateTankLevels).forEach(([tankId, level]) => {
              const tank = tanks.find(t => t.id === tankId);
              if (tank) dispatch({ type: 'UPDATE_TANK', payload: { ...tank, degrees: (level as any).degrees, current: (level as any).liters } });
            });

            dispatch({ type: 'UPDATE_BRIGADE', payload: {
              ...selectedBrigade,
              status: 'Clôturée',
              isActive: false,
              endIndices: aggEnd,
              endNozzleIndices,
              endTankLevels: deactivateTankLevels,
              endTimestamp: new Date().toISOString(),
            }});

            dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: 'Brigade clôturée avec succès' } });
            setShowDeactivateModal(false);
            setDeactivateStep(1);
            setEndNozzleIndices({});
            setEndIndices({});
            setDeactivateTankLevels({});
            setNozzleEndErrors({});
            setTankEndErrors({});
          };

          const CLOTURE_STEPS = ['Cuves', 'Pistolets', 'Résumé'];

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 italic text-left">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeactivateModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh] border border-slate-100">
                <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 text-yellow-400 rounded-2xl flex items-center justify-center"><Pause className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-xl font-black text-yellow-400 uppercase tracking-widest italic">CLÔTURE BRIGADE</h2>
                      <p className="text-blue-200 text-xs font-semibold mt-0.5">{selectedBrigade.date} · {selectedBrigade.shift}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDeactivateModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition"><X className="w-6 h-6" /></button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-slate-100 shrink-0">
                  {CLOTURE_STEPS.map((label, idx) => (
                    <button key={label} onClick={() => setDeactivateStep(idx + 1)}
                      className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all",
                        deactivateStep === idx + 1 ? "border-b-2 border-orange-400 text-blue-900 bg-orange-50" : "text-slate-400 hover:text-slate-600")}>
                      {idx + 1}. {label}
                    </button>
                  ))}
                </div>

                {/* Step 1 — End tank levels */}
                {deactivateStep === 1 && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tanks.map(tank => {
                        const startL = selectedBrigade.startTankLevels?.[tank.id]?.liters || 0;
                        const endL = deactivateTankLevels[tank.id]?.liters || 0;
                        const hasErr = tankEndErrors[tank.id];
                        return (
                          <motion.div key={tank.id}
                            animate={hasErr ? { x: [0, -8, 8, -8, 0] } : { x: 0 }} transition={{ duration: 0.4 }}
                            className={cn("p-5 rounded-2xl border-2", hasErr ? "border-red-400 bg-red-50" : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200")}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-800 text-yellow-400 rounded-xl flex items-center justify-center"><Droplets className="w-5 h-5" /></div>
                              <div>
                                <p className="font-black text-blue-900">{tank.name}</p>
                                <p className="text-[10px] text-slate-500">{tank.type} · Début brigade: <span className="font-black">{startL.toLocaleString()} L</span></p>
                              </div>
                            </div>
                            <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1 block">Degrés de fin (°)</label>
                            <input type="number" step="0.1"
                              className={cn("w-full px-4 py-3 border-2 rounded-xl font-bold text-lg outline-none focus:ring-2 mb-2", hasErr ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-orange-300 bg-white focus:ring-orange-400")}
                              value={deactivateTankLevels[tank.id]?.degrees || ''}
                              onChange={e => {
                                const deg = parseFloat(e.target.value) || 0;
                                const liters = convertDegreesToLiters(tank.id, deg);
                                const err = liters > startL && startL > 0;
                                setTankEndErrors(prev => ({ ...prev, [tank.id]: err }));
                                setDeactivateTankLevels(prev => ({ ...prev, [tank.id]: { degrees: deg, liters } }));
                              }} />
                            <div className={cn("px-4 py-2 rounded-xl font-black text-sm flex items-center justify-between", hasErr ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700")}>
                              <span>{endL.toLocaleString()} L</span>
                              {startL > 0 && endL > 0 && <span>Sorti: {(startL - endL).toFixed(0)} L</span>}
                            </div>
                            {hasErr && <p className="text-red-600 text-[10px] font-black mt-1">⚠ Le niveau de fin ne peut pas dépasser le niveau de début ({startL.toLocaleString()} L)</p>}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2 — Per-nozzle end indices + cuve comparison */}
                {deactivateStep === 2 && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {displayPumps.map(pump => {
                      const nozzles = brigadeActiveNozzles.filter(n => n.pumpId === pump.id);
                      const tank = tanks.find(t => t.id === pump.tankId);
                      // Cuve comparison
                      const cuveStart = selectedBrigade.startTankLevels?.[pump.tankId]?.liters || 0;
                      const cuveEnd = deactivateTankLevels[pump.tankId]?.liters || 0;
                      const cuveDiff = cuveStart - cuveEnd;
                      const nozzleTotal = nozzles.reduce((s, n) => {
                        const start = selectedBrigade.startNozzleIndices?.[n.id] ?? n.lastIndex;
                        const end = endNozzleIndices[n.id] ?? start;
                        return s + Math.max(0, end - start);
                      }, 0);
                      const ecart = cuveDiff - nozzleTotal;
                      const price = settings.fuelPrices[pump.type] || 0;

                      return (
                        <div key={pump.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="px-5 py-3 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center gap-3">
                            <span className="w-8 h-8 bg-yellow-400/20 text-yellow-300 rounded-lg flex items-center justify-center font-black text-sm">{pump.name[0]}</span>
                            <div className="flex-1">
                              <p className="font-black text-white text-sm">{pump.name}</p>
                              <p className="text-[10px] text-blue-200">{pump.type}{tank ? ` · Cuve: ${tank.name}` : ''}</p>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {nozzles.map(nozzle => {
                              const startIdx = selectedBrigade.startNozzleIndices?.[nozzle.id] ?? nozzle.lastIndex;
                              const endIdx = endNozzleIndices[nozzle.id] ?? startIdx;
                              const hasErr = nozzleEndErrors[nozzle.id];
                              return (
                                <motion.div key={nozzle.id}
                                  animate={hasErr ? { x: [0, -8, 8, -8, 0] } : { x: 0 }} transition={{ duration: 0.4 }}
                                  className={cn("p-4 rounded-xl border-2", hasErr ? "border-red-400 bg-red-50" : "border-orange-200 bg-white")}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="font-black text-slate-800 flex-1">{nozzle.name}</p>
                                    <span className="text-[10px] text-slate-500">Début: <span className="font-black">{startIdx.toLocaleString()} L</span></span>
                                  </div>
                                  <label className="text-[9px] font-black text-orange-700 uppercase tracking-widest mb-1 block">Index de fin</label>
                                  <input type="number" step="0.01"
                                    className={cn("w-full px-4 py-2.5 border-2 rounded-xl font-bold outline-none focus:ring-2 mb-1", hasErr ? "border-red-400 focus:ring-red-300" : "border-orange-300 focus:ring-orange-400")}
                                    value={endIdx}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEndNozzleIndices(prev => ({ ...prev, [nozzle.id]: val }));
                                      setNozzleEndErrors(prev => ({ ...prev, [nozzle.id]: val < startIdx }));
                                    }} />
                                  {hasErr
                                    ? <p className="text-red-600 text-[10px] font-black">⚠ L'index de fin ne peut pas être inférieur à {startIdx}</p>
                                    : <p className="text-green-700 text-[10px] font-black">Litres vendus: {Math.max(0, endIdx - startIdx).toFixed(2)} L</p>
                                  }
                                </motion.div>
                              );
                            })}

                            {/* Cuve vs nozzle comparison */}
                            {cuveStart > 0 && (
                              <div className={cn("p-3 rounded-xl border text-sm", Math.abs(ecart) < 5 ? "bg-green-50 border-green-200" : Math.abs(ecart) < 20 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200")}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Comparaison Cuve vs Pistolets</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div><p className="text-[9px] text-slate-400">Sortie cuve</p><p className="font-black text-slate-700">{cuveDiff.toFixed(1)} L</p></div>
                                  <div><p className="text-[9px] text-slate-400">Pistolets</p><p className="font-black text-slate-700">{nozzleTotal.toFixed(1)} L</p></div>
                                  <div>
                                    <p className="text-[9px] text-slate-400">Écart</p>
                                    <p className={cn("font-black", Math.abs(ecart) < 5 ? "text-green-600" : "text-red-600")}>{ecart > 0 ? '+' : ''}{ecart.toFixed(1)} L</p>
                                    <p className={cn("text-[9px] font-black", ecart < 0 ? "text-red-500" : "text-green-500")}>{(ecart * price).toFixed(0)} DZD</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 3 — Money summary */}
                {deactivateStep === 3 && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    <div className="p-6 bg-gradient-to-r from-blue-900 to-blue-800 rounded-2xl text-center">
                      <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Montant Total à Encaisser</p>
                      <p className="text-4xl font-black text-yellow-400">{totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xl">DZD</span></p>
                    </div>
                    <div className="space-y-3">
                      {displayPumps.map(pump => {
                        const nozzles = brigadeActiveNozzles.filter(n => n.pumpId === pump.id);
                        const price = settings.fuelPrices[pump.type] || 0;
                        const pumpLiters = nozzles.reduce((s, n) => {
                          const start = selectedBrigade.startNozzleIndices?.[n.id] ?? n.lastIndex;
                          return s + Math.max(0, (endNozzleIndices[n.id] ?? start) - start);
                        }, 0);
                        return (
                          <div key={pump.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-black text-slate-800">{pump.name}</p>
                                <p className="text-[10px] text-slate-500">{pump.type} · {price.toLocaleString()} DZD/L</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-blue-900">{pumpLiters.toFixed(2)} L</p>
                                <p className="text-sm font-black text-green-700">{(pumpLiters * price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                  {deactivateStep > 1 && <button onClick={() => setDeactivateStep(s => s - 1)} className="flex-1 text-[10px] font-black uppercase text-slate-600 border-2 border-slate-300 rounded-xl py-3 hover:bg-slate-100 italic">← Retour</button>}
                  {deactivateStep < 3 && (
                    <button onClick={() => setDeactivateStep(s => s + 1)} disabled={deactivateStep === 1 && hasTankErrors}
                      className="flex-1 text-[10px] font-black uppercase text-blue-900 border-2 border-blue-900 rounded-xl py-3 hover:bg-blue-50 italic disabled:opacity-50">Suivant →</button>
                  )}
                  {deactivateStep === 3 && (
                    <button onClick={doCloture} disabled={hasTankErrors || hasNozzleEndErrors}
                      className="flex-[2] bg-gradient-to-r from-orange-600 to-red-600 disabled:opacity-50 hover:shadow-lg text-white font-black uppercase tracking-widest rounded-xl py-3 transition-all transform hover:-translate-y-0.5 text-[10px] flex items-center justify-center gap-2 italic">
                      <Pause className="w-4 h-4" /> CLÔTURER LA BRIGADE
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Brigade Detail Modal — 5 Tabs */}
      <AnimatePresence>
        {showDetail && selectedBrigade && (
          <BrigadeDetailModal
            brigade={selectedBrigade}
            pumps={pumps}
            tanks={tanks}
            pompistes={pompistes}
            brigadeChefs={brigadeChefs}
            pumpNozzles={pumpNozzles}
            tracks={tracks}
            shopSales={shopSales}
            settings={settings}
            accounting={brigadeAccountings.find(a => a.brigadeId === selectedBrigade.id)}
            clients={clients}
            onClose={() => { setShowDetail(false); setSelectedBrigade(null); setDetailTab('info'); }}
          />
        )}
      </AnimatePresence>

      {/* Fiche Modal */}
      <AnimatePresence>
        {showFicheModal && selectedBrigade && (
          <BrigadeFicheModal
            brigade={selectedBrigade}
            pumps={pumps}
            tanks={tanks}
            pompistes={pompistes}
            brigadeChefs={brigadeChefs}
            pumpNozzles={pumpNozzles}
            tracks={tracks}
            shopSales={shopSales}
            settings={settings}
            accounting={brigadeAccountings.find(a => a.brigadeId === selectedBrigade.id)}
            onClose={() => { setShowFicheModal(false); setSelectedBrigade(null); }}
          />
        )}
      </AnimatePresence>

      {/* Accounting Modal */}
      <AnimatePresence>
        {showAccountingModal && selectedBrigade && (
          <BrigadeAccountingModal
            brigade={selectedBrigade}
            pumps={pumps}
            tanks={tanks}
            pompistes={pompistes}
            brigadeChefs={brigadeChefs}
            pumpNozzles={pumpNozzles}
            settings={settings}
            clients={clients}
            tracks={tracks}
            currentUserRole={currentUserRole || 'admin'}
            currentUserName={currentUserName}
            existingAccounting={brigadeAccountings.find(a => a.brigadeId === selectedBrigade.id)}
            dispatch={dispatch}
            onClose={() => { setShowAccountingModal(false); setSelectedBrigade(null); }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Supprimer la Brigade"
        message={`Êtes-vous sûr de vouloir supprimer la brigade ${selectedBrigade?.id} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger={true}
        onConfirm={() => {
          if (selectedBrigade) {
            dispatch({ type: 'DELETE_BRIGADE', payload: selectedBrigade.id });
            dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: 'Brigade supprimée' } });
          }
          setShowConfirmDelete(false);
          setSelectedBrigade(null);
        }}
        onCancel={() => setShowConfirmDelete(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        @media print {
           .fixed { display: none !important; }
           .card-glass { box-shadow: none !important; border: 1px solid #eee !important; }
        }
      `}</style>
    </div>
  );
};

export default Brigades;
