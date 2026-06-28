// SIGDOC-SUMBE · efectividade-mensal.js
// Módulo: Mapa de Efectividade Mensal — Painel de Chefe de Unidade
// type="module" — carregado por index.html DEPOIS de index-app.js
//
// Depende de window.SIGDOC_CHEFIA, populado por index-app.js quando o
// painel de chefe de unidade é carregado (evento "sigdoc:chefia-carregada").
//
// Modelo de dados (Firestore):
//   efectividade_mensal/{unidadeId}_{AAAA-MM}
//     unidadeId, unidadeNome, mes, estado: "rascunho" | "submetido"
//     elaboradoPor, verificadoPor, submetidoEm, submetidoPorUid, actualizadoEm
//     funcionarios: [{
//       funcionarioId, numeroAgente, nomeCompleto, categoria,
//       falJus, falInj, diasTrab, acrescido,
//       subsidios: { atavio, redta, turno, noct, diut, eind } (bool),
//       ferias: { estado: "sim"|"nao", periodo }
//     }]

import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DIAS_BASE_MES = 24; // fixo, conforme confirmado — não varia por mês

const SUBSIDIOS_DEF = [
  { chave: "atavio", label: "Atávio",        pct: 0.05 },
  { chave: "redta",  label: "R.E.Dta",       pct: 0.07 },
  { chave: "turno",  label: "Turno",         pct: 0.05 },
  { chave: "noct",   label: "Nocturno",      pct: 0.07 },
  { chave: "diut",   label: "Diuturnidade",  pct: 0.03 },
  { chave: "eind",   label: "E. Indisp.",    pct: 0.05 },
];

