import { createClient } from '@supabase/supabase-js';

// ─── Supabase Project Configuration ───────────────────────────────────────────
// Reads from .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) with the
// hardcoded project values as fallback so nothing breaks if .env is absent.
const SUPABASE_URL  =
  (import.meta.env.VITE_SUPABASE_URL  as string | undefined) ??
  'https://nowtqndrtuynturzlkew.supabase.co';

const SUPABASE_ANON =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vd3RxbmRydHV5bnR1cnpsa2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjUyOTUsImV4cCI6MjA5NTIwMTI5NX0.IYxKROwsKFblqptoIILag0w09GJGkITFUVyWfUW42uU';

// Vercel: define VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Project Settings → Environment Variables.
// Vite bakes these in at BUILD time; the browser cannot read runtime env vars.
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[supabase] VITE_SUPABASE_URL not defined — using hardcoded fallback. Add it in Vercel → Environment Variables (must exist at build time).');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[supabase] VITE_SUPABASE_ANON_KEY not defined — using hardcoded fallback. Add it in Vercel → Environment Variables (must exist at build time).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ─── Storage Bucket Names ──────────────────────────────────────────────────────
export const BUCKETS = {
  STATION_LOGOS:   'station-logos',
  PRODUCT_IMAGES:  'product-images',
  WORKER_PHOTOS:   'worker-photos',
  BON_PHOTOS:      'bon-photos',
  DELIVERY_PHOTOS: 'delivery-photos',
  INVOICES:        'invoices',
  EXPENSE_RECEIPTS:'expense-receipts',
  CLIENT_RECEIPTS: 'client-receipts',
} as const;

// ─── Generic File Upload Helper ────────────────────────────────────────────────
/**
 * Uploads a File object to a Supabase storage bucket.
 * Returns the public URL string, or null on failure.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) { console.error('Upload error:', error.message); return null; }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Converts a base64 data-URL string to a File and uploads it.
 * Used during migration from localStorage (base64) → Supabase Storage.
 */
export async function uploadBase64(
  bucket: string,
  path: string,
  base64: string,
  mimeType = 'image/jpeg'
): Promise<string | null> {
  try {
    const res  = await fetch(base64);
    const blob = await res.blob();
    const file = new File([blob], path, { type: mimeType });
    return uploadFile(bucket, path, file);
  } catch { return null; }
}

/**
 * Returns the public URL for an already-stored object (no upload).
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Auth Helpers ──────────────────────────────────────────────────────────────

/**
 * Sign in with email OR username.
 * Workers use the convention `${username}@workers.station.local` as their auth email.
 * Returns { user, session, role, profile } on success or { error } on failure.
 */
export async function signIn(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  // Workers use convention `${username}@workers.station.local`; admins pass full email directly.
  // toLowerCase() is applied first so it matches exactly what provision_worker_account stores.
  const email = id.includes('@') ? id : `${id}@workers.station.local`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Identifiant ou mot de passe incorrect' };

  // Resolve role via RPC — works for both admin_profiles and worker tables
  const { data: roleRow } = await supabase.rpc('get_my_role');
  const role = (roleRow as string | null) ?? 'admin';

  // Fetch the associated worker row (null for admin users)
  const { data: workerRow } = await supabase.rpc('get_my_worker');

  return { user: data.user, session: data.session, role, profile: workerRow };
}

/**
 * Register a new admin account.
 */
export async function signUpAdmin(params: {
  name: string;
  username: string;
  email: string;
  password: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name:     params.name,
        username: params.username,
        role:     'admin',
      },
    },
  });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await supabase.auth.signOut();
}

// ─── Worker Account Provisioning ──────────────────────────────────────────────
export type WorkerType = 'pompiste' | 'chef_brigade' | 'gerant' | 'magasin';

/**
 * Provision a worker Supabase Auth account via a PostgreSQL RPC function.
 * This replaces the old Edge Function approach (which had CORS issues).
 *
 * The RPC `provision_worker_account` runs as SECURITY DEFINER in the database,
 * so it has full access to auth.users — no service-role key needed in the browser.
 *
 * Actions:
 *  - 'create'          → creates auth.users + auth.identities rows,
 *                        updates the worker table with auth_user_id.
 *  - 'update_password' → changes the password for an existing auth user.
 *  - 'delete'          → removes the auth user and clears auth_user_id.
 */
