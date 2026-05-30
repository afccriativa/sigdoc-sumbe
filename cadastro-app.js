// SIGDOC-SUMBE · cadastro-app.js
// type="module" — importado por cadastro.html via <script type="module" src="cadastro-app.js">
// Firebase Auth + Firestore + lógica de cadastro, ficha, duplicados e auditoria.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs,
         addDoc, setDoc, updateDoc, serverTimestamp, writeBatch, query, orderBy, where, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const firebaseConfig = window.SIGDOC_CONFIG.config;
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const etiquetasPerfil={admin:"Administrador do Sistema",director:"Director Municipal",chefe:"Chefe de Secção",tecnico:"Técnico de RH",secretaria:"Secretaria",funcionario:"Funcionário de Unidade"};
const perfisPermitidos=["admin","tecnico","chefe","director","secretaria"];
let todosOsFuncionarios=[], utilizadorActual=null, funcionarioEmEdicao=null, _perfilActual=null;
let _unidadesCatalogo = [];
function normalizarPerfilCadastro(docPerfil) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.normalizarPerfilDoc(docPerfil)
    : (typeof docPerfil === "string" ? { perfil: docPerfil, roles: [docPerfil] } : (docPerfil || {}));
}
function temAlgumRoleCadastro(docPerfil, roles) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.temAlgumRole(docPerfil, roles)
    : [].concat(roles || []).includes(typeof docPerfil === "string" ? docPerfil : docPerfil?.perfil);
}
function obterPerfilPrincipalCadastro(docPerfil) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.obterPerfilPrincipal(docPerfil)
    : (typeof docPerfil === "string" ? docPerfil : (docPerfil?.perfil || "funcionario"));
}
// Mapa funcionarioId → {nomeUnidade, tipoUnidade, cargo, dataInicio}
// Construído na carga inicial — usado em verFicha para o campo "Responsável por"
let _unidadesRespMap = {};
function _exigirPerfil(perfisPermitidos) {
  if (!utilizadorActual) return false;
  return temAlgumRoleCadastro(_perfilActual, perfisPermitidos);
}

function configurarFormularioCadastro() {
  ["f-nome","f-sexo","f-numero","f-categoria","f-unidade","f-vinculo","f-regime","f-admissao"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.required = true;
  });
  var nome = document.getElementById("f-nome");
  if (nome) nome.autocomplete = "name";
  var tel = document.getElementById("f-telefone");
  if (tel) tel.autocomplete = "tel";
  var email = document.getElementById("f-email");
  if (email) email.autocomplete = "email";
  var numero = document.getElementById("f-numero");
  if (numero) numero.inputMode = "numeric";
  configurarCampoSalarioBase();

  var categoriaManual = document.getElementById("f-categoria-manual");
  if (categoriaManual) categoriaManual.disabled = true;
  var cargoManual = document.getElementById("f-cargo-manual");
  if (cargoManual) cargoManual.disabled = true;
  var seccao = document.getElementById("f-seccao");
  if (seccao) seccao.disabled = true;
  var area = document.getElementById("f-area");
  if (area) area.disabled = true;

  var form = document.getElementById("form-funcionario");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      window.guardarFuncionario();
    });
  }
}

function renderCatalogoUnidadesCadastro() {
  const filtroActualRaw = document.getElementById("filtro-local")?.value || "";
  const filtroActualBase = window.SIGDOC_UNIDADES.obterBase(filtroActualRaw) || {};
  window.SIGDOC_UNIDADES.renderUnidadeSelect(document.getElementById("filtro-local"), _unidadesCatalogo, {
    includeBlank: true,
    blankLabel: "Todos os Locais",
    valueField: "id",
    useAbbreviation: true,
    selected: filtroActualBase.id || filtroActualRaw
  });
  window.SIGDOC_UNIDADES.renderUnidadeSelect(document.getElementById("f-unidade"), _unidadesCatalogo, {
    includeBlank: true,
    blankLabel: "Seleccione...",
    selected: document.getElementById("f-unidade")?.value || ""
  });
  window.SIGDOC_UNIDADES.renderSeccaoSelect(document.getElementById("f-seccao"), {
    includeBlank: true,
    blankLabel: "Seleccione a Seccao...",
    selected: document.getElementById("f-seccao")?.value || ""
  });
}

function resolverUnidadeRef(valor) {
  const bruto = valor && typeof valor === "object"
    ? { id: valor.id || valor.unidadeId || "", nome: valor.nome || valor.unidade || "" }
    : { id: "", nome: valor || "" };
  const base = window.SIGDOC_UNIDADES.obterBase(bruto.id || bruto.nome) || {};
  return {
    id: bruto.id || base.id || "",
    nome: bruto.nome || base.nome || "",
    tipo: base.tipo || ""
  };
}

function infoUnidadeFuncionario(f) {
  return resolverUnidadeRef({ id: f?.unidadeId || "", nome: f?.unidade || "" });
}

function nomeUnidadeFuncionario(f) {
  const info = infoUnidadeFuncionario(f);
  return info.nome || f?.unidade || "";
}

function obterUnidadeSelecionadaCadastro() {
  const sel = document.getElementById("f-unidade");
  if (!sel) return { id: "", nome: "", tipo: "" };
  const opt = sel.selectedOptions && sel.selectedOptions[0];
  return resolverUnidadeRef({
    id: opt?.dataset?.unidadeId || "",
    nome: sel.value || ""
  });
}

function normalizarUnidadeFuncionario(f) {
  const info = infoUnidadeFuncionario(f);
  return {
    ...f,
    unidadeId: info.id || f?.unidadeId || "",
    unidade: info.nome || f?.unidade || "",
    unidadeTipo: info.tipo || f?.unidadeTipo || ""
  };
}

function arredondarMoedaKz(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function obterNumeroMoedaKz(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;

  const bruto = String(valor).replace(/\u00A0/g, " ").trim();
  if (!bruto) return null;

  const negativo = /-/.test(bruto);
  let limpo = bruto
    .replace(/kz/ig, "")
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!limpo) return null;

  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");
  let separadorDecimal = "";

  if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
    separadorDecimal = ultimaVirgula > ultimoPonto ? "," : ".";
  } else if (ultimaVirgula !== -1) {
    const casas = limpo.length - ultimaVirgula - 1;
    separadorDecimal = casas > 0 && casas <= 2 ? "," : "";
  } else if (ultimoPonto !== -1) {
    const casas = limpo.length - ultimoPonto - 1;
    separadorDecimal = casas > 0 && casas <= 2 ? "." : "";
  }

  if (separadorDecimal) {
    const idx = limpo.lastIndexOf(separadorDecimal);
    limpo =
      limpo.slice(0, idx).replace(/[.,-]/g, "") +
      "." +
      limpo.slice(idx + 1).replace(/[.,-]/g, "");
  } else {
    limpo = limpo.replace(/[.,-]/g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(limpo)) return NaN;

  const numero = Number(limpo);
  if (!Number.isFinite(numero)) return NaN;
  return negativo ? -numero : numero;
}

function formatarMoedaKz(valor, opcoes) {
  const cfg = opcoes || {};
  const numero = obterNumeroMoedaKz(valor);
  if (!Number.isFinite(numero)) return "";
  const texto = numero.toLocaleString("pt-PT", {
    minimumFractionDigits: cfg.casasMinimas == null ? 2 : cfg.casasMinimas,
    maximumFractionDigits: cfg.casasMaximas == null ? 2 : cfg.casasMaximas
  });
  return cfg.sufixo === false ? texto : texto + " Kz";
}

function preencherCampoSalarioBase(valor) {
  const el = document.getElementById("f-salario-base");
  if (!el) return;
  const numero = obterNumeroMoedaKz(valor);
  el.value = Number.isFinite(numero) && numero > 0 ? formatarMoedaKz(numero) : "";
}

function lerSalarioBaseFormulario() {
  const el = document.getElementById("f-salario-base");
  if (!el) return { valor: 0, invalido: false, vazio: true };

  const bruto = (el.value || "").trim();
  if (!bruto) return { valor: 0, invalido: false, vazio: true };

  const numero = obterNumeroMoedaKz(bruto);
  if (!Number.isFinite(numero) || numero < 0) {
    return { valor: 0, invalido: true, vazio: false };
  }

  const valor = arredondarMoedaKz(numero);
  el.value = formatarMoedaKz(valor);
  return { valor: valor, invalido: false, vazio: false };
}

function configurarCampoSalarioBase() {
  const el = document.getElementById("f-salario-base");
  if (!el || el.dataset.moedaReady === "1") return;

  el.dataset.moedaReady = "1";
  el.autocomplete = "off";
  el.addEventListener("input", function() {
    this.value = this.value.replace(/[^\d,.\sKkZz-]/g, "");
  });
  el.addEventListener("focus", function() {
    const numero = obterNumeroMoedaKz(this.value);
    if (Number.isFinite(numero)) {
      this.value = formatarMoedaKz(numero, { sufixo: false });
    }
  });
  el.addEventListener("blur", function() {
    const bruto = this.value.trim();
    if (!bruto) {
      this.value = "";
      return;
    }
    const numero = obterNumeroMoedaKz(bruto);
    if (!Number.isFinite(numero) || numero < 0) return;
    this.value = formatarMoedaKz(arredondarMoedaKz(numero));
  });
}

configurarFormularioCadastro();


