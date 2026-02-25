// Re-export Cloudflare client as pb for backward compatibility
// This file replaces the old Supabase-based client

import { cloudflareApi } from '../cloudflare/client';

export { cloudflareApi as default } from '../cloudflare/client';
export type { User, AuthResponse } from '../cloudflare/client';
