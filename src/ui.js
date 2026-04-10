import { state, CALC, monthCALC } from './store';
import { fR, fPct, cv, MS, MN, today, getDailyVerse } from './utils';
import Chart from 'chart.js/auto';

/**
 * Main Rendering Router
 */
export function renderPage(page, options = {}) {
  const container = document.getElementById('page-content');
  if (!container) return;

    // Global Page State (For filters/tabs)
  if(!window.pgState) {
    window.pgState = {
      dashFilter: 'total',
      repTab: 'monthly',
      repM: new Date().getMonth(),
      repY: new Date().getFullYear(),
      calM: new Date().getMonth(),
      calY: new Date().getFullYear()
    };
  }

  if (window.activeCharts) {
    Object.values(window.activeCharts).forEach(c => c.destroy());
  }
  window.activeCharts = {};

  container.classList.remove('page-transition-enter');
  void container.offsetWidth;
  container.classList.add('page-transition-enter');

  switch (page) {
    case 'dashboard':
      container.innerHTML = pgDashboard();
      mountDashboardCharts();
      break;
    case 'calendar':
      container.innerHTML = pgCalendar();
      mountCalendarCharts();
      break;
    case 'reports':
      container.innerHTML = pgReports();
      mountReportsCharts();
      break;
    case 'settings':
      container.innerHTML = pgSettings();
      break;
    default:
      container.innerHTML = `<div style="padding:24px"><div class="card">Página em construção</div></div>`;
  }
}

