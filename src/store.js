import { supabase } from './supabase';
import { today, uid, fPct, fR, cv } from './utils';

// State proxy (Reactive-ish)
export const state = {
  user: null,
  profile: null,
  config: {},
  days: [],
  trades: [],
  deposits: [],
  withdrawals: [],
  initialized: false
};

/**
 * Financial Engine (Core Logic)
 */
export function CALC() {
  const cfg = state.config || {};
  const startCap = Number(cfg.starting_capital || 0);
  
  // Totals from trades/days
  let totalPL = 0;
  let totalBro = 0;
  let totalIR = 0;
  
  // Calculate from daily records (source of truth for results)
  state.days.forEach(day => {
    const contracts = Number(day.contracts_used || 1);
    const grossPL = Number(day.profit_loss || 0);
    
    // Automatic Deductions: R$ 0.50 per contract + 1% IRPF on gross gain
    const brokerage = contracts * 0.50;
    const ir = grossPL > 0 ? (grossPL * 0.01) : 0;
    
    totalPL += (grossPL - brokerage - ir);
    totalBro += brokerage;
    totalIR += ir;
  });

  const depSum = state.deposits.reduce((a, b) => a + Number(b.amount), 0);
  const wdSum = state.withdrawals.reduce((a, b) => a + Number(b.amount), 0);
  
  const balance = startCap + depSum - wdSum + totalPL;
  
  // Win Rate
  const allDays = state.days.length;
  const wins = state.days.filter(d => d.profit_loss > 0).length;
  const wr = allDays ? (wins / allDays) * 100 : 0;

  // Contracts Rule (Banca / Risk)
  const ruleVal = Number(cfg.contract_rule_value || 400);
  const contracts = Math.max(1, Math.floor(balance / ruleVal));

  return {
    balance,
    startCap,
    totalPL,
    totalBro,
    totalIR,
    depSum,
    wdSum,
    wr,
    contracts,
    cfg
  };
}

export function monthCALC(year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const mDays = state.days.filter(d => d.date.startsWith(key));
  const mDeps = state.deposits.filter(d => d.date.startsWith(key));
  const mWds = state.withdrawals.filter(d => d.date.startsWith(key));

  let pl = 0;
  let totalBro = 0;
  let totalIR = 0;
  let wins = 0;
  let losses = 0;

  mDays.forEach(d => {
    const contracts = Number(d.contracts_used || 1);
    const grossPL = Number(d.profit_loss || 0);
    const brokerage = contracts * 0.50;
    const ir = grossPL > 0 ? (grossPL * 0.01) : 0;
    
    pl += (grossPL - brokerage - ir);
    totalBro += brokerage;
    totalIR += ir;
    
    if (grossPL > 0) wins++;
    else if (grossPL < 0) losses++;
  });

  const dep = mDeps.reduce((a, b) => a + Number(b.amount), 0);
  const wd = mWds.reduce((a, b) => a + Number(b.amount), 0);
  const wr = (wins + losses) ? (wins / (wins + losses)) * 100 : 0;

  return {
    pl,
    totalBro,
    totalIR,
    wins,
    losses,
    wr,
    dep,
    wd,
    days: mDays
  };
}

/**
 * Data Management (Supabase)
 */
export const store = {
  async loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    state.user = user;
    
    const [
      { data: profile },
      { data: config },
      { data: days },
      { data: trades },
      { data: deposits },
      { data: withdrawals }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_configs').select('*').eq('user_id', user.id).single(),
      supabase.from('trading_days').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('deposits').select('*').eq('user_id', user.id),
      supabase.from('withdrawals').select('*').eq('user_id', user.id)
    ]);

    state.profile = profile;
    state.config = config || {};
    state.days = days || [];
    state.trades = trades || [];
    state.deposits = deposits || [];
    state.withdrawals = withdrawals || [];
    state.initialized = true;
  },

  async saveDay(dayEntry) {
    const user = state.user;
    if (!user) return;

    const { data, error } = await supabase
      .from('trading_days')
      .upsert({ ...dayEntry, user_id: user.id })
      .select();

    if (!error) {
      // Update local state
      const idx = state.days.findIndex(d => d.date === dayEntry.date);
      if (idx >= 0) state.days[idx] = data[0];
      else {
        state.days.push(data[0]);
        state.days.sort((a,b) => a.date.localeCompare(b.date));
      }
    }
    return { data, error };
  },

  async deleteDay(id) {
    const { error } = await supabase.from('trading_days').delete().eq('id', id);
    if (!error) state.days = state.days.filter(d => d.id !== id);
    return { error };
  },

  async saveTrade(trade) {
    const user = state.user;
    if (!user) return;
    const { data, error } = await supabase.from('trades').upsert({ ...trade, user_id: user.id }).select();
    if (!error) {
      const idx = state.trades.findIndex(t => t.id === trade.id);
      if (idx >= 0) state.trades[idx] = data[0];
      else state.trades.push(data[0]);
    }
    return { data, error };
  },

  async saveConfig(cfg) {
    const user = state.user;
    if (!user) return;
    const { data, error } = await supabase.from('user_configs').upsert({ ...cfg, user_id: user.id }).select();
    if (!error) state.config = data[0];
    return { data, error };
  }
};
