import { state, CALC, monthCALC, rangeCALC, loadAdminData, calcAdminStats, calcGlobalFeed } from './store';
import { fR, fPct, cv, MS, MN, today, getDailyVerse } from './utils';
import Chart from 'chart.js/auto';

/**
 * Main Rendering Router
 */
export function renderPage(page, options = {}) {
  try {
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

    let content = '';
    switch (page) {
      case 'dashboard':
        content = pgDashboard();
        break;
      case 'calendar':
        content = pgCalendar();
        break;
      case 'reports':
        content = pgReports();
        break;
      case 'admin':
        content = pgAdmin();
        break;
      case 'settings':
        content = pgSettings();
        break;
      default:
        content = `<div style="padding:24px"><div class="card">Página em construção</div></div>`;
    }

    // Wrap with Impersonation Banner if active
    if (state.isViewing) {
      content = pgImpersonationBanner() + content;
    }

    container.innerHTML = content;

    // Mount charts after innerHTML is set
    if (page === 'dashboard') mountDashboardCharts();
    if (page === 'calendar') mountCalendarCharts();
    if (page === 'reports') mountReportsCharts();
  } catch (err) {
    console.error('Render Error:', err);
    const container = document.getElementById('page-content');
    if (container) {
      container.innerHTML = `
        <div style="padding:40px; text-align:center">
          <div style="font-size:48px; margin-bottom:16px">❌</div>
          <h2 style="color:var(--red); margin-bottom:8px">Erro de Renderização</h2>
          <p style="color:var(--text3); font-size:14px">${err.message}</p>
          <button class="btn btn-xp" style="margin-top:24px" onclick="location.reload()">Recarregar App</button>
        </div>
      `;
    }
  }
}