/* ─── Dashboard ─────────────────────────── */
function pgDashboard() {
  const c = CALC();
  const isPos = c.totalPL >= 0;
  const name = state.profile?.full_name?.split(' ')[0] || 'Trader';
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
    <!-- XP Hero Section -->
    <div style="background: radial-gradient(circle at 70% 50%, rgba(255,209,0,0.05) 0%, transparent 60%); padding: 60px 24px 40px; border-bottom: 1px solid var(--border)">
      <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center">
        
        <!-- Left Column: Content -->
        <div style="max-width: 600px">
          <div style="font-size: 14px; font-weight: 700; color: var(--xp); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px">RDY ELITE EXPERIENCE</div>
          <h1 style="font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.1; letter-spacing: -2px; margin-bottom: 24px">RDY Investment <span style="color: var(--text3)">Legacy</span></h1>
          <p id="daily-verse" style="font-size: 16px; color: var(--text2); margin-bottom: 32px; max-width: 520px; font-style: italic; border-left: 3px solid var(--xp); padding-left: 16px; line-height: 1.6">${getDailyVerse()}</p>
          
          <div style="display: flex; gap: 12px; flex-wrap: wrap">
            <button class="btn btn-xp" onclick="showPage('calendar')">Começar a Operar</button>
            <button class="btn btn-ghost" onclick="showPage('reports')">Ver Insights</button>
          </div>
        </div>

        <!-- Right Column: Card Visual (Simulated) -->
        <div style="display: none" class="desktop-hero-visual">
          <div style="width: 400px; height: 240px; background: linear-gradient(135deg, #111, #000); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; position: relative; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.8)">
            <div style="position: absolute; top: 32px; left: 32px; font-size: 24px; font-weight: 900; color: #FFD100; letter-spacing: -1px">RDY</div>
            <div style="position: absolute; bottom: 32px; left: 32px; font-size: 14px; font-weight: 700; color: #FFF; opacity: 0.6">ELITE MEMBER</div>
            <div style="position: absolute; top: 32px; right: 32px; width: 48px; height: 32px; background: rgba(255,255,255,0.05); border-radius: 4px; display: flex; align-items: center; justify-content: center">
              <div style="width: 24px; height: 16px; background: #FFD100; border-radius: 2px; opacity: 0.8"></div>
            </div>
            <div style="position: absolute; inset: 0; background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%); pointer-events: none"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 24px">
      
      <div style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end">
        <div>
          <div style="font-size: 12px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px">${dateStr}</div>
          <h2 style="font-size: 24px; font-weight: 800; letter-spacing: -1px">Resumo do <span style="color: var(--xp)">Dashboard</span></h2>
        </div>
        <div class="tabs" style="margin-bottom:0">
          ${['today', 'week', 'month', 'total'].map(f => `
            <div class="tab ${window.pgState.dashFilter === f ? 'on' : ''}" onclick="setDashFilter('${f}')">
              ${f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Geral'}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bento-grid" style="padding: 0; gap: 24px">

        <!-- Patrimônio Card -->
        <div class="card card-xl">
          <div class="shdr">
            <span class="shdr-t">Patrimônio Líquido</span>
            <span style="font-size: 10px; font-weight: 800; color: var(--text3)">CONTA REAL BRL</span>
          </div>
          <div style="margin: 32px 0">
            <div class="mono" style="font-size: 64px; font-weight: 900; letter-spacing: -4px; color: ${isPos ? 'var(--green)' : 'var(--red)'}">${fR(c.balance)}</div>
            <div style="display: flex; gap: 12px; margin-top: 16px">
              <span class="badge ${isPos ? 'badge-pos' : 'badge-neg'}" style="border-radius: 4px; padding: 4px 10px; font-size: 11px">Win Rate: ${fPct(c.wr)}</span>
              <span style="font-size: 14px; font-weight: 700; color: var(--text3)">${fR(c.totalPL)} P&L Líquido</span>
            </div>
          </div>
        </div>

        <!-- Taxas & Custos -->
        <div class="card">
          <div class="shdr"><span class="shdr-t">Custos Operacionais</span></div>
          <div style="margin-top: 12px">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <span style="font-size: 12px; color: var(--text3); font-weight: 600">Corretagem (Contratos)</span>
              <span class="mono" style="color: var(--red); font-size: 16px">-${fR(c.totalBro)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <span style="font-size: 12px; color: var(--text3); font-weight: 600">IRPF Provisório (1%)</span>
              <span class="mono" style="color: var(--red); font-size: 16px">-${fR(c.totalIR)}</span>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between">
              <span style="font-size: 11px; color: var(--text2); font-weight: 800; text-transform: uppercase">Total Deduções</span>
              <span class="mono" style="color: var(--red); font-size: 16px">-${fR(c.totalBro + c.totalIR)}</span>
            </div>
          </div>
        </div>

        <!-- Curva de Capital -->
        <div class="card card-lg">
          <div class="shdr">
            <span class="shdr-t">Curva de Capital</span>
            <div class="badge badge-pos" style="border-radius:4px">+${fPct(calcGrowth(state.days))}</div>
          </div>
          <div style="height: 220px; width: 100%; margin-top: 16px"><canvas id="ch-equity"></canvas></div>
        </div>

        <!-- Aportes/Saques Slim Cards -->
        <div class="card" style="padding: 24px; border-left: 4px solid var(--xp)">
          <div style="font-size: 11px; font-weight: 800; color: var(--text3); text-transform: uppercase; margin-bottom: 12px">Total Aportado</div>
          <div class="mono" style="font-size: 28px; font-weight: 800; color: var(--xp)">${fR(c.depSum)}</div>
          <div style="font-size: 12px; color: var(--text3); margin-top: 8px">Fundos em conta</div>
        </div>

        <div class="card" style="padding: 24px; border-left: 4px solid var(--text3)">
          <div style="font-size: 11px; font-weight: 800; color: var(--text3); text-transform: uppercase; margin-bottom: 12px">Total Sacado</div>
          <div class="mono" style="font-size: 28px; font-weight: 800; color: var(--text2)">${fR(c.wdSum)}</div>
          <div style="font-size: 12px; color: var(--text3); margin-top: 8px">Retiradas efetuadas</div>
        </div>

      </div>
    </div>
  `;
}

function calcGrowth(days) {
  if (!days || days.length < 2) return 0;
  const start = days[0].ending_balance || 1;
  const end = days[days.length - 1].ending_balance;
  return ((end - start) / start) * 100;
}

/* ─── Chart.js Global Initialization ─── */
export function initChartDefaults() {
  Chart.defaults.color = '#808080';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.font.weight = '800';
  
  // Standardize tooltips to XP style (Carbon/Supernova)
  Chart.defaults.plugins.tooltip.backgroundColor = '#000000';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 209, 0, 0.4)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: 'bold' };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 14, weight: '800' };
  Chart.defaults.plugins.tooltip.displayColors = false;

  // Standardize scales (v4 syntax)
  Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.03)';
  Chart.defaults.scale.ticks.color = '#606060';
}

/* ─── Charts ─────────────────────────── */
function mountDashboardCharts() {
  initChartDefaults();
  const ctxEq = document.getElementById('ch-equity')?.getContext('2d');
  if (ctxEq) {
    const gradient = ctxEq.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 209, 0, 0)');

    window.activeCharts.equity = new Chart(ctxEq, {
      type: 'line',
      data: {
        labels: state.days.map(d => fDate(d.date)),
        datasets: [{
          data: state.days.map(d => d.ending_balance),
          borderColor: '#FFD100',
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#FFD100',
          pointHoverBorderColor: '#000',
          pointHoverBorderWidth: 2,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
          y: { ticks: { callback: (v) => 'R$' + (v / 1000).toFixed(0) + 'k', maxTicksLimit: 4 } }
        }
      }
    });
  }
}

