import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeRole = (role) => {
  if (role === 'manager') return 'event_manager';
  if (!role) return 'pioneer';
  return role;
};

const dbRole = (role) => {
  if (role === 'event_manager') return 'manager';
  return role || 'pioneer';
};

const toDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toTimeString().slice(0, 5);
};

const fetchProfileMap = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('profiles').select('id, email, display_name').in('id', ids);
  if (error) return {};
  return Object.fromEntries((data || []).map((profile) => [profile.id, profile]));
};

const buildEventRow = (row) => ({
  ...row,
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  location: row.location ?? '',
  start_date: row.starts_at || row.start_date || '',
  end_date: row.ends_at || row.end_date || '',
  invite_code: row.invite_code || '',
  created_by_id: row.created_by || row.created_by_id || null,
});

const buildEventMemberRow = (row, profileMapById) => {
  const userProfile = profileMapById[row.user_id] || null;
  const arrivalAt = row.arrival_at || row.arrival_date || null;
  const departureAt = row.departure_at || row.departure_date || null;

  return {
    ...row,
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    user_name: row.user_name || userProfile?.display_name || userProfile?.email || 'משתמש',
    role: normalizeRole(row.role),
    arrival_date: toDate(arrivalAt),
    arrival_time: toTime(arrivalAt),
    departure_date: toDate(departureAt),
    departure_time: toTime(departureAt),
    nights: Number(row.nights ?? 1),
    adults: Number(row.adults ?? 1),
    children: Number(row.children ?? 0),
    created_date: row.created_at,
  };
};

const buildShoppingItemRow = (row) => ({
  ...row,
  id: row.id,
  event_id: row.event_id,
  name: row.name,
  category: row.category || '',
  responsible_id: row.assigned_to || row.responsible_id || '',
  responsible_name: row.responsible_name || '',
  is_checked: Boolean(row.is_checked),
});

const buildEquipmentItemRow = (row) => ({
  ...row,
  id: row.id,
  event_id: row.event_id,
  name: row.name,
  category: row.category || '',
  responsible_id: row.assigned_to || row.responsible_id || '',
  responsible_name: row.responsible_name || '',
  is_checked: Boolean(row.is_checked),
});

const buildExpenseRow = (row) => ({
  ...row,
  id: row.id,
  event_id: row.event_id,
  user_id: row.user_id,
  user_name: row.user_name || '',
  amount: Number(row.amount || 0),
  description: row.note || row.description || '',
  note: row.note || row.description || '',
});

const buildProgramItemRow = (row) => ({
  ...row,
  id: row.id,
  event_id: row.event_id,
  title: row.title,
  time: row.time_slot || row.time || '',
  description: row.description || '',
  responsible_id: row.assigned_to || row.responsible_id || '',
  responsible_name: row.responsible_name || '',
  order: Number(row.position ?? row.order ?? 0),
});

const buildRecommendationRow = (row) => ({
  ...row,
  id: row.id,
  event_id: row.event_id,
  name: row.name,
  description: row.description || '',
  url: row.url || '',
});

const entityAdapter = (table, { mapRow = (row) => row } = {}) => ({
  async filter(filters = {}) {
    let query = supabase.from(table).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async get(id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  async create(payload) {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id, payload) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async delete(id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteMany(filters = {}) {
    let query = supabase.from(table).delete();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      query = query.eq(key, value);
    });
    const { error } = await query;
    if (error) throw error;
    return true;
  },

  async bulkCreate(rows) {
    if (!rows.length) return [];
    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error) throw error;
    return (data || []).map(mapRow);
  },
});

const eventEntity = entityAdapter('events', { mapRow: buildEventRow });

