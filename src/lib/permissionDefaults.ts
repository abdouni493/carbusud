import {
  LayoutDashboard, Target, Calendar, Fuel, Store, Gauge, Wrench, Map,
  ClipboardList, Package, ShoppingCart, Archive, Users, Truck, UsersRound,
  UserCog, Building2, CreditCard, FileText, BarChart2, Receipt,
  Settings as SettingsIcon, Wallet,
} from 'lucide-react';
import type React from 'react';
import type { UserPermission, UserPermissions } from '../store/AppContext';

export interface ModuleDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface GroupDef {
  title: string;
  modules: ModuleDef[];
}

export const GROUPS: GroupDef[] = [
  {
    title: "Général",
    modules: [
      { id: "Tableau de bord", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Opérations",
    modules: [
      { id: "Brigades",         label: "Brigades",         icon: Target },
      { id: "Ma Brigade",       label: "Ma Brigade",       icon: Target },
      { id: "Planning",         label: "Planning",         icon: Calendar },
      { id: "Ventes Carburant", label: "Ventes Carburant", icon: Fuel },
      { id: "Magasin",          label: "Vente Magasin",    icon: Store },
    ],
  },
  {
    title: "Carburant",
    modules: [
      { id: "Cuves",      label: "Cuves",      icon: Gauge },
      { id: "Pompes",     label: "Pompes",     icon: Wrench },
      { id: "Pistes",     label: "Pistes",     icon: Map },
      { id: "Livraisons", label: "Livraisons", icon: ClipboardList },
    ],
  },
  {
    title: "Magasin",
    modules: [
      { id: "Produits",    label: "Produits",   icon: Package },
      { id: "Achats",      label: "Achats",     icon: ShoppingCart },
      { id: "Inventaires", label: "Inventaire", icon: Archive },
    ],
  },
  {
    title: "Contacts",
    modules: [
      { id: "Clients",      label: "Clients",      icon: Users },
      { id: "Fournisseurs", label: "Fournisseurs", icon: Truck },
    ],
  },
  {
    title: "Personnel",
    modules: [
      { id: "Pompistes",         label: "Pompistes",         icon: UsersRound },
      { id: "Chefs de Brigade",  label: "Chefs de Brigade",  icon: UserCog },
      { id: "Gérants",           label: "Gérants",           icon: Building2 },
      { id: "Employés Magasin",  label: "Employés Magasin",  icon: Store },
      { id: "Mes Paiements",     label: "Mes Paiements",     icon: Wallet },
    ],
  },
  {
    title: "Finances",
    modules: [
      { id: "Dépenses",          label: "Dépenses",          icon: CreditCard },
      { id: "Fiche Journalière", label: "Fiche Journalière", icon: FileText },
    ],
  },
  {
    title: "Analytique & Paramètres",
    modules: [
      { id: "Statistiques", label: "Statistiques", icon: BarChart2 },
      { id: "Rapports",     label: "Rapports",     icon: Receipt },
      { id: "Paramètres",   label: "Paramètres",   icon: SettingsIcon },
    ],
  },
];

export const emptyPermission: UserPermission = {
  voir: false, creer: false, modifier: false, supprimer: false,
  imprimer: false, exporter: false, scanner: false, generer: false,
};

export const fullPermission: UserPermission = {
  voir: true, creer: true, modifier: true, supprimer: true,
  imprimer: true, exporter: true, scanner: true, generer: true,
};

export const viewOnlyPermission: UserPermission = {
  voir: true, creer: false, modifier: false, supprimer: false,
  imprimer: false, exporter: false, scanner: false, generer: false,
};

/** Build the default permission set for a worker role. */
export function getDefaultPermissions(
  role: 'pompiste' | 'chef_brigade' | 'gerant' | 'magasin'
): UserPermissions {
  const perms: UserPermissions = {};
  // Start with everything OFF
  GROUPS.forEach(g => g.modules.forEach(m => { perms[m.id] = { ...emptyPermission }; }));

  if (role === 'pompiste') {
    // Dashboard: view only — shows his brigade info + payment info
    perms["Tableau de bord"] = { ...viewOnlyPermission };
    // Brigade: view only his own brigade, no modifications
    perms["Ma Brigade"]       = { ...viewOnlyPermission };
    // Fuel sales: full access (he creates them)
    perms["Ventes Carburant"] = { ...fullPermission };
    // Shop sales: view only
    perms["Magasin"]          = { ...viewOnlyPermission };
    // My payments: view only
    perms["Mes Paiements"]    = { ...viewOnlyPermission };
    // Profile settings: view + modify own profile
    perms["Paramètres"]       = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: false, exporter: false, scanner: false, generer: false };
    // Everything else stays OFF (no Brigades page, no HR, no reports, etc.)
  }

  else if (role === 'chef_brigade') {
    // Dashboard: view own brigade info + payment summary
    perms["Tableau de bord"]  = { ...viewOnlyPermission };
    // Brigades: see only his own brigades (latest first) — view + modify + print, NO delete, NO accounting button (enforced in Brigades.tsx)
    perms["Brigades"]         = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: true, exporter: false, scanner: false, generer: false };
    // Fuel sales: full access
    perms["Ventes Carburant"] = { ...fullPermission };
    // Cuves: view only (chef needs to see tank levels)
    perms["Cuves"]            = { ...viewOnlyPermission };
    // My payments: view only
    perms["Mes Paiements"]    = { ...viewOnlyPermission };
    // Profile settings: view + modify
    perms["Paramètres"]       = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: false, exporter: false, scanner: false, generer: false };
    // Everything else OFF (no comptabilité, no HR, no reports, no stats)
  }

  else if (role === 'gerant') {
    // Gérant sees everything EXCEPT reports and statistics
    GROUPS.forEach(g => g.modules.forEach(m => {
      perms[m.id] = { ...viewOnlyPermission };
    }));
    // Give full access to operational modules
    perms["Brigades"]          = { ...fullPermission };
    perms["Ventes Carburant"]  = { ...fullPermission };
    perms["Magasin"]           = { ...fullPermission };
    perms["Cuves"]             = { ...viewOnlyPermission };
    perms["Pompes"]            = { ...viewOnlyPermission };
    perms["Pistes"]            = { ...viewOnlyPermission };
    perms["Livraisons"]        = { ...fullPermission };
    perms["Produits"]          = { ...fullPermission };
    perms["Achats"]            = { ...fullPermission };
    perms["Inventaires"]       = { ...fullPermission };
    perms["Clients"]           = { ...fullPermission };
    perms["Fournisseurs"]      = { ...fullPermission };
    perms["Dépenses"]          = { ...fullPermission };
    perms["Fiche Journalière"] = { ...fullPermission };
    perms["Mes Paiements"]     = { ...viewOnlyPermission };
    perms["Paramètres"]        = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: false, exporter: false, scanner: false, generer: false };
    // BLOCK reports and statistics explicitly
    perms["Statistiques"]      = { ...emptyPermission };
    perms["Rapports"]          = { ...emptyPermission };
    // BLOCK HR management pages
    perms["Pompistes"]         = { ...emptyPermission };
    perms["Chefs de Brigade"]  = { ...emptyPermission };
    perms["Gérants"]           = { ...emptyPermission };
    perms["Employés Magasin"]  = { ...emptyPermission };
  }

  else if (role === 'magasin') {
    // Shop sales: full access
    perms["Magasin"]        = { ...fullPermission };
    // Products: view only
    perms["Produits"]       = { ...viewOnlyPermission };
    // My payments: view only
    perms["Mes Paiements"]  = { ...viewOnlyPermission };
    // Profile settings: view + modify
    perms["Paramètres"]     = { voir: true, creer: false, modifier: true, supprimer: false, imprimer: false, exporter: false, scanner: false, generer: false };
    // Everything else OFF
  }

  return perms;
}
