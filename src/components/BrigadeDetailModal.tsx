import React, { useState, useMemo } from "react";
import {
  X, Clock, Calendar, Users, Printer, TrendingUp, Droplets, Zap,
  User, DollarSign, ShoppingBag, Activity, ChevronRight, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import {
  Brigade, Pump, Tank, Pompiste, BrigadeChef, PumpNozzle, Track, ShopSale, StationSettings, BrigadeAccounting
} from "../store/AppContext";

interface Props {
  brigade: Brigade;
  pumps: Pump[];
  tanks: Tank[];
  pompistes: Pompiste[];
  brigadeChefs: BrigadeChef[];
  pumpNozzles: PumpNozzle[];
  tracks: Track[];
  shopSales: ShopSale[];
  settings: StationSettings;
  accounting?: BrigadeAccounting;
  onClose: () => void;
}

const SECTIONS = [
  { id: 'info',         label: 'Informations',     icon: Calendar },
  { id: 'cuves',        label: 'Cuves',             icon: Droplets },
  { id: 'pistolets',    label: 'Pistolets',         icon: Zap },
  { id: 'pompistes',    label: 'Pompistes',         icon: Users },
  { id: 'comptabilite', label: 'Comptabilité',      icon: DollarSign },
  { id: 'ventes',       label: 'Ventes Magasin',    icon: ShoppingBag },
  { id: 'historique',   label: 'Historique',        icon: Activity },
];

const BrigadeDetailModal: React.FC<Props> = ({
  brigade, pumps, tanks, pompistes, brigadeChefs, pumpNozzles, tracks,
  shopSales, settings, accounting, onClose
}) => {
  const [activeSection, setActiveSection] = useState('info');
  const chef = brigadeChefs.find(c => c.id === brigade.chefId);

  // Active nozzles
  const activeNozzles = useMemo(() => {
    if (brigade.activeNozzleIds && brigade.activeNozzleIds.length > 0)
      return pumpNozzles.filter(n => brigade.activeNozzleIds!.includes(n.id));
    const brigadeTrackIds = (brigade.pompisteAssignments || []).filter(a => a.present).map(a => a.trackId);
    const displayPumps = brigadeTrackIds.length > 0 ? pumps.filter(p => brigadeTrackIds.includes(p.trackId)) : pumps.filter(p => Object.keys(brigade.startIndices || {}).includes(p.id));
    return pumpNozzles.filter(n => displayPumps.some(p => p.id === n.pumpId));
  }, [brigade, pumps, pumpNozzles]);

  // Nozzle data
  const nozzleData = useMemo(() => activeNozzles.map(nozzle => {
    const pump = pumps.find(p => p.id === nozzle.pumpId);
    const tank = tanks.find(t => t.id === pump?.tankId);
    const startIdx = brigade.startNozzleIndices?.[nozzle.id] ?? (brigade.startIndices?.[nozzle.pumpId] || 0);
    const endIdx = brigade.endNozzleIndices?.[nozzle.id] ?? (brigade.endIndices?.[nozzle.pumpId] || startIdx);
    const liters = Math.max(0, endIdx - startIdx);
    const price = settings.fuelPrices[pump?.type || 'SUPER'] || 0;
    return { nozzle, pump, tank, startIdx, endIdx, liters, revenue: liters * price };
  }), [activeNozzles, brigade, pumps, tanks, settings]);

  // Tank comparison
  const tankData = useMemo(() => tanks
    .filter(t => brigade.startTankLevels?.[t.id])
    .map(t => ({
      tank: t,
      startL: brigade.startTankLevels![t.id]?.liters || 0,
      startDeg: brigade.startTankLevels![t.id]?.degrees || 0,
      endL: brigade.endTankLevels?.[t.id]?.liters || 0,
      endDeg: brigade.endTankLevels?.[t.id]?.degrees || 0,
    })), [tanks, brigade]);

  // Shop sales during brigade
  const brigadeSales = useMemo(() => {
    if (!brigade.startTimestamp) return [];
    const start = new Date(brigade.startTimestamp).getTime();
    const end = brigade.endTimestamp ? new Date(brigade.endTimestamp).getTime() : Date.now();
    return shopSales.filter(s => {
      const t = new Date(s.date).getTime();
      return t >= start && t <= end;
    });
  }, [shopSales, brigade]);

  const ActiveIcon = SECTIONS.find(s => s.id === activeSection)?.icon || Calendar;

  const statusColor = brigade.status === 'Ouverte' ? 'bg-green-500' : brigade.status === 'Planifiée' ? 'bg-blue-500' : 'bg-slate-400';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[93vh] overflow-hidden border border-slate-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,184,0,0.2)', border: '1px solid rgba(255,184,0,0.3)' }}>
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-black text-sm uppercase tracking-widest italic">Détails Brigade</h2>
              <p className="text-[11px] text-blue-200 font-bold mt-0.5">{brigade.date} · {brigade.shift} · {chef?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="p-2 hover:bg-white/20 rounded-lg transition text-white"><Printer className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-44 shrink-0 flex flex-col border-r border-slate-100 bg-white">
            <div className="px-3 py-3 space-y-0.5 flex-1">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-[11px] font-bold",
                      isActive ? "bg-blue-900 text-yellow-400" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700")}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                  </button>
                );
              })}
            </div>
            {/* Status chip */}
            <div className="p-3 border-t border-slate-100">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl", brigade.status === 'Ouverte' ? 'bg-green-50' : brigade.status === 'Planifiée' ? 'bg-blue-50' : 'bg-slate-50')}>
                <div className={cn("w-2 h-2 rounded-full", statusColor)} />
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-600">{brigade.status}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
            <AnimatePresence mode="wait">

              {/* ── Informations ── */}
              {activeSection === 'info' && (
                <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-5">
                  <SectionHeader icon={Calendar} label="Informations Brigade" />
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Date', value: brigade.date },
                      { label: 'Quart', value: brigade.shift },
                      { label: 'Chef', value: chef?.name || 'N/A' },
                      { label: 'Statut', value: brigade.status },
                      { label: 'Heure Début', value: brigade.startTime || '—' },
                      { label: 'Heure Fin', value: brigade.endTime || '—' },
                      { label: 'Démarrage', value: brigade.startTimestamp ? new Date(brigade.startTimestamp).toLocaleString('fr-FR') : '—' },
                      { label: 'Clôture', value: brigade.endTimestamp ? new Date(brigade.endTimestamp).toLocaleString('fr-FR') : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                        <p className="font-black text-slate-800 text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                  {brigade.canReactivate && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] font-bold text-amber-700">🔄 Réactivation possible après clôture</div>
                  )}
                </motion.div>
              )}

              {/* ── Cuves ── */}
              {activeSection === 'cuves' && (
                <motion.div key="cuves" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  <SectionHeader icon={Droplets} label="Niveaux des Cuves" />
                  {tankData.length === 0 && <Empty label="Aucune donnée de cuve" />}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-900 text-white">
                        <tr>{['Cuve', 'Type', 'Début °', 'Début L', 'Fin °', 'Fin L', 'Diff L'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {tankData.map(({ tank, startL, startDeg, endL, endDeg }) => (
                          <tr key={tank.id} className="hover:bg-blue-50/20">
                            <td className="px-3 py-3 font-black text-slate-800">{tank.name}</td>
                            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">{tank.type}</span></td>
                            <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{startDeg.toFixed(1)}°</td>
                            <td className="px-3 py-3 font-black text-blue-700">{startL.toLocaleString('fr-FR')} L</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{endDeg.toFixed(1)}°</td>
                            <td className="px-3 py-3 font-black text-slate-700">{endL.toLocaleString('fr-FR')} L</td>
                            <td className="px-3 py-3 font-black text-green-700">{(startL - endL).toFixed(1)} L</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ── Pistolets ── */}
              {activeSection === 'pistolets' && (
                <motion.div key="pistolets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  <SectionHeader icon={Zap} label="Index Pistolets" />
                  {nozzleData.length === 0 && <Empty label="Aucun pistolet actif" />}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-900 text-white">
                        <tr>{['Pistolet', 'Pompe', 'Type', 'Index Début', 'Index Fin', 'Litres', 'Montant'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {nozzleData.map(d => (
                          <tr key={d.nozzle.id} className="hover:bg-purple-50/20">
                            <td className="px-3 py-3 font-black text-slate-800">{d.nozzle.name}</td>
                            <td className="px-3 py-3 text-slate-600">{d.pump?.name || '—'}</td>
                            <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700">{d.pump?.type}</span></td>
                            <td className="px-3 py-3 font-mono text-[11px] text-slate-500 tabular-nums">{d.startIdx.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-slate-500 tabular-nums">{d.endIdx.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-3 font-black text-blue-700">{d.liters.toFixed(2)} L</td>
                            <td className="px-3 py-3 font-black text-green-700">{d.revenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</td>
                          </tr>
                        ))}
                      </tbody>
                      {nozzleData.length > 0 && (
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">TOTAL</td>
                            <td className="px-3 py-2 font-black text-blue-800">{nozzleData.reduce((s, d) => s + d.liters, 0).toFixed(2)} L</td>
                            <td className="px-3 py-2 font-black text-green-800">{nozzleData.reduce((s, d) => s + d.revenue, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ── Pompistes ── */}
              {activeSection === 'pompistes' && (
                <motion.div key="pompistes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  <SectionHeader icon={Users} label="Pompistes de Brigade" />
                  {(brigade.pompisteAssignments || []).length > 0 ? (
                    <div className="space-y-3">
                      {(brigade.pompisteAssignments || []).map(assignment => {
                        const pompiste = pompistes.find(p => p.id === assignment.pompisteId);
                        const track = tracks.find(t => t.id === assignment.trackId);
                        const trackPumps = pumps.filter(p => p.trackId === assignment.trackId);
                        const pompNozzles = nozzleData.filter(d => trackPumps.some(p => p.id === d.pump?.id));
                        const liters = pompNozzles.reduce((s, d) => s + d.liters, 0);
                        const revenue = pompNozzles.reduce((s, d) => s + d.revenue, 0);
                        return (
                          <div key={assignment.pompisteId} className={cn("p-4 rounded-2xl border-2", assignment.present ? "border-green-200 bg-white" : "border-red-200 bg-red-50/30 opacity-70")}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-white", assignment.present ? "bg-blue-700" : "bg-red-400")}>
                                {pompiste?.name[0] || '?'}
                              </div>
                              <div className="flex-1">
                                <p className="font-black text-slate-800">{pompiste?.name || assignment.pompisteId}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-500">{track?.name || 'Piste inconnue'}</span>
                                  {assignment.chefActingAsPompiste && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full">Chef/Pompiste</span>}
                                  <span className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-full", assignment.present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{assignment.present ? 'Présent' : 'Absent'}</span>
                                </div>
                              </div>
                              {assignment.present && (
                                <div className="text-right">
                                  <p className="font-black text-blue-700">{liters.toFixed(2)} L</p>
                                  <p className="font-black text-green-700 text-sm">{revenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Fallback for old brigades without pompisteAssignments
                    <div className="space-y-3">
                      {pompistes.filter(p => brigade.pompisteIds?.includes(p.id)).map(pompiste => (
                        <div key={pompiste.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-700 text-white rounded-xl flex items-center justify-center font-black">{pompiste.name[0]}</div>
                          <div><p className="font-black text-slate-800">{pompiste.name}</p><p className="text-[10px] text-slate-500">{tracks.find(t => t.id === pompiste.trackId)?.name}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Comptabilité ── */}
              {activeSection === 'comptabilite' && (
                <motion.div key="comptabilite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-5">
                  <SectionHeader icon={DollarSign} label="Comptabilité" />
                  {!accounting ? (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Aucune comptabilité enregistrée</p>
                      <p className="text-slate-300 text-sm mt-1">Utilisez le bouton "Comptabilité" depuis la carte brigade</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Total Dû', value: `${accounting.totalDue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`, color: 'text-blue-700' },
                          { label: 'Espèces Reçues', value: `${accounting.cashReceived.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`, color: 'text-green-700' },
                          { label: 'Reste', value: `${accounting.rest.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`, color: Math.abs(accounting.rest) < 1 ? 'text-green-700' : 'text-red-700' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                            <p className={cn("font-black text-lg", color)}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-black", accounting.status === 'completed' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                          {accounting.status === 'completed' ? '✓ Comptabilisée' : 'En cours'}
                        </span>
                        {accounting.createdBy && <span className="text-[10px] text-slate-500 font-bold">par {accounting.createdBy}</span>}
                      </div>
                      {(accounting.justifications || []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Justifications Clients</p>
                          {(accounting.justifications || []).map(j => (
                            <div key={j.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                              <span className="text-sm font-bold text-slate-700">{j.clientId}</span>
                              <span className="font-black text-blue-700">{j.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Ventes Magasin ── */}
              {activeSection === 'ventes' && (
                <motion.div key="ventes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  <SectionHeader icon={ShoppingBag} label={`Ventes Magasin (${brigadeSales.length})`} />
                  {brigadeSales.length === 0 ? (
                    <Empty label="Aucune vente magasin pendant cette brigade" />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-700 text-white">
                            <tr>{['Date', 'Total', 'Mode Paiement', 'Statut'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest">{h}</th>
                            ))}</tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {brigadeSales.map(s => (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-3 py-3 text-[11px] font-bold text-slate-700">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                                <td className="px-3 py-3 font-black text-green-700">{s.total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</td>
                                <td className="px-3 py-3 text-slate-600 text-[11px]">{s.paymentMode}</td>
                                <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700">{s.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                              <td className="px-3 py-2 font-black text-[10px] uppercase text-slate-500">TOTAL</td>
                              <td className="px-3 py-2 font-black text-green-800">{brigadeSales.reduce((s, x) => s + x.total, 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD</td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ── Historique ── */}
              {activeSection === 'historique' && (
                <motion.div key="historique" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
                  <SectionHeader icon={Activity} label="Historique des Actions" />
                  <div className="space-y-3">
                    {[
                      brigade.startTimestamp && { time: brigade.startTimestamp, label: 'Brigade créée', color: 'bg-blue-500' },
                      brigade.status === 'Ouverte' && brigade.startTimestamp && { time: brigade.startTimestamp, label: 'Brigade activée', color: 'bg-green-500' },
                      brigade.endTimestamp && { time: brigade.endTimestamp, label: 'Brigade clôturée', color: 'bg-slate-500' },
                      accounting && { time: brigade.endTimestamp || brigade.date, label: `Comptabilité enregistrée (${accounting.status})`, color: 'bg-emerald-500' },
                    ].filter(Boolean).map((ev: any, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100">
                        <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", ev.color)} />
                        <div>
                          <p className="font-black text-slate-800 text-sm">{ev.label}</p>
                          <p className="text-[10px] text-slate-400">{new Date(ev.time).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-yellow-50 border-t border-slate-200 flex gap-3 shrink-0">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase text-blue-900 border-2 border-blue-900 rounded-xl hover:bg-blue-50 transition-colors bg-white">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
          <button onClick={onClose} className="flex-1 bg-gradient-to-r from-blue-900 to-blue-800 text-white font-black uppercase tracking-widest rounded-xl py-2.5 text-[10px] hover:shadow-lg transition-all hover:-translate-y-0.5">
            FERMER
          </button>
        </div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ icon: React.FC<any>; label: string }> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
    <div className="w-8 h-8 rounded-xl bg-blue-900 flex items-center justify-center"><Icon className="w-4 h-4 text-yellow-400" /></div>
    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</h3>
  </div>
);

const Empty: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-12 text-slate-400 text-sm">{label}</div>
);

export default BrigadeDetailModal;