/* ─── Placeholder Pages ──────────────── */
/* ─── Calendar Page ──────────────────── */
function pgCalendar() {
  const now = new Date();
  if (!window.pgState.calY) window.pgState.calY = now.getFullYear();
  if (!window.pgState.calM && window.pgState.calM !== 0) window.pgState.calM = now.getMonth();

  const year = window.pgState.calY;
  const month = window.pgState.calM;
  const mc = monthCALC(year, month);
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  
  let html = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 24px">
      
      <!-- Calendar Header -->
      <div class="cal-hdr" style="margin-bottom: 32px">
        <div>
          <div style="font-size: 12px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px">${year}</div>
          <h2 style="font-size: 28px; font-weight: 900; letter-spacing: -1.5px">${MN[month]}</h2>
        </div>
        <div style="display: flex; gap: 8px">
          <button class="cal-nb" onclick="calNav(-1)">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="cal-nb" onclick="calNav(1)">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 24px" class="grid-layout">
        
        <!-- Grid Section -->
        <div>
          <div class="cal-wds">
            ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => `<div class="cal-wd">${d}</div>`).join('')}
          </div>
          <div class="cal-grid">`;

  // Empty days before
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cd empty"></div>`;
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = state.days.find(x => x.date === dStr);
    const isToday = dStr === today();
    const type = entry ? (entry.profit_loss > 0 ? 'pos' : (entry.profit_loss < 0 ? 'neg' : 'neu')) : '';
    
    html += `
      <div class="cd ${type} ${isToday ? 'tod' : ''}" onclick="calClick('${dStr}')">
        <span class="cd-n">${d}</span>
        ${entry ? `<span class="cd-v">${fR(entry.profit_loss)}</span>` : ''}
        ${isToday ? `<div class="cd-dot"></div>` : ''}
      </div>
    `;
  }

  html += `
          </div>
        </div>

        <!-- Stats Sidebar -->
        <div style="display: flex; flex-direction: column; gap: 16px">
          <div class="card" style="padding: 24px">
            <div class="shdr-t" style="margin-bottom: 20px">Performance Mensal</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
              <div>
                <div class="st-lb">P&L Líquido</div>
                <div class="mono ${cv(mc.pl)}" style="font-size: 20px; font-weight: 800">${fR(mc.pl)}</div>
              </div>
              <div>
                <div class="st-lb">Win Rate</div>
                <div class="mono" style="font-size: 20px; font-weight: 800; color: var(--xp)">${fPct(mc.wr)}</div>
              </div>
              <div>
                <div class="st-lb">Dias Positivos</div>
                <div class="mono pos" style="font-size: 16px; font-weight: 700">${mc.posD}</div>
              </div>
              <div>
                <div class="st-lb">Dias Negativos</div>
                <div class="mono neg" style="font-size: 16px; font-weight: 700">${mc.negD}</div>
              </div>
            </div>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border)">
               <div class="st-lb">Média Diária</div>
               <div class="mono" style="font-size: 16px; font-weight: 700">${fR(mc.avgDay)}</div>
            </div>
          </div>
          
          <div class="card" style="padding: 24px; min-height: 200px">
            <div class="shdr-t" style="margin-bottom: 16px">Evolução no Mês</div>
            <div style="height: 160px; width: 100%"><canvas id="ch-cal-equity"></canvas></div>
          </div>
        </div>

      </div>
    </div>
  `;
  return html;
}

