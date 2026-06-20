import React, { useMemo } from "react";
import { motion } from "motion/react";
import { X, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

const BrigadeFicheModal: React.FC<Props> = ({
  brigade, pumps, tanks, pompistes, brigadeChefs, pumpNozzles, tracks, shopSales, settings, accounting, onClose
}) => {
  const chef = brigadeChefs.find(c => c.id === brigade.chefId);

  const activeNozzles = useMemo(() => {
    if (brigade.activeNozzleIds && brigade.activeNozzleIds.length > 0)
      return pumpNozzles.filter(n => brigade.activeNozzleIds!.includes(n.id));
    const brigadeTrackIds = (brigade.pompisteAssignments || []).filter(a => a.present).map(a => a.trackId);
    const displayPumps = brigadeTrackIds.length > 0 ? pumps.filter(p => brigadeTrackIds.includes(p.trackId)) : pumps.filter(p => Object.keys(brigade.startIndices || {}).includes(p.id));
    return pumpNozzles.filter(n => displayPumps.some(p => p.id === n.pumpId));
  }, [brigade, pumps, pumpNozzles]);

  const nozzleRows = useMemo(() => activeNozzles.map(nozzle => {
    const pump = pumps.find(p => p.id === nozzle.pumpId);
    const track = tracks.find(t => t.id === pump?.trackId);
    const startIdx = brigade.startNozzleIndices?.[nozzle.id] ?? (brigade.startIndices?.[nozzle.pumpId] || 0);
    const endIdx = brigade.endNozzleIndices?.[nozzle.id] ?? (brigade.endIndices?.[nozzle.pumpId] || startIdx);
    const liters = Math.max(0, endIdx - startIdx);
    const price = settings.fuelPrices[pump?.type || 'SUPER'] || 0;
    return { nozzle, pump, track, startIdx, endIdx, liters, price, amount: liters * price };
  }), [activeNozzles, brigade, pumps, tracks, settings]);

  const tankRows = useMemo(() => tanks
    .filter(t => brigade.startTankLevels?.[t.id])
    .map(t => ({
      tank: t,
      startL: brigade.startTankLevels![t.id]?.liters || 0,
      endL: brigade.endTankLevels?.[t.id]?.liters || 0,
    })), [tanks, brigade]);

  const brigadeSales = useMemo(() => {
    if (!brigade.startTimestamp) return [];
    const start = new Date(brigade.startTimestamp).getTime();
    const end = brigade.endTimestamp ? new Date(brigade.endTimestamp).getTime() : Date.now();
    return shopSales.filter(s => { const t = new Date(s.date).getTime(); return t >= start && t <= end; });
  }, [shopSales, brigade]);

  const pompisteSummary = useMemo(() => {
    const assignments = brigade.pompisteAssignments?.filter(a => a.present) || brigade.pompisteIds?.map(pid => ({ pompisteId: pid, trackId: pompistes.find(p => p.id === pid)?.trackId || '', present: true })) || [];
    return assignments.map(a => {
      const pompiste = pompistes.find(p => p.id === a.pompisteId);
      const track = tracks.find(t => t.id === a.trackId);
      const trackPumps = pumps.filter(p => p.trackId === a.trackId);
      const pompNozzles = nozzleRows.filter(d => trackPumps.some(p => p.id === d.pump?.id));
      return { pompiste, track, liters: pompNozzles.reduce((s, d) => s + d.liters, 0), revenue: pompNozzles.reduce((s, d) => s + d.amount, 0) };
    });
  }, [brigade, pompistes, tracks, pumps, nozzleRows]);

  // ── Detailed breakdown: Piste → Pompe → Pistolet ──────────────────────────────
  const pumpBreakdown = useMemo(() => {
    const trackList = [...new Set(nozzleRows.map(d => d.track?.id).filter(Boolean))];
    return trackList.map(trackId => {
      const track = tracks.find(t => t.id === trackId);
      const assignment = brigade.pompisteAssignments?.find(a => a.trackId === trackId && a.present);
      const pompiste = assignment ? pompistes.find(p => p.id === assignment.pompisteId) : undefined;
      const trackPumps = pumps.filter(p => p.trackId === trackId);
      return {
        track,
        pompiste,
        pumps: trackPumps.map(pump => {
          const nozzles = nozzleRows.filter(d => d.pump?.id === pump.id);
          return {
            pump,
            nozzles,
            totalLiters: nozzles.reduce((s, d) => s + d.liters, 0),
            totalAmount: nozzles.reduce((s, d) => s + d.amount, 0),
          };
        }),
        totalLiters: nozzleRows.filter(d => trackPumps.some(p => p.id === d.pump?.id)).reduce((s, d) => s + d.liters, 0),
        totalAmount: nozzleRows.filter(d => trackPumps.some(p => p.id === d.pump?.id)).reduce((s, d) => s + d.amount, 0),
      };
    });
  }, [nozzleRows, tracks, pumps, pompistes, brigade]);

  const totalFuel = nozzleRows.reduce((s, d) => s + d.amount, 0);
  const totalShop = brigadeSales.reduce((s, x) => s + x.total, 0);
  const totalGeneral = totalFuel + totalShop;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportPDF = async () => {
    const content = document.getElementById('fiche-brigade-content');
    if (!content) return;
    const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save(`Fiche_Brigade_${brigade.date}_${brigade.shift}.pdf`);
  };

  return (
    <div id="fiche-root" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm print:hidden" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[95vh] overflow-hidden border border-slate-100">

        {/* Screen Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-800 print:hidden">
          <p className="font-black text-yellow-400 uppercase tracking-widest text-sm">📋 Fiche de Brigade</p>
          <div className="flex gap-2">
            <button onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-blue-900 rounded-xl text-[10px] font-black uppercase hover:bg-yellow-300 transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl text-[10px] font-black uppercase hover:bg-white/30 transition-colors">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Scrollable printable content */}
        <div id="fiche-brigade-content" className="flex-1 overflow-y-auto p-8 space-y-6 text-left bg-white not-italic" style={{ fontFamily: 'Arial, sans-serif' }}>

          {/* ── HEADER: Logo left, Station info right ── */}
          <div className="flex items-start justify-between pb-5 border-b-2 border-blue-900">
            <div className="flex items-start gap-4">
              {(settings.logoUrl || settings.logo) ? (
                <img src={settings.logoUrl || settings.logo} alt="logo" className="w-16 h-16 object-contain rounded-xl border border-slate-200" />
              ) : (
                <div className="w-16 h-16 bg-blue-900 rounded-xl flex items-center justify-center">
                  <span className="text-yellow-400 font-black text-xl">⛽</span>
                </div>
              )}
              <div>
                <p className="font-black text-xl text-blue-900">{settings.name || 'Station'}</p>
                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">FICHE DE BRIGADE</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-600 space-y-0.5">
              {settings.address && <p>{settings.address}</p>}
              {settings.phone && <p>Tél: {settings.phone}</p>}
              {settings.email && <p>{settings.email}</p>}
              {settings.fiscalId && <p>NIF: {settings.fiscalId}</p>}
              {(settings as any).rc && <p>RC: {(settings as any).rc}</p>}
            </div>
          </div>
          <div className="w-full h-0.5 bg-gradient-to-r from-blue-900 via-yellow-400 to-blue-900" />

          {/* ── Brigade Info Banner ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Date', value: brigade.date },
              { label: 'Quart', value: brigade.shift },
              { label: 'Chef', value: chef?.name || 'N/A' },
              { label: 'Horaires', value: `${brigade.startTime || '—'} → ${brigade.endTime || '—'}` },
            ].map(item => (
              <div key={item.label} className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="font-black text-blue-900 text-sm">{item.value}</p>
              </div>
            ))}
          </div>

          {/* ── SECTION 1: Cuves ── */}
          {tankRows.length > 0 && (
            <section>
              <FicheHeader num="1" label="Cuves" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-blue-900 text-white">
                  {['Cuve', 'Type', 'Début (L)', 'Fin (L)', 'Sortie (L)'].map(h => <Th key={h} dark>{h}</Th>)}
                </tr></thead>
                <tbody>
                  {tankRows.map(({ tank, startL, endL }) => (
                    <tr key={tank.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <Td><strong>{tank.name}</strong></Td>
                      <Td><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">{tank.type}</span></Td>
                      <Td className="tabular-nums">{fmt(startL)}</Td>
                      <Td className="tabular-nums">{fmt(endL)}</Td>
                      <Td><strong className="text-blue-700">{fmt(startL - endL)}</strong></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 2: Piste → Pompe → Pistolet detail ── */}
          {pumpBreakdown.length > 0 && (
            <section>
              <FicheHeader num="2" label="Détail par Piste / Pompe / Pistolet" />
              {pumpBreakdown.map(({ track, pompiste, pumps: pumpList, totalLiters, totalAmount }) => (
                <div key={track?.id} className="mb-4 rounded-xl overflow-hidden border-2 border-blue-200">
                  {/* Piste Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-between">
                    <div>
                      <p className="font-black text-white text-sm">Piste: {track?.name || '—'}</p>
                      <p className="text-[10px] text-blue-300">Pompiste: {pompiste?.name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-yellow-400">{fmt(totalAmount)} DA</p>
                      <p className="text-[10px] text-blue-300">{totalLiters.toFixed(2)} L</p>
                    </div>
                  </div>

                  {/* Per pump */}
                  {pumpList.map(({ pump, nozzles, totalLiters: pumpL, totalAmount: pumpA }) => (
                    nozzles.length > 0 && (
                      <div key={pump.id} className="border-t border-blue-100">
                        <div className="px-4 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                          <span className="text-[10px] font-black text-slate-600 uppercase">🔧 {pump.name} ({pump.type})</span>
                          <span className="text-[10px] font-black text-slate-600">{pumpL.toFixed(2)} L — {fmt(pumpA)} DA</span>
                        </div>
                        <table className="w-full text-xs">
                          <thead><tr className="bg-slate-100">
                            {['Pistolet', 'Idx Début', 'Idx Fin', 'Litres', 'Prix/L', 'Montant'].map(h => (
                              <th key={h} className="px-3 py-1.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {nozzles.map(d => (
                              <tr key={d.nozzle.id} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-bold border border-slate-200">⚡ {d.nozzle.name}</td>
                                <td className="px-3 py-2 tabular-nums text-slate-500 border border-slate-200">{fmt(d.startIdx)}</td>
                                <td className="px-3 py-2 tabular-nums text-slate-500 border border-slate-200">{fmt(d.endIdx)}</td>
                                <td className="px-3 py-2 font-black text-blue-700 border border-slate-200">{d.liters.toFixed(2)} L</td>
                                <td className="px-3 py-2 text-slate-500 border border-slate-200">{d.price.toFixed(2)}</td>
                                <td className="px-3 py-2 font-black text-green-700 border border-slate-200">{fmt(d.amount)} DA</td>
                              </tr>
                            ))}
                            <tr className="bg-blue-50 font-black">
                              <td colSpan={3} className="px-3 py-1.5 text-[9px] uppercase text-blue-800 border border-slate-200">Total {pump.name}</td>
                              <td className="px-3 py-1.5 text-blue-800 border border-slate-200">{pumpL.toFixed(2)} L</td>
                              <td className="border border-slate-200" />
                              <td className="px-3 py-1.5 text-blue-800 border border-slate-200">{fmt(pumpA)} DA</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  ))}
                  {/* Piste footer total */}
                  <div className="px-4 py-2 bg-blue-50 flex justify-between border-t-2 border-blue-200">
                    <span className="font-black text-blue-900 text-[11px] uppercase">Total Piste {track?.name}</span>
                    <span className="font-black text-blue-900">{totalLiters.toFixed(2)} L — {fmt(totalAmount)} DA</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ── SECTION 3: Récapitulatif par Pompiste ── */}
          {pompisteSummary.length > 0 && (
            <section>
              <FicheHeader num="3" label="Récapitulatif par Pompiste" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-blue-900 text-white">
                  {['Pompiste', 'Piste', 'Litres Vendus', 'Montant (DA)'].map(h => <Th key={h} dark>{h}</Th>)}
                </tr></thead>
                <tbody>
                  {pompisteSummary.map((p, i) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                      <Td><strong>{p.pompiste?.name || '—'}</strong></Td>
                      <Td>{p.track?.name || '—'}</Td>
                      <Td className="tabular-nums font-black text-blue-700">{p.liters.toFixed(2)} L</Td>
                      <Td className="tabular-nums font-black text-green-700">{fmt(p.revenue)}</Td>
                    </tr>
                  ))}
                  <tr className="bg-blue-900 text-white font-black">
                    <td colSpan={2} className="px-3 py-2 text-[10px] uppercase">TOTAL CARBURANT BRIGADE</td>
                    <td className="px-3 py-2">{pompisteSummary.reduce((s, p) => s + p.liters, 0).toFixed(2)} L</td>
                    <td className="px-3 py-2 text-yellow-400">{fmt(totalFuel)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 4: Ventes Magasin ── */}
          {brigadeSales.length > 0 && (
            <section>
              <FicheHeader num="4" label="Ventes Magasin" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-700 text-white">
                  {['Date', 'Total (DA)', 'Mode Paiement', 'Statut'].map(h => <Th key={h} dark>{h}</Th>)}
                </tr></thead>
                <tbody>
                  {brigadeSales.map(s => (
                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <Td>{new Date(s.date).toLocaleDateString('fr-FR')}</Td>
                      <Td><strong>{fmt(s.total)}</strong></Td>
                      <Td>{s.paymentMode}</Td>
                      <Td>{s.status}</Td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black">
                    <td className="px-3 py-2 text-[10px] uppercase border border-slate-200">TOTAL MAGASIN</td>
                    <td className="px-3 py-2 border border-slate-200">{fmt(totalShop)}</td>
                    <td colSpan={2} className="border border-slate-200" />
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 5: Récapitulatif Financier ── */}
          <section>
            <FicheHeader num="5" label="Récapitulatif Financier" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Carburant', value: `${fmt(totalFuel)} DA` },
                { label: 'Total Magasin', value: `${fmt(totalShop)} DA` },
                { label: 'TOTAL GÉNÉRAL', value: `${fmt(totalGeneral)} DA`, bold: true },
                accounting && { label: 'Espèces Reçues', value: `${fmt(accounting.cashReceived)} DA` },
                accounting && { label: 'Reste', value: `${fmt(accounting.rest)} DA`, bold: true },
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} className={`flex justify-between px-4 py-3 rounded-xl border ${row.bold ? 'bg-blue-900 text-white font-black border-blue-900' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-sm">{row.label}</span>
                  <span className={`font-black text-sm ${row.bold ? 'text-yellow-400' : 'text-slate-800'}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── FOOTER: Signatures ── */}
          <div className="pt-6 mt-6 border-t-2 border-slate-300">
            <p className="text-[10px] text-slate-500 mb-6">Imprimé le {new Date().toLocaleString('fr-FR')}</p>
            <div className="grid grid-cols-2 gap-16">
              <div>
                <p className="text-sm font-black text-slate-700 mb-8">Signature du Chef de Brigade:</p>
                <div className="border-b-2 border-slate-400 w-full" />
                <p className="text-xs text-slate-500 mt-1">{chef?.name || '_______________'}</p>
              </div>
              <div>
                <p className="text-sm font-black text-slate-700 mb-8">Signature du Gérant:</p>
                <div className="border-b-2 border-slate-400 w-full" />
                <p className="text-xs text-slate-500 mt-1">_______________</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @media print {
          body > *:not(#fiche-root) { display: none !important; }
          .fixed { position: static !important; }
          #fiche-brigade-content { overflow: visible !important; max-height: none !important; padding: 20px !important; }
          .print\\:hidden { display: none !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

const FicheHeader: React.FC<{ num?: string; label: string }> = ({ num, label }) => (
  <h3 className="font-black text-blue-900 text-sm uppercase tracking-wider mb-3 pb-1 border-b border-blue-200 flex items-center gap-2">
    {num && <span className="w-6 h-6 bg-blue-900 text-yellow-400 rounded-lg flex items-center justify-center text-[11px] shrink-0">{num}</span>}
    {label}
  </h3>
);
const Th: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <th className={`px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest border ${dark ? 'border-blue-800 text-white' : 'border-slate-200'}`}>{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={`px-3 py-2 text-sm border border-slate-200 ${className || ''}`}>{children}</td>
);

export default BrigadeFicheModal;
