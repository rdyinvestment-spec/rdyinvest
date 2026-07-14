-- ============================================================
-- FIX: infinite recursion in policy for relation "profiles"
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 0. Garante que a coluna is_admin existe e está configurada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
UPDATE public.profiles SET is_admin = TRUE WHERE role = 'admin';

-- 1. Função helper que checa is_admin SEM reacionar RLS
--    (SECURITY DEFINER + dono = postgres, que tem BYPASSRLS)
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = uid),
    false
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- 2. Remove TODAS as policies atuais de profiles (evita duplicar/deixar a recursiva)
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- 3. Recria policies limpas (sem recursão)

-- Dono do perfil: acesso total ao próprio registro
create policy "profiles: own data only" on public.profiles
  for all using (auth.uid() = id);

-- Admin: pode LER todos os perfis (usa a função, não subquery direta)
create policy "profiles: admins can view all" on public.profiles
  for select using (public.is_admin());
