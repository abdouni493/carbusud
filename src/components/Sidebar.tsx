import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Users, Fuel, ShoppingCart, Store, Truck,
  Package, ClipboardList, UsersRound, Settings, UserCircle,
  LogOut, Map, Wrench, TrendingUp, FileText, CreditCard,
  Target, ChevronDown, Gauge, Receipt,
  BarChart2, Archive, UserCog, DollarSign, Building2, ChevronRight, X,
  Wallet, CalendarCheck, Shield, UserCheck, Calendar
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useAppState, UserPermissions } from "../store/AppContext";

// --- Types ---

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  moduleId?: string; // used for permission filtering for gerant
}

interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  userRole: 'admin' | 'pompiste' | 'chef_brigade' | 'gerant' | 'magasin';
  userId?: string;
  userPermissions?: UserPermissions;
}

// --- Role badge styles ---

const roleBadge: Record<string, { label: string; bg: string; text: string }> = {
  admin:        { label: "Administrateur", bg: "rgba(255,184,0,0.18)",  text: "#FFB800" },
  pompiste:     { label: "Pompiste",        bg: "rgba(34,197,94,0.18)", text: "#22c55e" },
  chef_brigade: { label: "Chef Brigade",    bg: "rgba(168,85,247,0.18)",text: "#a855f7" },
  gerant:       { label: "Gérant",          bg: "rgba(59,130,246,0.18)",text: "#3b82f6" },
  magasin:      { label: "Employé Magasin", bg: "rgba(236,72,153,0.18)",text: "#ec4899" },
};

// --- Admin nav groups ---

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    items: [{ label: "Tableau de Bord", icon: LayoutDashboard, path: "/dashboard", moduleId: "Tableau de bord" }]
  },
  {
    id: "ops", label: "Opérations",
    items: [
      { label: "Brigades",        icon: Target,       path: "/brigades",  moduleId: "Brigades" },
      { label: "Planning",        icon: Calendar,     path: "/planning", moduleId: "Brigades" },
      { label: "Vente Magasin",   icon: Store,         path: "/shop-pos",  moduleId: "Magasin" },
    ]
  },
  {
    id: "fuel", label: "Carburant",
    items: [
      { label: "Cuves / Tanks",  icon: Gauge,        path: "/tanks",          moduleId: "Cuves" },
      { label: "Pompes",         icon: Wrench,       path: "/pumps",          moduleId: "Pompes" },
      { label: "Pistes",         icon: Map,          path: "/tracks",         moduleId: "Pistes" },
      { label: "Achats Carburant", icon: ShoppingCart,path: "/fuel-purchases", moduleId: "Livraisons" },
    ]
  },
  {
    id: "magasin", label: "Magasin",
    items: [
      { label: "Produits",   icon: Package,     path: "/products",  moduleId: "Produits" },
      { label: "Achats Magasin", icon: ShoppingCart,path: "/purchases", moduleId: "Achats" },
      { label: "Inventaire", icon: Archive,     path: "/inventory", moduleId: "Inventaires" },
    ]
  },
  {
    id: "contacts", label: "Contacts",
    items: [
      { label: "Clients",      icon: Users, path: "/clients",   moduleId: "Clients" },
      { label: "Fournisseurs", icon: Truck, path: "/suppliers", moduleId: "Fournisseurs" },
    ]
  },
  {
    id: "hr", label: "Personnel",
    items: [
      { label: "Pompistes",        icon: UsersRound, path: "/pompistes",       moduleId: "Pompistes" },
      { label: "Chefs de Brigade", icon: UserCog,    path: "/brigade-chefs",   moduleId: "Chefs de Brigade" },
      { label: "Gérants",          icon: Building2,  path: "/gerants",         moduleId: "Gérants" },
      { label: "Employés Magasin", icon: Store,      path: "/magasin-workers", moduleId: "Employés Magasin" },
    ]
  },
  {
    id: "finance", label: "Finances",
    items: [
      { label: "Dépenses",        icon: CreditCard, path: "/expenses",     moduleId: "Dépenses" },
      { label: "Fiche Journalière",icon: FileText,  path: "/daily-report", moduleId: "Rapports" },
    ]
  },
  {
    id: "stats", label: "Analytique",
    items: [
      { label: "Statistiques", icon: BarChart2, path: "/statistics", moduleId: "Statistiques" },
      { label: "Rapports",     icon: Receipt,   path: "/reports",    moduleId: "Rapports" },
    ]
  },
];