let _db = null;
let _unidade = null;
let _equipa = [];
let _mapaActual = null;   // doc carregado/criado para o mês seleccionado
let _mesActual = mesAtual();
let _funcEditandoId = null;

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nomeMesPt(mesIso) {
  const [ano, mes] = mesIso.split("-").map(Number);
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${nomes[mes - 1]} / ${ano}`;
}

function idDoMapa(unidadeId, mes) { return `${unidadeId}_${mes}`; }

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}

function listarUltimosMeses(qtd = 6) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < qtd; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

// ── Ciclo de vida: reage ao painel de chefia carregar/limpar ──────────────
document.addEventListener("sigdoc:chefia-carregada", (ev) => {
  _db = ev.detail.db;
  _unidade = ev.detail.unidade;
  _equipa = ev.detail.equipa || [];
  popularSelectMeses();
  carregarOuCriarMapa(_mesActual);
});

document.addEventListener("sigdoc:chefia-limpa", () => {
  _db = null; _unidade = null; _equipa = []; _mapaActual = null;
  const body = document.getElementById("efmensal-body");
  if (body) body.innerHTML = "";
});

function popularSelectMeses() {
  const sel = document.getElementById("efmensal-select-mes");
  if (!sel) return;
  sel.innerHTML = listarUltimosMeses(6)
    .map(m => `<option value="${m}" ${m === _mesActual ? "selected" : ""}>${escaparHtml(nomeMesPt(m))}</option>`)
    .join("");
}

// ── Carregar (ou inicializar) o mapa do mês seleccionado ──────────────────
async function carregarOuCriarMapa(mes) {
  if (!_db || !_unidade) return;
  _mesActual = mes;
  renderCarregando();

  const ref = doc(_db, "efectividade_mensal", idDoMapa(_unidade.id, mes));
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (e) {
    console.warn("Efectividade mensal — leitura:", e);
    renderErro("Não foi possível carregar o mapa de efectividade. Tente novamente.");
    return;
  }

  if (snap.exists()) {
    _mapaActual = { id: snap.id, ...snap.data() };
    // garantir que a lista de funcionários reflecte a equipa actual (novos colaboradores entram, saídos saem)
    _mapaActual.funcionarios = sincronizarLinhas(_mapaActual.funcionarios || []);
  } else {
    _mapaActual = criarMapaVazio(mes);
  }

  render();
}

function criarMapaVazio(mes) {
  return {
    id: idDoMapa(_unidade.id, mes),
    unidadeId: _unidade.id,
    unidadeNome: _unidade.nome || "",
    mes,
    estado: "rascunho",
    elaboradoPor: "",
    verificadoPor: "",
    funcionarios: sincronizarLinhas([]),
  };
}

// Garante 1 linha por funcionário da equipa actual, preservando edições já feitas
function sincronizarLinhas(linhasExistentes) {
  const porId = new Map(linhasExistentes.map(l => [l.funcionarioId, l]));
  return _equipa.map(f => {
    const existente = porId.get(f.id);
    if (existente) {
      // re-sincroniza campos de identidade vindos do cadastro (sempre automáticos)
      existente.numeroAgente = f.numero || f.numeroBeneficiario || "";
      existente.nomeCompleto = f.nomeCompleto || f.nome || "Funcionário sem nome";
      existente.categoria = f.categoria || f.cargo || "Sem categoria definida";
      existente.falJus = existente.falJus ?? 0;
      existente.falInj = existente.falInj ?? 0;
      existente.diasTrab = DIAS_BASE_MES - (existente.falInj || 0);
      existente.acrescido = existente.acrescido ?? 0;
      existente.subsidios = existente.subsidios || {};
      existente.ferias = existente.ferias || { estado: "nao", periodo: "" };
      return existente;
    }
    return {
      funcionarioId: f.id,
      numeroAgente: f.numero || f.numeroBeneficiario || "",
      nomeCompleto: f.nomeCompleto || f.nome || "Funcionário sem nome",
      categoria: f.categoria || f.cargo || "Sem categoria definida",
      falJus: 0,
      falInj: 0,
      diasTrab: DIAS_BASE_MES,
      acrescido: 0,
      subsidios: {},
      ferias: { estado: "nao", periodo: "" },
    };
  }).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt"));
}

// ── Render principal ────────────────────────────────────────────────────
function renderCarregando() {
  const body = document.getElementById("efmensal-body");
  if (body) body.innerHTML = `<div class="vazio-estado" style="padding:32px 18px"><div class="icone">⏳</div><p style="color:var(--txt-2)">A carregar mapa de efectividade…</p></div>`;
}

function renderErro(msg) {
  const body = document.getElementById("efmensal-body");
  if (body) body.innerHTML = `<div class="vazio-estado" style="padding:32px 18px"><div class="icone">⚠️</div><p style="color:var(--txt-2)">${escaparHtml(msg)}</p></div>`;
}

function render() {
  const body = document.getElementById("efmensal-body");
  if (!body || !_mapaActual) return;

  const bloqueado = _mapaActual.estado === "submetido";
  const chip = bloqueado
    ? `<span class="efmensal-estado-chip efmensal-estado-submetido">✓ Submetido</span>`
    : `<span class="efmensal-estado-chip efmensal-estado-rascunho">● Rascunho</span>`;

  const linhas = _mapaActual.funcionarios.map((f, i) => linhaHtml(f, i + 1, bloqueado)).join("");

  const semFuncionarios = _mapaActual.funcionarios.length === 0
    ? `<tr><td colspan="6"><div class="vazio-estado" style="padding:24px"><div class="icone">👥</div><p style="color:var(--txt-2)">Sem funcionários nesta unidade.</p></div></td></tr>`
    : linhas;

  body.innerHTML = `
    <div class="efmensal-toolbar">
      <div class="efmensal-toolbar-info">
        ${chip}
        <span>${_mapaActual.funcionarios.length} ${_mapaActual.funcionarios.length === 1 ? "colaborador" : "colaboradores"}</span>
        ${_mapaActual.estado === "submetido" && _mapaActual.submetidoEm ? `<span>· Submetido em ${formatarDataHora(_mapaActual.submetidoEm)}</span>` : ""}
      </div>
      <div class="efmensal-toolbar-btns">
        <button class="efmensal-btn efmensal-btn-exportar" onclick="EFM.exportarPdf()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          Exportar PDF
        </button>
        ${bloqueado
          ? `<button class="efmensal-btn efmensal-btn-secundario" onclick="EFM.reabrirRascunho()">↺ Reabrir para edição</button>`
          : `<button class="efmensal-btn efmensal-btn-primario" onclick="EFM.abrirModalSubmeter()">✓ Submeter mapa</button>`
        }
      </div>
    </div>
    <div class="efmensal-tabela-scroll">
      <table class="efmensal-tabela">
        <thead>
          <tr>
            <th>N/O</th><th>Nº Agente</th><th>Nome Completo</th><th>Categoria</th>
            <th>Dias Trab.</th><th>F. Inj.</th><th>Fal. Jus.</th><th></th>
          </tr>
        </thead>
        <tbody>${semFuncionarios}</tbody>
      </table>
    </div>
  `;
}

function linhaHtml(f, ordem, bloqueado) {
  return `
    <tr>
      <td><span class="efmensal-badge-num">${ordem}</span></td>
      <td class="efmensal-col-auto">${escaparHtml(f.numeroAgente || "—")}</td>
      <td class="efmensal-col-nome efmensal-col-auto">${escaparHtml(f.nomeCompleto)}</td>
      <td class="efmensal-col-categoria efmensal-col-auto">${escaparHtml(f.categoria)}</td>
      <td class="efmensal-col-auto">${f.diasTrab}</td>
      <td>${f.falInj || 0}</td>
      <td>${f.falJus || 0}</td>
      <td><button class="efmensal-btn-editar" ${bloqueado ? "disabled" : ""} onclick="EFM.abrirModalFunc('${f.funcionarioId}')">Editar</button></td>
    </tr>
  `;
}

function formatarDataHora(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

// ── Persistência ────────────────────────────────────────────────────────
async function gravarMapa() {
  if (!_db || !_mapaActual) return;
  const ref = doc(_db, "efectividade_mensal", _mapaActual.id);
  const payload = { ..._mapaActual, actualizadoEm: serverTimestamp() };
  await setDoc(ref, payload, { merge: true });
}

// ── Modal: editar funcionário ───────────────────────────────────────────
function abrirModalFunc(funcionarioId) {
  if (!_mapaActual || _mapaActual.estado === "submetido") return;
  const f = _mapaActual.funcionarios.find(x => x.funcionarioId === funcionarioId);
  if (!f) return;
  _funcEditandoId = funcionarioId;

  document.getElementById("efm-mf-nome").textContent = f.nomeCompleto;
  document.getElementById("efm-mf-meta").textContent = `${f.categoria} · Nº ${f.numeroAgente || "—"}`;
  document.getElementById("efm-mf-faljus").value = f.falJus || 0;
  document.getElementById("efm-mf-falinj").value = f.falInj || 0;
  document.getElementById("efm-mf-diastrab").value = f.diasTrab;
  document.getElementById("efm-mf-acrescido").value = f.acrescido || 0;
  document.getElementById("efm-mf-ferias-estado").value = f.ferias?.estado || "nao";
  document.getElementById("efm-mf-ferias-periodo").value = f.ferias?.periodo || "";

  const subWrap = document.getElementById("efm-mf-subsidios");
  subWrap.innerHTML = SUBSIDIOS_DEF.map(s => `
    <label class="efmensal-subsidio-toggle">
      <span>${s.label} <strong>${Math.round(s.pct * 100)}%</strong></span>
      <input type="checkbox" data-chave="${s.chave}" ${f.subsidios?.[s.chave] ? "checked" : ""}>
    </label>
  `).join("");

  document.getElementById("modal-efm-func").style.display = "flex";
}

function fecharModalFunc() {
  document.getElementById("modal-efm-func").style.display = "none";
  _funcEditandoId = null;
}

function recalcularDiasModal() {
  const falInj = Number(document.getElementById("efm-mf-falinj").value || 0);
  document.getElementById("efm-mf-diastrab").value = Math.max(0, DIAS_BASE_MES - falInj);
}

async function guardarModalFunc() {
  if (!_mapaActual || !_funcEditandoId) return;
  const f = _mapaActual.funcionarios.find(x => x.funcionarioId === _funcEditandoId);
  if (!f) return;

  const falInj = Math.max(0, Number(document.getElementById("efm-mf-falinj").value || 0));
  f.falJus = Math.max(0, Number(document.getElementById("efm-mf-faljus").value || 0));
  f.falInj = falInj;
  f.diasTrab = Math.max(0, DIAS_BASE_MES - falInj);
  f.acrescido = Math.max(0, Number(document.getElementById("efm-mf-acrescido").value || 0));
  f.ferias = {
    estado: document.getElementById("efm-mf-ferias-estado").value,
    periodo: document.getElementById("efm-mf-ferias-periodo").value.trim(),
  };

  const subsidios = {};
  document.querySelectorAll("#efm-mf-subsidios input[type=checkbox]").forEach(chk => {
    subsidios[chk.dataset.chave] = chk.checked;
  });
  f.subsidios = subsidios;

  try {
    await gravarMapa();
    fecharModalFunc();
    render();
    window.mostrarNotif?.(`Dados de ${f.nomeCompleto} actualizados.`, "sucesso");
  } catch (e) {
    console.warn("Guardar linha efectividade:", e);
    window.mostrarNotif?.("Não foi possível guardar. Tente novamente.", "erro");
  }
}

// ── Submissão / aprovação ───────────────────────────────────────────────
function abrirModalSubmeter() {
  if (!_mapaActual) return;
  document.getElementById("efm-sub-elaborado-por").value = _mapaActual.elaboradoPor || "";
  document.getElementById("modal-efm-submeter").style.display = "flex";
}

function fecharModalSubmeter() {
  document.getElementById("modal-efm-submeter").style.display = "none";
}

async function confirmarSubmissao() {
  const elaboradoPor = document.getElementById("efm-sub-elaborado-por").value.trim();
  if (!elaboradoPor) {
    window.mostrarNotif?.("Indique o nome de quem elaborou o mapa.", "aviso");
    return;
  }
  const chefia = window.SIGDOC_CHEFIA;
  const nomeChefe = chefia?.funcionario?.nomeCompleto || chefia?.funcionario?.nome || chefia?.utilizadorActual?.displayName || "Chefe de Unidade";

  _mapaActual.elaboradoPor = elaboradoPor;
  _mapaActual.verificadoPor = nomeChefe;
  _mapaActual.estado = "submetido";
  _mapaActual.submetidoEm = serverTimestamp();
  _mapaActual.submetidoPorUid = chefia?.utilizadorActual?.uid || null;

  try {
    await gravarMapa();
    fecharModalSubmeter();
    render();
    window.mostrarNotif?.("Mapa de efectividade submetido com sucesso.", "sucesso");
  } catch (e) {
    console.warn("Submeter efectividade:", e);
    window.mostrarNotif?.("Não foi possível submeter o mapa. Tente novamente.", "erro");
  }
}

async function reabrirRascunho() {
  if (!_mapaActual) return;
  _mapaActual.estado = "rascunho";
  try {
    await gravarMapa();
    render();
    window.mostrarNotif?.("Mapa reaberto para edição.", "info");
  } catch (e) {
    console.warn("Reabrir efectividade:", e);
    window.mostrarNotif?.("Não foi possível reabrir o mapa.", "erro");
  }
}

function mudarMes(mes) {
  carregarOuCriarMapa(mes);
}

// ── Exportação para PDF, fiel ao mapa institucional ─────────────────────
async function exportarPdf() {
  if (!_mapaActual || !_unidade) return;
  try {
    window.SIGDOC_EXPORT_PDF(_mapaActual, _unidade);
  } catch (e) {
    console.error("Exportar efectividade:", e);
    window.mostrarNotif?.("Não foi possível gerar o PDF.", "erro");
  }
}

// ── API pública (usada pelo HTML via onclick) ───────────────────────────
window.EFM = {
  mudarMes,
  abrirModalFunc,
  fecharModalFunc,
  recalcularDiasModal,
  guardarModalFunc,
  abrirModalSubmeter,
  fecharModalSubmeter,
  confirmarSubmissao,
  reabrirRascunho,
  exportarPdf,
};