onAuthStateChanged(auth, async u=>{
  if(!u){window.location.href="index.html";return;}
  try {
    utilizadorActual=u;
    const snap=await getDoc(doc(db,"utilizadores",u.uid));
    if(!snap.exists()){window.location.href="index.html";return;}
    const d=normalizarPerfilCadastro(snap.data());
    if(!temAlgumRoleCadastro(d, perfisPermitidos)){document.getElementById("ecrã-negado").style.display="flex";return;}
    _perfilActual = d;

    // Montar navegação lateral
    window._sigdocAuth = auth;
    SIGDOC_NAV.mount({
      pagina:   "cadastro",
      nome:     d.nome || u.email,
      perfil:   obterPerfilPrincipalCadastro(d),
      roles:    d.roles || [obterPerfilPrincipalCadastro(d)],
      onLogout: async () => {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signOut(auth);
        window.location.href = "index.html";
      }
    });

    // ── Gestão de sessão concorrente ──
    SIGDOC_SESSION.vigiar(db, u.uid, auth);

    document.getElementById("conteudo-principal").style.display="block";
    if(window.lucide) lucide.createIcons();
    carregarFuncionarios();
  } catch(e) {
    // Falha de rede ou Firestore durante o arranque — não redirecionar;
    // mostrar ecrã de erro com opção de retry para preservar o contexto.
    console.error("SIGDOC: falha ao carregar perfil de utilizador —", e);
    const ecraNegado = document.getElementById("ecrã-negado");
    ecraNegado.innerHTML = `
      <div style="color:var(--c-700)"><i data-lucide="wifi-off" style="width:56px;height:56px;stroke-width:1.5"></i></div>
      <h2 style="color:var(--c-800)">Erro de Ligação</h2>
      <p style="color:var(--neu-500)">Não foi possível contactar o servidor.<br>Verifique a sua ligação à internet e tente novamente.</p>
      <button class="btn-novo" style="margin-top:8px;cursor:pointer;" onclick="location.reload()">↺ Tentar novamente</button>
      <a href="index.html" style="font-size:13px;color:var(--neu-500);margin-top:4px;">← Voltar ao Painel</a>`;
    ecraNegado.style.display = "flex";
    if(window.lucide) lucide.createIcons();
  }
});

async function carregarFuncionarios(){
  try{
    const [snap, unidades] = await Promise.all([
      getDocs(query(collection(db,"funcionarios"),orderBy("nome"))),
      window.SIGDOC_UNIDADES.garantirCatalogoMinimo(db, {
        collection, getDocs, doc, setDoc, writeBatch, serverTimestamp
      })
    ]);
    _unidadesCatalogo = unidades;
    renderCatalogoUnidadesCadastro();
    todosOsFuncionarios=[];
    snap.forEach(d=>todosOsFuncionarios.push(normalizarUnidadeFuncionario({id:d.id,...d.data()})));
    // Construir mapa de responsabilidades: funcionarioId → dados da unidade
    _unidadesRespMap = {};
    (_unidadesCatalogo || []).forEach(u=>{
      const rid = u.responsavel?.funcionarioId;
      if(rid) _unidadesRespMap[rid] = {
        nomeUnidade: u.nome  || '',
        tipoUnidade: u.tipo  || '',
        cargo:       u.responsavel?.cargo      || '',
        dataInicio:  u.responsavel?.dataInicio || '',
      };
    });
    actualizarIndicadores(); renderizarTabela(todosOsFuncionarios);
    actualizarBadgeFormPend();
    // ── Deep-link: cadastro.html?abrir=ID (vindo de unidades.html) ──
    const _deepId = new URLSearchParams(location.search).get('abrir');
    if(_deepId){
      // Limpar o param da URL sem recarregar (evita re-trigger em F5)
      history.replaceState(null,'',location.pathname);
      // Aguardar o modal estar pronto (render já ocorreu acima)
      setTimeout(()=>{ window.verFicha && window.verFicha(decodeURIComponent(_deepId)); }, 80);
    }
  }catch(e){console.error(e);notif("Erro ao carregar funcionários.","erro");}
}

function actualizarIndicadores(){
  document.getElementById("ind-total").textContent=todosOsFuncionarios.length;
  document.getElementById("ind-activos").textContent=todosOsFuncionarios.filter(f=>f.estado==="activo").length;
  document.getElementById("ind-quadro").textContent=todosOsFuncionarios.filter(f=>f.vinculo==="quadro").length;
  document.getElementById("ind-provisorio").textContent=todosOsFuncionarios.filter(f=>f.vinculo==="provisorio").length;
}

function calcularAnos(admissao){
  if(!admissao)return null;
  const adm=new Date(admissao+"T12:00:00"),hoje=new Date();
  let anos=hoje.getFullYear()-adm.getFullYear();
  const m=hoje.getMonth()-adm.getMonth();
  if(m<0||(m===0&&hoje.getDate()<adm.getDate()))anos--;
  return anos>=0?anos:0;
}
function calcularDias(anos){
  if(anos===null)return 22;
  if(anos>=30)return 31; if(anos>=20)return 28; if(anos>=10)return 25; return 22;
}

function textoOuTraco(valor) {
  return valor === 0 ? "0" : (valor ? String(valor) : "—");
}