function mountCalendarCharts() {
  const year = window.pgState.calY;
  const month = window.pgState.calM;
  const mc = monthCALC(year, month);
  
  const ctx = document.getElementById('ch-cal-equity')?.getContext('2d');
  if (ctx) {
    let run = 0;
    const data = mc.days.map(d => {
      run += Number(d.profit_loss);
      return { x: d.date, y: run };
    });

    window.activeCharts.calEquity = new Chart(ctx, {
      type: 'line',
      data: {
        labels: mc.days.map(d => fDate(d.date).split('/')[0]),
        datasets: [{
          data: data.map(d => d.y),
          borderColor: '#FFD100',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          backgroundColor: 'rgba(255, 209, 0, 0.05)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#606060', font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#606060', font: { size: 9 } } }
        }
      }
    });
  }
}

/* ─── Reports Page ───────────────────── */
function pgReports() {
  if (!window.pgState.repTab) window.pgState.repTab = 'month';
  const tab = window.pgState.repTab;
  const c = CALC();

  let html = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 24px">
      
      <div style="margin-bottom: 32px">
        <h2 style="font-size: 28px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 20px">Relatórios & <span style="color: var(--xp)">Insights</span></h2>
        
        <div class="tabs">
          <button class="tab ${tab === 'month' ? 'on' : ''}" onclick="setRepTab('month')">Mensal</button>
          <button class="tab ${tab === 'year' ? 'on' : ''}" onclick="setRepTab('year')">Anual</button>
          <button class="tab ${tab === 'goals' ? 'on' : ''}" onclick="setRepTab('goals')">Objetivos</button>
          <button class="tab ${tab === 'proj' ? 'on' : ''}" onclick="setRepTab('proj')">Projeção</button>
          <button class="tab ${tab === 'juros' ? 'on' : ''}" onclick="setRepTab('juros')">Juros</button>
        </div>
      </div>

      <div class="page-transition-enter">
  `;

  if (tab === 'month') {
    const mc = monthCALC(window.pgState.repY, window.pgState.repM);
    
    html += `
      <div class="mrow" style="margin: 16px 0 32px">
        <button class="cal-nb" onclick="changeRepMonth(-1)">‹</button>
        <div style="flex:1; text-align:center; font-weight:900; font-size:18px; letter-spacing:-1px">
          ${MS[window.pgState.repM]} <span style="color:var(--text3)">${window.pgState.repY}</span>
        </div>
        <button class="cal-nb" onclick="changeRepMonth(1)">›</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px">
        <div class="card">
          <div class="shdr-t">Resumo Financeiro</div>
          <div style="margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
             <div><div class="st-lb">P&L Bruto</div><div class="mono" style="font-size:20px">${fR(mc.pl + mc.totalBro + mc.totalIR)}</div></div>
             <div><div class="st-lb">P&L Líquido</div><div class="mono ${cv(mc.pl)}" style="font-size:20px">${fR(mc.pl)}</div></div>
             <div><div class="st-lb">Corretagem</div><div class="mono neg" style="font-size:20px">-${fR(mc.totalBro)}</div></div>
             <div><div class="st-lb">IRPF (1%)</div><div class="mono neg" style="font-size:20px">-${fR(mc.totalIR)}</div></div>
          </div>
        </div>
        <div class="card">
          <div class="shdr-t">Métricas de Performance</div>
          <div style="margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
             <div><div class="st-lb">Win Rate</div><div class="mono" style="font-size:20px; color: var(--xp)">${fPct(mc.wr)}</div></div>
             <div><div class="st-lb">Profit Factor</div><div class="mono" style="font-size:20px; color: var(--green)">${mc.pf.toFixed(2)}</div></div>
             <div><div class="st-lb">Total Trades</div><div class="mono" style="font-size:20px">${mc.trades}</div></div>
             <div><div class="st-lb">Média/Dia</div><div class="mono" style="font-size:20px">${fR(mc.avgDay)}</div></div>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'goals') {
    html += `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px">
        ${renderGoal('Meta Mensal', c.mPL, c.gMonthly, 'R$')}
        ${renderGoal('Win Rate 55%', c.wr, 55, '%')}
        ${renderGoal('Profit Factor 1.5', c.pf, 1.5, '')}
        ${renderGoal('Disciplina (Plan)', c.planPct, 80, '%')}
      </div>
    `;
  } else if (tab === 'proj') {
    html += `
      <div class="card">
        <div class="shdr-t">Calculadora de Escada (Contratos)</div>
        <div class="mf" style="margin-top: 20px">
          <div class="fr">
            <div class="fl"><label class="fl-lb">Banca Inicial</label><input type="number" id="p-cap" class="fi" value="${c.balance.toFixed(0)}"></div>
            <div class="fl"><label class="fl-lb">R$ por Contrato</label><input type="number" id="p-step" class="fi" value="500"></div>
          </div>
          <div class="fr">
            <div class="fl"><label class="fl-lb">Meta Diária (Pts)</label><input type="number" id="p-pts" class="fi" value="100"></div>
            <div class="fl"><label class="fl-lb">Meses</label><input type="number" id="p-months" class="fi" value="6"></div>
          </div>
          <button class="btn btn-xp" onclick="calcProj()">Calcular Projeção</button>
        </div>
        <div id="proj-result" style="margin-top: 32px"></div>
      </div>
    `;
  } else if (tab === 'juros') {
    html += `
      <div class="card">
        <div class="shdr-t">Juros Compostos</div>
        <div class="mf" style="margin-top: 20px">
          <div class="fr">
            <div class="fl"><label class="fl-lb">Valor Inicial</label><input type="number" id="j-cap" class="fi" value="${c.balance.toFixed(0)}"></div>
            <div class="fl"><label class="fl-lb">Aporte Mensal</label><input type="number" id="j-dep" class="fi" value="0"></div>
          </div>
          <div class="fr">
            <div class="fl"><label class="fl-lb">Taxa Mensal (%)</label><input type="number" id="j-rate" class="fi" value="5"></div>
            <div class="fl"><label class="fl-lb">Período (Meses)</label><input type="number" id="j-months" class="fi" value="12"></div>
          </div>
          <button class="btn btn-xp" onclick="calcJuros()">Ver Futuro</button>
        </div>
        <div id="juros-result" style="margin-top: 32px"></div>
      </div>
    `;
  } else {
     html += `<div class="card" style="padding:40px; text-align:center; color:var(--text3)">Aba em desenvolvimento</div>`;
  }

  html += `</div></div>`;
  return html;
}

