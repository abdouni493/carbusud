import React, { useState, useEffect } from "react";
import { X, Shield, ShieldCheck, ShieldAlert, Check, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { UserPermissions, UserPermission } from "../store/AppContext";
import {
  GROUPS,
  emptyPermission,
  fullPermission,
  viewOnlyPermission,
  getDefaultPermissions,
} from "../lib/permissionDefaults";

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerName: string;
  workerRole: 'pompiste' | 'chef_brigade' | 'gerant' | 'magasin';
  currentPermissions: UserPermissions;
  onSave: (permissions: UserPermissions) => void;
}

const ROLE_CONFIG = {
  pompiste:     { label: "Pompiste",        color: "text-emerald-600",  bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
  chef_brigade: { label: "Chef de Brigade", color: "text-purple-600",   bg: "bg-purple-50",   border: "border-purple-200",  dot: "bg-purple-500" },
  gerant:       { label: "Gérant",          color: "text-blue-600",     bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-500" },
  magasin:      { label: "Employé Magasin", color: "text-pink-600",     bg: "bg-pink-50",     border: "border-pink-200",    dot: "bg-pink-500" },
};

const ACTIONS: { action: keyof UserPermission; label: string; shortLabel: string }[] = [
  { action: 'voir',      label: 'Voir',     shortLabel: 'V' },
  { action: 'creer',     label: 'Créer',    shortLabel: 'C' },
  { action: 'modifier',  label: 'Modifier', shortLabel: 'M' },
  { action: 'supprimer', label: 'Suppr.',   shortLabel: 'S' },
  { action: 'imprimer',  label: 'Imprimer', shortLabel: 'I' },
  { action: 'exporter',  label: 'Exporter', shortLabel: 'E' },
  { action: 'scanner',   label: 'Scanner',  shortLabel: 'Sc' },
  { action: 'generer',   label: 'Générer',  shortLabel: 'G' },
];

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen, onClose, workerName, workerRole, currentPermissions, onSave
}) => {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [activeGroup, setActiveGroup] = useState<string>(GROUPS[0].title);
  const roleConf = ROLE_CONFIG[workerRole];

  useEffect(() => {
    if (!isOpen) return;
    const hasExisting = currentPermissions && Object.keys(currentPermissions).length > 0;
    if (hasExisting) {
      const initial: UserPermissions = {};
      GROUPS.forEach(g => g.modules.forEach(m => {
        initial[m.id] = currentPermissions[m.id] ? { ...currentPermissions[m.id] } : { ...emptyPermission };
      }));
      setPermissions(initial);
    } else {
      setPermissions(getDefaultPermissions(workerRole));
    }
    setActiveGroup(GROUPS[0].title);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (moduleId: string, action: keyof UserPermission) => {
    setPermissions(prev => {
      const modulePerm = prev[moduleId] ? { ...prev[moduleId] } : { ...emptyPermission };
      const nextVal = !modulePerm[action];
      modulePerm[action] = nextVal;
      if (action === "voir" && !nextVal) {
        // turning off "voir" clears all sub-actions
        Object.keys(modulePerm).forEach(k => { if (k !== 'voir') (modulePerm as any)[k] = false; });
      }
      if (action !== "voir" && nextVal) {
        modulePerm.voir = true; // enabling any action requires "voir"
      }
      return { ...prev, [moduleId]: modulePerm };
    });
  };

  const applyTemplate = (type: 'pompiste' | 'chef_brigade' | 'gerant' | 'magasin' | 'all' | 'none') => {
    if (type === 'all') {
      const next: UserPermissions = {};
      GROUPS.forEach(g => g.modules.forEach(m => { next[m.id] = { ...fullPermission }; }));
      setPermissions(next);
    } else if (type === 'none') {
      const next: UserPermissions = {};
      GROUPS.forEach(g => g.modules.forEach(m => { next[m.id] = { ...emptyPermission }; }));
      setPermissions(next);
    } else {
      setPermissions(getDefaultPermissions(type));
    }
  };

  const activeGroupModules = GROUPS.find(g => g.title === activeGroup)?.modules || [];

  // Count active permissions per group for the sidebar badges
  const groupStats = GROUPS.map(g => ({
    title: g.title,
    active: g.modules.filter(m => permissions[m.id]?.voir).length,
    total: g.modules.length,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        className="relative z-10 w-full max-w-5xl h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* ── Header — same style as Settings.tsx page header ── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-900 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-blue-900 uppercase tracking-tight italic">
                Permissions — {workerName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border", roleConf.color, roleConf.bg, roleConf.border)}>
                  {roleConf.label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Configuration des accès et privilèges</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* ── Body: Sidebar + Content (same 2-column pattern as Settings.tsx) ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left sidebar — same style as Settings.tsx section nav */}
          <div className="w-64 shrink-0 border-r border-slate-100 bg-slate-50/60 flex flex-col overflow-y-auto">
            {/* Quick templates */}
            <div className="p-4 border-b border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-blue-900" /> Modèles Rapides
              </p>
              <div className="space-y-1.5">
                {[
                  { type: 'pompiste'     as const, label: 'Pompiste',        color: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' },
                  { type: 'chef_brigade' as const, label: 'Chef Brigade',    color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300' },
                  { type: 'gerant'       as const, label: 'Gérant',          color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300' },
                  { type: 'magasin'      as const, label: 'Emp. Magasin',    color: 'hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300' },
                ].map(t => (
                  <button
                    key={t.type}
                    onClick={() => applyTemplate(t.type)}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 transition-all", t.color)}
                  >
                    {t.label}
                  </button>
                ))}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button onClick={() => applyTemplate('all')} className="px-2 py-2 bg-blue-900 text-yellow-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-blue-800 transition-colors">
                    Tout ON
                  </button>
                  <button onClick={() => applyTemplate('none')} className="px-2 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-red-100 transition-colors">
                    Tout OFF
                  </button>
                </div>
              </div>
            </div>

            {/* Group navigation */}
            <div className="flex-1 p-3 space-y-0.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 mt-1">Modules</p>
              {groupStats.map(gs => (
                <button
                  key={gs.title}
                  onClick={() => setActiveGroup(gs.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all",
                    activeGroup === gs.title
                      ? "bg-blue-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
                  )}
                >
                  <span className="text-[11px] font-black uppercase tracking-wide">{gs.title}</span>
                  <span className={cn(
                    "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                    activeGroup === gs.title
                      ? "bg-white/20 text-white"
                      : gs.active > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-400"
                  )}>
                    {gs.active}/{gs.total}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right content — permission toggles */}
          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGroup}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-black text-blue-900 uppercase tracking-tight italic">{activeGroup}</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Configurez les droits d'accès pour chaque module</p>
                  </div>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-10 gap-2 px-5 pb-2 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="col-span-2">Module</div>
                  {ACTIONS.map(a => <div key={a.action} className="text-center">{a.label}</div>)}
                </div>

                {/* Module rows */}
                <div className="space-y-2">
                  {activeGroupModules.map(mod => {
                    const perm = permissions[mod.id] || { ...emptyPermission };
                    const IconComponent = mod.icon;
                    const hasAnyAccess = perm.voir;

                    return (
                      <div
                        key={mod.id}
                        className={cn(
                          "grid grid-cols-10 gap-2 p-4 rounded-2xl border transition-all items-center",
                          hasAnyAccess
                            ? "bg-white border-slate-200 shadow-sm"
                            : "bg-slate-50 border-slate-100"
                        )}
                      >
                        {/* Module info */}
                        <div className="col-span-2 flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                            hasAnyAccess ? "bg-blue-900/10 text-blue-900" : "bg-slate-200 text-slate-400"
                          )}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className={cn("font-black text-xs truncate", hasAnyAccess ? "text-slate-800" : "text-slate-400")}>
                            {mod.label}
                          </span>
                        </div>

                        {/* Toggle buttons for each action */}
                        {ACTIONS.map(({ action }) => {
                          const isChecked = perm[action] || false;
                          return (
                            <div key={action} className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleToggle(mod.id, action)}
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                  isChecked
                                    ? "bg-blue-900 border-blue-900 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-300 hover:border-blue-300"
                                )}
                              >
                                {isChecked ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3 opacity-30" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Footer — same style as Settings.tsx save footer ── */}
        <div className="px-8 py-5 border-t border-slate-100 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Les modifications s'appliqueront immédiatement
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-blue-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-900 italic hover:bg-blue-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => { onSave(permissions); onClose(); }}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 text-yellow-400 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionsModal;
