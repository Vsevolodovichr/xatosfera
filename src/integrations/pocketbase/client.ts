import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

type CollectionOptions = {
  sort?: string;
  filter?: string;
  fields?: string;
};

type AuthChangeHandler = () => void;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const listeners = new Set<AuthChangeHandler>();
let currentUser: User | null = null;
let currentSession: Session | null = null;

const notify = () => {
  listeners.forEach((handler) => handler());
};

void supabase.auth.getSession().then(({ data }) => {
  currentSession = data.session;
  currentUser = data.session?.user ?? null;
  notify();
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session;
  currentUser = session?.user ?? null;
  notify();
});

const applySort = <T>(query: T, sort?: string) => {
  if (!sort) return query;
  const isDesc = sort.startsWith('-');
  const column = sort.replace(/^-/, '');
  return (query as any).order(column, { ascending: !isDesc });
};

const applySelect = (fields?: string) => {
  if (!fields) return '*';
  return fields.replace(/\bcreated\b/g, 'created_at').replace(/\bupdated\b/g, 'updated_at');
};

const normalizeRecord = (record: Record<string, any>) => ({
  ...record,
  created: record.created_at,
  updated: record.updated_at,
});

const collection = (name: string) => ({
  async getOne(id: string, options?: CollectionOptions) {
    const select = applySelect(options?.fields);
    const { data, error } = await supabase.from(name).select(select).eq('id', id).single();
    if (error) throw error;
    return normalizeRecord(data);
  },
  async getFullList(options?: CollectionOptions) {
    const select = applySelect(options?.fields);
    let query = supabase.from(name).select(select);
    query = applySort(query, options?.sort);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(normalizeRecord);
  },
  async create(payload: Record<string, any>) {
    if (name === 'users' && payload.email && payload.password) {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.full_name,
            role: payload.role ?? 'manager',
          },
        },
      });
      if (error) throw error;
      return {
        id: data.user?.id,
        email: data.user?.email,
        full_name: payload.full_name,
      };
    }

    const cleanPayload = { ...payload };
    delete cleanPayload.passwordConfirm;
    delete cleanPayload.password;

    const { data, error } = await supabase.from(name).insert(cleanPayload).select().single();
    if (error) throw error;
    return normalizeRecord(data);
  },
  async update(id: string, payload: Record<string, any>) {
    const { data, error } = await supabase.from(name).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeRecord(data);
  },
  async delete(id: string) {
    const { error } = await supabase.from(name).delete().eq('id', id);
    if (error) throw error;
  },
  async authWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
});

const resolveBucket = (fileName: string) => {
  if (fileName.includes('avatar')) return 'avatars';
  if (fileName.includes('document')) return 'documents';
  return 'properties';
};

const pb = Object.assign(supabase, {
  collection,
  authStore: {
    get model() {
      return currentUser;
    },
    get isValid() {
      return Boolean(currentSession);
    },
    onChange(handler: AuthChangeHandler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    clear() {
      void supabase.auth.signOut();
    },
  },
  files: {
    getUrl(record: Record<string, any>, fileName?: string) {
      if (!fileName) return '';
      const bucket = resolveBucket(fileName);
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${record.id}/${fileName}`;
    },
  },
}) as SupabaseClient & {
  collection: typeof collection;
  authStore: {
    readonly model: User | null;
    readonly isValid: boolean;
    onChange: (handler: AuthChangeHandler) => () => void;
    clear: () => void;
  };
  files: {
    getUrl: (record: Record<string, any>, fileName?: string) => string;
  };
};

export default pb;