function criarNo(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function limparConteudo(el) {
  if (el) el.textContent = "";
}

function obterUrlSegura(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (e) {
    return "";
  }
}

function criarLinkDocumento(funcId, tipo, url, texto) {
  if (!url) return null;
  const link = document.createElement("a");
  link.innerHTML = texto;
  link.style.color = "var(--c-700)";
  link.style.fontWeight = "700";
  if (url === "local") {
    link.href = "#";
    link.addEventListener("click", function(event) {
      event.preventDefault();
      window.abrirDocFicha(funcId, tipo, link);
    });
    return link;
  }

  const segura = obterUrlSegura(url);
  if (!segura) {
    const aviso = criarNo("span", null, texto + " indisponível");
    aviso.style.color = "var(--neu-500)";
    return aviso;
  }

  link.href = segura;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function renderMensagemDup(msgEl, destaque, antes, depois) {
  limparConteudo(msgEl);
  msgEl.append(document.createTextNode(antes));
  const strong = criarNo("strong", null, destaque || "—");
  msgEl.appendChild(strong);
  msgEl.append(document.createTextNode(depois));
}

// ── PAGINAÇÃO ──
const PAG_TAMANHO = 20;
let _listaActual = [];
let _pagActual   = 1;

function renderizarTabela(lista) {
  _listaActual = lista;
  _pagActual   = 1;
  _renderPagina();
}

function _renderPagina() {
  const total    = _listaActual.length;
  const totalPag = Math.max(1, Math.ceil(total / PAG_TAMANHO));
  _pagActual     = Math.min(_pagActual, totalPag);
  const inicio   = (_pagActual - 1) * PAG_TAMANHO;
  const fatia    = _listaActual.slice(inicio, inicio + PAG_TAMANHO);

  // Contagem
  document.getElementById("contagem-resultado").textContent =
    total + " funcionário(s)";

  // Tabela
  const tb = document.getElementById("corpo-tabela");
  limparConteudo(tb);
  if (total === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    const vazio = criarNo("div", "vazio-tabela");
    const _iconeVazio = criarNo("div", "icone");
    _iconeVazio.innerHTML = '<i data-lucide="users" style="width:48px;height:48px;stroke-width:1.5"></i>';
    vazio.appendChild(_iconeVazio);
    vazio.appendChild(criarNo("p", null, "Nenhum funcionário encontrado."));
    vazio.appendChild(criarNo("small", null, "Clique em \"+ Novo Funcionário\" para começar."));
    td.appendChild(vazio);
    tr.appendChild(td);
    tb.appendChild(tr);
  } else {
    const frag = document.createDocumentFragment();
    fatia.forEach(function(f) {
      const bv = f.vinculo === "quadro" ? "badge-quadro" : "badge-provisorio";
      const lv = f.vinculo === "quadro" ? "Pessoal do Quadro" : f.vinculo === "provisorio" ? "Provimento Provisório" : f.vinculo || "—";
      const be = {activo:"badge-activo",inactivo:"badge-inactivo",licenca:"badge-licenca"}[f.estado] || "badge-activo";
      const le = {activo:"● Em Serviço",inactivo:"○ Inactivo",licenca:"◐ De Licença"}[f.estado] || f.estado || "—";
      const localCurto = window.SIGDOC_CONFIG.abrvUnidade(nomeUnidadeFuncionario(f)||'—');
      const tr = document.createElement("tr");
      tr.addEventListener("click", function() { window.verFicha(f.id); });

      const tdNome = document.createElement("td");
      const nome = criarNo("div", "func-nome", f.nome || "—");
      if (f.formularioPendente) {
        const badgePend = criarNo("span", "badge-form-pend");
        badgePend.innerHTML = '<i data-lucide="clipboard-list" style="width:10px;height:10px;stroke-width:2.5"></i> Form. pendente';
        nome.appendChild(badgePend);
      }
      tdNome.appendChild(nome);
      tdNome.appendChild(criarNo("div", "func-num", "Agente Nº " + (f.numero || "—")));

      const tdCategoria = criarNo("td", null, f.categoria || "—");

      const tdLocal = document.createElement("td");
      tdLocal.appendChild(document.createTextNode(localCurto));
      if (f.seccao) {
        tdLocal.appendChild(document.createElement("br"));
        const seccao = criarNo("small", null, f.seccao);
        seccao.style.color = "var(--neu-400)";
        seccao.style.fontSize = "11px";
        tdLocal.appendChild(seccao);
      }

      const tdVinculo = document.createElement("td");
      tdVinculo.appendChild(criarNo("span", "badge " + bv, lv));

      const tdEstado = document.createElement("td");
      tdEstado.appendChild(criarNo("span", "badge " + be, le));

      const tdAcoes = document.createElement("td");
      tdAcoes.addEventListener("click", function(event) { event.stopPropagation(); });
      const acoes = criarNo("div", "acoes-linha");
      const btnVer = criarNo("button", "btn-ver-linha");
      btnVer.title = "Ver Ficha";
      btnVer.innerHTML = '<i data-lucide="eye" style="width:16px;height:16px;stroke-width:2"></i>';
      btnVer.type = "button";
      btnVer.addEventListener("click", function() { window.verFicha(f.id); });
      const btnEditar = criarNo("button", "btn-editar-linha");
      btnEditar.title = "Editar Funcionário";
      btnEditar.innerHTML = '<i data-lucide="pencil" style="width:16px;height:16px;stroke-width:2"></i>';
      btnEditar.type = "button";
      btnEditar.addEventListener("click", function() { window.editarFuncionario(f.id); });
      acoes.append(btnVer, btnEditar);
      tdAcoes.appendChild(acoes);

      tr.append(tdNome, tdCategoria, tdLocal, tdVinculo, tdEstado, tdAcoes);
      frag.appendChild(tr);
    });
    tb.appendChild(frag);
  }

  // Controlos de paginação
  const pag     = document.getElementById("paginacao-cadastro");
  const info    = document.getElementById("pag-info-cadastro");
  const prev    = document.getElementById("pag-prev-cadastro");
  const next    = document.getElementById("pag-next-cadastro");
  const nums    = document.getElementById("pag-nums-cadastro");

  pag.style.display = total <= PAG_TAMANHO ? "none" : "flex";
  info.textContent  = `${inicio + 1}–${Math.min(inicio + PAG_TAMANHO, total)} de ${total}`;
  prev.disabled     = _pagActual === 1;
  next.disabled     = _pagActual === totalPag;

  // Números de página (máx 5 visíveis)
  let html = "";
  const janela = 2;
  for (let p = 1; p <= totalPag; p++) {
    if (p === 1 || p === totalPag || Math.abs(p - _pagActual) <= janela) {
      html += `<button class="pag-btn${p === _pagActual ? " activo" : ""}" onclick="irParaPagCadastro(${p})">${p}</button>`;
    } else if (Math.abs(p - _pagActual) === janela + 1) {
      html += `<span style="padding:0 4px;color:var(--neu-400);font-size:12px;align-self:center">…</span>`;
    }
  }
  nums.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

window.mudaPagCadastro = function(dir) {
  _pagActual += dir;
  _renderPagina();
  document.getElementById("corpo-tabela").closest(".tabela-card").scrollIntoView({behavior:"smooth",block:"start"});
};

window.irParaPagCadastro = function(p) {
  _pagActual = p;
  _renderPagina();
};

window.pesquisar = function() {
  const t = document.getElementById("campo-pesquisa").value.toLowerCase().trim();
  const l = document.getElementById("filtro-local").value;
  renderizarTabela(todosOsFuncionarios.filter(f => {
    const mt = !t || (f.nome||"").toLowerCase().includes(t) || (f.numero||"").toLowerCase().includes(t) || (f.categoria||"").toLowerCase().includes(t);
    const ml = !l || infoUnidadeFuncionario(f).id === l;
    return mt && ml;
  }));
};

let _filtrandoFormPend = false;

window.filtrarFormPendente = function(btn) {
  _filtrandoFormPend = !_filtrandoFormPend;
  btn.style.background = _filtrandoFormPend ? "#fcd34d" : "#fef3c7";
  btn.style.fontWeight  = _filtrandoFormPend ? "800" : "";
  if (_filtrandoFormPend) {
    renderizarTabela(todosOsFuncionarios.filter(f => f.formularioPendente));
  } else {
    pesquisar();
  }
};

// Actualizar badge de formulários pendentes sempre que a lista recarrega
function actualizarBadgeFormPend() {
  const total = todosOsFuncionarios.filter(f => f.formularioPendente).length;
  const span  = document.getElementById("conta-form-pend");
  if (!span) return;
  if (total > 0) {
    span.textContent = total;
    span.style.display = "flex";
  } else {
    span.style.display = "none";
  }
}

// Marcar formulário como revisto (RH confirma que leu os dados)
window.marcarFormRevisto = async function(id, btn) {
  if (!_exigirPerfil(["admin","chefe","tecnico"])) return;
  btn.disabled = true;
  btn.textContent = "A guardar…";
  try {
    await updateDoc(doc(db, "funcionarios", id), {
      formularioPendente: false,
      formularioRevistoEm: serverTimestamp(),
      formularioRevistoBy: utilizadorActual.uid
    });
    // Remover faixa de aviso e actualizar lista em memória
    const faixa = document.getElementById("faixa-form-pend");
    if (faixa) faixa.remove();
    const idx = todosOsFuncionarios.findIndex(x => x.id === id);
    if (idx > -1) {
      todosOsFuncionarios[idx].formularioPendente = false;
      actualizarBadgeFormPend();
      renderizarTabela(todosOsFuncionarios);
    }
    notif("Formulário marcado como revisto.", "sucesso");
  } catch(e) {
    console.error(e);
    notif("Erro ao guardar. Tente novamente.", "erro");
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;stroke-width:2.5"></i> Marcar como revisto'; if(window.lucide) lucide.createIcons();
  }
};

window.verificarDireccao=function(){
  const un = obterUnidadeSelecionadaCadastro();
  const eDir = window.SIGDOC_UNIDADES.isDms(un);
  const eCentro = window.SIGDOC_UNIDADES.isCentro(un);
  const seccao=document.getElementById("f-seccao");
  const area=document.getElementById("f-area");
  document.getElementById("campo-seccao-wrap").classList.toggle("campo-oculto",!eDir);
  document.getElementById("campo-area-wrap").classList.toggle("campo-oculto",!eCentro);
  if(seccao){
    seccao.disabled=!eDir;
    seccao.required=eDir;
    if(!eDir)seccao.value="";
  }
  if(area){
    area.disabled=!eCentro;
    if(!eCentro)area.value="";
  }
};

window.abrirFormulario=function(){
  if(!_exigirPerfil(["admin","chefe","tecnico"])){console.warn("Acesso negado: abrirFormulario");return;}
  funcionarioEmEdicao=null;
  document.getElementById("titulo-modal").innerHTML='<i data-lucide="plus" style="width:18px;height:18px;stroke-width:2.5"></i> Registar Novo Funcionário';
  document.getElementById("funcionario-id").value="";
  limparForm();
  // Mostrar salário apenas para perfis com acesso
  var wrapSal=document.getElementById('campo-salario-wrap');
  if(wrapSal) wrapSal.style.display=temAlgumRoleCadastro(_perfilActual, ['admin','chefe','tecnico'])?'block':'none';
  document.getElementById("overlay-formulario").classList.add("activo");
  if(window.lucide) lucide.createIcons();
};

window.editarFuncionario=function(id){
  if(!_exigirPerfil(["admin","chefe","tecnico"])){console.warn("Acesso negado: editarFuncionario");return;}
  const f=todosOsFuncionarios.find(x=>x.id===id);if(!f)return;
  funcionarioEmEdicao=id;
  document.getElementById("titulo-modal").innerHTML='<i data-lucide="pencil" style="width:18px;height:18px;stroke-width:2.5"></i> Editar Funcionário';
  document.getElementById("funcionario-id").value=id;
  ["nome","sexo","nascimento","bi","telefone","numero","unidade","vinculo","regime","admissao","escolaridade","observacoes","inss","banco","provinciaNatal","municipioNatal"].forEach(k=>{
    const el=document.getElementById("f-"+k); if(el) el.value=f[k]||"";
  });
  const unidadeEdit = infoUnidadeFuncionario(f);
  const elUnidade = document.getElementById("f-unidade");
  if(elUnidade) elUnidade.value = unidadeEdit.nome || "";
  // ── Novos campos: Complementares ──
  var camposCompl = {
    'f-estadoCivil': f.estadoCivil||'',
    'f-biEmissao':   f.biEmissao||'',
    'f-nomePai':     f.nomePai||'',
    'f-nomeMae':     f.nomeMae||'',
    'f-morada':      f.morada||'',
    'f-email':       f.email||''
  };
  Object.keys(camposCompl).forEach(function(id){
    var el = document.getElementById(id); if(el) el.value = camposCompl[id];
  });
  // biValidade
  var biVitalicioActual = f.biVitalicio === true || f.biVitalicio === 'true';
  var elBiVitalOpcao = document.getElementById('f-biVitalicioOpcao');
  if(elBiVitalOpcao) elBiVitalOpcao.value = biVitalicioActual ? 'sim' : (f.biValidade ? 'nao' : '');
  var elBiVal = document.getElementById('f-biValidade');
  if(elBiVal){ elBiVal.value = biVitalicioActual ? '' : (f.biValidade||''); verificarValidadeBI(); }
  var temCompl = f.estadoCivil||f.biEmissao||f.nomePai||f.nomeMae||f.morada||f.email;
  if(temCompl) expandirSecao('secao-complementar');
  else document.getElementById('secao-complementar').classList.add('recolhida');
  // Salário Base
  var wrapSal = document.getElementById('campo-salario-wrap');
  if(wrapSal) wrapSal.style.display=temAlgumRoleCadastro(_perfilActual, ['admin','chefe','tecnico'])?'block':'none';
  var elSal = document.getElementById('f-salario-base');
  if(elSal) preencherCampoSalarioBase(f.salarioBase);
  // Número de Conta
  var elNC = document.getElementById('f-numeroConta');
  if(elNC){ elNC.value = f.numeroConta||''; if(f.numeroConta) validarNumeroConta(elNC); }

  // ── Novos campos: Formação ──
  // Normaliza o flag independente do tipo gravado (boolean ou string legada)
  limparEstudando();
  var _eStudando = f.estudando === true  || f.estudando === 'true'  || f.estudando === 'sim';
  var _eNaoStudando = f.estudando === false || f.estudando === 'false' || f.estudando === 'nao' || f.estudando === 'não';
  if(_eStudando){
    setEstudando(true);
    var elCurso = document.getElementById('f-curso'); if(elCurso) elCurso.value = f.curso||'';
    var elInst  = document.getElementById('f-instituicao'); if(elInst) elInst.value = f.instituicao||'';
    var elAno   = document.getElementById('f-anoCurso'); if(elAno) elAno.value = f.anoCurso||'';
    var elMod   = document.getElementById('f-modalidadeEstudo'); if(elMod) elMod.value = f.modalidadeEstudo||'';
    expandirSecao('secao-formacao');
  } else if(_eNaoStudando){
    setEstudando(false);
    expandirSecao('secao-formacao');
  } else {
    document.getElementById('secao-formacao').classList.add('recolhida');
  }
  // Categoria — verificar se está na lista ou é manual
  (function(){
    const sel=document.getElementById("f-categoria");
    const opts=[...sel.options].map(o=>o.value);
    if(f.categoria && !opts.includes(f.categoria)){
      sel.value="__outra__";
      const manual=document.getElementById("f-categoria-manual");
      if(manual){ manual.style.display="block"; manual.value=f.categoria; }
    } else {
      sel.value=f.categoria||"";
    }
    toggleCategoriaOutra(sel);
  })();
  // Cargo — verificar se está na lista ou é manual
  (function(){
    const sel=document.getElementById("f-cargo");
    if(!sel) return;
    const opts=[...sel.options].map(o=>o.value);
    if(f.cargo && !opts.includes(f.cargo)){
      sel.value="__outro_cargo__";
      const manual=document.getElementById("f-cargo-manual");
      if(manual){ manual.style.display="block"; manual.value=f.cargo; }
    } else {
      sel.value=f.cargo||"";
    }
    toggleCargoOutro(sel);
  })();
  document.getElementById("f-estado").value=f.estado||"activo";
  verificarDireccao();
  document.getElementById("f-seccao").value=f.seccao||"";
  document.getElementById("f-area").value=f.area||"";
  // ── Foto: carregar preview se existir ──
  carregarFotoAdmin(f.fotoUrl||'', f.nome||'');
  document.getElementById("overlay-formulario").classList.add("activo");
  if(window.lucide) lucide.createIcons();
};

window.fecharFormulario=function(){
  document.getElementById("overlay-formulario").classList.remove("activo");limparForm();
};

function limparForm(){
  ["f-nome","f-bi","f-telefone","f-numero","f-admissao","f-observacoes","f-nascimento"].forEach(id=>document.getElementById(id).value="");
  ["f-sexo","f-categoria","f-unidade","f-vinculo","f-regime","f-escolaridade","f-seccao","f-area"].forEach(id=>document.getElementById(id).value="");
  const _mc=document.getElementById("f-categoria-manual"); if(_mc){_mc.value="";_mc.style.display="none";_mc.disabled=true;_mc.required=false;}
  const _cg=document.getElementById("f-cargo"); if(_cg) _cg.value="";
  const _cgm=document.getElementById("f-cargo-manual"); if(_cgm){_cgm.value="";_cgm.style.display="none";_cgm.disabled=true;_cgm.required=false;}
  if(document.getElementById('f-inss'))          document.getElementById('f-inss').value          = '';
  if(document.getElementById('f-banco'))         document.getElementById('f-banco').value         = '';
  if(document.getElementById('f-numeroConta')){ document.getElementById('f-numeroConta').value=''; }
  var hNC = document.getElementById('hint-numero-conta'); if(hNC) hNC.style.display='none';
  if(document.getElementById('f-provinciaNatal'))document.getElementById('f-provinciaNatal').value= '';
  if(document.getElementById('f-municipioNatal'))document.getElementById('f-municipioNatal').value= '';
  const wrapSal = document.getElementById('campo-salario-wrap');
  if(wrapSal){ wrapSal.style.display='none'; }
  if(document.getElementById('f-salario-base')) document.getElementById('f-salario-base').value='';

  // ── Novos campos: Complementares ──
  ['f-estadoCivil','f-biEmissao','f-biValidade','f-nomePai','f-nomeMae','f-morada','f-email'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value='';
  });
  var elBiVitalOpcao = document.getElementById('f-biVitalicioOpcao');
  if(elBiVitalOpcao) elBiVitalOpcao.value = '';
  verificarValidadeBI();
  // ── Novos campos: Formação ──
  limparEstudando();
  // ── Recolher secções opcionais ──
  document.getElementById('secao-complementar').classList.add('recolhida');
  document.getElementById('secao-formacao').classList.add('recolhida');
  // ── Resetar foto ──
  carregarFotoAdmin('', '');
  var fi = document.getElementById('f-foto-input'); if(fi) fi.value = '';

  document.getElementById("f-estado").value="activo";
  document.getElementById("campo-seccao-wrap").classList.add("campo-oculto");
  document.getElementById("campo-area-wrap").classList.add("campo-oculto");
  var seccao = document.getElementById("f-seccao");
  if(seccao){ seccao.disabled = true; seccao.required = false; }
  var area = document.getElementById("f-area");
  if(area) area.disabled = true;
}

// ══════════════════════════════════════════════════════
//  FOTOGRAFIA DO FUNCIONÁRIO — CADASTRO ADMINISTRATIVO
// ══════════════════════════════════════════════════════

var _fotoNovaBase64 = null;   // Base64 da nova foto (guardado directamente no Firestore)
var _fotoUrlActual  = '';     // Base64 ou URL já guardada (para não re-processar se não mudou)

// Comprime e converte File para Base64 (máx. 400px, qualidade 0.82)
function _comprimirParaBase64(file) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      var MAX = 400;
      var w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        var ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Erro ao processar imagem.')); };
    img.src = url;
  });
}