const eventMemberEntity = {
  async filter(filters = {}) {
    let query = supabase.from('event_members').select('*');
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      query = query.eq(key, value);
    });

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    const ids = [...new Set((data || []).map((row) => row.user_id).filter(Boolean))];
    const profileMapById = await fetchProfileMap(ids);
    return (data || []).map((row) => buildEventMemberRow(row, profileMapById));
  },

  async get(id) {
    const { data, error } = await supabase.from('event_members').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const profileMapById = await fetchProfileMap([data.user_id]);
    return buildEventMemberRow(data, profileMapById);
  },

  async create(payload) {
    const nextPayload = { ...payload };
    if (!isUuid(nextPayload.user_id)) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User must be authenticated');
      nextPayload.user_id = user.id;
    }
    nextPayload.role = dbRole(nextPayload.role || 'pioneer');
    nextPayload.arrival_at = nextPayload.arrival_date ? `${nextPayload.arrival_date}T${nextPayload.arrival_time || '00:00'}:00` : nextPayload.arrival_at || null;
    nextPayload.departure_at = nextPayload.departure_date ? `${nextPayload.departure_date}T${nextPayload.departure_time || '00:00'}:00` : nextPayload.departure_at || null;
    delete nextPayload.arrival_date;
    delete nextPayload.arrival_time;
    delete nextPayload.departure_date;
    delete nextPayload.departure_time;
    const { data, error } = await supabase.from('event_members').insert(nextPayload).select().single();
    if (error) throw error;
    const profileMapById = await fetchProfileMap([data.user_id]);
    return buildEventMemberRow(data, profileMapById);
  },

  async update(id, payload) {
    const nextPayload = { ...payload };
    if (nextPayload.role) nextPayload.role = dbRole(nextPayload.role);
    if (nextPayload.arrival_date || nextPayload.arrival_time) {
      const date = nextPayload.arrival_date || '';
      const time = nextPayload.arrival_time || '00:00';
      nextPayload.arrival_at = date ? `${date}T${time}:00` : null;
    }
    if (nextPayload.departure_date || nextPayload.departure_time) {
      const date = nextPayload.departure_date || '';
      const time = nextPayload.departure_time || '00:00';
      nextPayload.departure_at = date ? `${date}T${time}:00` : null;
    }
    delete nextPayload.arrival_date;
    delete nextPayload.arrival_time;
    delete nextPayload.departure_date;
    delete nextPayload.departure_time;
    const { data, error } = await supabase.from('event_members').update(nextPayload).eq('id', id).select().single();
    if (error) throw error;
    const profileMapById = await fetchProfileMap([data.user_id]);
    return buildEventMemberRow(data, profileMapById);
  },

  async delete(id) {
    const { error } = await supabase.from('event_members').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteMany(filters = {}) {
    let query = supabase.from('event_members').delete();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      query = query.eq(key, value);
    });
    const { error } = await query;
    if (error) throw error;
    return true;
  },
};

const shoppingEntity = entityAdapter('shopping_items', { mapRow: buildShoppingItemRow });
const equipmentEntity = entityAdapter('equipment_items', { mapRow: buildEquipmentItemRow });
const expenseEntity = entityAdapter('expenses', { mapRow: buildExpenseRow });
const recommendationEntity = entityAdapter('recommendations', { mapRow: buildRecommendationRow });

const programEntity = entityAdapter('program_items', { mapRow: buildProgramItemRow });

const mealEntity = {
  async filter() { return []; },
  async get() { return null; },
  async create() { return { id: crypto?.randomUUID?.() ?? String(Date.now()) }; },
  async update() { return { id: String(Date.now()) }; },
  async delete() { return true; },
  async deleteMany() { return true; },
  async bulkCreate(rows) { return rows; },
};

const profileEntity = {
  async get(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data || null;
  },
};

const authCompat = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('Not authenticated');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    return {
      ...user,
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.display_name || profile?.display_name || user.email,
      display_name: profile?.display_name || user.user_metadata?.display_name || user.email,
      is_super_admin: Boolean(profile?.is_super_admin),
      is_event_manager: Boolean(profile?.is_event_manager),
      role: profile?.is_super_admin ? 'admin' : profile?.is_event_manager ? 'manager' : 'member',
    };
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async logout(nextUrl = '') {
    await supabase.auth.signOut();
    if (nextUrl) {
      window.location.href = nextUrl;
    }
    return true;
  },

  redirectToLogin(nextUrl = '/login') {
    window.location.href = nextUrl;
  },

  async register({ email, password, ...rest }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...rest,
          display_name: rest.display_name || rest.full_name || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async verifyOtp({ email, otpCode, token, type = 'email' }) {
    const code = otpCode || token;
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: String(code),
      type: type === 'signup' ? 'signup' : 'email',
    });
    if (error) throw error;
    return data;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return true;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return true;
  },

  async resetPassword({ newPassword }) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  setToken(token) {
    if (!token) return;
    supabase.auth.setSession({ access_token: token, refresh_token: '', expires_in: 3600, token_type: 'bearer' });
  },
};

export const base44 = {
  auth: authCompat,
  entities: {
    Event: eventEntity,
    EventMember: eventMemberEntity,
    ShoppingItem: shoppingEntity,
    EquipmentItem: equipmentEntity,
    Expense: expenseEntity,
    ProgramItem: programEntity,
    Recommendation: recommendationEntity,
    Meal: mealEntity,
    Profile: profileEntity,
  },
};