export async function provisionWorkerAccount(input: {
  action: 'create' | 'update_password' | 'delete';
  workerType: WorkerType;
  workerId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
}): Promise<{ ok: true; auth_user_id?: string } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.rpc('provision_worker_account', {
      p_action:      input.action,
      p_worker_type: input.workerType,
      p_worker_id:   input.workerId,
      p_username:    input.username ?? null,
      p_password:    input.password ?? null,
      p_name:        input.name ?? null,
      p_email:       input.email ?? null,
    });

    if (error) {
      console.error('[provisionWorkerAccount] RPC error:', error);
      return {
        ok: false,
        error: error.message || 'Erreur lors de la création du compte',
      };
    }

    // The RPC returns a jsonb object like: { "ok": true, "auth_user_id": "..." }
    // or { "ok": false, "error": "..." }
    const result = data as { ok: boolean; auth_user_id?: string; error?: string };

    if (!result || !result.ok) {
      return {
        ok: false,
        error: result?.error || 'Erreur inconnue lors de la création du compte',
      };
    }

    return { ok: true, auth_user_id: result.auth_user_id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[provisionWorkerAccount] Exception:', msg);
    return {
      ok: false,
      error: `Erreur de création de compte: ${msg}`,
    };
  }
}

/**
 * Get the currently authenticated session.
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── Auth-retry wrapper ───────────────────────────────────────────────────────
/**
 * Runs `fn()`. If it throws with a JWT-expired / 401 signal, refreshes the
 * session automatically and retries ONCE. If the retry also fails, throws.
 */
async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e: any) {
    const msg = String(e?.message ?? '');
    const looksExpired =
      e?.status === 401 ||
      e?.code === 'PGRST301' ||
      /jwt|expired|invalid token/i.test(msg);
    if (!looksExpired) throw e;
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr) throw new Error('Session expired. Please log in again.');
    return await fn();
  }
}

// ─── DB helpers: generic upsert / delete ──────────────────────────────────────

/**
 * Insert a row into `table`.
 *
 * Previously used `.insert(row).select().single()` — if an RLS SELECT policy
 * blocked the read-back, the whole operation appeared to fail even though the
 * row was actually written.  We now separate insert from select so that an RLS
 * restriction on reads never silently swallows a successful write.
 */
export async function dbInsert<T extends object>(table: string, row: T): Promise<T> {
  return withAuthRetry(async () => {
    const { error } = await supabase.from(table).insert(row);
    if (error) throw new Error(`INSERT ${table}: ${error.message}`);
    return row; // All rows have client-generated IDs; returning the input is safe.
  });
}

/**
 * Update a row in `table`.
 * Same read-back resilience fix as dbInsert above.
 */
export async function dbUpdate<T extends object>(
  table: string,
  id: string,
  changes: Partial<T>
): Promise<Partial<T>> {
  return withAuthRetry(async () => {
    const { error } = await supabase.from(table).update(changes as any).eq('id', id);
    if (error) throw new Error(`UPDATE ${table}: ${error.message}`);
    return changes;
  });
}

export async function dbDelete(table: string, id: string) {
  return withAuthRetry(async () => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`DELETE ${table}: ${error.message}`);
  });
}

export async function dbSelect<T>(
  table: string,
  query?: Record<string, unknown>,
  limit?: number
): Promise<T[]> {
  return withAuthRetry(async () => {
    let q = supabase.from(table).select('*');
    if (query) {
      Object.entries(query).forEach(([k, v]) => { q = q.eq(k, v) as typeof q; });
    }
    // Always order newest-first; callers may pass a limit for large tables
    let q2 = q.order('created_at', { ascending: false });
    if (limit) q2 = q2.limit(limit) as typeof q2;
    const { data, error } = await q2;
    if (error) throw new Error(`SELECT ${table}: ${error.message}`);
    return (data ?? []) as T[];
  });
}

// ─── Specific data loaders ────────────────────────────────────────────────────