// --- Role-specific nav groups ---

const POMPISTE_NAV: NavGroup[] = [
  {
    id: "dashboard",
    items: [{ label: "Tableau de Bord", icon: LayoutDashboard, path: "/dashboard", moduleId: "Tableau de bord" }]
  },
  {
    id: "ops", label: "Mon Travail",
    items: [
      { label: "Ma Brigade",    icon: Target,  path: "/my-brigade",   moduleId: "Ma Brigade" },
      { label: "Vente Magasin", icon: Store,   path: "/shop-pos",     moduleId: "Magasin" },
    ]
  },
  {
    id: "personal", label: "Personnel",
    items: [
      { label: "Mes Paiements", icon: Wallet, path: "/my-payments", moduleId: "Mes Paiements" },
    ]
  },
];

const CHEF_BRIGADE_NAV: NavGroup[] = [
  {
    id: "dashboard",
    items: [{ label: "Tableau de Bord", icon: LayoutDashboard, path: "/dashboard", moduleId: "Tableau de bord" }]
  },
  {
    id: "ops", label: "Mon Équipe",
    items: [
      { label: "Mes Brigades", icon: Target, path: "/chef-brigade", moduleId: "Brigades" },
    ]
  },
  {
    id: "fuel", label: "Carburant",
    items: [
      { label: "Cuves / Tanks", icon: Gauge, path: "/tanks", moduleId: "Cuves" },
    ]
  },
  {
    id: "personal", label: "Personnel",
    items: [
      { label: "Mes Paiements", icon: Wallet, path: "/my-payments", moduleId: "Mes Paiements" },
    ]
  },
];

const MAGASIN_NAV: NavGroup[] = [
  {
    id: "ops", label: "Mon Travail",
    items: [
      { label: "Vente Magasin", icon: Store,   path: "/shop-pos",  moduleId: "Magasin" },
      { label: "Produits",      icon: Package, path: "/products",  moduleId: "Produits" },
    ]
  },
  {
    id: "personal", label: "Personnel",
    items: [
      { label: "Mes Paiements", icon: Wallet, path: "/my-payments", moduleId: "Mes Paiements" },
    ]
  },
];

// --- Nav builder function ---

