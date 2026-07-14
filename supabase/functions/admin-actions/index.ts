import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Cabeçalho de autorização ausente')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    
    if (authErr) {
      console.error('Auth Error:', authErr)
      throw new Error(`Auth Error: ${authErr.message}`)
    }
    if (!user) throw new Error('Usuário não encontrado via token')

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profErr) {
      console.error('Profile Fetch Error:', profErr)
      throw new Error('Erro ao verificar perfil administrativo')
    }

    if (!profile?.is_admin) throw new Error('Acesso restrito ao Administrador')

    // 2. Routing
    const body = await req.json()
    const { action, payload } = body

    console.log(`Action: ${action} for User: ${user.id}`)

    if (action === 'CREATE_USER') {
      const { email, password, name } = payload
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      })

      if (createErr) throw createErr

      // Note: Column in profiles table is 'active', not 'is_active'
      await supabaseAdmin.from('profiles').upsert({ id: newUser.user.id, name, active: true })
      await supabaseAdmin.from('user_configs').upsert({ user_id: newUser.user.id, contract_rule_value: 500 })

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'RESET_PASSWORD') {
      const { userId, password } = payload
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      })
      if (resetErr) throw resetErr
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'TOGGLE_STATUS') {
      const { userId, status } = payload
      // Note: Column in profiles table is 'active', not 'is_active'
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ active: status })
        .eq('id', userId)

      if (updateErr) throw updateErr
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'DELETE_USER') {
      const { userId } = payload
      
      console.log(`Deleting user data for: ${userId}`)
      // Delete all user related data in order
      await supabaseAdmin.from('trades').delete().eq('user_id', userId)
      await supabaseAdmin.from('trading_days').delete().eq('user_id', userId)
      await supabaseAdmin.from('deposits').delete().eq('user_id', userId)
      await supabaseAdmin.from('withdrawals').delete().eq('user_id', userId)
      await supabaseAdmin.from('user_configs').delete().eq('user_id', userId)
      await supabaseAdmin.from('profiles').delete().eq('id', userId)

      // Finally delete from Auth
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteErr) throw deleteErr

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Ação inválida')

  } catch (error) {
    console.error('Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
