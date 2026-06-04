import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  User as UserIcon, 
  Users,
  Key, 
  Eye, 
  Lock, 
  EyeOff, 
  ChevronDown, 
  ChevronRight,
  Shield,
  Activity,
  UserCheck,
  MousePointer2,
  Calendar,
  Clock,
  Terminal,
  Settings,
  Mail,
  ShieldAlert,
  Loader2,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, newId } from "@/src/lib/utils";
import { useAppState, useAppDispatch } from "@/src/store/AppContext";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

const Permissions = () => {
  const { t } = useTranslation();
  const { users, activityLog } = useAppState();
  const dispatch = useAppDispatch();

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("accounts");
  const [searchQuery, setSearchQuery] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const modules = [
    { id: "dashboard", label: "Dashboard" },
    { id: "tanks", label: "Cuves & Stocks" },
    { id: "sales", label: "Ventes Carburant" },
    { id: "shop", label: "Magasin & Ventes POS" },
    { id: "clients", label: "Clients & Crédits" },
    { id: "expenses", label: "Dépenses & Frais" },
    { id: "reports", label: "Rapports & Audit" },
    { id: "personnel", label: "Personnel & Paie" },
    { id: "settings", label: "Paramètres Système" }
  ];

  const actions: (keyof any)[] = ["voir", "creer", "modifier", "supprimer", "imprimer", "exporter", "scanner", "generer"];

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "POMPISTE",
    status: "Actif" as const,
    permissions: {} as any
  });

  const emptyPermissions = useMemo(() => {
    const perms: any = {};
    modules.forEach(m => {
      perms[m.id] = { voir: false, creer: false, modifier: false, supprimer: false, imprimer: false, exporter: false, scanner: false, generer: false };
    });
    return perms;
  }, []);

  const handleOpenModal = (user: any = null) => {
    setSelectedUser(user);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: JSON.parse(JSON.stringify(user.permissions))
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "POMPISTE",
        status: "Actif",
        permissions: JSON.parse(JSON.stringify(emptyPermissions))
      });
    }
    setShowModal(true);
  };

  const handleTogglePermission = (moduleId: string, action: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...prev.permissions[moduleId],
          [action]: !prev.permissions[moduleId][action]
        }
      }
    }));
  };

  const handleToggleModuleAll = (moduleId: string, checked: boolean) => {
    setFormData(prev => {
        const newPerms = { ...prev.permissions[moduleId] };
        actions.forEach(a => { newPerms[a as string] = checked; });
        return {
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleId]: newPerms
            }
        };
    });
  };

  const applyTemplate = (role: string) => {
    const perms = JSON.parse(JSON.stringify(emptyPermissions));
    
    switch(role) {
      case "ADMINISTRATEUR":
        Object.keys(perms).forEach(k => {
           actions.forEach(a => perms[k][a] = true);
        });
        break;
      case "GÉRANT":
        Object.keys(perms).forEach(k => {
           if (k !== 'settings') {
               actions.forEach(a => perms[k][a] = true);
           } else {
               perms[k].voir = true;
           }
        });
        break;
      case "CHEF DE BRIGADE":
        perms.brigades = { voir: true, creer: true, modifier: true, supprimer: true, imprimer: true, exporter: true, scanner: false, generer: true };
        perms.sales = { voir: true, creer: true, modifier: true, supprimer: true, imprimer: true, exporter: true, scanner: false, generer: true };
        Object.keys(perms).forEach(k => { if (!perms[k].voir) perms[k].voir = true; });
        break;
      case "POMPISTE":
        perms.sales = { voir: false, creer: true, modifier: false, supprimer: false, imprimer: true, exporter: false, scanner: false, generer: false };
        break;
      case "CAISSIER":
        perms.shop = { voir: true, creer: true, modifier: true, supprimer: true, imprimer: true, exporter: true, scanner: true, generer: true };
        perms.clients = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: true, exporter: true, scanner: false, generer: false };
        break;
    }
    
    setFormData({ ...formData, role, permissions: perms });
    dispatch({ type: 'ADD_TOAST', payload: { type: 'info', message: `Modèle "${role}" appliqué ✓` } });
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      dispatch({ type: 'ADD_TOAST', payload: { type: 'error', message: "Nom et Email obligatoires" } });
      return;
    }

    setIsLoading(true);

    const payload = {
      ...formData,
      id: selectedUser?.id || newId(),
      lastLogin: selectedUser?.lastLogin || "Jamais"
    };

    setTimeout(() => {
      if (selectedUser) {
        dispatch({ type: "UPDATE_USER", payload });
        dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Compte utilisateur mis à jour" } });
      } else {
        dispatch({ type: "ADD_USER", payload });
        dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Utilisateur créé avec succès" } });
      }
      setIsLoading(false);
      setShowModal(false);
    }, 800);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setIsLoading(true);

    setTimeout(() => {
      dispatch({ type: 'DELETE_USER', payload: userToDelete.id });
      dispatch({ type: 'ADD_TOAST', payload: { type: 'success', message: "Compte utilisateur supprimé" } });
      setIsLoading(false);
      setUserToDelete(null);
    }, 800);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const filteredLog = useMemo(() => {
    return activityLog.filter(l => 
        l.action.toLowerCase().includes(activitySearch.toLowerCase()) ||
        l.details.toLowerCase().includes(activitySearch.toLowerCase())
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLog, activitySearch]);

  const RoleBadge = ({ role }: { role: string }) => {
    const colors = {
      "ADMINISTRATEUR": "bg-slate-900 text-white",
      "GÉRANT": "bg-blue-100 text-blue-700",
      "CHEF DE BRIGADE": "bg-purple-100 text-purple-700",
      "POMPISTE": "bg-orange-100 text-orange-700",
      "CAISSIER": "bg-green-100 text-green-700"
    };
    return (
      <span className={cn("text-[9px] font-black underline uppercase px-2 py-0.5 rounded tracking-tighter", colors[role as keyof typeof colors] || "bg-slate-100 text-slate-600")}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary italic">Rôles & Accès Système</h1>
          <p className="text-slate-500">Gérez les comptes utilisateurs et les permissions granulaires.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary h-14 px-8 tracking-[0.2em] w-full md:w-auto"
        >
          <Plus className="w-4 h-4" /> CRÉER UN COMPTE
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 border-b border-slate-100 italic">
         {[
           { id: "accounts", label: "Comptes", icon: Users },
           { id: "activity", label: "Journal", icon: Activity },
           { id: "roles", label: "Modèles", icon: Shield }
         ].map(t => (
           <button 
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
               "flex items-center gap-2 px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0",
               activeTab === t.id ? "text-primary bg-blue-50 rounded-t-2xl" : "text-slate-400"
            )}
           >
             <t.icon className="w-4 h-4" /> {t.label}
             {activeTab === t.id && <motion.div layoutId="activeAccess" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "accounts" ? (
          <motion.div key="accounts" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-card italic">
               <div className="relative flex-1 min-w-[200px]">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="Chercher..." 
                    className="input-field pl-11 h-12" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block card-glass overflow-hidden shadow-xl italic border-slate-50">
               <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                     <tr>
                        <th className="px-8 py-6">Utilisateur</th>
                        <th className="px-8 py-6">Rôle</th>
                        <th className="px-8 py-6">Statut</th>
                        <th className="px-8 py-6">Dernière Connexion</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                     {filteredUsers.length === 0 ? (
                        <tr>
                           <td colSpan={5}>
                              <EmptyState 
                                 icon={Users}
                                 title="Aucun utilisateur trouvé"
                                 description="Aucun compte ne correspond à votre recherche ou aucun utilisateur n'est créé."
                                 action={() => handleOpenModal()}
                                 actionLabel="CRÉER UN COMPTE"
                              />
                           </td>
                        </tr>
                     ) : filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-primary font-black shadow-inner">
                                    {u.name.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="font-black text-primary uppercase italic tracking-tighter leading-none mb-1">{u.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><Mail className="w-3 h-3" /> {u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5"><RoleBadge role={u.role} /></td>
                           <td className="px-8 py-5">
                              <span className={cn(
                                 "text-[9px] font-black uppercase px-3 py-1 rounded-full border", 
                                 u.status === "Actif" ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                              )}>
                                 {u.status}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">{u.lastLogin}</td>
                           <td className="px-8 py-5 text-right space-x-2">
                              <button onClick={() => handleOpenModal(u)} className="p-3 hover:bg-blue-50 rounded-2xl text-primary/40 hover:text-primary transition-all shadow-sm bg-white border border-slate-100"><Settings className="w-5 h-5" /></button>
                              <button className="p-3 hover:bg-blue-50 rounded-2xl text-blue-500/40 hover:text-blue-600 transition-all shadow-sm bg-white border border-slate-100"><Key className="w-5 h-5" /></button>
                              <button 
                                 onClick={() => setUserToDelete(u)} 
                                 className="p-3 hover:bg-red-50 rounded-2xl text-red-500/40 hover:text-red-600 transition-all shadow-sm bg-white border border-slate-100"
                              >
                                 <Trash2 className="w-5 h-5" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Mobile List Cards */}
            <div className="md:hidden space-y-4 italic">
               {filteredUsers.length === 0 ? (
                  <EmptyState 
                     icon={Users}
                     title="Aucun utilisateur trouvé"
                     description="Aucun compte ne correspond à votre recherche."
                     action={() => handleOpenModal()}
                     actionLabel="CRÉER UN COMPTE"
                  />
               ) : filteredUsers.map((u) => (
                  <div key={u.id} className="bg-white p-6 rounded-[2rem] shadow-card space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-primary font-black shadow-inner">
                              {u.name.charAt(0)}
                           </div>
                           <div>
                              <p className="font-black text-primary uppercase italic text-xs tracking-tighter leading-none mb-1">{u.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{u.email}</p>
                           </div>
                        </div>
                        <RoleBadge role={u.role} />
                     </div>
                     <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div className="space-y-1">
                           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Dernière connexion</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase">{u.lastLogin}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleOpenModal(u)} className="p-2 hover:bg-blue-50 rounded-xl text-primary/40"><Settings className="w-4 h-4" /></button>
                           <button onClick={() => setUserToDelete(u)} className="p-2 hover:bg-red-50 rounded-xl text-red-500/40"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          </motion.div>
        ) : activeTab === "activity" ? (
          <motion.div key="activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-card italic">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Filtrer l'activité..." 
                    className="input-field pl-11 h-12" 
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                  />
                </div>
             </div>

             <div className="card-glass overflow-hidden shadow-xl italic border-slate-50">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <tr>
                         <th className="px-8 py-6 w-32 md:w-48">Audit</th>
                         <th className="px-8 py-6">Détails</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-[10px] md:text-[11px]">
                      {filteredLog.length === 0 ? (
                        <tr><td colSpan={2} className="px-8 py-24 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-xs">Aucune activité</td></tr>
                      ) : filteredLog.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-4 font-bold text-slate-400 uppercase leading-tight tabular-nums border-r border-slate-50">
                              {new Date(log.timestamp).toLocaleDateString()}<br/>
                              <span className="text-slate-300">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </td>
                           <td className="px-8 py-4">
                             <p className="font-black text-primary uppercase mb-1">{log.userId} - <span className="text-blue-600">{log.action}</span></p>
                             <p className="text-slate-500 whitespace-pre-wrap">{log.details}</p>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>
        ) : (
          <motion.div key="roles" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { id: "ADMINISTRATEUR", label: "Administrateur", icon: ShieldAlert, desc: "Accès total au système, gestion des utilisateurs, paramètres critiques.", color: "bg-slate-900", perms: "Tout autorisé" },
               { id: "GÉRANT", label: "Gérant Station", icon: UserCheck, desc: "Gestion quotidienne, rapports financiers, validation des stocks.", color: "bg-blue-600", perms: "Autorisé sauf Paramètres" },
               { id: "CHEF DE BRIGADE", label: "Chef de Brigade", icon: Users, desc: "Suivi de piste, gestion des pompistes, saisie d'index.", color: "bg-purple-600", perms: "Piste, Ventes & Brigades" },
               { id: "CAISSIER", label: "Caissier Magasin", icon: MousePointer2, desc: "Ventes POS, encaissements, gestion clients fidélité.", color: "bg-green-600", perms: "Magasin & Crédit Client" },
               { id: "POMPISTE", label: "Pompiste", icon: Terminal, desc: "Saisie des ventes par pompe uniquement.", color: "bg-orange-600", perms: "Ventes Carburant (Saisie)" }
             ].map(role => (
               <div key={role.id} className="card-glass p-8 space-y-6 italic border-slate-100 hover:shadow-2xl transition-all group overflow-hidden relative">
                  <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-12 -mt-12 rounded-full", role.color)} />
                  <div className="flex items-center gap-4">
                     <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform", role.color)}>
                        <role.icon className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-black text-primary uppercase tracking-widest">{role.label}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{role.perms}</p>
                     </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold">{role.desc}</p>
                  <button onClick={() => applyTemplate(role.id)} className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Appliquer ce Modèle</button>
               </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Access Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-[2.5rem] relative z-10 flex flex-col overflow-hidden"
            >
              <div className="p-6 bg-primary text-white flex items-center justify-between shrink-0">
                <h3 className="font-bold text-xs uppercase tracking-widest">{selectedUser ? `Permissions : ${selectedUser.name}` : "Nouveau Compte Système"}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Left: User Info & Role Template */}
                 <div className="w-full md:w-1/3 border-r border-slate-100 p-6 md:p-10 space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar italic bg-slate-50/30">
                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><UserIcon className="w-3 h-3"/> Identité</h4>
                       <div className="space-y-4">
                          <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                             <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Nom Complet</label>
                             <input 
                                type="text" className="input-field font-black uppercase text-[10px] tracking-widest" placeholder="Ex: Ahmed Rami" 
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                             />
                          </div>
                          <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                             <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Email Professionnel</label>
                             <input 
                                type="email" className="input-field font-black uppercase text-[10px] tracking-widest lowercase" placeholder="email@atlas.ma" 
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Rôle Principal</label>
                                <select 
                                   className="input-field h-[46px] text-[10px] font-black uppercase tracking-widest"
                                   value={formData.role}
                                   onChange={e => applyTemplate(e.target.value)}
                                >
                                   <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
                                   <option value="GÉRANT">GÉRANT</option>
                                   <option value="CHEF DE BRIGADE">CHEF DE BRIGADE</option>
                                   <option value="CAISSIER">CAISSIER</option>
                                   <option value="POMPISTE">POMPISTE</option>
                                </select>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Statut</label>
                                <select 
                                   className="input-field h-[46px] text-[10px] font-black uppercase tracking-widest"
                                   value={formData.status}
                                   onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                   <option value="Actif">Actif</option>
                                   <option value="Inactif">Inactif</option>
                                </select>
                             </div>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6 hidden md:block">
                       <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modèles Rapides</h4>
                          <ShieldAlert className="w-3 h-3 text-secondary" />
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: "ADMINISTRATEUR", label: "Contrôle Total", desc: "Tous les accès", color: "border-slate-900" },
                            { id: "GÉRANT", label: "Gestionnaire", desc: "Opérations complètes", color: "border-blue-200" },
                            { id: "CHEF DE BRIGADE", label: "Superviseur", desc: "Piste & Brigades", color: "border-purple-200" },
                            { id: "CAISSIER", label: "Point de Vente", desc: "Shop & Clients", color: "border-green-200" },
                            { id: "POMPISTE", label: "Agent Piste", desc: "Saisie ventes", color: "border-orange-200" }
                          ].map(tpl => (
                            <button 
                               key={tpl.id} 
                               onClick={() => applyTemplate(tpl.id)}
                               className={cn(
                                   "p-4 border bg-white rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-95 group",
                                   formData.role === tpl.id ? tpl.color + " shadow-lg border-2 ring-4 ring-primary/5" : "border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                               )}
                            >
                               <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{tpl.label}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{tpl.desc}</p>
                            </button>
                          ))}
                       </div>
                    </section>
                 </div>

                 {/* Right: Granular Permissions */}
                 <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-8 md:space-y-10 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4 italic sticky top-0 bg-white z-10 pt-2">
                       <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Permissions Granulaires</h4>
                       <div className="flex items-center gap-2 md:gap-4">
                          <button 
                            onClick={() => {
                                const newPerms = JSON.parse(JSON.stringify(formData.permissions));
                                Object.keys(newPerms).forEach(k => actions.forEach(a => newPerms[k][a as string] = true));
                                setFormData({ ...formData, permissions: newPerms });
                            }}
                            className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                          >
                             Tout
                          </button>
                          <div className="w-[1px] h-3 bg-slate-200" />
                          <button 
                            onClick={() => setFormData({ ...formData, permissions: emptyPermissions })}
                            className="text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                          >
                             Rien
                          </button>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 md:gap-6 pb-20">
                       {modules.map(mod => {
                         const modulePerms = formData.permissions[mod.id] || {};
                         const allChecked = actions.every(a => modulePerms[a as string]);
                         
                         return (
                          <div key={mod.id} className={cn("p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 transition-all border", allChecked ? "bg-blue-50 border-primary/20" : "bg-slate-50 border-slate-100")}>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className={cn("w-2 h-2 rounded-full", allChecked ? "bg-primary animate-pulse" : "bg-slate-300")} />
                                   <p className="text-xs font-black text-primary uppercase tracking-widest italic">{mod.label}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic hidden xs:inline">Audit Expert</span>
                                   <div 
                                     onClick={() => handleToggleModuleAll(mod.id, !allChecked)}
                                     className={cn("w-10 md:w-12 h-5 md:h-6 rounded-full p-1 cursor-pointer transition-colors duration-300", allChecked ? "bg-primary" : "bg-slate-200")}
                                   >
                                      <div className={cn("w-3 md:w-4 h-3 md:h-4 bg-white rounded-full transition-transform duration-300", allChecked ? "translate-x-5 md:translate-x-6" : "translate-x-0")} />
                                   </div>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 pt-2 italic">
                                {actions.map(action => (
                                  <label key={action as string} className="flex items-center gap-2 md:gap-3 cursor-pointer group select-none">
                                     <div 
                                        onClick={() => handleTogglePermission(mod.id, action as string)}
                                        className={cn(
                                            "w-4 md:w-5 h-4 md:h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                            modulePerms[action as string] ? "bg-primary border-primary scale-110" : "bg-white border-slate-100 group-hover:border-primary/30"
                                        )}
                                     >
                                        {modulePerms[action as string] && <CheckCircle2 className="w-2.5 md:w-3 h-2.5 md:h-3 text-white" />}
                                     </div>
                                     <span className={cn(
                                         "text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors",
                                         modulePerms[action as string] ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                                     )}>
                                        {action as string}
                                     </span>
                                  </label>
                                ))}
                             </div>
                          </div>
                         )
                       })}
                    </div>
                 </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50 border-t flex flex-col md:flex-row gap-4 shrink-0 italic shadow-2xl relative z-20 sticky bottom-0">
                 <button onClick={() => setShowModal(false)} className="py-2 md:py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:text-primary transition-colors hidden md:block">Annuler</button>
                 <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="w-full md:flex-[2] btn-primary py-4 tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isLoading ? "CHARGEMENT..." : (selectedUser ? "ACTUALISER LES DROITS" : "CRÉER LE COMPTE")}
                  </button>
                  <button onClick={() => setShowModal(false)} className="py-2 md:hidden text-[10px] font-black uppercase text-center text-slate-400 tracking-widest">FERMER</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!userToDelete}
        title="Supprimer un compte utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer le compte de "${userToDelete?.name}" ? Cette action révoquera immédiatement tous ses accès au système.`}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
        confirmLabel="RÉVOQUER L'ACCÈS"
        danger={true}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Permissions;
