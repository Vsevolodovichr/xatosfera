import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    // Create client with user's auth token
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { reportId, secretKey } = await req.json()

    if (!reportId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Missing reportId or secretKey' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for fetching profile secret key (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the report belongs to the user
    const { data: report, error: reportError } = await adminClient
      .from('reports')
      .select('id, user_id, period_start, period_end, signature')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (report.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (report.signature) {
      return new Response(JSON.stringify({ error: 'Report already signed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch user's secret key from profiles (server-side only)
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('secret_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate secret key server-side
    if (secretKey !== profile.secret_key) {
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate signature server-side
    const signatureData = `${report.id}-${report.period_start}-${report.period_end}-${secretKey}`
    const encoder = new TextEncoder()
    const data = encoder.encode(signatureData)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Update report with signature
    const { error: updateError } = await adminClient
      .from('reports')
      .update({
        signature: signature.substring(0, 64),
        signed_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to sign report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
