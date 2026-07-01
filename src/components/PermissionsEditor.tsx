import React, { useState } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { UserPermissions, UserPermission } from "../store/AppContext";
import { GROUPS, ACTION_META, emptyPermission } from "../lib/permissionDefaults";

interface PermissionsEditorProps {
  value: UserPermissions;
  onChange: (next: UserPermissions) => void;
}

/**
 * Shared permission grid used by both the per-worker modal and the template
 * manager. Left column = the admin's sidebar groups. Right column = each
 * interface with a master "show in menu" toggle (voir); enabling it reveals the
 * real action buttons that interface exposes. Unchecked interfaces / actions are
 * hidden from the worker (enforced by useModulePermission on each page).
 */
const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ value, onChange }) => {
  const [activeGroup, setActiveGroup] = useState<string>(GROUPS[0].title);

  const modulePerm = (id: string): UserPermission => value[id] || { ...emptyPermission };

  const setModule = (id: string, next: UserPermission) => {
    onChange({ ...value, [id]: next });
  };

  const toggleInterface = (id: string) => {
    const cur = modulePerm(id);
    if (cur.voir) {
      // Hide interface → clear everything
      setModule(id, { ...emptyPermission });
    } else {
      setModule(id, { ...cur, voir: true });
    }
  };

  const toggleAction = (id: string, action: keyof UserPermission) => {
    const cur = modulePerm(id);
    const next = { ...cur, [action]: !cur[action] };
    if (next[action]) next.voir = true; // any action implies the interface is visible
    setModule(id, next);
  };

  const activeGroupModules = GROUPS.find(g => g.title === activeGroup)?.modules || [];

  const groupStats = GROUPS.map(g => ({
    title: g.title,
    active: g.modules.filter(m => value[m.id]?.voir).length,
    total: g.modules.length,
  }));

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Left: group navigation (same look as Settings section nav) */}
      <div className="w-56 shrink-0 border-r border-slate-100 bg-slate-50/60 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-0.5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 mt-1">Interfaces</p>
          {groupStats.map(gs => (
            <button
              key={gs.title}
              type="button"
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

      {/* Right: interface cards for the active group */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="mb-4">
              <h3 className="text-base font-black text-blue-900 uppercase tracking-tight italic">{activeGroup}</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Activez une interface pour l'afficher dans le menu du travailleur, puis choisissez ses boutons.
              </p>
            </div>

            {activeGroupModules.map(mod => {
              const perm = modulePerm(mod.id);
              const Icon = mod.icon;
              const on = perm.voir;

              return (
                <div
                  key={mod.id}
                  className={cn(
                    "rounded-2xl border transition-all",
                    on ? "bg-white border-blue-200 shadow-sm" : "bg-slate-50 border-slate-100"
                  )}
                >
                  {/* Interface master toggle */}
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        on ? "bg-blue-900/10 text-blue-900" : "bg-slate-200 text-slate-400"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("font-black text-xs truncate uppercase tracking-tight", on ? "text-slate-800" : "text-slate-400")}>
                          {mod.label}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {on ? "Visible dans le menu" : "Masqué"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleInterface(mod.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0",
                        on
                          ? "bg-blue-900 text-yellow-400 shadow-sm"
                          : "bg-white text-slate-400 border border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {on ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {on ? "Affiché" : "Afficher"}
                    </button>
                  </div>

                  {/* Real action buttons for this interface */}
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0">
                          {mod.actions.length === 0 ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <Lock className="w-3 h-3" /> Consultation uniquement
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                              {mod.actions.map(action => {
                                const checked = !!perm[action];
                                return (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => toggleAction(mod.id, action)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                                      checked
                                        ? "bg-blue-900 border-blue-900 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                                    )}
                                  >
                                    <span className={cn(
                                      "w-4 h-4 rounded flex items-center justify-center",
                                      checked ? "bg-white/20" : "bg-slate-100"
                                    )}>
                                      {checked && <Check className="w-3 h-3" />}
                                    </span>
                                    {ACTION_META[action].label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PermissionsEditor;
