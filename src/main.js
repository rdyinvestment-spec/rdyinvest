import './style.css';
import { auth } from './supabase';
import { store, state, calcStartingBalance, CALC, monthCALC } from './store';
import { renderPage, initChartDefaults } from './ui';
import { today, fR, fDate } from './utils';
import Chart from 'chart.js/auto';

// Navigation Manager
window.showPage = async (page, event) => {
  if (event) event.preventDefault();
  
  // Prevent redundant render if already on the same page
  if (window.currentPage === page && page !== 'reports') {
    return;
  }
  window.currentPage = page;

  // Always reset reports to current month on fresh navigation
  if (page === 'reports' && window.pgState) {
    window.pgState.repTab = 'custom';
    window.pgState.repM = new Date().getMonth();
    window.pgState.repY = new Date().getFullYear();
  }
  
  // Admin Data Loading
  if (page === 'admin') {
    try {
      await loadAdminData();
    } catch (e) {
      toast('Acesso restrito ao Administrador', 'err');
      return showPage('dashboard');
    }
  }

  renderPage(page);
  
  document.querySelectorAll('.nav-i').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
};

/* ─── Modals & Toasts ────────────────── */
window.openMo = (id) => document.getElementById(id)?.classList.add('open');
window.closeMo = (id) => {
  document.querySelectorAll('.mo').forEach(m => m.classList.remove('open'));
};

window.toast = (msg, type = 'ok') => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
};

/* ─── Daily Operations ───────────────── */
window.onFab = () => openDailyModal(today(), null, true);

