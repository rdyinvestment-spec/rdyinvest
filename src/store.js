import { supabase } from './supabase';
import { today } from './utils';

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

export function calcStartingBalance(date) {
  const cfg = state.config || {};
  const startCap = Number(cfg.starting_capital || 0);
  const depsAte = state.deposits.filter(d => d.date < date).reduce((a, d) => a + Number(d.amount), 0);
  const wdsAte = state.withdrawals.filter(d => d.date < date).reduce((a, d) => a + Number(d.amount), 0);
  const plAte = [...state.days].sort((a, b) => a.date.localeCompare(b.date)).filter(d => d.date < date).reduce((a, d) => {
    const cfg_d = state.config || {};
    const tRate = (cfg_d.tax_rate || 1) / 100;
    const contracts = Number(d.contracts_used || 1);
    const grossPL = Number(d.profit_loss || 0);
    return a + (grossPL - contracts * 0.5 - (grossPL > 0 ? grossPL * tRate : 0));
  }, 0);
  return startCap + depsAte - wdsAte + plAte;
}

export function CALC() {
  const cfg = state.config || {};
  const startCap = Number(cfg.starting_capital || 0);

  let totalPL = 0, totalBro = 0, totalIR = 0;
  let grossWins = 0, grossLosses = 0, planCount = 0;

  const tRate = (cfg.tax_rate || 1) / 100;
  state.days.forEach(day => {
    const contracts = Number(day.contracts_used || 1);
    const grossPL = Number(day.profit_loss || 0);
    const brokerage = contracts * 0.5;
    const ir = grossPL > 0 ? grossPL * tRate : 0;
    totalPL += grossPL - brokerage - ir;
    totalBro += brokerage;
    totalIR += ir;
    if (grossPL > 0) grossWins += grossPL;
    else if (grossPL < 0) grossLosses += Math.abs(grossPL);
    if (day.followed_plan) planCount++;
  });

  const depSum = state.deposits.reduce((a, b) => a + Number(b.amount), 0);
  const wdSum = state.withdrawals.reduce((a, b) => a + Number(b.amount), 0);
  const balance = startCap + depSum - wdSum + totalPL;

  const allDays = state.days.length;
  const wins = state.days.filter(d => Number(d.profit_loss) > 0).length;
  const wr = allDays ? (wins / allDays) * 100 : 0;
  const pf = grossLosses ? grossWins / grossLosses : (grossWins > 0 ? 999 : 0);
  const planPct = allDays ? (planCount / allDays) * 100 : 0;
  const ruleVal = Number(cfg.contract_rule_value || 400);
  const contracts = Math.max(1, Math.floor(balance / ruleVal));

  // Equity curve
  const sortedDays = [...state.days].sort((a, b) => a.date.localeCompare(b.date));
  let runBal = startCap;
  // Add initial deposits before first day
  const equity = sortedDays.map(d => {
    const dayDeps = state.deposits.filter(dep => dep.date === d.date).reduce((a, dep) => a + Number(dep.amount), 0);
    const dayWds = state.withdrawals.filter(wd => wd.date === d.date).reduce((a, wd) => a + Number(wd.amount), 0);
    const contracts_d = Number(d.contracts_used || 1);
    const grossPL_d = Number(d.profit_loss || 0);
    const brokerage_d = contracts_d * 0.5;
    const tRate_d = (cfg.tax_rate || 1) / 100;
    const ir_d = grossPL_d > 0 ? grossPL_d * tRate_d : 0;
    runBal += dayDeps - dayWds + (grossPL_d - brokerage_d - ir_d);
    return { x: d.date, y: runBal };
  });

  const now = new Date();
  const monthlyPLs = Array(12).fill(0).map((_, i) => monthCALC(now.getFullYear(), i).pl);
  const mPL = monthCALC(now.getFullYear(), now.getMonth()).pl;
  const gMonthly = Number(cfg.monthly_goal || 0);

  return {
    balance, startCap, totalPL, totalBro, totalIR,
    depSum, wdSum, wr, contracts, cfg,
    equity, monthlyPLs, mPL, gMonthly, pf, planPct
  };
}

export function monthCALC(year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const mDays = state.days.filter(d => d.date.startsWith(key));
  const mDeps = state.deposits.filter(d => d.date.startsWith(key));
  const mWds = state.withdrawals.filter(d => d.date.startsWith(key));

  let pl = 0, totalBro = 0, totalIR = 0;
  let wins = 0, losses = 0, grossWins = 0, grossLosses = 0;

  mDays.forEach(d => {
    const contracts = Number(d.contracts_used || 1);
    const grossPL = Number(d.profit_loss || 0);
    const brokerage = contracts * 0.5;
    const tRate = (state.config?.tax_rate || 1) / 100;
    const ir = grossPL > 0 ? grossPL * tRate : 0;
    pl += grossPL - brokerage - ir;
    totalBro += brokerage;
    totalIR += ir;
    if (grossPL > 0) { wins++; grossWins += grossPL; }
    else if (grossPL < 0) { losses++; grossLosses += Math.abs(grossPL); }
  });

  const dep = mDeps.reduce((a, b) => a + Number(b.amount), 0);
  const wd = mWds.reduce((a, b) => a + Number(b.amount), 0);
  const wr = (wins + losses) ? (wins / (wins + losses)) * 100 : 0;
  const avgDay = mDays.length ? pl / mDays.length : 0;
  const pf = grossLosses ? grossWins / grossLosses : (grossWins > 0 ? 999 : 0);

  return {
    pl, totalBro, totalIR, wins, losses,
    posD: wins, negD: losses,
    wr, dep, wd, days: mDays,
    avgDay, trades: mDays.length, pf
  };
}