// Carrega preview da foto no bloco do formulário
function carregarFotoAdmin(url, nome) {
  _fotoNovaBase64 = null;
  _fotoUrlActual = url || '';
  var circulo = document.getElementById('foto-circulo-admin');
  var inicial = document.getElementById('foto-inicial-admin');
  var estado  = document.getElementById('foto-bloco-estado');
  if (!circulo) return;
  // Remover img anterior
  var imgAnterior = circulo.querySelector('img');
  if (imgAnterior) imgAnterior.remove();
  if (url) {
    var img = document.createElement('img');
    img.src = url;
    img.alt = nome || '';
    img.onerror = function() { img.remove(); if(inicial) inicial.style.display='flex'; };
    if (inicial) inicial.style.display = 'none';
    circulo.insertBefore(img, circulo.firstChild);
    if (estado) { estado.innerHTML = '<i data-lucide="image" style="width:11px;height:11px;stroke-width:2.5"></i> Foto carregada'; estado.style.color = '#16a34a'; if(window.lucide) lucide.createIcons(); }
  } else {
    var ini = (nome || '?')[0].toUpperCase();
    if (inicial) { inicial.textContent = ini; inicial.style.display = 'flex'; }
    if (estado) { estado.textContent = 'Sem fotografia'; estado.style.color = ''; }
  }
}

// Preview imediata quando o utilizador escolhe ficheiro
window.previewFotoAdmin = function(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    notif('Foto demasiado grande. Máximo: 2MB.', 'erro'); input.value = ''; return;
  }
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    notif('Formato não suportado. Use JPG, PNG ou WEBP.', 'erro'); input.value = ''; return;
  }
  var estado = document.getElementById('foto-bloco-estado');
  if (estado) { estado.innerHTML = '<i data-lucide="hourglass" style="width:11px;height:11px;stroke-width:2.5"></i> A processar foto…'; estado.style.color = '#6b7280'; if(window.lucide) lucide.createIcons(); }
  _comprimirParaBase64(file).then(function(base64) {
    _fotoNovaBase64 = base64;
    var circulo = document.getElementById('foto-circulo-admin');
    var inicial  = document.getElementById('foto-inicial-admin');
    var imgAnterior = circulo.querySelector('img');
    if (imgAnterior) imgAnterior.remove();
    var img = document.createElement('img');
    img.src = base64; img.alt = 'Preview';
    if (inicial) inicial.style.display = 'none';
    circulo.insertBefore(img, circulo.firstChild);
    if (estado) { estado.innerHTML = '<i data-lucide="camera" style="width:11px;height:11px;stroke-width:2.5"></i> Nova foto pronta (será guardada ao clicar Guardar)'; estado.style.color = '#d97706'; if(window.lucide) lucide.createIcons(); }
  }).catch(function(e) {
    notif('Erro ao processar a foto: ' + e.message, 'erro');
    if (estado) { estado.textContent = 'Sem fotografia'; estado.style.color = ''; }
  });
};

// Devolve o Base64 da nova foto (ou o valor actual se não mudou) — sem Storage
async function uploadFotoSeNecessario(_ignorado) {
  if (_fotoNovaBase64) return _fotoNovaBase64;
  return _fotoUrlActual || null;
}

// ══════════════════════════════════════════════════════
//  VALIDAÇÃO DE DUPLICADOS
// ══════════════════════════════════════════════════════

// Estado interno do fluxo de confirmação
var _dadosPendentesDup = null;   // objecto dados a guardar se o utilizador confirmar
var _idConflitoAbrir   = null;   // id do funcionário conflituante para abrir ficha

// Normaliza BI para comparação: maiúsculas, sem espaços
function normBI(bi) { return (bi||'').replace(/\s/g,'').toUpperCase(); }

function normalizarNumero(numero) {
  return (numero || '').replace(/\s/g, '').trim();
}

function refIndiceFuncionario(tipo, valor) {
  return doc(db, "funcionarios_indices", tipo + "_" + valor);
}

async function gravarFuncionarioComIndices(dadosBase) {
  const numeroNormalizado = normalizarNumero(dadosBase.numero);
  const biNormalizado = normBI(dadosBase.bi);
  const funcRef = funcionarioEmEdicao
    ? doc(db, "funcionarios", funcionarioEmEdicao)
    : doc(collection(db, "funcionarios"));

  await runTransaction(db, async function(transaction) {
    const snapActual = await transaction.get(funcRef);
    const actual = snapActual.exists() ? snapActual.data() : {};
    const numeroAnterior = normalizarNumero(actual.numeroNormalizado || actual.numero || "");
    const biAnterior = normBI(actual.biNormalizado || actual.bi || "");
    const numeroRef = refIndiceFuncionario("numero", numeroNormalizado);
    const numeroSnap = await transaction.get(numeroRef);
    let biRef = null;
    let biSnap = null;

    if (numeroSnap.exists() && numeroSnap.data().funcionarioId !== funcRef.id) {
      throw new Error("NUMERO_DUPLICADO_BACKEND");
    }

    if (biNormalizado) {
      biRef = refIndiceFuncionario("bi", biNormalizado);
      biSnap = await transaction.get(biRef);
      if (biSnap.exists() && biSnap.data().funcionarioId !== funcRef.id) {
        throw new Error("BI_DUPLICADO_BACKEND");
      }
    }

    const dados = {
      ...dadosBase,
      numeroNormalizado,
      biNormalizado,
    };

    if (funcionarioEmEdicao) {
      transaction.update(funcRef, dados);
    } else {
      transaction.set(funcRef, {
        ...dados,
        criadoEm: serverTimestamp(),
        criadoPor: utilizadorActual.uid
      });
    }

    transaction.set(numeroRef, {
      tipo: "numero",
      valor: numeroNormalizado,
      funcionarioId: funcRef.id,
      actualizadoEm: serverTimestamp()
    });

    if (biRef) {
      transaction.set(biRef, {
        tipo: "bi",
        valor: biNormalizado,
        funcionarioId: funcRef.id,
        actualizadoEm: serverTimestamp()
      });
    }

    if (numeroAnterior && numeroAnterior !== numeroNormalizado) {
      transaction.delete(refIndiceFuncionario("numero", numeroAnterior));
    }
    if (biAnterior && biAnterior !== biNormalizado) {
      transaction.delete(refIndiceFuncionario("bi", biAnterior));
    }
  });
}

