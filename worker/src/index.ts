// Cloudflare Worker - CRM API
// Main entry point

import type { Env, User, JWTPayload, AuthResponse } from './types';
import {
  hashPassword,
  verifyPassword,
  createJWT,
  verifyJWT,
  generateRefreshToken,
  generateId,
  sanitizeUser,
} from './auth';
import {
  jsonResponse,
  errorResponse,
  handleOptions,
  parseBody,
  extractToken,
  parseQuery,
  buildOrderClause,
  corsHeaders,
} from './utils';

// JWT expiration times
const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days

// Default JWT secret (should be overridden in production)
const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleOptions(env);
    }

    // JWT secret
    const jwtSecret = env.JWT_SECRET || DEFAULT_JWT_SECRET;

    try {
      // ============ AUTH ROUTES ============
      
      // POST /api/auth/register
      if (path === '/api/auth/register' && method === 'POST') {
        return handleRegister(request, env, jwtSecret);
      }

      // POST /api/auth/login
      if (path === '/api/auth/login' && method === 'POST') {
        return handleLogin(request, env, jwtSecret);
      }

      // POST /api/auth/refresh
      if (path === '/api/auth/refresh' && method === 'POST') {
        return handleRefresh(request, env, jwtSecret);
      }

      // POST /api/auth/logout
      if (path === '/api/auth/logout' && method === 'POST') {
        return handleLogout(request, env, jwtSecret);
      }

      // GET /api/auth/me
      if (path === '/api/auth/me' && method === 'GET') {
        return handleGetMe(request, env, jwtSecret);
      }

      // ============ PROTECTED ROUTES ============
      
      // Verify authentication for all other /api routes
      const authResult = await verifyAuth(request, env, jwtSecret);
      if (!authResult.success) {
        return errorResponse('Unauthorized', 401, env);
      }
      const currentUser = authResult.user!;

      // ============ USERS ROUTES ============
      
      // GET /api/users
      if (path === '/api/users' && method === 'GET') {
        return handleGetUsers(env, currentUser);
      }

      // GET /api/users/:id
      if (path.match(/^\/api\/users\/[^/]+$/) && method === 'GET') {
        const id = path.split('/')[3];
        return handleGetUser(env, id, currentUser);
      }

      // PUT /api/users/:id
      if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateUser(request, env, id, currentUser);
      }

      // DELETE /api/users/:id
      if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteUser(env, id, currentUser);
      }

      // ============ PROPERTIES ROUTES ============
      
      // GET /api/properties
      if (path === '/api/properties' && method === 'GET') {
        return handleGetProperties(url, env, currentUser);
      }

      // POST /api/properties
      if (path === '/api/properties' && method === 'POST') {
        return handleCreateProperty(request, env, currentUser);
      }

      // GET /api/properties/:id
      if (path.match(/^\/api\/properties\/[^/]+$/) && method === 'GET') {
        const id = path.split('/')[3];
        return handleGetProperty(env, id);
      }

      // PUT /api/properties/:id
      if (path.match(/^\/api\/properties\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateProperty(request, env, id, currentUser);
      }

      // DELETE /api/properties/:id
      if (path.match(/^\/api\/properties\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteProperty(env, id, currentUser);
      }

      // ============ CLIENTS ROUTES ============
      
      // GET /api/clients
      if (path === '/api/clients' && method === 'GET') {
        return handleGetClients(url, env);
      }

      // POST /api/clients
      if (path === '/api/clients' && method === 'POST') {
        return handleCreateClient(request, env, currentUser);
      }

      // PUT /api/clients/:id
      if (path.match(/^\/api\/clients\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateClient(request, env, id);
      }

      // DELETE /api/clients/:id
      if (path.match(/^\/api\/clients\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteClient(env, id);
      }

      // ============ CLIENT INTERACTIONS ROUTES ============
      
      // GET /api/client-interactions
      if (path === '/api/client-interactions' && method === 'GET') {
        return handleGetInteractions(url, env);
      }

      // POST /api/client-interactions
      if (path === '/api/client-interactions' && method === 'POST') {
        return handleCreateInteraction(request, env, currentUser);
      }

      // ============ DEALS ROUTES ============
      
      // GET /api/deals
      if (path === '/api/deals' && method === 'GET') {
        return handleGetDeals(url, env);
      }

      // POST /api/deals
      if (path === '/api/deals' && method === 'POST') {
        return handleCreateDeal(request, env, currentUser);
      }

      // PUT /api/deals/:id
      if (path.match(/^\/api\/deals\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateDeal(request, env, id);
      }

      // DELETE /api/deals/:id
      if (path.match(/^\/api\/deals\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteDeal(env, id);
      }

      // ============ NOTES ROUTES ============
      
      // GET /api/notes
      if (path === '/api/notes' && method === 'GET') {
        return handleGetNotes(url, env, currentUser);
      }

      // POST /api/notes
      if (path === '/api/notes' && method === 'POST') {
        return handleCreateNote(request, env, currentUser);
      }

      // PUT /api/notes/:id
      if (path.match(/^\/api\/notes\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateNote(request, env, id);
      }

      // DELETE /api/notes/:id
      if (path.match(/^\/api\/notes\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteNote(env, id);
      }

      // ============ CALENDAR EVENTS ROUTES ============
      
      // GET /api/calendar-events
      if (path === '/api/calendar-events' && method === 'GET') {
        return handleGetCalendarEvents(url, env, currentUser);
      }

      // POST /api/calendar-events
      if (path === '/api/calendar-events' && method === 'POST') {
        return handleCreateCalendarEvent(request, env, currentUser);
      }

      // PUT /api/calendar-events/:id
      if (path.match(/^\/api\/calendar-events\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateCalendarEvent(request, env, id);
      }

      // DELETE /api/calendar-events/:id
      if (path.match(/^\/api\/calendar-events\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteCalendarEvent(env, id);
      }

      // ============ DOCUMENTS ROUTES ============
      
      // GET /api/documents
      if (path === '/api/documents' && method === 'GET') {
        return handleGetDocuments(url, env, currentUser);
      }

      // POST /api/documents
      if (path === '/api/documents' && method === 'POST') {
        return handleUploadDocument(request, env, currentUser);
      }

      // DELETE /api/documents/:id
      if (path.match(/^\/api\/documents\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteDocument(env, id, currentUser);
      }

      // ============ FILES ROUTES (R2) ============
      
      // GET /api/files/:key
      if (path.match(/^\/api\/files\/.+$/) && method === 'GET') {
        const key = decodeURIComponent(path.slice('/api/files/'.length));
        return handleGetFile(env, key, currentUser);
      }

      // POST /api/files/upload
      if (path === '/api/files/upload' && method === 'POST') {
        return handleFileUpload(request, env, currentUser);
      }

      // Not found
      return errorResponse('Not found', 404, env);

    } catch (error) {
      console.error('Error:', error);
      return errorResponse('Internal server error', 500, env);
    }
  },
};

// ============ AUTH HANDLERS ============

async function handleRegister(request: Request, env: Env, jwtSecret: string): Promise<Response> {
  const body = await parseBody<{ email: string; password: string; full_name: string }>(request);
  if (!body || !body.email || !body.password || !body.full_name) {
    return errorResponse('Missing required fields', 400, env);
  }

  // Check if user exists
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first();
  if (existing) {
    return errorResponse('User already exists', 409, env);
  }

  // Create user
  const id = generateId();
  const passwordHash = await hashPassword(body.password);
  
  await env.DB.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, approved, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'manager', 0, datetime('now'), datetime('now'))
  `).bind(id, body.email, passwordHash, body.full_name).run();

  // Get created user
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  if (!user) {
    return errorResponse('Failed to create user', 500, env);
  }

  // Create tokens
  const accessToken = await createJWT({ sub: user.id, email: user.email, role: user.role }, jwtSecret, ACCESS_TOKEN_EXPIRY);
  const refreshToken = generateRefreshToken();
  
  // Store refresh token
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(sessionId, user.id, refreshToken, expiresAt).run();

  const response: AuthResponse = {
    user: sanitizeUser(user),
    access_token: accessToken,
    refresh_token: refreshToken,
  };

  return jsonResponse(response, 201, env);
}

async function handleLogin(request: Request, env: Env, jwtSecret: string): Promise<Response> {
  const body = await parseBody<{ email: string; password: string }>(request);
  if (!body || !body.email || !body.password) {
    return errorResponse('Missing email or password', 400, env);
  }

  // Find user
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(body.email).first<User>();
  if (!user) {
    return errorResponse('Invalid credentials', 401, env);
  }

  // Verify password
  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return errorResponse('Invalid credentials', 401, env);
  }

  // Create tokens
  const accessToken = await createJWT({ sub: user.id, email: user.email, role: user.role }, jwtSecret, ACCESS_TOKEN_EXPIRY);
  const refreshToken = generateRefreshToken();
  
  // Store refresh token
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(sessionId, user.id, refreshToken, expiresAt).run();

  const response: AuthResponse = {
    user: sanitizeUser(user),
    access_token: accessToken,
    refresh_token: refreshToken,
  };

  return jsonResponse(response, 200, env);
}

async function handleRefresh(request: Request, env: Env, jwtSecret: string): Promise<Response> {
  const body = await parseBody<{ refresh_token: string }>(request);
  if (!body || !body.refresh_token) {
    return errorResponse('Missing refresh token', 400, env);
  }

  // Find session
  const session = await env.DB.prepare(`
    SELECT s.*, u.* FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.refresh_token = ? AND s.expires_at > datetime('now')
  `).bind(body.refresh_token).first<Record<string, unknown>>();

  if (!session) {
    return errorResponse('Invalid or expired refresh token', 401, env);
  }

  // Delete old session
  await env.DB.prepare('DELETE FROM sessions WHERE refresh_token = ?').bind(body.refresh_token).run();

  // Create new tokens
  const user: User = {
    id: session.user_id,
    email: session.email,
    password_hash: session.password_hash,
    full_name: session.full_name,
    role: session.role,
    phone: session.phone,
    avatar_url: session.avatar_url,
    approved: session.approved,
    approved_at: session.approved_at,
    approved_by: session.approved_by,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };

  const accessToken = await createJWT({ sub: user.id, email: user.email, role: user.role }, jwtSecret, ACCESS_TOKEN_EXPIRY);
  const refreshToken = generateRefreshToken();
  
  // Store new refresh token
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();
  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(sessionId, user.id, refreshToken, expiresAt).run();

  const response: AuthResponse = {
    user: sanitizeUser(user),
    access_token: accessToken,
    refresh_token: refreshToken,
  };

  return jsonResponse(response, 200, env);
}

async function handleLogout(request: Request, env: Env, jwtSecret: string): Promise<Response> {
  const body = await parseBody<{ refresh_token?: string }>(request);
  
  if (body?.refresh_token) {
    await env.DB.prepare('DELETE FROM sessions WHERE refresh_token = ?').bind(body.refresh_token).run();
  }

  return jsonResponse({ success: true }, 200, env);
}

async function handleGetMe(request: Request, env: Env, jwtSecret: string): Promise<Response> {
  const token = extractToken(request);
  if (!token) {
    return errorResponse('No token provided', 401, env);
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return errorResponse('Invalid token', 401, env);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first<User>();
  if (!user) {
    return errorResponse('User not found', 404, env);
  }

  return jsonResponse(sanitizeUser(user), 200, env);
}

// Helper to verify auth and get current user
async function verifyAuth(request: Request, env: Env, jwtSecret: string): Promise<{ success: boolean; user?: User }> {
  const token = extractToken(request);
  if (!token) {
    return { success: false };
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return { success: false };
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first<User>();
  if (!user) {
    return { success: false };
  }

  return { success: true, user };
}

// ============ USERS HANDLERS ============

async function handleGetUsers(env: Env, currentUser: User): Promise<Response> {
  const results = await env.DB.prepare(`
    SELECT id, email, full_name, role, phone, avatar_url, approved, approved_at, approved_by, created_at, updated_at
    FROM users ORDER BY created_at DESC
  `).all<Omit<User, 'password_hash'>>();

  return jsonResponse(results.results, 200, env);
}

async function handleGetUser(env: Env, id: string, currentUser: User): Promise<Response> {
  const user = await env.DB.prepare(`
    SELECT id, email, full_name, role, phone, avatar_url, approved, approved_at, approved_by, created_at, updated_at
    FROM users WHERE id = ?
  `).bind(id).first<Omit<User, 'password_hash'>>();

  if (!user) {
    return errorResponse('User not found', 404, env);
  }

  return jsonResponse(user, 200, env);
}

async function handleUpdateUser(request: Request, env: Env, id: string, currentUser: User): Promise<Response> {
  const body = await parseBody<Partial<User>>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  // Build update query dynamically
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
  if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
  if (body.avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(body.avatar_url); }
  if (body.role !== undefined && (currentUser.role === 'superuser' || (currentUser.role === 'top_manager' && body.role === 'manager'))) {
    updates.push('role = ?'); values.push(body.role);
  }
  if (body.approved !== undefined) { updates.push('approved = ?'); values.push(body.approved); }
  if (body.approved_at !== undefined) { updates.push('approved_at = ?'); values.push(body.approved_at); }
  if (body.approved_by !== undefined) { updates.push('approved_by = ?'); values.push(body.approved_by); }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const user = await env.DB.prepare(`
    SELECT id, email, full_name, role, phone, avatar_url, approved, approved_at, approved_by, created_at, updated_at
    FROM users WHERE id = ?
  `).bind(id).first<Omit<User, 'password_hash'>>();

  return jsonResponse(user, 200, env);
}

async function handleDeleteUser(env: Env, id: string, currentUser: User): Promise<Response> {
  if (currentUser.role !== 'superuser') {
    return errorResponse('Only superuser can delete users', 403, env);
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ PROPERTIES HANDLERS ============

async function handleGetProperties(url: URL, env: Env, currentUser: User): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort);
  
  const sql = `SELECT * FROM properties ${orderBy}`;
  const results = await env.DB.prepare(sql).all();

  // Parse JSON fields
  const properties = results.results.map((p: any) => ({
    ...p,
    photos: p.photos ? JSON.parse(p.photos) : [],
    documents: p.documents ? JSON.parse(p.documents) : [],
    tags: p.tags ? JSON.parse(p.tags) : [],
    owner_phones: p.owner_phones ? JSON.parse(p.owner_phones) : [],
  }));

  return jsonResponse(properties, 200, env);
}

async function handleCreateProperty(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.title) {
    return errorResponse('Title is required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO properties (
      id, title, description, address, city, district, street, building_number, block, floor, apartment,
      latitude, longitude, operation_type, category, source, status, rooms, area_total, area_living,
      area_kitchen, floors_total, property_condition, heating, bathroom, balcony_type, price, currency,
      price_per_sqm, negotiable, additional_costs, owner_name, owner_phones, owner_email, owner_notes,
      photos, documents, tags, agent_notes, linked_client_id, linked_deal_id, created_by, manager_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, body.title, body.description || null, body.address || null, body.city || 'Кропивницький',
    body.district || null, body.street || null, body.building_number || null, body.block || null,
    body.floor || null, body.apartment || null, body.latitude || null, body.longitude || null,
    body.operation_type || null, body.category || null, body.source || null, body.status || 'active',
    body.rooms || null, body.area_total || null, body.area_living || null, body.area_kitchen || null,
    body.floors_total || null, body.property_condition || null, body.heating || null, body.bathroom || null,
    body.balcony_type || null, body.price || null, body.currency || 'UAH', body.price_per_sqm || null,
    body.negotiable ? 1 : 0, body.additional_costs || null, body.owner_name || null,
    JSON.stringify(body.owner_phones || []), body.owner_email || null, body.owner_notes || null,
    JSON.stringify(body.photos || []), JSON.stringify(body.documents || []), JSON.stringify(body.tags || []),
    body.agent_notes || null, body.linked_client_id || null, body.linked_deal_id || null,
    currentUser.id, body.manager_id || currentUser.id
  ).run();

  const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  return jsonResponse(property, 201, env);
}

async function handleGetProperty(env: Env, id: string): Promise<Response> {
  const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  if (!property) {
    return errorResponse('Property not found', 404, env);
  }

  // Parse JSON fields
  const parsed = {
    ...property,
    photos: (property as Record<string, unknown>).photos ? JSON.parse((property as Record<string, unknown>).photos) : [],
    documents: (property as Record<string, unknown>).documents ? JSON.parse((property as Record<string, unknown>).documents) : [],
    tags: (property as Record<string, unknown>).tags ? JSON.parse((property as Record<string, unknown>).tags) : [],
    owner_phones: (property as Record<string, unknown>).owner_phones ? JSON.parse((property as Record<string, unknown>).owner_phones) : [],
  };

  return jsonResponse(parsed, 200, env);
}

async function handleUpdateProperty(request: Request, env: Env, id: string, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  // Add all updateable fields
  const fields = [
    'title', 'description', 'address', 'city', 'district', 'street', 'building_number', 'block',
    'floor', 'apartment', 'latitude', 'longitude', 'operation_type', 'category', 'source', 'status',
    'rooms', 'area_total', 'area_living', 'area_kitchen', 'floors_total', 'property_condition',
    'heating', 'bathroom', 'balcony_type', 'price', 'currency', 'price_per_sqm', 'additional_costs',
    'owner_name', 'owner_email', 'owner_notes', 'agent_notes', 'linked_client_id', 'linked_deal_id', 'manager_id'
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  // Handle negotiable boolean
  if (body.negotiable !== undefined) {
    updates.push('negotiable = ?');
    values.push(body.negotiable ? 1 : 0);
  }

  // Handle JSON arrays
  if (body.photos !== undefined) {
    updates.push('photos = ?');
    values.push(JSON.stringify(body.photos));
  }
  if (body.documents !== undefined) {
    updates.push('documents = ?');
    values.push(JSON.stringify(body.documents));
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(body.tags));
  }
  if (body.owner_phones !== undefined) {
    updates.push('owner_phones = ?');
    values.push(JSON.stringify(body.owner_phones));
  }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const property = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  return jsonResponse(property, 200, env);
}

async function handleDeleteProperty(env: Env, id: string, currentUser: User): Promise<Response> {
  await env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ CLIENTS HANDLERS ============

async function handleGetClients(url: URL, env: Env): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort);
  
  const results = await env.DB.prepare(`SELECT * FROM clients ${orderBy}`).all();
  
  const clients = results.results.map((c: any) => ({
    ...c,
    tags: c.tags ? JSON.parse(c.tags) : [],
  }));

  return jsonResponse(clients, 200, env);
}

async function handleCreateClient(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.full_name) {
    return errorResponse('Full name is required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO clients (id, full_name, phone, email, segment, age, budget, tags, notes, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, body.full_name, body.phone || null, body.email || null, body.segment || 'buyer',
    body.age || null, body.budget || null, JSON.stringify(body.tags || []), body.notes || null, currentUser.id
  ).run();

  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  return jsonResponse(client, 201, env);
}

async function handleUpdateClient(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
  if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
  if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
  if (body.segment !== undefined) { updates.push('segment = ?'); values.push(body.segment); }
  if (body.age !== undefined) { updates.push('age = ?'); values.push(body.age); }
  if (body.budget !== undefined) { updates.push('budget = ?'); values.push(body.budget); }
  if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes); }
  if (body.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  return jsonResponse(client, 200, env);
}

async function handleDeleteClient(env: Env, id: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ CLIENT INTERACTIONS HANDLERS ============

async function handleGetInteractions(url: URL, env: Env): Promise<Response> {
  const query = parseQuery(url);
  const sql = 'SELECT * FROM client_interactions';
  const values: unknown[] = [];

  if (query.client_id) {
    sql += ' WHERE client_id = ?';
    values.push(query.client_id);
  }

  sql += ' ORDER BY created_at DESC';

  const results = values.length > 0
    ? await env.DB.prepare(sql).bind(...values).all()
    : await env.DB.prepare(sql).all();

  return jsonResponse(results.results, 200, env);
}

async function handleCreateInteraction(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.client_id) {
    return errorResponse('Client ID is required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO client_interactions (id, client_id, user_id, interaction_type, notes, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, body.client_id, currentUser.id, body.interaction_type || null, body.notes || null).run();

  const interaction = await env.DB.prepare('SELECT * FROM client_interactions WHERE id = ?').bind(id).first();
  return jsonResponse(interaction, 201, env);
}

// ============ DEALS HANDLERS ============

async function handleGetDeals(url: URL, env: Env): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort);
  
  const results = await env.DB.prepare(`SELECT * FROM deals ${orderBy}`).all();
  return jsonResponse(results.results, 200, env);
}

async function handleCreateDeal(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.title) {
    return errorResponse('Title is required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO deals (id, title, stage, property_id, client_id, assigned_agent_id, created_by, notes, amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, body.title, body.stage || 'lead', body.property_id || null, body.client_id || null,
    body.assigned_agent_id || null, currentUser.id, body.notes || null, body.amount || null
  ).run();

  const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
  return jsonResponse(deal, 201, env);
}

async function handleUpdateDeal(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.stage !== undefined) { updates.push('stage = ?'); values.push(body.stage); }
  if (body.property_id !== undefined) { updates.push('property_id = ?'); values.push(body.property_id); }
  if (body.client_id !== undefined) { updates.push('client_id = ?'); values.push(body.client_id); }
  if (body.assigned_agent_id !== undefined) { updates.push('assigned_agent_id = ?'); values.push(body.assigned_agent_id); }
  if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes); }
  if (body.amount !== undefined) { updates.push('amount = ?'); values.push(body.amount); }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const deal = await env.DB.prepare('SELECT * FROM deals WHERE id = ?').bind(id).first();
  return jsonResponse(deal, 200, env);
}

async function handleDeleteDeal(env: Env, id: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM deals WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ NOTES HANDLERS ============

async function handleGetNotes(url: URL, env: Env, currentUser: User): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort);
  
  const sql = `SELECT * FROM notes WHERE created_by = ? ${orderBy}`;
  const results = await env.DB.prepare(sql).bind(currentUser.id).all();

  return jsonResponse(results.results, 200, env);
}

async function handleCreateNote(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.title) {
    return errorResponse('Title is required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO notes (id, title, content, priority, done, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(id, body.title, body.content || null, body.priority || 'medium', body.done ? 1 : 0, currentUser.id).run();

  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return jsonResponse(note, 201, env);
}

async function handleUpdateNote(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.content !== undefined) { updates.push('content = ?'); values.push(body.content); }
  if (body.priority !== undefined) { updates.push('priority = ?'); values.push(body.priority); }
  if (body.done !== undefined) { updates.push('done = ?'); values.push(body.done ? 1 : 0); }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return jsonResponse(note, 200, env);
}

async function handleDeleteNote(env: Env, id: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ CALENDAR EVENTS HANDLERS ============

async function handleGetCalendarEvents(url: URL, env: Env, currentUser: User): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort || 'starts_at');
  
  const sql = `SELECT * FROM calendar_events WHERE user_id = ? ${orderBy}`;
  const results = await env.DB.prepare(sql).bind(currentUser.id).all();

  return jsonResponse(results.results, 200, env);
}

async function handleCreateCalendarEvent(request: Request, env: Env, currentUser: User): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body || !body.title || !body.starts_at) {
    return errorResponse('Title and starts_at are required', 400, env);
  }

  const id = generateId();
  
  await env.DB.prepare(`
    INSERT INTO calendar_events (id, title, description, starts_at, ends_at, event_type, status, user_id, property_id, client_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    id, body.title, body.description || null, body.starts_at, body.ends_at || null,
    body.event_type || 'meeting', body.status || 'planned', currentUser.id,
    body.property_id || null, body.client_id || null
  ).run();

  const event = await env.DB.prepare('SELECT * FROM calendar_events WHERE id = ?').bind(id).first();
  return jsonResponse(event, 201, env);
}

async function handleUpdateCalendarEvent(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseBody<any>(request);
  if (!body) {
    return errorResponse('Invalid body', 400, env);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.starts_at !== undefined) { updates.push('starts_at = ?'); values.push(body.starts_at); }
  if (body.ends_at !== undefined) { updates.push('ends_at = ?'); values.push(body.ends_at); }
  if (body.event_type !== undefined) { updates.push('event_type = ?'); values.push(body.event_type); }
  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
  if (body.property_id !== undefined) { updates.push('property_id = ?'); values.push(body.property_id); }
  if (body.client_id !== undefined) { updates.push('client_id = ?'); values.push(body.client_id); }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400, env);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await env.DB.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const event = await env.DB.prepare('SELECT * FROM calendar_events WHERE id = ?').bind(id).first();
  return jsonResponse(event, 200, env);
}

async function handleDeleteCalendarEvent(env: Env, id: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM calendar_events WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ DOCUMENTS HANDLERS ============

async function handleGetDocuments(url: URL, env: Env, currentUser: User): Promise<Response> {
  const query = parseQuery(url);
  const orderBy = buildOrderClause(query.sort);
  
  const results = await env.DB.prepare(`SELECT * FROM user_documents ${orderBy}`).all();
  return jsonResponse(results.results, 200, env);
}

async function handleUploadDocument(request: Request, env: Env, currentUser: User): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string || 'fop';

    if (!file || !title) {
      return errorResponse('File and title are required', 400, env);
    }

    const id = generateId();
    const fileKey = `documents/${currentUser.id}/${id}_${file.name}`;

    // Upload to R2
    await env.R2.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Save to database
    await env.DB.prepare(`
      INSERT INTO user_documents (id, user_id, title, category, file_url, file_name, file_size, mime_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, currentUser.id, title, category, fileKey, file.name, file.size, file.type).run();

    const document = await env.DB.prepare('SELECT * FROM user_documents WHERE id = ?').bind(id).first();
    return jsonResponse(document, 201, env);
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload file', 500, env);
  }
}

async function handleDeleteDocument(env: Env, id: string, currentUser: User): Promise<Response> {
  const doc = await env.DB.prepare('SELECT * FROM user_documents WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!doc) {
    return errorResponse('Document not found', 404, env);
  }

  // Delete from R2
  try {
    await env.R2.delete(doc.file_url);
  } catch (error) {
    console.error('R2 delete error:', error);
  }

  // Delete from database
  await env.DB.prepare('DELETE FROM user_documents WHERE id = ?').bind(id).run();
  return jsonResponse({ success: true }, 200, env);
}

// ============ FILES HANDLERS (R2) ============

async function handleGetFile(env: Env, key: string, currentUser: User): Promise<Response> {
  const object = await env.R2.get(key);
  if (!object) {
    return errorResponse('File not found', 404, env);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'private, max-age=3600');

  return new Response(object.body, {
    headers,
  });
}

async function handleFileUpload(request: Request, env: Env, currentUser: User): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return errorResponse('File is required', 400, env);
    }

    const id = generateId();
    const fileKey = `${folder}/${currentUser.id}/${id}_${file.name}`;

    // Upload to R2
    await env.R2.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return jsonResponse({
      key: fileKey,
      name: file.name,
      size: file.size,
      type: file.type,
    }, 201, env);
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload file', 500, env);
  }
}