export const store = {
  async loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    state.user = user;

    const [
      resP, resC, resD, resT, resDep, resW
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_configs').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('trading_days').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('trades').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('deposits').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('withdrawals').select('*').eq('user_id', user.id).order('date', { ascending: true })
    ]);

    if (resP.error) console.error('Error Profile:', resP.error);
    if (resC.error) console.error('Error Config:', resC.error);
    if (resD.error) console.error('Error Days:', resD.error);
    if (resT.error) console.error('Error Trades:', resT.error);
    if (resDep.error) console.error('Error Deposits:', resDep.error);
    if (resW.error) console.error('Error Withdrawals:', resW.error);

    const profile = resP.data;
    const config = resC.data;
    const days = resD.data;
    const trades = resT.data;
    const deposits = resDep.data;
    const withdrawals = resW.data;

    // Auto-Init missing profile
    if (!profile) {
      const { data: nProf, error: niPErr } = await supabase.from('profiles').upsert({ 
        id: user.id, 
        name: user.user_metadata?.full_name || 'Trader Elite' 
      }).select().single();
      
      if (niPErr) {
        alert('Erro ao criar perfil: ' + niPErr.message);
        throw niPErr;
      }
      state.profile = nProf;
    } else {
      state.profile = profile;
    }

    // Auto-Init missing config
    if (!config) {
      const { data: nConf, error: niCErr } = await supabase.from('user_configs').upsert({ 
        user_id: user.id,
        starting_capital: 0,
        monthly_goal: 0,
        contract_rule_value: 500
      }).select().single();

      if (niCErr) {
        alert('Erro ao criar config: ' + niCErr.message);
        throw niCErr;
      }
      state.config = nConf;
    } else {
      state.config = config;
    }

    state.days = days || [];
    state.trades = trades || [];
    state.deposits = deposits || [];
    state.withdrawals = withdrawals || [];
    state.initialized = true;
  },

  async saveDay(dayEntry) {
    const user = state.user;
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase.from('trading_days').upsert({ ...dayEntry, user_id: user.id }).select();
    if (!error) {
      const idx = state.days.findIndex(d => d.date === dayEntry.date);
      if (idx >= 0) state.days[idx] = data[0];
      else { state.days.push(data[0]); state.days.sort((a, b) => a.date.localeCompare(b.date)); }
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
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase.from('trades').upsert({ ...trade, user_id: user.id }).select();
    if (!error) {
      const idx = state.trades.findIndex(t => t.id === trade.id);
      if (idx >= 0) state.trades[idx] = data[0];
      else state.trades.push(data[0]);
    }
    return { data, error };
  },

  async deleteTrade(id) {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) state.trades = state.trades.filter(t => t.id !== id);
    return { error };
  },

  async saveDeposit(dep) {
    const user = state.user;
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase.from('deposits').upsert({ ...dep, user_id: user.id }).select();
    if (!error) {
      const idx = state.deposits.findIndex(d => d.id === dep.id);
      if (idx >= 0) state.deposits[idx] = data[0];
      else { state.deposits.push(data[0]); state.deposits.sort((a, b) => a.date.localeCompare(b.date)); }
    }
    return { data, error };
  },

  async deleteDeposit(id) {
    const { error } = await supabase.from('deposits').delete().eq('id', id);
    if (!error) state.deposits = state.deposits.filter(d => d.id !== id);
    return { error };
  },

  async saveWithdrawal(wd) {
    const user = state.user;
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase.from('withdrawals').upsert({ ...wd, user_id: user.id }).select();
    if (!error) {
      const idx = state.withdrawals.findIndex(w => w.id === wd.id);
      if (idx >= 0) state.withdrawals[idx] = data[0];
      else { state.withdrawals.push(data[0]); state.withdrawals.sort((a, b) => a.date.localeCompare(b.date)); }
    }
    return { data, error };
  },

  async deleteWithdrawal(id) {
    const { error } = await supabase.from('withdrawals').delete().eq('id', id);
    if (!error) state.withdrawals = state.withdrawals.filter(w => w.id !== id);
    return { error };
  },

  async saveConfig(cfg) {
    const user = state.user;
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase
      .from('user_configs')
      .upsert({ ...cfg, user_id: user.id }, { onConflict: 'user_id' })
      .select();
    if (!error) state.config = data[0];
    return { data, error };
  },
  
  async resetAllData() {
    const user = state.user;
    if (!user) return { error: 'No user' };
    
    // Clear all operational tables
    const tables = ['trading_days', 'trades', 'deposits', 'withdrawals'];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id);
      if (error) return { error };
    }

    // Reset config to defaults
    const { error: cfgErr } = await supabase.from('user_configs').update({
      starting_capital: 0,
      monthly_goal: 0,
      contract_rule_value: 500,
      point_value: 0.20,
      tax_rate: 1.0
    }).eq('user_id', user.id);

    if (cfgErr) return { error: cfgErr };

    // Refresh local state
    state.days = [];
    state.trades = [];
    state.deposits = [];
    state.withdrawals = [];
    state.config = {
      starting_capital: 0,
      monthly_goal: 0,
      contract_rule_value: 500,
      point_value: 0.20,
      tax_rate: 1.0
    };

    return { success: true };
  },

  async saveProfile(pData) {
    const user = state.user;
    if (!user) return { error: 'No user' };
    const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...pData }).select();
    if (!error) state.profile = data[0];
    return { data, error };
  }
};