function getNavGroups(
  role: string,
  permissions?: UserPermissions
): NavGroup[] {
  switch (role) {
    case 'pompiste': {
      if (!permissions) return POMPISTE_NAV.filter(g => g.id === 'dashboard');
      return POMPISTE_NAV
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            if (!item.moduleId) return true;
            const perm = permissions[item.moduleId];
            return perm ? perm.voir : false;
          })
        }))
        .filter(group => group.items.length > 0);
    }

    case 'chef_brigade': {
      if (!permissions) return CHEF_BRIGADE_NAV.filter(g => g.id === 'dashboard');
      return CHEF_BRIGADE_NAV
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            if (!item.moduleId) return true;
            const perm = permissions[item.moduleId];
            return perm ? perm.voir : false;
          })
        }))
        .filter(group => group.items.length > 0);
    }

    case 'magasin': {
      if (!permissions) return MAGASIN_NAV.filter(g => g.id === 'dashboard');
      return MAGASIN_NAV
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            if (!item.moduleId) return true;
            const perm = permissions[item.moduleId];
            return perm ? perm.voir : false;
          })
        }))
        .filter(group => group.items.length > 0);
    }

    case 'gerant': {
      // Start with a base set, then filter per permissions
      const baseGroups: NavGroup[] = [
        {
          id: "dashboard",
          items: [{ label: "Tableau de Bord", icon: LayoutDashboard, path: "/dashboard", moduleId: "Tableau de bord" }]
        },
        {
          id: "ops", label: "Opérations",
          items: [
            { label: "Brigades",         icon: Target, path: "/brigades" },
            { label: "Planning",        icon: Calendar,     path: "/planning", moduleId: "Brigades" },
            { label: "Vente Magasin",    icon: Store,  path: "/shop-pos",   moduleId: "Magasin" },
          ]
        },
        {
          id: "fuel", label: "Carburant",
          items: [
            { label: "Cuves / Tanks", icon: Gauge,        path: "/tanks",          moduleId: "Cuves" },
            { label: "Pompes",         icon: Wrench,       path: "/pumps",          moduleId: "Pompes" },
            { label: "Pistes",         icon: Map,          path: "/tracks",         moduleId: "Pistes" },
            { label: "Achats Carburant", icon: ShoppingCart,path: "/fuel-purchases", moduleId: "Livraisons" },
          ]
        },
        {
          id: "magasin", label: "Magasin",
          items: [
            { label: "Produits",   icon: Package,     path: "/products",  moduleId: "Produits" },
            { label: "Achats Magasin", icon: ShoppingCart,path: "/purchases", moduleId: "Achats" },
            { label: "Inventaire", icon: Archive,     path: "/inventory", moduleId: "Inventaires" },
          ]
        },
        {
          id: "contacts", label: "Contacts",
          items: [
            { label: "Clients",      icon: Users, path: "/clients",   moduleId: "Clients" },
            { label: "Fournisseurs", icon: Truck, path: "/suppliers", moduleId: "Fournisseurs" },
          ]
        },
        {
          id: "hr", label: "Personnel",
          items: [
            { label: "Pompistes",        icon: UsersRound, path: "/pompistes",       moduleId: "Pompistes" },
            { label: "Chefs de Brigade", icon: UserCog,    path: "/brigade-chefs",   moduleId: "Chefs de Brigade" },
            { label: "Gérants",          icon: Building2,  path: "/gerants",         moduleId: "Gérants" },
            { label: "Employés Magasin", icon: Store,      path: "/magasin-workers", moduleId: "Employés Magasin" },
          ]
        },
        {
          id: "finance", label: "Finances",
          items: [
            { label: "Dépenses",         icon: CreditCard, path: "/expenses",     moduleId: "Dépenses" },
            { label: "Fiche Journalière",icon: FileText,   path: "/daily-report", moduleId: "Fiche Journalière" },
          ]
        },
        {
          id: "stats", label: "Analytique",
          items: [
            { label: "Statistiques", icon: BarChart2, path: "/statistics", moduleId: "Statistiques" },
            { label: "Rapports",     icon: Receipt,   path: "/reports",    moduleId: "Rapports" },
          ]
        },
        {
          id: "personal", label: "Personnel",
          items: [{ label: "Mes Paiements", icon: Wallet, path: "/my-payments" }]
        }
      ];

      if (!permissions) return baseGroups.filter(g => g.id === 'dashboard');

      // Filter items by permissions.voir
      return baseGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            if (!item.moduleId) return true;
            const perm = permissions[item.moduleId];
            return perm ? perm.voir : false;
          })
        }))
        .filter(group => group.items.length > 0);
    }

    case 'admin':
    default:
      return ADMIN_NAV_GROUPS;
  }
}

// --- Settings path per role ---

const SETTINGS_PATH: Record<string, string> = {
  admin:        "/settings",
  pompiste:     "/my-settings",
  chef_brigade: "/my-settings",
  gerant:       "/my-settings",
  magasin:      "/my-settings",
};

// --- Component ---

