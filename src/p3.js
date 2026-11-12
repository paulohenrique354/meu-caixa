
/* =====================================================================
   TELAS
   ===================================================================== */
const seta = (v, ruimSeSobe) => v == null ? `<span class="vv">sem comparação</span>`
  : `<span class="vv">${ic(v >= 0 ? 'sobe' : 'desce', 12)}${Math.abs(Math.round(v * 100))}% vs. período anterior</span>`;
const corVar = (v, ruimSeSobe) => v == null || v === 0 ? 'mu' : ((v > 0) !== !!ruimSeSobe ? 'vg' : 'vr');
function diagnostico(r) {
  if (!r.renda) return { n: 'nt', i: 'ajuda', t: 'Sem diagnóstico ainda', d: 'Lance suas entradas deste período para ver como está sua economia.' };
  const y = pct(Math.max(r.taxa, 0));
  if (r.eco < 0) return { n: 'al', i: 'alerta', t: 'Alerta: gastou mais do que ganhou', d: `Os gastos passaram da renda em ${fmt(-r.eco)}.` };
  if (r.taxa >= .2) return { n: 'ok', i: 'ok', t: 'Você está no caminho certo!', d: `Economizou ${fmt(r.eco)} (${y} da renda).` };
  if (r.taxa >= .1) return { n: 'at', i: 'alerta', t: 'Atenção com os gastos', d: `Economizou ${fmt(r.eco)} (${y} da renda). O saudável é 20% ou mais.` };
  return { n: 'al', i: 'alerta', t: 'Alerta: sobrou pouco', d: `Economizou só ${fmt(r.eco)} (${y} da renda). Abaixo de 10% pede corte de gastos.` };
}
function serieInicio(P, iv) {
  const rot = [], a = [], b = [], add = (r, ls) => { rot.push(r); a.push(soma(ls, l => l.tipo === 'entrada')); b.push(soma(ls, l => l.tipo === 'saida')); };
  if (P.tipo === 'ano') { const y = iv.ini.slice(0, 4); MESC.forEach((m, i) => { const p = `${y}-${String(i + 1).padStart(2, '0')}`; add(m, DB.lancamentos.filter(l => l.data.startsWith(p))); }); return { rot, a, b, t: 'Mês a mês' }; }
  const ini = P.tipo === 'dia' ? addDias(P.ref, -6) : iv.ini, n = P.tipo === 'mes' ? diasEntre(iv.ini, iv.fim) + 1 : 7, porDia = {};
  entre(ini, addDias(ini, n - 1)).forEach(l => (porDia[l.data] ||= []).push(l));
  for (let i = 0; i < n; i++) { const d = addDias(ini, i); add(P.tipo === 'mes' ? String(i + 1) : `${d.slice(8)}/${d.slice(5, 7)}`, porDia[d] || []); }
  if (P.tipo === 'mes') { for (let i = 1; i < n; i++) { a[i] += a[i - 1]; b[i] += b[i - 1]; } return { rot, a, b, t: 'Acumulado dia a dia' }; }
  return { rot, a, b, t: P.tipo === 'dia' ? 'Últimos 7 dias' : 'Dia a dia' };
}
const fotoCof = (c, t = 26) => c.foto ? `style="background-image:url(${c.foto})">` : `>${ic(TIPOS_COF[c.tipo]?.[1] || 'alvo', t)}`;