/* ─── Dashboard ─────────────────────────── */
function pgDashboard() {
  const c = CALC();
  const isPos = c.totalPL >= 0;
  const name = (state.profile?.name?.split(' ') || [])[0] || 'Trader';
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
    <!-- XP Hero Section -->
    <div class="hero-section" style="background: radial-gradient(circle at 70% 50%, rgba(255,209,0,0.05) 0%, transparent 60%); padding: 60px 24px 40px; border-bottom: 1px solid var(--border)">
      <div class="hero-grid" style="max-width: 1600px; margin: 0 auto">
        
        <!-- Left Column: Content -->
        <div style="max-width: 600px">
          <div style="font-size: 14px; font-weight: 700; color: var(--xp); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px">RDY ELITE EXPERIENCE</div>
          <h1 style="font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.1; letter-spacing: -2px; margin-bottom: 24px">RDY Investment <span style="color: var(--xp)">Performance</span></h1>
          <p id="daily-verse" style="font-size: 16px; color: var(--text2); margin-bottom: 32px; max-width: 520px; font-style: italic; border-left: 3px solid var(--xp); padding-left: 16px; line-height: 1.6">${getDailyVerse()}</p>
          
        </div>

        <!-- Right Column: Card Visual -->
        <div class="hero-visual" style="display: flex; justify-content: center">
          <div class="card-3d">
            <div class="card-3d-inner" onclick="showPage('settings')">
              
              <!-- Front Face -->
              <div class="cf-front">
                <div class="cf-logo">RDY</div>
                <div class="cf-chip"></div>
                <div class="cf-name">${state.profile?.card_name || state.profile?.name || 'Membro Elite'}</div>
                <div style="position: absolute; inset: 0; background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%); pointer-events: none"></div>
              </div>

              <!-- Back Face -->
              <div class="cf-back">
                <div style="font-size: 24px; margin-bottom: 8px">⚙️</div>
                <div style="font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-size: 14px">Configurar Perfil</div>
                <div style="font-size: 10px; opacity: 0.8; margin-top: 4px; font-weight: 700">CLIQUE PARA EDITAR</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div style="max-width: 1600px; margin: 0 auto; padding: 40px 24px">
      
      <div class="pg-hd" style="flex-wrap: wrap; gap: 16px">
        <div>
          <div style="font-size: 11px; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px">${dateStr}</div>
          <h2 style="font-size: 22px; font-weight: 800; letter-spacing: -1px">Resumo do <span style="color: var(--xp)">Dashboard</span></h2>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px; min-width: 100%">
          <div class="tabs" style="margin-bottom:0; width: 100%; justify-content: flex-end">
            ${['today', 'week', 'month', 'total', 'custom'].map(f => `
              <div class="tab ${window.pgState.dashFilter === f ? 'on' : ''}" onclick="setDashFilter('${f}')">
                ${f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : f === 'total' ? 'Geral' : 'Gerenciar'}
              </div>
            `).join('')}
          </div>
          ${window.pgState.dashFilter === 'custom' ? `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
              <input type="date" id="dash-from" class="fi" style="padding: 8px 12px; font-size: 12px; width: 130px" value="${window.pgState.customFrom || ''}" onchange="window.pgState.customFrom=this.value">
              <span style="font-size: 11px; color: var(--text3); font-weight: 700">até</span>
              <input type="date" id="dash-to" class="fi" style="padding: 8px 12px; font-size: 12px; width: 130px" value="${window.pgState.customTo || ''}" onchange="window.pgState.customTo=this.value">
              <button class="btn btn-xp" onclick="applyCustomRange()" style="padding: 8px 16px; font-size: 12px; height: auto">Filtrar</button>
            </div>
          ` : ''}
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
            <div class="mono" style="font-size: 64px; font-weight: 900; letter-spacing: -4px; color: ${c.balance >= 0 ? 'var(--green)' : 'var(--red)'}">${fR(c.balance)}</div>
            <div style="display: flex; gap: 12px; margin-top: 16px; align-items: center">
              <span class="badge ${c.wr >= 50 ? 'badge-pos' : 'badge-neg'}" style="border-radius: 4px; padding: 4px 10px; font-size: 11px">Win Rate: ${fPct(c.wr)}</span>
              <span style="font-size: 14px; font-weight: 700; color: var(--text3)">${fR(c.totalPL)} <span class="${cv(c.totalPL)}" style="font-size: 12px; margin-left: 4px">(${c.totalPL > 0 ? '+' : ''}${((c.totalPL / (c.startCap || 1)) * 100).toFixed(2)}%)</span></span>
            </div>
          </div>
        </div>

        <!-- Row 2: Indicators & Chart -->
        <!-- Row 2: Indicators & Chart -->
        <div class="card" style="padding: 24px 28px; display: flex; flex-direction: column; justify-content: center; min-width: 0">
          <div style="font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px">Total Aportado</div>
          <div class="mono" style="font-size: clamp(20px, 2.5vw, 24px); font-weight: 900; color: var(--xp); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${fR(c.depSum)}</div>
          <div style="font-size: 11px; color: var(--text3); margin-top: 8px; font-weight: 600; white-space: nowrap">${state.deposits.length} aportes realizados</div>
        </div>

        <div class="card" style="padding: 24px 28px; display: flex; flex-direction: column; justify-content: center; min-width: 0">
          <div style="font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px">Total Sacado</div>
          <div class="mono" style="font-size: clamp(20px, 2.5vw, 24px); font-weight: 900; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap">${fR(c.wdSum)}</div>
          <div style="font-size: 11px; color: var(--text3); margin-top: 8px; font-weight: 600; white-space: nowrap">${state.withdrawals.length} retiradas realizadas</div>
        </div>

        <!-- Curva de Capital -->
        <div class="card card-lg pg-item-wide" style="grid-column: span 2">
          <div class="shdr">
            <span class="shdr-t">Curva de Capital</span>
            <div class="badge ${calcGrowth(state.days) >= 0 ? 'badge-pos' : 'badge-neg'}" style="border-radius:4px">${fPct(calcGrowth(state.days))}</div>
          </div>
          <div style="height: 220px; width: 100%; margin-top: 16px"><canvas id="ch-equity"></canvas></div>
        </div>

        <!-- Taxas & Custos -->
        <div class="card">
          <div class="shdr"><span class="shdr-t">Custos Operacionais</span></div>
          <div style="margin-top: 12px">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <span style="font-size: 11px; color: var(--text3); font-weight: 600">Corretagem</span>
              <span class="mono" style="color: var(--red); font-size: 15px">-${fR(c.totalBro)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
              <span style="font-size: 11px; color: var(--text3); font-weight: 600">IRPF (1%)</span>
              <span class="mono" style="color: var(--red); font-size: 15px">-${fR(c.totalIR)}</span>
            </div>
            <div style="border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between; align-items:center">
              <span style="font-size: 10px; color: var(--text2); font-weight: 800; text-transform: uppercase">Deduções</span>
              <span class="mono" style="color: var(--red); font-size: 15px">-${fR(c.totalBro + c.totalIR)}</span>
            </div>
          </div>
        </div>

        <!-- Meta do Mês -->
        <div class="card">
          <div class="shdr">
            <span class="shdr-t">Meta do Mês</span>
            <span style="font-size: 10px; font-weight: 800; color: var(--text3)">${((c.mPL / (c.gMonthly || 1)) * 100).toFixed(0)}%</span>
          </div>
          <div style="margin-top: 16px">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px">
              <span class="mono" style="font-size: 20px; font-weight: 900; color: ${c.mPL >= 0 ? 'var(--green)' : 'var(--red)'}">${fR(c.mPL)}</span>
              <span style="font-size: 10px; color: var(--text3); font-weight: 700">Meta: ${fR(c.gMonthly)}</span>
            </div>
            <!-- Progress Bar -->
            <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden">
              <div style="height: 100%; width: ${Math.min(100, Math.max(0, (c.mPL / (c.gMonthly || 1)) * 100))}%; background: ${c.mPL >= c.gMonthly ? 'var(--green)' : 'var(--xp)'}; box-shadow: 0 0 10px ${c.mPL >= c.gMonthly ? 'var(--green-dim)' : 'var(--xp-glow)'}; transition: width 1s ease"></div>
            </div>
            <div style="font-size: 10px; color: var(--text3); margin-top: 10px; font-weight: 600">
              ${c.mPL >= c.gMonthly ? 'Meta atingida! 🚀' : `Faltam ${fR(Math.max(0, c.gMonthly - c.mPL))} para o objetivo.`}
            </div>
          </div>
        </div>

        <!-- Atividades Recentes -->
        <div class="card card-lg" style="grid-column: span 2">
          <div class="shdr">
            <span class="shdr-t">Atividade Recente</span>
            <span style="font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 1px">Últimos 3 dias</span>
          </div>
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px">
            ${(() => {
              const lastDays = [...state.days].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3);
              if (!lastDays.length) return `<div style="padding: 20px; text-align: center; font-size: 12px; color: var(--text3)">Nenhuma operação registrada ainda.</div>`;
              return lastDays.map(d => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.03)">
                  <div style="display: flex; flex-direction: column">
                    <span style="font-size: 11px; font-weight: 800; color: var(--text1)">${new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}</span>
                    <span style="font-size: 10px; color: var(--text3); font-weight: 600">${d.setup || 'Sem setup'}</span>
                  </div>
                  <div style="text-align: right">
                    <div class="mono" style="font-size: 14px; font-weight: 900; color: ${d.profit_loss >= 0 ? 'var(--green)' : 'var(--red)'}">${d.profit_loss >= 0 ? '+' : ''}${fR(d.profit_loss)}</div>
                    <div style="font-size: 9px; color: var(--text3); font-weight: 700">${d.wins}G / ${d.losses}P</div>
                  </div>
                </div>
              `).join('');
            })()}
          </div>
        </div>

        <!-- ─── KPI Grid de Performance ─── -->
        ${(() => {
          const f = window.pgState.dashFilter;
          const nowD = new Date();
          const todayStr = nowD.toISOString().slice(0, 10);
          const weekStart = new Date(nowD); weekStart.setDate(nowD.getDate() - nowD.getDay());
          const weekStr = weekStart.toISOString().slice(0, 10);
          const monthStr = `${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}`;

          let days = state.days;
          if (f === 'today') days = state.days.filter(d => d.date === todayStr);
          else if (f === 'week') days = state.days.filter(d => d.date >= weekStr && d.date <= todayStr);
          else if (f === 'month') days = state.days.filter(d => d.date.startsWith(monthStr));
          else if (f === 'custom') {
            const from = window.pgState.customFrom || '';
            const to = window.pgState.customTo || todayStr;
            days = state.days.filter(d => d.date >= from && d.date <= to);
          }

          const totalContracts = days.reduce((a, d) => a + Number(d.contracts_used || 0), 0);
          const totalTrades = days.reduce((a, d) => a + (Number(d.wins || 0) + Number(d.losses || 0)), 0);
          const totalWins = days.reduce((a, d) => a + Number(d.wins || 0), 0);
          const totalLosses = days.reduce((a, d) => a + Number(d.losses || 0), 0);
          const winOpPct = totalTrades ? (totalWins / totalTrades) * 100 : 0;
          const lossOpPct = totalTrades ? (totalLosses / totalTrades) * 100 : 0;

          const totalGrossWin = days.filter(d => Number(d.profit_loss) > 0).reduce((a, d) => a + Number(d.profit_loss), 0);
          const totalGrossLoss = days.filter(d => Number(d.profit_loss) < 0).reduce((a, d) => a + Math.abs(Number(d.profit_loss)), 0);
          const totalGross = totalGrossWin + totalGrossLoss;
          const winValPct = totalGross ? (totalGrossWin / totalGross) * 100 : 0;
          const lossValPct = totalGross ? (totalGrossLoss / totalGross) * 100 : 0;
          const winDays = days.filter(d => Number(d.profit_loss) > 0).length;
          const lossDays = days.filter(d => Number(d.profit_loss) < 0).length;

          const kpi = (label, val, sub, color = 'var(--text1)') => `
            <div style="padding: 16px 18px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column">
              <div style="font-size: 9px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; min-height: 24px; display: flex; align-items: flex-start">${label}</div>
              <div class="mono" style="font-size: 22px; font-weight: 900; color: ${color}; letter-spacing: -1px; margin-top: 4px">${val}</div>
              ${sub ? `<div style="font-size: 10px; color: var(--text3); margin-top: 5px; font-weight: 600">${sub}</div>` : ''}
            </div>`;

          return `
          <div class="kpi-grid" style="grid-column: 1 / -1">
            ${kpi('Contratos', totalContracts, `${days.length} dias`, 'var(--xp)')}
            ${kpi('Trades', totalTrades, `${totalWins}G / ${totalLosses}P`, 'var(--text1)')}
            ${kpi('Dias Ganhos', winDays, `${winDays + lossDays} operados`, 'var(--green)')}
            ${kpi('Dias Perdas', lossDays, `${lossDays > 0 ? ((lossDays / (winDays + lossDays || 1)) * 100).toFixed(1) + '% dos dias' : 'Nenhum'}`, 'var(--red)')}
            ${kpi('Ganhos R$', fR(totalGrossWin), `${winValPct.toFixed(1)}% do volume`, 'var(--green)')}
            ${kpi('Perdas R$', '-' + fR(totalGrossLoss), `${lossValPct.toFixed(1)}% do volume`, 'var(--red)')}
            ${kpi('Win% Ops', winOpPct.toFixed(1) + '%', `${totalWins}/${totalTrades} trades`, winOpPct >= 50 ? 'var(--green)' : 'var(--red)')}
            ${kpi('Win% Valor', winValPct.toFixed(1) + '%', `Sobre volume bruto`, winValPct >= 50 ? 'var(--green)' : 'var(--red)')}
          </div>`;
        })()}

      </div>
    </div>
  `;
}

function calcGrowth(days) {
  if (!days || days.length < 2) return 0;
  const eq = CALC().equity;
  if (!eq || eq.length < 2) return 0;
  const start = eq[0].y || 1;
  const end = eq[eq.length - 1].y;
  return ((end - start) / start) * 100;
}

/* ─── Chart.js Global Initialization ─── */
export function initChartDefaults() {
  if (!Chart || !Chart.defaults) return;
  
  Chart.defaults.color = '#808080';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.font.weight = '800';
  
  // Standardize tooltips to XP style (Carbon/Supernova)
  if (Chart.defaults.plugins?.tooltip) {
    Chart.defaults.plugins.tooltip.backgroundColor = '#000000';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 209, 0, 0.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 14, weight: '800' };
    Chart.defaults.plugins.tooltip.displayColors = false;
  }

  // Standardize scales (v4 syntax)
  if (Chart.defaults.scale?.grid) {
     Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.03)';
  }
  if (Chart.defaults.scale?.ticks) {
    Chart.defaults.scale.ticks.color = '#606060';
  }
}

/* ─── Charts ─────────────────────────── */
function mountDashboardCharts() {
  initChartDefaults();
  const ctxEq = document.getElementById('ch-equity')?.getContext('2d');
  if (ctxEq) {
    const gradient = ctxEq.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 209, 0, 0)');

    const eq = CALC().equity;
    window.activeCharts.equity = new Chart(ctxEq, {
      type: 'line',
      data: {
        labels: eq.map(p => fDate(p.x)),
        datasets: [{
          data: eq.map(p => p.y),
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
    <div style="max-width: 1600px; margin: 0 auto; padding: 40px 24px">
      
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
    const pct = entry ? (entry.profit_loss / (entry.starting_balance || 1)) * 100 : 0;
    
    html += `
      <div class="cd ${type} ${isToday ? 'tod' : ''}" onclick="calClick('${dStr}')">
        <span class="cd-n">${d}</span>
        ${entry ? `
          <span class="cd-v">${fR(entry.profit_loss)}</span>
          <div style="font-size: 8px; font-weight: 800; opacity: 0.7; margin-top: 2px">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</div>
        ` : ''}
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
  if (!window.pgState.repTab) window.pgState.repTab = 'custom';
  const tab = window.pgState.repTab;
  const c = CALC();

  let html = `
    <div style="max-width: 1600px; margin: 0 auto; padding: 40px 24px">
      
      <div style="margin-bottom: 40px">
        <h1 style="font-size: clamp(28px, 4vw, 36px); font-weight: 900; letter-spacing: -2px; margin-bottom: 24px">Relatórios & <span style="color: var(--xp)">Insights</span></h1>
        
        <div class="tabs">
          ${[
            { id: 'month', label: 'Mensal' },
            { id: 'year', label: 'Anual' },
            { id: 'custom', label: 'Personalizado' },
            { id: 'goals', label: 'Objetivos' },
            { id: 'proj', label: 'Projeção' },
            { id: 'juros', label: 'Juros' }
          ].map(n => `
            <div class="tab ${tab === n.id ? 'on' : ''}" onclick="setRepTab('${n.id}')">
              ${n.label}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="page-transition-enter">
  `;

  if (tab === 'month') {
    const mc = monthCALC(window.pgState.repY, window.pgState.repM);
    
    html += `
      <div class="mrow" style="margin: 16px 0 32px; align-items: center; justify-content: center">
        <button class="cal-nb" onclick="changeRepMonth(-1)">‹</button>
        <div style="width: 240px; text-align:center; font-weight:900; font-size:22px; letter-spacing:-1px">
          ${MS[window.pgState.repM]} <span style="color:var(--text3)">${window.pgState.repY}</span>
        </div>
        <button class="cal-nb" onclick="changeRepMonth(1)">›</button>
      </div>

      <div class="rpt-grid-3">
        <div class="card">
          <div class="shdr-t">Resumo Financeiro</div>
          <div style="margin: 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
             <div><div class="st-lb">P&L Bruto</div><div class="mono" style="font-size:20px">${fR(mc.pl + mc.totalBro + mc.totalIR)}</div></div>
             <div><div class="st-lb">P&L Líquido</div><div class="mono ${cv(mc.pl)}" style="font-size:20px">${fR(mc.pl)}</div></div>
             <div><div class="st-lb">Corretagem</div><div class="mono neg" style="font-size:20px">-${fR(mc.totalBro)}</div></div>
             <div><div class="st-lb">IRPF (1%)</div><div class="mono neg" style="font-size:20px">-${fR(mc.totalIR)}</div></div>
          </div>
        </div>
        <div class="card">
          <div class="shdr-t">Métricas de Performance</div>
          <div style="margin: 24px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px">
             <div><div class="st-lb">Win Rate</div><div class="mono" style="font-size:20px; color: var(--xp)">${fPct(mc.wr)}</div></div>
             <div><div class="st-lb">Profit Factor</div><div class="mono" style="font-size:20px; color: var(--green)">${mc.pf.toFixed(2)}</div></div>
             <div><div class="st-lb">Total Trades</div><div class="mono" style="font-size:20px">${mc.trades}</div></div>
             <div><div class="st-lb">Média/Dia</div><div class="mono" style="font-size:20px">${fR(mc.avgDay)}</div></div>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'custom') {
    const start = window.pgState.repStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = window.pgState.repEnd || new Date().toISOString().split('T')[0];
    const rc = rangeCALC(start, end);

    html += `
      <!-- Interval Filter -->
      <div class="card" style="margin-bottom: 32px; padding: 32px">
        <div class="shdr-t" style="margin-bottom: 24px; color: var(--text3)">FILTRO DE INTERVALO</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px">
          <div class="fl">
            <label class="fl-lb" style="margin-bottom: 12px; font-weight: 800; font-size: 11px">INÍCIO</label>
            <input type="date" class="fi" value="${start}" onchange="setRepRange('start', this.value)" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); padding: 16px 20px; border-radius: 16px; font-weight: 700">
          </div>
          <div class="fl">
            <label class="fl-lb" style="margin-bottom: 12px; font-weight: 800; font-size: 11px">FIM</label>
            <input type="date" class="fi" value="${end}" onchange="setRepRange('end', this.value)" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); padding: 16px 20px; border-radius: 16px; font-weight: 700">
          </div>
        </div>
      </div>

      <div class="rpt-grid-3">
        
        <!-- Finance Card -->
        <div class="card" style="padding: 32px">
          <div class="shdr-t" style="margin-bottom: 32px">RESUMO FINANCEIRO</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px">
            <div><div class="st-lb">Resultado Líquido</div><div class="mono ${cv(rc.pl)}" style="font-size: 32px; letter-spacing: -1.5px">${fR(rc.pl)}</div></div>
            <div><div class="st-lb">Profit Factor</div><div class="mono" style="color:var(--text1); font-size: 32px; letter-spacing: -1.5px">${rc.pf.toFixed(2)}</div></div>
            <div><div class="st-lb">Aportes</div><div class="mono" style="color:var(--blue); font-size: 20px">${fR(rc.dep)}</div></div>
            <div><div class="st-lb">Retiradas</div><div class="mono" style="color:var(--red); font-size: 20px">${fR(rc.wd)}</div></div>
          </div>
        </div>

        <!-- Performance Card -->
        <div class="card" style="padding: 32px; border: 1px solid var(--xp-glow)">
          <div class="shdr-t" style="margin-bottom: 32px">CONSISTÊNCIA E VOLUME</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:24px">
             <div><div class="st-lb">Dias Positivos</div><div class="mono pos" style="font-size: 20px">${rc.posD}</div></div>
             <div><div class="st-lb">Dias Negativos</div><div class="mono neg" style="font-size: 20px">${rc.negD}</div></div>
             <div><div class="st-lb">Não Operados</div><div class="mono" style="opacity:0.6; font-size: 20px">${rc.notTraded}</div></div>
             
             <div><div class="st-lb">Total Trades</div><div class="mono" style="font-size: 20px">${rc.totalOps}</div></div>
             <div><div class="st-lb">Vencidos</div><div class="mono pos" style="font-size: 20px">${rc.tWins}</div></div>
             <div><div class="st-lb">Perdidos</div><div class="mono neg" style="font-size: 20px">${rc.tLosses}</div></div>
          </div>
          <div style="margin-top:32px; padding-top:24px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center">
            <span class="st-lb" style="margin-bottom: 0">Taxa de Acerto (Trades)</span>
            <span class="mono" style="color:var(--xp); font-size:24px; letter-spacing: -1px">+${fPct(rc.tWr)}</span>
          </div>
        </div>

        <!-- Operational Card -->
        <div class="card" style="padding: 32px">
          <div class="shdr-t" style="margin-bottom: 32px">DADOS OPERACIONAIS</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px">
             <div><div class="st-lb">Total Pontos</div><div class="mono" style="font-size: 20px">${rc.totalPts.toLocaleString()}</div></div>
             <div><div class="st-lb">Total Contratos</div><div class="mono" style="font-size: 20px">${rc.totalContracts}</div></div>
             <div><div class="st-lb">Média Pontos/Dia</div><div class="mono" style="color:var(--xp); font-size: 20px">${(rc.totalPts / (rc.posD + rc.negD || 1)).toFixed(0)}</div></div>
             <div><div class="st-lb">Média Lucro/Dia</div><div class="mono ${cv(rc.avgDay)}" style="font-size: 20px">${fR(rc.avgDay)}</div></div>
          </div>
        </div>

      </div>
    `;
  } else if (tab === 'goals') {
    html += `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px">
        ${renderGoal('Meta Mensal', c.mPL, c.gMonthly, 'R$')}
        ${renderGoal('Win Rate 55%', c.wr, 55, '%')}
        ${renderGoal('Profit Factor 1.5', c.pf, 1.5, '')}
        ${renderGoal('Disciplina (Plan)', c.planPct, 80, '%')}
      </div>
    `;
  } else if (tab === 'proj') {
    html += `
      <div class="card" style="padding: 32px">
        <div class="shdr-t" style="margin-bottom: 24px">Calculadora de Escada (Contratos)</div>
        <div class="mf">
          <div class="fr">
            <div class="fl"><label class="fl-lb">Banca Inicial</label><input type="number" id="p-cap" class="fi" value="${c.balance.toFixed(0)}"></div>
            <div class="fl"><label class="fl-lb">R$ por Contrato</label><input type="number" id="p-step" class="fi" value="500"></div>
          </div>
          <div class="fr">
            <div class="fl"><label class="fl-lb">Meta Diária (Pts)</label><input type="number" id="p-pts" class="fi" value="100"></div>
            <div class="fl"><label class="fl-lb">Meses</label><input type="number" id="p-months" class="fi" value="6"></div>
          </div>
          <button class="btn btn-xp" onclick="calcProj()" style="margin-top: 12px">Calcular Projeção</button>
        </div>
        <div id="proj-result" style="margin-top: 40px"></div>
      </div>
    `;
  } else if (tab === 'juros') {
    html += `
      <div class="card" style="padding: 32px">
        <div class="shdr-t" style="margin-bottom: 24px">Juros Compostos</div>
        <div class="mf">
          <div class="fr">
            <div class="fl"><label class="fl-lb">Valor Inicial</label><input type="number" id="j-cap" class="fi" value="${c.balance.toFixed(0)}"></div>
            <div class="fl"><label class="fl-lb">Aporte Mensal</label><input type="number" id="j-dep" class="fi" value="0"></div>
          </div>
          <div class="fr">
            <div class="fl"><label class="fl-lb">Taxa Mensal (%)</label><input type="number" id="j-rate" class="fi" value="5"></div>
            <div class="fl"><label class="fl-lb">Período (Meses)</label><input type="number" id="j-months" class="fi" value="12"></div>
          </div>
          <button class="btn btn-xp" onclick="calcJuros()" style="margin-top: 12px">Ver Futuro</button>
        </div>
        <div id="juros-result" style="margin-top: 40px"></div>
      </div>
    `;
  } else {
     html += `<div class="card" style="padding:60px; text-align:center; color:var(--text3)">Aba em desenvolvimento</div>`;
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
  const name = state.profile?.name || 'Usuário';

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



/* ─── Admin Portal & Auditor ─────────── */
function pgImpersonationBanner() {
  const name = state.viewerProfile?.name || 'Usuário';
  return `
    <div style="background: var(--xp); color: #000; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 13px; position: sticky; top: 0; z-index: 1001; box-shadow: 0 4px 20px rgba(0,0,0,0.5)">
      <div style="display: flex; align-items: center; gap: 12px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        MODO DE VISUALIZAÇÃO: <span style="text-decoration: underline">${name.toUpperCase()}</span>
      </div>
      <button class="btn" style="background: #000; color: #FFF; font-size: 10px; padding: 6px 16px; height: auto" onclick="stopImpersonation()">SAIR DA VISUALIZAÇÃO</button>
    </div>
  `;
}

function pgAdmin() {
  const stats = calcAdminStats();
  const feed = calcGlobalFeed();
  
  return `
    <div style="max-width: 1600px; margin: 0 auto; padding: 40px 24px">
      <div style="margin-bottom: 40px">
        <div style="font-size: 12px; font-weight: 700; color: var(--xp); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px">CENTRAL DE COMANDO ELITE</div>
        <h1 style="font-size: 36px; font-weight: 900; letter-spacing: -2.5px">Portal <span style="color: var(--xp)">Administrativo</span></h1>
      </div>

      <!-- Bento Grid Admin -->
      <div class="bento-grid" style="margin-bottom: 48px">
        <div class="card pg-item-wide" style="display: flex; flex-direction: column; justify-content: space-between">
           <div>
              <div class="shdr-t">Patrimônio sob Gestão</div>
              <div class="mono" style="font-size: clamp(32px, 5vw, 48px); font-weight: 900; margin-top: 12px">${fR(stats.managedCapital)}</div>
           </div>
           <div style="margin-top: 24px; display: flex; gap: 32px">
              <div>
                 <div class="st-lb">P&L Acumulado</div>
                 <div class="mono ${cv(stats.totalPL)}" style="font-size: 20px; font-weight: 800">${fR(stats.totalPL)}</div>
              </div>
              <div>
                 <div class="st-lb">Usuários Ativos</div>
                 <div class="mono" style="font-size: 20px; font-weight: 800; color: var(--xp)">${stats.totalUsers}</div>
              </div>
           </div>
        </div>

        <div class="card" style="padding: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 1px solid var(--xp-dim)">
           <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--xp-dim); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid var(--xp)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--xp)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
           </div>
           <div style="font-weight: 900; font-size: 18px">Segurança Ativa</div>
        </div>

        <div class="card" style="padding: 24px">
           <div class="shdr-t" style="margin-bottom: 16px">Configurações</div>
           <div style="display: flex; flex-direction: column; gap: 8px">
              <button class="btn btn-ghost" style="width: 100%; justify-content: start; font-size: 12px" onclick="toast('Em desenvolvimento...')">Gerenciar Usuários</button>
           </div>
        </div>
      </div>

      <div class="admin-grid">
        <!-- Leaderboard -->
        <div class="card" style="padding: 32px">
           <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px">
              <h3 style="font-size: 20px; font-weight: 900; letter-spacing: -1px">Ranking de <span style="color: var(--xp)">Traders</span></h3>
           </div>
           <div style="overflow-x: auto">
              <table class="f-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px">
                 <thead>
                    <tr style="text-align: left; font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase;">
                       <th>Rank</th>
                       <th>Trader</th>
                       <th>Resultado</th>
                       <th>WR</th>
                       <th style="text-align: right">Ações</th>
                    </tr>
                 </thead>
                 <tbody>
                    ${stats.ranking.map((u, idx) => `
                       <tr class="ranking-row" style="background: rgba(255,255,255,0.02)">
                          <td style="padding: 12px; border-radius: 8px 0 0 8px">
                             <div style="width: 28px; height: 28px; border-radius: 4px; background: ${idx === 0 ? 'var(--xp)' : 'rgba(255,255,255,0.05)'}; color: ${idx === 0 ? '#000' : '#FFF'}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px">
                                ${idx + 1}
                             </div>
                          </td>
                          <td style="padding: 12px; font-weight: 700">${u.name}</td>
                          <td style="padding: 12px" class="mono ${cv(u.profit)}">${fR(u.profit)}</td>
                          <td style="padding: 12px" class="mono">${u.wr.toFixed(0)}%</td>
                          <td style="padding: 12px; border-radius: 0 8px 8px 0; text-align: right">
                             <button class="btn btn-ghost" style="padding: 6px; height: auto" onclick="startImpersonation('${u.id}')" title="Visualizar Dashboard">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                             </button>
                          </td>
                       </tr>
                    `).join('')}
                 </tbody>
              </table>
           </div>
        </div>

        <!-- Global Feed -->
        <div class="card" style="padding: 32px">
           <h3 style="font-size: 20px; font-weight: 900; letter-spacing: -1px; margin-bottom: 32px">Auditoria <span style="color: var(--xp)">Global</span></h3>
           <div style="display: flex; flex-direction: column; gap: 16px">
              ${feed.map(item => {
                 const u = stats.ranking.find(x => x.id === item.user_id) || { name: 'Usuário' };
                 let icon = '📈', label = 'Operação', color = 'var(--text)';
                 if (item.type === 'DEP') { icon = '💰'; label = 'Aporte'; color = 'var(--green)'; }
                 if (item.type === 'WTH') { icon = '💸'; label = 'Retirada'; color = 'var(--red)'; }
                 
                 const amt = item.type === 'OPER' ? (item.profit_loss) : (item.amount);

                 return `
                    <div style="display: flex; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05)">
                       <div style="font-size: 20px">${icon}</div>
                       <div style="flex: 1">
                          <div style="display: flex; justify-content: space-between; align-items: center">
                             <div style="font-weight: 700; font-size: 14px">${u.name}</div>
                             <div class="mono" style="font-size: 11px; color: var(--text3)">${fDate(item.date)}</div>
                          </div>
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px">
                             <div style="font-size: 12px; color: var(--text3)">${label}</div>
                             <div class="mono ${cv(amt)}" style="font-weight: 800; font-size: 13px">${fR(amt)}</div>
                          </div>
                       </div>
                    </div>
                 `;
              }).join('')}
              ${feed.length === 0 ? '<div style="color: var(--text3); text-align: center; padding: 20px">Nenhuma atividade recente</div>' : ''}
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