const Sidebar = ({ isOpen, onClose, activePath, onNavigate, onLogout, userRole, userId, userPermissions }: SidebarProps) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["ops", "fuel", "magasin", "dashboard"]);

  const { pompistes, brigadeChefs, gerants, magasinWorkers, users, settings } = useAppState();

  // Resolve connected worker name and initial
  const connectedUser = useMemo(() => {
    if (!userId) return null;
    if (userRole === 'pompiste')     return (pompistes || []).find(p => p.id === userId) ?? null;
    if (userRole === 'chef_brigade') return (brigadeChefs || []).find(c => c.id === userId) ?? null;
    if (userRole === 'gerant')       return (gerants || []).find(g => g.id === userId) ?? null;
    if (userRole === 'magasin')      return (magasinWorkers || []).find(m => m.id === userId) ?? null;
    if (userRole === 'admin')        return users.find(u => u.id === userId) ?? null;
    return null;
  }, [userId, userRole, pompistes, brigadeChefs, gerants, magasinWorkers, users]);

  const navGroups = useMemo(
    () => getNavGroups(userRole, userPermissions),
    [userRole, userPermissions]
  );

  const settingsPath = SETTINGS_PATH[userRole] ?? "/settings";
  const badge = roleBadge[userRole] ?? roleBadge.admin;

  const displayName  = connectedUser?.name ?? (userRole === 'admin' ? 'Administrateur' : 'Utilisateur');
  const displayInitial = displayName.charAt(0).toUpperCase();

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    if (window.innerWidth < 1280) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 bottom-0 z-50 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out overflow-hidden",
          isRtl ? "right-0" : "left-0",
          isOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"
        )}
        style={{ width: "var(--sidebar-width)" }}
      >
        {/* Background */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(170deg, #001233 0%, #001f5c 35%, #003087 70%, #002470 100%)"
        }} />

        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,184,0,0.12) 0%, transparent 70%)", transform: "translate(35%,-35%)" }}
        />
        <div className="absolute bottom-1/3 left-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,68,187,0.3) 0%, transparent 70%)", transform: "translate(-50%,0)" }}
        />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)", transform: "translate(30%,30%)" }}
        />

        <div className="flex flex-col h-full relative z-10">
          {/* Logo Header */}
          <div className="px-5 py-5 flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #FFB800 0%, #e6a000 100%)", boxShadow: "0 4px 14px rgba(255,184,0,0.45)" }}
            >
              {(settings?.logoUrl || settings?.logo)
                ? <img src={settings.logoUrl || settings.logo} alt="logo" className="w-full h-full object-cover" />
                : <Fuel className="w-5 h-5 text-[#001f5c]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-black text-lg tracking-tight leading-none">
                {settings?.stationName || settings?.name || "StationPro"}
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
                style={{ color: "rgba(255,184,0,0.65)" }}>Naftal System</p>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Yellow divider */}
          <div className="mx-5 mb-3 rounded-full"
            style={{ height: "1.5px", background: "linear-gradient(90deg, rgba(255,184,0,0.7) 0%, rgba(255,184,0,0.15) 70%, transparent 100%)" }}
          />

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.id} className={group.id === "dashboard" ? "mb-2" : "mb-0.5"}>
                {group.label && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-3 py-2 mt-3 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: "rgba(147,197,253,0.5)" }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.22em]">{group.label}</span>
                    <ChevronDown
                      className={cn("w-3 h-3 transition-transform duration-200", expandedGroups.includes(group.id) ? "rotate-0" : "-rotate-90")}
                    />
                  </button>
                )}

                <AnimatePresence initial={false}>
                  {(!group.label || expandedGroups.includes(group.id)) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pt-0.5">
                        {group.items.map((item) => {
                          const isActive = activePath === item.path;
                          const Icon = item.icon;
                          return (
                            <motion.button
                              key={item.path}
                              onClick={() => handleNavigate(item.path)}
                              whileTap={{ scale: 0.98 }}
                              className={cn("sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-inactive")}
                            >
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                isActive ? "bg-[#001f5c]/20" : "bg-white/6"
                              )}>
                                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#001f5c]" : "text-blue-200")} />
                              </div>
                              <span className="text-sm leading-none flex-1">{item.label}</span>
                              {isActive && (
                                <ChevronRight className="w-3 h-3 text-[#001f5c]/50 flex-shrink-0" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <div className="my-3 mx-2" style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />

            {(!userPermissions || !userPermissions["Paramètres"] || userPermissions["Paramètres"].voir) && (
              <button
                onClick={() => handleNavigate(settingsPath)}
                className={cn("sidebar-link", activePath === settingsPath ? "sidebar-link-active" : "sidebar-link-inactive")}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", activePath === settingsPath ? "bg-[#001f5c]/20" : "bg-white/6")}>
                  <Settings className={cn("w-3.5 h-3.5", activePath === settingsPath ? "text-[#001f5c]" : "text-blue-200")} />
                </div>
                <span className="text-sm">Paramètres</span>
                {activePath === settingsPath && <ChevronRight className="w-3 h-3 text-[#001f5c]/50 ml-auto" />}
              </button>
            )}
          </div>

          {/* User Profile Footer */}
          <div className="p-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 text-[#001f5c]"
                style={{ background: "linear-gradient(135deg, #FFB800, #e6a000)" }}
              >
                {displayInitial}
              </div>

              {/* Name + Badge */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate leading-none">{displayName}</p>
                <span
                  className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{ background: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>
              </div>

              {/* Logout */}
              <button
                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors group"
                style={{ color: "rgba(147,197,253,0.5)" }}
                title="Déconnexion"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  }
                }}
              >
                <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
