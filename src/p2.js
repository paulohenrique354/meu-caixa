'use strict';
/* =====================================================================
   MEU CAIXA — finanças pessoais em um arquivo só.
   Valores sempre em centavos inteiros. Datas sempre "AAAA-MM-DD".
   ===================================================================== */

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESC = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const dFmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dParse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoje = () => dFmt(new Date());
const br = s => s ? s.split('-').reverse().join('/') : '';
const mesAno = s => { const d = dParse(s); return `${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const mesAnoCurto = s => { const d = dParse(s); return `${MESC[d.getMonth()]}/${d.getFullYear()}`; };
const addDias = (s, n) => { const d = dParse(s); d.setDate(d.getDate() + n); return dFmt(d); };
const addMeses = (s, n) => {
  const d = dParse(s), dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return dFmt(d);
};
const diasEntre = (a, b) => Math.round((dParse(b) - dParse(a)) / 864e5);

function intervalo(tipo, ref) {
  const d = dParse(ref), y = d.getFullYear(), m = d.getMonth();
  if (tipo === 'dia') return { ini: ref, fim: ref, rot: ref === hoje() ? 'Hoje' : br(ref) };
  if (tipo === 'semana') { const ini = addDias(ref, -((d.getDay() + 6) % 7)), fim = addDias(ini, 6); return { ini, fim, rot: `${br(ini).slice(0, 5)} a ${br(fim).slice(0, 5)}` }; }
  if (tipo === 'mes') return { ini: dFmt(new Date(y, m, 1)), fim: dFmt(new Date(y, m + 1, 0)), rot: cap(mesAno(ref)) };
  if (tipo === 'trimestre') { const q = Math.floor(m / 3); return { ini: dFmt(new Date(y, q * 3, 1)), fim: dFmt(new Date(y, q * 3 + 3, 0)), rot: `${q + 1}º trimestre de ${y}` }; }
  return { ini: `${y}-01-01`, fim: `${y}-12-31`, rot: String(y) };
}
const mover = (tipo, ref, n) => tipo === 'dia' ? addDias(ref, n) : tipo === 'semana' ? addDias(ref, 7 * n) : addMeses(ref, tipo === 'mes' ? n : tipo === 'trimestre' ? 3 * n : 12 * n);

/* dinheiro */
const num = c => (Math.abs(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (c, forcar) => (DB.config.ocultar && !forcar) ? 'R$ ••••' : (c < 0 ? '-' : '') + 'R$ ' + num(c);
const pct = x => x == null ? '—' : Math.round(x * 100) + '%';
const centsDe = el => parseInt(String(el?.value || '').replace(/\D/g, '') || '0', 10);
const paraCentavos = v => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 100) : 0; };

/* ---------- ícones (traço, sem emoji) ---------- */
const I = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', lista: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  graf: 'M4 20V10M10 20V4M16 20v-7M22 20H2', grade: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', mais: 'M12 5v14M5 12h14',
  sino: 'M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9M10 20a2 2 0 0 0 4 0',
  olho: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  olhoX: 'M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  cadeado: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  imagem: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01',
  lapis: 'M4 20v-3.5L16.5 4a2.1 2.1 0 0 1 3 3L7 19.500 4 20zM14.5 6l3.5 3.500', lixo: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  esq: 'M15 5l-7 7 7 7', dir: 'M9 5l7 7-7 7', cima: 'M6 15l6-6 6 6', baixo: 'M6 9l6 6 6-6', x: 'M6 6l12 12M18 6L6 18', ok: 'M5 12.500l4.5 4.500L19 7.500',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  trofeu: 'M8 4h8v6a4 4 0 0 1-8 0V4zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 20h8',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4', sobe: 'M12 19V5M6 11l6-6 6 6', desce: 'M12 5v14M6 13l6 6 6-6',
  ajustes: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.500v5M8 14.500v5', baixar: 'M12 4v11M7 11l5 5 5-5M4 20h16', enviar: 'M12 16V5M7 9l5-5 5 5M4 20h16',
  ajuda: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.500a2.5 2.500 0 1 1 3.6 2.200c-.7.4-1.1 1-1.1 1.800M12 17h.01',
  banco: 'M3 10l9-6 9 6M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 20h18', agenda: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
  nota: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6', repete: 'M4 12V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H6M9 21l-3-3 3-3',
  sair: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9',
  carteira: 'M4 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1zM16 13h4v3h-4a1.500 1.500 0 0 1 0-3z',
  alvo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.500a4.500 4.500 0 1 0 0 9 4.500 4.500 0 0 0 0-9zM12 11.500v1',
  cedula: 'M3 7h18v10H3zM12 9.500a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM6 10v4M18 10v4', pessoa: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
  chave: 'M14.500 4a5.500 5.500 0 1 0 0 11 5.500 5.500 0 0 0 0-11zM10.500 13.500 3 21M6 18l2.500 2.500', alerta: 'M12 4l9 16H3L12 4zM12 10v4M12 17h.01',
  carrinho: 'M3 4h2.500l2 11h10.500l2-8H6.500M9 19v.5M17 19v.5', raio: 'M13 3 5 13.500h6L10 21l8-10.500h-6L13 3z',
  carro: 'M5 16v-5l2-5h10l2 5v5M3 16h18v3H3zM7 19v1.500M17 19v1.500M5 11h14', coracao: 'M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z',
  livro: 'M5 4h13v16H6.500A1.500 1.500 0 0 1 5 18.500V4zM5 18.500A1.500 1.500 0 0 1 6.500 17H18M9 8h5', cartao: 'M3 6h18v12H3zM3 10h18M7 15h3',
  pata: 'M12 13c-2.500 0-4.500 2-4.500 4 0 1.500 1.200 2.500 2.700 2.500.7 0 1.200-.3 1.800-.3s1.100.3 1.800.3c1.500 0 2.700-1 2.700-2.500 0-2-2-4-4.500-4zM7 9v1M17 9v1M10 5.500v1M14 5.500v1',
  garfo: 'M7 3v7a2 2 0 0 0 4 0V3M9 12v9M17 3c-2 1.500-3 4-3 7h3v11', xicara: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8zM16 10h2a2 2 0 0 1 0 5h-2M8 3v2M12 3v2',
  aviao: 'M3 13l18-8-6 16-3-7-9-1z', camisa: 'M8 4l4 2 4-2 5 4-3 3-2-1.500V20H8V9.500L6 11 3 8l5-4z', brilho: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z',
  tela: 'M4 5h16v12H4zM10 8.500l5 2.500-5 2.500v-5zM8 21h8', presente: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.500-3-5-3-5-1s3 1 5 1zM12 7c1.500-3 5-3 5-1s-3 1-5 1z',
  sacola: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 0 1 6 0v2', pontos: 'M6 12h.01M12 12h.01M18 12h.01', tendencia: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  maleta: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16', porcento: 'M19 5 5 19M7.500 5a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM16.500 14a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5z',
  volta: 'M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2', casa2: 'M4 11l8-7 8 7v9H4v-9zM10 20v-5h4v5'
};
const ic = (n, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[n] || I.pontos}"/></svg>`;
const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 14 31 7a3 3 0 0 1 4 2.800V14" fill="none" stroke="#7A4DFF" stroke-width="3.200" stroke-linecap="round"/><rect x="5" y="13" width="38" height="28" rx="7" fill="#7A4DFF"/><rect x="31" y="23" width="12" height="9" rx="4.500" fill="#000"/><circle cx="36" cy="27.500" r="1.700" fill="#7A4DFF"/><path d="M11 34l6-6 4 3 6-7" fill="none" stroke="#fff" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"/><path d="M23.500 23.500H27.500V27.500" fill="none" stroke="#fff" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CURVA_TOPO = `<svg class="curva" viewBox="0 0 200 120" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><path d="M60 0C90 50 140 80 200 84V0z" fill="#7A4DFF"/><path d="M104 0c20 30 54 50 96 54V0z" fill="#4A2BB0"/></svg>`;

/* ---------- categorias ---------- */
const GRUPOS = { essencial: { nome: 'Essencial', cor: '#3D7BD9' }, estilo: { nome: 'Estilo de vida', cor: '#D9822B' }, futuro: { nome: 'Futuro', cor: '#1FA855' } };
const CATS = [
  ['moradia', 'Moradia', 'essencial', 'home', '#3D7BD9'], ['mercado', 'Mercado', 'essencial', 'carrinho', '#2E9E8F'],
  ['contas', 'Contas da casa', 'essencial', 'raio', '#C9A227'], ['transporte', 'Transporte', 'essencial', 'carro', '#5B6BD6'],
  ['saude', 'Saúde', 'essencial', 'coracao', '#D6456B'], ['educacao', 'Educação', 'essencial', 'livro', '#7A5AD6'],
  ['dividas', 'Dívidas', 'essencial', 'cartao', '#8A8F9C'], ['pets', 'Pets', 'essencial', 'pata', '#A9713E'],
  ['restaurantes', 'Restaurantes e jantar', 'estilo', 'garfo', '#D9822B'], ['lanches', 'Lanches e cafés', 'estilo', 'xicara', '#B8612A'],
  ['lazer', 'Lazer e viagens', 'estilo', 'aviao', '#2D9CDB'], ['roupas', 'Roupas e calçados', 'estilo', 'camisa', '#B04FC4'],
  ['beleza', 'Perfumes e beleza', 'estilo', 'brilho', '#E0679A'], ['assinaturas', 'Assinaturas', 'estilo', 'tela', '#6C7A89'],
  ['cuidados', 'Cuidados pessoais', 'estilo', 'pessoa', '#4FA3A5'], ['presentes', 'Presentes', 'estilo', 'presente', '#C4524F'],
  ['compras', 'Outras compras', 'estilo', 'sacola', '#9C8A5E'], ['outros', 'Outros gastos', 'estilo', 'pontos', '#70707A'],
  ['reserva', 'Reserva de emergência', 'futuro', 'escudo', '#1FA855'], ['cofrinhos', 'Cofrinhos e metas', 'futuro', 'alvo', '#3BB273'],
  ['investimentos', 'Investimentos', 'futuro', 'tendencia', '#0E8F6E'],
  ['salario', 'Salário', 'entrada', 'maleta', '#1FA855'], ['extra', 'Renda extra', 'entrada', 'cedula', '#2E9E8F'],
  ['rendimentos', 'Rendimentos', 'entrada', 'porcento', '#0E8F6E'], ['reembolso', 'Reembolso', 'entrada', 'volta', '#3D7BD9'],
  ['resgate', 'Resgate de cofrinho', 'entrada', 'alvo', '#6C7A89'], ['outras', 'Outras entradas', 'entrada', 'pontos', '#70707A']
].map(([id, nome, grupo, icone, cor]) => ({ id, nome, grupo, icone, cor }));
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const cat = id => CAT[id] || { id, nome: 'Sem categoria', grupo: 'estilo', icone: 'pontos', cor: '#70707A' };
const grupoDe = id => cat(id).grupo;
const CATS_SAIDA = CATS.filter(c => c.grupo !== 'entrada'), CATS_ENTRADA = CATS.filter(c => c.grupo === 'entrada');
const FORMAS = { pix: 'Pix', debito: 'Débito', credito: 'Crédito', dinheiro: 'Dinheiro', boleto: 'Boleto' };
const TIPOS_COF = { emergencia: ['Emergência', 'escudo'], viagem: ['Viagem', 'aviao'], casa: ['Casa', 'casa2'], carro: ['Carro', 'carro'], presentes: ['Presentes', 'presente'], sonho: ['Outro sonho', 'brilho'] };
const TIPOS_CONTA = ['Conta corrente', 'Poupança', 'Conta digital', 'Carteira (dinheiro)', 'Investimentos'];
const CORES_CONTA = ['#E11D2A', '#D9822B', '#C9A227', '#1FA855', '#2E9E8F', '#3D7BD9', '#7A5AD6', '#B04FC4', '#4A4A55'];
const MODELO_IA = 'claude-sonnet-5-5';

/* ---------- armazenamento (IndexedDB, com localStorage de reserva) ---------- */
/* Alguns jeitos de abrir o arquivo (pré-visualizações, modo restrito) bloqueiam o armazenamento do navegador.
   Nesse caso o app funciona só na memória e avisa que nada ficará guardado, em vez de quebrar. */
let SEM_DISCO = false;
function guarda(tipo) {
  try { const s = window[tipo]; s.setItem('_mc', '1'); s.removeItem('_mc'); return s; }
  catch (e) { SEM_DISCO = true; const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
}
const LS = guarda('localStorage'), SS = guarda('sessionStorage');
const STORES = ['lancamentos', 'cofrinhos', 'contas', 'config'];
const DB = { lancamentos: [], cofrinhos: [], contas: [], config: {} };
const CONFIG_PADRAO = { id: 'config', nome: '', foto: '', fotoLogin: '', orcamentos: {}, metaEconomia: 0, salario: { valor: 0, dia: 5, conta: '' }, indicadores: ['poupanca', 'comprometida', 'diario', 'reserva'], tema: 'escuro', ocultar: false, apiKey: '' };
let idb = null;

function abrirBanco() {
  return new Promise((res, rej) => {
    let req; try { req = indexedDB.open('meucaixa', 1); } catch (e) { return rej(e); }
    req.onupgradeneeded = () => STORES.forEach(s => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' }); });
    /* se outra aba pedir para mexer no banco, esta solta a conexão em vez de travar a outra */
    req.onsuccess = () => { clearTimeout(t); req.result.onversionchange = () => req.result.close(); res(req.result); };
    req.onerror = () => { clearTimeout(t); rej(req.error); };
    const t = setTimeout(() => rej(new Error('ocupado')), 6000);
  });
}
const lerTudo = s => new Promise((res, rej) => { const r = idb.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

async function carregar() {
  try {
    idb = await abrirBanco();
    for (const s of STORES) { const v = await lerTudo(s); if (s === 'config') DB.config = v[0] || {}; else DB[s] = v; }
  } catch (e) {
    if (e && e.message === 'ocupado') throw e; /* banco preso por outra aba: não abrir vazio por cima dos dados */
    idb = null; console.warn('IndexedDB indisponível, usando localStorage', e);
    for (const s of STORES) { const t = LS.getItem('mc_' + s); if (t) DB[s] = JSON.parse(t); }
  }
  DB.config = { ...CONFIG_PADRAO, ...DB.config, salario: { ...CONFIG_PADRAO.salario, ...(DB.config.salario || {}) } };
  try { navigator.storage?.persist?.(); } catch (e) { /* pedido de armazenamento persistente é opcional */ }
}
function aplicarMem(ops) {
  for (const o of ops) {
    if (o.s === 'config') { DB.config = o.put; continue; }
    const arr = DB[o.s], i = arr.findIndex(x => x.id === (o.put ? o.put.id : o.del));
    if (o.put) { if (i >= 0) arr[i] = o.put; else arr.push(o.put); } else if (i >= 0) arr.splice(i, 1);
  }
}
/* Grava várias operações de uma vez: ou entram todas, ou nenhuma. A memória só muda depois que o disco confirmou. */
async function gravar(ops) {
  if (!ops.length) return true;
  try {
    if (idb) {
      const tentar = () => new Promise((res, rej) => {
        const tx = idb.transaction([...new Set(ops.map(o => o.s))], 'readwrite');
        ops.forEach(o => { const st = tx.objectStore(o.s); o.put ? st.put(o.put) : st.delete(o.del); });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Gravação cancelada'));
      });
      /* se a conexão com o banco tiver sido fechada (outra aba, app em segundo plano), reabre e tenta uma vez */
      try { await tentar(); } catch (e) { if (e?.name !== 'InvalidStateError') throw e; idb = await abrirBanco(); await tentar(); }
      aplicarMem(ops);
    } else {
      const afet = [...new Set(ops.map(o => o.s))], copia = Object.fromEntries(afet.map(s => [s, JSON.stringify(DB[s])]));
      aplicarMem(ops);
      try { afet.forEach(s => LS.setItem('mc_' + s, JSON.stringify(DB[s]))); }
      catch (e) { afet.forEach(s => { DB[s] = JSON.parse(copia[s]); try { LS.setItem('mc_' + s, copia[s]); } catch (_) { /* volta ao que cabia */ } }); throw e; }
    }
    return true;
  } catch (e) {
    console.error('Erro ao gravar', e);
    const cheio = /quota/i.test((e && (e.name + ' ' + e.message)) || '');
    toast(cheio ? 'Sem espaço no aparelho para salvar. Libere espaço ou apague fotos antigas e tente de novo. Nada foi perdido.'
      : 'Não foi possível salvar agora. Seus dados anteriores continuam guardados. Tente de novo.', true);
    return false;
  }
}
const salvarConfig = patch => gravar([{ s: 'config', put: { ...DB.config, ...patch, id: 'config' } }]);

/* ---------- senha (SHA-256, nunca em texto puro) ---------- */
function sha256Js(bytes) {
  const K = [], H = []; let n = 2, c = 0; const frac = x => ((x - Math.floor(x)) * 4294967296) | 0;
  while (c < 64) { let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; } if (p) { if (c < 8) H[c] = frac(Math.sqrt(n)); K[c++] = frac(Math.cbrt(n)); } n++; }
  const l = bytes.length, tam = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(tam); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(tam - 8, Math.floor(l / 536870912)); dv.setUint32(tam - 4, (l << 3) >>> 0);
  const w = new Int32Array(64), rot = (x, r) => (x >>> r) | (x << (32 - r));
  for (let o = 0; o < tam; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) | 0; }
    let [a, b, c2, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c2) ^ (b & c2))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c2; c2 = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c2) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
async function sha256(txt) {
  const b = new TextEncoder().encode(txt);
  if (window.crypto?.subtle) { try { const h = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { /* cai no cálculo próprio */ } }
  return sha256Js(b);
}
const Auth = {
  ler() { try { return JSON.parse(LS.getItem('mc_auth') || 'null'); } catch (e) { return null; } },
  async criar(senha, usuario) { const sal = uid() + uid(); LS.setItem('mc_auth', JSON.stringify({ usuario: usuario ?? this.ler()?.usuario ?? '', sal, hash: await sha256(sal + senha) })); },
  async confere(senha, usuario) { const a = this.ler(); if (!a) return false; const okUsu = usuario == null || !a.usuario || semAcento(usuario.trim()) === semAcento(a.usuario); return a.hash === await sha256(a.sal + senha) && okUsu; },
  apagar() { LS.removeItem('mc_auth'); this.sair(); },
  entrar(lembrar) { SS.setItem('mc_sessao', '1'); if (lembrar) LS.setItem('mc_lembrar', String(Date.now() + 30 * 864e5)); else LS.removeItem('mc_lembrar'); },
  sair() { SS.removeItem('mc_sessao'); LS.removeItem('mc_lembrar'); },
  logado() { return !!this.ler() && (SS.getItem('mc_sessao') === '1' || Number(LS.getItem('mc_lembrar') || 0) > Date.now()); }
};

/* ---------- regras financeiras ---------- */
const entre = (ini, fim) => DB.lancamentos.filter(l => l.data >= ini && l.data <= fim);
const soma = (arr, f) => arr.reduce((t, l) => (!f || f(l)) ? t + l.valor : t, 0);
/* Renda = entradas sem "resgate de cofrinho": resgatar é mexer na própria poupança, não ganhar dinheiro. */
function resumo(ls) {
  const ent = soma(ls, l => l.tipo === 'entrada'), sai = soma(ls, l => l.tipo === 'saida');
  const renda = soma(ls, l => l.tipo === 'entrada' && l.categoria !== 'resgate');
  const fut = soma(ls, l => l.tipo === 'saida' && grupoDe(l.categoria) === 'futuro');
  const ess = soma(ls, l => l.tipo === 'saida' && grupoDe(l.categoria) === 'essencial');
  const fixas = soma(ls, l => l.tipo === 'saida' && l.fixo), consumo = sai - fut;
  return { ent, sai, renda, fut, ess, est: consumo - ess, consumo, fixas, saldo: ent - sai, eco: renda - consumo, taxa: renda > 0 ? (renda - consumo) / renda : null, comp: renda > 0 ? fixas / renda : null };
}
const variacao = (a, b) => b ? (a - b) / Math.abs(b) : null;
/* Contas de banco e cartões de crédito ficam na mesma coleção "contas"; o cartão tem cartao:true. */
const contasBanco = () => DB.contas.filter(c => !c.cartao);
const cartoes = () => DB.contas.filter(c => c.cartao);
function saldoConta(c) {
  if (c.cartao) return -limiteUsado(c);
  const depois = (data, em) => data > c.dataAjuste || (data === c.dataAjuste && em > c.ajusteEm);
  let s = DB.lancamentos.reduce((t, l) => l.conta === c.id && depois(l.data, l.criadoEm) ? t + (l.tipo === 'entrada' ? l.valor : -l.valor) : t, c.saldoInicial);
  /* pagamento de fatura tira dinheiro da conta, mas não é gasto novo: as compras já foram contadas */
  cartoes().forEach(k => Object.values(k.pagas || {}).forEach(p => { if (p.conta === c.id && depois(p.data, p.em)) s -= p.valor; }));
  return s;
}
const totalContas = () => contasBanco().reduce((t, c) => t + saldoConta(c), 0);

/* ---------- cartão de crédito ----------
   Cada compra (ou parcela) é um lançamento com:
   dataCompra = dia da compra · fatura = 'AAAA-MM' do vencimento · data = dia do vencimento.
   Como relatórios e orçamento usam "data", o gasto conta no mês em que o dinheiro sai (como no Mobills e no Organizze). */
const ymMais = (ym, n) => addMeses(ym + '-01', n).slice(0, 7);
const diaNoMes = (ym, dia) => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(Math.min(dia, new Date(y, m, 0).getDate())).padStart(2, '0')}`; };
const dividir = (v, n) => Array.from({ length: n }, (_, i) => Math.floor(v / n) + (i < v % n ? 1 : 0));
/* Compra no dia do fechamento ou depois entra na fatura seguinte. Se o vencimento é antes do fechamento no calendário, vence no mês seguinte ao fechamento. */
function faturaDe(k, dataCompra, parcela = 0) {
  let fech = dataCompra.slice(0, 7);
  if (Number(dataCompra.slice(8)) >= k.fechamento) fech = ymMais(fech, 1);
  const ym = ymMais(k.vencimento > k.fechamento ? fech : ymMais(fech, 1), parcela);
  return { fatura: ym, data: diaNoMes(ym, k.vencimento) };
}
function resumoFatura(k, ym) {
  const ls = DB.lancamentos.filter(l => l.cartao === k.id && l.fatura === ym), h = hoje();
  const total = soma(ls, l => l.tipo === 'saida') - soma(ls, l => l.tipo === 'entrada');
  const venc = diaNoMes(ym, k.vencimento), fech = diaNoMes(k.vencimento > k.fechamento ? ym : ymMais(ym, -1), k.fechamento), pagamento = k.pagas?.[ym] || null;
  /* compra lançada depois numa fatura já paga: a fatura volta a ter saldo a pagar */
  const pago = pagamento?.valor || 0, falta = Math.max(total - pago, 0);
  const status = pagamento && !falta ? 'paga' : h > venc ? (falta > 0 ? 'atrasada' : 'fechada') : h >= fech ? 'fechada' : 'aberta';
  return { ym, ls, total, pago, falta, venc, fech, status, pagamento };
}
function limiteUsado(k) {
  const por = {}; DB.lancamentos.forEach(l => { if (l.cartao === k.id) por[l.fatura] = (por[l.fatura] || 0) + (l.tipo === 'saida' ? l.valor : -l.valor); });
  return Object.entries(por).reduce((t, [ym, v]) => t + Math.max(v - (k.pagas?.[ym]?.valor || 0), 0), 0);
}
/* A fatura que importa agora: a mais antiga ainda não paga (fechada ou atrasada); se não houver, a que está aberta. */
function faturaDestaque(k) {
  const atual = faturaDe(k, hoje()).fatura;
  const pend = [...new Set(DB.lancamentos.filter(l => l.cartao === k.id && l.fatura < atual).map(l => l.fatura))].sort();
  return pend.find(ym => resumoFatura(k, ym).falta > 0) || atual;
}
/* Pessoas que já aparecem no app: quem gastou, titulares de cartão e o próprio usuário. */
const pessoas = () => [...new Set([DB.config.nome, ...cartoes().map(k => k.titular), ...DB.lancamentos.map(l => l.pessoa)].map(x => (x || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const titularDe = id => DB.contas.find(c => c.id === id)?.titular || '';
const tituloLanc = l => (l.descricao || l.local || cat(l.categoria).nome) + (l.parcela ? ` (${l.parcela.n}/${l.parcela.de})` : '');

/* ---------- contas fixas ----------
   O mês de um lançamento no cartão é o da compra, não o da fatura; senão a cópia sairia duplicada. */
const mesDoGasto = l => (l.dataCompra || l.data).slice(0, 7);
function fixosPendentes() {
  const anterior = addMeses(hoje().slice(0, 8) + '01', -1).slice(0, 7), ja = new Set(DB.lancamentos.map(l => l.origem).filter(Boolean));
  return DB.lancamentos.filter(l => l.fixo && !l.chaveSalario && !l.cofrinhoId && !l.grupo && mesDoGasto(l) === anterior && !ja.has(l.id));
}
function copiaFixo(l, k = 0) {
  const iv = intervalo('mes', hoje()), ult = Number(iv.fim.slice(8)), cartao = l.cartao && cartoes().find(c => c.id === l.cartao);
  const base = { ...l, id: uid(), origem: l.id, itens: [], chaveNota: '', foto: '', nota: null, grupo: '', parcela: null, criadoEm: Date.now() + k };
  if (cartao) { const dc = addMeses(l.dataCompra || l.data, 1); return { ...base, dataCompra: dc, ...faturaDe(cartao, dc) }; }
  return { ...base, cartao: '', fatura: '', dataCompra: '', data: iv.ini.slice(0, 8) + String(Math.min(Number(l.data.slice(8)), ult)).padStart(2, '0') };
}

/* ---------- sugestão de categoria ----------
   1º o histórico (mesma descrição já lançada repete categoria, forma e conta); 2º palavras-chave comuns no Brasil. */
const REGRAS_SAI = [
  [/\b(uber|99|99pop|taxi|onibus|metro|trem|posto|gasolina|etanol|combustivel|estacionamento|pedagio|bilhete unico|sem parar)\b/, 'transporte'],
  [/\b(ifood|rappi|restaurante|pizza|pizzaria|hamburguer|burger|churrascaria|sushi|almoco|jantar|marmita|delivery)\b/, 'restaurantes'],
  [/\b(padaria|cafe|cafeteria|lanche|lanchonete|sorvete|acai|salgado|pastel)\b/, 'lanches'],
  [/\b(mercado|supermercado|atacadao|assai|carrefour|hortifruti|feira|acougue|sacolao|atacarejo)\b/, 'mercado'],
  [/\b(farmacia|drogaria|drogasil|remedio|medico|consulta|exame|dentista|hospital|plano de saude|academia)\b/, 'saude'],
  [/\b(netflix|spotify|prime video|amazon prime|disney|hbo|youtube|deezer|globoplay|icloud|google one|assinatura|chatgpt|claude)\b/, 'assinaturas'],
  [/\b(luz|energia|enel|cemig|copel|light|celpe|coelba|agua|sabesp|copasa|internet|wifi|telefone|celular|vivo|claro|tim|oi|gas|botijao)\b/, 'contas'],
  [/\b(aluguel|condominio|iptu|financiamento|reforma)\b/, 'moradia'],
  [/\b(escola|faculdade|curso|livro|livros|apostila|mensalidade escolar|material escolar)\b/, 'educacao'],
  [/\b(pet|petshop|racao|veterinario|banho e tosa)\b/, 'pets'],
  [/\b(roupa|roupas|tenis|sapato|calcado|camisa|calca|vestido|renner|riachuelo|cea|shein)\b/, 'roupas'],
  [/\b(perfume|maquiagem|boticario|natura|salao|cabelo|barbearia|manicure|estetica)\b/, 'beleza'],
  [/\b(cinema|show|ingresso|viagem|hotel|passagem|airbnb|pousada|parque)\b/, 'lazer'],
  [/\b(presente|aniversario)\b/, 'presentes'],
  [/\b(emprestimo|juros|acordo|divida|consignado)\b/, 'dividas'],
  [/\b(shopee|mercado livre|amazon|magalu|aliexpress)\b/, 'compras']
];
const REGRAS_ENT = [
  [/\b(salario|pagamento|holerite|adiantamento|13o|decimo terceiro|ferias)\b/, 'salario'],
  [/\b(freela|freelance|extra|venda|vendas|bico|comissao|servico)\b/, 'extra'],
  [/\b(rendimento|rendimentos|juros|dividendo|dividendos|cdb|poupanca|tesouro)\b/, 'rendimentos'],
  [/\b(reembolso|estorno|devolucao|cashback)\b/, 'reembolso']
];
function sugestao(desc, tipo) {
  const d = semAcento(desc).trim(); if (d.length < 2) return null;
  const h = DB.lancamentos.filter(l => l.tipo === tipo && !l.cofrinhoId && !l.chaveSalario && semAcento(l.descricao).trim() === d).sort((a, b) => b.criadoEm - a.criadoEm)[0];
  if (h) return { categoria: h.categoria, forma: h.forma, conta: h.conta, cartao: h.cartao, local: h.local, fonte: 'hist', de: h.descricao };
  const r = (tipo === 'entrada' ? REGRAS_ENT : REGRAS_SAI).find(([re]) => re.test(d));
  return r ? { categoria: r[1], fonte: 'regra' } : null;
}

const guardado = c => c.movimentos.reduce((t, m) => t + (m.tipo === 'deposito' ? m.valor : -m.valor), 0);
function sigla(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter(w => w && !/^(do|da|de|dos|das|e)$/i.test(w));
  if (!p.length) return '?';
  return (p.length > 1 ? p.slice(0, 3).map(w => w[0]).join('') : p[0].slice(0, 2)).toUpperCase();
}
/* Custo essencial mensal: média dos últimos 3 meses fechados que têm lançamento; sem histórico, usa o mês atual. */
function custoEssencial() {
  const h = hoje(); let tot = 0, n = 0;
  for (let i = 1; i <= 3; i++) { const iv = intervalo('mes', addMeses(h, -i)), v = resumo(entre(iv.ini, iv.fim)).ess; if (v > 0) { tot += v; n++; } }
  if (n) return Math.round(tot / n);
  const iv = intervalo('mes', h); return resumo(entre(iv.ini, iv.fim)).ess;
}
const gastoPorCategoria = ls => { const m = {}; ls.forEach(l => { if (l.tipo === 'saida') m[l.categoria] = (m[l.categoria] || 0) + l.valor; }); return m; };
function alertas() {
  const h = hoje(), iv = intervalo('mes', h), ls = entre(iv.ini, iv.fim), r = resumo(ls), g = gastoPorCategoria(ls), out = [];
  for (const [k, lim] of Object.entries(DB.config.orcamentos || {})) {
    if (!lim) continue; const u = (g[k] || 0) / lim;
    if (u >= 1) out.push({ n: 'al', t: `${cat(k).nome} passou do limite`, d: `Gastou ${fmt(g[k])} de ${fmt(lim)} (${pct(u)}).` });
    else if (u >= .85) out.push({ n: 'at', t: `${cat(k).nome} perto do limite`, d: `Já usou ${pct(u)} de ${fmt(lim)}.` });
  }
  if (r.taxa != null && r.taxa < .1) out.push({ n: 'al', t: 'Poupança abaixo de 10%', d: `Neste mês você guardou ${pct(Math.max(r.taxa, 0))} da renda. O saudável é 20% ou mais.` });
  contasBanco().forEach(c => { const s = saldoConta(c); if (s < 0) out.push({ n: 'al', t: `${c.nome} está negativa`, d: `Saldo de ${fmt(s)}.` }); });
  cartoes().forEach(k => {
    const f = resumoFatura(k, faturaDestaque(k)), d = diasEntre(h, f.venc);
    if (f.falta > 0) {
      if (d < 0) out.push({ n: 'al', t: `Fatura do ${k.nome} atrasada`, d: `Venceu em ${br(f.venc)}: faltam ${fmt(f.falta)}.` });
      else if (d <= 3) out.push({ n: 'at', t: `Fatura do ${k.nome} vence ${d === 0 ? 'hoje' : `em ${d} dia${d > 1 ? 's' : ''}`}`, d: `${fmt(f.falta)} em ${br(f.venc)}.` });
    }
    if (k.limite) { const u = limiteUsado(k) / k.limite; if (u >= .9) out.push({ n: u >= 1 ? 'al' : 'at', t: `Limite do ${k.nome} ${u >= 1 ? 'estourado' : 'quase no fim'}`, d: `Usado ${pct(u)} de ${fmt(k.limite)}.` }); }
  });
  DB.cofrinhos.forEach(c => {
    if (!c.prazo || (c.meta && guardado(c) >= c.meta)) return; const d = diasEntre(h, c.prazo);
    if (d < 0) out.push({ n: 'al', t: `Prazo do cofrinho "${c.nome}" venceu`, d: `Era ${br(c.prazo)}. Faltam ${fmt(Math.max(c.meta - guardado(c), 0))}.` });
    else if (d <= 60) out.push({ n: 'at', t: `Cofrinho "${c.nome}" vence em ${d} dia${d === 1 ? '' : 's'}`, d: `Faltam ${fmt(Math.max(c.meta - guardado(c), 0))} até ${br(c.prazo)}.` });
  });
  return out;
}
/* Desconto da nota: se os itens somam mais que o total, tira proporcionalmente, centavo a centavo, sem sobrar diferença. */
function ajustarItens(itens, total) {
  const s = itens.reduce((t, i) => t + i.valor, 0), base = itens.map(i => ({ ...i }));
  if (!total || !s || s === total) return { itens: base, total: total || s, desconto: 0, falta: 0 };
  if (s < total) return { itens: [...base, { descricao: 'Diferença não identificada na nota', qtd: 1, valor: total - s, categoria: 'outros' }], total, desconto: 0, falta: total - s };
  const desc = s - total; let resto = desc;
  base.forEach(i => { const d = Math.floor(desc * i.valor / s); i._f = (desc * i.valor) % s; i.valor -= d; resto -= d; });
  base.filter(i => i.valor > 0).sort((a, b) => b._f - a._f).slice(0, resto).forEach(i => i.valor--);
  base.forEach(i => delete i._f);
  return { itens: base, total, desconto: desc, falta: 0 };
}
/* Chave da NFC-e (44 dígitos): UF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) emissão(1) código(8) dígito(1). */
function lerChaveNfce(texto) {
  const m = String(texto || '').replace(/\s/g, '').match(/(?:^|\D)(\d{44})(?:\D|$)/); if (!m) return null;
  const k = m[1]; return { chave: k, cnpj: k.slice(6, 20), numero: String(parseInt(k.slice(25, 34), 10)), link: /^https?:\/\//i.test(texto) ? texto : '' };
}
const cnpjFmt = c => /^\d{14}$/.test(c || '') ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (c || '');

/* ---------- interface: base ---------- */
const state = { tela: 'inicio', per: { tipo: 'mes', ref: hoje() }, rel: { tipo: 'mes', ref: hoje() }, filtro: '', busca: '', limite: 80, cofre: null, nota: null, edit: null };
let toastT;
function toast(msg, erro) { const t = $('#toast'); t.textContent = msg; t.className = 'on' + (erro ? ' erro' : ''); clearTimeout(toastT); toastT = setTimeout(() => t.className = '', erro ? 5200 : 2600); }
function abrirSheet(html) { $('#sheetBox').innerHTML = html; $('#sheet').hidden = false; $('#sheetBox').scrollTop = 0; }
function fecharSheet() { $('#sheet').hidden = true; $('#sheetBox').innerHTML = ''; }
function confirmar(titulo, msg, ok = 'Confirmar', perigo = true) {
  return new Promise(res => {
    const d = $('#dlg'); d.hidden = false;
    d.innerHTML = `<div class="dlg"><h2>${esc(titulo)}</h2><p>${esc(msg)}</p><div class="linha-bt"><button class="bt sec2" data-r="0">Cancelar</button><button class="bt${perigo ? '' : ' vd'}" data-r="1">${esc(ok)}</button></div></div>`;
    d.onclick = e => { const b = e.target.closest('[data-r]'); if (!b && e.target !== d) return; d.hidden = true; d.onclick = null; res(!!b && b.dataset.r === '1'); };
  });
}
function avisar(titulo, msg) { const d = $('#dlg'); d.hidden = false; d.innerHTML = `<div class="dlg"><h2>${esc(titulo)}</h2><p>${esc(msg)}</p><div class="linha-bt"><button class="bt" data-r="1">Entendi</button></div></div>`; d.onclick = e => { if (e.target.closest('[data-r]') || e.target === d) { d.hidden = true; d.onclick = null; } }; }
function aplicarTema() {
  const t = DB.config.tema, claro = t === 'claro' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = claro ? 'light' : 'dark';
}
const radio = n => $(`input[name="${n}"]:checked`)?.value;
const segm = (nome, ops, val, extra = '') => `<div class="seg ${extra}">${ops.map(([v, r]) => `<label><input type="radio" name="${nome}" value="${v}"${v === val ? ' checked' : ''}${extra === 'tp' ? ' data-c="tipoMudou"' : ''}><span>${r}</span></label>`).join('')}</div>`;
const optsCat = (tipo, val) => tipo === 'entrada'
  ? CATS_ENTRADA.map(c => `<option value="${c.id}"${c.id === val ? ' selected' : ''}>${c.nome}</option>`).join('')
  : Object.entries(GRUPOS).map(([g, G]) => `<optgroup label="${G.nome}">${CATS_SAIDA.filter(c => c.grupo === g).map(c => `<option value="${c.id}"${c.id === val ? ' selected' : ''}>${c.nome}</option>`).join('')}</optgroup>`).join('');
const optsConta = val => `<option value="">Sem conta</option>` + contasBanco().map(c => `<option value="${c.id}"${c.id === val ? ' selected' : ''}>${esc(c.nome)}</option>`).join('');
const nomeConta = id => DB.contas.find(c => c.id === id)?.nome || '';
const optsPagamento = val => optsConta(val) + (cartoes().length ? `<optgroup label="Cartão de crédito">${cartoes().map(c => `<option value="k:${c.id}"${'k:' + c.id === val ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>` : '');
const cab = (titulo, voltar, extra = '') => `<header class="cab"><button class="ib" data-a="ir" data-t="${voltar}" aria-label="Voltar">${ic('esq')}</button><h1>${esc(titulo)}</h1>${extra}</header>`;
const vazio = (icone, txt) => `<div class="vazio">${ic(icone, 34)}${txt}</div>`;
function linhaLanc(l) {
  const c = cat(l.categoria), ent = l.tipo === 'entrada';
  const sub = [c.nome, l.pessoa || '', l.local && l.local !== l.descricao ? l.local : '', l.cartao ? `${nomeConta(l.cartao) || 'Cartão'} · fatura de ${MESC[Number(l.fatura.slice(5)) - 1]}` : FORMAS[l.forma] && !ent ? FORMAS[l.forma] : '', l.fixo ? 'Fixo' : '', l.itens?.length ? `${l.itens.length} ${l.itens.length === 1 ? 'item' : 'itens'}` : ''].filter(Boolean).join(' · ');
  return `<button class="ln" data-a="verLanc" data-id="${l.id}"><span class="ci" style="background:${c.cor}">${ic(c.icone, 20)}</span><span class="tx"><b>${esc(tituloLanc(l))}</b><span>${esc(sub)}</span></span><span class="vl num ${ent ? 'vg' : ''}">${ent ? '+' : '-'} ${fmt(l.valor)}</span></button>`;
}
const ordenar = ls => ls.slice().sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm - a.criadoEm);

/* ---------- gráficos em SVG ---------- */
function grafLinhas(rotulos, a, b) {
  const W = 340, H = 150, px = 8, pt = 10, pb = 22, n = a.length, max = Math.max(1, ...a, ...b);
  const x = i => px + (n === 1 ? (W - 2 * px) / 2 : i * (W - 2 * px) / (n - 1)), y = v => pt + (H - pt - pb) * (1 - v / max);
  const linha = s => s.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = s => `${linha(s)}L${x(n - 1).toFixed(1)} ${H - pb}L${x(0).toFixed(1)} ${H - pb}Z`;
  const passo = Math.max(1, Math.ceil(n / 6));
  const rot = rotulos.map((r, i) => (i % passo === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < passo / 2) ? `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" font-size="10" fill="var(--mu)">${r}</text>` : '').join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de entradas e saídas">
    ${[0, .5, 1].map(f => `<line x1="${px}" x2="${W - px}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="var(--bd)" stroke-width="1"/>`).join('')}
    <path d="${area(a)}" fill="#1FA855" opacity=".16"/><path d="${area(b)}" fill="#E5484D" opacity=".16"/>
    <path d="${linha(a)}" fill="none" stroke="#1FA855" stroke-width="2.200" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${linha(b)}" fill="none" stroke="#E5484D" stroke-width="2.200" stroke-linejoin="round" stroke-linecap="round"/>${rot}</svg>`;
}
function grafRosca(partes, centro) {
  const tot = partes.reduce((t, p) => t + p.v, 0) || 1; let ac = 0;
  const arcos = partes.map(p => { const f = p.v / tot * 100, s = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${p.cor}" stroke-width="5.500" stroke-dasharray="${f.toFixed(2)} ${(100 - f).toFixed(2)}" stroke-dashoffset="${(25 - ac).toFixed(2)}"/>`; ac += f; return s; }).join('');
  return `<svg viewBox="0 0 42 42" role="img" aria-label="Gastos por categoria"><circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--s2)" stroke-width="5.500"/>${arcos}<text x="21" y="20" text-anchor="middle" font-size="3" fill="var(--mu)">Saídas</text><text x="21" y="25" text-anchor="middle" font-size="3.600" font-weight="700" fill="var(--tx)">${esc(centro)}</text></svg>`;
}
function grafBarras(rotulos, ent, sai, acum) {
  const W = 340, H = 160, px = 8, pt = 12, pb = 22, n = rotulos.length, max = Math.max(1, ...ent, ...sai), g = (W - 2 * px) / n, bw = Math.min(14, g / 2 - 3);
  const h = v => (H - pt - pb) * v / max, lo = Math.min(0, ...acum), hi = Math.max(1, ...acum), ya = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)), xc = i => px + g * i + g / 2;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução de entradas, saídas e saldo acumulado">
    <line x1="${px}" x2="${W - px}" y1="${H - pb}" y2="${H - pb}" stroke="var(--bd)"/>
    ${rotulos.map((r, i) => `<rect x="${(xc(i) - bw - 1).toFixed(1)}" y="${(H - pb - h(ent[i])).toFixed(1)}" width="${bw}" height="${h(ent[i]).toFixed(1)}" rx="3" fill="#1FA855"/><rect x="${(xc(i) + 1).toFixed(1)}" y="${(H - pb - h(sai[i])).toFixed(1)}" width="${bw}" height="${h(sai[i]).toFixed(1)}" rx="3" fill="#E5484D"/><text x="${xc(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--mu)">${r}</text>`).join('')}
    <path d="${acum.map((v, i) => `${i ? 'L' : 'M'}${xc(i).toFixed(1)} ${ya(v).toFixed(1)}`).join('')}" fill="none" stroke="var(--tx)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${acum.map((v, i) => `<circle cx="${xc(i).toFixed(1)}" cy="${ya(v).toFixed(1)}" r="2.600" fill="var(--s1)" stroke="var(--tx)" stroke-width="1.600"/>`).join('')}</svg>`;
}
const anel = (f, cor = '#1FA855') => `<div class="anel"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.915" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.28)" stroke-width="4"/><circle cx="21" cy="21" r="15.915" fill="none" stroke="${cor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${Math.min(100, f * 100).toFixed(1)} 100" stroke-dashoffset="25"/></svg><b>${pct(f)}</b></div>`;

/* ---------- recorte de foto (arrastar, barra de zoom e pinça) ---------- */
const FORMATOS = { circulo: { ar: 1, w: 320, h: 320 }, retrato: { ar: 3 / 4, w: 600, h: 800 }, paisagem: { ar: 16 / 9, w: 960, h: 540 } };
function recortar(file, formato) {
  return new Promise(res => {
    const F = FORMATOS[formato], q = $('#crQ'), zoom = $('#crZoom'), url = URL.createObjectURL(file), img = new Image();
    let fw, fh, min, s, x, y; const pts = new Map(); let pinca = null;
    const fim = v => { $('#crop').hidden = true; q.innerHTML = ''; URL.revokeObjectURL(url); q.onpointerdown = q.onpointermove = q.onpointerup = q.onpointercancel = null; res(v); };
    const pinta = () => { x = Math.min(0, Math.max(fw - img.naturalWidth * s, x)); y = Math.min(0, Math.max(fh - img.naturalHeight * s, y)); img.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
    const zoomPara = (ns, cx = fw / 2, cy = fh / 2) => { ns = Math.min(min * 4, Math.max(min, ns)); x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; s = ns; zoom.value = s / min; pinta(); };
    img.onerror = () => { toast('Não consegui abrir essa imagem. Tente outra foto.', true); fim(null); };
    img.onload = () => {
      $('#crop').hidden = false; q.className = 'cr-q' + (formato === 'circulo' ? ' circ' : ''); q.innerHTML = ''; q.appendChild(img);
      const area = q.parentElement.getBoundingClientRect(); fw = Math.min(area.width - 8, 420, (area.height - 8) * F.ar); fh = fw / F.ar;
      q.style.width = fw + 'px'; q.style.height = fh + 'px';
      min = Math.max(fw / img.naturalWidth, fh / img.naturalHeight); s = min; x = (fw - img.naturalWidth * s) / 2; y = (fh - img.naturalHeight * s) / 2; zoom.value = 1; pinta();
    };
    const pos = e => { const r = q.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    q.onpointerdown = e => { q.setPointerCapture(e.pointerId); pts.set(e.pointerId, pos(e)); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinca = { d: Math.hypot(a.x - b.x, a.y - b.y), s }; } };
    q.onpointermove = e => {
      if (!pts.has(e.pointerId)) return; const ant = pts.get(e.pointerId), p = pos(e); pts.set(e.pointerId, p);
      if (pts.size === 1) { x += p.x - ant.x; y += p.y - ant.y; pinta(); }
      else if (pts.size === 2 && pinca) { const [a, b] = [...pts.values()]; zoomPara(pinca.s * Math.hypot(a.x - b.x, a.y - b.y) / (pinca.d || 1), (a.x + b.x) / 2, (a.y + b.y) / 2); }
    };
    q.onpointerup = q.onpointercancel = e => { pts.delete(e.pointerId); pinca = null; };
    zoom.oninput = () => zoomPara(min * Number(zoom.value));
    $('#crCancel').onclick = () => fim(null);
    $('#crOk').onclick = () => {
      try {
        const c = document.createElement('canvas'); c.width = F.w; c.height = F.h; const g = c.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, F.w, F.h); g.drawImage(img, -x / s, -y / s, fw / s, fh / s, 0, 0, F.w, F.h);
        fim(c.toDataURL('image/jpeg', .82));
      } catch (e) { toast('Não consegui preparar a foto. Tente outra imagem.', true); fim(null); }
    };
    img.src = url;
  });
}
function escolherFoto(formato) {
  return new Promise(res => {
    const inp = $('#fileFoto'); inp.value = '';
    inp.onchange = async () => { const f = inp.files[0]; inp.onchange = null; res(f ? await recortar(f, formato) : null); };
    inp.click();
  });
}