/* Quanto ainda dá para gastar no mês sem furar a meta: renda prevista − gastos − fixas que ainda vêm − meta de economia. */
function disponivelMes() {
  const h = hoje(), iv = intervalo('mes', h), r = resumo(entre(iv.ini, iv.fim)), s = DB.config.salario;
  const salPrev = s.valor > 0 && !DB.lancamentos.some(l => l.chaveSalario === h.slice(0, 7)) ? s.valor : 0;
  const fixas = fixosPendentes().map(l => copiaFixo(l)).filter(x => x.tipo === 'saida' && x.data >= iv.ini && x.data <= iv.fim && grupoDe(x.categoria) !== 'futuro').reduce((t, x) => t + x.valor, 0);
  const cartaoFuturo = soma(DB.lancamentos, l => !!l.cartao && l.tipo === 'saida' && (l.dataCompra || '') >= iv.ini && (l.dataCompra || '') <= iv.fim && l.data > iv.fim);
  const renda = r.renda + salPrev, meta = DB.config.metaEconomia || 0, valor = renda - r.consumo - fixas - meta, dias = diasEntre(h, iv.fim) + 1;
  return { iv, renda, salPrev, consumo: r.consumo, fixas, meta, valor, dias, porDia: valor > 0 ? Math.floor(valor / dias) : 0, cartaoFuturo, temRenda: renda > 0 };
}
function blocoDisponivel() {
  const D = disponivelMes(), ate = br(D.iv.fim).slice(0, 5);
  if (!D.temRenda) return `<button class="disp" data-a="ir" data-t="ajustes"><span>Disponível para gastar até ${ate}</span><b style="font-size:21px">Cadastre seu salário</b><span>Em Ajustes. Com ele o app calcula quanto você pode gastar por dia.</span></button>`;
  const sub = D.valor > 0 ? `Uns ${fmt(D.porDia)} por dia · ${D.dias} dia${D.dias > 1 ? 's' : ''} até o fim do mês` : D.valor < 0 ? 'Os gastos passaram do que cabia neste mês' : 'Nada sobrando para gastar este mês';
  return `<button class="disp" data-a="verDisp"><span>Disponível para gastar até ${ate} ${ic('ajuda', 14)}</span><b class="num ${D.valor < 0 ? 'neg' : ''}">${fmt(D.valor)}</b><span>${sub}</span></button>`;
}
function telaInicio() {
  const P = state.per, c = DB.config, iv = intervalo(P.tipo, P.ref), r = resumo(entre(iv.ini, iv.fim));
  const ivA = intervalo(P.tipo, mover(P.tipo, P.ref, -1)), ra = resumo(entre(ivA.ini, ivA.fim));
  const al = alertas(), dg = diagnostico(r), sr = serieInicio(P, iv), h = hoje();
  const ivM = intervalo('mes', P.ref), ecoM = resumo(entre(ivM.ini, ivM.fim)).eco, fMeta = c.metaEconomia ? Math.max(0, ecoM) / c.metaEconomia : 0;
  const salPend = c.salario.valor > 0 && Number(h.slice(8)) >= c.salario.dia && !DB.lancamentos.some(l => l.chaveSalario === h.slice(0, 7));
  const ult = DB.lancamentos.slice().sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5);
  return `<header class="topo">${CURVA_TOPO}
    <div class="topo-l"><span class="logo">${LOGO}</span><span class="marca" style="font-size:20px">Meu <b>Caixa</b></span><span class="sp"></span>
      <button class="ib" data-a="olho" aria-label="${c.ocultar ? 'Mostrar' : 'Esconder'} valores">${ic(c.ocultar ? 'olhoX' : 'olho')}</button>
      <button class="ib" data-a="verAlertas" aria-label="Alertas">${ic('sino')}${al.length ? `<span class="cont">${al.length}</span>` : ''}</button>
      <button class="avatar" data-a="ir" data-t="ajustes" aria-label="Ajustes">${c.foto ? `<img src="${c.foto}" alt="">` : ic('pessoa')}</button></div>
    <p class="ola">Olá, ${esc(c.nome || 'boas-vindas')}</p>${blocoDisponivel()}</header>
  <div class="cont-t">
    <div class="abas">${[['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']].map(([k, n]) => `<button class="${P.tipo === k ? 'on' : ''}" data-a="perTipo" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="per"><button class="ib" data-a="perMove" data-n="-1" aria-label="Período anterior">${ic('esq', 18)}</button><b>${iv.rot}</b><button class="ib" data-a="perMove" data-n="1" aria-label="Próximo período">${ic('dir', 18)}</button></div>
    <div class="blocos">
      <div class="bl ent"><span class="rt">${ic('sobe', 16)}Entradas</span><div><div class="vl num">${fmt(r.ent)}</div>${seta(variacao(r.ent, ra.ent))}</div></div>
      <div class="bl sai"><span class="rt">${ic('desce', 16)}Saídas</span><div><div class="vl num">${fmt(r.sai)}</div>${seta(variacao(r.sai, ra.sai))}</div></div>
      <div class="bl"><span class="rt mu">${ic('carteira', 16)}Saldo atual</span><div><div class="vl num ${(contasBanco().length ? totalContas() : r.saldo) < 0 ? 'vr' : ''}">${fmt(contasBanco().length ? totalContas() : r.saldo)}</div><span class="vv neutro">${contasBanco().length ? `em ${contasBanco().length} conta${contasBanco().length > 1 ? 's' : ''}` : 'saldo do período'}</span></div></div>
      <div class="bl"><span class="rt mu">${ic('alvo', 16)}Economizado</span><div><div class="vl num ${r.eco < 0 ? 'vr' : 'vg'}">${fmt(r.eco)}</div><span class="vv neutro">${r.taxa == null ? 'renda menos consumo' : pct(r.taxa) + ' da renda'}</span></div></div>
    </div>
    <div class="av ${dg.n}"><span class="ic">${ic(dg.i)}</span><p><b>${dg.t}</b>${dg.d}</p></div>
    ${salPend ? `<div class="av nt"><span class="ic">${ic('maleta')}</span><p><b>Salário do mês: ${fmt(c.salario.valor)}</b>Já caiu?</p><button class="bt pq" data-a="lancarSalario">Lançar</button></div>` : ''}
    <div class="sec"><div class="sec-t"><h3>Entradas x Saídas</h3><span class="mu pq">${sr.t}</span></div>
      <div class="card graf"><div class="leg"><span><i style="background:#1FA855"></i>Entradas</span><span><i style="background:#E5484D"></i>Saídas</span></div>${grafLinhas(sr.rot, sr.a, sr.b)}</div></div>
    <div class="sec"><div class="sec-t"><h3>Meta de economia do mês</h3><button data-a="ir" data-t="ajustes">${c.metaEconomia ? 'Alterar' : 'Definir'}</button></div>
      <div class="card" style="display:flex;gap:12px;align-items:center"><span class="${fMeta >= 1 ? 'vg' : 'va'}">${ic('trofeu', 30)}</span><div style="flex:1">
        ${c.metaEconomia ? `<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px"><b class="num">${fmt(Math.max(0, ecoM))}</b><span class="mu num">de ${fmt(c.metaEconomia)}</span></div><div class="barra"><i class="${fMeta >= 1 ? '' : fMeta >= .5 ? 'at' : 'al'}" style="width:${Math.min(100, fMeta * 100).toFixed(0)}%"></i></div><p class="pq mu" style="margin-top:6px">${fMeta >= 1 ? 'Meta batida neste mês.' : `${pct(fMeta)} da meta. Faltam ${fmt(c.metaEconomia - Math.max(0, ecoM))}.`}</p>`
      : `<p class="pq mu">Defina quanto quer guardar por mês para acompanhar aqui.</p>`}</div></div></div>
    <div class="sec"><div class="sec-t"><h3>Cofrinhos</h3><button data-a="ir" data-t="cofrinhos">Ver todos</button></div>
      ${DB.cofrinhos.length ? `<div class="atalhos">${DB.cofrinhos.map(k => `<button class="at" data-a="ir" data-t="cofrinho" data-id="${k.id}"><div class="ft" ${fotoCof(k, 24)}</div><b>${esc(k.nome)}</b><span class="num">${fmt(guardado(k))}</span></button>`).join('')}</div>`
      : `<div class="card"><p class="pq mu" style="margin-bottom:10px">Guarde dinheiro para a reserva de emergência e para seus sonhos.</p><button class="bt pq" data-a="novoCofre">Criar cofrinho</button></div>`}</div>
    <div class="sec"><div class="sec-t"><h3>Últimos lançamentos</h3><button data-a="ir" data-t="extrato">Ver extrato</button></div>
      <div class="card" style="padding:4px 14px">${ult.length ? ult.map(linhaLanc).join('') : vazio('lista', 'Nenhum lançamento ainda.<br>Toque no botão + para começar.')}</div></div>
  </div>`;
}

/* ---------- extrato ---------- */
function listaExtrato() {
  const q = semAcento(state.busca.trim()), h = hoje(), ont = addDias(h, -1);
  const ls = ordenar(DB.lancamentos).filter(l => (!state.filtro || l.categoria === state.filtro) &&
    (!q || semAcento(`${l.descricao} ${cat(l.categoria).nome} ${(l.itens || []).map(i => i.descricao).join(' ')}`).includes(q)));
  if (!ls.length) return vazio('busca', DB.lancamentos.length ? 'Nada encontrado com esse filtro.' : 'Nenhum lançamento ainda.<br>Toque no botão + para começar.');
  const vis = ls.slice(0, state.limite), dias = {};
  vis.forEach(l => (dias[l.data] ||= []).push(l));
  return Object.entries(dias).map(([d, arr]) => {
    const tot = arr.reduce((t, l) => t + (l.tipo === 'entrada' ? l.valor : -l.valor), 0);
    return `<div class="dia"><span>${d === h ? 'Hoje' : d === ont ? 'Ontem' : `${br(d)} · ${SEMANA[dParse(d).getDay()]}`}</span><span class="num">${tot >= 0 ? '+' : '-'} ${fmt(Math.abs(tot))}</span></div><div class="card" style="padding:4px 14px">${arr.map(linhaLanc).join('')}</div>`;
  }).join('') + (ls.length > vis.length ? `<button class="bt sec2 full" style="margin-top:14px" data-a="maisExtrato">Ver mais antigos</button>` : '');
}
function telaExtrato() {
  const usadas = [...new Set(DB.lancamentos.map(l => l.categoria))].map(cat).sort((a, b) => a.nome.localeCompare(b.nome));
  return `<header class="topo">${CURVA_TOPO}<div class="topo-l"><span class="logo">${LOGO}</span><span class="marca" style="font-size:20px">Extrato</span></div></header>
  <div class="cont-t"><label class="busca">${ic('busca', 20)}<input id="busca" type="search" placeholder="Buscar descrição, categoria ou produto" value="${esc(state.busca)}" data-i="buscar" autocomplete="off"></label>
    <div class="chips"><button class="chip ${state.filtro ? '' : 'on'}" data-a="filtrar" data-k="">Todas</button>${usadas.map(c => `<button class="chip ${state.filtro === c.id ? 'on' : ''}" data-a="filtrar" data-k="${c.id}">${c.nome}</button>`).join('')}</div>
    <div id="lista">${listaExtrato()}</div></div>`;
}

/* ---------- relatórios ---------- */
const IND = {
  poupanca: { nome: 'Taxa de poupança', ajuda: 'Mostra quanto da sua renda sobrou depois dos gastos de consumo (tudo que não foi para reserva, cofrinhos ou investimentos).\n\nConta: (renda − consumo) ÷ renda.\n\nReferência: 20% ou mais é saudável. De 10% a 20% pede atenção. Abaixo de 10% é alerta.',
    calc: r => ({ v: pct(r.taxa), st: r.taxa == null ? '' : r.taxa >= .2 ? 'vg' : r.taxa >= .1 ? 'va' : 'vr', d: 'Saudável: 20% ou mais' }) },
  comprometida: { nome: 'Renda comprometida', ajuda: 'Mostra quanto da sua renda já sai todo mês em contas fixas (aluguel, luz, parcelas, assinaturas). Quanto menor, mais folga você tem para imprevistos.\n\nConta: saídas marcadas como "fixas" ÷ renda.\n\nReferência: até 50% tem folga. Acima de 65% é alerta.',
    calc: r => ({ v: pct(r.comp), st: r.comp == null ? '' : r.comp <= .5 ? 'vg' : r.comp <= .65 ? 'va' : 'vr', d: 'Folga: até 50%' }) },
  diario: { nome: 'Gasto médio por dia', ajuda: 'Quanto você gasta em consumo, em média, por dia do período. Ajuda a perceber se o ritmo de gastos cabe no mês.\n\nConta: gastos de consumo ÷ dias corridos do período.\n\nReferência: compare com a sua renda mensal dividida por 30.',
    calc: (r, x) => ({ v: fmt(Math.round(r.consumo / x.dias)), st: '', d: `em ${x.dias} dia${x.dias > 1 ? 's' : ''}` }) },
  reserva: { nome: 'Meses de reserva', ajuda: 'Por quantos meses a sua reserva de emergência paga os gastos essenciais (moradia, mercado, contas, transporte, saúde) se a renda parar.\n\nConta: valor nos cofrinhos de emergência ÷ custo essencial mensal médio dos últimos 3 meses.\n\nReferência: 6 meses é o ideal. Menos de 3 meses é pouco.',
    calc: () => { const ce = custoEssencial(), g = DB.cofrinhos.filter(c => c.tipo === 'emergencia').reduce((t, c) => t + guardado(c), 0), m = ce ? g / ce : null; return { v: m == null ? '—' : DB.config.ocultar ? '••' : m.toFixed(1).replace('.', ',') + ' meses', st: m == null ? '' : m >= 6 ? 'vg' : m >= 3 ? 'va' : 'vr', d: 'Ideal: 6 meses' }; } },
  essencial: { nome: 'Peso do essencial', ajuda: 'Quanto da renda vai para o que não dá para cortar: moradia, mercado, contas da casa, transporte, saúde, educação, dívidas e pets.\n\nConta: gastos essenciais ÷ renda.\n\nReferência: até 50% da renda (regra 50/30/20).',
    calc: r => { const f = r.renda ? r.ess / r.renda : null; return { v: pct(f), st: f == null ? '' : f <= .5 ? 'vg' : f <= .6 ? 'va' : 'vr', d: 'Referência: até 50%' }; } },
  maior: { nome: 'Maior gasto', ajuda: 'A categoria em que você mais gastou no período. É o primeiro lugar para olhar quando quiser economizar.\n\nReferência: nenhuma categoria de estilo de vida deveria passar sozinha de 10% a 15% da renda.',
    calc: (r, x) => { const e = Object.entries(gastoPorCategoria(x.ls)).filter(([k]) => grupoDe(k) !== 'futuro').sort((a, b) => b[1] - a[1])[0]; return e ? { v: cat(e[0]).nome, st: '', d: fmt(e[1]), pq: true } : { v: '—', st: '', d: 'sem gastos' }; } },
  fixas: { nome: 'Contas fixas', ajuda: 'A soma das saídas que você marcou como "fixas", aquelas que se repetem todo mês. É o piso do seu custo de vida.\n\nReferência: o ideal é que fiquem em até metade da renda.',
    calc: r => ({ v: fmt(r.fixas), st: '', d: 'saídas que se repetem' }) }
};
function telaRelatorios() {
  const R = state.rel, iv = intervalo(R.tipo, R.ref), ls = entre(iv.ini, iv.fim), r = resumo(ls), h = hoje();
  const ivA = intervalo(R.tipo, mover(R.tipo, R.ref, -1)), ra = resumo(entre(ivA.ini, ivA.fim));
  const dias = iv.fim <= h ? diasEntre(iv.ini, iv.fim) + 1 : iv.ini > h ? 1 : diasEntre(iv.ini, h) + 1;
  const tri = (n, v, a, ruim) => { const vv = variacao(v, a); return `<div class="card"><small>${n}</small><b class="num">${fmt(v)}</b><em class="${corVar(vv, ruim)}">${vv == null ? 'sem comparação' : (vv >= 0 ? '+' : '−') + Math.abs(Math.round(vv * 100)) + '%'}</em></div>`; };
  const g = Object.entries(gastoPorCategoria(ls)).sort((a, b) => b[1] - a[1]), top = g.slice(0, 6), resto = g.slice(6).reduce((t, e) => t + e[1], 0);
  const partes = top.map(([k, v]) => ({ n: cat(k).nome, v, cor: cat(k).cor })); if (resto) partes.push({ n: 'Demais categorias', v: resto, cor: '#55555F' });
  const reg = (n, v, alvo, minimo) => { const f = r.renda ? v / r.renda : null, bom = f == null ? true : minimo ? f >= alvo : f <= alvo;
    return `<div class="reg"><div class="l"><span><b>${n}</b> <span class="mu">${minimo ? 'pelo menos' : 'até'} ${pct(alvo)}</span></span><span class="num ${bom ? 'vg' : 'vr'}">${pct(f)} · ${fmt(v)}</span></div><div class="barra"><i class="${bom ? '' : 'al'}" style="width:${Math.min(100, (f || 0) * 100).toFixed(0)}%"></i></div></div>`; };
  /* evolução: no mês mostra os 6 últimos meses; no trimestre, os 3; no ano, os 12 */
  const nM = R.tipo === 'mes' ? 6 : R.tipo === 'trimestre' ? 3 : 12, m0 = R.tipo === 'mes' ? addMeses(iv.ini, -5) : iv.ini, er = [], ee = [], es = [], ea = []; let ac = 0;
  for (let i = 0; i < nM; i++) { const im = intervalo('mes', addMeses(m0, i)), rr = resumo(entre(im.ini, im.fim)); er.push(MESC[dParse(im.ini).getMonth()]); ee.push(rr.ent); es.push(rr.sai); ac += rr.saldo; ea.push(ac); }
  const porForma = {}; ls.forEach(l => { if (l.tipo === 'saida') porForma[l.forma] = (porForma[l.forma] || 0) + l.valor; });
  const inds = (DB.config.indicadores || []).filter(k => IND[k]);
  return `<header class="topo">${CURVA_TOPO}<div class="topo-l"><span class="logo">${LOGO}</span><span class="marca" style="font-size:20px">Relatórios</span></div></header>
  <div class="cont-t">
    <div class="abas">${[['mes', 'Mês'], ['trimestre', 'Trimestre'], ['ano', 'Ano']].map(([k, n]) => `<button class="${R.tipo === k ? 'on' : ''}" data-a="relTipo" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="per"><button class="ib" data-a="relMove" data-n="-1" aria-label="Período anterior">${ic('esq', 18)}</button><b>${iv.rot}</b><button class="ib" data-a="relMove" data-n="1" aria-label="Próximo período">${ic('dir', 18)}</button></div>
    <div class="tri">${tri('Entradas', r.ent, ra.ent)}${tri('Saídas', r.sai, ra.sai, true)}${tri('Saldo', r.saldo, ra.saldo)}</div>
    <div class="sec"><div class="sec-t"><h3>Para onde foi o dinheiro</h3></div><div class="card">${partes.length ? `<div class="rosca">${grafRosca(partes, DB.config.ocultar ? '••••' : num(r.sai))}<ul>${partes.map(p => `<li><i style="background:${p.cor}"></i><span>${p.n}</span><b>${pct(p.v / r.sai)}</b></li>`).join('')}</ul></div>` : vazio('graf', 'Sem saídas neste período.')}</div></div>
    <div class="sec"><div class="sec-t"><h3>Indicadores</h3><button data-a="persInd">Personalizar</button></div>
      ${inds.length ? `<div class="ind">${inds.map(k => { const x = IND[k].calc(r, { ls, iv, dias }); return `<div class="card"><button class="aj" data-a="ajudaInd" data-k="${k}" aria-label="O que é ${IND[k].nome}">?</button><small>${IND[k].nome}</small><b class="${x.st} ${x.pq ? '' : 'num'}" ${x.pq ? 'style="font-size:15px"' : ''}>${x.v}</b><em>${x.d}</em></div>`; }).join('')}</div>` : `<div class="card pq mu">Nenhum indicador escolhido. Toque em Personalizar.</div>`}</div>
    <div class="sec"><div class="sec-t"><h3>Regra 50/30/20</h3><button data-a="ajuda503020">Como funciona</button></div><div class="card" style="padding-top:4px">
      ${reg('Essencial', r.ess, .5)}${reg('Estilo de vida', r.est, .3)}${reg('Futuro', r.renda - r.consumo, .2, true)}
      ${r.renda ? '' : '<p class="pq mu" style="margin-top:10px">Lance a renda do período para comparar com a regra.</p>'}</div></div>
    <div class="sec"><div class="sec-t"><h3>Evolução</h3><span class="mu pq">${nM} meses</span></div><div class="card graf"><div class="leg"><span><i style="background:#1FA855"></i>Entradas</span><span><i style="background:#E5484D"></i>Saídas</span><span><i style="background:var(--tx)"></i>Saldo acumulado</span></div>${grafBarras(er, ee, es, ea)}</div></div>
    <div class="sec"><div class="sec-t"><h3>Como pagou</h3></div><div class="card" style="padding-top:4px">${r.sai ? Object.entries(FORMAS).map(([k, n]) => { const v = porForma[k] || 0; return `<div class="reg"><div class="l"><span>${n}</span><span class="num">${pct(v / r.sai)} · ${fmt(v)}</span></div><div class="barra"><i style="width:${(v / r.sai * 100).toFixed(0)}%;background:var(--acc)"></i></div></div>`; }).join('') : vazio('cartao', 'Sem saídas neste período.')}</div></div>
  </div>`;
}

/* ---------- menu ---------- */
const itemMenu = (a, extra, icone, t, d) => `<button class="menu" data-a="${a}" ${extra}><span class="ci">${ic(icone)}</span><span class="sp">${t}<small>${d}</small></span>${ic('dir', 18)}</button>`;
function telaMenu() {
  return `<header class="topo">${CURVA_TOPO}<div class="topo-l"><span class="logo">${LOGO}</span><span class="marca" style="font-size:20px">Mais</span></div></header>
  <div class="cont-t"><div class="card" style="padding:2px 14px">
    ${itemMenu('ir', 'data-t="cofrinhos"', 'alvo', 'Cofrinhos e metas', `${DB.cofrinhos.length} cofrinho${DB.cofrinhos.length === 1 ? '' : 's'} · ${fmt(DB.cofrinhos.reduce((t, c) => t + guardado(c), 0))}`)}
    ${itemMenu('ir', 'data-t="contas"', 'banco', 'Minhas contas e cartões', contasBanco().length ? fmt(totalContas()) + ' em contas' + (cartoes().length ? ` · ${cartoes().length} cartão(ões)` : '') : 'Cadastre onde seu dinheiro fica')}
    ${itemMenu('ir', 'data-t="orcamento"', 'ajustes', 'Orçamento', 'Limite mensal por categoria')}
    ${itemMenu('ir', 'data-t="nota"', 'nota', 'Ler nota fiscal', 'Foto da nota vira lançamento')}
    ${itemMenu('ir', 'data-t="ajustes"', 'pessoa', 'Ajustes', 'Perfil, salário, tema, senha e exportação')}
    ${matchMedia('(display-mode: standalone)').matches || navigator.standalone ? '' : itemMenu('instalar', '', 'baixar', 'Instalar na tela inicial', 'Abre como app, sem a barra do navegador')}
  </div></div>`;
}

/* ---------- cofrinhos ---------- */
function planoCofre(c) {
  const g = guardado(c), falta = Math.max(c.meta - g, 0), h = hoje();
  if (!c.meta) return 'Defina uma meta para ver o plano.';
  if (!falta) return 'Meta alcançada. Parabéns!';
  if (c.prazo && c.prazo > h) { const meses = Math.max(1, Math.ceil(diasEntre(h, c.prazo) / 30.44)); return `Guardando ${fmt(Math.ceil(falta / meses))} por mês, chega lá até ${mesAnoCurto(c.prazo)}.`; }
  const ini = addMeses(h, -3), ritmo = Math.round(c.movimentos.filter(m => m.data > ini).reduce((t, m) => t + (m.tipo === 'deposito' ? m.valor : -m.valor), 0) / 3);
  if (ritmo > 0) return `Guardando ${fmt(ritmo)} por mês (seu ritmo atual), chega lá até ${mesAnoCurto(addMeses(h, Math.ceil(falta / ritmo)))}.`;
  return c.prazo ? 'O prazo já passou. Ajuste a data para refazer o plano.' : 'Defina um prazo ou faça depósitos para ver o plano.';
}
function telaCofrinhos() {
  const tot = DB.cofrinhos.reduce((t, c) => t + guardado(c), 0);
  return cab('Cofrinhos e metas', 'menu', `<button class="ib" data-a="novoCofre" aria-label="Novo cofrinho">${ic('mais')}</button>`) + `<div class="cont-t">
    <div class="card" style="margin-bottom:14px"><span class="pq mu">Total guardado</span><div class="num vg" style="font-size:24px;font-weight:800">${fmt(tot)}</div></div>
    ${DB.cofrinhos.length ? DB.cofrinhos.map(c => { const g = guardado(c), f = c.meta ? g / c.meta : 0;
      return `<button class="cof" data-a="ir" data-t="cofrinho" data-id="${c.id}"><div class="ft" ${fotoCof(c, 30)}</div><div class="tx"><b>${esc(c.nome)}</b><small>${esc(c.frase || TIPOS_COF[c.tipo]?.[0] || '')}</small><div class="g num">${fmt(g)}</div><div class="barra"><i style="width:${Math.min(100, f * 100).toFixed(0)}%;background:#12853F"></i></div><div class="ft2"><span>${c.meta ? pct(f) + ' da meta' : 'sem meta'}</span><span class="num">${c.meta ? (g >= c.meta ? 'meta alcançada' : 'faltam ' + fmt(c.meta - g)) : ''}</span></div></div></button>`; }).join('')
    : `<div class="card">${vazio('alvo', 'Você ainda não tem cofrinhos.<br>Comece pela reserva de emergência.')}</div>`}
    <button class="bt full" style="margin-top:8px" data-a="novoCofre">${ic('mais', 18)}Novo cofrinho</button></div>`;
}
function telaCofrinho() {
  const c = DB.cofrinhos.find(x => x.id === state.cofre); if (!c) { state.tela = 'cofrinhos'; return telaCofrinhos(); }
  const g = guardado(c), f = c.meta ? g / c.meta : 0, movs = c.movimentos.slice().sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm - a.criadoEm);
  return `<div class="heroi" ${c.foto ? `style="background-image:url(${c.foto})"` : ''}><div class="cx"><div class="ac"><button class="ib" data-a="ir" data-t="cofrinhos" aria-label="Voltar">${ic('esq')}</button><span style="flex:1"></span>
      <button class="ib" data-a="editarCofre" data-id="${c.id}" aria-label="Editar">${ic('lapis', 20)}</button><button class="ib" data-a="apagarCofre" data-id="${c.id}" aria-label="Apagar">${ic('lixo', 20)}</button></div>
    <div class="bx"><div style="flex:1;min-width:0"><p>${TIPOS_COF[c.tipo]?.[0] || ''}</p><h1>${esc(c.nome)}</h1>${c.frase ? `<p>${esc(c.frase)}</p>` : ''}</div>${anel(f)}</div></div></div>
  <div class="cont-t">
    <div class="tri"><div class="card"><small>Guardado</small><b class="num vg">${fmt(g)}</b></div><div class="card"><small>Falta</small><b class="num">${c.meta ? fmt(Math.max(c.meta - g, 0)) : '—'}</b></div><div class="card"><small>Prazo</small><b>${c.prazo ? br(c.prazo) : 'Sem prazo'}</b></div></div>
    <div class="av nt"><span class="ic">${ic('agenda')}</span><p><b>O plano</b>${planoCofre(c)}</p></div>
    <div class="linha-bt"><button class="bt vd" data-a="movCofre" data-k="deposito">${ic('sobe', 18)}Depositar</button><button class="bt sec2" data-a="movCofre" data-k="resgate">${ic('desce', 18)}Resgatar</button></div>
    <div class="sec"><div class="sec-t"><h3>Movimentos</h3></div><div class="card" style="padding:4px 14px">${movs.length ? movs.map(m => `<div class="ln"><span class="ci" style="background:${m.tipo === 'deposito' ? '#1FA855' : '#6C7A89'}">${ic(m.tipo === 'deposito' ? 'sobe' : 'desce', 20)}</span><span class="tx"><b>${m.tipo === 'deposito' ? 'Depósito' : 'Resgate'}</b><span>${br(m.data)}</span></span><span class="vl num ${m.tipo === 'deposito' ? 'vg' : ''}">${m.tipo === 'deposito' ? '+' : '-'} ${fmt(m.valor)}</span><button class="ib" style="width:34px;height:34px;color:var(--mu)" data-a="apagarMov" data-id="${m.id}" aria-label="Apagar movimento">${ic('lixo', 18)}</button></div>`).join('') : vazio('alvo', 'Nenhum depósito ainda.')}</div></div>
  </div>`;
}
function formCofre(c) {
  const e = c || { tipo: 'emergencia', nome: '', frase: '', meta: 0, prazo: '', foto: '' }; state.edit = c ? c.id : null; state.fotoTmp = e.foto;
  const sug = 6 * custoEssencial();
  abrirSheet(`<div class="sheet-t"><h2>${c ? 'Editar cofrinho' : 'Novo cofrinho'}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    <label class="cp">Tipo<select id="cTipo" data-c="cofTipo">${Object.entries(TIPOS_COF).map(([k, v]) => `<option value="${k}"${k === e.tipo ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label>
    <label class="cp">Nome<input id="cNome" maxlength="40" placeholder="Ex.: Viagem para a praia" value="${esc(e.nome)}"></label>
    <label class="cp">Frase que te motiva (opcional)<input id="cFrase" maxlength="60" placeholder="Ex.: Férias em família" value="${esc(e.frase)}"></label>
    <div class="duas"><label class="cp">Meta (R$)<input id="cMeta" class="money" inputmode="numeric" value="${num(e.meta)}"></label><label class="cp">Prazo (opcional)<input id="cPrazo" type="date" value="${e.prazo}"></label></div>
    <div id="cSug" class="av nt" ${e.tipo === 'emergencia' ? '' : 'hidden'}><span class="ic">${ic('escudo')}</span><p>${sug ? `<b>Sugestão: ${fmt(sug, true)}</b>6 vezes o seu custo essencial mensal (média dos últimos 3 meses).` : `<b>Reserva de emergência</b>O ideal é 6 vezes o seu custo essencial mensal. Lance seus gastos para o app calcular.`}</p>${sug ? `<button class="bt pq sec2" data-a="usarSug" data-v="${sug}">Usar</button>` : ''}</div>
    <div class="tog"><span>Foto do cofrinho<small id="cFotoTxt">${e.foto ? 'Foto escolhida' : 'Nenhuma foto'}</small></span><button class="bt pq sec2" data-a="fotoCofre">${ic('imagem', 16)}Escolher</button></div>
    <button class="bt full" style="margin-top:20px" data-a="salvarCofre">Salvar</button>`);
}

/* ---------- contas ---------- */
const linhaConta = c => { const s = saldoConta(c); return `<div class="conta"><span class="sig" style="background:${c.cor}">${esc(c.sigla)}</span><div class="tx"><b>${esc(c.nome)}</b><small>${esc([c.tipo, c.agencia && 'Ag. ' + c.agencia, c.numero && 'Conta ' + c.numero].filter(Boolean).join(' · '))}</small><b class="num ${s < 0 ? 'vr' : ''}">${fmt(s)}</b></div><button class="ib" data-a="editarConta" data-id="${c.id}" aria-label="Editar ${esc(c.nome)}">${ic('lapis', 19)}</button><button class="ib" data-a="apagarConta" data-id="${c.id}" aria-label="Apagar ${esc(c.nome)}">${ic('lixo', 19)}</button></div>`; };
const ST_FAT = { paga: ['ok', 'Paga'], aberta: ['', 'Aberta'], fechada: ['at', 'Fechada'], atrasada: ['al', 'Atrasada'] };
const nomeFatura = ym => `${cap(MESES[Number(ym.slice(5)) - 1])}/${ym.slice(0, 4)}`;
function linhaCartao(k) {
  const f = resumoFatura(k, faturaDestaque(k)), usado = limiteUsado(k), u = k.limite ? usado / k.limite : 0, st = ST_FAT[f.status];
  return `<button class="conta" style="width:100%;text-align:left" data-a="verCartao" data-id="${k.id}"><span class="sig" style="background:${k.cor}">${esc(k.sigla)}</span><div class="tx"><b>${esc(k.nome)}</b><small>Fatura de ${nomeFatura(f.ym)} · vence ${br(f.venc).slice(0, 5)}</small><b class="num">${fmt(f.total)}</b>${k.limite ? `<div class="barra" style="margin:6px 0 3px"><i class="${u >= .9 ? 'al' : u >= .7 ? 'at' : ''}" style="width:${Math.min(100, u * 100).toFixed(0)}%"></i></div><small>Limite disponível: ${fmt(Math.max(k.limite - usado, 0))}</small>` : ''}</div><span class="st ${st[0]}">${st[1]}</span></button>`;
}
function telaContas() {
  const bs = contasBanco(), ks = cartoes();
  return cab('Minhas contas', 'menu', `<button class="ib" data-a="novaConta" aria-label="Nova conta">${ic('mais')}</button>`) + `<div class="cont-t">
    <div class="card" style="margin-bottom:14px"><span class="pq mu">Total em contas</span><div class="num ${totalContas() < 0 ? 'vr' : ''}" style="font-size:24px;font-weight:800">${fmt(totalContas())}</div></div>
    <div class="card" style="padding:2px 14px">${bs.length ? bs.map(linhaConta).join('') : vazio('banco', 'Cadastre suas contas e o saldo de hoje.<br>A partir daí o app atualiza o saldo sozinho.')}</div>
    <button class="bt full" style="margin-top:14px" data-a="novaConta">${ic('mais', 18)}Nova conta</button>
    <p class="pq mu" style="margin-top:12px">O saldo é o valor que você informou no último ajuste, mais as entradas e menos as saídas lançadas na conta depois disso.</p>
    <div class="sec"><div class="sec-t"><h3>Cartões de crédito</h3><button data-a="novoCartao">Adicionar</button></div>
      <div class="card" style="padding:2px 14px">${ks.length ? ks.map(linhaCartao).join('') : vazio('cartao', 'Cadastre seu cartão para separar as compras por fatura e lançar compras parceladas.')}</div>
      ${ks.length ? '' : `<button class="bt sec2 full" style="margin-top:12px" data-a="novoCartao">${ic('cartao', 18)}Novo cartão</button>`}</div></div>`;
}
function formCartao(k) {
  const e = k || { nome: '', fechamento: 1, vencimento: 10, limite: 0, cor: CORES_CONTA[6] }; state.edit = k ? k.id : null;
  abrirSheet(`<div class="sheet-t"><h2>${k ? 'Editar cartão' : 'Novo cartão de crédito'}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    <label class="cp">Nome do cartão<input id="xNome" maxlength="30" placeholder="Ex.: Nubank, Itaú Click" value="${esc(e.nome)}"></label>
    <div class="duas"><label class="cp">Dia em que fecha<input id="xFech" type="number" inputmode="numeric" min="1" max="31" value="${e.fechamento}"></label><label class="cp">Dia em que vence<input id="xVenc" type="number" inputmode="numeric" min="1" max="31" value="${e.vencimento}"></label></div>
    <label class="cp">Limite (R$, opcional)<input id="xLim" class="money" inputmode="numeric" value="${num(e.limite)}"></label>
    <div class="cp">Cor</div><div class="cores">${CORES_CONTA.map(c => `<label><input type="radio" name="xCor" value="${c}"${c === e.cor ? ' checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
    <p class="pq mu" style="margin-top:14px">Compras feitas no dia do fechamento ou depois entram na fatura seguinte. Nos relatórios e no orçamento, cada compra conta no mês em que a fatura vence.</p>
    <button class="bt full" style="margin-top:18px" data-a="salvarCartao">Salvar</button>`);
}
function verCartao(k) {
  const atual = faturaDe(k, hoje()).fatura, dest = faturaDestaque(k), f = resumoFatura(k, dest), usado = limiteUsado(k), u = k.limite ? usado / k.limite : 0;
  const yms = [...new Set([...DB.lancamentos.filter(l => l.cartao === k.id).map(l => l.fatura), atual])].filter(ym => ym >= ymMais(atual, -3)).sort().slice(0, 15);
  abrirSheet(`<div class="sheet-t"><h2>${esc(k.nome)}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    <p class="pq mu" style="margin-top:2px">Fecha dia ${k.fechamento} · vence dia ${k.vencimento}${k.limite ? ` · limite de ${fmt(k.limite)}` : ''}</p>
    ${k.limite ? `<div class="barra" style="margin-top:10px"><i class="${u >= .9 ? 'al' : u >= .7 ? 'at' : ''}" style="width:${Math.min(100, u * 100).toFixed(0)}%"></i></div><p class="pq mu" style="margin-top:5px">Usado ${fmt(usado)} · disponível ${fmt(Math.max(k.limite - usado, 0))}</p>` : ''}
    <div class="sec"><div class="sec-t"><h3>Faturas</h3></div><div class="card" style="padding:2px 14px">${yms.map(ym => { const r = resumoFatura(k, ym), st = ST_FAT[r.status];
      return `<div class="ln"><span class="tx"><b>${nomeFatura(ym)}</b><span style="white-space:normal">Vence ${br(r.venc)}${r.pagamento ? ` · ${fmt(r.pago)} pago em ${br(r.pagamento.data)}` : ''}${r.pagamento && r.falta ? ` · faltam ${fmt(r.falta)}` : ''} · ${r.ls.length} compra${r.ls.length === 1 ? '' : 's'}</span></span><span class="dir"><b class="num">${fmt(r.total)}</b><br><span class="st ${st[0]}">${st[1]}</span></span>${r.status === 'paga' ? `<button class="bt pq sec2" data-a="desfazerPag" data-id="${k.id}" data-k="${ym}">Desfazer</button>` : r.falta > 0 ? `<button class="bt pq" data-a="pagarFatura" data-id="${k.id}" data-k="${ym}">Pagar</button>` : ''}</div>`; }).join('')}</div></div>
    <div class="sec"><div class="sec-t"><h3>Compras na fatura de ${nomeFatura(dest)}</h3></div><div class="card" style="padding:4px 14px">${f.ls.length ? ordenar(f.ls).map(linhaLanc).join('') : vazio('cartao', 'Nenhuma compra nesta fatura.')}</div></div>
    <div class="linha-bt"><button class="bt sec2" data-a="apagarConta" data-id="${k.id}">${ic('lixo', 18)}Apagar</button><button class="bt" data-a="editarConta" data-id="${k.id}">${ic('lapis', 18)}Editar</button></div>`);
}
function formConta(c) {
  const e = c || { nome: '', tipo: TIPOS_CONTA[0], agencia: '', numero: '', cor: CORES_CONTA[5] }; state.edit = c ? c.id : null;
  abrirSheet(`<div class="sheet-t"><h2>${c ? 'Editar conta' : 'Nova conta'}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    <label class="cp">Nome do banco ou da conta<input id="kNome" maxlength="40" placeholder="Ex.: Banco do Brasil" value="${esc(e.nome)}"></label>
    <label class="cp">Tipo<select id="kTipo">${TIPOS_CONTA.map(t => `<option${t === e.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="duas"><label class="cp">Agência (opcional)<input id="kAg" inputmode="numeric" maxlength="10" value="${esc(e.agencia)}"></label><label class="cp">Conta (opcional)<input id="kNum" inputmode="numeric" maxlength="16" value="${esc(e.numero)}"></label></div>
    <label class="cp">${c ? 'Saldo de hoje (mude só para corrigir)' : 'Saldo de hoje'}</label>
    <div style="display:flex;gap:8px"><div class="seg" style="width:120px;flex:none">${['+', '−'].map((s, i) => `<label><input type="radio" name="kSinal" value="${i ? -1 : 1}"${!!(c && saldoConta(c) < 0) === !!i ? ' checked' : ''}><span>${s}</span></label>`).join('')}</div><input id="kSaldo" class="inp money" inputmode="numeric" value="${num(c ? saldoConta(c) : 0)}"></div>
    <div class="cp">Cor</div><div class="cores">${CORES_CONTA.map(k => `<label><input type="radio" name="kCor" value="${k}"${k === e.cor ? ' checked' : ''}><span style="background:${k}"></span></label>`).join('')}</div>
    <button class="bt full" style="margin-top:20px" data-a="salvarConta">Salvar</button>`);
}

/* ---------- orçamento ---------- */
const barraOrc = (gasto, lim) => { const u = lim ? gasto / lim : 0; return lim ? `<div class="barra" style="margin-top:8px"><i class="${u >= 1 ? 'al' : u >= .85 ? 'at' : ''}" style="width:${Math.min(100, u * 100).toFixed(0)}%"></i></div><p class="pq ${u >= 1 ? 'vr' : 'mu'}" style="margin-top:4px">${u >= 1 ? `Passou ${fmt(gasto - lim)} do limite` : `${pct(u)} usado · sobram ${fmt(lim - gasto)}`}</p>` : ''; };
function telaOrcamento() {
  const h = hoje(), iv = intervalo('mes', h), ls = entre(iv.ini, iv.fim), r = resumo(ls), g = gastoPorCategoria(ls), o = DB.config.orcamentos || {};
  const base = r.renda || DB.config.salario.valor || 0;
  return cab('Orçamento', 'menu') + `<div class="cont-t"><p class="mu pq" style="margin-bottom:10px">${iv.rot} · limite mensal por categoria</p>
    <div class="card"><b>Sugestão 50/30/20</b><p class="pq mu" style="margin:2px 0 8px">${base ? `Com base na renda de ${fmt(base)}${r.renda ? ' deste mês' : ' (seu salário)'}.` : 'Lance a renda do mês ou cadastre o salário para ver a sugestão.'}</p>
      ${base ? [['essencial', .5, 'até'], ['estilo', .3, 'até'], ['futuro', .2, 'pelo menos']].map(([k, f, p]) => { const lim = CATS_SAIDA.filter(c => c.grupo === k).reduce((t, c) => t + (o[c.id] || 0), 0); return `<div class="reg"><div class="l"><span><b>${GRUPOS[k].nome}</b> <span class="mu">${p} ${pct(f)}</span></span><span class="num">${fmt(Math.round(base * f))}</span></div><p class="pq mu">Seus limites neste grupo somam ${fmt(lim)}.</p></div>`; }).join('') : ''}</div>
    ${Object.entries(GRUPOS).map(([k, G]) => `<div class="sec"><div class="sec-t"><h3>${G.nome}</h3></div>${CATS_SAIDA.filter(c => c.grupo === k).map(c => `<div class="card" style="margin-bottom:8px;padding:12px"><div style="display:flex;align-items:center;gap:10px"><span class="ci" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:#fff;background:${c.cor};flex:none">${ic(c.icone, 18)}</span><div style="flex:1;min-width:0"><b style="font-size:14px">${c.nome}</b><p class="pq mu num">Gasto: ${fmt(g[c.id] || 0)}</p></div><input class="inp money" style="width:112px;margin:0;height:42px;text-align:right" inputmode="numeric" aria-label="Limite de ${c.nome}" value="${num(o[c.id] || 0)}" data-c="orc" data-k="${c.id}" data-g="${g[c.id] || 0}"></div><div id="ob-${c.id}">${barraOrc(g[c.id] || 0, o[c.id] || 0)}</div></div>`).join('')}</div>`).join('')}
  </div>`;
}

/* ---------- ajustes ---------- */
function telaAjustes() {
  const c = DB.config;
  return cab('Ajustes', 'menu') + `<div class="cont-t">
    <div class="card"><div style="display:flex;align-items:center;gap:14px"><button class="avatar" style="width:64px;height:64px" data-a="fotoPerfil" aria-label="Trocar foto">${c.foto ? `<img src="${c.foto}" alt="">` : ic('camera')}</button><div style="flex:1"><button class="bt pq sec2" data-a="fotoPerfil">Trocar foto do perfil</button><button class="bt pq sec2" style="margin-top:8px" data-a="fotoLogin">Foto da tela de entrada</button></div></div>
      <label class="cp">Seu nome<input maxlength="30" value="${esc(c.nome)}" data-c="cfg" data-k="nome" placeholder="Como quer ser chamado"></label></div>
    <div class="sec"><div class="sec-t"><h3>Salário</h3></div><div class="card" style="padding-top:2px">
      <div class="duas"><label class="cp">Valor líquido (R$)<input class="money" inputmode="numeric" value="${num(c.salario.valor)}" data-c="cfg" data-k="salValor"></label><label class="cp">Dia do pagamento<input type="number" inputmode="numeric" min="1" max="31" value="${c.salario.dia}" data-c="cfg" data-k="salDia"></label></div>
      <label class="cp">Conta em que cai<select data-c="cfg" data-k="salConta">${optsConta(c.salario.conta)}</select></label></div></div>
    <div class="sec"><div class="sec-t"><h3>Meta de economia do mês</h3></div><div class="card" style="padding-top:2px"><label class="cp">Quanto quer guardar por mês (R$)<input class="money" inputmode="numeric" value="${num(c.metaEconomia)}" data-c="cfg" data-k="meta"></label>
      ${c.salario.valor ? `<p class="pq mu" style="margin-top:8px">20% do seu salário são ${fmt(Math.round(c.salario.valor * .2), true)}.</p>` : ''}</div></div>
    <div class="sec"><div class="sec-t"><h3>Aparência e privacidade</h3></div><div class="card" style="padding-top:2px">
      <div class="cp">Tema</div>${segm('tema', [['escuro', 'Escuro'], ['claro', 'Claro'], ['auto', 'Automático']], c.tema).replace(/<input /g, '<input data-c="cfg" data-k="tema" ')}
      <label class="tog"><span>Esconder valores<small>Troca os valores por pontinhos nas telas</small></span><input type="checkbox" class="sw" ${c.ocultar ? 'checked' : ''} data-c="cfg" data-k="ocultar"></label></div></div>
    <div class="sec"><div class="sec-t"><h3>Leitura de nota fiscal</h3></div><div class="card" style="padding-top:2px"><label class="cp">Chave da IA (Anthropic)<input type="password" autocomplete="off" placeholder="sk-ant-..." value="${esc(c.apiKey)}" data-c="cfg" data-k="apiKey"></label>
      <p class="pq mu" style="margin-top:8px">Com a chave, a foto da nota é enviada para a IA ler os produtos. Sem ela, o app lê só o QR code e você preenche os itens. A chave fica guardada apenas neste aparelho.</p></div></div>
    <div class="sec"><div class="sec-t"><h3>Seus dados</h3></div><div class="card" style="padding:2px 14px">
      ${itemMenu('exportar', '', 'baixar', 'Exportar para Excel (CSV)', 'Todos os lançamentos, no formato brasileiro')}
      ${itemMenu('backup', '', 'escudo', 'Fazer cópia de segurança', 'Baixa um arquivo com tudo do app')}
      ${itemMenu('restaurar', '', 'enviar', 'Restaurar cópia de segurança', 'Substitui os dados deste aparelho')}
      ${itemMenu('zerar', '', 'lixo', 'Apagar todos os dados', 'Zera o app neste aparelho, inclusive usuário e senha')}</div></div>
    <div class="sec"><div class="sec-t"><h3>Acesso</h3></div><div class="card" style="padding:2px 14px">
      ${itemMenu('trocarSenha', '', 'chave', 'Trocar senha', Auth.ler()?.usuario ? `Usuário: ${esc(Auth.ler().usuario)}` : 'Pede a senha atual')}${itemMenu('comoUsar', '', 'ajuda', 'Como usar', 'Guia rápido em 5 passos')}${itemMenu('sair', '', 'sair', 'Sair', 'Bloqueia o app neste aparelho')}</div></div>
    <p class="pq mu" style="margin-top:16px;text-align:center">Seus dados ficam guardados só neste aparelho. Faça uma cópia de segurança de vez em quando.</p></div>`;
}

/* ---------- leitor de nota fiscal ---------- */
const PROMPT_NOTA = `Você lê cupons e notas fiscais brasileiras (NFC-e). Analise a foto e devolva SOMENTE um JSON válido, sem texto antes ou depois, neste formato:
{"estabelecimento":"nome do estabelecimento","cnpj":"somente os 14 dígitos ou vazio","data":"AAAA-MM-DD","total":0.00,"forma_pagamento":"pix|debito|credito|dinheiro|boleto","itens":[{"descricao":"nome do produto por extenso, sem abreviações","quantidade":1,"valor":0.00,"categoria":"id"}]}
Regras: "valor" é o valor total da linha do item (já multiplicado pela quantidade), em reais, com ponto decimal. "total" é o valor final pago, depois dos descontos. Escreva a descrição por extenso (ex.: "REFRIG COCA 2L" vira "Refrigerante Coca-Cola 2 litros"). Use em "categoria" apenas um destes ids: ${CATS_SAIDA.filter(c => c.grupo !== 'futuro').map(c => `${c.id} (${c.nome})`).join(', ')}. Se não conseguir ler algum campo, deixe vazio ou zero. Não invente itens.`;
async function lerComIA(b64) {
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': DB.config.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MODELO_IA, max_tokens: 4096, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: PROMPT_NOTA }] }] })
    });
  } catch (e) { throw new Error('Sem conexão com a internet para ler a nota.'); }
  if (resp.status === 401 || resp.status === 403) throw new Error('A chave da IA não foi aceita. Confira em Ajustes.');
  if (resp.status === 429) throw new Error('A IA está ocupada ou o limite da chave acabou. Tente de novo em instantes.');
  if (!resp.ok) throw new Error(`A IA não conseguiu ler a nota (erro ${resp.status}).`);
  const j = await resp.json(), txt = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('A IA não devolveu os dados da nota. Tente outra foto, mais nítida.');
  try { return JSON.parse(m[0]); } catch (e) { throw new Error('A resposta da IA veio incompleta. Tente outra foto, mais nítida.'); }
}
function paraCanvas(img, max) {
  const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
}
function lerQr(c) {
  if (typeof jsQR !== 'function') return null;
  try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height), r = jsQR(d.data, c.width, c.height, { inversionAttempts: 'attemptBoth' }); return r ? r.data : null; } catch (e) { return null; }
}
const carregarImagem = file => new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { res(i); setTimeout(() => URL.revokeObjectURL(u), 3000); }; i.onerror = rej; i.src = u; });
async function processarNota(file) {
  state.tela = 'nota'; state.nota = { modo: 'lendo', msg: 'Procurando o QR code da nota…' }; fecharSheet(); render();
  try {
    const img = await carregarImagem(file), grande = paraCanvas(img, 1600);
    const info = lerChaveNfce(lerQr(grande) || lerQr(paraCanvas(img, 900)) || '');
    const n = { modo: 'analise', thumb: paraCanvas(img, 520).toDataURL('image/jpeg', .6), chave: info?.chave || '', cnpj: info?.cnpj || '', numero: info?.numero || '', link: info?.link || '', estabelecimento: '', data: hoje(), total: 0, forma: 'pix', conta: contasBanco()[0]?.id || '', itens: [], aviso: '' };
    if (DB.config.apiKey) {
      state.nota = { modo: 'lendo', msg: 'Lendo os produtos da nota…' }; render();
      try {
        const j = await lerComIA(grande.toDataURL('image/jpeg', .82).split(',')[1]);
        n.estabelecimento = String(j.estabelecimento || '').slice(0, 60); n.total = paraCentavos(j.total);
        if (/^\d{4}-\d{2}-\d{2}$/.test(j.data || '') && j.data <= hoje()) n.data = j.data;
        if (FORMAS[j.forma_pagamento]) n.forma = j.forma_pagamento;
        if (!n.cnpj && /^\d{14}$/.test(String(j.cnpj || '').replace(/\D/g, ''))) n.cnpj = String(j.cnpj).replace(/\D/g, '');
        n.itens = (Array.isArray(j.itens) ? j.itens : []).map(i => ({ descricao: String(i.descricao || 'Item').slice(0, 80), qtd: Number(i.quantidade) || 1, valor: Math.max(0, paraCentavos(i.valor)), categoria: CAT[i.categoria] && grupoDe(i.categoria) !== 'entrada' ? i.categoria : 'outros' })).filter(i => i.valor > 0);
        if (!n.itens.length) n.aviso = 'A IA não encontrou produtos nessa foto. Preencha os itens abaixo ou tente uma foto mais nítida.';
      } catch (e) { n.aviso = e.message + ' Você pode preencher os itens abaixo.'; }
    } else n.aviso = 'Leitura automática dos produtos está desligada (falta a chave da IA em Ajustes). Preencha os itens abaixo.';
    if (!info) n.aviso = (n.aviso ? n.aviso + '\n' : '') + 'Não achei o QR code na foto, então não dá para conferir se a nota já foi lançada.';
    if (!n.itens.length) { n.itens = [{ descricao: '', qtd: 1, valor: 0, categoria: 'mercado' }]; n.modo = 'editar'; }
    state.nota = n; render();
  } catch (e) { console.error(e); state.nota = null; render(); toast('Não consegui abrir a foto. Tente de novo.', true); }
}
const chaveNota = n => n.chave || (n.cnpj ? `s:${n.cnpj}:${n.data}:${n.total}` : '');
function telaNota() {
  const n = state.nota;
  if (!n) return cab('Ler nota fiscal', 'menu') + `<div class="cont-t"><div class="card">${vazio('nota', 'Fotografe a nota inteira, com o QR code aparecendo, em um lugar bem iluminado.')}
      <button class="bt full" data-a="notaCamera">${ic('camera', 20)}Tirar foto da nota</button><button class="bt sec2 full" style="margin-top:10px" data-a="notaGaleria">${ic('imagem', 20)}Escolher da galeria</button></div>
    <div class="av nt"><span class="ic">${ic('ajuda')}</span><p><b>Como funciona</b>O app lê o QR code para identificar a nota, ${DB.config.apiKey ? 'a IA lê os produtos e separa por categoria' : 'e você informa os produtos (a leitura automática liga com a chave da IA, em Ajustes)'}. Depois é só conferir e confirmar.</p></div></div>`;
  if (n.modo === 'lendo') return cab('Ler nota fiscal', 'menu') + `<div class="cont-t"><div class="card" style="padding:40px 14px;text-align:center"><div class="gira"></div><b>${n.msg}</b><p class="pq mu" style="margin-top:6px">Isso leva alguns segundos.</p></div></div>`;
  const dup = chaveNota(n) && DB.lancamentos.find(l => l.chaveNota === chaveNota(n));
  if (n.modo === 'editar') return cab('Editar itens', 'menu') + `<div class="cont-t">
    ${n.aviso ? `<div class="av at" style="margin:0 0 12px"><span class="ic">${ic('alerta')}</span><p style="white-space:pre-line">${esc(n.aviso)}</p></div>` : ''}
    <div class="card" style="padding-top:2px"><label class="cp">Estabelecimento<input id="nEst" maxlength="60" value="${esc(n.estabelecimento)}" placeholder="Ex.: Supermercado"></label>
      <div class="duas"><label class="cp">Data<input id="nData" type="date" value="${n.data}" max="${hoje()}"></label><label class="cp">Total pago (R$)<input id="nTotal" class="money" inputmode="numeric" value="${num(n.total)}"></label></div>
      <label class="cp">Como pagou<select id="nForma">${Object.entries(FORMAS).map(([k, v]) => `<option value="${k}"${k === n.forma ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="sec"><div class="sec-t"><h3>Produtos</h3><button data-a="notaAddItem">Adicionar</button></div>
      ${n.itens.map((i, k) => `<div class="item" data-item="${k}"><div class="l1"><input class="inp n-d" maxlength="80" placeholder="Produto" value="${esc(i.descricao)}"><button class="ib" style="flex:none;color:var(--mu)" data-a="notaDelItem" data-k="${k}" aria-label="Remover item">${ic('lixo', 19)}</button></div><div class="l2"><input class="inp money n-v" inputmode="numeric" aria-label="Valor" value="${num(i.valor)}"><select class="inp n-c" aria-label="Categoria">${optsCat('saida', i.categoria)}</select></div></div>`).join('')}</div>
    <button class="bt full" data-a="notaPronto">Ver análise da nota</button><button class="bt sec2 full" style="margin-top:10px" data-a="notaCancelar">Cancelar</button></div>`;
  const aj = ajustarItens(n.itens.filter(i => i.valor > 0), n.total), porCat = {};
  aj.itens.forEach(i => { (porCat[i.categoria] ||= { v: 0, q: 0 }); porCat[i.categoria].v += i.valor; porCat[i.categoria].q++; });
  return cab('Análise da nota', 'menu') + `<div class="cont-t">
    ${dup ? `<div class="av al" style="margin:0 0 12px"><span class="ic">${ic('alerta')}</span><p><b>Esta nota já foi lançada</b>Em ${br(dup.data)}, como "${esc(dup.descricao)}". Confirmar de novo duplica o gasto.</p></div>` : ''}
    ${n.aviso ? `<div class="av at" style="margin:0 0 12px"><span class="ic">${ic('alerta')}</span><p style="white-space:pre-line">${esc(n.aviso)}</p></div>` : ''}
    <div class="card" style="display:flex;gap:12px;align-items:center">${n.thumb ? `<img src="${n.thumb}" alt="Foto da nota" style="width:64px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--bd)">` : ''}<div style="flex:1;min-width:0"><b>${esc(n.estabelecimento || 'Nota fiscal')}</b><p class="pq mu">${br(n.data)} · ${FORMAS[n.forma]}</p>${n.cnpj ? `<p class="pq mu">CNPJ ${cnpjFmt(n.cnpj)}${n.numero ? ' · nº ' + n.numero : ''}</p>` : ''}${n.link ? `<a class="pq" style="color:var(--acc)" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">Abrir nota na Sefaz</a>` : ''}</div></div>
    <div class="sec"><div class="sec-t"><h3>Total por categoria</h3></div><div class="card" style="padding:4px 14px">${Object.entries(porCat).sort((a, b) => b[1].v - a[1].v).map(([k, o]) => `<div class="ln"><span class="ci" style="background:${cat(k).cor}">${ic(cat(k).icone, 20)}</span><span class="tx"><b>${cat(k).nome}</b><span>${o.q} ${o.q === 1 ? 'item' : 'itens'}</span></span><span class="vl num">${fmt(o.v, true)}</span></div>`).join('') || vazio('nota', 'Nenhum item com valor.')}</div>
      ${aj.desconto ? `<p class="pq mu" style="margin-top:8px">Desconto de ${fmt(aj.desconto, true)} repartido entre os itens na proporção do valor de cada um.</p>` : ''}${aj.falta ? `<p class="pq va" style="margin-top:8px">Os itens somam ${fmt(aj.falta, true)} a menos que o total. A diferença entra em "Outros gastos".</p>` : ''}</div>
    <div class="card" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center"><b>Total da nota</b><b class="num" style="font-size:20px">${fmt(aj.total, true)}</b></div>
    <label class="cp">Saiu de qual conta ou cartão<select id="nConta" data-c="notaConta">${optsPagamento(n.conta)}</select></label>
    <div class="linha-bt"><button class="bt sec2" data-a="notaEditar">${ic('lapis', 18)}Editar itens</button><button class="bt" data-a="notaConfirmar">${ic('ok', 18)}Confirmar</button></div>
    <button class="bt sec2 full" style="margin-top:10px" data-a="notaCancelar">Descartar esta nota</button></div>`;
}
function lerEdicaoNota() {
  const n = state.nota; if (!n || n.modo !== 'editar' || !$('#nEst')) return;
  n.estabelecimento = $('#nEst').value.trim(); n.data = $('#nData').value || hoje(); n.total = centsDe($('#nTotal')); n.forma = $('#nForma').value;
  n.itens = $$('[data-item]').map(el => ({ descricao: $('.n-d', el).value.trim() || 'Item', qtd: n.itens[Number(el.dataset.item)]?.qtd || 1, valor: centsDe($('.n-v', el)), categoria: $('.n-c', el).value }));
}

/* ---------- lançamento: formulário e detalhes ---------- */
const novoLanc = campos => ({ id: uid(), tipo: 'saida', valor: 0, data: hoje(), categoria: 'outros', forma: 'pix', conta: '', fixo: false, descricao: '', itens: [], chaveNota: '', foto: '', origem: '', chaveSalario: '', cofrinhoId: '', movId: '', cartao: '', fatura: '', dataCompra: '', grupo: '', parcela: null, criadoEm: Date.now(), ...campos });
/* As 8 categorias que a pessoa mais usou nos últimos 90 dias, completadas com as mais comuns. */
function topCategorias(tipo) {
  const lim = addDias(hoje(), -90), cont = {}, fora = ['reserva', 'cofrinhos', 'resgate'];
  DB.lancamentos.forEach(l => { if (l.tipo === tipo && l.data >= lim && !l.cofrinhoId && !fora.includes(l.categoria)) cont[l.categoria] = (cont[l.categoria] || 0) + 1; });
  const base = tipo === 'entrada' ? ['salario', 'extra', 'rendimentos', 'reembolso', 'outras'] : ['mercado', 'restaurantes', 'transporte', 'contas', 'lanches', 'saude', 'compras', 'outros'];
  return [...new Set([...Object.entries(cont).sort((a, b) => b[1] - a[1]).map(e => e[0]).filter(k => CAT[k]), ...base])].slice(0, 8);
}
function gridCat(tipo, sel) {
  const tops = topCategorias(tipo); if (sel && CAT[sel] && !tops.includes(sel)) tops[tops.length - 1] = sel;
  return tops.map(k => { const c = cat(k); return `<button type="button" class="${k === sel ? 'on' : ''}" data-a="escCat" data-k="${k}" aria-pressed="${k === sel}"><span class="ci" style="background:${c.cor}">${ic(c.icone, 18)}</span>${c.nome}</button>`; }).join('');
}
function aplicarCat(k) { $('#fCat').value = k; $('#fGrid').innerHTML = gridCat(radio('fTipo'), k); }
function formLanc(l, tipo = 'saida') {
  const grupo = l?.grupo ? DB.lancamentos.filter(x => x.grupo === l.grupo) : null;
  const ultimo = DB.lancamentos.filter(x => x.tipo === tipo && !x.cofrinhoId && !x.chaveSalario).sort((a, b) => b.criadoEm - a.criadoEm)[0];
  const e = l ? { ...l, valor: grupo ? grupo.reduce((t, x) => t + x.valor, 0) : l.valor, data: l.dataCompra || l.data }
    : novoLanc({ tipo, categoria: topCategorias(tipo)[0], forma: ultimo?.forma || 'pix', conta: ultimo?.conta || contasBanco()[0]?.id || '', cartao: ultimo?.cartao || cartoes()[0]?.id || '' });
  state.edit = l ? l.id : null; state.catManual = !!l;
  const ks = cartoes(), credito = e.tipo === 'saida' && e.forma === 'credito' && ks.length > 0;
  const descs = [...new Set(DB.lancamentos.slice().sort((a, b) => b.criadoEm - a.criadoEm).map(x => x.descricao).filter(Boolean))].slice(0, 80);
  abrirSheet(`<div class="sheet-t"><h2>${l ? 'Editar lançamento' : 'Novo lançamento'}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    ${segm('fTipo', [['saida', 'Saída'], ['entrada', 'Entrada']], e.tipo, 'tp')}
    <label class="cp">Valor (R$)<input id="fValor" class="money big" inputmode="numeric" value="${num(e.valor)}"></label>
    <label class="cp">Descrição<input id="fDesc" maxlength="60" list="dlDesc" autocomplete="off" placeholder="Ex.: Uber, mercado, conta de luz" value="${esc(e.descricao)}"></label>
    <datalist id="dlDesc">${descs.map(d => `<option value="${esc(d)}">`).join('')}</datalist>
    <p class="dica" id="fDica" aria-live="polite"></p>
    <div class="cp" style="margin-top:4px">Categoria</div><div class="cgrid" id="fGrid">${gridCat(e.tipo, e.categoria)}</div>
    <details class="mais"><summary>Ver todas as categorias</summary><select id="fCat" class="inp" data-c="catSel" aria-label="Categoria">${optsCat(e.tipo, e.categoria)}</select></details>
    <div class="cp">Data</div><div class="datas"><button type="button" class="chip" data-a="dataRapida" data-n="0">Hoje</button><button type="button" class="chip" data-a="dataRapida" data-n="-1">Ontem</button><input id="fData" class="inp" type="date" value="${e.data}" aria-label="Data"></div>
    <div class="cp" id="fFormaRot">Como ${e.tipo === 'entrada' ? 'recebeu' : 'pagou'}</div>
    <div class="seg">${Object.entries(FORMAS).map(([v, r]) => `<label><input type="radio" name="fForma" value="${v}" data-c="formaMudou"${v === e.forma ? ' checked' : ''}><span>${r}</span></label>`).join('')}</div>
    <div id="fCartaoBox" ${credito ? '' : 'hidden'}><div class="duas"><label class="cp">Cartão<select id="fCartao" data-c="parcMudou">${ks.map(k => `<option value="${k.id}"${k.id === e.cartao ? ' selected' : ''}>${esc(k.nome)}</option>`).join('')}</select></label>
      <label class="cp">Parcelas<select id="fParc" data-c="parcMudou">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}"${i + 1 === (e.parcela?.de || 1) ? ' selected' : ''}>${i ? `${i + 1}x` : 'À vista'}</option>`).join('')}</select></label></div>
      <p class="pq mu" id="fParcInfo" style="margin-top:8px"></p></div>
    <p class="pq mu" id="fSemCartao" style="margin-top:8px" ${e.tipo === 'saida' && e.forma === 'credito' && !ks.length ? '' : 'hidden'}>Cadastre seu cartão em Mais > Minhas contas para separar as compras por fatura e parcelar.</p>
    <label class="cp" id="fContaBox" ${credito ? 'hidden' : ''}>Conta<select id="fConta">${optsConta(e.conta)}</select></label>
    <label class="tog"><span>Lançamento fixo<small>Repete todo mês (aluguel, internet, assinatura)</small></span><input type="checkbox" class="sw" id="fFixo" ${e.fixo ? 'checked' : ''}></label>
    <div class="fixo-bt"><button class="bt full" data-a="salvarLanc">Salvar</button></div>`);
  previaParcelas();
  if (!l) setTimeout(() => $('#fValor')?.focus(), 250);
}
function previaParcelas() {
  const box = $('#fCartaoBox'); if (!box || box.hidden) return;
  const k = cartoes().find(c => c.id === $('#fCartao').value); if (!k) return;
  const n = Number($('#fParc').value) || 1, v = centsDe($('#fValor')), f = faturaDe(k, $('#fData').value || hoje()), p = dividir(v, n);
  $('#fParcInfo').textContent = `${n > 1 ? `${n}x de ${fmt(p[0], true)}. A 1ª parcela entra` : 'Entra'} na fatura de ${nomeFatura(f.fatura)}, que vence em ${br(f.data)}.`;
}
function sugerirNoForm() {
  const dica = $('#fDica'); if (!dica || state.catManual) return;
  const s = sugestao($('#fDesc').value, radio('fTipo')); if (!s) { dica.textContent = ''; return; }
  aplicarCat(s.categoria);
  if (s.fonte === 'hist') {
    const r = s.forma && $(`input[name="fForma"][value="${s.forma}"]`); if (r) { r.checked = true; C.formaMudou(); }
    if (s.conta && contasBanco().some(c => c.id === s.conta)) $('#fConta').value = s.conta;
    if (s.cartao && $('#fCartao') && cartoes().some(c => c.id === s.cartao)) $('#fCartao').value = s.cartao;
    previaParcelas();
  }
  dica.textContent = s.fonte === 'hist' ? `Igual à última vez: ${cat(s.categoria).nome}${s.forma ? ' · ' + FORMAS[s.forma] : ''}` : `Categoria sugerida: ${cat(s.categoria).nome}`;
}
function detalheLanc(l) {
  const c = cat(l.categoria), ent = l.tipo === 'entrada', cof = l.cofrinhoId && DB.cofrinhos.find(k => k.id === l.cofrinhoId);
  const lin = (a, b) => b ? `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--bd);font-size:14px"><span class="mu">${a}</span><span class="dir">${b}</span></div>` : '';
  abrirSheet(`<div class="sheet-t"><h2>Detalhes</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
    <div style="text-align:center;padding:14px 0 16px"><span class="ci" style="width:52px;height:52px;border-radius:16px;display:grid;place-items:center;color:#fff;background:${c.cor};margin:0 auto 10px">${ic(c.icone, 26)}</span><b style="font-size:16px">${esc(tituloLanc(l))}</b><div class="num ${ent ? 'vg' : ''}" style="font-size:28px;font-weight:800;margin-top:4px">${ent ? '+' : '-'} ${fmt(l.valor)}</div></div>
    ${lin(l.cartao ? 'Vencimento da fatura' : 'Data', br(l.data))}${lin('Data da compra', l.dataCompra ? br(l.dataCompra) : '')}${lin('Categoria', c.nome)}${lin('Grupo', GRUPOS[c.grupo]?.nome)}${lin(ent ? 'Como recebeu' : 'Como pagou', FORMAS[l.forma])}${lin('Conta', esc(nomeConta(l.conta)))}${lin('Cartão', l.cartao ? esc(nomeConta(l.cartao)) + ` · fatura de ${nomeFatura(l.fatura)}` : '')}${lin('Parcela', l.parcela ? `${l.parcela.n} de ${l.parcela.de}` : '')}${lin('Fixo', l.fixo ? 'Sim, repete todo mês' : '')}${lin('Cofrinho', cof ? esc(cof.nome) : '')}${lin('CNPJ', l.nota?.cnpj ? cnpjFmt(l.nota.cnpj) : '')}${lin('Nota nº', l.nota?.numero)}
    ${l.itens?.length ? `<div class="sec" style="margin-top:14px"><div class="sec-t"><h3>Produtos da nota</h3></div>${l.itens.map(i => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13.5px;padding:6px 0;border-top:1px solid var(--bd)"><span>${esc(i.descricao)}</span><span class="num">${fmt(i.valor)}</span></div>`).join('')}</div>` : ''}
    ${l.nota?.link ? `<a class="pq" style="color:var(--acc);display:block;margin-top:12px" href="${esc(l.nota.link)}" target="_blank" rel="noopener noreferrer">Abrir nota na Sefaz</a>` : ''}
    ${l.foto ? `<img class="pv" style="margin-top:14px" src="${l.foto}" alt="Foto da nota">` : ''}
    ${cof ? `<p class="pq mu" style="margin-top:12px">Este lançamento veio do cofrinho. Para mudar o valor, apague e faça o movimento de novo.</p>` : ''}
    <div class="linha-bt"><button class="bt sec2" data-a="apagarLanc" data-id="${l.id}">${ic('lixo', 18)}Apagar</button>${cof ? '' : `<button class="bt" data-a="editarLanc" data-id="${l.id}">${ic('lapis', 18)}Editar</button>`}</div>`);
}

/* =====================================================================
   AÇÕES
   ===================================================================== */
const TELAS = { inicio: telaInicio, extrato: telaExtrato, relatorios: telaRelatorios, menu: telaMenu, cofrinhos: telaCofrinhos, cofrinho: telaCofrinho, contas: telaContas, orcamento: telaOrcamento, ajustes: telaAjustes, nota: telaNota };
function render() {
  $('#tela').innerHTML = (TELAS[state.tela] || telaInicio)();
  $$('#nav [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === state.tela || (b.dataset.t === 'menu' && !['inicio', 'extrato', 'relatorios'].includes(state.tela))));
}
const A = {
  ir(el) { state.tela = el.dataset.t; if (el.dataset.id) state.cofre = el.dataset.id; if (state.tela === 'nota') state.nota = null; state.limite = 80; render(); scrollTo(0, 0); },
  fechar: fecharSheet,
  async olho() { if (await salvarConfig({ ocultar: !DB.config.ocultar })) render(); },
  perTipo(el) { state.per = { tipo: el.dataset.k, ref: hoje() }; render(); },
  perMove(el) { state.per.ref = mover(state.per.tipo, state.per.ref, Number(el.dataset.n)); render(); },
  relTipo(el) { state.rel = { tipo: el.dataset.k, ref: hoje() }; render(); },
  relMove(el) { state.rel.ref = mover(state.rel.tipo, state.rel.ref, Number(el.dataset.n)); render(); },
  filtrar(el) { state.filtro = el.dataset.k; state.limite = 80; render(); },
  maisExtrato() { state.limite += 80; $('#lista').innerHTML = listaExtrato(); },
  verAlertas() {
    const al = alertas();
    abrirSheet(`<div class="sheet-t"><h2>Alertas</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>${al.length ? al.map(a => `<div class="av ${a.n}"><span class="ic">${ic('alerta')}</span><p><b>${esc(a.t)}</b>${esc(a.d)}</p></div>`).join('') : vazio('ok', 'Tudo em ordem. Nenhum alerta agora.')}`);
  },
  mais() {
    abrirSheet(`<div class="sheet-t"><h2>O que você quer fazer?</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
      ${itemMenu('fabNota', '', 'nota', 'Ler nota fiscal', 'Foto da nota vira lançamento')}${itemMenu('novaSaida', '', 'desce', 'Nova saída', 'Um gasto ou pagamento')}${itemMenu('novaEntrada', '', 'sobe', 'Nova entrada', 'Dinheiro que entrou')}
      ${itemMenu('fabCofre', '', 'alvo', 'Guardar no cofrinho', 'Depositar em uma meta')}${itemMenu('lancarSalario', '', 'maleta', 'Lançar salário', DB.config.salario.valor ? fmt(DB.config.salario.valor) + ' deste mês' : 'Cadastre o valor em Ajustes')}${itemMenu('trazerFixos', '', 'repete', 'Trazer contas fixas do mês anterior', 'Copia os lançamentos fixos, sem duplicar')}`);
  },
  fabNota() { fecharSheet(); state.tela = 'nota'; state.nota = null; render(); scrollTo(0, 0); },
  novaSaida() { formLanc(null, 'saida'); }, novaEntrada() { formLanc(null, 'entrada'); },
  verLanc(el) { const l = DB.lancamentos.find(x => x.id === el.dataset.id); if (l) detalheLanc(l); },
  editarLanc(el) { const l = DB.lancamentos.find(x => x.id === el.dataset.id); if (l) formLanc(l); },
  async salvarLanc() {
    const valor = centsDe($('#fValor')), data = $('#fData').value, tipo = radio('fTipo'), forma = radio('fForma') || 'pix';
    if (valor <= 0) return toast('Informe um valor maior que zero.', true);
    if (!data) return toast('Informe a data.', true);
    const ant = state.edit && DB.lancamentos.find(x => x.id === state.edit);
    const grupoAnt = ant ? (ant.grupo ? DB.lancamentos.filter(x => x.grupo === ant.grupo) : [ant]) : [];
    const base = { tipo, categoria: $('#fCat').value, forma, fixo: $('#fFixo').checked, descricao: $('#fDesc').value.trim() };
    const k = tipo === 'saida' && forma === 'credito' && !$('#fCartaoBox').hidden ? cartoes().find(c => c.id === $('#fCartao').value) : null;
    const ops = [], usados = new Set();
    if (k) {
      /* compra no cartão: uma linha por parcela, cada uma na fatura do mês certo; ao editar, o grupo antigo é refeito */
      const n = Math.max(1, Math.min(24, Number($('#fParc').value) || 1)), grupo = n > 1 ? (ant?.grupo || uid()) : '';
      if (n > 1) base.fixo = false;
      dividir(valor, n).forEach((v, i) => {
        const id = i === 0 && ant ? ant.id : uid(); usados.add(id);
        ops.push({ s: 'lancamentos', put: { ...(i === 0 && ant ? ant : novoLanc({})), ...base, id, valor: v, dataCompra: data, ...faturaDe(k, data, i), cartao: k.id, conta: '', grupo, parcela: n > 1 ? { n: i + 1, de: n } : null, criadoEm: (ant?.criadoEm || Date.now()) + i, ...(i ? { itens: [], chaveNota: '', foto: '', nota: null, origem: '' } : {}) } });
      });
    } else {
      usados.add(ant ? ant.id : '');
      ops.push({ s: 'lancamentos', put: { ...(ant || novoLanc({})), ...base, valor, data, conta: $('#fConta').value, cartao: '', fatura: '', dataCompra: '', grupo: '', parcela: null } });
    }
    grupoAnt.filter(x => !usados.has(x.id)).forEach(x => ops.push({ s: 'lancamentos', del: x.id }));
    if (await gravar(ops)) { fecharSheet(); toast(ops.filter(o => o.put).length > 1 ? `Compra lançada em ${ops.filter(o => o.put).length} parcelas.` : 'Lançamento salvo.'); render(); }
  },
  async apagarLanc(el) {
    const l = DB.lancamentos.find(x => x.id === el.dataset.id); if (!l) return;
    const c = l.cofrinhoId && DB.cofrinhos.find(k => k.id === l.cofrinhoId), grupo = l.grupo ? DB.lancamentos.filter(x => x.grupo === l.grupo) : [l];
    if (!await confirmar(grupo.length > 1 ? 'Apagar compra parcelada?' : 'Apagar lançamento?', c ? `Isso também apaga o movimento no cofrinho "${c.nome}".` : grupo.length > 1 ? `As ${grupo.length} parcelas desta compra serão apagadas. Não dá para desfazer.` : 'Essa ação não pode ser desfeita.', 'Apagar')) return;
    const ops = grupo.map(x => ({ s: 'lancamentos', del: x.id })); if (c) ops.push({ s: 'cofrinhos', put: { ...c, movimentos: c.movimentos.filter(m => m.id !== l.movId) } });
    if (await gravar(ops)) { fecharSheet(); toast('Lançamento apagado.'); render(); }
  },
  async lancarSalario() {
    const s = DB.config.salario, mes = hoje().slice(0, 7);
    if (!s.valor) { fecharSheet(); state.tela = 'ajustes'; render(); return toast('Cadastre o valor do salário aqui em Ajustes.'); }
    if (DB.lancamentos.some(l => l.chaveSalario === mes)) return toast('O salário deste mês já foi lançado.');
    if (await gravar([{ s: 'lancamentos', put: novoLanc({ tipo: 'entrada', valor: s.valor, categoria: 'salario', conta: contasBanco().some(c => c.id === s.conta) ? s.conta : '', descricao: `Salário de ${MESES[Number(mes.slice(5)) - 1]}`, chaveSalario: mes }) }])) { fecharSheet(); toast('Salário lançado.'); render(); }
  },
  async trazerFixos() {
    const fontes = fixosPendentes();
    if (!fontes.length) { const anterior = addMeses(hoje().slice(0, 8) + '01', -1).slice(0, 7); return toast(DB.lancamentos.some(l => l.fixo && mesDoGasto(l) === anterior) ? 'As contas fixas do mês anterior já foram trazidas.' : 'Não há lançamentos fixos no mês anterior.'); }
    const ops = fontes.map((l, k) => ({ s: 'lancamentos', put: copiaFixo(l, k) }));
    if (await gravar(ops)) { fecharSheet(); toast(`${ops.length} conta${ops.length > 1 ? 's fixas trazidas' : ' fixa trazida'} para este mês. Confira os valores.`); render(); }
  },
  verDisp() {
    const D = disponivelMes(), l = (a, b, cls = '') => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--bd);font-size:14px"><span>${a}</span><b class="num ${cls}">${b}</b></div>`;
    abrirSheet(`<div class="sheet-t"><h2>Como chegamos nesse valor</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
      <p class="pq mu" style="margin:2px 0 10px">${cap(mesAno(hoje()))}</p>
      ${l(`Renda do mês${D.salPrev ? '<small class="mu" style="display:block;font-size:12px">inclui o salário que ainda vai cair</small>' : ''}`, fmt(D.renda), 'vg')}
      ${l('Gastos até agora', '− ' + fmt(D.consumo))}${l('Contas fixas que ainda vão chegar', '− ' + fmt(D.fixas))}${l('Meta de economia do mês', '− ' + fmt(D.meta))}
      ${l('<b>Disponível para gastar</b>', fmt(D.valor), D.valor < 0 ? 'vr' : '')}
      ${D.valor > 0 ? `<p class="pq mu" style="margin-top:2px">Dividido pelos ${D.dias} dias que faltam: uns ${fmt(D.porDia)} por dia.</p>` : ''}
      ${D.cartaoFuturo ? `<div class="av nt"><span class="ic">${ic('cartao')}</span><p><b>No cartão</b>Compras deste mês que caem nas próximas faturas: ${fmt(D.cartaoFuturo)}. Elas pesam no mês em que a fatura vencer.</p></div>` : ''}
      <p class="pq mu" style="margin-top:12px">Depósitos em cofrinhos e investimentos não contam como gasto: fazem parte da sua economia. Contas fixas são as que você marcou como "fixo" no mês passado e ainda não trouxe para este mês.</p>`);
  },
  escCat(el) { state.catManual = true; aplicarCat(el.dataset.k); $('#fDica').textContent = ''; },
  dataRapida(el) { $('#fData').value = addDias(hoje(), Number(el.dataset.n)); previaParcelas(); },
  async instalar() {
    if (state.instalar) { state.instalar.prompt(); const r = await state.instalar.userChoice; state.instalar = null; if (r.outcome === 'accepted') toast('Meu Caixa instalado na tela inicial.'); render(); return; }
    avisar('Instalar na tela inicial', /^https?:$/.test(location.protocol)
      ? 'No iPhone (Safari): toque em Compartilhar e depois em "Adicionar à Tela de Início".\n\nNo Android (Chrome): toque no menu (três pontinhos) e depois em "Instalar app" ou "Adicionar à tela inicial".'
      : 'Para instalar, o Meu Caixa precisa estar publicado em um endereço da internet (https). Aberto direto do arquivo, como agora, ele funciona no navegador, mas não vira app na tela inicial.');
  },

  /* cofrinhos */
  novoCofre() { formCofre(null); }, editarCofre(el) { formCofre(DB.cofrinhos.find(c => c.id === el.dataset.id)); },
  usarSug(el) { $('#cMeta').value = num(Number(el.dataset.v)); },
  async fotoCofre() { const f = await escolherFoto('paisagem'); if (f) { state.fotoTmp = f; const t = $('#cFotoTxt'); if (t) t.textContent = 'Foto escolhida'; } },
  async salvarCofre() {
    const nome = $('#cNome').value.trim(), tipo = $('#cTipo').value; if (!nome) return toast('Dê um nome ao cofrinho.', true);
    const ant = state.edit && DB.cofrinhos.find(c => c.id === state.edit);
    const c = { ...(ant || { id: uid(), movimentos: [], criadoEm: Date.now() }), tipo, nome, frase: $('#cFrase').value.trim(), meta: centsDe($('#cMeta')), prazo: $('#cPrazo').value, foto: state.fotoTmp || '' };
    if (await gravar([{ s: 'cofrinhos', put: c }])) { fecharSheet(); toast('Cofrinho salvo.'); state.cofre = c.id; state.tela = 'cofrinho'; render(); }
  },
  async apagarCofre(el) {
    const c = DB.cofrinhos.find(x => x.id === el.dataset.id); if (!c) return;
    if (!await confirmar(`Apagar o cofrinho "${c.nome}"?`, c.movimentos.length ? 'Os depósitos e resgates continuam no extrato como histórico, mas deixam de estar ligados a um cofrinho.' : 'Essa ação não pode ser desfeita.', 'Apagar')) return;
    const ops = [{ s: 'cofrinhos', del: c.id }, ...DB.lancamentos.filter(l => l.cofrinhoId === c.id).map(l => ({ s: 'lancamentos', put: { ...l, cofrinhoId: '', movId: '' } }))];
    if (await gravar(ops)) { toast('Cofrinho apagado.'); state.tela = 'cofrinhos'; render(); }
  },
  fabCofre() {
    if (!DB.cofrinhos.length) { toast('Crie seu primeiro cofrinho.'); return formCofre(null); }
    abrirSheet(`<div class="sheet-t"><h2>Guardar em qual cofrinho?</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>${DB.cofrinhos.map(c => itemMenu('movCofre', `data-k="deposito" data-id="${c.id}"`, TIPOS_COF[c.tipo]?.[1] || 'alvo', esc(c.nome), fmt(guardado(c)) + ' guardados')).join('')}`);
  },
  movCofre(el) {
    if (el.dataset.id) state.cofre = el.dataset.id; const c = DB.cofrinhos.find(x => x.id === state.cofre), dep = el.dataset.k === 'deposito'; if (!c) return;
    state.mov = el.dataset.k;
    abrirSheet(`<div class="sheet-t"><h2>${dep ? 'Depositar em' : 'Resgatar de'} ${esc(c.nome)}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
      <p class="pq mu" style="margin-top:4px">${dep ? 'Entra como saída que conta como poupança, não como gasto.' : `Disponível: ${fmt(guardado(c))}. Entra no extrato como "Resgate de cofrinho".`}</p>
      <label class="cp">Valor (R$)<input id="mValor" class="money big" inputmode="numeric" value="0,00"></label>
      <div class="duas"><label class="cp">Data<input id="mData" type="date" value="${hoje()}"></label><label class="cp">${dep ? 'Sai da conta' : 'Vai para a conta'}<select id="mConta">${optsConta(contasBanco()[0]?.id || '')}</select></label></div>
      <button class="bt ${dep ? 'vd' : ''} full" style="margin-top:20px" data-a="salvarMov">${dep ? 'Depositar' : 'Resgatar'}</button>`);
    setTimeout(() => $('#mValor')?.focus(), 250);
  },
  async salvarMov() {
    const c = DB.cofrinhos.find(x => x.id === state.cofre), dep = state.mov === 'deposito', valor = centsDe($('#mValor')), data = $('#mData').value || hoje(); if (!c) return;
    if (valor <= 0) return toast('Informe um valor maior que zero.', true);
    if (!dep && valor > guardado(c)) return toast(`Só há ${fmt(guardado(c), true)} neste cofrinho.`, true);
    const mov = { id: uid(), tipo: state.mov, valor, data, criadoEm: Date.now() };
    const l = novoLanc({ tipo: dep ? 'saida' : 'entrada', valor, data, categoria: dep ? (c.tipo === 'emergencia' ? 'reserva' : 'cofrinhos') : 'resgate', conta: $('#mConta').value, descricao: `${dep ? 'Depósito' : 'Resgate'}: ${c.nome}`, cofrinhoId: c.id, movId: mov.id });
    mov.lancId = l.id;
    if (await gravar([{ s: 'cofrinhos', put: { ...c, movimentos: [...c.movimentos, mov] } }, { s: 'lancamentos', put: l }])) { fecharSheet(); toast(dep ? 'Depósito feito.' : 'Resgate feito.'); state.tela = 'cofrinho'; render(); }
  },
  async apagarMov(el) {
    const c = DB.cofrinhos.find(x => x.id === state.cofre), m = c?.movimentos.find(x => x.id === el.dataset.id); if (!m) return;
    if (m.tipo === 'deposito' && guardado(c) - m.valor < 0) return toast('Não dá para apagar: o cofrinho ficaria negativo. Apague antes um resgate.', true);
    if (!await confirmar('Apagar movimento?', 'O lançamento ligado a ele no extrato também será apagado.', 'Apagar')) return;
    const ops = [{ s: 'cofrinhos', put: { ...c, movimentos: c.movimentos.filter(x => x.id !== m.id) } }]; if (DB.lancamentos.some(l => l.id === m.lancId)) ops.push({ s: 'lancamentos', del: m.lancId });
    if (await gravar(ops)) { toast('Movimento apagado.'); render(); }
  },

  /* contas */
  novaConta() { formConta(null); }, editarConta(el) { const c = DB.contas.find(x => x.id === el.dataset.id); if (c?.cartao) formCartao(c); else formConta(c); },
  novoCartao() { formCartao(null); },
  verCartao(el) { const k = DB.contas.find(x => x.id === el.dataset.id); if (k) verCartao(k); },
  async salvarCartao() {
    const nome = $('#xNome').value.trim(), fechamento = parseInt($('#xFech').value, 10), vencimento = parseInt($('#xVenc').value, 10);
    if (!nome) return toast('Informe o nome do cartão.', true);
    if (!(fechamento >= 1 && fechamento <= 31) || !(vencimento >= 1 && vencimento <= 31)) return toast('Os dias de fechamento e vencimento vão de 1 a 31.', true);
    if (fechamento === vencimento) return toast('O dia do fechamento e o do vencimento precisam ser diferentes.', true);
    const ant = state.edit && DB.contas.find(c => c.id === state.edit);
    const k = { ...(ant || { id: uid(), criadoEm: Date.now(), pagas: {}, saldoInicial: 0, dataAjuste: hoje(), ajusteEm: Date.now() }), cartao: true, nome, sigla: sigla(nome), tipo: 'Cartão de crédito', fechamento, vencimento, limite: centsDe($('#xLim')), cor: radio('xCor') || CORES_CONTA[6] };
    const ops = [{ s: 'contas', put: k }];
    /* mudou fechamento ou vencimento: recalcula as faturas das compras que ainda não foram pagas */
    if (ant && (ant.fechamento !== fechamento || ant.vencimento !== vencimento)) DB.lancamentos.filter(l => l.cartao === k.id && !k.pagas?.[l.fatura]).forEach(l => ops.push({ s: 'lancamentos', put: { ...l, ...faturaDe(k, l.dataCompra || l.data, (l.parcela?.n || 1) - 1) } }));
    if (await gravar(ops)) { fecharSheet(); toast('Cartão salvo.'); render(); }
  },
  pagarFatura(el) {
    const k = DB.contas.find(x => x.id === el.dataset.id), ym = el.dataset.k; if (!k) return; const r = resumoFatura(k, ym); state.pag = { id: k.id, ym };
    abrirSheet(`<div class="sheet-t"><h2>Pagar fatura de ${nomeFatura(ym)}</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
      <p class="pq mu" style="margin-top:2px">${esc(k.nome)} · vence ${br(r.venc)}</p>
      <div class="card" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center"><b>${r.pago ? 'Falta pagar' : 'Total da fatura'}</b><b class="num" style="font-size:20px">${fmt(r.falta, true)}</b></div>${r.pago ? `<p class="pq mu" style="margin-top:8px">Já foram pagos ${fmt(r.pago, true)}; entraram compras novas depois. O registro passa a ser o total da fatura.</p>` : ''}
      <div class="duas"><label class="cp">Data do pagamento<input id="pData" type="date" value="${hoje()}"></label><label class="cp">Saiu da conta<select id="pConta">${optsConta(contasBanco()[0]?.id || '')}</select></label></div>
      <p class="pq mu" style="margin-top:12px">O pagamento tira o valor do saldo da conta, mas não conta como gasto novo: as compras já entraram nos relatórios.</p>
      <button class="bt full" style="margin-top:18px" data-a="salvarPag">Confirmar pagamento</button>`);
  },
  async salvarPag() {
    const k = DB.contas.find(x => x.id === state.pag?.id); if (!k) return; const ym = state.pag.ym, r = resumoFatura(k, ym);
    const pagas = { ...(k.pagas || {}), [ym]: { conta: $('#pConta').value, data: $('#pData').value || hoje(), valor: r.total, em: Date.now() } };
    if (await gravar([{ s: 'contas', put: { ...k, pagas } }])) { toast('Fatura marcada como paga.'); render(); verCartao(DB.contas.find(x => x.id === k.id)); }
  },
  async desfazerPag(el) {
    const k = DB.contas.find(x => x.id === el.dataset.id), ym = el.dataset.k; if (!k) return;
    if (!await confirmar('Desfazer pagamento?', `A fatura de ${nomeFatura(ym)} volta a ficar em aberto e o valor volta para o saldo da conta.`, 'Desfazer')) return;
    const pagas = { ...(k.pagas || {}) }; delete pagas[ym];
    if (await gravar([{ s: 'contas', put: { ...k, pagas } }])) { toast('Pagamento desfeito.'); render(); verCartao(DB.contas.find(x => x.id === k.id)); }
  },
  async salvarConta() {
    const nome = $('#kNome').value.trim(); if (!nome) return toast('Informe o nome da conta.', true);
    const ant = state.edit && DB.contas.find(c => c.id === state.edit), saldo = centsDe($('#kSaldo')) * Number(radio('kSinal') || 1);
    const c = { ...(ant || { id: uid(), criadoEm: Date.now() }), nome, sigla: sigla(nome), tipo: $('#kTipo').value, agencia: $('#kAg').value.trim(), numero: $('#kNum').value.trim(), cor: radio('kCor') || CORES_CONTA[5] };
    if (!ant || saldo !== saldoConta(ant)) Object.assign(c, { saldoInicial: saldo, dataAjuste: hoje(), ajusteEm: Date.now() });
    if (await gravar([{ s: 'contas', put: c }])) { fecharSheet(); toast('Conta salva.'); render(); }
  },
  async apagarConta(el) {
    const c = DB.contas.find(x => x.id === el.dataset.id); if (!c) return; const ls = DB.lancamentos.filter(l => l.conta === c.id || l.cartao === c.id), oq = c.cartao ? 'o cartão' : 'a conta';
    if (!await confirmar(`Apagar ${oq} "${c.nome}"?`, ls.length ? `${ls.length} lançamento${ls.length > 1 ? 's continuam' : ' continua'} no extrato, sem ${c.cartao ? 'cartão' : 'conta'}.` : 'Essa ação não pode ser desfeita.', 'Apagar')) return;
    const ops = [{ s: 'contas', del: c.id }, ...ls.map(l => ({ s: 'lancamentos', put: { ...l, conta: l.conta === c.id ? '' : l.conta, cartao: l.cartao === c.id ? '' : l.cartao } }))];
    if (DB.config.salario.conta === c.id) ops.push({ s: 'config', put: { ...DB.config, salario: { ...DB.config.salario, conta: '' } } });
    if (await gravar(ops)) { fecharSheet(); toast(c.cartao ? 'Cartão apagado.' : 'Conta apagada.'); render(); }
  },

  /* relatórios */
  ajudaInd(el) { avisar(IND[el.dataset.k].nome, IND[el.dataset.k].ajuda); },
  ajuda503020() { avisar('Regra 50/30/20', 'Um jeito simples de dividir a renda do mês:\n\n• Essencial, até 50%: moradia, mercado, contas, transporte, saúde, educação, dívidas e pets.\n• Estilo de vida, até 30%: restaurantes, lazer, roupas, assinaturas e outras compras.\n• Futuro, pelo menos 20%: reserva de emergência, cofrinhos e investimentos (aqui entra tudo o que sobrou da renda).\n\nSe o essencial passa de 50%, o ajuste costuma vir do estilo de vida.'); },
  persInd() { const sel = DB.config.indicadores || []; state.indTmp = [...sel.filter(k => IND[k]).map(k => ({ k, on: true })), ...Object.keys(IND).filter(k => !sel.includes(k)).map(k => ({ k, on: false }))]; desenharInd(); },
  indOn(el) { const i = state.indTmp.find(x => x.k === el.dataset.k); i.on = !i.on; desenharInd(); },
  indMove(el) { const t = state.indTmp, i = t.findIndex(x => x.k === el.dataset.k), j = i + Number(el.dataset.n); if (j < 0 || j >= t.length) return; [t[i], t[j]] = [t[j], t[i]]; desenharInd(); },
  async indSalvar() { if (await salvarConfig({ indicadores: state.indTmp.filter(x => x.on).map(x => x.k) })) { fecharSheet(); render(); } },

  /* nota */
  notaCamera() { const i = $('#fileCam'); i.value = ''; i.click(); }, notaGaleria() { const i = $('#fileGal'); i.value = ''; i.click(); },
  notaCancelar() { state.nota = null; render(); scrollTo(0, 0); },
  notaEditar() { state.nota.modo = 'editar'; state.nota.aviso = ''; if (!state.nota.itens.length) state.nota.itens = [{ descricao: '', qtd: 1, valor: 0, categoria: 'mercado' }]; render(); scrollTo(0, 0); },
  notaAddItem() { lerEdicaoNota(); state.nota.itens.push({ descricao: '', qtd: 1, valor: 0, categoria: state.nota.itens.at(-1)?.categoria || 'mercado' }); render(); scrollTo(0, document.body.scrollHeight); },
  notaDelItem(el) { lerEdicaoNota(); state.nota.itens.splice(Number(el.dataset.k), 1); render(); },
  notaPronto() { lerEdicaoNota(); const n = state.nota; if (!n.itens.some(i => i.valor > 0)) return toast('Informe o valor de pelo menos um produto.', true); n.aviso = ''; n.modo = 'analise'; render(); scrollTo(0, 0); },
  async notaConfirmar() {
    const n = state.nota, aj = ajustarItens(n.itens.filter(i => i.valor > 0), n.total), ch = chaveNota(n);
    if (!aj.itens.length) return toast('Adicione pelo menos um produto com valor.', true);
    const dup = ch && DB.lancamentos.find(l => l.chaveNota === ch);
    if (dup && !await confirmar('Esta nota já foi lançada', `Ela entrou em ${br(dup.data)}. Lançar de novo vai contar o mesmo gasto duas vezes.`, 'Lançar mesmo assim')) return;
    const porCat = {}; aj.itens.forEach(i => (porCat[i.categoria] ||= []).push(i));
    const kc = String(n.conta || '').startsWith('k:') ? cartoes().find(c => 'k:' + c.id === n.conta) : null;
    const pagto = kc ? { forma: 'credito', conta: '', cartao: kc.id, dataCompra: n.data, ...faturaDe(kc, n.data) } : { forma: n.forma, conta: n.conta, data: n.data };
    const ops = Object.entries(porCat).map(([k, its], i) => ({ s: 'lancamentos', put: novoLanc({ valor: its.reduce((t, x) => t + x.valor, 0), categoria: k, ...pagto, descricao: n.estabelecimento || 'Nota fiscal', itens: its, chaveNota: ch, nota: { cnpj: n.cnpj, numero: n.numero, link: n.link }, foto: i === 0 ? n.thumb : '', criadoEm: Date.now() + i }) }));
    if (await gravar(ops)) { state.nota = null; state.tela = 'extrato'; state.filtro = ''; state.busca = ''; render(); scrollTo(0, 0); toast(`Nota lançada em ${ops.length} categoria${ops.length > 1 ? 's' : ''}.`); }
  },

  /* ajustes */
  async fotoPerfil() { const f = await escolherFoto('circulo'); if (f && await salvarConfig({ foto: f })) { toast('Foto atualizada.'); render(); } },
  async fotoLogin() { const f = await escolherFoto('retrato'); if (f && await salvarConfig({ fotoLogin: f })) { if (!$('#login').hidden) telaLogin(); else toast('Foto da tela de entrada atualizada.'); } },
  exportar() {
    if (!DB.lancamentos.length) return toast('Ainda não há lançamentos para exportar.');
    const q = v => { v = String(v ?? ''); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }, dec = c => (c / 100).toFixed(2).replace('.', ',');
    const linhas = [['Data', 'Tipo', 'Categoria', 'Grupo', 'Descrição', 'Valor', 'Forma de pagamento', 'Conta', 'Fixo', 'Produtos da nota', 'Cartão', 'Data da compra', 'Parcela']];
    ordenar(DB.lancamentos).reverse().forEach(l => linhas.push([br(l.data), l.tipo === 'entrada' ? 'Entrada' : 'Saída', cat(l.categoria).nome, GRUPOS[grupoDe(l.categoria)]?.nome || 'Entrada', l.descricao, dec(l.valor), FORMAS[l.forma] || '', nomeConta(l.conta), l.fixo ? 'Sim' : 'Não', (l.itens || []).map(i => `${i.descricao} (${dec(i.valor)})`).join(' | '), l.cartao ? nomeConta(l.cartao) : '', l.dataCompra ? br(l.dataCompra) : '', l.parcela ? `${l.parcela.n}/${l.parcela.de}` : '']));
    baixar(`meu-caixa-${hoje()}.csv`, '\uFEFF' + linhas.map(l => l.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); toast('Arquivo CSV gerado.');
  },
  backup() { const { apiKey, ...cfg } = DB.config; baixar(`meu-caixa-copia-${hoje()}.json`, JSON.stringify({ app: 'meu-caixa', versao: 1, exportadoEm: new Date().toISOString(), lancamentos: DB.lancamentos, cofrinhos: DB.cofrinhos, contas: DB.contas, config: cfg }), 'application/json'); toast('Cópia de segurança gerada.'); },
  restaurar() { const i = $('#fileBackup'); i.value = ''; i.click(); },
  async zerar() {
    const n = DB.lancamentos.length;
    if (!await confirmar('Apagar todos os dados?', `Isso apaga ${n} lançamento${n === 1 ? '' : 's'}, ${DB.cofrinhos.length} cofrinho(s), ${contasBanco().length} conta(s), ${cartoes().length} cartão(ões), fotos, ajustes, usuário e senha deste aparelho.`, 'Continuar')) return;
    if (!await confirmar('Tem certeza?', 'Não dá para desfazer. Se quiser guardar algo, cancele e faça antes uma cópia de segurança.', 'Apagar tudo')) return;
    const ops = []; for (const s of ['lancamentos', 'cofrinhos', 'contas']) DB[s].forEach(x => ops.push({ s, del: x.id }));
    ops.push({ s: 'config', put: { ...CONFIG_PADRAO } });
    if (await gravar(ops)) { Auth.apagar(); aplicarTema(); telaLogin(); toast('Tudo apagado. O app está zerado.'); }
  },
  trocarSenha() {
    abrirSheet(`<div class="sheet-t"><h2>Trocar senha</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>
      <label class="cp">Senha atual<input id="sAtual" type="password" autocomplete="current-password"></label><label class="cp">Nova senha (mínimo 4 caracteres)<input id="sNova" type="password" autocomplete="new-password"></label><label class="cp">Repita a nova senha<input id="sConf" type="password" autocomplete="new-password"></label>
      <button class="bt full" style="margin-top:20px" data-a="salvarSenha">Trocar senha</button>`);
  },
  async salvarSenha() {
    const nova = $('#sNova').value;
    if (!await Auth.confere($('#sAtual').value)) return toast('A senha atual não confere.', true);
    if (nova.length < 4) return toast('A nova senha precisa de pelo menos 4 caracteres.', true);
    if (nova !== $('#sConf').value) return toast('As duas senhas novas não são iguais.', true);
    const lembrar = Number(LS.getItem('mc_lembrar') || 0) > Date.now(); await Auth.criar(nova); Auth.entrar(lembrar); fecharSheet(); toast('Senha trocada.');
  },
  comoUsar() {
    const p = [['Cadastre suas contas', 'Em Mais > Minhas contas, informe cada conta e o saldo de hoje.'], ['Informe salário e meta', 'Em Ajustes, coloque o salário líquido, o dia do pagamento e quanto quer guardar por mês.'], ['Lance o dia a dia', 'Toque no + para registrar entradas e saídas, ou fotografe a nota fiscal.'], ['Defina limites e sonhos', 'Em Orçamento, dê um limite para cada categoria. Em Cofrinhos, comece pela reserva de emergência.'], ['Acompanhe e ajuste', 'Veja o Início e os Relatórios toda semana. O sino avisa quando algo sai do combinado.']];
    abrirSheet(`<div class="sheet-t"><h2>Como usar</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div>${p.map(([t, d], i) => `<div class="passo"><i>${i + 1}</i><p><b>${t}</b>${d}</p></div>`).join('')}`);
  },
  async sair() { if (await confirmar('Sair do Meu Caixa?', 'Seus dados continuam guardados. Será preciso digitar a senha para entrar de novo.', 'Sair')) { Auth.sair(); telaLogin(); } },

  /* login */
  verSenha(el) { const i = el.parentElement.querySelector('input'), ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; el.innerHTML = ic(ver ? 'olhoX' : 'olho', 20); },
  async entrar() {
    const novo = !Auth.ler(), s = $('#lSenha').value, erro = m => { $('#lErro').textContent = m; };
    if (novo) {
      const nome = $('#lNome').value.trim(), usu = $('#lUsu').value.trim();
      if (!nome) return erro('Informe seu nome.');
      if (!/^[\w.\-@À-ÿ]{3,30}$/.test(usu)) return erro('O usuário precisa ter de 3 a 30 letras ou números, sem espaços.');
      if (s.length < 4) return erro('A senha precisa ter pelo menos 4 caracteres.');
      if (s !== $('#lConf').value) return erro('As duas senhas não são iguais.');
      if (!await salvarConfig({ nome })) return;
      await Auth.criar(s, usu);
    } else if (!await Auth.confere(s, $('#lUsu') ? $('#lUsu').value : null)) { $('#lSenha').value = ''; return erro('Usuário ou senha incorretos. Tente de novo.'); }
    Auth.entrar($('#lLembrar').checked); abrirApp();
  },
  async esqueci() { if (await confirmar('Esqueceu a senha?', 'Vamos apagar o usuário e a senha deste aparelho e pedir um novo cadastro. Seus lançamentos, contas e cofrinhos não são apagados.', 'Criar novo usuário')) { Auth.apagar(); telaLogin(); } }
};
function desenharInd() {
  const t = state.indTmp;
  abrirSheet(`<div class="sheet-t"><h2>Indicadores</h2><button class="ib" data-a="fechar" aria-label="Fechar">${ic('x')}</button></div><p class="pq mu" style="margin:4px 0 8px">Escolha quais aparecem e use as setas para mudar a ordem.</p>
    ${t.map((x, i) => `<div class="tog" style="margin-top:0;padding:9px 0;${i ? 'border-top:1px solid var(--bd)' : ''}"><input type="checkbox" class="sw" ${x.on ? 'checked' : ''} data-a="indOn" data-k="${x.k}" aria-label="Mostrar ${IND[x.k].nome}"><span style="flex:1">${IND[x.k].nome}</span><button class="ib" data-a="indMove" data-k="${x.k}" data-n="-1" aria-label="Subir" ${i ? '' : 'disabled style="opacity:.3"'}>${ic('cima', 18)}</button><button class="ib" data-a="indMove" data-k="${x.k}" data-n="1" aria-label="Descer" ${i < t.length - 1 ? '' : 'disabled style="opacity:.3"'}>${ic('baixo', 18)}</button></div>`).join('')}
    <button class="bt full" style="margin-top:16px" data-a="indSalvar">Salvar</button>`);
}
function baixar(nome, conteudo, tipo) {
  const u = URL.createObjectURL(new Blob([conteudo], { type: tipo })), a = document.createElement('a');
  a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}

/* mudanças de campo (salvam na hora) */
const C = {
  tipoMudou() {
    const t = radio('fTipo'), k = topCategorias(t)[0]; state.catManual = false;
    $('#fCat').innerHTML = optsCat(t, k); aplicarCat(k); $('#fFormaRot').textContent = t === 'entrada' ? 'Como recebeu' : 'Como pagou'; $('#fDica').textContent = '';
    C.formaMudou(); sugerirNoForm();
  },
  formaMudou() {
    const cred = radio('fTipo') === 'saida' && radio('fForma') === 'credito', tem = cartoes().length > 0;
    $('#fCartaoBox').hidden = !(cred && tem); $('#fContaBox').hidden = cred && tem; $('#fSemCartao').hidden = !(cred && !tem); previaParcelas();
  },
  parcMudou() { previaParcelas(); },
  catSel(el) { state.catManual = true; $('#fGrid').innerHTML = gridCat(radio('fTipo'), el.value); $('#fDica').textContent = ''; },
  cofTipo(el) { $('#cSug').hidden = el.value !== 'emergencia'; },
  notaConta(el) { state.nota.conta = el.value; },
  async orc(el) { const k = el.dataset.k, v = centsDe(el); if (await salvarConfig({ orcamentos: { ...DB.config.orcamentos, [k]: v } })) $('#ob-' + k).innerHTML = barraOrc(Number(el.dataset.g), v); },
  async cfg(el) {
    const k = el.dataset.k, s = DB.config.salario; let p;
    if (k === 'nome') p = { nome: el.value.trim() };
    else if (k === 'salValor') p = { salario: { ...s, valor: centsDe(el) } };
    else if (k === 'salDia') { const d = Math.min(31, Math.max(1, parseInt(el.value, 10) || 1)); el.value = d; p = { salario: { ...s, dia: d } }; }
    else if (k === 'salConta') p = { salario: { ...s, conta: el.value } };
    else if (k === 'meta') p = { metaEconomia: centsDe(el) };
    else if (k === 'tema') p = { tema: el.value };
    else if (k === 'ocultar') p = { ocultar: el.checked };
    else if (k === 'apiKey') p = { apiKey: el.value.trim() };
    if (p && await salvarConfig(p)) { if (k === 'tema') aplicarTema(); toast('Salvo.'); }
  }
};

/* ---------- tela de entrada ---------- */
function telaLogin() {
  const au = Auth.ler(), novo = !au, c = DB.config, selo = (i, t) => `<div>${ic(i, 22)}<span>${t}</span></div>`;
  fecharSheet(); $('#app').hidden = true; $('#login').hidden = false;
  $('#login').innerHTML = `<div class="lg">
    <svg class="curva c1" viewBox="0 0 200 150" aria-hidden="true"><path d="M70 -12C84 54 130 100 212 112" fill="none" stroke="#7A4DFF" stroke-width="20"/><path d="M112 -12c8 34 38 62 100 72" fill="none" stroke="#4A2BB0" stroke-width="12"/></svg>
    <svg class="curva c2" viewBox="0 0 200 150" aria-hidden="true"><path d="M-12 44c82 10 130 52 142 118" fill="none" stroke="#7A4DFF" stroke-width="20"/><path d="M-12 92c60 8 90 34 100 70" fill="none" stroke="#4A2BB0" stroke-width="12"/></svg>
    ${c.fotoLogin ? `<img class="lg-foto" src="${c.fotoLogin}" alt="Sua foto"><button class="lg-troca" data-a="fotoLogin" aria-label="Trocar foto">${ic('camera', 17)}</button>` : `<button class="lg-sem" data-a="fotoLogin">${ic('camera', 24)}Escolher minha foto</button>`}
    <div class="lg-top">${LOGO}<div><div class="marca">Meu <b>Caixa</b></div><div class="lema">Planeje • Controle • Realize</div></div></div>
    <p class="lg-frase">Construindo uma vida financeira ainda <em>melhor!</em></p>
    <div class="lg-form"><h2>${novo ? 'Crie seu usuário' : c.nome ? `Olá, ${esc(c.nome)}` : 'Entre com seu usuário'}</h2>
      ${novo ? `<label class="pw">${ic('pessoa', 20)}<input id="lNome" maxlength="30" placeholder="Seu nome" autocomplete="name" aria-label="Seu nome" value="${esc(c.nome)}"></label>` : ''}
      ${novo || au.usuario ? `<label class="pw">${ic('chave', 20)}<input id="lUsu" maxlength="30" placeholder="${novo ? 'Usuário (ex.: paulo)' : 'Usuário'}" autocomplete="username" autocapitalize="none" spellcheck="false" aria-label="Usuário"></label>` : ''}
      <label class="pw">${ic('cadeado', 20)}<input id="lSenha" type="password" placeholder="${novo ? 'Senha (mínimo 4 caracteres)' : 'Senha'}" autocomplete="${novo ? 'new-password' : 'current-password'}" aria-label="Senha"><button type="button" data-a="verSenha" aria-label="Mostrar ou esconder a senha">${ic('olho', 20)}</button></label>
      ${novo ? `<label class="pw">${ic('cadeado', 20)}<input id="lConf" type="password" placeholder="Repita a senha" autocomplete="new-password" aria-label="Repita a senha"><button type="button" data-a="verSenha" aria-label="Mostrar ou esconder a senha">${ic('olho', 20)}</button></label>` : ''}
      <p class="lg-erro" id="lErro" role="alert"></p>
      <div class="lg-linha"><label><input type="checkbox" id="lLembrar">Lembrar meu acesso</label>${novo ? '' : `<button type="button" data-a="esqueci">Esqueci minha senha</button>`}</div>
      <button class="btn-entrar" data-a="entrar">${novo ? 'Criar usuário e entrar' : 'Entrar'}</button>
      <div class="selos">${selo('escudo', 'Dados protegidos')}${selo('cadeado', 'Bloqueio com senha')}${selo('carteira', 'Suas finanças')}${selo('olhoX', 'Valores ocultáveis')}</div></div></div>`;
}
function abrirApp() { $('#login').hidden = true; $('#login').innerHTML = ''; $('#app').hidden = false; state.tela = 'inicio'; state.per = { tipo: 'mes', ref: hoje() }; render(); scrollTo(0, 0); }

/* ---------- eventos e partida ---------- */
const seguro = p => Promise.resolve(p).catch(e => { console.error(e); toast('Algo deu errado. Nada foi perdido; tente de novo.', true); });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) { if (e.target.id === 'sheet') fecharSheet(); return; }
  if (el.disabled) return; const f = A[el.dataset.a]; if (f) seguro((async () => f(el, e))());
});
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) seguro((async () => C[el.dataset.c](el))()); });
document.addEventListener('input', e => {
  const el = e.target;
  if (el.classList?.contains('money')) el.value = num(centsDe(el));
  if (el.id === 'fDesc') sugerirNoForm();
  if (el.id === 'fValor' || el.id === 'fData') previaParcelas();
  if (el.dataset?.i === 'buscar') { state.busca = el.value; state.limite = 80; $('#lista').innerHTML = listaExtrato(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#login').hidden && e.target.tagName === 'INPUT') { e.preventDefault(); seguro(A.entrar()); } });
['fileCam', 'fileGal'].forEach(id => $('#' + id).addEventListener('change', e => { const f = e.target.files[0]; if (f) seguro(processarNota(f)); }));
$('#fileBackup').addEventListener('change', e => seguro((async () => {
  const f = e.target.files[0]; if (!f) return; let d;
  try { d = JSON.parse(await f.text()); } catch (err) { return toast('Esse arquivo não é uma cópia de segurança do Meu Caixa.', true); }
  if (d?.app !== 'meu-caixa' || !Array.isArray(d.lancamentos) || !Array.isArray(d.cofrinhos) || !Array.isArray(d.contas)) return toast('Esse arquivo não é uma cópia de segurança do Meu Caixa.', true);
  if (!await confirmar('Restaurar cópia de segurança?', `A cópia de ${br(String(d.exportadoEm || '').slice(0, 10)) || 'data desconhecida'} tem ${d.lancamentos.length} lançamentos. Ela substitui tudo o que está neste aparelho.`, 'Restaurar')) return;
  const ops = [];
  for (const s of ['lancamentos', 'cofrinhos', 'contas']) { DB[s].forEach(x => ops.push({ s, del: x.id })); d[s].filter(x => x && x.id).forEach(x => ops.push({ s, put: x })); }
  ops.push({ s: 'config', put: { ...CONFIG_PADRAO, ...(d.config || {}), apiKey: DB.config.apiKey, id: 'config' } });
  if (await gravar(ops)) { aplicarTema(); toast('Cópia restaurada.'); render(); }
})()));
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', aplicarTema);
window.addEventListener('error', e => console.error(e.error || e.message));

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.instalar = e; });
(async function iniciar() {
  /* manifesto e modo offline só existem quando o app está publicado (http/https); aberto do arquivo, segue funcionando sem eles */
  if (/^https?:$/.test(location.protocol)) {
    const m = document.createElement('link'); m.rel = 'manifest'; m.href = 'manifest.webmanifest'; document.head.appendChild(m);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.warn('Modo offline indisponível', e));
  }
  const nav = $$('#nav button'), rot = [['home', 'Início'], ['lista', 'Extrato'], ['mais', ''], ['graf', 'Relatórios'], ['grade', 'Mais']];
  nav.forEach((b, i) => { b.innerHTML = ic(rot[i][0], i === 2 ? 28 : 22) + (rot[i][1] ? `<span>${rot[i][1]}</span>` : ''); });
  try { await carregar(); } catch (e) { console.error(e); return avisar('Não consegui abrir seus dados', 'O Meu Caixa parece estar aberto em outra aba ou janela. Feche as outras e abra o app de novo. Seus dados continuam guardados.'); }
  aplicarTema();
  if (Auth.logado()) abrirApp(); else telaLogin();
  if (SEM_DISCO && !idb) avisar('Modo de visualização', 'Este jeito de abrir o Meu Caixa não deixa o navegador guardar dados. Dá para criar o usuário e testar as telas, mas tudo se perde ao fechar ou recarregar.\n\nPara usar de verdade, abra o app no navegador (Chrome ou Safari).');
})();
</script>
</body>
</html>
