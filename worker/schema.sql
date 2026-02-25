-- Cloudflare D1 Schema for CRM Application
-- Run this SQL to create all necessary tables

-- Users table (authentication and profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'manager' CHECK (role IN ('superuser', 'top_manager', 'manager')),
  phone TEXT,
  avatar_url TEXT,
  approved INTEGER DEFAULT 0,
  approved_at TEXT,
  approved_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Properties table (real estate objects)
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT DEFAULT 'Кропивницький',
  district TEXT,
  street TEXT,
  building_number TEXT,
  block TEXT,
  floor INTEGER,
  apartment TEXT,
  latitude REAL,
  longitude REAL,
  
  operation_type TEXT CHECK (operation_type IN ('sale', 'rent', 'new_build')),
  category TEXT CHECK (category IN ('apartment', 'house', 'commercial', 'other')),
  source TEXT CHECK (source IN ('owner', 'database', 'partner', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'sold', 'rented')),
  
  rooms INTEGER,
  area_total REAL,
  area_living REAL,
  area_kitchen REAL,
  floors_total INTEGER,
  
  property_condition TEXT CHECK (property_condition IN ('no_repair', 'cosmetic', 'euro', 'furnished', 'after_build')),
  heating TEXT CHECK (heating IN ('central', 'autonomous', 'electric', 'gas')),
  bathroom TEXT CHECK (bathroom IN ('separate', 'combined')),
  balcony_type TEXT CHECK (balcony_type IN ('none', 'balcony', 'loggia', 'terrace')),
  
  price REAL,
  currency TEXT DEFAULT 'UAH' CHECK (currency IN ('UAH', 'USD', 'EUR')),
  price_per_sqm REAL,
  negotiable INTEGER DEFAULT 0,
  additional_costs TEXT,
  
  owner_name TEXT,
  owner_phones TEXT, -- JSON array stored as text
  owner_email TEXT,
  owner_notes TEXT,
  
  photos TEXT, -- JSON array stored as text
  documents TEXT, -- JSON array stored as text
  tags TEXT, -- JSON array stored as text
  agent_notes TEXT,
  
  linked_client_id TEXT,
  linked_deal_id TEXT,
  
  created_by TEXT NOT NULL,
  manager_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (linked_client_id) REFERENCES clients(id),
  FOREIGN KEY (linked_deal_id) REFERENCES deals(id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  segment TEXT DEFAULT 'buyer' CHECK (segment IN ('buyer', 'seller', 'tenant')),
  age INTEGER,
  budget REAL,
  tags TEXT, -- JSON array stored as text
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Client interactions table
CREATE TABLE IF NOT EXISTS client_interactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  interaction_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Deals table (sales funnel)
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'viewing', 'offer', 'deal', 'closed')),
  property_id TEXT,
  client_id TEXT,
  assigned_agent_id TEXT,
  created_by TEXT NOT NULL,
  notes TEXT,
  amount REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Notes/Tasks table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  content TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  done INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'viewing', 'deadline')),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  user_id TEXT NOT NULL,
  property_id TEXT,
  client_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- User documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'fop' CHECK (category IN ('fop', 'rent_contract', 'sale_contract', 'agency_contract')),
  file_url TEXT NOT NULL, -- R2 object key
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_manager ON properties(manager_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id);