window.openDailyModal = (dateStr = today(), existing = null, forceBlank = false) => {
  const day = forceBlank ? null : (existing || state.days.find(d => d.date === dateStr));
  
  document.getElementById('df-date').value = dateStr;
  document.getElementById('df-pts').value = day ? day.points : '';
  document.getElementById('df-contracts').value = day ? day.contracts_used : state.config.monthly_default || 1;
  document.getElementById('df-pl-val').value = day ? day.profit_loss.toFixed(2) : '';
  document.getElementById('df-setup').value = day ? day.setup : '';
  
  // Toggles
  setTog('tog-plan', day ? day.followed_plan : true);
  setTog('tog-over', day ? day.overtrade : false);
  setTog('tog-rev', day ? day.revenge_trading : false);
  
  // Balance
  const startBal = day ? day.starting_balance : calcStartingBalance(dateStr);
  document.getElementById('df-st').value = startBal.toFixed(2);
  
  // Delete Button & Record ID
  document.getElementById('df-del-wrap').style.display = day ? 'block' : 'none';
  window.currentDayId = day ? day.id : null;
  
  openMo('mo-day');
  
  // Set initial mode
  if (day) {
    toggleFormEdit(false);
  } else {
    toggleFormEdit(true);
  }
  
  // Update percentage
  setTimeout(() => {
    const pVal = Number(document.getElementById('df-pl-val').value) || 0;
    const sBal = Number(document.getElementById('df-st').value) || 1;
    const pct = (pVal / sBal) * 100;
    const pctEl = document.getElementById('df-pl-pct');
    if (pctEl) pctEl.innerText = pVal !== 0 ? `(${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : '';
    
    // Trade volume sync
    const w = Number(day?.wins || 0);
    const l = Number(day?.losses || 0);
    document.getElementById('df-wins-op').value = w;
    document.getElementById('df-losses-op').value = l;
    document.getElementById('df-total-op').value = w + l;
  }, 50);
};

window.toggleFormEdit = (editable) => {
  const modal = document.getElementById('mo-day');
  const inputs = modal.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    if (el.id !== 'df-st' && el.id !== 'df-total-op' && el.id !== 'df-date') { 
      // Keep some fields always locked if they are calculated or fixed
      el.disabled = !editable;
    }
  });

  // Toggles need a special class to look/behave disabled
  const toggles = modal.querySelectorAll('.tog');
  toggles.forEach(tog => {
    tog.style.pointerEvents = editable ? 'auto' : 'none';
    tog.style.opacity = editable ? '1' : '0.6';
  });

  // Buttons visibility
  document.getElementById('btn-save-day').style.display = editable ? 'block' : 'none';
  document.getElementById('btn-edit-day').style.display = editable ? 'none' : 'block';
};

window.enableEdit = () => toggleFormEdit(true);

function setTog(id, val) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!val);
}
window.toggleTog = (id) => document.getElementById(id)?.classList.toggle('on');



window.saveDaily = async () => {
  const pts = Number(document.getElementById('df-pts').value);
  const contracts = Number(document.getElementById('df-contracts').value);
  const pl = Number(document.getElementById('df-pl-val').value) || 0;

  const entry = {
    date: document.getElementById('df-date').value,
    starting_balance: Number(document.getElementById('df-st').value),
    points: pts,
    profit_loss: pl,
    contracts_used: contracts,
    wins: Number(document.getElementById('df-wins-op').value) || 0,
    losses: Number(document.getElementById('df-losses-op').value) || 0,
    setup: document.getElementById('df-setup').value,
    followed_plan: document.getElementById('tog-plan').classList.contains('on'),
    overtrade: document.getElementById('tog-over').classList.contains('on'),
    revenge_trading: document.getElementById('tog-rev').classList.contains('on')
  };

  if (window.currentDayId) {
    entry.id = window.currentDayId;
  }
  
  const { error } = await store.saveDay(entry);
  if (error) toast('Erro ao salvar: ' + error.message, 'err');
  else {
    toast('Dia registrado com sucesso!');
    closeMo('mo-day');
    initApp();
  }
};

window.deleteDay = async () => {
  if (!window.currentDayId || !confirm('Excluir este dia permanentemente?')) return;
  const { error } = await store.deleteDay(window.currentDayId);
  if (error) toast('Erro ao excluir', 'err');
  else { toast('Dia removido'); closeMo(); showPage('calendar'); }
};

/* ─── Wallet Operations ──────────────── */
window.openDepMo = () => { document.getElementById('dep-date').value = today(); openMo('mo-dep'); };
window.saveDeposit = async () => {
  const dep = {
    date: document.getElementById('dep-date').value,
    amount: Number(document.getElementById('dep-amt').value),
    description: document.getElementById('dep-desc').value
  };
   const { error } = await store.saveDeposit(dep);
  if (!error) { 
    toast('Aporte realizado'); 
    closeMo(); 
    initApp();
  }
};
window.delDeposit = async (id) => {
  if (confirm('Excluir este aporte?')) {
    await store.deleteDeposit(id);
    await initApp();
  }
};

window.openWdMo = () => { document.getElementById('wd-date').value = today(); openMo('mo-wd'); };
window.saveWithdrawal = async () => {
  const wd = {
    date: document.getElementById('wd-date').value,
    amount: Number(document.getElementById('wd-amt').value),
    description: document.getElementById('wd-desc').value
  };
   const { error } = await store.saveWithdrawal(wd);
  if (!error) { 
    toast('Resgate realizado'); 
    closeMo(); 
    initApp();
  }
};
window.delWithdrawal = async (id) => {
  if (confirm('Excluir este resgate?')) {
    await store.deleteWithdrawal(id);
    await initApp();
  }
};

window.openMovModal = () => openMo('mo-mov');

window.editMov = (type, id) => {
  if (type === 'DEP') {
    const d = state.deposits.find(x => x.id === id);
    if (!d) return;
    document.getElementById('dep-date').value = d.date;
    document.getElementById('dep-amt').value = d.amount;
    document.getElementById('dep-desc').value = d.description || '';
    openMo('mo-dep');
  } else {
    const w = state.withdrawals.find(x => x.id === id);
    if (!w) return;
    document.getElementById('wd-date').value = w.date;
    document.getElementById('wd-amt').value = w.amount;
    document.getElementById('wd-desc').value = w.description || '';
    openMo('mo-wd');
  }
};

/* ─── Settings ───────────────────────── */
window.openSettingsMo = () => {
  const cfg = state.config || {};
  document.getElementById('cfg-name').value = state.profile?.name || '';
  document.getElementById('cfg-card-name').value = state.profile?.card_name || '';
  document.getElementById('cfg-cap').value = cfg.starting_capital || 0;
  document.getElementById('cfg-goal').value = cfg.monthly_goal || 0;
  document.getElementById('cfg-rule').value = cfg.contract_rule_value || 500;
  document.getElementById('cfg-point-val').value = cfg.point_value || 0.20;
  document.getElementById('cfg-tax-rate').value = cfg.tax_rate || 1.0;

  // Operational Days Logic
  const btns = document.querySelectorAll('.day-btn');
  const opDays = cfg.operation_days || [1, 2, 3, 4, 5];
  btns.forEach(btn => {
    const d = parseInt(btn.dataset.day);
    btn.classList.toggle('active', opDays.includes(d));
    btn.onclick = () => btn.classList.toggle('active');
  });

  updateSettingsPreview();
  openMo('mo-settings');
};

/**
 * Live Card Preview in Settings
 */
window.updateSettingsPreview = () => {
  const cardName = document.getElementById('cfg-card-name')?.value || 'MEMBRO ELITE';
  const previewDiv = document.getElementById('settings-card-preview');
  if (!previewDiv) return;

  previewDiv.innerHTML = `
    <div style="width: 100%; min-height: 200px; background: linear-gradient(135deg, #1d1d1d, #000); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; position: relative; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; padding: 20px">
      <div style="width: 100%; height: 180px; position: relative">
        <div style="position: absolute; top: 20px; left: 20px; font-size: 22px; font-weight: 900; color: #FFD100; letter-spacing: -1px">RDY</div>
        <div style="position: absolute; bottom: 20px; left: 20px; font-size: 13px; font-weight: 700; color: #FFF; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px">${cardName}</div>
        <div style="position: absolute; top: 20px; right: 20px; width: 44px; height: 30px; background: rgba(255,255,255,0.08); border-radius: 4px; display: flex; align-items: center; justify-content: center">
          <div style="width: 22px; height: 14px; background: #FFD100; border-radius: 2px; opacity: 0.9"></div>
        </div>
        <div style="position: absolute; inset: 0; background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%); pointer-events: none"></div>
        <div style="position: absolute; bottom: 20px; right: 20px; font-size: 8px; font-weight: 800; color: var(--xp); opacity: 0.5; letter-spacing: 2px">INVESTMENT PERFORMANCE</div>
      </div>
    </div>
  `;
};

window.saveSettings = async () => {
  const name = document.getElementById('cfg-name').value;
  const cardName = document.getElementById('cfg-card-name').value;
  
  // Robust numeric parsing (handles commas from Brazilian keyboards)
  const parseNum = (id) => {
    const val = document.getElementById(id).value.replace(',', '.');
    return Number(val) || 0;
  };

  const cfg = {
    starting_capital: parseNum('cfg-cap'),
    monthly_goal: parseNum('cfg-goal'),
    contract_rule_value: parseNum('cfg-rule'),
    point_value: parseNum('cfg-point-val'),
    tax_rate: parseNum('cfg-tax-rate'),
    operation_days: Array.from(document.querySelectorAll('.day-btn.active')).map(b => parseInt(b.dataset.day))
  };
  
  const [res1, res2] = await Promise.all([
    store.saveProfile({ name, card_name: cardName }),
    store.saveConfig(cfg)
  ]);
  
  if (!res1.error && !res2.error) { 
    toast('Configurações salvas'); 
    closeMo(); 
    showPage('dashboard'); 
  } else {
    const errMsg = (res1.error?.message || res1.error) || (res2.error?.message || res2.error) || 'Erro desconhecido';
    toast('Erro: ' + errMsg, 'err');
    console.error('Save Profiles Error:', res1.error);
    console.error('Save Config Error:', res2.error);
  }
};

window.resetEverything = async () => {
  if (!confirm('🚨 ATENÇÃO: Você está prestes a apagar TODO o seu histórico operacional, incluindo trades, aportes e saques. Esta ação não pode ser desfeita.\n\nTem certeza absoluta que deseja zerar tudo?')) return;
  
  toast('Zerando ecossistema...', 'wait');
  const { success, error } = await store.resetAllData();
  
  if (success) {
    toast('Histórico zerado com sucesso!');
    closeMo();
    showPage('dashboard');
  } else {
    toast('Erro ao zerar dados: ' + (error.message || error), 'err');
  }
};

window.openPasswordMo = () => {
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  openMo('mo-password');
};

window.saveNewPassword = async () => {
  const pass = document.getElementById('pw-new').value;
  const conf = document.getElementById('pw-confirm').value;

  if (!pass || pass.length < 6) {
    return toast('A senha deve ter pelo menos 6 caracteres', 'err');
  }
  if (pass !== conf) {
    return toast('As senhas não coincidem', 'err');
  }

  toast('Atualizando senha...', 'wait');
  const { error } = await auth.updatePassword(pass);

  if (error) {
    toast('Erro: ' + error.message, 'err');
  } else {
    toast('Senha atualizada com sucesso!');
    closeMo();
  }
};

/* ─── Calculators ────────────────────── */
window.calcProj = () => {
  const cap = Number(document.getElementById('p-cap').value);
  const step = Number(document.getElementById('p-step').value);
  const pts = Number(document.getElementById('p-pts').value);
  const months = Number(document.getElementById('p-months').value);
  
  let currentCap = cap;
  const labels = ['Início'];
  const data = [cap];
  
  let resHtml = `<table class="f-table"><thead><tr><th>Mês</th><th>Contratos</th><th>Ganhos</th><th>Banca</th></tr></thead><tbody>`;
  
  const pValue = Number(state.config?.point_value || 0.2);
  const tRate = Number(state.config?.tax_rate || 1) / 100;

  for (let m = 1; m <= months; m++) {
    const contracts = Math.max(1, Math.floor(currentCap / step));
    const grossMonthly = contracts * pts * pValue * 20; 
    const brokerage = contracts * 0.5 * 20 * 2; // Estimativa (2 trades/dia)
    const ir = grossMonthly > 0 ? grossMonthly * tRate : 0;
    const monthlyGain = grossMonthly - brokerage - ir;
    currentCap += monthlyGain;
    
    labels.push(`${m}º Mês`);
    data.push(currentCap);
    
    resHtml += `<tr><td>${m}º</td><td>${contracts}</td><td>${fR(monthlyGain)}</td><td>${fR(currentCap)}</td></tr>`;
  }
  resHtml += `</tbody></table>`;
  
  // Create / Update Chart
  const resultDiv = document.getElementById('proj-result');
  resultDiv.innerHTML = `
    <div class="card" style="height:320px; padding:24px; margin-bottom:24px; border:1px solid var(--xp-glow)">
      <div class="shdr-t" style="margin-bottom:16px">Curva de Crescimento Estimada</div>
      <div style="height:220px; width:100%"><canvas id="ch-proj-growth"></canvas></div>
    </div>
    ${resHtml}
  `;

  if (window.activeCharts.proj) window.activeCharts.proj.destroy();
  
  const ctx = document.getElementById('ch-proj-growth').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255, 209, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 209, 0, 0)');

  window.activeCharts.proj = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Patrimônio',
        data: data,
        borderColor: '#FFD100',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#FFD100',
        fill: true,
        backgroundColor: gradient,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { ticks: { callback: (v) => 'R$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) } }
      }
    }
  });
};

window.calcJuros = () => {
  const cap = Number(document.getElementById('j-cap').value);
  const dep = Number(document.getElementById('j-dep').value);
  const rate = Number(document.getElementById('j-rate').value) / 100;
  const months = Number(document.getElementById('j-months').value);
  
  let current = cap;
  const labels = ['Início'];
  const data = [cap];

  for(let i=1; i<=months; i++) {
    current = (current + dep) * (1 + rate);
    labels.push(`${i}º Mês`);
    data.push(current);
  }

  document.getElementById('juros-result').innerHTML = `
    <div class="card" style="height:320px; padding:24px; margin-bottom:24px; border:1px solid var(--xp-glow)">
      <div class="shdr-t" style="margin-bottom:16px">Crescimento Patrimonial</div>
      <div style="height:220px; width:100%"><canvas id="ch-juros-growth"></canvas></div>
    </div>
    <div class="card" style="padding:20px; text-align:center; border: 1px solid var(--xp)">
      <div style="font-size:12px; color:var(--text3); margin-bottom:8px">Montante Final</div>
      <div class="mono" style="font-size:32px; font-weight:900; color:var(--xp)">${fR(current)}</div>
    </div>
  `;

  if (window.activeCharts.juros) window.activeCharts.juros.destroy();
  const ctx = document.getElementById('ch-juros-growth').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(41, 121, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(41, 121, 255, 0)');

  window.activeCharts.juros = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Patrimônio',
        data: data,
        borderColor: '#2979FF',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#2979FF',
        fill: true,
        backgroundColor: gradient,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { ticks: { callback: (v) => 'R$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) } }
      }
    }
  });
};

window.setDashFilter = (f) => {
  window.pgState.dashFilter = f;
  // Initialize date range when switching to custom
  if (f === 'custom' && !window.pgState.customFrom) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    window.pgState.customFrom = firstOfMonth;
    window.pgState.customTo = now.toISOString().slice(0, 10);
  }
  renderPage('dashboard');
  window.scrollTo(0, 0);
};

window.applyCustomRange = () => {
  const from = document.getElementById('dash-from')?.value;
  const to = document.getElementById('dash-to')?.value;
  if (from) window.pgState.customFrom = from;
  if (to) window.pgState.customTo = to;
  renderPage('dashboard');
  window.scrollTo(0, 0);
};

window.changeRepMonth = (diff) => {
  let m = window.pgState.repM + diff;
  let y = window.pgState.repY;
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  window.pgState.repM = m;
  window.pgState.repY = y;
  renderPage('reports');
  window.scrollTo(0, 0);
};

window.calNav = (dir) => {
  window.pgState.calM += dir;
  if (window.pgState.calM > 11) { window.pgState.calM = 0; window.pgState.calY++; }
  else if (window.pgState.calM < 0) { window.pgState.calM = 11; window.pgState.calY--; }
  renderPage('calendar');
  window.scrollTo(0, 0);
};

window.calClick = (date) => openDailyModal(date);

window.setRepTab = (t) => {
  window.pgState.repTab = t;
  renderPage('reports');
  window.scrollTo(0, 0);
};

window.setRepRange = (type, val) => {
  if (type === 'start') window.pgState.repStart = val;
  if (type === 'end') window.pgState.repEnd = val;
  renderPage('reports');
  window.scrollTo(0, 0);
};

/* ─── Auth & Init ────────────────────── */
async function initApp() {
  try {
    initChartDefaults();
    
    // Auto-fill remembered email
    const remembered = localStorage.getItem('rdy_remembered_email');
    if (remembered) {
      const el = document.getElementById('tf-login-email');
      const rem = document.getElementById('tf-login-rem');
      if (el) el.value = remembered;
      if (rem) rem.checked = true;
    }

    // Show login immediately if we know it takes time
    // Attempt to get user (with a small retry if we just signed up)
    let user = await auth.getUser().catch(() => null);
    
    // Retry once after 500ms if no user found but we think they just signed up
    if (!user && window.isNewSignup) {
      await new Promise(r => setTimeout(r, 800));
      user = await auth.getUser().catch(() => null);
    }

    if (!user) {
      document.getElementById('screen-login').style.display = 'flex';
      document.getElementById('screen-app').style.display = 'none';
      initAuthFlow();
    } else {
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'block';
      
      try {
        await store.loadAll();
        
        // Show Admin Nav if applicable
        if (state.profile?.is_admin) {
          const admNav = document.getElementById('nav-admin');
          if (admNav) admNav.style.display = 'flex';
        }

        window.showPage('dashboard');
        
        // Auto-open settings if new signup
        if (window.isNewSignup) {
          setTimeout(() => {
            window.openMo('mo-settings');
            toast('Bem-vindo! Configure seu capital inicial.', 'pos');
            window.isNewSignup = false; // Reset
          }, 600);
        }
      } catch (loadErr) {
        alert('❌ Falha ao carregar seus dados: ' + loadErr.message);
        console.error(loadErr);
      }
    }
  } catch (err) {
    console.error('CRITICAL INIT FAILURE:', err);
    // Force show login as fallback so user isn't stuck
    document.getElementById('screen-login').style.display = 'flex';
    document.getElementById('screen-app').style.display = 'none';
    initAuthFlow();
  }
}

function initAuthFlow() {
  document.getElementById('btn-do-login').onclick = async () => {
    const email = document.getElementById('tf-login-email').value;
    const pass = document.getElementById('tf-login-pass').value;
    const isRem = document.getElementById('tf-login-rem').checked;

    if (!email || !pass) return toast('Preencha todos os campos', 'err');

    const { error } = await auth.signIn(email, pass);
    if (error) {
      if (error.message.includes('confirm')) {
        alert('⚠️ ATENÇÃO: Verifique seu e-mail para confirmar o cadastro antes de logar.');
      } else {
        alert('❌ Erro: ' + error.message);
      }
    } else {
      if (isRem) localStorage.setItem('rdy_remembered_email', email);
      else localStorage.removeItem('rdy_remembered_email');
      initApp(); // Smooth transition without splash
    }
  };
  document.getElementById('btn-do-register').onclick = async () => {
    const name = document.getElementById('tf-reg-name').value;
    const email = document.getElementById('tf-reg-email').value;
    const pass = document.getElementById('tf-reg-pass').value;

    const { data, error } = await auth.signUp(email, pass, { full_name: name });
    
    if (error) {
      if (error.message.includes('already registered')) {
        alert('⚠️ Este e-mail já está cadastrado. Tente fazer o login ou mude o e-mail.');
      } else {
        alert('❌ Erro no cadastro: ' + error.message);
      }
      return;
    }

    // Success check
    if (data.user) {
      if (!data.session) {
        // Account exists but no session = Email Confirmation likely active
        alert('✅ Conta criada! Verifique sua caixa de entrada para confirmar seu e-mail e ativar seu acesso.');
        location.reload(); // Refresh to login page
      } else {
        toast('Conta criada com sucesso!', 'pos');
        window.isNewSignup = true; 
        initApp(); 
      }
    }
  };
}

window.logout = async () => {
  await auth.signOut();
  initApp(); // Back to login without splash
};

window.emergencyReset = () => {
  if (confirm('Reset de emergência: limpa cache local e recarrega o app. Use apenas se estiver com problemas de acesso. Continuar?')) {
    localStorage.clear();
    location.reload();
  }
};

/* ─── Real-time Calc ─────────────────── */
function initDailyCalc() {
  const pts = document.getElementById('df-pts');
  const contracts = document.getElementById('df-contracts');
  const val = document.getElementById('df-pl-val');

  const sync = (source) => {
    const pVal = Number(state.config?.point_value || 0.2);
    const c = Number(contracts.value) || 0;
    
    // Allow typing '-' without immediate sync to 0
    const rawPts = pts.value;
    const rawVal = val.value;
    if (rawPts === '-' || rawVal === '-') return;

    const p = Number(rawPts) || 0;
    const v = Number(rawVal) || 0;

    if (source === 'pts' || source === 'contracts') {
      if (c > 0) val.value = (p * c * pVal).toFixed(2);
    } else if (source === 'val') {
      if (c > 0 && pVal > 0) pts.value = Math.round(v / (c * pVal));
    }

    // Calc Pct
    const sBal = Number(document.getElementById('df-st').value) || 1;
    const currentVal = Number(val.value) || 0;
    const pct = (currentVal / sBal) * 100;
    const pctEl = document.getElementById('df-pl-pct');
    if (pctEl) {
      pctEl.innerText = currentVal !== 0 ? `(${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : '';
      pctEl.style.color = currentVal > 0 ? '#4ADE80' : (currentVal < 0 ? '#F87171' : 'inherit');
    }
  };

  const syncOps = () => {
    const w = Number(document.getElementById('df-wins-op').value) || 0;
    const l = Number(document.getElementById('df-losses-op').value) || 0;
    document.getElementById('df-total-op').value = w + l;
  };

  pts.oninput = () => sync('pts');
  contracts.oninput = () => sync('contracts');
  val.oninput = () => sync('val');
  document.getElementById('df-wins-op').oninput = syncOps;
  document.getElementById('df-losses-op').oninput = syncOps;
}


/* ─── Impersonation Support ──────────── */
window.startImpersonation = async (userId) => {
  try {
    toast('Carregando visão do trader...', 'info');
    await store.loadAll(userId);
    window.showPage('dashboard');
    toast('Modo Visualização Ativo', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao carregar usuário', 'err');
  }
};

window.stopImpersonation = async () => {
  try {
    toast('Retornando ao Painel Admin...', 'info');
    await store.loadAll();
    window.showPage('admin');
    toast('Visão restaurada', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao restaurar visão', 'err');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initDailyCalc();
});
