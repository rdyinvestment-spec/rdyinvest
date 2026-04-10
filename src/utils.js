// RDY Investment - Utilities

/**
 * Format currency to BRL
 * @param {number|string} val 
 * @returns {string}
 */
export function fR(val) {
  if (isNaN(Number(val))) return 'R$ 0,00';
  return Number(val).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date to pt-BR (DD/MM/YYYY)
 * @param {string} dateStr 
 * @returns {string}
 */
export function fDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Format percentage
 * @param {number} val 
 * @returns {string}
 */
export function fPct(val) {
  if (isNaN(Number(val))) return '0.00%';
  return (Number(val) >= 0 ? '+' : '') + Number(val).toFixed(2) + '%';
}

/**
 * Get CSS class based on numeric value (positive/negative/neutral)
 * @param {number} val 
 * @returns {string}
 */
export function cv(val) {
  const n = Number(val);
  if (n > 0.001) return 'pos';
  if (n < -0.001) return 'neg';
  return 'neu';
}

/**
 * Get today's date in YYYY-MM-DD
 * @returns {string}
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function uid() {
  return 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

export const MN = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
