// CORS and response utilities

import type { Env } from './types';

export function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(data: unknown, status: number = 200, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env),
    },
  });
}

export function errorResponse(message: string, status: number = 400, env: Env): Response {
  return jsonResponse({ error: message }, status, env);
}

export function handleOptions(env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env),
  });
}

// Parse JSON body safely
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

// Extract bearer token from Authorization header
export function extractToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// Parse query parameters
export function parseQuery(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Build WHERE clause from filters
export function buildWhereClause(filters: Record<string, unknown>): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

// Build ORDER BY clause
export function buildOrderClause(sort?: string): string {
  if (!sort) return 'ORDER BY created_at DESC';
  
  const isDesc = sort.startsWith('-');
  const column = sort.replace(/^-/, '');
  const direction = isDesc ? 'DESC' : 'ASC';
  
  // Whitelist allowed columns to prevent SQL injection
  const allowedColumns = ['created_at', 'updated_at', 'title', 'full_name', 'email', 'price', 'status', 'stage'];
  if (!allowedColumns.includes(column)) {
    return 'ORDER BY created_at DESC';
  }
  
  return `ORDER BY ${column} ${direction}`;
}

// Generate signed URL for R2 object (simplified - R2 doesn't have native signed URLs in Workers)
// Instead, we'll use a proxy approach through the Worker
export function getR2Url(bucket: string, key: string, workerUrl: string): string {
  return `${workerUrl}/api/files/${encodeURIComponent(key)}`;
}
