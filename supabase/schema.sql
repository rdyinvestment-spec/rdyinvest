-- ============================================================
-- RDY Investment — Supabase Schema
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ─────────────────────────────────────────
-- 1. PROFILES (espelho de auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cria/atualiza profile automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────
-- 2. USER_CONFIGS (configurações do trader)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_configs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starting_capital     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  contract_rule_value  NUMERIC(14, 2) NOT NULL DEFAULT 400,
  default_asset        TEXT DEFAULT 'WIN',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);


-- ─────────────────────────────────────────
-- 3. TRADING_DAYS (diário de operações — 1 registro por dia)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trading_days (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  starting_balance  NUMERIC(14, 2),
  ending_balance    NUMERIC(14, 2),
  profit_loss       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  profit_loss_pct   NUMERIC(8, 4),
  points_result     NUMERIC(10, 2),
  trades_count      INTEGER DEFAULT 0,
  contracts_used    INTEGER DEFAULT 1,
  wins              INTEGER DEFAULT 0,
  losses            INTEGER DEFAULT 0,
  setup_used        TEXT,
  notes             TEXT,
  followed_plan     BOOLEAN DEFAULT FALSE,
  overtrading       BOOLEAN DEFAULT FALSE,
  revenge_trade     BOOLEAN DEFAULT FALSE,
  outside_setup     BOOLEAN DEFAULT FALSE,
  emotional_score   SMALLINT DEFAULT 3 CHECK (emotional_score BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);


-- ─────────────────────────────────────────
-- 4. TRADES (operações individuais)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  time           TIME,
  asset          TEXT NOT NULL,
  side           TEXT NOT NULL CHECK (side IN ('compra', 'venda')),
  entry_price    NUMERIC(12, 2) DEFAULT 0,
  exit_price     NUMERIC(12, 2) DEFAULT 0,
  stop_points    NUMERIC(10, 2) DEFAULT 0,
  points_result  NUMERIC(10, 2),
  contracts      INTEGER DEFAULT 1,
  result_brl     NUMERIC(14, 2) DEFAULT 0,
  setup          TEXT,
  why            TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- 5. DEPOSITS (aportes)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT 'Aporte',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- 6. WITHDRAWALS (retiradas)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  description TEXT DEFAULT 'Retirada',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trading_days_user_date ON public.trading_days(user_id, date);
CREATE INDEX IF NOT EXISTS idx_trades_user_date       ON public.trades(user_id, date);
CREATE INDEX IF NOT EXISTS idx_deposits_user          ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user       ON public.withdrawals(user_id);


-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_days  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals   ENABLE ROW LEVEL SECURITY;


-- profiles
CREATE POLICY "profiles: own data only" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- user_configs
CREATE POLICY "user_configs: own data only" ON public.user_configs
  FOR ALL USING (auth.uid() = user_id);

-- trading_days
CREATE POLICY "trading_days: own data only" ON public.trading_days
  FOR ALL USING (auth.uid() = user_id);

-- trades
CREATE POLICY "trades: own data only" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

-- deposits
CREATE POLICY "deposits: own data only" ON public.deposits
  FOR ALL USING (auth.uid() = user_id);

-- withdrawals
CREATE POLICY "withdrawals: own data only" ON public.withdrawals
  FOR ALL USING (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- updated_at automático (trigger genérico)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_user_configs
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_trading_days
  BEFORE UPDATE ON public.trading_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