// Normaliza nome: minúsculas, sem espaços múltiplos, sem acentos
function normNome(n) {
  return (n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}

/*
 * verificarDuplicados(nome, numero, bi, idEmEdicao)
 * Devolve um objecto de resultado:
 *   { tipo: null }                        → sem conflito, pode gravar
 *   { tipo: 'numero', conflito: {...} }   → bloqueante
 *   { tipo: 'bi',     conflito: {...} }   → confirmável
 *   { tipo: 'nome',   conflito: {...} }   → aviso leve (confirmável)
 */
function verificarDuplicados(nome, numero, bi, idEmEdicao) {
  const outros = todosOsFuncionarios.filter(f => f.id !== idEmEdicao);
  const biNorm = normBI(bi);

  // (a) Número de agente — bloqueante
  if (numero) {
    const confNum = outros.find(f => (f.numero||'').trim() === numero.trim());
    if (confNum) return { tipo: 'numero', conflito: confNum };
  }

  // (b) BI — confirmável (só quando o BI não está vazio)
  if (biNorm) {
    const confBI = outros.find(f => normBI(f.bi) === biNorm);
    if (confBI) return { tipo: 'bi', conflito: confBI };
  }

  // (c) Nome + nascimento — aviso leve
  const nascimento = document.getElementById('f-nascimento')?.value||'';
  if (nome && nascimento) {
    const nNorm = normNome(nome);
    const confNome = outros.find(f =>
      normNome(f.nome) === nNorm && (f.nascimento||'') === nascimento
    );
    if (confNome) return { tipo: 'nome', conflito: confNome };
  }

  return { tipo: null };
}

window.abrirFichaConflito = function() {
  fecharModalDupInterno();
  if (_idConflitoAbrir) {
    setTimeout(function() { window.verFicha && window.verFicha(_idConflitoAbrir); }, 150);
  }
};

window.fecharModalDup = function() {
  fecharModalDupInterno();
};

// Versão interna (chamável dentro do módulo sem depender de window)
function fecharModalDupInterno() {
  document.getElementById('overlay-dup').classList.remove('activo');
  _dadosPendentesDup = null;
}

// K3 fix: funções locais abrirFichaConflito() e fecharModalDup() removidas —
// eram dead code que apenas delegavam para window.abrirFichaConflito e fecharModalDupInterno.
// Todas as chamadas internas ao módulo usam directamente window.* ou fecharModalDupInterno().

// Chamado quando o utilizador clica "Guardar mesmo assim" no modal BI/nome
window.confirmarGravacaoDup = async function() {
  fecharModalDupInterno();
  if (!_dadosPendentesDup) return;
  const { nome, dados } = _dadosPendentesDup;
  _dadosPendentesDup = null;
  await _executarGravacao(nome, dados);
};

// Função separada que efectivamente grava no Firestore
async function _executarGravacao(nome, dados) {
  const btn = document.getElementById('btn-guardar');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> A guardar...';
  try {
    // ── Foto: Base64 já em memória, apenas atribuir ao objecto dados ──
    if (_fotoNovaBase64) {
      dados.fotoUrl = _fotoNovaBase64;
    } else if (_fotoUrlActual) {
      dados.fotoUrl = _fotoUrlActual;
    }

    await gravarFuncionarioComIndices(dados);

    if (funcionarioEmEdicao) {
      notif('Funcionário "' + nome + '" actualizado!');
    } else {
      notif('Funcionário "' + nome + '" registado com sucesso!');
    }
    fecharFormulario(); carregarFuncionarios();
  } catch(e) {
    console.error(e);
    if (e?.message === "NUMERO_DUPLICADO_BACKEND" || e?.message === "BI_DUPLICADO_BACKEND") {
      notif('Conflito detectado no servidor. Recarregue a lista e verifique número e BI antes de guardar.','erro');
    } else {
      notif('Erro ao guardar. Verifique a conexão.','erro');
    }
  } finally {
    btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px;stroke-width:2"></i> Guardar Funcionário'; if(window.lucide) lucide.createIcons();
  }
}

// Mostra o modal de duplicado — configurado por tipo
function mostrarModalDup(tipo, conflito, dadosPendentes, nomeNovo) {
  _idConflitoAbrir   = conflito.id || null;
  _dadosPendentesDup = dadosPendentes;

  var head   = document.getElementById('dup-head');
  var icon   = document.getElementById('dup-icon');
  var titulo = document.getElementById('dup-titulo');
  var sub    = document.getElementById('dup-sub');
  var msg    = document.getElementById('dup-msg');
  var cNome  = document.getElementById('dup-conflito-nome');
  var cDet   = document.getElementById('dup-conflito-detalhe');
  var foot   = document.getElementById('dup-foot');
  var btnP   = document.getElementById('dup-btn-prosseguir');

  // Dados do funcionário conflituante
  cNome.textContent = conflito.nome || '(sem nome)';
  cDet.textContent  = [
    conflito.numero ? 'Nº ' + conflito.numero : null,
    conflito.bi     ? 'BI: ' + conflito.bi    : null,
    conflito.unidade || null,
  ].filter(Boolean).join(' · ');

  if (tipo === 'numero') {
    head.className   = 'dup-head';   // vermelho
    icon.innerHTML = '<i data-lucide="ban" style="width:26px;height:26px;stroke-width:2"></i>'; if(window.lucide) lucide.createIcons();
    titulo.textContent = 'Número de Agente Já Registado';
    sub.textContent    = 'Operação bloqueada — corrija antes de continuar';
    renderMensagemDup(
      msg,
      nomeNovo.numero,
      'O número de agente ',
      ' já existe no sistema. Dois funcionários não podem ter o mesmo número de agente.'
    );
    // Bloqueante: esconder botão "Guardar mesmo assim"
    btnP.style.display = 'none';
  } else if (tipo === 'bi') {
    head.className   = 'dup-head dup-head-aviso';  // âmbar
    icon.innerHTML = '<i data-lucide="alert-triangle" style="width:26px;height:26px;stroke-width:2"></i>'; if(window.lucide) lucide.createIcons();
    titulo.textContent = 'Bilhete de Identidade Duplicado';
    sub.textContent    = 'Confirme se pretende continuar';
    renderMensagemDup(
      msg,
      nomeNovo.bi,
      'O BI ',
      ' já consta no registo de outro funcionário. Pode ser um erro de digitação. Verifique a ficha abaixo antes de prosseguir.'
    );
    btnP.style.display = 'inline-block';
  } else {
    head.className   = 'dup-head dup-head-aviso';
    icon.innerHTML = '<i data-lucide="alert-triangle" style="width:26px;height:26px;stroke-width:2"></i>'; if(window.lucide) lucide.createIcons();
    titulo.textContent = 'Possível Registo Duplicado';
    sub.textContent    = 'Nome e data de nascimento coincidem';
    renderMensagemDup(
      msg,
      nomeNovo.nome,
      'Já existe um funcionário com o nome ',
      ' e a mesma data de nascimento. Pode ser a mesma pessoa registada em duplicado.'
    );
    btnP.style.display = 'inline-block';
  }

  document.getElementById('overlay-dup').classList.add('activo');
}

window.guardarFuncionario=async function(){
  if(!_exigirPerfil(["admin","chefe","tecnico"])){console.warn("Acesso negado: guardarFuncionario");return;}
  const form=document.getElementById("form-funcionario");
  if(form && !form.reportValidity()) return;
  const nome=document.getElementById("f-nome").value.trim();
  const sexo=document.getElementById("f-sexo").value;
  const numero=document.getElementById("f-numero").value.trim();
  const categoria=lerCategoria();
  const cargo=lerCargo();
  const salarioBaseInfo = lerSalarioBaseFormulario();
  const unidadeInfo = obterUnidadeSelecionadaCadastro();
  const unidade = unidadeInfo.nome;
  const vinculo=document.getElementById("f-vinculo").value;
  const regime=document.getElementById("f-regime").value;
  const admissao=document.getElementById("f-admissao").value;
  const seccao=document.getElementById("f-seccao").value;
  if(!nome||!sexo||!numero||!categoria||!unidade||!vinculo||!regime||!admissao){
    notif("Preencha todos os campos obrigatórios (*)","erro");return;
  }
  if(window.SIGDOC_UNIDADES.isDms(unidadeInfo) && !seccao){
    notif("Indique a Secção da Direcção Municipal.","erro");return;
  }

  // ── Construir objecto dados ──
  if(salarioBaseInfo.invalido){
    notif("Indique um salario base valido em Kz, por exemplo 150.000,00.","erro");
    document.getElementById("f-salario-base")?.focus();
    return;
  }
  const bi=document.getElementById("f-bi").value.trim();
  const biVitalicioOpcao = document.getElementById("f-biVitalicioOpcao")?.value||'';
  const biVitalicio = biVitalicioOpcao === 'sim';
  const dados={
    nome,sexo,numero,categoria,cargo,unidade,vinculo,regime,admissao,seccao,
    unidadeId: unidadeInfo.id || "",
    unidadeTipo: unidadeInfo.tipo || window.SIGDOC_UNIDADES.obterTipo(unidadeInfo.nome) || "",
    area: window.SIGDOC_UNIDADES.isCentro(unidadeInfo) ? document.getElementById("f-area").value : "",
    provinciaNatal: document.getElementById("f-provinciaNatal")?.value?.trim()||'',
    municipioNatal: document.getElementById("f-municipioNatal")?.value?.trim()||'',
    nascimento:document.getElementById("f-nascimento").value,
    bi,
    biValidade: biVitalicioOpcao === 'nao' ? (document.getElementById("f-biValidade")?.value||'') : '',
    biVitalicio,
    telefone:document.getElementById("f-telefone").value.trim(),
    estado:document.getElementById("f-estado").value,
    escolaridade:document.getElementById("f-escolaridade").value,
    observacoes:document.getElementById("f-observacoes").value.trim(),
    inss:  document.getElementById("f-inss")?.value?.trim()||'',
    banco: document.getElementById("f-banco")?.value||'',
    numeroConta: (document.getElementById("f-numeroConta")?.value||'').replace(/\s/g,'').toUpperCase()||'',
    // ── Campos complementares ──
    estadoCivil: document.getElementById("f-estadoCivil")?.value||'',
    biEmissao:   document.getElementById("f-biEmissao")?.value||'',
    nomePai:     document.getElementById("f-nomePai")?.value?.trim()||'',
    nomeMae:     document.getElementById("f-nomeMae")?.value?.trim()||'',
    morada:      document.getElementById("f-morada")?.value?.trim()||'',
    email:       document.getElementById("f-email")?.value?.trim()||'',
    // ── Formação académica ──
    // Sempre gravado como boolean real; campos de curso limpos a null quando não está a estudar.
    ...(function(){
      var est = document.getElementById("f-estudando")?.value;
      if(est === 'true')  return {
        estudando:          true,
        curso:              document.getElementById("f-curso")?.value?.trim()||'',
        instituicao:        document.getElementById("f-instituicao")?.value?.trim()||'',
        anoCurso:           document.getElementById("f-anoCurso")?.value||null,
        modalidadeEstudo:   document.getElementById("f-modalidadeEstudo")?.value||null
      };
      if(est === 'false') return {
        estudando:          false,
        curso:              null,
        instituicao:        null,
        anoCurso:           null,
        modalidadeEstudo:   null
      };
      return {};
    })(),
    ...((temAlgumRoleCadastro(_perfilActual, ['admin','chefe','tecnico'])) && document.getElementById("f-salario-base")
      ? { salarioBase: salarioBaseInfo.valor || 0 } : {}),
    actualizadoEm:serverTimestamp(),actualizadoPor:utilizadorActual.uid
  };

  // ── Verificação de duplicados (client-side, sem hit ao Firestore) ──
  const dup = verificarDuplicados(nome, numero, bi, funcionarioEmEdicao);
  if (dup.tipo === 'numero') {
    mostrarModalDup('numero', dup.conflito, null, { numero, nome, bi });
    return;
  }
  if (dup.tipo === 'bi' || dup.tipo === 'nome') {
    mostrarModalDup(dup.tipo, dup.conflito, { nome, dados }, { numero, nome, bi });
    return;
  }

  // Sem duplicados — gravar directamente
  await _executarGravacao(nome, dados);
};

// ── AUDITORIA DE LEITURAS ──
// Regista na colecção 'auditoria' sempre que alguém abre uma ficha ou documento.
// Fire-and-forget — não bloqueia o fluxo principal em caso de falha.
async function registarLeitura(accao, dados) {
  try {
    const u = utilizadorActual;
    if (!u || !_perfilActual) return;
    // Optimização: _perfilActual já foi carregado no onAuthStateChanged —
    // elimina getDoc redundante ao Firestore (1 leitura faturada por abertura de ficha).
    await addDoc(collection(db, "auditoria"), {
      timestamp:          serverTimestamp(),
      accao,
      emailUtilizador:    u.email || "—",
      nomeUtilizador:     _perfilActual.nome || u.email || "—",
      perfilUtilizador:   obterPerfilPrincipalCadastro(_perfilActual) || "—",
      uidUtilizador:      u.uid,
      ...dados
    });
  } catch(e) { console.warn("Auditoria de leitura falhou:", e); }
}

// ── Helpers para abrir documentos da sub-colecção ficheiros ────────────
function _abrirBase64Cadastro(base64) {
  try {
    var parts  = base64.split(',');
    var mime   = parts[0].match(/:(.*?);/)[1];
    var binary = atob(parts[1]);
    var arr    = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    var blob = new Blob([arr], { type: mime });
    var url  = URL.createObjectURL(blob);
    var win  = window.open(url, '_blank');
    if (win) setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } catch(e) { notif('Erro ao abrir documento. Verifique o ficheiro.', 'erro'); }
}

window.abrirDocFicha = async function(funcId, tipo, linkEl) {
  if (linkEl) { linkEl._textoOrig = linkEl.innerHTML; linkEl.innerHTML = '<i data-lucide="hourglass" style="width:12px;height:12px;stroke-width:2.5"></i> A carregar…'; linkEl.style.pointerEvents='none'; if(window.lucide) lucide.createIcons(); }
  try {
    var snap = await getDoc(doc(db, 'funcionarios', funcId, 'ficheiros', tipo));
    if (!snap.exists()) { notif('Documento não encontrado no sistema.', 'erro'); return; }
    _abrirBase64Cadastro(snap.data().base64);
  } catch(e) {
    notif('Erro ao carregar documento. Verifique a ligação.', 'erro');
  } finally {
    if (linkEl) { linkEl.innerHTML = linkEl._textoOrig; linkEl.style.pointerEvents=''; }
  }
};
// ── Fim helpers docs ───────────────────────────────────────────────────

window.verFicha=function(id){
  const f=todosOsFuncionarios.find(x=>x.id===id);if(!f)return;

  // Registar leitura — dados mínimos que identificam o acesso
  registarLeitura("VER_FICHA", {
    funcionarioVisado: f.nome || "—",
    funcionarioId:     id,
    referencia:        "Agente Nº " + (f.numero || "—"),
    observacao:        `Ficha de ${f.nome||"—"} (BI: ${f.bi||"—"}, ${f.categoria||"—"}) consultada.`,
    camposAcedidos:    ["nome","bi","nascimento","nomePai","nomeMae","morada","estadoCivil","categoria","vinculo"]
  });

  const anos=calcularAnos(f.admissao), dias=calcularDias(anos);
  // ── Avatar da ficha: foto real ou inicial ──
  (function(){
    var av = document.getElementById('ficha-avatar');
    var imgAnt = av.querySelector('img'); if(imgAnt) imgAnt.remove();
    if(f.fotoUrl){
      av.textContent='';
      var img=document.createElement('img'); img.src=f.fotoUrl; img.alt=f.nome||'';
      img.onerror=function(){ img.remove(); av.textContent=(f.nome||'?')[0].toUpperCase(); };
      av.appendChild(img);
      // Botão de download da foto
      var btnDl = document.getElementById('btn-dl-foto');
      if(btnDl){
        btnDl.style.display='flex';
        btnDl.onclick = function(e){
          e.stopPropagation();
          var a = document.createElement('a');
          a.href = f.fotoUrl;
          var nomeFicheiro = 'foto_' + (f.nome||'funcionario').replace(/\s+/g,'_') + '.jpg';
          a.download = nomeFicheiro;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
      }
    } else {
      av.textContent=(f.nome||'?')[0].toUpperCase();
      var btnDl = document.getElementById('btn-dl-foto');
      if(btnDl) btnDl.style.display='none';
    }
  })();
  const unidadeInfoFicha = infoUnidadeFuncionario(f);
  const unidadeNomeFicha = unidadeInfoFicha.nome || "—";
  const eDirFicha = window.SIGDOC_UNIDADES.isDms(unidadeInfoFicha);
  const eCentroFicha = window.SIGDOC_UNIDADES.isCentro(unidadeInfoFicha);
  document.getElementById("ficha-nome").textContent=f.nome||"—";
  document.getElementById("ficha-cargo").textContent=(f.cargo||f.categoria||"—")+" · "+unidadeNomeFicha;
  document.getElementById("ficha-numero").textContent="Agente Nº "+(f.numero||"—")+" · BI: "+(f.bi||"—");
  const lv=f.vinculo==="quadro"?"Pessoal do Quadro":f.vinculo==="provisorio"?"Provimento Provisório":f.vinculo||"—";
  const subLocal=eDirFicha
    ?(f.seccao||"Secção não especificada")
    :eCentroFicha&&f.area?"Área: "+f.area:null;
  const _eStudandoFicha = f.estudando === true || f.estudando === 'true' || f.estudando === 'sim';
  const _modalLabel = {presencial:'Presencial','pos-laboral':'Pós-Laboral',distancia:'EAD / Distância','semi-presencial':'Semi-Presencial'}[f.modalidadeEstudo]||'';
  const acadInfo=_eStudandoFicha
    ?`Sim — ${f.curso||""}${f.anoCurso?" ("+f.anoCurso+"º ano)":""}${f.instituicao?", "+f.instituicao:""}${_modalLabel?" · "+_modalLabel:""}`
    :(f.estudando===false||f.estudando==='false'?"Não":"—");
  const temDocs=f.urlBI||f.urlCert;
  // K2 fix: array 'campos' (dead code com template literals XSS) removido.
  // A renderização usa exclusivamente 'camposSeguro' com DOM API seguro (abaixo).
  const grid=document.getElementById("ficha-grid-dados");
  const camposSeguro=[
    {r:"Nome Completo",v:f.nome,span2:true},
    {r:"Nº de Agente",v:f.numero},{r:"Sexo",v:f.sexo},
    {r:"Bilhete de Identidade",v:f.bi},
    {r:"Data de Emissão do BI",v:f.biEmissao?fmtData(f.biEmissao):null},
    {r:"Data de Nascimento",v:f.nascimento?fmtData(f.nascimento):null},
    {r:"Estado Civil",v:f.estadoCivil},{r:"Nome do Pai",v:f.nomePai},
    {r:"Nome da Mãe",v:f.nomeMae},{r:"Morada",v:f.morada,span2:true},
    {r:"Telefone",v:f.telefone},{r:"E-mail",v:f.email},
    {r:"Categoria Profissional",v:f.categoria,span2:true},
    ...(f.cargo ? [{r:"Cargo / Função",v:f.cargo,span2:true}] : []),
    {r:"Local de Colocação",span2:true,render:function(valor){
      if(!unidadeNomeFicha || unidadeNomeFicha === "—"){ valor.textContent="—"; return; }
      valor.appendChild(document.createTextNode(unidadeNomeFicha));
      const link = document.createElement("a");
      link.innerHTML = '<i data-lucide="hospital" style="width:11px;height:11px;stroke-width:2.5"></i> Ver unidade';
      link.href = "unidades.html";
      link.title = "Ver ficha da unidade";
      link.style.display = "inline-flex";
      link.style.alignItems = "center";
      link.style.gap = "4px";
      link.style.padding = "2px 8px";
      link.style.borderRadius = "99px";
      link.style.background = "rgba(18,65,161,.10)";
      link.style.color = "#1241a1";
      link.style.fontSize = "11px";
      link.style.fontWeight = "700";
      link.style.textDecoration = "none";
      link.style.verticalAlign = "middle";
      link.style.marginLeft = "4px";
      link.style.border = "1px solid rgba(18,65,161,.15)";
      link.addEventListener("click", function(event){ event.stopPropagation(); });
      valor.appendChild(document.createTextNode(" "));
      valor.appendChild(link);
    }},
    ...(subLocal?[{r:eDirFicha?"Secção":"Área / Serviço",v:subLocal,span2:true}]:[]),
    ...(_unidadesRespMap[f.id] ? [{
      r:"Responsável pela Unidade",
      span2:true,
      render:function(valor){
        const resp = _unidadesRespMap[f.id];
        valor.appendChild(document.createTextNode(resp.nomeUnidade || "—"));
        const badge = criarNo("span", null);
        badge.innerHTML = '<i data-lucide="crown" style="width:11px;height:11px;stroke-width:2.5"></i> Em funções' + (resp.dataInicio ? " desde " + fmtData(resp.dataInicio) : "");
        badge.style.display = "inline-flex";
        badge.style.alignItems = "center";
        badge.style.gap = "4px";
        badge.style.padding = "2px 9px";
        badge.style.borderRadius = "99px";
        badge.style.background = "rgba(5,150,105,.12)";
        badge.style.color = "#059669";
        badge.style.fontSize = "11px";
        badge.style.fontWeight = "700";
        badge.style.verticalAlign = "middle";
        badge.style.marginLeft = "6px";
        badge.style.border = "1px solid rgba(5,150,105,.22)";
        valor.appendChild(document.createTextNode(" "));
        valor.appendChild(badge);
        if(resp.cargo){
          valor.appendChild(document.createElement("br"));
          const cargoResp = criarNo("span", null, resp.cargo);
          cargoResp.style.fontSize = "11px";
          cargoResp.style.color = "var(--neu-400)";
          cargoResp.style.marginTop = "3px";
          cargoResp.style.display = "block";
          valor.appendChild(cargoResp);
        }
      }
    }] : []),
    {r:"Tipo de Vínculo",v:{"quadro":"Pessoal do Quadro","provisorio":"Provimento Provisório"}[f.vinculo]||f.vinculo||null},
    {r:"Regime de Trabalho",v:{"geral":"Regime Geral","especial":"Regime Especial"}[f.regime]||f.regime||null},
    {r:"Data de Admissão",v:f.admissao?fmtData(f.admissao):null},
    {r:"Anos de Serviço",v:anos!==null?anos+" anos":"—",badge:true,bval:anos},
    {r:"Dias de Férias com Direito",v:dias+" dias úteis"},
    {r:"Estado Actual",v:{activo:"Em Serviço Activo",inactivo:"Inactivo",licenca:"De Licença"}[f.estado]||f.estado},
    {r:"Escolaridade",v:f.escolaridade},{r:"A frequentar curso?",v:acadInfo},
    ...(temDocs?[{r:"Documentos do Formulário",span2:true,render:function(valor){
      let adicionou = false;
      const linkBI = criarLinkDocumento(f.id, "bi", f.urlBI, '<i data-lucide="id-card" style="width:12px;height:12px;stroke-width:2.5"></i> Ver BI');
      if(linkBI){
        valor.appendChild(linkBI);
        adicionou = true;
      }
      const linkCert = criarLinkDocumento(f.id, "cert", f.urlCert, '<i data-lucide="graduation-cap" style="width:12px;height:12px;stroke-width:2.5"></i> Ver Certificado');
      if(linkCert){
        if(adicionou) valor.appendChild(document.createTextNode("  "));
        valor.appendChild(linkCert);
        adicionou = true;
      }
      if(!adicionou) valor.textContent = "—";
    }}]:[]),
    {r:"Naturalidade",v:(f.municipioNatal&&f.provinciaNatal)?f.municipioNatal+', '+f.provinciaNatal:(f.provinciaNatal||f.municipioNatal||null)},
    {r:"Nº de Assegurado INSS",v:f.inss||null},
    {r:"Banco de Domiciliação",v:f.banco||null},
    {r:"Número de Conta / IBAN",v:f.numeroConta||null},
    ...(temAlgumRoleCadastro(_perfilActual, ['admin','chefe','tecnico']) && obterNumeroMoedaKz(f.salarioBase) > 0
      ? [{r:"Salário Base",v:formatarMoedaKz(f.salarioBase)}]
      : []),
    {r:"Observações",v:f.observacoes,span2:true},
  ];
  limparConteudo(grid);
  const fragCampos=document.createDocumentFragment();
  camposSeguro.forEach(function(c){
    const campo=criarNo("div","ficha-campo"+(c.span2?" destaque":""));
    campo.appendChild(criarNo("div","rotulo",c.r));
    const valor=criarNo("div","valor");
    if(typeof c.render==="function"){
      c.render(valor);
    } else if(c.badge&&c.bval!==null){
      valor.appendChild(criarNo("span","badge-anos",c.v));
    } else {
      valor.textContent=textoOuTraco(c.v);
    }
    campo.appendChild(valor);
    fragCampos.appendChild(campo);
  });
  grid.appendChild(fragCampos);
  // Faixa de formulário pendente de revisão
  const fichaConteudo = document.getElementById("tab-dados");
  const faixaExist = document.getElementById("faixa-form-pend");
  if (faixaExist) faixaExist.remove();
  if (f.formularioPendente) {
    const ts = f.formularioPreenchidoEm?.toDate
      ? f.formularioPreenchidoEm.toDate().toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"})
      : "recentemente";
    const faixa = document.createElement("div");
    faixa.id = "faixa-form-pend";
    faixa.className = "faixa-form-pend";
    const faixaTxt = criarNo("div", "faixa-form-pend-txt");
    faixaTxt.innerHTML = '<i data-lucide="clipboard-list" style="width:13px;height:13px;stroke-width:2.5"></i> Formulário profissional submetido pelo funcionário';
    faixaTxt.appendChild(criarNo("small", null, "Enviado em " + ts + " — reveja os dados e marque como revisto"));
    const btnRevisto = criarNo("button", "btn-rever-form");
    btnRevisto.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;stroke-width:2.5"></i> Marcar como revisto';
    btnRevisto.type = "button";
    btnRevisto.addEventListener("click", function(){ marcarFormRevisto(f.id, btnRevisto); });
    faixa.append(faixaTxt, btnRevisto);
    fichaConteudo.insertBefore(faixa, fichaConteudo.firstChild);
    if(window.lucide) lucide.createIcons();
  }

  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("activo"));
  document.querySelectorAll(".tab-conteudo").forEach(t=>t.classList.remove("activo"));
  document.querySelector(".tab-btn").classList.add("activo");
  document.getElementById("tab-dados").classList.add("activo");
  carregarHistorico(f.id,f.nome);
  carregarSolicitacoesFicha(f.id,f.nome);
  document.getElementById("overlay-ficha").classList.add("activo");
  if(window.lucide) lucide.createIcons();
};

async function carregarHistorico(funcId,nome){
  const div=document.getElementById("ficha-historico");
  limparConteudo(div);
  const loading = criarNo("div","hist-vazio");
  const loadingIcon = criarNo("div", null);
  loadingIcon.innerHTML = '<i data-lucide="hourglass" style="width:32px;height:32px;stroke-width:1.5"></i>';
  loadingIcon.style.marginBottom = "8px";
  loadingIcon.style.color = "var(--neu-300)";
  loading.append(loadingIcon, criarNo("p", null, "A carregar histórico..."));
  div.appendChild(loading);
  if(window.lucide) lucide.createIcons();
  try{
    const snap=await getDocs(query(collection(db,"documentos"),where("funcionarioId","==",funcId)));
    const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
    docs.sort((a,b)=>(b.geradoEm?.toDate?.().getTime()||0)-(a.geradoEm?.toDate?.().getTime()||0));
    if(docs.length===0){
      limparConteudo(div);
      const vazio = criarNo("div","hist-vazio");
      const icone = criarNo("div", null);
      icone.innerHTML = '<i data-lucide="folder-open" style="width:40px;height:40px;stroke-width:1.5"></i>';
      icone.style.marginBottom = "10px";
      icone.style.color = "var(--neu-300)";
      const texto = criarNo("p");
      texto.appendChild(document.createTextNode("Nenhum documento emitido ainda para "));
      texto.appendChild(criarNo("strong", null, nome));
      texto.appendChild(document.createTextNode("."));
      vazio.append(icone, texto);
      div.appendChild(vazio);
      if(window.lucide) lucide.createIcons();
      return;
    }
    const icones={
      "guia-ferias":'<i data-lucide="palmtree" style="width:18px;height:18px;stroke-width:2"></i>',
      "declaracao":'<i data-lucide="file-signature" style="width:18px;height:18px;stroke-width:2"></i>',
      "guia-medica":'<i data-lucide="hospital" style="width:18px;height:18px;stroke-width:2"></i>',
      "oficio":'<i data-lucide="clipboard-list" style="width:18px;height:18px;stroke-width:2"></i>'
    };
    const tipos={"guia-ferias":"Guia de Férias","declaracao":"Declaração de Serviço","guia-medica":"Guia Médica","oficio":"Ofício"};
    limparConteudo(div);
    const cabecalho = criarNo("div", null, docs.length + " documento(s) no histórico");
    cabecalho.style.padding = "12px 16px";
    cabecalho.style.fontSize = "12px";
    cabecalho.style.color = "var(--neu-400)";
    cabecalho.style.borderBottom = "1px solid var(--neu-100)";
    cabecalho.style.fontWeight = "600";
    div.appendChild(cabecalho);
    docs.forEach(d=>{
      const ts=d.geradoEm?.toDate?.();
      const dataFmt=ts?ts.toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"}):"—";
      const horaFmt=ts?ts.toLocaleTimeString("pt-AO",{hour:"2-digit",minute:"2-digit"}):"";
      const tipo=tipos[d.tipo]||d.tipo||"Documento";
      const icone=icones[d.tipo]||'<i data-lucide="file" style="width:18px;height:18px;stroke-width:2"></i>';
      const numFmt=d.numGuia&&d.anoGuia?`Nº ${d.numGuia}/${d.anoGuia}`:"";
      const dias=d.numDias?`· ${d.numDias} dias`:"";
      const inicio=d.dataInicio?`· Início: ${fmtDataSim(d.dataInicio)}`:"";
      const estCores={pendente:{c:"#92400e",bg:"var(--a-100)"},aprovado:{c:"var(--c-700)",bg:"var(--c-100)"},rejeitado:{c:"var(--r-600)",bg:"var(--r-100)"}};
      const est=estCores[d.estado]||estCores.pendente;
      const estTxt={pendente:"Aguarda",aprovado:"Aprovado",rejeitado:"Rejeitado"}[d.estado]||d.estado;
      const item = criarNo("div","hist-item");
      const _hIcon = criarNo("div","hist-icon");
      _hIcon.innerHTML = icone;
      item.appendChild(_hIcon);

      const info = criarNo("div","hist-info");
      info.appendChild(criarNo("div","hist-tipo", (tipo + " " + numFmt).trim()));

      const detLinha = criarNo("div","hist-det");
      const resumo = [dias, inicio].filter(Boolean).join(" ");
      if (resumo) detLinha.appendChild(document.createTextNode(resumo + " "));
      const badge = criarNo("span", null, estTxt);
      badge.style.marginLeft = "4px";
      badge.style.padding = "2px 8px";
      badge.style.borderRadius = "var(--r-full)";
      badge.style.fontSize = "10px";
      badge.style.fontWeight = "700";
      badge.style.background = est.bg;
      badge.style.color = est.c;
      detLinha.appendChild(badge);
      info.appendChild(detLinha);

      const porLinha = criarNo("div","hist-det", "Por: " + (d.geradoPorEmail||"—"));
      porLinha.style.marginTop = "2px";
      info.appendChild(porLinha);

      if (d.observacao) {
        const obs = criarNo("div","hist-det");
        obs.innerHTML = '<i data-lucide="message-circle" style="width:11px;height:11px;stroke-width:2.5"></i> "' + d.observacao + '"';
        obs.style.fontStyle = "italic";
        info.appendChild(obs);
      }

      const data = criarNo("div","hist-data", dataFmt);
      data.appendChild(document.createElement("br"));
      const hora = criarNo("span", null, horaFmt);
      hora.style.color = "var(--neu-300)";
      data.appendChild(hora);

      item.append(info, data);
      div.appendChild(item);
    });
    if(window.lucide) lucide.createIcons();
  }catch(e){
    limparConteudo(div);
    const erro = criarNo("div","hist-vazio");
    const texto = criarNo("p");
    texto.innerHTML = '<i data-lucide="alert-triangle" style="width:13px;height:13px;stroke-width:2.5"></i> Erro ao carregar histórico.';
    texto.style.color = "var(--r-600)";
    erro.appendChild(texto);
    div.appendChild(erro);
    if(window.lucide) lucide.createIcons();
  }
}

async function carregarSolicitacoesFicha(funcId,nome){
  const div=document.getElementById("ficha-solicitacoes");
  const badge=document.getElementById("badge-sol-ficha");
  try{
    const snap=await getDocs(query(collection(db,"solicitacoes"),where("funcionarioId","==",funcId)));
    const sols=snap.docs.map(d=>({id:d.id,...d.data()}));
    sols.sort((a,b)=>(b.criadaEm?.toDate?.().getTime()||0)-(a.criadaEm?.toDate?.().getTime()||0));
    if(sols.length===0){
      limparConteudo(div);
      const vazio = criarNo("div","hist-vazio");
      const icone = criarNo("div", null);
      icone.innerHTML = '<i data-lucide="mail" style="width:36px;height:36px;stroke-width:1.5"></i>';
      icone.style.marginBottom = "10px";
      icone.style.color = "var(--neu-300)";
      vazio.append(icone, criarNo("p", null, "Nenhuma solicitação enviada ainda."));
      div.appendChild(vazio);
      if(badge)badge.style.display="none";
      if(window.lucide) lucide.createIcons();
      return;
    }
    const pend=sols.filter(s=>s.estado==="nova"||s.estado==="processando").length;
    if(badge&&pend>0){badge.textContent=pend;badge.style.display="inline";}else if(badge)badge.style.display="none";
    const TIPOS={"guia-ferias":"Guia de Férias","declaracao-servico":"Declaração","guia-medica":"Guia Médica","oficio":"Ofício"};
    const TIPOS_ICONE={
      "guia-ferias":'<i data-lucide="palmtree" style="width:18px;height:18px;stroke-width:2"></i>',
      "declaracao-servico":'<i data-lucide="file-signature" style="width:18px;height:18px;stroke-width:2"></i>',
      "guia-medica":'<i data-lucide="hospital" style="width:18px;height:18px;stroke-width:2"></i>',
      "oficio":'<i data-lucide="clipboard-list" style="width:18px;height:18px;stroke-width:2"></i>'
    };
    const ESTADOS={nova:"Nova",processando:"A processar",concluida:"Concluída",rejeitada:"Rejeitada"};
    const COR={nova:{bg:"#ede9fe",c:"#5b21b6"},processando:{bg:"var(--b-100)",c:"var(--b-800)"},concluida:{bg:"var(--c-100)",c:"var(--c-700)"},rejeitada:{bg:"var(--r-100)",c:"var(--r-600)"}};
    limparConteudo(div);
    const cabecalho = criarNo("div", null, sols.length + " solicitação(ões)");
    cabecalho.style.padding = "12px 16px";
    cabecalho.style.fontSize = "12px";
    cabecalho.style.color = "var(--neu-400)";
    cabecalho.style.borderBottom = "1px solid var(--neu-100)";
    cabecalho.style.fontWeight = "600";
    div.appendChild(cabecalho);
    sols.forEach(s=>{
      const ts=s.criadaEm?.toDate?.();
      const data=ts?ts.toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"}):"—";
      const tipo=TIPOS[s.tipo]||s.tipo||"Documento";
      const iconeHtmlSol=TIPOS_ICONE[s.tipo]||'<i data-lucide="file" style="width:18px;height:18px;stroke-width:2"></i>';
      const cor=COR[s.estado]||COR.nova;
      const item = criarNo("div","hist-item");
      const icon = criarNo("div","hist-icon");
      icon.innerHTML = iconeHtmlSol;
      icon.style.background = cor.bg;
      icon.style.color = cor.c;
      item.appendChild(icon);

      const info = criarNo("div","hist-info");
      info.appendChild(criarNo("div","hist-tipo", tipo));
      info.appendChild(criarNo("div","hist-det", "Enviado em " + data));
      if (s.dataInicioFerias) {
        const _detInicio = criarNo("div","hist-det");
        _detInicio.innerHTML = '<i data-lucide="calendar" style="width:11px;height:11px;stroke-width:2.5"></i> Início férias: ' + fmtDataSim(s.dataInicioFerias);
        info.appendChild(_detInicio);
      }
      if (s.motivo) {
        const _detMotivo = criarNo("div","hist-det");
        _detMotivo.innerHTML = '<i data-lucide="message-circle" style="width:11px;height:11px;stroke-width:2.5"></i> ' + s.motivo;
        info.appendChild(_detMotivo);
      }
      item.appendChild(info);

      const estado = criarNo("span", null, ESTADOS[s.estado]||s.estado);
      estado.style.padding = "3px 10px";
      estado.style.borderRadius = "var(--r-full)";
      estado.style.fontSize = "10px";
      estado.style.fontWeight = "700";
      estado.style.background = cor.bg;
      estado.style.color = cor.c;
      estado.style.whiteSpace = "nowrap";
      estado.style.alignSelf = "flex-start";
      item.appendChild(estado);

      div.appendChild(item);
    });
    if(window.lucide) lucide.createIcons();
  }catch(e){
    limparConteudo(div);
    const erro = criarNo("div","hist-vazio");
    const _iconeErrSol = criarNo("div", null);
    _iconeErrSol.innerHTML = '<i data-lucide="alert-triangle" style="width:32px;height:32px;stroke-width:1.5"></i>';
    _iconeErrSol.style.color = "var(--r-600)";
    erro.append(_iconeErrSol, criarNo("p", null, "Sem acesso às solicitações."));
    div.appendChild(erro);
    if(window.lucide) lucide.createIcons();
  }
}

window.fecharFicha=()=>document.getElementById("overlay-ficha").classList.remove("activo");
window.mudarTab=function(tab,btn){
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("activo"));
  document.querySelectorAll(".tab-conteudo").forEach(t=>t.classList.remove("activo"));
  btn.classList.add("activo");
  document.getElementById("tab-"+tab).classList.add("activo");
};

// K6 fix: sistema de fila para toasts — evita sobreposição de mensagens
const _notifFila = [];
let   _notifActivo = false;

function _notifDespachar() {
  if (_notifActivo || _notifFila.length === 0) return;
  _notifActivo = true;
  const { msg, tipo } = _notifFila.shift();
  const el = document.getElementById("notificacao");
  el.textContent = msg;
  el.className = `toast toast-${tipo}`;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
    _notifActivo = false;
    setTimeout(_notifDespachar, 160);
  }, 3200);
}

function notif(msg, tipo = "sucesso") {
  _notifFila.push({ msg, tipo });
  _notifDespachar();
}
function fmtData(str){
  if(!str)return"—";const [a,m,d]=str.split("-");
  const ms=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return`${d} de ${ms[parseInt(m)-1]} de ${a}`;
}
function fmtDataSim(str){
  if(!str)return"—";const[a,m,d]=str.split("-");return`${d}/${m}/${a}`;
}

document.getElementById("overlay-formulario").addEventListener("click",e=>{if(e.target===document.getElementById("overlay-formulario"))window.fecharFormulario();});
document.getElementById("overlay-ficha").addEventListener("click",e=>{if(e.target===document.getElementById("overlay-ficha"))window.fecharFicha();});