export const db = {
  // Settings
  // NOTE: `.maybeSingle()` is used instead of `.single()` because the table
  // may legitimately have 0 rows on first run.  `.single()` returns HTTP 406
  // (Not Acceptable) when no row exists, flooding the console with errors.
  getSettings: async () => {
    const { data } = await supabase.from('station_settings').select('*').maybeSingle();
    return data;
  },
  saveSettings: async (settings: Record<string, unknown>) => {
    const { data: existing } = await supabase.from('station_settings').select('*').maybeSingle();
    if (existing?.id) {
      // Merge with existing settings to preserve all required fields
      const mergedSettings = {
        name: settings.name ?? existing.name ?? 'Station Naftal',
        logo_url: settings.logo_url ?? existing.logo_url ?? null,
        address: settings.address ?? existing.address ?? null,
        phone: settings.phone ?? existing.phone ?? null,
        email: settings.email ?? existing.email ?? null,
        fiscal_id: settings.fiscal_id ?? existing.fiscal_id ?? null,
        rc: settings.rc ?? existing.rc ?? null,
        fuel_prices: settings.fuel_prices ?? existing.fuel_prices ?? { SUPER: 14.80, DIESEL: 12.50, ESSENCE: 14.80, GASOIL: 12.50, GPL: 8.50 },
        fuel_buy_prices: settings.fuel_buy_prices ?? existing.fuel_buy_prices ?? { SUPER: 0, DIESEL: 0, ESSENCE: 0, GASOIL: 0, GPL: 0 },
        conversion_tables: settings.conversion_tables ?? existing.conversion_tables ?? {},
        product_categories: settings.product_categories ?? existing.product_categories ?? ['Lubrifiants', 'Accessoires', 'Lavage', 'Magasin'],
        expense_categories: settings.expense_categories ?? existing.expense_categories ?? ['Salaires', 'Entretien', 'Électricité', 'Eau', 'Loyer', 'Impôts', 'Divers'],
        product_units: settings.product_units ?? existing.product_units ?? ['Pièce', 'Litre', 'Kg', 'Carton', 'Pack', 'Bidon'],
        decalage_positif_actif: settings.decalage_positif_actif ?? existing.decalage_positif_actif ?? true,
        decalage_negatif_actif: settings.decalage_negatif_actif ?? existing.decalage_negatif_actif ?? true,
      };
      return supabase.from('station_settings').update(mergedSettings).eq('id', existing.id);
    }
    return supabase.from('station_settings').insert(settings);
  },

  // Tanks
  getTanks:   () => dbSelect('tanks'),
  addTank:    (t: object) => dbInsert('tanks', t),
  updateTank: (id: string, t: object) => dbUpdate('tanks', id, t),
  deleteTank: (id: string) => dbDelete('tanks', id),

  // Tracks
  getTracks:   () => dbSelect('tracks'),
  addTrack:    (t: object) => dbInsert('tracks', t),
  updateTrack: (id: string, t: object) => dbUpdate('tracks', id, t),
  deleteTrack: (id: string) => dbDelete('tracks', id),

  // Pumps
  getPumps:   () => dbSelect('pumps'),
  addPump:    (p: object) => dbInsert('pumps', p),
  updatePump: (id: string, p: object) => dbUpdate('pumps', id, p),
  deletePump: (id: string) => dbDelete('pumps', id),

  // Pump Nozzles
  getNozzles:    () => dbSelect('pump_nozzles'),
  addNozzle:    (n: object) => dbInsert('pump_nozzles', n),
  updateNozzle: (id: string, n: object) => dbUpdate('pump_nozzles', id, n),
  deleteNozzle: (id: string) => dbDelete('pump_nozzles', id),

  // Drivers
  getDrivers: () => dbSelect('drivers'),
  addDriver:  (d: object) => dbInsert('drivers', d),
  deleteDriver: (id: string) => dbDelete('drivers', id),

  // Suppliers
  getSuppliers:   () => dbSelect('suppliers'),
  addSupplier:    (s: object) => dbInsert('suppliers', s),
  updateSupplier: (id: string, s: object) => dbUpdate('suppliers', id, s),
  deleteSupplier: (id: string) => dbDelete('suppliers', id),

  // Supplier sub-records
  getSupplierAppointments:  (supplierId: string) => dbSelect('supplier_appointments', { supplier_id: supplierId }),
  addSupplierAppointment:   (a: object) => dbInsert('supplier_appointments', a),
  getSupplierDebtPayments:  (supplierId: string) => dbSelect('supplier_debt_payments', { supplier_id: supplierId }),
  addSupplierDebtPayment:   (p: object) => dbInsert('supplier_debt_payments', p),

  // Clients
  getClients:   () => dbSelect('clients'),
  addClient:    (c: object) => dbInsert('clients', c),
  updateClient: (id: string, c: object) => dbUpdate('clients', id, c),
  deleteClient: (id: string) => dbDelete('clients', id),

  // Client sub-records
  getClientTransactions:  (clientId: string) => dbSelect('client_transactions', { client_id: clientId }),
  addClientTransaction:   (t: object) => dbInsert('client_transactions', t),
  getClientAppointments:  (clientId: string) => dbSelect('client_appointments', { client_id: clientId }),
  addClientAppointment:   (a: object) => dbInsert('client_appointments', a),

  // Products
  getProducts:   () => dbSelect('products'),
  addProduct:    (p: object) => dbInsert('products', p),
  updateProduct: (id: string, p: object) => dbUpdate('products', id, p),
  deleteProduct: (id: string) => dbDelete('products', id),

  // Product Brands
  getBrands:   () => dbSelect('product_brands'),
  addBrand:    (b: object) => dbInsert('product_brands', b),
  updateBrand: (id: string, b: object) => dbUpdate('product_brands', id, b),
  deleteBrand: (id: string) => dbDelete('product_brands', id),

  // Pompistes
  getPompistes:   () => dbSelect('pompistes'),
  addPompiste:    (p: object) => dbInsert('pompistes', p),
  updatePompiste: (id: string, p: object) => dbUpdate('pompistes', id, p),
  deletePompiste: (id: string) => dbDelete('pompistes', id),

  // Brigade Chefs
  getBrigadeChefs:   () => dbSelect('brigade_chefs'),
  addBrigadeChef:    (c: object) => dbInsert('brigade_chefs', c),
  updateBrigadeChef: (id: string, c: object) => dbUpdate('brigade_chefs', id, c),
  deleteBrigadeChef: (id: string) => dbDelete('brigade_chefs', id),

  // Gerants
  getGerants:   () => dbSelect('gerants'),
  addGerant:    (g: object) => dbInsert('gerants', g),
  updateGerant: (id: string, g: object) => dbUpdate('gerants', id, g),
  deleteGerant: (id: string) => dbDelete('gerants', id),

  // Magasin Workers
  getMagasinWorkers:   () => dbSelect('magasin_workers'),
  addMagasinWorker:    (m: object) => dbInsert('magasin_workers', m),
  updateMagasinWorker: (id: string, m: object) => dbUpdate('magasin_workers', id, m),
  deleteMagasinWorker: (id: string) => dbDelete('magasin_workers', id),

  // Worker payroll sub-records
  getWorkerAcomptes:       (workerId: string) => dbSelect('worker_acomptes', { worker_id: workerId }),
  addWorkerAcompte:        (a: object) => dbInsert('worker_acomptes', a),
  getWorkerAbsences:       (workerId: string) => dbSelect('worker_absences', { worker_id: workerId }),
  addWorkerAbsence:        (a: object) => dbInsert('worker_absences', a),
  getWorkerPaymentRecords: (workerId: string) => dbSelect('worker_payment_records', { worker_id: workerId }),
  addWorkerPaymentRecord:  (p: object) => dbInsert('worker_payment_records', p),
  markPaymentPaid: async (paymentId: string) =>
    dbUpdate('worker_payment_records', paymentId, { is_paid: true }),

  // Brigades
  getBrigades:   () => dbSelect('brigades'),
  addBrigade:    (b: object) => dbInsert('brigades', b),
  updateBrigade: (id: string, b: object) => dbUpdate('brigades', id, b),
  deleteBrigade: (id: string) => dbDelete('brigades', id),

  // Decalage history
  addDecalageHistory: (d: object) => dbInsert('pompiste_decalage_history', d),
  getDecalageHistory: (pompisteId: string) =>
    dbSelect('pompiste_decalage_history', { pompiste_id: pompisteId }),

  // Brigade Accounting
  getBrigadeAccountings: () => dbSelect('brigade_accounting'),
  addBrigadeAccounting: (a: object) => dbInsert('brigade_accounting', a),
  updateBrigadeAccounting: (id: string, a: object) => dbUpdate('brigade_accounting', id, a),
  getBrigadeAccountingJustifications: (accountingId: string) =>
    supabase.from('brigade_accounting_justifications').select('*').eq('accounting_id', accountingId).then(r => r.data ?? []),
  addBrigadeAccountingJustification: (j: object) => dbInsert('brigade_accounting_justifications', j),

  // Fuel Sales
  getFuelSales:   () => dbSelect('fuel_sales'),
  addFuelSale:    (s: object) => dbInsert('fuel_sales', s),
  updateFuelSale: (id: string, s: object) => dbUpdate('fuel_sales', id, s),
  deleteFuelSale: (id: string) => dbDelete('fuel_sales', id),

  // Shop Sales
  getShopSales:   () => dbSelect('shop_sales'),
  addShopSale:    (s: object) => dbInsert('shop_sales', s),
  updateShopSale: (id: string, s: object) => dbUpdate('shop_sales', id, s),
  deleteShopSale: (id: string) => dbDelete('shop_sales', id),
  addShopSaleItems: (items: object[]) => supabase.from('shop_sale_items').insert(items),
  getShopSaleItems: (saleId: string) => dbSelect('shop_sale_items', { sale_id: saleId }),

  // Delivery Notes
  getDeliveryNotes:   () => dbSelect('delivery_notes'),
  addDeliveryNote:    (d: object) => dbInsert('delivery_notes', d),
  updateDeliveryNote: (id: string, d: object) => dbUpdate('delivery_notes', id, d),
  deleteDeliveryNote: (id: string) => dbDelete('delivery_notes', id),
  addDeliveryNotePhoto:   (p: object) => dbInsert('delivery_note_photos', p),
  addDeliveryNotePayment: (p: object) => dbInsert('delivery_note_payments', p),
  getDeliveryNotePhotos:  (noteId: string) => dbSelect('delivery_note_photos', { delivery_note_id: noteId }),
  getDeliveryNotePayments:(noteId: string) => dbSelect('delivery_note_payments', { delivery_note_id: noteId }),

  // Purchases
  getPurchases:   () => dbSelect('purchases'),
  addPurchase:    (p: object) => dbInsert('purchases', p),
  updatePurchase: (id: string, p: object) => dbUpdate('purchases', id, p),
  deletePurchase: (id: string) => dbDelete('purchases', id),
  addPurchaseItems:   (items: object[]) => supabase.from('purchase_items').insert(items),
  getPurchaseItems:   (purchaseId: string) => dbSelect('purchase_items', { purchase_id: purchaseId }),
  addPurchasePayment: (p: object) => dbInsert('purchase_payments', p),
  getPurchasePayments:(purchaseId: string) => dbSelect('purchase_payments', { purchase_id: purchaseId }),

  // Expenses
  getExpenses:   () => dbSelect('expenses'),
  addExpense:    (e: object) => dbInsert('expenses', e),
  updateExpense: (id: string, e: object) => dbUpdate('expenses', id, e),
  deleteExpense: (id: string) => dbDelete('expenses', id),

  // Inventories
  getInventories:   () => dbSelect('inventories'),
  addInventory:     (i: object) => dbInsert('inventories', i),
  updateInventory:  (id: string, i: object) => dbUpdate('inventories', id, i),
  deleteInventory:  (id: string) => dbDelete('inventories', id),

  // Daily Reports
  getDailyReports: () => dbSelect('daily_reports'),
  addDailyReport:  (r: object) => dbInsert('daily_reports', r),

  // Admin Profiles
  getAdminProfiles: () => dbSelect('admin_profiles'),
  getAdminProfile: async (id: string) => {
    const { data, error } = await supabase
      .from('admin_profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`SELECT admin_profiles: ${error.message}`);
    return data;
  },
  updateAdminProfile: (id: string, patch: Record<string, unknown>) =>
    dbUpdate('admin_profiles', id, patch),

  // Activity Log
  addActivityLog: (entry: object) => dbInsert('activity_log', entry),
  getActivityLog: () =>
    supabase
      .from('activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(r => r.data ?? []),
};

// ─── Camel ↔ Snake conversion helpers ─────────────────────────────────────────
// Supabase returns snake_case; AppContext uses camelCase

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

export function rowToCamel<T extends object>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamel(k)] = v;
  }
  return out as T;
}

export function objToSnake<T extends object>(obj: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out as T;
}

/** Convert an array of snake_case rows to camelCase objects */
export function rowsToCamel<T extends object>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => rowToCamel<T>(r));
}

// ─── Realtime subscription helper ─────────────────────────────────────────────
/**
 * Subscribe to INSERT/UPDATE/DELETE on any table.
 * Returns an unsubscribe function.
 */
export function subscribeTable(
  table: string,
  callback: (payload: { eventType: string; new: unknown; old: unknown }) => void
) {
  const channel = supabase
    .channel(`table-changes-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
