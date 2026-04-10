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

/**
 * Get a Daily Biblical Verse based on the calendar day
 * @returns {string}
 */
export function getDailyVerse() {
  const verses = [
    "\"Tudo posso naquele que me fortalece.\" - Filipenses 4:13",
    "\"O senhor é meu pastor e nada me faltará.\" - Salmos 23:1",
    "\"Quem é cuidadoso no que faz prosperará.\" - Provérbios 16:20",
    "\"Seja forte e corajoso! Não se apavore nem desanime.\" - Josué 1:9",
    "\"O coração do homem planeja o seu caminho, mas o Senhor lhe dirige os passos.\" - Provérbios 16:9",
    "\"Peçam, e lhes será dado; busquem, e encontrarão.\" - Mateus 7:7",
    "\"O que trabalha com mão remissa empobrece, mas a mão dos diligentes enriquece.\" - Provérbios 10:4",
    "\"Aguarda o Senhor, anima-te, e ele fortalecerá o teu coração.\" - Salmos 27:14",
    "\"Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos.\" - Provérbios 16:3",
    "\"Onde não há conselho os projetos saem vãos, mas com a multidão de conselheiros se confirmam.\" - Provérbios 15:22",
    "\"Tudo o que fizerem, façam de todo o coração, como para o Senhor.\" - Colossenses 3:23",
    "\"O lucro do trabalho árduo é certo, mas o falar sem agir leva à pobreza.\" - Provérbios 14:23"
  ];
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return verses[dayOfYear % verses.length];
}
