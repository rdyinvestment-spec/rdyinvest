import { state, CALC, monthCALC } from './store';
import { fR, fPct, cv, MS, MN, today } from './utils';
import Chart from 'chart.js/auto';

/**
 * Main Rendering Router
 */
export function renderPage(page, options = {}) {
  const container = document.getElementById('page-content');
  if (!container) return;

  // Cleanup charts
  if (window.activeCharts) {
    Object.values(window.activeCharts).forEach(c => c.destroy());
  }
  window.activeCharts = {};

  switch (page) {
    case 'dashboard':
      container.innerHTML = pgDashboard();
      mountDashboardCharts();
      break;
    case 'reports':
      container.innerHTML = pgReports();
      mountReportsCharts();
      break;
    case 'calendar':
      container.innerHTML = pgCalendar();
      break;
    // Add other cases...
    default:
      container.innerHTML = `<div class="card">Página ${page} em construção</div>`;
  }
}

/**
 * Dashboard Page
 */
function pgDashboard() {
  const c = CALC();
  const mc = monthCALC(new Date().getFullYear(), new Date().getMonth());
  
  // Neon glow for positive performance
  const performanceClass = c.totalPL >= 0 ? 'neon-glow profit-flash' : '';

  let html = `
    <div class="pg-hd" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center">
      <div>
        <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px">Bem-vindo, ${state.profile?.full_name || 'Trader'}</div>
        <div style="font-size:24px; font-weight:800; background:linear-gradient(to right, #fff, var(--text3)); -webkit-background-clip:text; -webkit-text-fill-color:transparent">Resumo Geral</div>
      </div>
      <div id="hd-sync-status" style="font-size:12px; color:var(--green)">● Cloud Sync</div>
    </div>

    <!-- Main Balance Card -->
    <div class="card ${performanceClass}" style="background: linear-gradient(135deg, var(--bg2), var(--bg3)); border-color: rgba(76, 142, 247, 0.2)">
      <div style="display:flex; justify-content:space-between; align-items:flex-start">
        <div>
          <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px">Patrimônio Líquido</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:32px; font-weight:800; color:${cv(c.balance) === 'pos' ? 'var(--neon-green)' : 'var(--red)'}">${fR(c.balance)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px; color:var(--text3); text-transform:uppercase">Profit Total</div>
          <div class="${cv(c.totalPL)}" style="font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700">${fR(c.totalPL)}</div>
        </div>
      </div>
      
      <div style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:16px; padding-top:16px; border-top:1px solid var(--border)">
        <div>
          <div style="font-size:10px; color:var(--text3); text-transform:uppercase">Dedução Corretagem</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--red)">-${fR(c.totalBro)}</div>
        </div>
        <div>
          <div style="font-size:10px; color:var(--text3); text-transform:uppercase">Provisão IRPF (1%)</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:13px; color:var(--red)">-${fR(c.totalIR)}</div>
        </div>
      </div>
    </div>

    <div class="sg sg-2" style="margin-bottom:16px">
      <div class="st">
        <div class="st-lb">Win Rate</div>
        <div class="st-val ${c.wr >= 50 ? 'pos' : 'neg'}">${c.wr.toFixed(1)}%</div>
      </div>
      <div class="st">
        <div class="st-lb">Contratos Limite</div>
        <div class="st-val blu">${c.contracts}x</div>
      </div>
    </div>

    <div class="card">
      <div class="shdr"><div class="shdr-t">Evolução Patrimonial</div></div>
      <div style="height:180px"><canvas id="ch-equity"></canvas></div>
    </div>

    <div class="card">
      <div class="shdr"><div class="shdr-t">Performance Mensal</div></div>
      <div style="height:140px"><canvas id="ch-monthly"></canvas></div>
    </div>
  `;
  return html;
}

function mountDashboardCharts() {
  const c = CALC();
  
  // Equity Chart
  const ctxEq = document.getElementById('ch-equity')?.getContext('2d');
  if (ctxEq) {
    const gradient = ctxEq.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(76, 142, 247, 0.2)');
    gradient.addColorStop(1, 'rgba(76, 142, 247, 0)');

    window.activeCharts.equity = new Chart(ctxEq, {
      type: 'line',
      data: {
        labels: state.days.map(d => d.date.split('-')[2]),
        datasets: [{
          data: state.days.map(d => d.ending_balance),
          borderColor: '#4C8EF7',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7A8D', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6B7A8D', font: { size: 10 } } }
        }
      }
    });
  }

  // Monthly Bar Chart
  const ctxMo = document.getElementById('ch-monthly')?.getContext('2d');
  if (ctxMo) {
    window.activeCharts.monthly = new Chart(ctxMo, {
      type: 'bar',
      data: {
        labels: MS,
        datasets: [{
          data: Array(12).fill(0).map((_, i) => monthCALC(new Date().getFullYear(), i).pl),
          backgroundColor: (ctx) => {
            const v = ctx.raw;
            return v >= 0 ? '#00D395' : '#FF4D6A';
          },
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7A8D', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6B7A8D', font: { size: 10 } } }
        }
      }
    });
  }
}

function pgReports() {
  return `<div class="card">Relatórios em breve</div>`;
}

function pgCalendar() {
  return `<div class="card">Calendário em breve</div>`;
}

function mountReportsCharts() {}
