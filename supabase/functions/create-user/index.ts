import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the calling user's token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extract token from header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user's token using admin client
    const { data: { user: callingUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !callingUser) {
      console.error('User verification failed:', userError?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Calling user:', callingUser.id, callingUser.email)

    // Check if calling user has permission to create users
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .maybeSingle()

    if (roleError) {
      console.error('Role fetch error:', roleError.message)
    }

    console.log('User role:', roleData?.role)

    if (!roleData || (roleData.role !== 'superuser' && roleData.role !== 'top_manager')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { email, password, fullName, role } = body
    
    console.log('Creating user with email:', email, 'role:', role)

    // Validate required fields
    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Only superusers can create top_managers
    if (role === 'top_manager' && roleData.role !== 'superuser') {
      return new Response(JSON.stringify({ error: 'Only superusers can create top managers' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user with admin API (doesn't affect current session)
    // The handle_new_user trigger will create profile and role automatically
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: { full_name: fullName }
    })

    if (createError) {
      console.error('Create user error:', createError.message, createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User created:', newUser.user?.id)

    // Update role if not manager (manager is default from trigger)
    if (role && role !== 'manager' && newUser.user) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUser.user.id)
      
      if (roleUpdateError) {
        console.error('Role update error:', roleUpdateError.message)
      }
    }

    // Auto-approve the user (trigger sets approved=false for non-first users)
    if (newUser.user) {
      const { error: approveError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          approved: true, 
          approved_at: new Date().toISOString(),
          approved_by: callingUser.id 
        })
        .eq('id', newUser.user.id)
      
      if (approveError) {
        console.error('Approve error:', approveError.message)
      }
    }

    console.log('User setup complete')

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUser.user?.id, email: newUser.user?.email } 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
