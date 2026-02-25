// Type definitions for Cloudflare Worker environment

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'superuser' | 'top_manager' | 'manager';
  phone?: string;
  avatar_url?: string;
  approved: number;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

export interface Property {
  id: string;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  district?: string;
  street?: string;
  building_number?: string;
  block?: string;
  floor?: number;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  operation_type?: string;
  category?: string;
  source?: string;
  status: string;
  rooms?: number;
  area_total?: number;
  area_living?: number;
  area_kitchen?: number;
  floors_total?: number;
  property_condition?: string;
  heating?: string;
  bathroom?: string;
  balcony_type?: string;
  price?: number;
  currency?: string;
  price_per_sqm?: number;
  negotiable?: number;
  additional_costs?: string;
  owner_name?: string;
  owner_phones?: string;
  owner_email?: string;
  owner_notes?: string;
  photos?: string;
  documents?: string;
  tags?: string;
  agent_notes?: string;
  linked_client_id?: string;
  linked_deal_id?: string;
  created_by: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  segment: string;
  age?: number;
  budget?: number;
  tags?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  stage: string;
  property_id?: string;
  client_id?: string;
  assigned_agent_id?: string;
  created_by: string;
  notes?: string;
  amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  priority: string;
  done: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  event_type: string;
  status: string;
  user_id: string;
  property_id?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  category: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface ClientInteraction {
  id: string;
  client_id: string;
  user_id: string;
  interaction_type?: string;
  notes?: string;
  created_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  access_token: string;
  refresh_token: string;
}
