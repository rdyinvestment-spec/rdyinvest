import './style.css';
import { auth } from './supabase';
import { store, state, calcStartingBalance, CALC, monthCALC } from './store';
import { renderPage, initChartDefaults } from './ui';
import { today, fR, fDate } from './utils';
import Chart from 'chart.js/auto';

// Navigation Manager
window.showPage = (page) => {
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
window.onFab = () => openDailyModal();

window.openDailyModal = (dateStr = today(), existing = null) => {
  const day = existing || state.days.find(d => d.date === dateStr);
  
  document.getElementById('df-date').value = dateStr;
  document.getElementById('df-pts').value = day ? day.points : '';
  document.getElementById('df-trades').value = day ? day.trades_count : '';
  document.getElementById('df-contracts').value = day ? day.contracts_used : state.config.monthly_default || 1;
  document.getElementById('df-wins').value = day ? day.wins : '';
  document.getElementById('df-losses').value = day ? day.losses : '';
  document.getElementById('df-setup').value = day ? day.setup : '';
  document.getElementById('df-notes').value = day ? day.notes : '';
  
  // Toggles
  setTog('tog-plan', day ? day.followed_plan : true);
  setTog('tog-over', day ? day.overtrade : false);
  setTog('tog-rev', day ? day.revenge_trading : false);
  
  // Balance
  const startBal = day ? day.starting_balance : calcStartingBalance(dateStr);
  document.getElementById('df-st').value = startBal.toFixed(2);
  
  // Emotional Stars
  window.starVal = day ? day.emotional_rating : 5;
  renderStars(window.starVal);
  
  // Delete Button
  document.getElementById('df-del-wrap').style.display = day ? 'block' : 'none';
  window.currentDayId = day ? day.id : null;
  
  openMo('mo-daily');
};

function setTog(id, val) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!val);
}
window.toggleTog = (id) => document.getElementById(id)?.classList.toggle('on');

function renderStars(val) {
  document.querySelectorAll('.star').forEach((s, i) => {
    s.classList.toggle('on', i < val);
  });
}
window.setStar = (v) => { window.starVal = v; renderStars(v); };

window.saveDaily = async () => {
  const pts = Number(document.getElementById('df-pts').value);
  const contracts = Number(document.getElementById('df-contracts').value);
  const plValue = pts * contracts * 0.2; // Exemplo: Mini Índice R$ 0,20 por ponto/contrato
  
  const entry = {
    id: window.currentDayId,
    date: document.getElementById('df-date').value,
    points: pts,
    profit_loss: plValue,
    starting_balance: Number(document.getElementById('df-st').value),
    ending_balance: Number(document.getElementById('df-st').value) + plValue,
    trades_count: Number(document.getElementById('df-trades').value),
    contracts_used: contracts,
    wins: Number(document.getElementById('df-wins').value),
    losses: Number(document.getElementById('df-losses').value),
    setup: document.getElementById('df-setup').value,
    notes: document.getElementById('df-notes').value,
    followed_plan: document.getElementById('tog-plan').classList.contains('on'),
    overtrade: document.getElementById('tog-over').classList.contains('on'),
    revenge_trading: document.getElementById('tog-rev').classList.contains('on'),
    emotional_rating: window.starVal
  };
  
  const { error } = await store.saveDay(entry);
  if (error) toast('Erro ao salvar: ' + error.message, 'err');
  else {
    toast('Dia registrado com sucesso!');
    closeMo();
    showPage('calendar');
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
  if (!error) { toast('Aporte realizado'); closeMo(); showPage('settings'); }
};
window.delDeposit = async (id) => {
  if (confirm('Excluir este aporte?')) {
    await store.deleteDeposit(id);
    showPage('settings');
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
  if (!error) { toast('Resgate realizado'); closeMo(); showPage('settings'); }
};
window.delWithdrawal = async (id) => {
  if (confirm('Excluir este resgate?')) {
    await store.deleteWithdrawal(id);
    showPage('settings');
  }
};

/* ─── Settings ───────────────────────── */
window.openSettingsMo = () => {
  const cfg = state.config || {};
  document.getElementById('cfg-name').value = state.profile?.full_name || '';
  document.getElementById('cfg-cap').value = cfg.starting_capital || 0;
  document.getElementById('cfg-goal').value = cfg.monthly_goal || 0;
  document.getElementById('cfg-rule').value = cfg.contract_rule_value || 500;
  openMo('mo-settings');
};

window.saveSettings = async () => {
  const name = document.getElementById('cfg-name').value;
  const cfg = {
    starting_capital: Number(document.getElementById('cfg-cap').value),
    monthly_goal: Number(document.getElementById('cfg-goal').value),
    contract_rule_value: Number(document.getElementById('cfg-rule').value)
  };
  
  const [res1, res2] = await Promise.all([
    store.saveProfile({ full_name: name }),
    store.saveConfig(cfg)
  ]);
  
  if (!res1.error && !res2.error) { 
    toast('Configurações salvas'); 
    closeMo(); 
    showPage('settings'); 
  } else {
    toast('Erro ao salvar algumas configurações', 'err');
  }
};

/* ─── Navigation & Tabs ──────────────── */
window.calNav = (dir) => {
  window.pgState.calM += dir;
  if (window.pgState.calM > 11) { window.pgState.calM = 0; window.pgState.calY++; }
  else if (window.pgState.calM < 0) { window.pgState.calM = 11; window.pgState.calY--; }
  showPage('calendar');
};

window.calClick = (date) => openDailyModal(date);

window.setRepTab = (tab) => { window.pgState.repTab = tab; showPage('reports'); };

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
  
  for (let m = 1; m <= months; m++) {
    const contracts = Math.max(1, Math.floor(currentCap / step));
    const monthlyGain = contracts * pts * 0.2 * 20; // 20 dias úteis
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

/* ─── Filter Logic ───────────────────── */
window.setDashFilter = (f) => {
  window.pgState.dashFilter = f;
  renderPage('dashboard');
};

window.changeRepMonth = (diff) => {
  let m = window.pgState.repM + diff;
  let y = window.pgState.repY;
  if (m > 11) { m = 0; y++; }
  if (m < 0) { m = 11; y--; }
  window.pgState.repM = m;
  window.pgState.repY = y;
  renderPage('reports');
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

window.emergencyReset = async () => {
  const email = prompt('Confirme o e-mail para o reset:', 'rodrigodaty@rdy.com');
  if (!email) return;
  
  toast('Verificando ecossistema...', 'wait');
  const { data, error } = await auth.signIn(email, '12345678');
  
  if (!error) {
    toast('Login já funciona com 12345678!', 'pos');
    setTimeout(() => location.reload(), 1500);
  } else {
    alert('⚠️ O reset manual via painel Supabase ainda é necessário se a senha for desconhecida. \n\nAcesse: Auth > Users > Edit User > Change Password');
  }
};

document.addEventListener('DOMContentLoaded', initApp);