function renderGoal(name, val, target, unit) {
  const pct = Math.min(100, Math.max(0, (val / target) * 100));
  return `
    <div class="gc">
      <div class="gc-hd">
        <span class="gc-nm">${name}</span>
        <span class="gc-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="prog"><div class="prog-f" style="width: ${pct}%; background: ${pct >= 100 ? 'var(--green)' : 'var(--xp)'}"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text3); margin-top:8px">
        <span>Atual: ${unit === 'R$' ? fR(val) : val.toFixed(1) + unit}</span>
        <span>Meta: ${unit === 'R$' ? fR(target) : target + unit}</span>
      </div>
    </div>
  `;
}

function mountReportsCharts() {}

/* ─── Settings Page ──────────────────── */
function pgSettings() {
  const c = CALC();
  const name = state.profile?.full_name || 'Usuário';

  const allTx = [
    ...state.deposits.map(d => ({ ...d, type: 'dep' })),
    ...state.withdrawals.map(w => ({ ...w, type: 'wd' }))
  ].sort((a,b) => b.date.localeCompare(a.date));

  return `
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 24px">
      <h2 style="font-size: 28px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 32px">Configurações & <span style="color: var(--xp)">Perfil</span></h2>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px">
        
        <!-- Profile Card -->
        <div class="card" onclick="openSettingsMo()">
          <div style="display:flex; align-items:center; gap:16px; margin-bottom: 24px">
            <div style="width:60px; height:60px; border-radius:12px; background:var(--xp); color:#000; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900">
              ${name.charAt(0)}
            </div>
            <div>
              <div style="font-size:20px; font-weight:800">${name}</div>
              <div style="font-size:12px; color:var(--text3)">Configuração da Conta</div>
            </div>
          </div>
          <div class="ss-item">
            <span class="ss-lb">Capital Inicial</span>
            <span class="ss-vl">${fR(state.config.starting_capital)}</span>
          </div>
          <div class="ss-item">
            <span class="ss-lb">Meta Mensal</span>
            <span class="ss-vl">${fR(state.config.monthly_goal)}</span>
          </div>
          <div class="ss-item">
            <span class="ss-lb">Risco por Trade</span>
            <span class="ss-vl">${state.config.risk_percent || 0}%</span>
          </div>
        </div>

        <!-- Wallet Card -->
        <div class="card">
          <div class="shdr">
            <span class="shdr-t">Movimentações</span>
            <div style="display:flex; gap:8px">
              <button class="bdg bdg-gr" onclick="openDepMo()" style="cursor:pointer">+ Aporte</button>
              <button class="bdg bdg-rd" onclick="openWdMo()" style="cursor:pointer">- Resgate</button>
            </div>
          </div>

          <div style="margin-top: 16px; max-height: 400px; overflow-y: auto; scrollbar-width: none">
            ${allTx.length ? allTx.map(tx => `
              <div class="di">
                <div class="di-l">
                  <div class="di-desc">${tx.description || (tx.type === 'dep' ? 'Aporte' : 'Saque')}</div>
                  <div class="di-date">${fDate(tx.date)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px">
                  <div class="di-amt ${tx.type === 'dep' ? 'pos' : 'neg'}">${tx.type === 'dep' ? '+' : '-'}${fR(tx.amount)}</div>
                  <button class="di-del" onclick="${tx.type === 'dep' ? 'delDeposit' : 'delWithdrawal'}('${tx.id}')">×</button>
                </div>
              </div>
            `).join('') : `
              <div style="padding:40px; text-align:center; color:var(--text3); font-size:12px">Nenhuma movimentação encontrada</div>
            `}
          </div>
        </div>

      </div>
    </div>
  `;
}


function fDate(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}
