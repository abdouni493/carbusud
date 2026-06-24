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
import { useAppState, useAppDispatch, Brigade, Pump, Tank, Pompiste, Client, BrigadeDecalageAlert, BrigadeAccounting, BrigadeAccountingJustification } from "../store/AppContext";
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
  const [filterDate, setFilterDate] = useState('');        // exact day (YYYY-MM-DD)
  const [filterStartDate, setFilterStartDate] = useState(''); // période — du
  const [filterEndDate, setFilterEndDate] = useState('');     // période — au

  // Shared brigade history filter predicate (id / chef / pompiste / date / période).
  // b.date is 'YYYY-MM-DD' so string comparison is chronologically correct.
  const matchesBrigadeFilters = (b: Brigade) => {
    if (searchId && !b.id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (filterChef && b.chefId !== filterChef) return false;
    if (filterPompiste && !b.pompisteIds?.includes(filterPompiste)) return false;
    const d = b.date || '';
    if (filterDate) {
      if (d !== filterDate) return false;            // exact date overrides the période
    } else {
      if (filterStartDate && d < filterStartDate) return false;
      if (filterEndDate && d > filterEndDate) return false;
    }
    return true;
  };
  const hasActiveFilters = !!(filterChef || filterPompiste || searchId || filterDate || filterStartDate || filterEndDate);
  const clearBrigadeFilters = () => {
    setFilterChef(''); setFilterPompiste(''); setSearchId('');
    setFilterDate(''); setFilterStartDate(''); setFilterEndDate('');
  };
  
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

  // ─── New 7-step wizard state ──────────────────────────────────────────────
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState('06');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('14');
  const [endMinute, setEndMinute] = useState('00');
  // End levels (user-set for end of brigade)
  const [wizEndTankLevels, setWizEndTankLevels] = useState<Record<string, number>>({}); // degrees value
  const [wizEndNozzleIndices, setWizEndNozzleIndices] = useState<Record<string, number>>({});
  // Step 7 comptabilité
  const [pompistePayments, setPompistePayments] = useState<Record<string, number>>({}); // cash given
  const [pompisteJustifications, setPompisteJustifications] = useState<Record<string, Array<{
    id: string;
    type: 'TAG' | 'TPE' | 'CLIENT_CREDIT' | 'CLIENT_AVANCE';
    description: string;
    liters: number;
    amount: number;
    clientId?: string;
    clientName?: string;
    clientRestCredit?: number;
  }>>>({});
  // Step 7 client search / new-client UI (per pompiste)
  const [justifClientSearch, setJustifClientSearch] = useState<Record<string, string>>({});
  const [showNewClientForm, setShowNewClientForm] = useState<string | null>(null);
  const [newClientDraft, setNewClientDraft] = useState({ name: '', phone: '', type: 'PARTICULIER' as Client['type'], paymentMode: 'CASH' as Client['paymentMode'] });

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

  // ─── Wizard derived data ──────────────────────────────────────────────────
  // Brigade pompiste assignments built from the current wizard selections.
  const wizAssignments = useMemo<NonNullable<Brigade['pompisteAssignments']>>(() => {
    const chef = brigadeChefs.find(c => c.id === chefId);
    const chefPompisteIds = chef?.pompisteIds || [];
    const a: NonNullable<Brigade['pompisteAssignments']> = chefPompisteIds.map(pid => ({
      pompisteId: pid,
      trackId: pisteOverrides[pid] || pompistes.find(p => p.id === pid)?.trackId || '',
      present: (pompistePresence[pid] || 'present') === 'present',
      chefActingAsPompiste: false,
    }));
    if (chefAsPompiste && chefId) {
      a.push({ pompisteId: chefId, trackId: chefPisteId, present: true, chefActingAsPompiste: true });
    }
    return a;
  }, [chefId, brigadeChefs, pompistes, pisteOverrides, pompistePresence, chefAsPompiste, chefPisteId]);

  const presentAssignments = useMemo(() => wizAssignments.filter(a => a.present), [wizAssignments]);

  // Step 5 validation: end levels must be coherent.
  const tankEndError = (tankId: string): boolean => {
    const deg = wizEndTankLevels[tankId];
    if (deg === undefined || deg === null) return false;
    const tank = tanks.find(t => t.id === tankId);
    if (!tank) return false;
    return convertDegreesToLiters(tankId, deg) > tank.current + 0.001;
  };
  const nozzleEndError = (nozzleId: string): boolean => {
    const end = wizEndNozzleIndices[nozzleId];
    if (end === undefined || end === null) return false;
    const noz = pumpNozzles.find(n => n.id === nozzleId);
    if (!noz) return false;
    return end < noz.lastIndex - 0.001;
  };
  const hasStep5Errors = useMemo(() => {
    const tankErr = tanks.some(t => tankEndError(t.id));
    const activeNozzles = pumpNozzles.filter(n => n.status === 'Actif');
    const nozErr = activeNozzles.some(n => nozzleEndError(n.id));
    return tankErr || nozErr;
  }, [tanks, pumpNozzles, wizEndTankLevels, wizEndNozzleIndices]);

  // Step 6: décalage comparison per tank (nozzleDiff vs cuveDiff).
  const decalageAlerts = useMemo(() => {
    const posSeuil = settings.decalagePositifSeuil ?? 0;
    const negSeuil = settings.decalageNegatifSeuil ?? 0;
    return tanks.map(tank => {
      const startLiters = tank.current;
      const endDeg = wizEndTankLevels[tank.id];
      const endLiters = endDeg !== undefined ? convertDegreesToLiters(tank.id, endDeg) : startLiters;
      const cuveDecalage = startLiters - endLiters; // liters that left the tank per cuve measurement
      const tankPumps = pumps.filter(p => p.tankId === tank.id);
      const tankNozzles = pumpNozzles.filter(n => n.status === 'Actif' && tankPumps.some(p => p.id === n.pumpId));
      const nozzleDecalage = tankNozzles.reduce((s, n) => s + ((wizEndNozzleIndices[n.id] ?? n.lastIndex) - n.lastIndex), 0);
      const difference = nozzleDecalage - cuveDecalage;
      const price = settings.fuelPrices[tank.type] || 0;
      const amount = Math.abs(difference) * price;
      let type: 'CORRECT' | 'RETOUR_CUVE' | 'VENTE_DIRECTE' = 'CORRECT';
      let suppressed = false;
      if (difference > 0) {
        // pistolets ont débité plus que la cuve n'a baissé → possible retour cuve
        if (difference >= (negSeuil || 0.000001)) { type = 'RETOUR_CUVE'; suppressed = false; }
        else { type = 'CORRECT'; suppressed = true; }
      } else if (difference < 0) {
        // la cuve a baissé plus que les pistolets n'ont débité → possible vente directe
        if (Math.abs(difference) >= (posSeuil || 0.000001)) { type = 'VENTE_DIRECTE'; suppressed = false; }
        else { type = 'CORRECT'; suppressed = true; }
      }
      return { tankId: tank.id, tankName: tank.name, type, nozzleDecalage, cuveDecalage, difference, amount, suppressed };
    });
  }, [tanks, pumps, pumpNozzles, wizEndTankLevels, wizEndNozzleIndices, settings]);

  // Per-tank RETOUR_CUVE liters (returned to tank, not sold) for excluding from sales.
  const retourCuveByTank = useMemo(() => {
    const m: Record<string, number> = {};
    decalageAlerts.forEach(a => { if (a.type === 'RETOUR_CUVE') m[a.tankId] = a.difference; });
    return m;
  }, [decalageAlerts]);

  // Step 7: per-pompiste theoretical sales summary.
  const pompisteSales = useMemo(() => {
    // total active-nozzle throughput per tank (for proportional retour-cuve attribution)
    const tankThroughput: Record<string, number> = {};
    tanks.forEach(tank => {
      const tankPumps = pumps.filter(p => p.tankId === tank.id);
      const tankNozzles = pumpNozzles.filter(n => n.status === 'Actif' && tankPumps.some(p => p.id === n.pumpId));
      tankThroughput[tank.id] = tankNozzles.reduce((s, n) => s + Math.max(0, (wizEndNozzleIndices[n.id] ?? n.lastIndex) - n.lastIndex), 0);
    });
    return presentAssignments.map(a => {
      const track = tracks.find(t => t.id === a.trackId);
      const trackPumps = pumps.filter(p => p.trackId === a.trackId);
      const trackNozzles = pumpNozzles.filter(n => n.status === 'Actif' && trackPumps.some(p => p.id === n.pumpId));
      let liters = trackNozzles.reduce((s, n) => s + ((wizEndNozzleIndices[n.id] ?? n.lastIndex) - n.lastIndex), 0);
      // subtract proportional retour-cuve share
      trackNozzles.forEach(n => {
        const pump = trackPumps.find(p => p.id === n.pumpId);
        const tankId = pump?.tankId;
        if (tankId && retourCuveByTank[tankId] && tankThroughput[tankId] > 0) {
          const nThrough = Math.max(0, (wizEndNozzleIndices[n.id] ?? n.lastIndex) - n.lastIndex);
          liters -= retourCuveByTank[tankId] * (nThrough / tankThroughput[tankId]);
        }
      });
      const fuelType = (trackPumps[0]?.type || 'DIESEL') as Tank['type'];
      const pricePerLiter = settings.fuelPrices[fuelType] || 0;
      const pompisteName = a.chefActingAsPompiste
        ? (brigadeChefs.find(c => c.id === a.pompisteId)?.name || 'Chef')
        : (pompistes.find(p => p.id === a.pompisteId)?.name || '—');
      return {
        pompisteId: a.pompisteId,
        name: pompisteName,
        trackId: a.trackId,
        trackName: track?.name || a.trackId,
        fuelType,
        litersSold: Math.max(0, liters),
        pricePerLiter,
        theoretical: Math.max(0, liters) * pricePerLiter,
      };
    });
  }, [presentAssignments, pumps, pumpNozzles, tanks, tracks, wizEndNozzleIndices, settings, retourCuveByTank, pompistes, brigadeChefs]);

  const handleStartBrigade = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const chef = brigadeChefs.find(c => c.id === chefId);
      const chefPompisteIds = chef?.pompisteIds || [];

      // 1-2. Build datetimes
      const startDatetime = `${startDate}T${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}:00`;
      const endDatetime = `${endDate}T${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}:00`;
      // 3. shiftDate from startDate
      const sDate = startDate;
      // 4. derive shiftType for backward compat
      const sh = parseInt(startHour, 10);
      const sType: 'Matin' | 'Soir' | 'Nuit' = sh >= 6 && sh < 14 ? 'Matin' : sh >= 14 && sh < 22 ? 'Soir' : 'Nuit';

      const assignments = wizAssignments;
      const presentIds = assignments.filter(a => a.present && !a.chefActingAsPompiste).map(a => a.pompisteId);

      // 6-7. start references (current system values)
      const startNozzleIndices: Record<string, number> = {};
      const startTankLevels: Record<string, { degrees: number; liters: number }> = {};
      pumpNozzles.forEach(n => { startNozzleIndices[n.id] = n.lastIndex; });
      tanks.forEach(t => { startTankLevels[t.id] = { degrees: t.degrees, liters: t.current }; });

      // 8-9. end references
      const endNozzleIndices: Record<string, number> = {};
      pumpNozzles.forEach(n => { endNozzleIndices[n.id] = wizEndNozzleIndices[n.id] ?? n.lastIndex; });
      const endTankLevelsObj: Record<string, { degrees: number; liters: number }> = {};
      tanks.forEach(t => {
        const deg = wizEndTankLevels[t.id];
        endTankLevelsObj[t.id] = deg !== undefined
          ? { degrees: deg, liters: convertDegreesToLiters(t.id, deg) }
          : { degrees: t.degrees, liters: t.current };
      });

      const brigadeId = newId();

      // ── Comptabilité: per-pompiste data + justifications ──────────────────
      const pompisteData: NonNullable<Brigade['pompisteData']> = {};
      const decalageSummary: Record<string, any> = {};
      const accJustifications: BrigadeAccountingJustification[] = [];
      const accountingId = newId();
      let totalTheoretical = 0;
      let totalCash = 0;
      let totalJustif = 0;

      pompisteSales.forEach(s => {
        const cash = pompistePayments[s.pompisteId] || 0;
        const justifs = pompisteJustifications[s.pompisteId] || [];
        const justifTotal = justifs.reduce((sum, j) => sum + (j.amount || 0), 0);
        const ecartRestant = s.theoretical - cash - justifTotal;
        totalTheoretical += s.theoretical;
        totalCash += cash;
        totalJustif += justifTotal;

        pompisteData[s.pompisteId] = {
          litersSold: s.litersSold,
          theoretical: s.theoretical,
          collected: { cash, bons: 0, cheques: 0 },
          totalCollected: cash,
          decalage: -ecartRestant, // negative = shortfall
          pricePerLiter: s.pricePerLiter,
        };

        if (Math.abs(ecartRestant) > 0.01) {
          decalageSummary[s.pompisteId] = { money: ecartRestant, liters: 0 };
        }

        // map justifications into accounting justifications
        justifs.forEach(j => {
          if (j.type === 'TAG' || j.type === 'TPE') {
            accJustifications.push({
              id: j.id, accountingId, clientId: '', amount: j.amount,
              justificationType: j.type, clientName: j.description || j.clientName,
              fuelType: s.fuelType, liters: j.liters, pricePerLiter: s.pricePerLiter,
              trackId: s.trackId, pompisteId: s.pompisteId,
            });
          } else {
            accJustifications.push({
              id: j.id, accountingId, clientId: j.clientId || '', amount: j.amount,
              justificationType: 'CLIENT', paymentMode: j.type === 'CLIENT_AVANCE' ? 'AVANCE' : 'CREDIT',
              clientName: j.clientName, fuelType: s.fuelType, liters: j.liters,
              pricePerLiter: s.pricePerLiter, trackId: s.trackId, pompisteId: s.pompisteId,
            });
          }
        });
      });

      const totalRest = totalTheoretical - totalCash - totalJustif;

      // ── Create the brigade (Clôturée) ─────────────────────────────────────
      const newBrigade: Brigade = {
        id: brigadeId,
        date: sDate,
        shift: sType,
        chefId: chefId || undefined,
        status: 'Clôturée',
        isActive: false,
        startDatetime,
        endDatetime,
        startTimestamp: startDatetime,
        endTimestamp: endDatetime,
        startTime: `${startHour.padStart(2, '0')}:${startMinute.padStart(2, '0')}`,
        endTime: `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`,
        pompisteIds: presentIds,
        pompisteAssignments: assignments,
        startIndices: {},
        endIndices: {},
        startTankLevels,
        endTankLevels: endTankLevelsObj,
        startNozzleIndices,
        endNozzleIndices,
        activeNozzleIds: pumpNozzles.filter(n => n.status === 'Actif').map(n => n.id),
        pompisteData,
        canReactivate: false,
        notes: currentUserName ? `Créé par: ${currentUserName}` : undefined,
      };
      dispatch({ type: 'ADD_BRIGADE', payload: newBrigade });

      // 5. Create the linked accounting record (status completed)
      const accounting: BrigadeAccounting = {
        id: accountingId,
        brigadeId,
        totalDue: totalTheoretical,
        cashReceived: totalCash,
        rest: totalRest,
        tankSummary: tanks.map(t => ({ tankId: t.id, name: t.name, start: startTankLevels[t.id], end: endTankLevelsObj[t.id] })),
        nozzleSummary: pumpNozzles.filter(n => n.status === 'Actif').map(n => ({ nozzleId: n.id, start: startNozzleIndices[n.id], end: endNozzleIndices[n.id] })),
        decalageSummary,
        cuveVerifications: {},
        nozzleVerifications: {},
        restAssignedAmount: 0,
        status: 'completed',
        createdBy: currentUserName,
        justifications: accJustifications,
      };
      dispatch({ type: 'ADD_BRIGADE_ACCOUNTING', payload: accounting });

      // 10. Dispatch décalage alerts (non-suppressed) for admin dashboard
      const workersInfo = [
        ...(chef ? [{ id: chef.id, name: chef.name, role: 'chef_brigade' }] : []),
        ...assignments.filter(a => a.present).map(a => {
          const p = pompistes.find(x => x.id === a.pompisteId);
          return { id: a.pompisteId, name: p?.name || (a.chefActingAsPompiste ? (chef?.name || 'Chef') : '—'), role: a.chefActingAsPompiste ? 'chef_brigade' : 'pompiste' };
        }),
      ];
      decalageAlerts.filter(a => !a.suppressed && a.type !== 'CORRECT').forEach(al => {
        const alert: BrigadeDecalageAlert = {
          id: newId(),
          brigadeId,
          brigadeDate: sDate,
          startDatetime,
          endDatetime,
          chefId: chefId || undefined,
          chefName: chef?.name,
          alertType: al.type,
          tankId: al.tankId,
          tankName: al.tankName,
          decalageLiters: Math.abs(al.difference),
          decalageAmount: al.amount,
          workersInfo,
          isDismissed: false,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_BRIGADE_DECALAGE_ALERT', payload: alert });
      });

      // 11. Update tanks to end values
      tanks.forEach(t => {
        const end = endTankLevelsObj[t.id];
        if (end && wizEndTankLevels[t.id] !== undefined) {
          dispatch({ type: 'UPDATE_TANK', payload: { ...t, degrees: end.degrees, current: end.liters } });
        }
      });

      // 12. Update each nozzle lastIndex to end value
      pumpNozzles.forEach(n => {
        if (wizEndNozzleIndices[n.id] !== undefined && wizEndNozzleIndices[n.id] !== n.lastIndex) {
          dispatch({ type: 'UPDATE_NOZZLE', payload: { ...n, lastIndex: wizEndNozzleIndices[n.id] } });
        }
      });

      // Client avance / credit adjustments from justifications
      const allJustifs = Object.values(pompisteJustifications).flat() as Array<{ type: string; clientId?: string; amount: number }>;
      allJustifs.forEach(j => {
        if (!j.clientId) return;
        const client = clients.find(c => c.id === j.clientId);
        if (!client) return;
        if (j.type === 'CLIENT_AVANCE') {
          dispatch({ type: 'UPDATE_CLIENT', payload: { ...client, advanceBalance: Math.max(0, (client.advanceBalance || 0) - j.amount) } });
        } else if (j.type === 'CLIENT_CREDIT') {
          dispatch({ type: 'UPDATE_CLIENT', payload: { ...client, debt: (client.debt || 0) + j.amount } });
        }
      });

      // Record absences for absent pompistes
      assignments.filter(a => !a.present && !a.chefActingAsPompiste).forEach(a => {
        const pompiste = pompistes.find(p => p.id === a.pompisteId);
        if (pompiste) {
          dispatch({
            type: 'UPDATE_POMPISTE',
            payload: {
              ...pompiste,
              absences: [...(pompiste.absences || []), {
                id: newId(), date: sDate, cost: 0,
                description: `Absent brigade ${sDate} ${sType}`, isPaid: false,
              }],
            },
          });
        }
      });

      dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Brigade créée et clôturée avec succès !" } });
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
    // New 7-step wizard resets
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStartHour('06'); setStartMinute('00');
    setEndHour('14'); setEndMinute('00');
    setWizEndTankLevels({});
    setWizEndNozzleIndices({});
    setPompistePayments({});
    setPompisteJustifications({});
    setJustifClientSearch({});
    setShowNewClientForm(null);
    setNewClientDraft({ name: '', phone: '', type: 'PARTICULIER', paymentMode: 'CASH' });
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
      <div className="flex flex-wrap gap-3 items-end">
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

        {/* Date exacte */}
        <div className="flex flex-col">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Date exacte</label>
          <input type="date" value={filterDate}
            onChange={e => { setFilterDate(e.target.value); if (e.target.value) { setFilterStartDate(''); setFilterEndDate(''); } }}
            className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none bg-white disabled:opacity-50" />
        </div>

        {/* Période Du → Au */}
        <div className="flex flex-col">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Période — Du</label>
          <input type="date" value={filterStartDate} disabled={!!filterDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>
        <div className="flex flex-col">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Au</label>
          <input type="date" value={filterEndDate} disabled={!!filterDate} min={filterStartDate || undefined}
            onChange={e => setFilterEndDate(e.target.value)}
            className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-yellow-400 outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>

        {hasActiveFilters && (
          <button onClick={clearBrigadeFilters}
            className="px-3 py-2.5 text-xs text-red-500 font-black hover:underline self-end">✕ Effacer filtres</button>
        )}
      </div>

      {/* Vue Gérant — désactivée, gérée par le bloc unifié ci-dessous */}
      {false && (() => {
        const filteredBrigades = [...brigades].reverse().filter(matchesBrigadeFilters);
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
        const filteredBrigades = [...brigades].reverse().filter(matchesBrigadeFilters);
        return (
        <div className="space-y-6">
          {/* Result count + active date/période summary */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {filteredBrigades.length} brigade{filteredBrigades.length !== 1 ? 's' : ''}{hasActiveFilters ? ' (filtrées)' : ''}
            </p>
            {(filterDate || filterStartDate || filterEndDate) && (
              <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[10px] font-black text-blue-700 uppercase tracking-wider">
                {filterDate
                  ? `📅 ${filterDate}`
                  : `📅 ${filterStartDate || '…'} → ${filterEndDate || '…'}`}
              </span>
            )}
          </div>
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
                    {/* Top accent — app blue/gold scheme */}
                    <div className="h-2 absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-900 via-blue-700 to-yellow-400" />

                    <div className="p-5">
                      {/* Header with Brigade ID and Date */}
                      {(() => {
                        const accounting = brigadeAccountings.find(a => a.brigadeId === b.id);
                        const fmtTime = (iso?: string, fallback?: string) => {
                          if (iso) { const d = new Date(iso); if (!isNaN(d.getTime())) return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
                          return fallback || '';
                        };
                        const startStr = fmtTime(b.startDatetime, b.startTime);
                        const endStr = fmtTime(b.endDatetime, b.endTime);
                        const creator = accounting?.createdBy || (b.notes?.startsWith('Créé par:') ? b.notes.replace('Créé par:', '').trim() : '');
                        return (
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{b.id.slice(0, 8)}</p>
                          <p className="text-2xl font-black text-slate-800 italic">{b.date}</p>
                          {(startStr || endStr) && (
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">🕐 {startStr} → {endStr}</p>
                          )}
                          {creator && <p className="text-[10px] font-bold text-blue-600 mt-0.5">Créé par: {creator}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {accounting?.status === 'completed' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded-full">✓ Comptabilisée</span>}
                            {accounting && accounting.totalDue > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full">{accounting.totalDue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</span>}
                          </div>
                        </div>

                        {/* Status badge + Three dots menu */}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap",
                              b.status === "Clôturée"
                                ? "bg-blue-900 text-yellow-400 border border-blue-700"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            )}
                          >
                            {b.status}
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
                title={hasActiveFilters ? "Aucun résultat" : "Aucune brigade"}
                description={hasActiveFilters ? "Aucune brigade ne correspond aux filtres sélectionnés" : "L'historique est vide pour le moment"}
                {...(hasActiveFilters
                  ? { actionLabel: "✕ Effacer filtres", action: clearBrigadeFilters }
                  : (currentUserRole !== 'gerant' ? { actionLabel: "Ouvrir Brigade", action: () => { setStep(1); setShowModal(true); } } : {}))}
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
            { num: 1, label: 'Chef',        icon: UserCog },
            { num: 2, label: 'Pompistes',   icon: Users },
            { num: 3, label: 'Planning',    icon: Calendar },
            { num: 4, label: 'Niveaux',     icon: Database },
            { num: 5, label: 'Fin',         icon: Droplets },
            { num: 6, label: 'Comparaison', icon: TrendingUp },
            { num: 7, label: 'Comptabilité', icon: DollarSign },
          ];

          // Step 2 piste validation: every present pompiste needs a piste & no two may share one
          const presentTrackUsage: Record<string, number> = {};
          presentAssignments.forEach(a => { if (a.trackId) presentTrackUsage[a.trackId] = (presentTrackUsage[a.trackId] || 0) + 1; });
          const step2MissingPiste = presentAssignments.some(a => !a.trackId);
          const step2DuplicatePiste = Object.values(presentTrackUsage).some(n => n > 1);
          const step2Valid = presentAssignments.length > 0 && !step2MissingPiste && !step2DuplicatePiste;

          const allPaymentsFilled = presentAssignments.length > 0 && presentAssignments.every(a => pompistePayments[a.pompisteId] !== undefined);
          const canGoNext = step === 1 ? !!chefId :
                            step === 2 ? step2Valid :
                            step === 3 ? (!!startDate && !!endDate) :
                            step === 4 ? true :
                            step === 5 ? !hasStep5Errors :
                            step === 6 ? true :
                            step === 7 ? allPaymentsFilled : true;

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-3xl rounded-[2.5rem] relative z-10 overflow-hidden flex flex-col h-[92vh] shadow-2xl border border-slate-100">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest italic">➕ Nouvelle Brigade</h3>
                    <p className="text-[10px] text-yellow-300 font-bold mt-1">Création complète d'une brigade clôturée</p>
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
                          {idx < STEPS.length - 1 && (
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

                      {!step2Valid && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-700">
                          {presentAssignments.length === 0
                            ? "⚠️ Au moins un pompiste présent (avec une piste) est requis pour continuer."
                            : step2MissingPiste
                              ? "⚠️ Chaque pompiste présent doit avoir une piste assignée."
                              : "⚠️ Deux pompistes ne peuvent pas partager la même piste."}
                        </div>
                      )}

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
                                {!isAbsent && (() => {
                                  const effTrack = pisteOverrides[p.id] || p.trackId || '';
                                  const missing = !effTrack;
                                  const duplicate = !!effTrack && presentTrackUsage[effTrack] > 1;
                                  return (
                                  <div className="mt-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Piste pour cette brigade</label>
                                    <select
                                      value={effTrack}
                                      onChange={e => setPisteOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                                      className={cn("w-full px-3 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2", (missing || duplicate) ? "bg-red-50 border-2 border-red-400 focus:ring-red-300" : "bg-slate-50 border border-slate-200 focus:ring-blue-400")}
                                    >
                                      <option value="">— Sélectionner une piste —</option>
                                      {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    {missing && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ Veuillez sélectionner une piste pour ce pompiste</p>}
                                    {duplicate && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ Cette piste est déjà assignée à un autre pompiste</p>}
                                  </div>
                                  );
                                })()}
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
                          {chefAsPompiste && (() => {
                            const missing = !chefPisteId;
                            const duplicate = !!chefPisteId && presentTrackUsage[chefPisteId] > 1;
                            return (
                            <div className="mt-3">
                              <label className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1 block">Piste du chef</label>
                              <select
                                value={chefPisteId}
                                onChange={e => setChefPisteId(e.target.value)}
                                className={cn("w-full px-3 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2", (missing || duplicate) ? "bg-red-50 border-2 border-red-400 focus:ring-red-300" : "bg-white border border-blue-300 focus:ring-blue-400")}
                              >
                                <option value="">Sélectionner une piste...</option>
                                {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              {missing && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ Veuillez sélectionner une piste pour le chef</p>}
                              {duplicate && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ Cette piste est déjà assignée à un autre pompiste</p>}
                            </div>
                            );
                          })()}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 3: Planning — Start/End datetime */}
                  {step === 3 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      {/* Start */}
                      <div className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                        <label className="text-[10px] font-black text-green-800 uppercase tracking-widest pl-1">📅 Date de début</label>
                        <input type="date" className="input-field h-12 font-black italic border-2 border-green-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-green-700 uppercase tracking-widest pl-1 mb-1 block">Heure</label>
                            <select className="input-field h-12 font-black italic border-2 border-green-300" value={startHour} onChange={e => setStartHour(e.target.value)}>
                              {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-green-700 uppercase tracking-widest pl-1 mb-1 block">Minute</label>
                            <input type="number" min={0} max={59} className="input-field h-12 font-black italic border-2 border-green-300" value={startMinute} onChange={e => setStartMinute(e.target.value.padStart(2, '0'))} />
                          </div>
                        </div>
                      </div>

                      {/* End */}
                      <div className="space-y-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-red-200">
                        <label className="text-[10px] font-black text-red-800 uppercase tracking-widest pl-1">📅 Date de fin</label>
                        <input type="date" className="input-field h-12 font-black italic border-2 border-red-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-red-700 uppercase tracking-widest pl-1 mb-1 block">Heure</label>
                            <select className="input-field h-12 font-black italic border-2 border-red-300" value={endHour} onChange={e => setEndHour(e.target.value)}>
                              {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-red-700 uppercase tracking-widest pl-1 mb-1 block">Minute</label>
                            <input type="number" min={0} max={59} className="input-field h-12 font-black italic border-2 border-red-300" value={endMinute} onChange={e => setEndMinute(e.target.value.padStart(2, '0'))} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: Niveaux actuels (read-only) */}
                  {step === 4 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] font-bold text-blue-700">
                        ℹ️ Ces valeurs sont issues du système. Elles seront utilisées comme référence de début de brigade.
                      </div>

                      {/* Section A — Tanks */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Niveaux actuels des cuves</h4>
                        {tanks.map(t => {
                          const pct = t.capacity > 0 ? Math.min(100, (t.current / t.capacity) * 100) : 0;
                          return (
                            <div key={t.id} className="p-4 rounded-2xl border-2 border-slate-200 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-black text-slate-800">{t.name}</p>
                                <span className="text-[9px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase">{t.type}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-[10px] mb-2">
                                <div className="bg-slate-50 p-2 rounded"><p className="text-slate-400 font-bold uppercase">Degrés</p><p className="font-black text-slate-700">{t.degrees}°</p></div>
                                <div className="bg-slate-50 p-2 rounded"><p className="text-slate-400 font-bold uppercase">Litres</p><p className="font-black text-blue-700">{t.current.toLocaleString('fr-FR')} L</p></div>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Section B — Nozzles grouped track → pump → nozzle */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Index actuels des pistolets (par piste → pompe → pistolet)</h4>
                        {tracks.map(track => {
                          const trackPumps = pumps.filter(p => p.trackId === track.id);
                          if (trackPumps.length === 0) return null;
                          return (
                            <div key={track.id} className="p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                              <p className="text-[10px] font-black text-slate-600 uppercase mb-2">🛣 {track.name}</p>
                              <div className="space-y-2">
                                {trackPumps.map(pump => {
                                  const nozzles = pumpNozzles.filter(n => n.pumpId === pump.id);
                                  return nozzles.map(n => (
                                    <div key={n.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className={cn("w-2 h-2 rounded-full", n.status === 'Actif' ? 'bg-green-400' : 'bg-slate-300')} />
                                        <div>
                                          <p className="text-xs font-black text-slate-800">{n.name}</p>
                                          <p className="text-[9px] text-slate-400">{pump.name}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-black text-blue-700 tabular-nums">{n.lastIndex.toLocaleString('fr-FR')}</p>
                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase", n.status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400')}>{n.status}</span>
                                      </div>
                                    </div>
                                  ));
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 5: Niveaux de fin (input + validation) */}
                  {step === 5 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      {/* Section A — End tank levels */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Niveaux de fin des cuves</h4>
                        {tanks.map(t => {
                          const deg = wizEndTankLevels[t.id];
                          const liters = deg !== undefined ? convertDegreesToLiters(t.id, deg) : undefined;
                          const err = tankEndError(t.id);
                          return (
                            <div key={t.id} className={cn("p-4 rounded-2xl border-2 bg-white", err ? "border-red-400" : "border-slate-200")}>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-black text-slate-800">{t.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold">Début: {t.degrees}° · {t.current.toLocaleString('fr-FR')} L</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Degrés de fin</label>
                                  <input type="number" step="0.1" className={cn("input-field h-11 font-black", err && "border-red-400 text-red-600")} value={deg ?? ''} onChange={e => setWizEndTankLevels(prev => ({ ...prev, [t.id]: e.target.value === '' ? undefined as any : parseFloat(e.target.value) }))} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Litres (auto)</label>
                                  <div className="h-11 flex items-center px-3 bg-slate-50 rounded-xl font-black text-blue-700 text-sm">{liters !== undefined ? `${liters.toLocaleString('fr-FR')} L` : '—'}</div>
                                </div>
                              </div>
                              {err && <p className="text-[10px] text-red-600 font-bold mt-2">⚠️ Niveau de fin supérieur au niveau actuel — vérifiez si un approvisionnement n'a pas été enregistré</p>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Section B — End nozzle indices */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Index de fin des pistolets</h4>
                        {tracks.map(track => {
                          const trackPumps = pumps.filter(p => p.trackId === track.id);
                          const trackActiveNozzles = pumpNozzles.filter(n => n.status === 'Actif' && trackPumps.some(p => p.id === n.pumpId));
                          if (trackActiveNozzles.length === 0) return null;
                          return (
                            <div key={track.id} className="p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                              <p className="text-[10px] font-black text-slate-600 uppercase mb-2">🛣 {track.name}</p>
                              <div className="space-y-2">
                                {trackPumps.map(pump => pumpNozzles.filter(n => n.pumpId === pump.id && n.status === 'Actif').map(n => {
                                  const err = nozzleEndError(n.id);
                                  const val = wizEndNozzleIndices[n.id];
                                  return (
                                    <div key={n.id} className={cn("p-2.5 bg-white rounded-lg border transition-colors", err ? "border-red-300" : "border-slate-100")}>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          {/* Animated label — shakes & turns red when the end index is below the start */}
                                          <motion.p
                                            animate={err ? { x: [0, -5, 5, -5, 5, -3, 3, 0], color: '#dc2626' } : { x: 0, color: '#1e293b' }}
                                            transition={{ duration: 0.45 }}
                                            className="text-xs font-black"
                                          >
                                            {n.name}
                                          </motion.p>
                                          <p className="text-[9px] text-slate-400">{pump.name} · Début: {n.lastIndex.toLocaleString('fr-FR')}</p>
                                        </div>
                                        <input
                                          type="number" step="0.01" min={n.lastIndex} placeholder="Index fin"
                                          className={cn("w-32 input-field h-10 font-black text-right transition-colors", err && "border-red-400 text-red-600 bg-red-50")}
                                          value={val ?? ''}
                                          onChange={e => setWizEndNozzleIndices(prev => ({ ...prev, [n.id]: e.target.value === '' ? undefined as any : parseFloat(e.target.value) }))}
                                        />
                                      </div>
                                      <AnimatePresence>
                                        {err && (
                                          <motion.p
                                            initial={{ opacity: 0, height: 0, x: -8 }}
                                            animate={{ opacity: 1, height: 'auto', x: [-8, 4, -2, 0] }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-[10px] text-red-600 font-bold mt-1 overflow-hidden"
                                          >
                                            ⚠️ L'index de fin ne peut pas être inférieur à l'index de début ({n.lastIndex.toLocaleString('fr-FR')})
                                          </motion.p>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                }))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 6: Comparaison & Alertes */}
                  {step === 6 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">
                        Ces alertes seront enregistrées dans le tableau de bord administrateur.
                      </div>
                      {decalageAlerts.map(a => {
                        const price = settings.fuelPrices[(tanks.find(t => t.id === a.tankId)?.type) || 'DIESEL'] || 0;
                        if (a.type === 'CORRECT' && a.suppressed) {
                          return (
                            <div key={a.tankId} className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/60 opacity-70 flex items-center justify-between">
                              <p className="text-sm font-black text-slate-500">{a.tankName}</p>
                              <p className="text-[11px] font-bold text-slate-400">✓ Écart dans les limites acceptées</p>
                            </div>
                          );
                        }
                        if (a.type === 'CORRECT') {
                          return (
                            <div key={a.tankId} className="p-4 rounded-2xl border-2 border-green-200 bg-green-50 flex items-center justify-between">
                              <p className="text-sm font-black text-green-800">{a.tankName}</p>
                              <p className="text-[11px] font-black text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Correct</p>
                            </div>
                          );
                        }
                        const isRetour = a.type === 'RETOUR_CUVE';
                        return (
                          <div key={a.tankId} className={cn("p-4 rounded-2xl border-2", isRetour ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50")}>
                            <div className="flex items-center justify-between mb-2">
                              <p className={cn("text-sm font-black", isRetour ? "text-orange-800" : "text-red-800")}>{a.tankName}</p>
                              <span className={cn("text-[9px] font-black px-2 py-1 rounded-full uppercase", isRetour ? "bg-orange-200 text-orange-800" : "bg-red-200 text-red-800")}>{a.type}</span>
                            </div>
                            <p className={cn("text-[11px] font-bold", isRetour ? "text-orange-700" : "text-red-700")}>
                              {isRetour
                                ? `Les pistolets ont débité plus que ce qu'indique la cuve. Quantité: ${Math.abs(a.difference).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} litres (${a.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD). Est-ce un retour cuve non enregistré ?`
                                : `La cuve a diminué plus que les pistolets n'ont débité. Quantité: ${Math.abs(a.difference).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} litres (${a.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD). Vente directe depuis la cuve ?`}
                            </p>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* STEP 7: Comptabilité */}
                  {step === 7 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      {/* SUB-SECTION A: Résumé des ventes par piste */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Résumé des ventes par piste</h4>
                        <div className="overflow-x-auto rounded-2xl border-2 border-slate-100">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-black">
                              <tr>
                                <th className="px-3 py-2">Pompiste</th><th className="px-3 py-2">Piste</th><th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2 text-right">Litres</th><th className="px-3 py-2 text-right">Prix/L</th><th className="px-3 py-2 text-right">Théorique</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pompisteSales.map(s => (
                                <tr key={s.pompisteId} className="font-bold text-slate-700">
                                  <td className="px-3 py-2">{s.name}</td>
                                  <td className="px-3 py-2">{s.trackName}</td>
                                  <td className="px-3 py-2">{s.fuelType}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{s.litersSold.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{s.pricePerLiter.toLocaleString('fr-FR')}</td>
                                  <td className="px-3 py-2 text-right tabular-nums text-blue-700">{s.theoretical.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                                </tr>
                              ))}
                              <tr className="bg-blue-50 font-black text-blue-900">
                                <td className="px-3 py-2" colSpan={5}>TOTAL</td>
                                <td className="px-3 py-2 text-right tabular-nums">{pompisteSales.reduce((s, x) => s + x.theoretical, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SUB-SECTION B: Encaissements par pompiste */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Saisie des encaissements par pompiste</h4>
                        {pompisteSales.map(s => {
                          const cash = pompistePayments[s.pompisteId] ?? 0;
                          const justifs = pompisteJustifications[s.pompisteId] || [];
                          const justifTotal = justifs.reduce((sum, j) => sum + (j.amount || 0), 0);
                          const ecartRestant = s.theoretical - cash - justifTotal;
                          const searchVal = justifClientSearch[s.pompisteId] || '';
                          const addJustif = (j: any) => setPompisteJustifications(prev => ({ ...prev, [s.pompisteId]: [...(prev[s.pompisteId] || []), j] }));
                          const removeJustif = (jid: string) => setPompisteJustifications(prev => ({ ...prev, [s.pompisteId]: (prev[s.pompisteId] || []).filter(x => x.id !== jid) }));
                          return (
                            <div key={s.pompisteId} className="p-4 rounded-2xl border-2 border-slate-200 bg-white space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-blue-900 text-yellow-300 flex items-center justify-center font-black text-xs">{s.name[0]}</div>
                                  <p className="text-sm font-black text-slate-800">{s.name}</p>
                                </div>
                                <p className="text-[10px] font-black text-blue-700">Théorique: {s.theoretical.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Espèces remises</label>
                                  <input type="number" className="input-field h-10 font-black" value={pompistePayments[s.pompisteId] ?? ''} onChange={e => setPompistePayments(prev => ({ ...prev, [s.pompisteId]: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Écart</label>
                                  <div className={cn("h-10 flex items-center px-3 rounded-xl font-black text-sm", ecartRestant > 0.01 ? "bg-red-50 text-red-600" : ecartRestant < -0.01 ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500")}>{ecartRestant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</div>
                                </div>
                              </div>

                              {/* Justification buttons */}
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => addJustif({ id: newId(), type: 'TAG', description: '', liters: 0, amount: 0 })} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-black uppercase hover:bg-purple-200">+ TAG</button>
                                <button onClick={() => addJustif({ id: newId(), type: 'TPE', description: '', liters: 0, amount: 0 })} className="px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 text-[10px] font-black uppercase hover:bg-cyan-200">+ TPE</button>
                                <button onClick={() => setShowNewClientForm(showNewClientForm === `credit-${s.pompisteId}` ? null : `credit-${s.pompisteId}`)} className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-[10px] font-black uppercase hover:bg-orange-200">+ Crédit Client</button>
                                <button onClick={() => setShowNewClientForm(showNewClientForm === `avance-${s.pompisteId}` ? null : `avance-${s.pompisteId}`)} className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-[10px] font-black uppercase hover:bg-teal-200">+ Avance Client</button>
                              </div>

                              {/* Client search panel (credit or avance) */}
                              {(showNewClientForm === `credit-${s.pompisteId}` || showNewClientForm === `avance-${s.pompisteId}`) && (() => {
                                const isAvance = showNewClientForm === `avance-${s.pompisteId}`;
                                const matches = clients
                                  .filter(c => !isAvance || (c.advanceBalance || 0) > 0)
                                  .filter(c => !searchVal || c.name.toLowerCase().includes(searchVal.toLowerCase()) || (c.phone || '').includes(searchVal))
                                  .slice(0, 5);
                                return (
                                  <div className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Search className="w-4 h-4 text-slate-400" />
                                      <input placeholder="Rechercher client (nom / téléphone)" value={searchVal} onChange={e => setJustifClientSearch(prev => ({ ...prev, [s.pompisteId]: e.target.value }))} className="flex-1 input-field h-9 text-xs font-bold" />
                                    </div>
                                    {matches.map(c => (
                                      <button key={c.id} onClick={() => {
                                        const litersDefault = 0;
                                        addJustif({ id: newId(), type: isAvance ? 'CLIENT_AVANCE' : 'CLIENT_CREDIT', description: c.name, liters: litersDefault, amount: 0, clientId: c.id, clientName: c.name, clientRestCredit: isAvance ? (c.advanceBalance || 0) : (c.creditLimit - c.debt) });
                                        setShowNewClientForm(null);
                                        setJustifClientSearch(prev => ({ ...prev, [s.pompisteId]: '' }));
                                      }} className="w-full text-left p-2 bg-white rounded-lg border border-slate-100 hover:border-blue-300 flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-black text-slate-800">{c.name}</p>
                                          <p className="text-[9px] text-slate-400">{c.phone || 'N/A'}</p>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-500">{isAvance ? `Avance: ${(c.advanceBalance || 0).toLocaleString('fr-FR')}` : `Reste crédit: ${(c.creditLimit - c.debt).toLocaleString('fr-FR')}`}</p>
                                      </button>
                                    ))}
                                    {matches.length === 0 && <p className="text-[10px] text-slate-400 font-bold text-center py-1">Aucun client</p>}
                                    <button onClick={() => { setNewClientDraft({ name: searchVal, phone: '', type: 'PARTICULIER', paymentMode: isAvance ? 'ADVANCE' : 'CREDIT' }); setShowNewClientForm(`new-${isAvance ? 'avance' : 'credit'}-${s.pompisteId}`); }} className="w-full p-2 rounded-lg border-2 border-dashed border-blue-200 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-50">+ Nouveau client</button>
                                  </div>
                                );
                              })()}

                              {/* New client mini form */}
                              {(showNewClientForm === `new-avance-${s.pompisteId}` || showNewClientForm === `new-credit-${s.pompisteId}`) && (() => {
                                const isAvance = showNewClientForm === `new-avance-${s.pompisteId}`;
                                return (
                                  <div className="p-3 rounded-xl border-2 border-blue-100 bg-blue-50/50 space-y-2">
                                    <p className="text-[10px] font-black text-blue-900 uppercase">Nouveau client</p>
                                    <input placeholder="Nom" value={newClientDraft.name} onChange={e => setNewClientDraft(d => ({ ...d, name: e.target.value }))} className="w-full input-field h-9 text-xs font-bold" />
                                    <input placeholder="Téléphone" value={newClientDraft.phone} onChange={e => setNewClientDraft(d => ({ ...d, phone: e.target.value }))} className="w-full input-field h-9 text-xs font-bold" />
                                    <div className="grid grid-cols-2 gap-2">
                                      <select value={newClientDraft.type} onChange={e => setNewClientDraft(d => ({ ...d, type: e.target.value as Client['type'] }))} className="input-field h-9 text-xs font-bold">
                                        <option value="PARTICULIER">Particulier</option><option value="ENTREPRISE">Entreprise</option><option value="GOUVERNEMENT">Gouvernement</option>
                                      </select>
                                      <select value={newClientDraft.paymentMode} onChange={e => setNewClientDraft(d => ({ ...d, paymentMode: e.target.value as Client['paymentMode'] }))} className="input-field h-9 text-xs font-bold">
                                        <option value="CASH">Cash</option><option value="CREDIT">Crédit</option><option value="ADVANCE">Avance</option>
                                      </select>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => setShowNewClientForm(null)} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-500">Annuler</button>
                                      <button onClick={() => {
                                        if (!newClientDraft.name.trim()) return;
                                        const nc: Client = { id: newId(), name: newClientDraft.name.trim(), phone: newClientDraft.phone, balance: 0, debt: 0, creditLimit: 0, paymentDelay: 0, type: newClientDraft.type, paymentMode: newClientDraft.paymentMode, advanceBalance: 0, transactionHistory: [] };
                                        dispatch({ type: 'ADD_CLIENT', payload: nc });
                                        addJustif({ id: newId(), type: isAvance ? 'CLIENT_AVANCE' : 'CLIENT_CREDIT', description: nc.name, liters: 0, amount: 0, clientId: nc.id, clientName: nc.name, clientRestCredit: 0 });
                                        setShowNewClientForm(null);
                                      }} className="flex-1 py-2 rounded-lg bg-blue-900 text-white text-[10px] font-black uppercase">Créer & ajouter</button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Justification list */}
                              {justifs.length > 0 && (
                                <div className="space-y-2">
                                  {justifs.map(j => (
                                    <div key={j.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">{j.type.replace('CLIENT_', '')}</span>
                                        <button onClick={() => removeJustif(j.id)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {(j.type === 'TAG' || j.type === 'TPE') && (
                                          <input placeholder="Description" value={j.description} onChange={e => setPompisteJustifications(prev => ({ ...prev, [s.pompisteId]: (prev[s.pompisteId] || []).map(x => x.id === j.id ? { ...x, description: e.target.value } : x) }))} className="input-field h-9 text-xs font-bold" />
                                        )}
                                        {(j.type === 'CLIENT_CREDIT' || j.type === 'CLIENT_AVANCE') && (
                                          <div className="h-9 flex items-center px-2 bg-white rounded-lg text-xs font-black text-slate-700 truncate">{j.clientName} {j.clientRestCredit !== undefined && <span className="text-[9px] text-slate-400 ml-1">({j.clientRestCredit.toLocaleString('fr-FR')})</span>}</div>
                                        )}
                                        <input type="number" placeholder="Litres" value={j.liters || ''} onChange={e => {
                                          const liters = parseFloat(e.target.value) || 0;
                                          const amount = liters * s.pricePerLiter;
                                          setPompisteJustifications(prev => ({ ...prev, [s.pompisteId]: (prev[s.pompisteId] || []).map(x => x.id === j.id ? { ...x, liters, amount } : x) }));
                                        }} className="input-field h-9 text-xs font-bold" />
                                      </div>
                                      <p className="text-[10px] font-black text-right text-blue-700">Montant: {(j.amount || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Per-pompiste recap */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-100">
                                <p className="text-slate-500 font-bold">Espèces: <span className="text-slate-800 font-black">{cash.toLocaleString('fr-FR')}</span></p>
                                <p className="text-slate-500 font-bold">Justifié: <span className="text-slate-800 font-black">{justifTotal.toLocaleString('fr-FR')}</span></p>
                              </div>
                              {Math.abs(ecartRestant) > 0.01 && (
                                <p className="text-[10px] font-bold text-orange-600">Ce décalage ({ecartRestant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD) sera enregistré dans l'historique de paiement du pompiste</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* SUB-SECTION C: Récapitulatif final */}
                      {(() => {
                        const totalTheo = pompisteSales.reduce((s, x) => s + x.theoretical, 0);
                        const totalCash = pompisteSales.reduce((s, x) => s + (pompistePayments[x.pompisteId] || 0), 0);
                        const totalJust = pompisteSales.reduce((s, x) => s + (pompisteJustifications[x.pompisteId] || []).reduce((a, j) => a + (j.amount || 0), 0), 0);
                        const solde = totalTheo - totalCash - totalJust;
                        return (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 text-white space-y-2">
                            <h4 className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">Récapitulatif final</h4>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                              <p>Total théorique:</p><p className="text-right text-yellow-300 font-black">{totalTheo.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                              <p>Total espèces:</p><p className="text-right font-black">{totalCash.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                              <p>Total justifications:</p><p className="text-right font-black">{totalJust.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                              <p>Solde restant:</p><p className={cn("text-right font-black", Math.abs(solde) < 0.01 ? "text-green-300" : "text-red-300")}>{solde.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DZD</p>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
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
                      if (step === 7) {
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
                        setStep(s => s + 1);
                      }
                    }}
                    disabled={isSubmitting || !canGoNext}
                    className="flex-[2] bg-gradient-to-r from-blue-900 to-blue-800 hover:shadow-lg text-white font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg py-3 transition-all transform hover:-translate-y-0.5 text-[10px]"
                  >
                    {isSubmitting ? (<><LoaderCircle className="w-4 h-4 animate-spin" />Traitement...</>) : step < 7 ? (<>Suivant <ArrowRight className="w-4 h-4" /></>) : 'Créer la Brigade'}
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
