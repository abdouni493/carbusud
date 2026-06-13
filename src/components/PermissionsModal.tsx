import React, { useState, useEffect } from "react";
import { X, Shield, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
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

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  workerName,
  workerRole,
  currentPermissions,
  onSave
}) => {
  const [permissions, setPermissions] = useState<UserPermissions>({});

  // Initialize only when modal opens (not on every parent re-render).
  // This prevents realtime updates from overwriting in-progress changes.
  useEffect(() => {
    if (!isOpen) return;
    const hasExisting = currentPermissions && Object.keys(currentPermissions).length > 0;
    if (hasExisting) {
      // Merge saved permissions with the full module skeleton
      const initial: UserPermissions = {};
      GROUPS.forEach(g => {
        g.modules.forEach(m => {
          initial[m.id] = currentPermissions[m.id]
            ? { ...currentPermissions[m.id] }
            : { ...emptyPermission };
        });
      });
      setPermissions(initial);
    } else {
      // No saved permissions yet — apply the role's default template
      setPermissions(getDefaultPermissions(workerRole));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (moduleId: string, action: keyof UserPermission) => {
    setPermissions(prev => {
      const modulePerm = prev[moduleId] ? { ...prev[moduleId] } : { ...emptyPermission };
      const nextVal = !modulePerm[action];
      modulePerm[action] = nextVal;

      if (action === "voir" && !nextVal) {
        modulePerm.creer = false;
        modulePerm.modifier = false;
        modulePerm.supprimer = false;
        modulePerm.imprimer = false;
        modulePerm.exporter = false;
        modulePerm.scanner = false;
        modulePerm.generer = false;
      }
      if (action !== "voir" && nextVal) {
        modulePerm.voir = true;
      }

      return { ...prev, [moduleId]: modulePerm };
    });
  };

  const applyTemplate = (type: 'pompiste' | 'chef' | 'gerant' | 'magasin' | 'all' | 'none') => {
    if (type === 'all') {
      const next: UserPermissions = {};
      GROUPS.forEach(g => g.modules.forEach(m => { next[m.id] = { ...fullPermission }; }));
      setPermissions(next);
    } else if (type === 'none') {
      const next: UserPermissions = {};
      GROUPS.forEach(g => g.modules.forEach(m => { next[m.id] = { ...emptyPermission }; }));
      setPermissions(next);
    } else {
      const roleMap = { pompiste: 'pompiste', chef: 'chef_brigade', gerant: 'gerant', magasin: 'magasin' } as const;
      setPermissions(getDefaultPermissions(roleMap[type]));
    }
  };

  const handleSaveClick = () => {
    onSave(permissions);
    onClose();
  };

  const getRoleLabelAndBadge = () => {
    switch (workerRole) {
      case 'pompiste':     return { label: "Pompiste",       style: "bg-emerald-100 text-emerald-700" };
      case 'chef_brigade': return { label: "Chef Brigade",   style: "bg-purple-100 text-purple-700" };
      case 'gerant':       return { label: "Gérant",         style: "bg-blue-100 text-blue-700" };
      case 'magasin':      return { label: "Employé Magasin",style: "bg-pink-100 text-pink-700" };
      default:             return { label: workerRole,       style: "bg-slate-100 text-slate-700" };
    }
  };

  const roleInfo = getRoleLabelAndBadge();

  // All 8 permission actions with their display labels
  const ACTIONS = [
    { action: 'creer'    as const, label: 'Créer'    },
    { action: 'modifier' as const, label: 'Modifier' },
    { action: 'supprimer'as const, label: 'Suppr.'   },
    { action: 'voir'     as const, label: 'Voir'     },
    { action: 'imprimer' as const, label: 'Imprimer' },
    { action: 'exporter' as const, label: 'Exporter' },
    { action: 'scanner'  as const, label: 'Scanner'  },
    { action: 'generer'  as const, label: 'Générer'  },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 italic text-left">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col h-[90vh] border border-slate-100"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-yellow-400 animate-pulse" />
            <div>
              <h3 className="font-black text-sm md:text-base uppercase tracking-widest italic text-yellow-400">
                Permissions — {workerName}
              </h3>
              <p className="text-[10px] text-yellow-100/70 font-bold uppercase tracking-tight mt-0.5">
                Configuration des accès et privilèges de sécurité
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", roleInfo.style)}>
              {roleInfo.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {/* Templates Section */}
          <div className="p-5 border border-slate-100 rounded-3xl bg-slate-50/50 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Modèles de Configuration Rapide
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => applyTemplate('pompiste')} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all shadow-sm">
                Template Pompiste
              </button>
              <button onClick={() => applyTemplate('chef')} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/30 transition-all shadow-sm">
                Template Chef Brigade
              </button>
              <button onClick={() => applyTemplate('gerant')} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all shadow-sm">
                Template Gérant
              </button>
              <button onClick={() => applyTemplate('magasin')} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:border-pink-500 hover:text-pink-600 hover:bg-pink-50/30 transition-all shadow-sm">
                Template Employé Magasin
              </button>
              <div className="w-[1px] h-8 bg-slate-200 self-center hidden sm:block" />
              <button onClick={() => applyTemplate('all')} className="px-4 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-yellow-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all shadow-md shadow-blue-900/10">
                Tout Activer
              </button>
              <button onClick={() => applyTemplate('none')} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all hover:scale-105">
                Tout Désactiver
              </button>
            </div>
          </div>

          {/* Modules Grid */}
          <div className="space-y-6">
            {/* Desktop header — 10 cols: 2 for module + 8 for actions */}
            <div className="grid grid-cols-10 gap-2 px-4 pb-2 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:grid shrink-0">
              <div className="col-span-2">Module</div>
              {ACTIONS.map(({ action, label }) => (
                <div key={action} className="text-center">{label}</div>
              ))}
            </div>

            <div className="space-y-8">
              {GROUPS.map(group => (
                <div key={group.title} className="space-y-3">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest border-l-4 border-secondary pl-3">
                    {group.title}
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-3xl bg-white shadow-sm overflow-hidden">
                    {group.modules.map(mod => {
                      const perm = permissions[mod.id] || { ...emptyPermission };
                      const IconComponent = mod.icon;

                      return (
                        <div
                          key={mod.id}
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-10 gap-2 p-4 md:p-5 items-center transition-colors",
                            perm.voir ? "bg-white" : "bg-slate-50/50"
                          )}
                        >
                          {/* Module info */}
                          <div className="col-span-2 flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-xl transition-colors shrink-0",
                              perm.voir ? "bg-primary/10 text-primary" : "bg-slate-150 text-slate-400"
                            )}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-700 text-xs truncate">
                              {mod.label}
                            </span>
                          </div>

                          {/* Toggles — all 8 actions */}
                          {ACTIONS.map(({ action, label }) => {
                            const isChecked = perm[action] || false;
                            return (
                              <div key={action} className="flex md:justify-center items-center justify-between md:py-0 py-1.5 border-t border-slate-50 md:border-t-0">
                                <span className="text-[10px] font-bold text-slate-400 md:hidden">{label}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggle(mod.id, action)}
                                  className={cn(
                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                    isChecked ? "bg-primary" : "bg-slate-200"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                      isChecked ? "translate-x-4" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gradient-to-r from-slate-50 to-yellow-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-blue-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-900 italic hover:bg-white transition-colors bg-white/50"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveClick}
            className="px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-800 text-yellow-400 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:scale-105 transition-all"
          >
            Sauvegarder les Permissions
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionsModal;
