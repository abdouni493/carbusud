import React, { useMemo } from "react";
import { motion } from "motion/react";
import { X, Printer } from "lucide-react";
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

  const totalFuel = nozzleRows.reduce((s, d) => s + d.amount, 0);
  const totalShop = brigadeSales.reduce((s, x) => s + x.total, 0);
  const totalGeneral = totalFuel + totalShop;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative z-10 flex flex-col max-h-[95vh] overflow-hidden border border-slate-100">

        {/* Screen-only toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-100 border-b border-slate-200 print:hidden">
          <p className="font-black text-slate-700 uppercase tracking-widest text-sm">📋 Fiche de Brigade</p>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-yellow-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-800 transition-colors">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Scrollable content */}
        <div id="fiche-content" className="flex-1 overflow-y-auto p-8 space-y-6 text-left not-italic" style={{ fontFamily: 'Arial, sans-serif' }}>

          {/* ── HEADER ── */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800">
            <div className="flex items-start gap-4">
              {(settings.logoUrl || settings.logo) && (
                <img src={settings.logoUrl || settings.logo} alt="logo" className="w-16 h-16 object-contain rounded-lg" />
              )}
              <div>
                <p className="font-black text-lg text-slate-900">{settings.name || 'Station Naftal'}</p>
                {settings.address && <p className="text-sm text-slate-600">{settings.address}</p>}
                {settings.phone && <p className="text-sm text-slate-600">Tél: {settings.phone}</p>}
                {settings.fiscalId && <p className="text-sm text-slate-600">NIF: {settings.fiscalId}</p>}
                {(settings as any).rc && <p className="text-sm text-slate-600">RC: {(settings as any).rc}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-xl text-slate-900 uppercase tracking-widest">FICHE DE BRIGADE</p>
              <p className="text-sm text-slate-600 mt-1">Date: {brigade.date}</p>
              <p className="text-sm text-slate-600">Quart: {brigade.shift}</p>
              <p className="text-sm text-slate-600">Chef: {chef?.name || 'N/A'}</p>
              <p className="text-sm text-slate-600">{brigade.startTime} → {brigade.endTime}</p>
            </div>
          </div>

          {/* ── SECTION 1: Cuves ── */}
          {tankRows.length > 0 && (
            <section>
              <FicheHeader label="1. Cuves" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-100">{['Cuve', 'Type', 'Début (L)', 'Fin (L)', 'Différence (L)'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {tankRows.map(({ tank, startL, endL }) => (
                    <tr key={tank.id} className="border-b border-slate-200">
                      <Td><strong>{tank.name}</strong></Td>
                      <Td>{tank.type}</Td>
                      <Td>{fmt(startL)}</Td>
                      <Td>{fmt(endL)}</Td>
                      <Td><strong>{fmt(startL - endL)}</strong></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 2: Pistolets ── */}
          {nozzleRows.length > 0 && (
            <section>
              <FicheHeader label="2. Pistolets & Pompes" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-100">{['Pistolet', 'Pompe', 'Piste', 'Index Début', 'Index Fin', 'Litres', 'Montant (MAD)'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {nozzleRows.map(d => (
                    <tr key={d.nozzle.id} className="border-b border-slate-200">
                      <Td>{d.nozzle.name}</Td>
                      <Td>{d.pump?.name}</Td>
                      <Td>{d.track?.name || '—'}</Td>
                      <Td className="tabular-nums">{fmt(d.startIdx)}</Td>
                      <Td className="tabular-nums">{fmt(d.endIdx)}</Td>
                      <Td><strong>{d.liters.toFixed(2)}</strong></Td>
                      <Td><strong>{fmt(d.amount)}</strong></Td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td colSpan={5} className="px-3 py-2 text-[11px] uppercase">TOTAL</td>
                    <td className="px-3 py-2">{nozzleRows.reduce((s, d) => s + d.liters, 0).toFixed(2)} L</td>
                    <td className="px-3 py-2">{fmt(totalFuel)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 3: Par Pompiste ── */}
          {pompisteSummary.length > 0 && (
            <section>
              <FicheHeader label="3. Ventes Carburant par Pompiste" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-100">{['Pompiste', 'Piste', 'Litres', 'Montant (MAD)'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {pompisteSummary.map((p, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <Td><strong>{p.pompiste?.name || '—'}</strong></Td>
                      <Td>{p.track?.name || '—'}</Td>
                      <Td>{p.liters.toFixed(2)} L</Td>
                      <Td><strong>{fmt(p.revenue)}</strong></Td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td colSpan={2} className="px-3 py-2 text-[11px] uppercase">TOTAL CARBURANT</td>
                    <td className="px-3 py-2">{pompisteSummary.reduce((s, p) => s + p.liters, 0).toFixed(2)} L</td>
                    <td className="px-3 py-2">{fmt(totalFuel)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 4: Ventes Magasin ── */}
          {brigadeSales.length > 0 && (
            <section>
              <FicheHeader label="4. Ventes Magasin" />
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-100">{['Date', 'Total (MAD)', 'Mode Paiement', 'Statut'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {brigadeSales.map(s => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <Td>{new Date(s.date).toLocaleDateString('fr-FR')}</Td>
                      <Td><strong>{fmt(s.total)}</strong></Td>
                      <Td>{s.paymentMode}</Td>
                      <Td>{s.status}</Td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td className="px-3 py-2 text-[11px] uppercase">TOTAL MAGASIN</td>
                    <td className="px-3 py-2">{fmt(totalShop)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* ── SECTION 5: Récapitulatif Financier ── */}
          <section>
            <FicheHeader label="5. Récapitulatif Financier" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Carburant', value: `${fmt(totalFuel)} MAD` },
                { label: 'Total Magasin', value: `${fmt(totalShop)} MAD` },
                { label: 'TOTAL GÉNÉRAL', value: `${fmt(totalGeneral)} MAD`, bold: true },
                accounting && { label: 'Espèces Reçues', value: `${fmt(accounting.cashReceived)} MAD` },
                accounting && { label: 'Reste', value: `${fmt(accounting.rest)} MAD`, bold: true },
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} className={`flex justify-between px-4 py-2 rounded-lg border ${row.bold ? 'bg-slate-900 text-white font-black border-slate-900' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-sm">{row.label}</span>
                  <span className="font-black text-sm">{row.value}</span>
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
          #fiche-content { overflow: visible !important; max-height: none !important; padding: 20px !important; }
          .print\\:hidden { display: none !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

const FicheHeader: React.FC<{ label: string }> = ({ label }) => (
  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-3 pb-1 border-b border-slate-300">{label}</h3>
);
const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest border border-slate-200">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={`px-3 py-2 text-sm border border-slate-200 ${className || ''}`}>{children}</td>
);

export default BrigadeFicheModal;
