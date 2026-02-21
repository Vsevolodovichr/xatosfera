import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?bundle'

// Allowed origins for CORS - restrict to production and preview URLs
const allowedOrigins = [
  'https://vsevolodovichr.github.io/xatosfera/',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create a client using the service role key but pass through the
    // user's auth token so we can determine who is making the request.
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Identify requesting user
    const {
      data: { user: requestingUser },
      error: userError,
    } = await supabaseClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, fullName, role } = await req.json()

    // Basic validation
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing email, password, fullName or role' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Use plain admin client for database modifications
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // fetch the role of the requester to enforce permissions
    const { data: requesterRoleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (roleError || !requesterRoleData) {
      return new Response(JSON.stringify({ error: 'Unable to determine requester role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requesterRole = requesterRoleData.role as string

    // only top managers and superusers are allowed to create users
    if (!['top_manager', 'superuser'].includes(requesterRole)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // role the new account will have
    const allowedCreateRoles = ['manager', 'top_manager']
    if (!allowedCreateRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // only superuser may create another top_manager
    if (role === 'top_manager' && requesterRole !== 'superuser') {
      return new Response(JSON.stringify({ error: 'Insufficient privileges to create top manager' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // create the auth user using the service key
    const { data: createData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: fullName },
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: createUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = createData.user?.id || (createData as any).id

    // insert profile record (approved defaults to null/false)
    const { error: profileInsertError } = await adminClient
      .from('profiles')
      .insert({ id: newUserId, full_name: fullName })

    if (profileInsertError) {
      return new Response(JSON.stringify({ error: 'Failed to create profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // insert role
    const { error: roleInsertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUserId, role })

    if (roleInsertError) {
      return new Response(JSON.stringify({ error: 'Failed to assign role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const corsHeaders = getCorsHeaders(req)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
