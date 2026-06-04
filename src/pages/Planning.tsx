import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  X,
  Search,
  Zap,
  Phone,
  Droplet,
  Droplets,
  Gauge,
  AlertCircle,
  Filter,
  LogOut,
  Clock,
  Users,
  TrendingUp,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useAppState, useAppDispatch, Brigade } from "../store/AppContext";
import BrigadeFicheModal from "../components/BrigadeFicheModal";

type ShiftType = 'Matin' | 'Soir' | 'Nuit';
type EventType = 'activation' | 'closing';

const shiftConfig: Record<ShiftType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  'Matin': { icon: Sun, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  'Soir': { icon: Sunset, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  'Nuit': { icon: Moon, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' }
};

// ============ TEST DATA ============
const generateTestData = (brigades: Brigade[]): Brigade[] => {
  if (brigades.length > 5) return brigades;
  
  const testBrigades: Brigade[] = [
    {
      id: 'TEST-ACT-001',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shift: 'Matin',
      chefId: 'chef-1',
      status: 'Clôturée',
      isActive: false,
      startTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
      startTime: '06:00',
      endTime: '14:00',
      pompisteIds: ['pomp-1', 'pomp-2'],
      startIndices: { 'pump-1': 1000, 'pump-2': 2000, 'pump-3': 3000 },
      endIndices: { 'pump-1': 1250, 'pump-2': 2180, 'pump-3': 3320 },
      startTankLevels: {
        'tank-1': { degrees: 85, liters: 8500 },
        'tank-2': { degrees: 72, liters: 7200 },
        'tank-3': { degrees: 65, liters: 6500 }
      },
      endTankLevels: {
        'tank-1': { degrees: 78, liters: 7800 },
        'tank-2': { degrees: 68, liters: 6800 },
        'tank-3': { degrees: 60, liters: 6000 }
      }
    },
    {
      id: 'TEST-ACT-002',
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shift: 'Soir',
      chefId: 'chef-2',
      status: 'Clôturée',
      isActive: false,
      startTimestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
      endTimestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000).toISOString(),
      startTime: '14:00',
      endTime: '22:00',
      pompisteIds: ['pomp-3', 'pomp-4'],
      startIndices: { 'pump-1': 1250, 'pump-2': 2180, 'pump-4': 4100 },
      endIndices: { 'pump-1': 1380, 'pump-2': 2410, 'pump-4': 4350 },
      startTankLevels: {
        'tank-1': { degrees: 78, liters: 7800 },
        'tank-2': { degrees: 68, liters: 6800 }
      },
      endTankLevels: {
        'tank-1': { degrees: 72, liters: 7200 },
        'tank-2': { degrees: 64, liters: 6400 }
      }
    },
    {
      id: 'TEST-ACT-003',
      date: new Date().toISOString().split('T')[0],
      shift: 'Matin',
      chefId: 'chef-1',
      status: 'Clôturée',
      isActive: false,
      startTimestamp: new Date().toISOString(),
      endTimestamp: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      startTime: '06:00',
      endTime: '14:00',
      pompisteIds: ['pomp-1', 'pomp-2', 'pomp-3'],
      startIndices: { 'pump-1': 1380, 'pump-2': 2410, 'pump-3': 3320 },
      endIndices: { 'pump-1': 1520, 'pump-2': 2650, 'pump-3': 3580 },
      startTankLevels: {
        'tank-1': { degrees: 72, liters: 7200 },
        'tank-2': { degrees: 64, liters: 6400 },
        'tank-3': { degrees: 60, liters: 6000 }
      },
      endTankLevels: {
        'tank-1': { degrees: 65, liters: 6500 },
        'tank-2': { degrees: 58, liters: 5800 },
        'tank-3': { degrees: 55, liters: 5500 }
      }
    },
    {
      id: 'TEST-ACT-004',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shift: 'Soir',
      chefId: 'chef-2',
      status: 'Clôturée',
      isActive: false,
      startTimestamp: new Date(Date.now() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
      endTimestamp: new Date(Date.now() + 24 * 60 * 60 * 1000 + 22 * 60 * 60 * 1000).toISOString(),
      startTime: '14:00',
      endTime: '22:00',
      pompisteIds: ['pomp-2', 'pomp-4'],
      startIndices: { 'pump-1': 1520, 'pump-2': 2650, 'pump-4': 4350 },
      endIndices: { 'pump-1': 1650, 'pump-2': 2880, 'pump-4': 4600 },
      startTankLevels: {
        'tank-1': { degrees: 65, liters: 6500 },
        'tank-2': { degrees: 58, liters: 5800 }
      },
      endTankLevels: {
        'tank-1': { degrees: 58, liters: 5800 },
        'tank-2': { degrees: 52, liters: 5200 }
      }
    },
    {
      id: 'TEST-ACT-005',
      date: new Date().toISOString().split('T')[0],
      shift: 'Soir',
      chefId: 'chef-1',
      status: 'Clôturée',
      isActive: false,
      startTimestamp: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
      endTimestamp: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      startTime: '14:00',
      endTime: '22:00',
      pompisteIds: ['pomp-1', 'pomp-3'],
      startIndices: { 'pump-1': 1520, 'pump-2': 2410, 'pump-3': 3580, 'pump-4': 4600 },
      endIndices: { 'pump-1': 1650, 'pump-2': 2600, 'pump-3': 3800, 'pump-4': 4850 },
      startTankLevels: {
        'tank-1': { degrees: 65, liters: 6500 },
        'tank-2': { degrees: 58, liters: 5800 },
        'tank-3': { degrees: 55, liters: 5500 }
      },
      endTankLevels: {
        'tank-1': { degrees: 58, liters: 5800 },
        'tank-2': { degrees: 52, liters: 5200 },
        'tank-3': { degrees: 48, liters: 4800 }
      }
    }
  ];

  return testBrigades;
};

const Planning = () => {
  const { t } = useTranslation();
  const { brigades: contextBrigades, brigadeChefs, pompistes, tanks, pumps } = useAppState();

  const brigades = useMemo(() => {
    const combined = [...contextBrigades, ...generateTestData(contextBrigades)];
    return combined.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
  }, [contextBrigades]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBrigade, setSelectedBrigade] = useState<Brigade | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [filterShift, setFilterShift] = useState<ShiftType | null>(null);
  const [filterChef, setFilterChef] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'history'>('calendar');

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    let d = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const getBrigadesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return brigades.filter(b => b.date === dateStr && shouldShowBrigade(b));
  };

  const shouldShowBrigade = (brigade: Brigade) => {
    const chef = brigadeChefs.find(c => c.id === brigade.chefId);
    const matches = !filterShift || brigade.shift === filterShift;
    const chefMatches = !filterChef || brigade.chefId === filterChef;
    const searchMatches = !searchQuery || 
      (chef?.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      brigade.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matches && chefMatches && searchMatches;
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto pb-12 px-4">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-3xl p-8 text-white shadow-2xl border border-blue-700"
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
              Planificateur de Brigades
            </h1>
            <p className="text-blue-100 font-medium">
              Consultez le calendrier et l'historique des brigades
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-6 py-3 rounded-xl font-black transition-all",
                viewMode === 'calendar'
                  ? "bg-white text-blue-900 shadow-lg"
                  : "bg-blue-700/50 text-white hover:bg-blue-600/60"
              )}
            >
              📅 Calendrier
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('history')}
              className={cn(
                "px-6 py-3 rounded-xl font-black transition-all",
                viewMode === 'history'
                  ? "bg-white text-blue-900 shadow-lg"
                  : "bg-blue-700/50 text-white hover:bg-blue-600/60"
              )}
            >
              📋 Historique
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBrigade && !showFicheModal && (
          <BrigadeDetailModal
            brigade={selectedBrigade}
            brigadeChefs={brigadeChefs}
            pompistes={pompistes}
            tanks={tanks}
            pumps={pumps}
            onClose={() => {
              setSelectedBrigade(null);
              setSelectedEventType(null);
            }}
            onViewDetails={() => setShowFicheModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Fiche de Brigade Modal */}
      <AnimatePresence>
        {selectedBrigade && showFicheModal && (
          <BrigadeFicheModal
            brigade={selectedBrigade}
            brigadeChefs={brigadeChefs}
            pompistes={pompistes}
            tanks={tanks}
            pumps={pumps}
            pumpNozzles={[]}
            tracks={[]}
            shopSales={[]}
            settings={{ name: '', address: '', phone: '', fiscalId: '', logoUrl: '', logo: '', fuelPrices: {} }}
            accounting={undefined}
            onClose={() => {
              setShowFicheModal(false);
              setSelectedBrigade(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Calendar/History View */}
      {viewMode === 'calendar' ? (
        <>
          {/* Filters Bar - Calendar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un chef..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
              />
            </div>

            <select
              value={filterShift || ''}
              onChange={(e) => setFilterShift(e.target.value ? (e.target.value as ShiftType) : null)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white font-medium"
            >
              <option value="">Tous les quarts</option>
              <option value="Matin">🌅 Matin</option>
              <option value="Soir">🌆 Soir</option>
              <option value="Nuit">🌙 Nuit</option>
            </select>

            <select
              value={filterChef || ''}
              onChange={(e) => setFilterChef(e.target.value || null)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white font-medium"
            >
              <option value="">Tous les chefs</option>
              {brigadeChefs.map(chef => (
                <option key={chef.id} value={chef.id}>👨‍💼 {chef.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setFilterShift(null);
                setFilterChef(null);
                setSearchQuery('');
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-black rounded-xl transition-all transform hover:scale-105 shadow-md col-span-1 md:col-span-1"
            >
              ↺ Réinitialiser
            </button>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 shadow-lg border border-blue-100"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-blue-900">
                {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-blue-900 font-black" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 hover:bg-blue-900/10 rounded-xl transition-colors text-sm font-black text-blue-900"
                >
                  Aujourd'hui
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-blue-900 font-black" />
                </motion.button>
              </div>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center font-black text-sm text-blue-900 py-3">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const brigadesForDay = getBrigadesForDate(day);

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "min-h-32 p-3 rounded-2xl border-2 transition-all",
                      isCurrentMonth
                        ? isToday
                          ? "bg-yellow-50/60 border-yellow-400 shadow-lg shadow-yellow-200/50"
                          : "bg-white border-slate-200 hover:border-blue-400"
                        : "bg-slate-50 border-slate-100"
                    )}
                  >
                    <div className={cn("text-sm font-black mb-2", isCurrentMonth ? "text-blue-900" : "text-slate-400")}>
                      {day.getDate()}
                    </div>

                    {/* Brigades for this day */}
                    <div className="space-y-2">
                      {brigadesForDay.map((brigade, i) => {
                        const chef = brigadeChefs.find(c => c.id === brigade.chefId);
                        const config = shiftConfig[brigade.shift];
                        const ShiftIcon = config.icon;

                        return (
                          <motion.button
                            key={brigade.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => {
                              setSelectedBrigade(brigade);
                              setSelectedEventType('activation');
                            }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full text-left p-2.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-800 text-white border-2 border-blue-700 hover:from-blue-800 hover:to-blue-700 shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <ShiftIcon className="w-3.5 h-3.5" />
                              <span className="text-xs font-black tracking-tighter">{brigade.shift}</span>
                              <span className="ml-auto text-xs font-black bg-yellow-400 text-blue-900 px-2 py-0.5 rounded-full">
                                {brigade.status === 'Clôturée' ? '✓' : '●'}
                              </span>
                            </div>
                            <p className="text-xs font-black truncate">{chef?.name || 'Chef'}</p>
                            <p className="text-[10px] text-blue-200 truncate">{brigade.startTime} - {brigade.endTime}</p>
                          </motion.button>
                        );
                      })}
                    </div>

                    {brigadesForDay.length === 0 && isCurrentMonth && (
                      <div className="text-center py-4 text-slate-300">
                        <p className="text-xs">-</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : (
        // History View
        <>
          {/* Filters Bar - History */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un chef..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
              />
            </div>

            <select
              value={filterShift || ''}
              onChange={(e) => setFilterShift(e.target.value ? (e.target.value as ShiftType) : null)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white font-medium"
            >
              <option value="">Tous les quarts</option>
              <option value="Matin">🌅 Matin</option>
              <option value="Soir">🌆 Soir</option>
              <option value="Nuit">🌙 Nuit</option>
            </select>

            <select
              value={filterChef || ''}
              onChange={(e) => setFilterChef(e.target.value || null)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white font-medium"
            >
              <option value="">Tous les chefs</option>
              {brigadeChefs.map(chef => (
                <option key={chef.id} value={chef.id}>👨‍💼 {chef.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setFilterShift(null);
                setFilterChef(null);
                setSearchQuery('');
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-black rounded-xl transition-all transform hover:scale-105 shadow-md col-span-1 md:col-span-1"
            >
              ↺ Réinitialiser
            </button>
          </motion.div>

          {/* Brigade History List */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            {useMemo(() => {
              const sortedBrigades = [...brigades]
                .filter(shouldShowBrigade)
                .sort((a, b) => {
                  const dateA = new Date(a.startTimestamp || a.date).getTime();
                  const dateB = new Date(b.startTimestamp || b.date).getTime();
                  return dateB - dateA;
                });

              if (sortedBrigades.length === 0) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200"
                  >
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-lg">Aucune brigade trouvée</p>
                  </motion.div>
                );
              }

              return sortedBrigades.map((brigade, idx) => {
                const chef = brigadeChefs.find(c => c.id === brigade.chefId);
                const config = shiftConfig[brigade.shift];
                const ShiftIcon = config.icon;
                const numPompistes = brigade.pompisteIds?.length || 0;

                return (
                  <motion.button
                    key={brigade.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedBrigade(brigade);
                      setShowFicheModal(true);
                    }}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left group"
                  >
                    <div className="bg-white border-2 border-slate-200 group-hover:border-blue-500 rounded-2xl p-6 transition-all shadow-sm group-hover:shadow-lg">
                      <div className="flex items-start justify-between gap-6">
                        {/* Left: Shift Icon & Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            className={cn(
                              "w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg transition-all",
                              "bg-gradient-to-br from-blue-900 to-blue-800"
                            )}
                          >
                            <ShiftIcon />
                          </motion.div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-black text-blue-900">Brigade {brigade.shift}</h3>
                              <span className={cn(
                                "text-xs font-black px-3 py-1 rounded-full",
                                brigade.status === 'Clôturée' 
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              )}>
                                {brigade.status === 'Clôturée' ? '✓ Clôturée' : '● Active'}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-600 mb-2">
                              👨‍💼 {chef?.name || 'Chef'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(brigade.date).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {brigade.startTime} - {brigade.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {numPompistes} pompiste{numPompistes !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Details */}
                        <div className="hidden md:grid grid-cols-3 gap-6">
                          {/* Fuel Sold */}
                          {brigade.startIndices && brigade.endIndices && (
                            <div className="text-center">
                              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Carburant</p>
                              <p className="text-2xl font-black text-blue-900">
                                {Object.keys(brigade.startIndices).reduce((sum, pumpId) => {
                                  const start = brigade.startIndices![pumpId] || 0;
                                  const end = brigade.endIndices![pumpId] || 0;
                                  return sum + Math.max(0, end - start);
                                }, 0).toFixed(0)}L
                              </p>
                            </div>
                          )}

                          {/* Tank Levels */}
                          {brigade.startTankLevels && (
                            <div className="text-center">
                              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Cuves</p>
                              <p className="text-2xl font-black text-emerald-600">
                                {Object.keys(brigade.startTankLevels).length}
                              </p>
                            </div>
                          )}

                          {/* Action */}
                          <div className="flex items-center justify-end">
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 5 }}
                              className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center text-white shadow-lg"
                            >
                              <Eye className="w-5 h-5" />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              });
            }, [brigades, filterShift, filterChef, searchQuery, brigadeChefs])}
          </motion.div>
        </>
      )}
    </div>
  );
};

// ============ Brigade Detail Modal ============
const BrigadeDetailModal: React.FC<{
  brigade: Brigade;
  brigadeChefs: any[];
  pompistes: any[];
  tanks: any[];
  pumps: any[];
  onClose: () => void;
  onViewDetails?: () => void;
}> = ({ brigade, brigadeChefs, pompistes, tanks, pumps, onClose, onViewDetails }) => {
  const chef = brigadeChefs.find(c => c.id === brigade.chefId);
  const brigadePompistes = pompistes.filter(p => brigade.pompisteIds?.includes(p.id));
  const config = shiftConfig[brigade.shift];
  const ShiftIcon = config.icon;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'activation' | 'closing'>('overview');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 relative z-10 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg bg-gradient-to-br from-blue-900 to-blue-800"
              >
                <ShiftIcon />
              </motion.div>
              <div>
                <h2 className="text-3xl font-black text-blue-900">Brigade {brigade.shift}</h2>
                <p className="text-sm text-slate-500">
                  {new Date(brigade.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {onViewDetails && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onViewDetails}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white font-black rounded-xl transition-all flex items-center gap-2 hover:from-blue-800 hover:to-blue-700 shadow-md"
              >
                <Eye className="w-4 h-4" />
                Voir la Fiche
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          {[
            { id: 'overview', label: '📋 Aperçu', icon: '👁' },
            { id: 'activation', label: '▶️ Activation', icon: '🟢' },
            { id: 'closing', label: '🔴 Clôture', icon: '🔴' }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 font-black text-sm rounded-t-xl transition-all border-b-2",
                activeTab === tab.id
                  ? "border-b-blue-900 text-blue-900"
                  : "border-b-transparent text-slate-600 hover:text-slate-800"
              )}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Chef */}
              {chef && (
                <motion.div
                  whileHover={{ x: 4 }}
                  className="p-6 bg-gradient-to-br from-blue-900 to-blue-800 text-white border-2 border-blue-700 rounded-2xl"
                >
                  <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-3">👨‍💼 Chef de Brigade</p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-yellow-400 text-blue-900 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">
                      {chef.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-white text-lg">{chef.name}</p>
                      {chef.phone && (
                        <p className="text-sm text-blue-100 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> {chef.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Pompistes */}
              <div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">👥 Pompistes ({brigadePompistes.length})</p>
                {brigadePompistes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {brigadePompistes.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-blue-200 rounded-xl"
                      >
                        <div className="w-10 h-10 bg-blue-900 text-white rounded-full flex items-center justify-center font-black">
                          {p.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          {p.phone && <p className="text-xs text-slate-500">{p.phone}</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Aucun pompiste</p>
                )}
              </div>

              {/* Times */}
              <motion.div
                whileHover={{ x: 4 }}
                className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl"
              >
                <p className="text-xs font-black text-yellow-800 uppercase tracking-widest mb-3">⏰ Horaires</p>
                <p className="text-2xl font-black text-yellow-900">{brigade.startTime} - {brigade.endTime}</p>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'activation' && (
            <motion.div
              key="activation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {brigade.startTimestamp && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-green-600 rounded-2xl shadow-lg"
                >
                  <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-90">⏱️ Heure d'Activation</p>
                  <p className="font-black text-lg">
                    {new Date(brigade.startTimestamp).toLocaleString('fr-FR')}
                  </p>
                </motion.div>
              )}

              {/* Start Indices */}
              {brigade.startIndices && Object.keys(brigade.startIndices).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-black text-slate-800">Index de Début - Toutes les Pompes</h3>
                    <span className="ml-auto bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full">
                      {Object.keys(brigade.startIndices).length} pompes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(brigade.startIndices).map(([pumpId, index], idx) => {
                      const pump = pumps.find(p => p.id === pumpId);
                      return (
                        <motion.div
                          key={pumpId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl"
                        >
                          <p className="text-xs font-black text-green-700 mb-2 uppercase">{pump?.name || 'Pompe'}</p>
                          <p className="text-3xl font-black text-green-900">{index}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Start Tank Levels */}
              {brigade.startTankLevels && Object.keys(brigade.startTankLevels).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-black text-slate-800">Niveaux de Cuves - Démarrage</h3>
                    <span className="ml-auto bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full">
                      {Object.keys(brigade.startTankLevels).length} cuves
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(brigade.startTankLevels).map(([tankId, level]: [string, any], idx) => {
                      const tank = tanks.find(t => t.id === tankId);
                      return (
                        <motion.div
                          key={tankId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-300 rounded-xl"
                        >
                          <p className="text-xs font-black text-green-700 mb-2 uppercase">{tank?.name || 'Cuve'}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-green-600 font-bold">Degrés</p>
                              <p className="text-2xl font-black text-green-900">{level.degrees}°</p>
                            </div>
                            <div>
                              <p className="text-xs text-green-600 font-bold">Litres</p>
                              <p className="text-2xl font-black text-green-900">{level.liters}L</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'closing' && (
            <motion.div
              key="closing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {brigade.endTimestamp && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-5 bg-gradient-to-r from-red-500 to-rose-600 text-white border-2 border-red-600 rounded-2xl shadow-lg"
                >
                  <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-90">🔴 Heure de Clôture</p>
                  <p className="font-black text-lg">
                    {new Date(brigade.endTimestamp).toLocaleString('fr-FR')}
                  </p>
                </motion.div>
              )}

              {/* End Indices */}
              {brigade.endIndices && Object.keys(brigade.endIndices).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-black text-slate-800">Index de Fin - Toutes les Pompes</h3>
                    <span className="ml-auto bg-red-100 text-red-700 text-xs font-black px-3 py-1 rounded-full">
                      {Object.keys(brigade.endIndices).length} pompes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(brigade.endIndices).map(([pumpId, index], idx) => {
                      const pump = pumps.find(p => p.id === pumpId);
                      const startIndex = brigade.startIndices?.[pumpId] || 0;
                      const sold = (index as number) - startIndex;
                      return (
                        <motion.div
                          key={pumpId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl"
                        >
                          <p className="text-xs font-black text-red-700 mb-2 uppercase">{pump?.name || 'Pompe'}</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-red-600 font-bold">Index Fin</p>
                              <p className="text-2xl font-black text-red-900">{index}</p>
                            </div>
                            {sold > 0 && (
                              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2">
                                <p className="text-xs text-yellow-700 font-bold">Vendu</p>
                                <p className="text-xl font-black text-yellow-900">+{sold}L</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End Tank Levels */}
              {brigade.endTankLevels && Object.keys(brigade.endTankLevels).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-black text-slate-800">Niveaux de Cuves - Clôture</h3>
                    <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-black px-3 py-1 rounded-full">
                      {Object.keys(brigade.endTankLevels).length} cuves
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(brigade.endTankLevels).map(([tankId, level]: [string, any], idx) => {
                      const tank = tanks.find(t => t.id === tankId);
                      const startLevel = brigade.startTankLevels?.[tankId];
                      const consumed = startLevel ? startLevel.liters - level.liters : 0;
                      return (
                        <motion.div
                          key={tankId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl"
                        >
                          <p className="text-xs font-black text-orange-700 mb-2 uppercase">{tank?.name || 'Cuve'}</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <p className="text-xs text-orange-600 font-bold">Degrés</p>
                              <p className="text-2xl font-black text-orange-900">{level.degrees}°</p>
                            </div>
                            <div>
                              <p className="text-xs text-orange-600 font-bold">Litres</p>
                              <p className="text-2xl font-black text-orange-900">{level.liters}L</p>
                            </div>
                          </div>
                          {consumed > 0 && (
                            <div className="bg-red-100 border border-red-300 rounded-lg p-2">
                              <p className="text-xs text-red-700 font-bold">Consommé</p>
                              <p className="text-lg font-black text-red-900">{consumed}L</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Planning;
