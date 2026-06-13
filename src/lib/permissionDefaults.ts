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
  GROUPS.forEach(g => g.modules.forEach(m => { perms[m.id] = { ...emptyPermission }; }));

  if (role === 'pompiste') {
    perms["Ventes Carburant"] = { ...fullPermission };
    perms["Ma Brigade"]       = { ...viewOnlyPermission };
    perms["Mes Paiements"]    = { ...viewOnlyPermission };
  } else if (role === 'chef_brigade') {
    perms["Brigades"] = {
      voir: true, creer: false, modifier: true, supprimer: false,
      imprimer: true, exporter: false, scanner: false, generer: false,
    };
    perms["Dépenses"] = {
      voir: true, creer: true, modifier: false, supprimer: false,
      imprimer: false, exporter: false, scanner: false, generer: false,
    };
    perms["Ventes Carburant"] = { ...fullPermission };
    perms["Ma Brigade"]       = { ...viewOnlyPermission };
    perms["Mes Paiements"]    = { ...viewOnlyPermission };
  } else if (role === 'gerant') {
    Object.keys(perms).forEach(k => { perms[k] = { ...viewOnlyPermission }; });
    perms["Brigades"] = { ...fullPermission };
    perms["Dépenses"] = { ...fullPermission };
  } else if (role === 'magasin') {
    perms["Magasin"]       = { ...fullPermission };
    perms["Produits"]      = { ...viewOnlyPermission };
    perms["Mes Paiements"] = { ...viewOnlyPermission };
  }

  return perms;
}
