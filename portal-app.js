/* ============================================================
 SIGDOC-SUMBE — portal-app.js  (ES Module)
 Requer: sigdoc-config.js, sigdoc-nav.js, sigdoc-session.js
 ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut,
         createUserWithEmailAndPassword, onAuthStateChanged,
         signInAnonymously, linkWithCredential, EmailAuthProvider,
         sendPasswordResetEmail,
         setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, setDoc, doc, query, where, orderBy, serverTimestamp, onSnapshot, arrayUnion, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const firebaseConfig = window.SIGDOC_CONFIG.config;
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
setPersistence(auth,browserLocalPersistence).catch(e=>console.warn(e));

let _funcDoc=null,_funcDocId=null,_utilizador=null,_tipoSel=null;
let _recEmailResolvido="",_recContaLocalizada=null;
let _sessaoToken=null,_unsubSessao=null;

const LABELS_TIPO={
  "guia-ferias":{"nome":"Guia de Férias","icone":`<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>`,"bg":"#fef9e7"},
  "declaracao-servico":{"nome":"Declaração de Adiantamento Salarial","icone":`<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,"bg":"#eff6ff"},
  "guia-medica":{"nome":"Guia Médica","icone":`<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>`,"bg":"var(--primary-xl,#d1fae5)"},
  "oficio":{"nome":"Ofício / Nota","icone":`<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,"bg":"#e0e7ff"}
};
const LABELS_ESTADO={nova:{texto:"Recebida",classe:"est-nova"},processando:{texto:"Em processamento",classe:"est-processando"},concluida:{texto:"Disponível",classe:"est-aprovado"},rejeitada:{texto:"Anulada",classe:"est-rejeitado"},pendente:{texto:"Em validação",classe:"est-processando"},aprovado:{texto:"Disponível",classe:"est-aprovado"},gerado:{texto:"Em validação",classe:"est-processando"}};

function escapeHtml(valor){
  return String(valor ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function obterNumeroKzPortal(valor){
  const bruto = String(valor ?? "").trim();
  if(!bruto) return NaN;
  const limpo = bruto
    .replace(/\s+/g,"")
    .replace(/Kz/gi,"")
    .replace(/\./g,"")
    .replace(/,/g,".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN;
}

function formatarMoedaKzPortal(valor,{sufixo=true}={}){
  const numero = Number(valor);
  if(!Number.isFinite(numero)) return "—";
  const texto = numero.toLocaleString("pt-PT",{minimumFractionDigits:2,maximumFractionDigits:2});
  return sufixo ? texto + " AKZ" : texto;
}

function formatarMesesAdiantamento(total){
  const numero = Number(total);
  if(!Number.isFinite(numero) || numero <= 0) return "—";
  return numero + (numero === 1 ? " mês" : " meses");
}

function normalizarNumeroContaPortal(valor){
  return String(valor ?? "").trim().replace(/\s+/g," ").toUpperCase();
}

function obterDetalheCurtoPortal(item){
  const tipo = item?.tipo || item?.tipoDocumento || "";
  if(tipo === "guia-medica"){
    return item.unidadeSanitariaFinal || item.unidadeSanitaria || "";
  }
  if(tipo === "declaracao-servico"){
    const partes = [];
    if(item.mesesAdiantamento) partes.push(formatarMesesAdiantamento(item.mesesAdiantamento));
    if(item.salarioLiquido) partes.push(formatarMoedaKzPortal(item.salarioLiquido));
    return partes.join(" · ");
  }
  return item?.motivo || "";
}

function obterBlocoDeclaracaoPortal(item){
  if((item?.tipo || item?.tipoDocumento || "") !== "declaracao-servico") return "";
  const linhas = [
    { rotulo: "Meses do adiantamento", valor: formatarMesesAdiantamento(item.mesesAdiantamento) },
    { rotulo: "Salário líquido", valor: formatarMoedaKzPortal(item.salarioLiquido) },
    { rotulo: "Número de conta", valor: normalizarNumeroContaPortal(item.numeroConta) || "—" }
  ];
  return `<div style="display:grid;gap:8px;background:var(--neu-50);border-radius:var(--r-sm);padding:12px">
    ${linhas.map(linha => `<div style="display:flex;justify-content:space-between;gap:12px"><span style="font-size:13px;color:var(--neu-400)">${linha.rotulo}</span><span style="font-size:13px;font-weight:700;text-align:right">${escapeHtml(linha.valor)}</span></div>`).join("")}
  </div>`;
}

function renderListaDocumentos(itens,{limit=null,tituloVazio,detalheVazio,mostrarAcao=false}={}) {
  const lista = typeof limit === "number" ? itens.slice(0, limit) : itens;
  if (lista.length === 0) {
    return `<div class="vazio-portal">
      <div class="vi"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg></div>
      <p>${escapeHtml(tituloVazio || "Ainda não existem registos.")}</p>
      ${detalheVazio ? `<small>${escapeHtml(detalheVazio)}</small>` : ""}
      ${mostrarAcao ? `<button class="btn-vazio-acao" onclick="navegarAba('aba-solicitar')">Novo pedido</button>` : ""}
    </div>`;
  }
  return `<div class="lista-docs">${lista.map(s => {
    const tipo = s.tipo || s.tipoDocumento || "outro";
    const info = LABELS_TIPO[tipo] || { nome: tipo, icone: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`, bg: "var(--bg,#f3f4f6)" };
    const estInfo = LABELS_ESTADO[s.estado || "nova"] || { texto: s.estado, classe: "est-nova" };
    const ts = s.criadaEm?.toDate ? s.criadaEm.toDate() : (s.geradoEm?.toDate ? s.geradoEm.toDate() : null);
    const data = ts ? ts.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const num = s.numGuia && s.anoGuia ? ` · Nº ${escapeHtml(`${s.numGuia}/${s.anoGuia}`)}` : "";
    const detalheCurto = obterDetalheCurtoPortal(s);
    const detalhe = detalheCurto
      ? ` · ${escapeHtml(detalheCurto.substring(0, 50))}${detalheCurto.length > 50 ? "…" : ""}`
      : "";
    const isNovo = s._estadoAnterior && s._estadoAnterior !== s.estado;
    const temArquivo = s._origem === "documento" && s.htmlArquivo &&
      (s.estado === "aprovado" || s.estado === "concluida");
    const btnSegVia = temArquivo
      ? `<button class="btn-visualizar-portal" onclick="event.stopPropagation();abrirVisualizacaoPortal('${s.id}')" title="Ver documento disponível">Visualizar</button>`
      : "";
    return `<div class="item-doc-portal${isNovo ? " item-actualizado" : ""}" onclick="abrirDetalheDoc('${s.id}','${s._origem}')">
      <div class="doc-ic-portal" style="background:${info.bg}">${info.icone}</div>
      <div class="doc-info-portal">
        <div class="doc-tipo-portal">${escapeHtml(info.nome)}${num}</div>
        <div class="doc-meta-portal">${data}${detalhe}</div>
      </div>
      <div class="doc-card-actions">
        ${btnSegVia}
        <span class="badge-est-portal ${estInfo.classe}">${escapeHtml(estInfo.texto)}</span>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function esconderLoading(){
  const el=document.getElementById("ecra-loading");
  if(el) el.style.display="none";
}

function normalizarPerfilPortal(docPerfil){
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.normalizarPerfilDoc(docPerfil)
    : (typeof docPerfil === "string" ? { perfil: docPerfil, roles: [docPerfil] } : (docPerfil || {}));
}

function payloadPerfilPortal(roles){
  const perfil = window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.criarPerfilUtilizador({ roles: roles || [] })
    : { perfil: "funcionario", perfilBase: "funcionario", roles: ["funcionario"].concat(roles || []) };
  return {
    perfil: perfil.perfil,
    perfilBase: perfil.perfilBase,
    roles: perfil.roles
  };
}

function temRolePortal(docPerfil, roles){
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.temAlgumRole(docPerfil, roles)
    : [].concat(roles || []).includes(typeof docPerfil === "string" ? docPerfil : docPerfil?.perfil);
}

async function resolverFuncionarioAssociadoPortal(user, dadosBrutos){
  const funcionarioId = dadosBrutos?.funcionarioId || "";
  if(funcionarioId){
    try{
      const snapFunc = await getDoc(doc(db,"funcionarios",funcionarioId));
      if(snapFunc.exists()) return { id: snapFunc.id, ...snapFunc.data() };
    }catch(ef){
      console.warn("Funcionario associado no portal:", ef);
    }
  }
  try{
    const snapPorUid = await getDocs(query(collection(db,"funcionarios"), where("portalUid","==",user.uid)));
    if(!snapPorUid.empty) return { id: snapPorUid.docs[0].id, ...snapPorUid.docs[0].data() };
  }catch(ef2){
    console.warn("Funcionario por portalUid no portal:", ef2);
  }
  return null;
}

async function resolverPerfilPortalAutenticado(user){
  const refUtilizador = doc(db,"utilizadores",user.uid);
  const snapUtilizador = await getDoc(refUtilizador);
  const dadosBrutos = snapUtilizador.exists() ? snapUtilizador.data() : null;
  const funcAssoc = await resolverFuncionarioAssociadoPortal(user, dadosBrutos);

  if(funcAssoc){
    _funcDoc = funcAssoc;
    _funcDocId = funcAssoc.id;
  }

  if(!dadosBrutos && !funcAssoc) return null;

  const base = normalizarPerfilPortal(dadosBrutos || {});
  const reparo = !dadosBrutos ? {
    ...payloadPerfilPortal([]),
    nome: funcAssoc?.nome || user.displayName || user.email || "Funcionario",
    email: user.email || "",
    unidade: funcAssoc?.unidade || "",
    activo: true,
    criadoEm: serverTimestamp(),
    ultimoAcesso: serverTimestamp(),
    ...(funcAssoc?.id ? { funcionarioId: funcAssoc.id } : {})
  } : (
    funcAssoc?.id && base.funcionarioId !== funcAssoc.id
      ? { funcionarioId: funcAssoc.id }
      : {}
  );

  if(Object.keys(reparo).length){
    try{
      await setDoc(refUtilizador, reparo, { merge:true });
    }catch(eReparo){
      console.warn("Reparo do perfil do portal:", eReparo);
    }
  }
  const dadosCalculados = {
    ...(dadosBrutos || {}),
    ...(!dadosBrutos ? {
      nome: funcAssoc?.nome || user.displayName || user.email || "Funcionario",
      email: user.email || "",
      unidade: funcAssoc?.unidade || "",
      activo: true,
      ...payloadPerfilPortal([])
    } : {}),
    ...(funcAssoc?.id ? { funcionarioId: funcAssoc.id } : {})
  };
  return normalizarPerfilPortal(dadosCalculados);
}

async function iniciarVigilanciaSessaoPortal(user){
  if(window.SIGDOC_SESSION?.gerarEPersistirToken && window.SIGDOC_SESSION?.registarLogin && window.SIGDOC_SESSION?.vigiar){
    const token = window.SIGDOC_SESSION.gerarEPersistirToken();
    _sessaoToken = token;
    await window.SIGDOC_SESSION.registarLogin(db, user.uid, token, { updateDoc, doc, serverTimestamp });
    await window.SIGDOC_SESSION.vigiar(db, user.uid, auth, { onSnapshot, doc, signOut });
    return;
  }
  await iniciarSessaoActiva(user);
}

onAuthStateChanged(auth,async user=>{
  if(!user||user.isAnonymous){
    mostrarEcra("ecra-entrada");
    esconderLoading();
    return;
  }
  _utilizador=user;
  try{
    const dados = await resolverPerfilPortalAutenticado(user);
    if(!dados){mostrarEcra("ecra-entrada");esconderLoading();return;}
    if(!temRolePortal(dados, ["funcionario"])){mostrarEcra("ecra-entrada");esconderLoading();return;}
    mostrarPortal(user,dados);
    esconderLoading();
    // ── Sessão activa: gerar token + listener de expulsão ──
    await iniciarVigilanciaSessaoPortal(user);
    // ── Sino: notificações em tempo real ──
    iniciarSinoPortal(user.uid);
  }catch(e){console.error(e);mostrarEcra("ecra-entrada");esconderLoading();}
});

window.mostrarEcra=function(id){document.querySelectorAll(".ecra").forEach(e=>e.classList.remove("activo"));document.getElementById(id).classList.add("activo");};

// VERIFICAÇÃO
// ══ VALIDAÇÃO ROBUSTA — Número de Agente ══════════════════
const RE_NUMERO = /^\d{8}$/;
// BI angolano: 8 dígitos + 2 letras + 3 dígitos (ex: 00123456LA083) — 13 chars
// Alguns sistemas usam também 9+2+3=14. Aceita ambos.
const RE_BI = /^\d{8,9}[A-Z]{2}\d{3}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ── Ícones SVG de validação inline (substituem ✅/✕ emoji) ── */
const ICO_OK  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10c886" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:middle"><path d="M20 6 9 17l-5-5"/></svg>';
const ICO_ERR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/></svg>';

function setCampo(inputId, iconId, errId, okId, valido, msgErro, msgOk) {
  const inp = document.getElementById(inputId);
  const ico = document.getElementById(iconId);
  const err = errId ? document.getElementById(errId) : null;
  const ok  = okId  ? document.getElementById(okId)  : null;
  if (!inp) return;
  const vazio = !inp.value.trim();
  inp.classList.toggle('campo-erro', !vazio && !valido);
  inp.classList.toggle('campo-ok',   !vazio &&  valido);
  if (ico) { ico.innerHTML = vazio ? '' : (valido ? ICO_OK : ICO_ERR); ico.style.display = vazio ? 'none' : 'block'; }
  if (err) { err.textContent = (!vazio && !valido) ? msgErro : ''; err.style.display = (!vazio && !valido) ? 'block' : 'none'; }
  if (ok)  { ok.textContent  = (!vazio &&  valido) ? (msgOk||'') : ''; ok.style.display  = (!vazio &&  valido) ? 'block' : 'none'; }
  return valido || vazio;
}

// ── Verificação: selecção de método (Nº Agente vs BI) ──
window.selecionarMetodoVerif = function(metodo) {
  const faseEscolha = document.getElementById('verif-fase-escolha');
  const faseCampo   = document.getElementById('verif-fase-campo');
  const wrapNum     = document.getElementById('campo-wrap-numero');
  const wrapBi      = document.getElementById('campo-wrap-bi');
  const chipLabel   = document.getElementById('verif-chip-label');
  const chipIc      = document.getElementById('verif-chip-ic');
  const cardNum     = document.getElementById('verif-card-numero');
  const cardBi      = document.getElementById('verif-card-bi');
  const inpNum      = document.getElementById('input-numero');
  const inpBi       = document.getElementById('input-bi');
  const msgDiv      = document.getElementById('msg-verificacao');

  if (!metodo) {
    // Voltar à fase de escolha — limpar tudo
    faseEscolha.style.display = '';
    faseCampo.style.display   = 'none';
    [cardNum, cardBi].forEach(c => c && c.classList.remove('activo'));
    inpNum.value = ''; inpBi.value = '';
    // Reset estados visuais
    ['input-numero','input-bi'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('campo-erro','campo-ok'); }
    });
    ['ico-numero','ico-bi','erro-numero','erro-bi','ok-bi'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.style.display = ''; }
    });
    if (msgDiv) msgDiv.innerHTML = '';
    document.getElementById('btn-verificar').disabled = true;
    return;
  }

  // Mostrar fase de campo e ocultar escolha
  faseEscolha.style.display = 'none';
  faseCampo.style.display   = '';

  if (metodo === 'numero') {
    wrapNum.style.display = '';
    wrapBi.style.display  = 'none';
    cardNum && cardNum.classList.add('activo');
    cardBi  && cardBi.classList.remove('activo');
    chipLabel.textContent = 'Nº de Agente';
    chipIc.innerHTML = '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>';
    inpBi.value = ''; // garantir campo inactivo limpo
    setTimeout(() => inpNum.focus(), 80);
  } else {
    wrapBi.style.display  = '';
    wrapNum.style.display = 'none';
    cardBi  && cardBi.classList.add('activo');
    cardNum && cardNum.classList.remove('activo');
    chipLabel.textContent = 'Bilhete de Identidade';
    chipIc.innerHTML = '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>';
    inpNum.value = ''; // garantir campo inactivo limpo
    setTimeout(() => inpBi.focus(), 80);
  }
  sincronizarBtnVerificar();
};

window.validarCampoNumero = function() {
  const v = document.getElementById("input-numero").value.trim();
  setCampo("input-numero","ico-numero","erro-numero",null,
    RE_NUMERO.test(v),
    "O Nº de Agente deve ter exactamente 8 dígitos numéricos.");
  sincronizarBtnVerificar();
};

window.validarCampoBI = function() {
  const v = document.getElementById("input-bi").value.trim().toUpperCase();
  setCampo("input-bi","ico-bi","erro-bi","ok-bi",
    RE_BI.test(v),
    "Formato inválido. Exemplo correcto: 00123456LA083",
    "Formato de BI válido");
  sincronizarBtnVerificar();
};

function sincronizarBtnVerificar() {
  const num = document.getElementById("input-numero").value.trim();
  const bi  = document.getElementById("input-bi").value.trim().toUpperCase();
  const ok  = RE_NUMERO.test(num) || RE_BI.test(bi);
  document.getElementById("btn-verificar").disabled = !ok;
}

window.validarVerificacao = function() {
  sincronizarBtnVerificar();
};

window.fazerVerificacao=async function(){
  const num=document.getElementById("input-numero").value.trim();
  const bi=document.getElementById("input-bi").value.trim();
  const btn=document.getElementById("btn-verificar");
  const msg=document.getElementById("msg-verificacao");
  msg.innerHTML="";
  if(!num&&!bi)return;
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> A verificar…';
  try{
    if(!auth.currentUser)await signInAnonymously(auth);
    let enc=null,encId=null;
    if(num&&num.length===8){const snap=await getDocs(query(collection(db,"funcionarios"),where("numero","==",num)));if(!snap.empty){enc=snap.docs[0].data();encId=snap.docs[0].id;}}
    if(!enc&&bi&&bi.length>=8){const snap=await getDocs(query(collection(db,"funcionarios"),where("bi","==",bi.toUpperCase())));if(!snap.empty){enc=snap.docs[0].data();encId=snap.docs[0].id;}}
    if(!enc){msg.innerHTML=`<div class="alerta alerta-erro"><strong>Não encontrado.</strong> Os seus dados não estão no sistema. Por favor, contacte a Secção de RH.</div>`;btn.disabled=false;btn.innerHTML="Verificar →";return;}
    if(enc.portalUid){msg.innerHTML=`<div class="alerta alerta-aviso"><strong>Conta já existe.</strong> Este registo já tem uma conta. Por favor, faça login.</div>`;btn.disabled=false;btn.innerHTML="Verificar →";setTimeout(()=>mostrarEcra("ecra-login-func"),2500);return;}
    _funcDoc=enc; _funcDocId=encId;
    preencherCC(enc); mostrarEcra("ecra-criar-conta");
  }catch(e){console.error(e);msg.innerHTML=`<div class="alerta alerta-erro">Erro de ligação. Verifique a internet e tente novamente.</div>`;btn.disabled=false;btn.innerHTML="Verificar →";}
};

function preencherCC(f){
  const nome=f.nome||"—",partes=nome.split(" ");
  const mask=partes.map((p,i)=>i===0||i===partes.length-1?p:p[0]+"*".repeat(Math.max(p.length-1,1))).join(" ");
  document.getElementById("cc-avatar").textContent=nome[0].toUpperCase();
  document.getElementById("cc-nome").textContent=mask;
  document.getElementById("cc-unidade").textContent=(f.unidade||"—");
  document.getElementById("cc-categoria").textContent=""+(f.categoria||"—");
}

// CRIAR CONTA
window.avaliarForca=function(){
  const senha=document.getElementById("cc-senha").value;
  const wrap=document.getElementById("forca-wrap");
  const rl=document.getElementById("req-lista");
  if(!senha){wrap.style.display="none";if(rl)rl.style.display="none";return;}
  wrap.style.display="block";if(rl)rl.style.display="flex";
  let f=0;
  const temLen=senha.length>=8, temMai=/[A-Z]/.test(senha), temNum=/[0-9]/.test(senha), temEsp=/[^A-Za-z0-9]/.test(senha);
  if(temLen)f++;if(temMai)f++;if(temNum)f++;if(temEsp)f++;
  document.getElementById("forca-barras").className="forca-barras forca-"+f;
  const msgs=["","Fraca — adicione números ou maiúsculas","Razoável — pode ser mais forte","Boa — quase perfeita!","Excelente — senha muito segura!"];
  const cores=["","#ef4444","#f59e0b","#3b82f6","#10c886"];
  const txt=document.getElementById("forca-texto");
  txt.textContent=msgs[f];txt.style.color=cores[f];
  // Requisitos visuais
  const rq=id=>document.getElementById(id);
  if(rq("req-len"))  rq("req-len").classList.toggle("ok",temLen);
  if(rq("req-upper"))rq("req-upper").classList.toggle("ok",temMai);
  if(rq("req-num"))  rq("req-num").classList.toggle("ok",temNum);
};

window.validarCampoSenha = function() {
  const s = document.getElementById("cc-senha").value;
  const valido = s.length>=8 && /[A-Z]/.test(s) && /[0-9]/.test(s);
  const inp = document.getElementById("cc-senha");
  const ico = document.getElementById("ico-senha");
  inp.classList.toggle("campo-erro", s.length>0 && !valido);
  inp.classList.toggle("campo-ok",   s.length>0 &&  valido);
  if(ico){ico.innerHTML=s.length===0?'':(valido ? ICO_OK : ICO_ERR);ico.style.display=s.length?'block':'none';}
};

window.validarCampoSenha2 = function() {
  const s  = document.getElementById("cc-senha").value;
  const s2 = document.getElementById("cc-senha2").value;
  setCampo("cc-senha2","ico-senha2","erro-senha2","ok-senha2",
    s2===s && s2.length>0,
    "As senhas não coincidem.",
    "As senhas coincidem");
};

window.validarCampoEmail = function() {
  const v = document.getElementById("cc-email").value.trim();
  setCampo("cc-email","ico-email","erro-email","ok-email",
    RE_EMAIL.test(v),
    "Endereço de e-mail inválido (ex: nome@dominio.com).",
    "E-mail válido");
  validarCriarConta();
};

window.validarCriarConta=function(){
  const email = document.getElementById("cc-email").value.trim();
  const senha = document.getElementById("cc-senha").value;
  const s2    = document.getElementById("cc-senha2").value;
  const emailOk = RE_EMAIL.test(email);
  const senhaOk = senha.length>=8 && /[A-Z]/.test(senha) && /[0-9]/.test(senha);
  const s2Ok    = s2===senha && s2.length>0;
  document.getElementById("btn-criar").disabled = !(emailOk && senhaOk && s2Ok);
};

window.criarConta=async function(){
  const email=document.getElementById("cc-email").value.trim();
  const senha=document.getElementById("cc-senha").value;
  const btn=document.getElementById("btn-criar");
  const msg=document.getElementById("msg-criar");
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> A criar conta…'; msg.innerHTML="";
  try{
    let uid,userFinal;
    const cred=EmailAuthProvider.credential(email,senha);
    if(auth.currentUser&&auth.currentUser.isAnonymous){const linked=await linkWithCredential(auth.currentUser,cred);uid=linked.user.uid;userFinal=linked.user;}
    else{const c=await createUserWithEmailAndPassword(auth,email,senha);uid=c.user.uid;userFinal=c.user;}
    _utilizador=userFinal;
    await setDoc(doc(db,"utilizadores",uid),{nome:_funcDoc.nome,email,unidade:_funcDoc.unidade||"",activo:true,funcionarioId:_funcDocId,criadoEm:serverTimestamp(),ultimoAcesso:serverTimestamp(),...payloadPerfilPortal([])});
    await updateDoc(doc(db,"funcionarios",_funcDocId),{portalUid:uid,portalEmail:email,portalCriadoEm:serverTimestamp()});
    const nome=(_funcDoc.nome||"").split(" ")[0];
    document.getElementById("bv-titulo").textContent="Bem-vindo, "+nome+"!";
    document.getElementById("bv-sub").textContent="A sua conta foi criada. Use o e-mail "+email+" para entrar sempre que precisar.";
    mostrarEcra("ecra-bem-vindo");
  }catch(e){
    console.error(e);
    let m="Erro ao criar conta. Tente novamente.";
    if(e.code==="auth/email-already-in-use")m="Este e-mail já está em uso. Tente fazer login.";
    if(e.code==="auth/weak-password")m="Senha demasiado fraca. Use pelo menos 8 caracteres.";
    if(e.code==="auth/invalid-email")m="Endereço de e-mail inválido.";
    msg.innerHTML=`<div class="alerta alerta-erro">${m}</div>`;
    btn.disabled=false; btn.innerHTML="Criar Conta →";
  }
};

window.entrarNoPortal=function(){mostrarPortal(_utilizador,{nome:_funcDoc.nome,unidade:_funcDoc.unidade,funcionarioId:_funcDocId,...payloadPerfilPortal([])});};

// LOGIN
window.fazerLoginFuncionario=async function(){
  const email=document.getElementById("lf-email").value.trim();
  const senha=document.getElementById("lf-senha").value;
  const btn=document.getElementById("btn-login-func");
  const msg=document.getElementById("msg-login-func");
  if(!email||!senha){msg.innerHTML=`<div class="alerta alerta-erro">Preencha o e-mail e a senha.</div>`;return;}
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> A entrar…'; msg.innerHTML="";
  try{const c=await signInWithEmailAndPassword(auth,email,senha);_utilizador=c.user;}
  catch(e){let m="E-mail ou senha incorrectos.";if(e.code==="auth/too-many-requests")m="Muitas tentativas. Aguarde um momento.";if(e.code==="auth/network-request-failed")m="Sem ligação. Verifique a internet.";msg.innerHTML=`<div class="alerta alerta-erro">${m}</div>`;btn.disabled=false;btn.innerHTML="Entrar →";}
};

// ── RECUPERAÇÃO DE SENHA ──
function mascararNomeRecuperacao(nome){
  if(!nome) return "Conta localizada";
  const partes=nome.trim().split(/\s+/).filter(Boolean);
  if(!partes.length) return "Conta localizada";
  return partes.map((p,i)=>i===0||i===partes.length-1?p:p[0]+"*".repeat(Math.max(p.length-1,1))).join(" ");
}

function mascararEmail(email){
  if(!email||!email.includes("@")) return "—";
  const [local,dominioBruto]=email.split("@");
  const dominioPartes=dominioBruto.split(".");
  const host=dominioPartes.shift()||"";
  const sufixo=dominioPartes.length?"."+dominioPartes.join("."):"";
  const localMask=local.length<=2 ? local[0]+"*" : local.slice(0,2)+"*".repeat(Math.max(local.length-2,1));
  const hostMask=host.length<=2 ? host[0]+"*" : host.slice(0,2)+"*".repeat(Math.max(host.length-2,1));
  return `${localMask}@${hostMask}${sufixo}`;
}

function limparResultadoRecuperacao(){
  _recEmailResolvido="";
  _recContaLocalizada=null;
  const card=document.getElementById("rec-resultado");
  if(card) card.classList.remove("visivel");
  const chip=document.getElementById("rec-email-chip");
  if(chip) chip.textContent="E-mail associado: —";
}

function preencherResultadoRecuperacao(func,email){
  _recContaLocalizada=func||null;
  _recEmailResolvido=email||"";
  document.getElementById("rec-avatar").textContent=(func?.nome||email||"?").trim().charAt(0).toUpperCase()||"?";
  document.getElementById("rec-nome").textContent=mascararNomeRecuperacao(func?.nome);
  document.getElementById("rec-unidade").textContent=func?.unidade?`${func.unidade}`:"Conta pronta para redefinição";
  document.getElementById("rec-email-chip").textContent=`E-mail associado: ${mascararEmail(email)}`;
  document.getElementById("rec-resultado").classList.add("visivel");
  document.getElementById("rec-email").value=email;
  document.getElementById("lf-email").value=email;
  window.sincronizarRecuperacao();
}

window.sincronizarRecuperacao = function(){
  const campo=document.getElementById("rec-email");
  const email=campo.value.trim();
  setCampo("rec-email","ico-rec-email","erro-rec-email","ok-rec-email",
    RE_EMAIL.test(email),
    "Endereço de e-mail inválido.",
    "E-mail pronto para recuperação");
  const btn=document.getElementById("btn-recuperar");
  const temEmailResolvido=!email && RE_EMAIL.test(_recEmailResolvido);
  btn.disabled=!(RE_EMAIL.test(email)||temEmailResolvido);
};

window.validarRecuperacaoBusca = function(){
  const numero=document.getElementById("rec-numero").value.trim();
  const bi=document.getElementById("rec-bi").value.trim().toUpperCase();
  if(_recEmailResolvido){
    limparResultadoRecuperacao();
    document.getElementById("msg-recuperacao").innerHTML="";
  }
  setCampo("rec-numero","ico-rec-numero","erro-rec-numero",null,
    RE_NUMERO.test(numero),
    "O N.º de Agente deve ter exactamente 8 dígitos numéricos.");
  setCampo("rec-bi","ico-rec-bi","erro-rec-bi","ok-rec-bi",
    RE_BI.test(bi),
    "Formato inválido. Exemplo correcto: 00123456LA083",
    "Formato de BI válido");
  document.getElementById("btn-localizar-rec").disabled=!(RE_NUMERO.test(numero)||RE_BI.test(bi));
  window.sincronizarRecuperacao();
};

window.prepararRecuperacao = function() {
  const emailLogin=document.getElementById("lf-email").value.trim();
  const campo=document.getElementById("rec-email");
  document.getElementById("msg-recuperacao").innerHTML="";
  document.getElementById("rec-numero").value="";
  document.getElementById("rec-bi").value="";
  limparResultadoRecuperacao();
  campo.value=emailLogin||"";
  mostrarEcra("ecra-recuperar-senha");
  window.validarRecuperacaoBusca();
  window.sincronizarRecuperacao();
  setTimeout(()=>campo.focus(),300);
};

window.pesquisarContaRecuperacao = async function() {
  const numero=document.getElementById("rec-numero").value.trim();
  const bi=document.getElementById("rec-bi").value.trim().toUpperCase();
  const btn=document.getElementById("btn-localizar-rec");
  const msg=document.getElementById("msg-recuperacao");
  msg.innerHTML="";

  if(!(RE_NUMERO.test(numero)||RE_BI.test(bi))){
    msg.innerHTML=`<div class="alerta alerta-erro">Introduza um N.º de Agente válido ou um BI válido para localizar a conta.</div>`;
    return;
  }

  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> A localizar…';

  try{
    if(!auth.currentUser) await signInAnonymously(auth);

    let enc=null;
    if(RE_NUMERO.test(numero)){
      const snap=await getDocs(query(collection(db,"funcionarios"),where("numero","==",numero)));
      if(!snap.empty) enc=snap.docs[0].data();
    }
    if(!enc&&RE_BI.test(bi)){
      const snap=await getDocs(query(collection(db,"funcionarios"),where("bi","==",bi)));
      if(!snap.empty) enc=snap.docs[0].data();
    }

    if(!enc){
      limparResultadoRecuperacao();
      msg.innerHTML=`<div class="alerta alerta-erro">Não encontrámos uma conta associada aos dados informados. Reveja os dados e tente novamente.</div>`;
      return;
    }

    let emailConta=(enc.portalEmail||"").trim();

    if(!enc.portalUid&&!RE_EMAIL.test(emailConta)){
      limparResultadoRecuperacao();
      msg.innerHTML=`<div class="alerta alerta-aviso">Encontrámos o seu registo, mas esta conta ainda não foi criada no portal. Volte e use <strong>Verificar pré-registo</strong> para criar o acesso pela primeira vez.</div>`;
      return;
    }

    if(!RE_EMAIL.test(emailConta)){
      limparResultadoRecuperacao();
      msg.innerHTML=`<div class="alerta alerta-aviso">Encontrámos o seu registo, mas o e-mail de acesso não está disponível nesta consulta. Introduza o e-mail manualmente ou contacte a Secção de RH para confirmar e actualizar a conta.</div>`;
      return;
    }

    preencherResultadoRecuperacao(enc,emailConta);
    msg.innerHTML=`<div class="alerta alerta-sucesso">Conta localizada. O link será enviado para <strong>${mascararEmail(emailConta)}</strong>.</div>`;
  }catch(e){
    console.error(e);
    limparResultadoRecuperacao();
    let m="Não foi possível localizar a conta agora. Tente novamente.";
    if(e.code==="permission-denied") m="O portal não conseguiu obter permissão para localizar esta conta. Recarregue a página e tente novamente.";
    if(e.code==="auth/network-request-failed") m="Sem ligação. Verifique a internet e tente novamente.";
    msg.innerHTML=`<div class="alerta alerta-erro">${m}</div>`;
  }finally{
    btn.innerHTML="Localizar conta →";
    btn.disabled=!(RE_NUMERO.test(numero)||RE_BI.test(bi));
    window.sincronizarRecuperacao();
  }
};

window.enviarRecuperacao = async function() {
  const campo=document.getElementById("rec-email");
  const emailDigitado=campo.value.trim();
  const email=RE_EMAIL.test(emailDigitado)?emailDigitado:(!emailDigitado&&RE_EMAIL.test(_recEmailResolvido)?_recEmailResolvido:"");
  const btn=document.getElementById("btn-recuperar");
  const msg=document.getElementById("msg-recuperacao");

  if(!email){
    msg.innerHTML=`<div class="alerta alerta-erro">Introduza um e-mail válido ou localize a sua conta pelo N.º de Agente / BI.</div>`;
    window.sincronizarRecuperacao();
    return;
  }

  campo.value=email;
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> A enviar…';
  msg.innerHTML="";

  try{
    await sendPasswordResetEmail(auth,email);
    const emailMasc=mascararEmail(email);
    const veioDaLocalizacao=_recContaLocalizada&&email===_recEmailResolvido;
    msg.innerHTML=veioDaLocalizacao
      ? `<div class="alerta alerta-sucesso"><strong>Link enviado.</strong><br>Enviámos as instruções para <strong>${emailMasc}</strong>. Verifique também a pasta de spam.</div>`
      : `<div class="alerta alerta-sucesso"><strong>E-mail enviado.</strong><br>Se este endereço tiver uma conta, receberá as instruções em breve. Verifique também a pasta de spam.</div>`;
    document.getElementById("lf-email").value=email;
    btn.innerHTML="Enviar link →";
    window.sincronizarRecuperacao();
    setTimeout(()=>{
      document.getElementById("msg-login-func").innerHTML=veioDaLocalizacao
        ? `<div class="alerta alerta-sucesso">Enviámos um link de redefinição para <strong>${emailMasc}</strong>.</div>`
        : `<div class="alerta alerta-sucesso">Se este endereço tiver uma conta, enviámos o link de redefinição.</div>`;
      mostrarEcra("ecra-login-func");
    },3500);
  }catch(e){
    console.error(e);
    let m="Erro ao enviar. Verifique a ligação e tente novamente.";
    if(e.code==="auth/invalid-email")m="Endereço de e-mail inválido.";
    if(e.code==="auth/network-request-failed")m="Sem ligação. Verifique a internet.";
    msg.innerHTML=`<div class="alerta alerta-erro">${m}</div>`;
    btn.innerHTML="Enviar link →";
    window.sincronizarRecuperacao();
  }
};

// PORTAL DASHBOARD
function mostrarPortal(user,dados){
  const nome=dados.nome||user.email;
  const primeiroNome=nome.split(" ")[0];
  setTimeout(()=>{
    const f=_funcDoc||{};
    const inc=_perfilIncompleto(f);
    const b=document.getElementById("banner-completar");
    if(b&&inc) b.style.display="block";
  },1000);
  const hora=new Date().getHours();
  const saud=hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  const inic=nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
  // Preencher elementos de UI — com null checks para segurança
  const f=_funcDoc||{};
  const _set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  const _html= (id, val) => { const el=document.getElementById(id); if(el) el.innerHTML=val; };

  // ── Helper: coloca foto real ou inicial num avatar ──
  function setAvatar(id, fotoUrl, inicial) {
    const el = document.getElementById(id); if(!el) return;
    const imgAnt = el.querySelector('img'); if(imgAnt) imgAnt.remove();
    if(fotoUrl){
      el.textContent='';
      const img=document.createElement('img'); img.src=fotoUrl; img.alt='';
      img.onerror=function(){ img.remove(); el.textContent=inicial; };
      el.appendChild(img);
    } else { el.textContent=inicial; }
  }

  // header mobile
  setAvatar("pt-avatar", f.fotoUrl||'', inic);
  _set("ph-saudacao", saud+", "+primeiroNome+"!");
  // topbar desktop
  _html("dt-saudacao", saud+", <em>"+primeiroNome+"!</em>");
  setAvatar("dt-avatar", f.fotoUrl||'', inic);
  // sidebar desktop
  setAvatar("ds-av", f.fotoUrl||'', inic);
  _set("ds-nome",  nome);
  _set("ds-cargo", f.categoria||"Funcionário");
  // card verde (início)
  setAvatar("pcv-avatar", f.fotoUrl||'', inic);
  _set("pcv-nome",      nome);
  _set("pcv-cargo",     f.categoria||"—");
  _set("pcv-numero",    f.numero||"—");
  _set("pcv-bi",        f.bi||"—");
  _set("pcv-categoria", f.categoria||"—");
  _set("pcv-unidade",   f.unidade||"—");
  mostrarEcra("ecra-portal");
  carregarSolicitacoes(user.uid,dados.funcionarioId);
  carregarPerfil(dados);
}

// Guardar unsubscribers para poder cancelar ao fazer logout
let _unsubSols = null, _unsubDocs = null;

function carregarSolicitacoes(uid, funcionarioId) {
  const div = document.getElementById("lista-docs-portal");
  const docsDiv = document.getElementById("lista-docs-meus");
  [div, docsDiv].forEach(el => {
    if (el) el.innerHTML = `<div class="vazio-portal"><div class="vi"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg></div><p>A carregar…</p></div>`;
  });

  // Cancelar listeners anteriores se existirem
  if (_unsubSols) { _unsubSols(); _unsubSols = null; }
  if (_unsubDocs) { _unsubDocs(); _unsubDocs = null; }

  if (!funcionarioId) {
    const vazioHtml = `<div class="vazio-portal"><div class="vi"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg></div><p>Ainda não tem documentos ou solicitações.</p><small>Assim que o perfil estiver associado corretamente, os seus registos vão aparecer aqui.</small></div>`;
    if (div) div.innerHTML = vazioHtml;
    if (docsDiv) docsDiv.innerHTML = vazioHtml;
    return;
  }

  let _sols = [], _docs = [];

  function renderTudo() {
    const homeEl = document.getElementById("lista-docs-portal");
    const docsEl = document.getElementById("lista-docs-meus");
    const solicitacoesVisiveis = _sols.filter(s => {
      if (!s.documentoGeradoId) return true;
      return !_docs.some(d => d.id === s.documentoGeradoId);
    });
    const todos = [
      ...solicitacoesVisiveis.map(s => ({ ...s, _origem: "solicitacao" })),
      ..._docs.map(d => ({ ...d, _origem: "documento" }))
    ].sort((a, b) => {
      const ta = a.criadaEm?.toDate ? a.criadaEm.toDate() : (a.geradoEm?.toDate ? a.geradoEm.toDate() : new Date(0));
      const tb = b.criadaEm?.toDate ? b.criadaEm.toDate() : (b.geradoEm?.toDate ? b.geradoEm.toDate() : new Date(0));
      return tb - ta;
    });

    const total = todos.length;
    const aprov = todos.filter(s => s.estado === "aprovado" || s.estado === "concluida").length;
    const pend  = todos.filter(s => s.estado === "pendente" || s.estado === "gerado" || s.estado === "nova" || s.estado === "processando").length;
    // Actualizar ambos os conjuntos de KPIs (mobile + desktop) de uma só vez
    const _setKpi = (pares) => pares.forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });
    _setKpi([
      ['pk-total', total],    ['dk-total', total],
      ['pk-aprovados', aprov],['dk-aprovados', aprov],
      ['pk-pendentes', pend], ['dk-pendentes', pend],
    ]);
    const homeBadge=document.getElementById("home-activity-badge");
    if(homeBadge) homeBadge.textContent=total===0 ? "Sem registos" : `${Math.min(total,4)} recentes`;
    const docsBadge=document.getElementById("docs-total-badge");
    if(docsBadge) docsBadge.textContent=total===1 ? "1 registo" : `${total} registos`;
    // badge sidebar
    const dsBadge=document.getElementById("ds-badge-pendentes");
    if(dsBadge){ dsBadge.textContent=pend; dsBadge.classList.toggle("visivel",pend>0); }
    const bp = document.getElementById("badge-pendentes");
    if (pend > 0) { bp.textContent = pend; bp.style.display = "inline"; } else bp.style.display = "none";

    window._minhasSolicitacoes = todos;
    if(homeEl) homeEl.innerHTML = renderListaDocumentos(todos,{
      limit:4,
      tituloVazio:"Sem atividade recente.",
      detalheVazio:"Crie o seu primeiro pedido para começar a acompanhar o histórico aqui.",
      mostrarAcao:true
    });
    if(docsEl) docsEl.innerHTML = renderListaDocumentos(todos,{
      tituloVazio:"Ainda não tem documentos.",
      detalheVazio:"Quando enviar o primeiro pedido, o histórico completo ficará disponível nesta área.",
      mostrarAcao:true
    });
  }

  // Listener em solicitações
  _unsubSols = onSnapshot(
    query(collection(db, "solicitacoes"), where("funcionarioUid", "==", uid), where("funcionarioId", "==", funcionarioId)),
    snap => {
      const novas = snap.docs.map(d => {
        const dados = { id: d.id, ...d.data() };
        const anterior = _sols.find(s => s.id === dados.id);
        return { ...dados, _estadoAnterior: anterior?.estado || null };
      });
      novas.forEach(novo => {
        if (!novo._estadoAnterior || novo._estadoAnterior === novo.estado) return;
        const msg = novo.estado === "processando"
          ? "O seu pedido está agora em processamento pelo RH."
          : novo.estado === "concluida"
          ? "O seu pedido foi concluído e a guia já está disponível."
          : novo.estado === "rejeitada"
          ? "O seu pedido foi rejeitado. Consulte os detalhes."
          : null;
        if (msg) notif(msg, novo.estado === "rejeitada" ? "notif-erro" : "notif-ok");
      });
      _sols = novas;
      renderTudo();
    },
    err => {
      console.error(err);
      const erroHtml = `<div class="vazio-portal"><div class="vi"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg></div><p>Não foi possível carregar os registos.</p><small>Verifique a ligação e tente novamente.</small></div>`;
      if (div) div.innerHTML = erroHtml;
      if (docsDiv) docsDiv.innerHTML = erroHtml;
    }
  );

  // Listener em documentos gerados
  _unsubDocs = onSnapshot(
    query(collection(db, "documentos"), where("funcionarioId", "==", funcionarioId), where("funcionarioUid", "==", uid)),
    snap => {
      const novos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Detectar mudanças de estado para notificar o funcionário
      novos.forEach(novo => {
        const anterior = _docs.find(d => d.id === novo.id);
        if (anterior && anterior.estado !== novo.estado) {
          const msg = novo.estado === "aprovado"
            ? `O seu documento foi aprovado!`
            : novo.estado === "rejeitado"
            ? `O seu documento foi rejeitado. Consulte os detalhes.`
            : null;
          if (msg) notif(msg, novo.estado === "aprovado" ? "notif-ok" : "notif-erro");
        }
      });
      _docs = novos;
      renderTudo();
    },
    err => { console.error(err); }
  );
}

window.abrirDetalheDoc=function(id,origem){
  const s=(window._minhasSolicitacoes||[]).find(x=>x.id===id);if(!s)return;
  const tipo=s.tipo||s.tipoDocumento||"outro";
  const info=LABELS_TIPO[tipo]||{nome:tipo,icone:`<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`};
  const estInfo=LABELS_ESTADO[s.estado||"nova"]||{texto:s.estado,classe:"est-nova"};
  const ts=s.criadaEm?.toDate?s.criadaEm.toDate():(s.geradoEm?.toDate?s.geradoEm.toDate():null);
  const detalhePrincipal = obterDetalheCurtoPortal(s);
  const detalheDeclaracao = obterBlocoDeclaracaoPortal(s);
  const estadoAjuda = origem==="solicitacao" && s.estado==="nova"
    ? "O pedido foi recebido pelo RH e aguarda tomada a cargo."
    : origem==="solicitacao" && s.estado==="processando"
    ? "O RH está a preparar a sua guia. Assim que for gerada, ela aparecerá aqui."
    : (s.estado==="gerado" || s.estado==="pendente")
    ? "A guia já foi gerada e segue para validação interna."
    : null;
  document.getElementById("modal-sol-titulo").textContent=info.nome;
  document.getElementById("modal-sol-sub").textContent=ts?ts.toLocaleDateString("pt-AO",{day:"2-digit",month:"long",year:"numeric"}):"—";
  let extra="";
  if(s.observacao)extra+=`<div class="alerta alerta-${s.estado==='rejeitada'||s.estado==='rejeitado'?'erro':'sucesso'}" style="margin-top:12px"><strong>Observação de RH:</strong> ${s.observacao}</div>`;
  if(s.numGuia)extra+=`<div class="alerta alerta-sucesso" style="margin-top:8px">Referência: Guia Nº ${s.numGuia}/${s.anoGuia}</div>`;
  const temArquivo = origem==="documento" && s.htmlArquivo &&
    (s.estado === "aprovado" || s.estado === "concluida");
  if(temArquivo){
    extra+=`<button class="btn-visualizar-portal" style="align-self:flex-start;margin-top:10px" onclick="abrirVisualizacaoPortal('${s.id}')">Visualizar guia concluida</button>`;
    extra+=`<div class="alerta alerta-info" style="margin-top:10px">Visualizacao apenas de leitura. Download e impressao nao estao disponiveis no portal do funcionario.</div>`;
  }
  
  document.getElementById("modal-sol-corpo").innerHTML=`<div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:var(--neu-400)">Estado</span><span class="badge-est-portal ${estInfo.classe}">${estInfo.texto}</span></div>
    <div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:var(--neu-400)">Tipo</span><span style="font-size:13px;font-weight:700">${info.nome}</span></div>
    ${tipo==='declaracao-servico' ? detalheDeclaracao : ""}
    ${detalhePrincipal && tipo!=='declaracao-servico' ? `<div style="background:var(--neu-50);border-radius:var(--r-sm);padding:12px;font-size:13px"><strong>${tipo==='guia-medica'?'Unidade Sanitária':'Motivo'}:</strong> ${escapeHtml(detalhePrincipal)}</div>` : ""}
    ${(s.dataInicioFerias||s.dataInicio)?`<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:var(--neu-400)">Início férias</span><span style="font-size:13px;font-weight:700">${s.dataInicioFerias||s.dataInicio}</span></div>`:""}
    ${estadoAjuda?`<div class="alerta alerta-info" style="margin-top:4px">${estadoAjuda}</div>`:""}
    ${extra}
  </div>`;
  document.getElementById("overlay-detalhe-sol").classList.add("activo");
};

// ── VISUALIZACAO CONTROLADA ──
// Estratégia: Shadow DOM como renderizador primário (isolamento CSS total,
// sem restrições de sandbox), Blob URL como fallback para abrir numa nova aba.
let _viewerBlobUrl = null;

window.abrirVisualizacaoPortal = function(id) {
  const s = (window._minhasSolicitacoes || []).find(x => x.id === id);
  if (!s || !s.htmlArquivo) { notif("Arquivo não disponível.", "notif-erro"); return; }
  const tipo = s.tipo || s.tipoDocumento || "Documento";
  const ref  = s.numGuia ? `Nº ${s.numGuia}/${s.anoGuia}` : "Documento concluido";
  const titulo    = document.getElementById("viewer-doc-titulo");
  const subtitulo = document.getElementById("viewer-doc-sub");
  if (titulo)    titulo.textContent    = `${tipo === 'guia-medica' ? 'Guia Medica' : tipo} · ${ref}`;
  if (subtitulo) subtitulo.textContent = "Visualizacao apenas de leitura no portal do funcionario";

  // ── Renderização via Shadow DOM (primária) ──
  // Isola completamente os estilos do documento sem as restrições do sandbox
  // que bloqueiam a renderização em Android Chrome.
  const container = document.getElementById("viewer-doc-content");
  if (container) {
    let shadow = container.shadowRoot;
    if (!shadow) shadow = container.attachShadow({ mode: "open" });
    shadow.innerHTML = s.htmlArquivo;
  }

  // ── Blob URL para fallback (abrir em nova aba) ──
  // Permite ao utilizador abrir o documento numa aba do browser nativa,
  // contornando qualquer limitação de renderização do portal.
  const fallbackLink = document.getElementById("viewer-fallback-link");
  if (fallbackLink) {
    if (_viewerBlobUrl) { URL.revokeObjectURL(_viewerBlobUrl); _viewerBlobUrl = null; }
    try {
      const blob = new Blob([s.htmlArquivo], { type: "text/html" });
      _viewerBlobUrl = URL.createObjectURL(blob);
      fallbackLink.href = _viewerBlobUrl;
    } catch(e) { fallbackLink.href = "#"; }
  }
  const fallbackEl = document.getElementById("viewer-fallback");
  if (fallbackEl) fallbackEl.classList.add("visivel");

  document.getElementById("overlay-detalhe-sol").classList.remove("activo");
  document.getElementById("overlay-viewer-doc").classList.add("activo");
};
window.fecharVisualizacaoPortal = function() {
  // Limpar Shadow DOM
  const container = document.getElementById("viewer-doc-content");
  if (container?.shadowRoot) container.shadowRoot.innerHTML = "";
  // Revogar Blob URL para libertar memória
  if (_viewerBlobUrl) { URL.revokeObjectURL(_viewerBlobUrl); _viewerBlobUrl = null; }
  const fallbackLink = document.getElementById("viewer-fallback-link");
  if (fallbackLink) fallbackLink.href = "#";
  const fallbackEl = document.getElementById("viewer-fallback");
  if (fallbackEl) fallbackEl.classList.remove("visivel");
  document.getElementById("overlay-viewer-doc").classList.remove("activo");
};
window.abrirVisualizacaoPortalPorDocId = async function(docId) {
  if (!docId) return false;
  const emCache = (window._minhasSolicitacoes || []).find(x => x.id === docId && x.htmlArquivo);
  if (emCache) {
    abrirVisualizacaoPortal(docId);
    return true;
  }
  try {
    const snap = await getDoc(doc(db, "documentos", docId));
    if (!snap.exists()) return false;
    const dados = { id: snap.id, ...snap.data() };
    if (_utilizador?.uid && dados.funcionarioUid && dados.funcionarioUid !== _utilizador.uid) return false;
    if (_funcDocId && dados.funcionarioId && dados.funcionarioId !== _funcDocId) return false;
    if (!dados.htmlArquivo) return false;
    const lista = window._minhasSolicitacoes || [];
    const idx = lista.findIndex(x => x.id === dados.id);
    if (idx >= 0) lista[idx] = { ...lista[idx], ...dados, _origem: "documento" };
    else lista.push({ ...dados, _origem: "documento" });
    window._minhasSolicitacoes = lista;
    abrirVisualizacaoPortal(dados.id);
    return true;
  } catch (e) {
    console.warn("abrirVisualizacaoPortalPorDocId:", e);
    return false;
  }
};
window.imprimirSegundaViaPortal = function(id) { abrirVisualizacaoPortal(id); };

// ── COMPLETUDE DO FORMULÁRIO ──
// Campos mínimos obrigatórios para gerar qualquer documento oficial.
// Se algum faltar, o funcionário é redirecionado para o formulário.
function _perfilIncompleto(f) {
  return !f || !f.bi || !f.nascimento || !f.nomePai || !f.nomeMae ||
         !f.morada || !f.nome || !f.numero || !f.categoria;
}

// SOLICITAR
window.seleccionarTipo=function(tipo,el){
  // Bloquear selecção se perfil incompleto
  if (_perfilIncompleto(_funcDoc)) {
    const msg=document.getElementById("msg-solicitacao");
    msg.innerHTML=`<div class="alerta alerta-aviso">
      <strong>O seu perfil está incompleto.</strong><br>
      Preencha o <a href="formulario.html" style="color:var(--primary-d);font-weight:700">formulário profissional</a>
      antes de pedir documentos. Os seus dados são necessários para emitir documentos oficiais.
    </div>`;
    return;
  }
  document.querySelectorAll(".tipo-card").forEach(c=>c.classList.remove("seleccionado"));
  el.classList.add("seleccionado"); _tipoSel=tipo;
  document.getElementById("form-solicitacao-extra").style.display="block";
  document.getElementById("msg-solicitacao").innerHTML="";
  const cd=document.getElementById("campo-data-inicio-wrap");
  const campoMotivoWrap=document.getElementById("campo-motivo-wrap");
  const camposDeclaracao=document.getElementById("campos-declaracao-wrap");
  cd.style.display=tipo==="guia-ferias"?"block":"none";
  if(tipo!=="guia-ferias")document.getElementById("sol-data-inicio").value="";
  
  // Actualizar label e placeholder conforme tipo
  const lblMotivo = document.getElementById("lbl-sol-motivo");
  const inpMotivo = document.getElementById("sol-motivo");
  const hintMotivo = document.getElementById("hint-sol-motivo");
  
  if(tipo === "guia-medica") {
    if(campoMotivoWrap) campoMotivoWrap.style.display="block";
    if(camposDeclaracao) camposDeclaracao.style.display="none";
    lblMotivo.innerHTML = 'Unidade Sanitária a Consultar <span style="font-size:10px;font-weight:400;color:var(--txt-4)">(obrigatório)</span>';
    inpMotivo.placeholder = "Ex: Hospital Municipal do Sumbe, Centro Médico, etc";
    hintMotivo.textContent = "Indique a unidade sanitária onde vai fazer a consulta.";
    inpMotivo.style.borderColor = "var(--amber)";
  } else if(tipo === "declaracao-servico") {
    if(campoMotivoWrap) campoMotivoWrap.style.display="none";
    if(camposDeclaracao) camposDeclaracao.style.display="block";
    inpMotivo.style.borderColor = "";
  } else {
    if(campoMotivoWrap) campoMotivoWrap.style.display="block";
    if(camposDeclaracao) camposDeclaracao.style.display="none";
    lblMotivo.innerHTML = 'Finalidade / Motivo <span style="font-size:10px;font-weight:400;color:var(--txt-4)">(opcional)</span>';
    inpMotivo.placeholder = "Descreva brevemente o motivo…";
    hintMotivo.textContent = "Opcional — ajuda a RH a processar mais rapidamente.";
    inpMotivo.style.borderColor = "";
  }
};

window.validarDataInicio=function(){
  const inp=document.getElementById("sol-data-inicio");
  const val=inp.value;
  const ico=document.getElementById("ico-data-inicio");
  const err=document.getElementById("erro-data-inicio");
  const ok =document.getElementById("ok-data-inicio");
  if(!val){
    inp.classList.remove("campo-erro","campo-ok");
    if(ico) ico.style.display="none";
    if(err){err.textContent="";err.style.display="none";}
    if(ok) {ok.textContent="";ok.style.display="none";}
    return;
  }
  const hoje=new Date();hoje.setHours(0,0,0,0);
  const d=new Date(val+"T12:00:00");
  const valido=d>=hoje;
  inp.classList.toggle("campo-erro",!valido);
  inp.classList.toggle("campo-ok",   valido);
  if(ico){ico.innerHTML=(valido ? ICO_OK : ICO_ERR);ico.style.display="block";}
  if(err){err.textContent=!valido?"A data não pode ser no passado.":"";err.style.display=!valido?"block":"none";}
  if(ok) {ok.textContent= valido?"Data válida":"";ok.style.display=valido?"block":"none";}
};

// ── Máscara telefone Angola: 9XX XXX XXX ou 2XX XXX XXX ────────
window.mascaraValorKzPortal=function(inp){
  const bruto=(inp?.value||"").trim();
  if(!bruto){
    inp.value="";
    return;
  }
  const numero=obterNumeroKzPortal(bruto);
  inp.value=Number.isFinite(numero)
    ? formatarMoedaKzPortal(numero,{sufixo:false})
    : bruto.replace(/[^\d,.\s]/g,"");
};

window.mascaraTelefone=function(inp){
  let v=inp.value.replace(/\D/g,'').slice(0,9);
  if(v.length>6)      v=v.slice(0,3)+' '+v.slice(3,6)+' '+v.slice(6);
  else if(v.length>3) v=v.slice(0,3)+' '+v.slice(3);
  inp.value=v;
};

const RE_TEL_AO=/^(9[0-9]{2}|2[0-9]{2}) \d{3} \d{3}$/;

window.validarTelefone=function(){
  const inp=document.getElementById("perf-telefone-edit");
  if(!inp)return;
  const v=inp.value.trim();
  const ico=document.getElementById("ico-tel-edit");
  const err=document.getElementById("erro-tel-edit");
  const ok =document.getElementById("ok-tel-edit");
  if(!v){
    inp.classList.remove("campo-erro","campo-ok");
    if(ico)ico.style.display="none";
    if(err){err.textContent="";err.style.display="none";}
    if(ok) {ok.textContent="";ok.style.display="none";}
    return;
  }
  const valido=RE_TEL_AO.test(v);
  inp.classList.toggle("campo-erro",!valido);
  inp.classList.toggle("campo-ok",   valido);
  if(ico){ico.innerHTML=(valido ? ICO_OK : ICO_ERR);ico.style.display="block";}
  if(err){err.textContent=!valido?"Formato inválido. Use: 900 000 000":"";err.style.display=!valido?"block":"none";}
  if(ok) {ok.textContent= valido?"Número válido":"";ok.style.display=valido?"block":"none";}
};

window.submeterSolicitacao=async function(){
  if(!_tipoSel||!_utilizador)return;

  // Barreira — perfil completo
  if (_perfilIncompleto(_funcDoc)) {
    const msg=document.getElementById("msg-solicitacao");
    msg.innerHTML=`<div class="alerta alerta-aviso">
      <strong>Perfil incompleto.</strong>
      <a href="formulario.html" style="color:var(--primary-d);font-weight:700">Preencha o formulário</a> antes de continuar.
    </div>`;
    return;
  }

  const motivo = document.getElementById("sol-motivo").value.trim();
  const mesesAdiantamento = _tipoSel === "declaracao-servico"
    ? parseInt(document.getElementById("sol-meses-adiantamento").value,10)
    : null;
  const numeroConta = _tipoSel === "declaracao-servico"
    ? normalizarNumeroContaPortal(document.getElementById("sol-numero-conta").value)
    : "";
  const salarioLiquido = _tipoSel === "declaracao-servico"
    ? obterNumeroKzPortal(document.getElementById("sol-salario-liquido").value)
    : NaN;
  const btn    = document.getElementById("btn-submeter-sol");
  const msg    = document.getElementById("msg-solicitacao");
  if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner"></span> A verificar…'; }

  try{
    const dataInicio=_tipoSel==="guia-ferias"?document.getElementById("sol-data-inicio").value:"";
    if(_tipoSel==="guia-ferias"&&!dataInicio){
      msg.innerHTML=`<div class="alerta alerta-aviso">Por favor, indique a <strong>data de início das férias</strong>.</div>`;
      if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
      return;
    }

    // Validação para Guia Médica — unidade sanitária obrigatória
    if(_tipoSel==="guia-medica"&&!motivo){
      msg.innerHTML=`<div class="alerta alerta-aviso">Por favor, indique a <strong>unidade sanitária</strong> onde vai fazer a consulta.</div>`;
      if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
      return;
    }
    if(_tipoSel==="declaracao-servico"){
      if(!Number.isInteger(mesesAdiantamento) || mesesAdiantamento<=0){
        msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>número de meses</strong> do adiantamento.</div>`;
        document.getElementById("sol-meses-adiantamento")?.focus();
        if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
        return;
      }
      if(!numeroConta){
        msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>número de conta</strong> para o adiantamento.</div>`;
        document.getElementById("sol-numero-conta")?.focus();
        if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
        return;
      }
      if(!Number.isFinite(salarioLiquido) || salarioLiquido<=0){
        msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>salário líquido</strong> em AKZ.</div>`;
        document.getElementById("sol-salario-liquido")?.focus();
        if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
        return;
      }
    }

    // ── VALIDAÇÃO DE DUPLICADOS ──
    if(_funcDocId){
      const snapDup=await getDocs(query(
        collection(db,"solicitacoes"),
        where("funcionarioUid","==",_utilizador.uid),
        where("funcionarioId","==",_funcDocId),
        where("tipo","==",_tipoSel),
        where("estado","in",["nova","processando"])
      ));
      if(!snapDup.empty){
        const NOMES_TIPO={"guia-ferias":"Guia de Férias","declaracao-servico":"Declaração de Adiantamento Salarial","guia-medica":"Guia Médica","oficio":"Ofício"};
        const nomeTipo=NOMES_TIPO[_tipoSel]||_tipoSel;
        msg.innerHTML=`<div class="alerta alerta-aviso">
          <strong>Já tem um pedido activo de ${nomeTipo}.</strong><br>
          Aguarde o processamento do pedido existente antes de submeter um novo.
        </div>`;
        if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
        return;
      }
    }

    if(btn) btn.innerHTML='<span class="spinner"></span> A enviar…';

    // Guardar dados no Firebase
    const dadosSolicitacao = {
      funcionarioId: _funcDocId || null,
      funcionarioNome: _funcDoc?.nome || _utilizador.email,
      funcionarioEmail: _utilizador.email,
      funcionarioUid: _utilizador.uid,
      tipo: _tipoSel,
      dataInicioFerias: dataInicio,
      estado: "nova",
      criadaEm: serverTimestamp(),
      unidade: _funcDoc?.unidade || "",
      categoria: _funcDoc?.categoria || "",
      admissao: _funcDoc?.admissao || "",
      numero: _funcDoc?.numero || "",
      bi: _funcDoc?.bi || "",
      sexo: _funcDoc?.sexo || "",
      municipioNatal: _funcDoc?.municipioNatal || ""
    };

    if(_tipoSel === "guia-medica") {
      dadosSolicitacao.unidadeSanitaria = motivo;
    } else if(_tipoSel === "declaracao-servico") {
      dadosSolicitacao.mesesAdiantamento = mesesAdiantamento;
      dadosSolicitacao.numeroConta = numeroConta;
      dadosSolicitacao.salarioLiquido = salarioLiquido;
    } else {
      dadosSolicitacao.motivo = motivo;
    }

    await addDoc(collection(db,"solicitacoes"), dadosSolicitacao);

    msg.innerHTML=`<div class="alerta alerta-sucesso"><strong>Solicitação enviada!</strong> A Secção de RH irá processar o seu pedido brevemente. Pode acompanhar o andamento na área "Documentos".</div>`;
    if(btn){btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';btn.disabled=false;}
    _tipoSel=null;
    document.querySelectorAll(".tipo-card").forEach(c=>c.classList.remove("seleccionado"));
    document.getElementById("form-solicitacao-extra").style.display="none";
    document.getElementById("sol-motivo").value="";
    document.getElementById("sol-meses-adiantamento").value="";
    document.getElementById("sol-numero-conta").value="";
    document.getElementById("sol-salario-liquido").value="";
    setTimeout(()=>carregarSolicitacoes(_utilizador.uid,_funcDocId),1500);
  }catch(e){
    console.error(e);
    let m="Erro ao enviar. Verifique a ligação e tente novamente.";
    if(e.code==="permission-denied")m="Sem permissão. Feche a sessão, entre novamente e tente outra vez.";
    msg.innerHTML=`<div class="alerta alerta-erro">${m}</div>`;
    if(btn){btn.disabled=false;btn.innerHTML='<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Rever e enviar';}
  }
};

// ── Abrir modal de revisão antes de submeter ────────────────────────
window.abrirRevisaoPedido = function() {
  if (!_tipoSel || !_utilizador) return;

  const msg = document.getElementById("msg-solicitacao");

  // 1. Perfil incompleto
  if (_perfilIncompleto(_funcDoc)) {
    msg.innerHTML=`<div class="alerta alerta-aviso">
      <strong>O seu perfil está incompleto.</strong>
      <a href="formulario.html" style="color:var(--primary-d);font-weight:700">Preencha o formulário</a> antes de continuar.
    </div>`;
    return;
  }

  // 2. Data de férias obrigatória
  const dataInicio = _tipoSel === "guia-ferias"
    ? document.getElementById("sol-data-inicio").value
    : "";
  if (_tipoSel === "guia-ferias" && !dataInicio) {
    msg.innerHTML=`<div class="alerta alerta-aviso">Por favor, indique a <strong>data de início das férias</strong> antes de rever o pedido.</div>`;
    document.getElementById("sol-data-inicio")?.focus();
    return;
  }

  // 3. Unidade sanitária obrigatória para guia médica
  const motivo = document.getElementById("sol-motivo").value.trim();
  const mesesAdiantamento = _tipoSel === "declaracao-servico"
    ? parseInt(document.getElementById("sol-meses-adiantamento").value,10)
    : null;
  const numeroConta = _tipoSel === "declaracao-servico"
    ? normalizarNumeroContaPortal(document.getElementById("sol-numero-conta").value)
    : "";
  const salarioLiquido = _tipoSel === "declaracao-servico"
    ? obterNumeroKzPortal(document.getElementById("sol-salario-liquido").value)
    : NaN;
  if (_tipoSel === "guia-medica" && !motivo) {
    msg.innerHTML=`<div class="alerta alerta-aviso">Por favor, indique a <strong>unidade sanitária</strong> antes de rever o pedido.</div>`;
    document.getElementById("sol-motivo")?.focus();
    return;
  }
  if (_tipoSel === "declaracao-servico") {
    if (!Number.isInteger(mesesAdiantamento) || mesesAdiantamento <= 0) {
      msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>número de meses</strong> do adiantamento antes de rever o pedido.</div>`;
      document.getElementById("sol-meses-adiantamento")?.focus();
      return;
    }
    if (!numeroConta) {
      msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>número de conta</strong> antes de rever o pedido.</div>`;
      document.getElementById("sol-numero-conta")?.focus();
      return;
    }
    if (!Number.isFinite(salarioLiquido) || salarioLiquido <= 0) {
      msg.innerHTML=`<div class="alerta alerta-aviso">Indique o <strong>salário líquido</strong> em AKZ antes de rever o pedido.</div>`;
      document.getElementById("sol-salario-liquido")?.focus();
      return;
    }
  }

  // 4. Tudo válido — construir resumo
  const NOMES = {
    "guia-ferias":         { nome:"Guia de Férias",       icone:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>', sub:"Autorização de férias anuais" },
    "declaracao-servico":  { nome:"Declaração de Adiantamento Salarial", icone:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>', sub:"Pedido para adiantamento salarial junto do BPC" },
    "guia-medica":         { nome:"Guia Médica",           icone:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>', sub:"Para consultas médicas" },
    "oficio":              { nome:"Ofício / Nota",         icone:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>', sub:"Comunicação oficial" }
  };
  const info = NOMES[_tipoSel] || { nome: _tipoSel, icone:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="26" height="26"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>', sub:"" };

  const nomeFuncionario = _funcDoc?.nome || _utilizador?.email || "—";
  const unidade         = _funcDoc?.unidade || "—";
  const categoria       = _funcDoc?.categoria || "—";

  // Linha de data (apenas guia-ferias)
  const linhaData = _tipoSel === "guia-ferias" && dataInicio
    ? `<div class="revisao-linha">
         <span class="revisao-linha-label">Data início</span>
         <span class="revisao-linha-valor">${new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-AO", { day:"2-digit", month:"long", year:"numeric" })}</span>
       </div>`
    : "";

  let linhasTipo = "";
  if (_tipoSel === "guia-medica") {
    linhasTipo = motivo
      ? `<div class="revisao-linha">
           <span class="revisao-linha-label">Unidade sanitária</span>
           <span class="revisao-linha-valor">${escapeHtml(motivo)}</span>
         </div>`
      : "";
  } else if (_tipoSel === "declaracao-servico") {
    linhasTipo = `
      <div class="revisao-linha">
        <span class="revisao-linha-label">Meses do adiantamento</span>
        <span class="revisao-linha-valor">${escapeHtml(formatarMesesAdiantamento(mesesAdiantamento))}</span>
      </div>
      <div class="revisao-linha">
        <span class="revisao-linha-label">Salário líquido</span>
        <span class="revisao-linha-valor">${escapeHtml(formatarMoedaKzPortal(salarioLiquido))}</span>
      </div>
      <div class="revisao-linha">
        <span class="revisao-linha-label">Número de conta</span>
        <span class="revisao-linha-valor">${escapeHtml(numeroConta)}</span>
      </div>`;
  } else {
    linhasTipo = motivo
      ? `<div class="revisao-linha">
           <span class="revisao-linha-label">Motivo</span>
           <span class="revisao-linha-valor">${escapeHtml(motivo)}</span>
         </div>`
      : `<div class="revisao-linha">
           <span class="revisao-linha-label">Motivo</span>
           <span class="revisao-linha-valor vazio">Não indicado</span>
         </div>`;
  }

  document.getElementById("revisao-modal-corpo").innerHTML = `
    <div class="revisao-tipo-badge">
      <div class="revisao-tipo-ic">${info.icone}</div>
      <div>
        <div class="revisao-tipo-nome">${info.nome}</div>
        <div class="revisao-tipo-sub">${info.sub}</div>
      </div>
    </div>
    <div class="revisao-linhas">
      <div class="revisao-linha">
        <span class="revisao-linha-label">Funcionário</span>
        <span class="revisao-linha-valor">${escapeHtml(nomeFuncionario)}</span>
      </div>
      <div class="revisao-linha">
        <span class="revisao-linha-label">Categoria</span>
        <span class="revisao-linha-valor">${escapeHtml(categoria)}</span>
      </div>
      <div class="revisao-linha">
        <span class="revisao-linha-label">Unidade</span>
        <span class="revisao-linha-valor">${escapeHtml(unidade)}</span>
      </div>
      ${linhaData}
      ${linhasTipo}
    </div>
    <div class="revisao-aviso">
      <span class="revisao-aviso-ic"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span>
      <span>Após confirmar, o pedido é enviado imediatamente ao RH e não poderá ser editado. Verifique os dados acima.</span>
    </div>
  `;

  // 5. Abrir modal
  msg.innerHTML = "";
  document.getElementById("overlay-revisao-pedido").classList.add("activo");
};

// PERFIL
function carregarPerfil(dados){
  mostrarDocsCarregados(_funcDoc);
  const f=_funcDoc||{};
  const nome=f.nome||dados.nome||"—";
  const inic=nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
  // ── Avatar perfil — foto real ou iniciais ──
  (function(){
    const av=document.getElementById("perf-avatar"); if(!av) return;
    const imgAnt=av.querySelector('img'); if(imgAnt) imgAnt.remove();
    if(f.fotoUrl){
      av.textContent='';
      const img=document.createElement('img'); img.src=f.fotoUrl; img.alt=nome;
      img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';
      img.onerror=function(){ img.remove(); av.textContent=inic; };
      av.appendChild(img);
    } else { av.textContent=inic; }
  })();
  document.getElementById("perf-nome").textContent=nome;
  document.getElementById("perf-sub").textContent=(f.categoria||"—")+" · "+(f.unidade||"—");
  const vinc={quadro:"Pessoal do Quadro",provisorio:"Prov. Provisório"};
  const est={activo:"Em Serviço Activo",inactivo:"Inactivo",licenca:"De Licença"};
  document.getElementById("perf-vinculo").textContent=vinc[f.vinculo]||f.vinculo||"—";
  document.getElementById("perf-estado").textContent=est[f.estado]||f.estado||"—";
  if(f.telefone){
    const _telRaw=(f.telefone||"").replace(/\D/g,"").slice(0,9);
    let _telFmt=_telRaw;
    if(_telRaw.length>6)_telFmt=_telRaw.slice(0,3)+" "+_telRaw.slice(3,6)+" "+_telRaw.slice(6);
    else if(_telRaw.length>3)_telFmt=_telRaw.slice(0,3)+" "+_telRaw.slice(3);
    document.getElementById("perf-telefone-edit").value=_telFmt;
  }
  const campos=[
    {r:"Número de Agente",v:f.numero||"—"},{r:"Bilhete de Identidade",v:f.bi||"—"},
    {r:"Categoria / Cargo",v:f.categoria||"—"},{r:"Local de Colocação",v:f.unidade||"—"},
    {r:"Tipo de Vínculo",v:vinc[f.vinculo]||f.vinculo||"—"},
    {r:"Data de Admissão",v:f.admissao?fmtData(f.admissao):"—"},
    {r:"Secção",v:f.seccao||"N/A"},{r:"Escolaridade",v:f.escolaridade||"—"},
    {r:"E-mail de Acesso",v:_utilizador?.email||dados.email||"—",span2:true},
  ];
  document.getElementById("perfil-grelha").innerHTML=campos.map(c=>`<div class="perf-campo${c.span2?" span2":""}"><div class="rotulo">${c.r}</div><div class="valor">${c.v}</div></div>`).join("");
  // Carregar info da unidade do funcionário
  carregarMinhaUnidade(_funcDoc?.unidade || null);
  // Verificar se este funcionário é responsável por alguma unidade
  carregarUnidadeSobResponsabilidade(_funcDocId);

}


// ── A MINHA UNIDADE ─────────────────────────────────────
async function carregarMinhaUnidade(nomeUnidade){
  const card = document.getElementById('minha-unidade-card');
  if(!card) return;
  if(!nomeUnidade){
    card.innerHTML = '<div class="mu-sem-dados">Unidade de colocação não definida no seu registo.</div>';
    return;
  }

  try{
    // Pesquisar por nome na colecção unidades_sanitarias
    const snap = await getDocs(query(
      collection(db,'unidades_sanitarias'),
      where('nome','==', nomeUnidade)
    ));

    if(snap.empty){
      // Unidade sem ficha ainda — mostrar só o nome
      card.innerHTML = `
        <div class="mu-header">
          <div class="mu-header-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg></div>
          <div>
            <div class="mu-header-titulo">${nomeUnidade}</div>
            <div class="mu-header-tipo">A minha unidade</div>
          </div>
        </div>
        <div class="mu-body">
          <div class="mu-sem-dados">A ficha desta unidade ainda não foi preenchida.</div>
        </div>`;
      return;
    }

    const u = snap.docs[0].data();
    const tipoLabel = {
      dms:    'Direcção Municipal de Saúde',
      centro: 'Centro de Saúde',
      posto:  'Posto de Saúde',
      seccao: 'Secção da DMS'
    }[u.tipo] || u.tipo || '';

    // Responsável
    const respHTML = u.responsavel?.nome
      ? `<div class="mu-row">
          <span class="mu-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="8" r="4"/></svg></span>
          <div class="mu-row-info">
            <div class="mu-row-label">Responsável</div>
            <div class="mu-row-val"><strong>${u.responsavel.nome}</strong>${u.responsavel.cargo ? ' · ' + u.responsavel.cargo : ''}</div>
          </div>
        </div>` : '';

    // Contacto emergência
    const emergHTML = u.contactos?.emergencia
      ? `<div class="mu-row">
          <span class="mu-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></span>
          <div class="mu-row-info">
            <div class="mu-row-label">Emergência</div>
            <div class="mu-row-val">
              <a href="tel:${u.contactos.emergencia}" class="mu-contacto-btn" style="display:inline-flex;align-items:center;gap:4px">
                <svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.79 9.13 19.79 19.79 0 0 1 1.71.5A2 2 0 0 1 3.69.18l3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${u.contactos.emergencia}
              </a>
            </div>
          </div>
        </div>` : '';

    // Telefone geral
    const telHTML = u.contactos?.telefone
      ? `<div class="mu-row">
          <span class="mu-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.79 9.13 19.79 19.79 0 0 1 1.71.5A2 2 0 0 1 3.69.18l3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
          <div class="mu-row-info">
            <div class="mu-row-label">Telefone</div>
            <div class="mu-row-val">${u.contactos.telefone}</div>
          </div>
        </div>` : '';

    // Horário
    let horHTML = '';
    if(u.horario?.semana){
      horHTML = `<div class="mu-row">
        <span class="mu-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
        <div class="mu-row-info">
          <div class="mu-row-label">Horário de Funcionamento</div>
          <div class="mu-row-val">
            Seg–Sex: ${u.horario.semana}
            ${u.horario.sabado ? `<br>Sáb: ${u.horario.sabado}` : ''}
            ${u.horario.domingo ? `<br>Dom: ${u.horario.domingo}` : ''}
            ${u.horario.urgencia24h ? `<br><span class="mu-urgencia"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> Urgência 24h</span>` : ''}
          </div>
        </div>
      </div>`;
    }

    // Serviços
    let servHTML = '';
    if((u.servicos||[]).length){
      servHTML = `<div class="mu-row">
        <span class="mu-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
        <div class="mu-row-info">
          <div class="mu-row-label">Serviços Disponíveis</div>
          <div class="mu-servicos">
            ${u.servicos.map(s=>`<span class="mu-chip">${s}</span>`).join('')}
          </div>
        </div>
      </div>`;
    }

    card.innerHTML = `
      <div class="mu-header">
        <div class="mu-header-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg></div>
        <div>
          <div class="mu-header-titulo">${u.nome}</div>
          <div class="mu-header-tipo">${tipoLabel}</div>
        </div>
      </div>
      <div class="mu-body">
        ${respHTML}
        ${emergHTML}
        ${telHTML}
        ${horHTML}
        ${servHTML}
      </div>`;

  } catch(e){
    console.warn('Erro ao carregar unidade:', e);
    card.innerHTML = `
      <div class="mu-header">
        <div class="mu-header-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg></div>
        <div>
          <div class="mu-header-titulo">${nomeUnidade}</div>
          <div class="mu-header-tipo">A minha unidade</div>
        </div>
      </div>
      <div class="mu-body">
        <div class="mu-sem-dados">Não foi possível carregar os detalhes da unidade.</div>
      </div>`;
  }
}

// ── UNIDADE SOB RESPONSABILIDADE ────────────────────────
// Verifica se o utilizador autenticado é responsável por alguma
// unidade em unidades_sanitarias (via responsavel.funcionarioId).
// O card #resp-unidade-card está oculto por CSS; é revelado só quando
// há correspondência, para não confundir funcionários comuns.
async function carregarUnidadeSobResponsabilidade(funcDocId){
  const card = document.getElementById('resp-unidade-card');
  if(!card || !funcDocId) return;
  try{
    const snap = await getDocs(query(
      collection(db,'unidades_sanitarias'),
      where('responsavel.funcionarioId','==', funcDocId)
    ));
    if(snap.empty){ card.style.display='none'; return; }

    const u = snap.docs[0].data();
    const tipoLabel = {
      dms:    'Direcção Municipal de Saúde',
      centro: 'Centro de Saúde',
      posto:  'Posto de Saúde',
      seccao: 'Secção da DMS'
    }[u.tipo] || u.tipo || 'Unidade Sanitária';

    const cargo    = u.responsavel?.cargo || '';
    const dtInicio = u.responsavel?.dataInicio || '';

    // Contar funcionários cadastrados nesta unidade
    let numFunc = 0;
    try{
      const qf = query(collection(db,'funcionarios'), where('unidade','==', u.nome||''));
      const sf = await getDocs(qf);
      numFunc  = sf.size;
    }catch(_){}

    const esperado = u.efectivo?.esperado || 0;

    const cargoHTML = cargo ? `
      <div class="ru-row">
        <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg></span>
        <div class="ru-row-info">
          <div class="ru-row-label">Cargo exercido</div>
          <div class="ru-row-val">
            <span class="ru-badge-cargo"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg> ${cargo}</span>
            ${dtInicio ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">Em funções desde ${fmtData(dtInicio)}</div>` : ''}
          </div>
        </div>
      </div>` : '';

    const telHTML = u.contactos?.telefone ? `
      <div class="ru-row">
        <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.79 9.13 19.79 19.79 0 0 1 1.71.5A2 2 0 0 1 3.69.18l3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
        <div class="ru-row-info">
          <div class="ru-row-label">Contacto da unidade</div>
          <div class="ru-row-val">${u.contactos.telefone}</div>
        </div>
      </div>` : '';

    const localHTML = u.localizacao?.descricao ? `
      <div class="ru-row">
        <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <div class="ru-row-info">
          <div class="ru-row-label">Localização</div>
          <div class="ru-row-val">${u.localizacao.descricao}</div>
        </div>
      </div>` : '';

    const servHTML = (u.servicos||[]).length ? `
      <div class="ru-row">
        <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/></svg></span>
        <div class="ru-row-info">
          <div class="ru-row-label">Serviços disponíveis</div>
          <div class="ru-row-val" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px">
            ${u.servicos.map(s=>`<span class="mu-chip">${s}</span>`).join('')}
          </div>
        </div>
      </div>` : '';

    card.innerHTML = `
      <div class="ru-header">
        <div class="ru-header-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg></div>
        <div>
          <div class="ru-header-titulo">${u.nome}</div>
          <div class="ru-header-tipo">Sob a minha responsabilidade</div>
        </div>
      </div>
      <div class="ru-body">
        <div class="ru-row">
          <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg></span>
          <div class="ru-row-info">
            <div class="ru-row-label">Tipo de unidade</div>
            <div class="ru-row-val">${tipoLabel}</div>
          </div>
        </div>
        ${cargoHTML}
        <div class="ru-row">
          <span class="ru-row-icon"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <div class="ru-row-info">
            <div class="ru-row-label">Efectivo registado</div>
            <div class="ru-row-val">
              <div class="ru-kpi-wrap">
                <div class="ru-kpi">
                  <div class="ru-kpi-num">${numFunc}</div>
                  <div class="ru-kpi-lab">Cadastrados</div>
                </div>
                ${esperado ? `<div class="ru-kpi">
                  <div class="ru-kpi-num">${esperado}</div>
                  <div class="ru-kpi-lab">Esperados</div>
                </div>
                <div class="ru-kpi">
                  <div class="ru-kpi-num">${Math.round(numFunc/esperado*100)}%</div>
                  <div class="ru-kpi-lab">Cobertura</div>
                </div>` : ''}
              </div>
            </div>
          </div>
        </div>
        ${localHTML}
        ${telHTML}
        ${servHTML}
      </div>`;
    card.style.display = 'block';
  }catch(e){
    console.warn('Erro ao verificar responsabilidade de unidade:', e);
  }
}

// Converte Base64 em Blob e abre numa nova aba
function _abrirBase64(base64) {
  try {
    var parts  = base64.split(',');
    var mime   = parts[0].match(/:(.*?);/)[1];
    var binary = atob(parts[1]);
    var arr    = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    var blob   = new Blob([arr], { type: mime });
    var url    = URL.createObjectURL(blob);
    var win    = window.open(url, '_blank');
    if (win) setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  } catch(e) { notif('Erro ao abrir documento: ' + e.message, 'notif-erro'); }
}

async function _abrirDocSubcoleccao(funcDocId, tipo, nomeEl) {
  if (nomeEl) { var orig = nomeEl.innerHTML; nomeEl.innerHTML = '⏳ A carregar…'; }
  try {
    var snap = await getDoc(doc(db, 'funcionarios', funcDocId, 'ficheiros', tipo));
    if (!snap.exists()) { notif('Documento não encontrado.', 'notif-erro'); return; }
    _abrirBase64(snap.data().base64);
  } catch(e) {
    notif('Erro ao carregar documento: ' + e.message, 'notif-erro');
  } finally {
    if (nomeEl) nomeEl.innerHTML = orig;
  }
}
// Exposição no window — necessária para os onclick gerados dinamicamente em mostrarDocsCarregados
window._abrirBase64         = _abrirBase64;
window._abrirDocSubcoleccao = _abrirDocSubcoleccao;

function mostrarDocsCarregados(funcDoc){
  const zona=document.getElementById("zona-docs-carregados");if(!zona)return;
  const f=funcDoc||{};
  const lista=[];
  if(f.urlBI)   lista.push({ tipo:'bi',   local: f.urlBI==='local',   url: f.urlBI,   icone:'<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>', nome:'Bilhete de Identidade', sub:'Documento de identificação civil' });
  if(f.urlCert) lista.push({ tipo:'cert', local: f.urlCert==='local', url: f.urlCert, icone:'<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>', nome:'Certificado / Diploma',  sub:'Habilitações académicas' });
  if(lista.length===0){
    zona.innerHTML=`<div class="doc-fich-vazio">Ainda não carregou nenhum documento.<br><a href="formulario.html" style="color:var(--primary-d);font-weight:700">Preencha o formulário profissional</a> para carregar o seu BI e certificados.</div>`;
    return;
  }
  zona.innerHTML = lista.map(function(d) {
    if (d.local) {
      // Documento na sub-colecção — abre via fetch
      return `<div class="doc-fich" style="cursor:pointer" onclick="_abrirDocSubcoleccao('${_funcDocId}','${d.tipo}',this.querySelector('.doc-fich-nome'))">
        <div class="doc-fich-ic" style="background:var(--primary-xl)">${d.icone}</div>
        <div><div class="doc-fich-nome">${d.nome}</div><div class="doc-fich-sub">${d.sub}</div></div>
        <span style="margin-left:auto;color:var(--primary-l);font-size:16px">↗</span>
      </div>`;
    } else {
      // URL directa (Storage legado ou externo)
      return `<a href="${d.url}" target="_blank" class="doc-fich">
        <div class="doc-fich-ic" style="background:var(--primary-xl)">${d.icone}</div>
        <div><div class="doc-fich-nome">${d.nome}</div><div class="doc-fich-sub">${d.sub}</div></div>
        <span style="margin-left:auto;color:var(--primary-l);font-size:16px">↗</span>
      </a>`;
    }
  }).join('');
}

// ── FOTO DE PERFIL (Base64 → Firestore, sem Storage) ────────────────────
var _perfilFotoNovaBase64 = null;

function _comprimirFotoPerfil(file) {
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

window.previewFotoPerfil = function(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    notif('Foto demasiado grande. Máximo: 2MB.', 'notif-erro');
    input.value = ''; return;
  }
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    notif('Formato não suportado. Use JPG, PNG ou WEBP.', 'notif-erro');
    input.value = ''; return;
  }
  notif('⏳ A processar foto…', 'notif-ok');
  _comprimirFotoPerfil(file).then(function(base64) {
    _perfilFotoNovaBase64 = base64;
    // Actualizar todos os avatares visíveis na página (inclui card verde do Início no desktop)
    ['perf-avatar','pt-avatar','dt-avatar','ds-av','pcv-avatar'].forEach(function(id) {
      var av = document.getElementById(id); if (!av) return;
      var imgAnt = av.querySelector('img'); if (imgAnt) imgAnt.remove();
      av.textContent = '';
      var img = document.createElement('img');
      img.src = base64; img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      av.appendChild(img);
    });
    notif('Foto actualizada — clique em Guardar para registar.', 'notif-ok');
  }).catch(function(e) {
    notif('Erro ao processar a foto: ' + e.message, 'notif-erro');
  });
};
// ── FIM FOTO PERFIL ──────────────────────────────────────────────────────

window.guardarPerfil=async function(){
  if(!_funcDocId)return;
  const tel=document.getElementById("perf-telefone-edit").value.trim();
  if(tel&&!RE_TEL_AO.test(tel)){
    notif("Formato de telefone inválido.","notif-erro");
    validarTelefone();
    return;
  }
  const actualizacao = {actualizadoEm:serverTimestamp()};
  if(tel) actualizacao.telefone = tel;
  if(_perfilFotoNovaBase64) actualizacao.fotoUrl = _perfilFotoNovaBase64;
  try{
    await updateDoc(doc(db,"funcionarios",_funcDocId), actualizacao);
    if(_perfilFotoNovaBase64) _perfilFotoNovaBase64 = null;
    notif("Perfil actualizado!","notif-ok");
  }
  catch(e){notif("Erro ao guardar.","notif-erro");}
};

window.fazerLogoutFuncionario=async function(silencioso=false){
  if(!silencioso && !confirm("Tem a certeza que deseja sair?"))return;
  // Cancelar listeners em tempo real
  if (_unsubSols)  { _unsubSols();  _unsubSols  = null; }
  if (_unsubDocs)  { _unsubDocs();  _unsubDocs  = null; }
  if (_unsubSessao){ _unsubSessao(); _unsubSessao = null; }
  if (window.SIGDOC_SESSION?.parar) window.SIGDOC_SESSION.parar();
  // Apagar token de sessão no Firestore (não bloqueia o logout)
  if (_utilizador && _sessaoToken) {
    try { await updateDoc(doc(db,"utilizadores",_utilizador.uid),{sessaoToken:null}); } catch(_){}
  }
  await signOut(auth);
  if (window.SIGDOC_SESSION?.limparToken) window.SIGDOC_SESSION.limparToken();
  try { sessionStorage.removeItem("sigdoc_portal_session_token"); } catch(_) {}
  _funcDoc=null;_funcDocId=null;_utilizador=null;_tipoSel=null;_sessaoToken=null;
  mostrarEcra("ecra-entrada");
};

window.abrirAba=function(id,btn){
  document.querySelectorAll(".aba-portal").forEach(a=>a.classList.remove("activa"));
  document.querySelectorAll(".portal-nav-btn").forEach(b=>b.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
  if(btn)btn.classList.add("activa");
};

function fmtData(str){if(!str)return"—";const[a,m,d]=str.split("-");const ms=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];return`${d} de ${ms[parseInt(m)-1]} de ${a}`;}

// ── Sistema de notificações com fila — evita que toasts rápidos se cancelem mutuamente ──
let _notifFila = [], _notifTimer = null, _notifActivo = false;

function _notifDespachar() {
  if (_notifActivo || _notifFila.length === 0) return;
  const { msg, cls } = _notifFila.shift();
  const el = document.getElementById('notif');
  if (!el) return;
  _notifActivo = true;
  el.textContent = msg;
  el.className = 'notif ' + cls;
  el.style.display = 'block';
  if (_notifTimer) clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => {
    el.style.display = 'none';
    _notifActivo = false;
    _notifTimer = null;
    // Pequeno intervalo entre mensagens consecutivas para legibilidade
    if (_notifFila.length > 0) setTimeout(_notifDespachar, 160);
  }, 3200);
}

function notif(msg, cls) {
  _notifFila.push({ msg, cls });
  _notifDespachar();
}
window.mostrarNotif = notif;

// ── Navegação (mobile bottom-nav + desktop sidebar) ──
window.navegarAba = function(abaId) {
  document.querySelectorAll(".aba-portal").forEach(a => a.classList.remove("activa"));
  const aba = document.getElementById(abaId);
  if (aba) aba.classList.add("activa");
  // mobile bottom-nav
  const mapaM = { "aba-docs":"bn-inicio", "aba-meus-docs":"bn-docs", "aba-solicitar":"bn-pedir", "aba-secretaria":"bn-secretaria", "aba-perfil":"bn-perfil" };
  document.querySelectorAll(".bn-btn").forEach(b => b.classList.remove("activo"));
  const mid = mapaM[abaId];
  if (mid) document.getElementById(mid)?.classList.add("activo");
  // desktop sidebar
  const mapaD = { "aba-docs":"dsn-inicio", "aba-meus-docs":"dsn-docs", "aba-solicitar":"dsn-pedir", "aba-secretaria":"dsn-secretaria", "aba-perfil":"dsn-perfil" };
  document.querySelectorAll(".ds-nav-btn").forEach(b => b.classList.remove("activo"));
  const did = mapaD[abaId];
  if (did) document.getElementById(did)?.classList.add("activo");
  // carregar secretaria ao entrar na aba
  if (abaId === "aba-secretaria") carregarPedidosPortal();
  // Scroll para o topo — em mobile o container scrollável é window; em desktop é .portal-abas-content
  const main = document.querySelector(".portal-abas-content");
  if (main && main.scrollHeight > main.clientHeight && getComputedStyle(main).overflowY !== 'visible') {
    main.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
window.abrirAba = function(id) { navegarAba(id); };

// ══════════════════════════════════════════════════════════
//  SECRETARIA — portal do funcionário
// ══════════════════════════════════════════════════════════

const LABELS_PEDIDO = {
  novo:       'Novo',
  em_analise: 'Em análise',
  respondido: 'Respondido',
  fechado:    'Fechado'
};
const LABELS_REUNIAO_P = {
  pendente:   'Pendente',
  confirmada: 'Confirmada',
  recusada:   'Recusada',
  remarcada:  'Remarcada',
  realizada:  'Realizada'
};
const ASSUNTOS_LABEL = {
  'ferias-licencas':'Férias e Licenças','abonos-salarios':'Abonos e Salários',
  'documentacao':'Documentação Pessoal','transferencias':'Transferências',
  'escalas':'Escalas de Serviço','outro':'Outro'
};
const DEST_LABEL = {
  'director':   'Director Municipal de Saúde',
  'chefe-sperh':'Chefe de Planeamento, Estatística e RH',
  'chefe-sp':   'Chefe de Saúde Pública',
  'chefe-is':   'Chefe de Inspecção Sanitária',
  'chefe-lhm':  'Chefe de Logística Hospitalar e Medicamentos'
};

window.trocarSubtabSec = function(tipo, btn) {
  // Remover .activo de todos, aplicar ao clicado
  document.querySelectorAll('.subtab-sec').forEach(b => b.classList.remove('activo'));
  if (btn) btn.classList.add('activo');
  document.getElementById('sec-painel-pedidos').style.display = tipo === 'pedidos' ? '' : 'none';
  document.getElementById('sec-painel-reuniao').style.display = tipo === 'reuniao' ? '' : 'none';
  if (tipo === 'pedidos') carregarPedidosPortal();
  if (tipo === 'reuniao') carregarReunioesPortal();
};

async function carregarPedidosPortal() {
  if (!_utilizador) return;
  const el = document.getElementById('sec-lista-pedidos');
  if (!el) return;
  try {
    const snap = await getDocs(query(
      collection(db,'pedidos_secretaria'),
      where('funcionarioUid','==',_utilizador.uid)
    ));
    if (snap.empty) {
      el.innerHTML = '<div class="secretaria-empty">Ainda não tem mensagens com a secretaria. Use o formulário abaixo para iniciar a primeira conversa.</div>';
      return;
    }
    const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b) =>
        (b.ultimaMensagemEm?.toDate?.()?.getTime() || b.criadoEm?.toDate?.()?.getTime() || 0) -
        (a.ultimaMensagemEm?.toDate?.()?.getTime() || a.criadoEm?.toDate?.()?.getTime() || 0)
      );

    el.innerHTML = docs.map(p => {
      const assunto  = ASSUNTOS_LABEL[p.assunto] || p.assunto || '—';
      const aberto   = p.estado !== 'fechado';
      const msgs     = p.mensagens || [];
      const ultima   = msgs[msgs.length - 1];
      // Preview: última mensagem ou campo legacy
      const previewTxt = ultima
        ? ultima.texto.substring(0,70) + (ultima.texto.length > 70 ? '…' : '')
        : (p.respostaTexto
            ? p.respostaTexto.substring(0,70)
            : (p.mensagem || '').substring(0,70));
      const previewAutor = ultima
        ? (ultima.autor === 'funcionario' ? 'Você: ' : 'Secretaria: ')
        : (p.respostaTexto ? 'Secretaria: ' : 'Você: ');
      const hora = (p.ultimaMensagemEm || p.criadoEm)?.toDate
        ? (p.ultimaMensagemEm || p.criadoEm).toDate()
            .toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})
        : '';
      const data = (p.ultimaMensagemEm || p.criadoEm)?.toDate
        ? (p.ultimaMensagemEm || p.criadoEm).toDate()
            .toLocaleDateString('pt-AO',{day:'2-digit',month:'short'})
        : '';
      const novas = p.naoLidasFuncionario || 0;
      const assuntoSeguro = escapeHtml(assunto);
      const previewSeguro = escapeHtml(`${previewAutor}${previewTxt}`);

      return `<div class="pedido-chat-item${novas>0 ? ' tem-nova' : ''}" onclick="abrirChatPortal('${p.id}')">
        <div class="pedido-chat-topo">
          <div>
            <div class="pedido-chat-assunto">${assuntoSeguro}</div>
            <div class="pedido-chat-preview">${previewSeguro}</div>
          </div>
          <div class="pedido-chat-hora">${escapeHtml(hora)}</div>
        </div>
        <div class="pedido-chat-rodape">
          <div class="pedido-chat-meta">
            <span class="pedido-chat-badge">${escapeHtml(LABELS_PEDIDO[p.estado] || p.estado || 'Conversa')}</span>
            <span class="pedido-chat-estado ${aberto ? 'aberto' : 'fechado'}">${aberto ? 'Aberta' : 'Encerrada'}</span>
            <span class="pedido-chat-data">${escapeHtml(data)}</span>
          </div>
          ${novas > 0
            ? `<span class="pedido-chat-nova-badge">${novas} nova${novas>1?'s':''}</span>`
            : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error(e);
    el.innerHTML = '<div class="secretaria-empty">Não foi possível carregar as mensagens neste momento. Tente novamente dentro de instantes.</div>';
  }
}


async function carregarReunioesPortal() {
  if (!_utilizador) return;
  const el = document.getElementById('sec-lista-reunioes');
  if (!el) return;
  try {
    const snap = await getDocs(query(collection(db,'reunioes'), where('funcionarioUid','==',_utilizador.uid)));
    if (snap.empty) {
      el.innerHTML = '<div class="secretaria-empty">Ainda não tem pedidos de reunião. Quando enviar o primeiro, o acompanhamento ficará disponível aqui.</div>';
      return;
    }
    const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.criadoEm?.toDate?.()?.getTime()||0)-(a.criadoEm?.toDate?.()?.getTime()||0));
    el.innerHTML = docs.map(r => {
      const dest = DEST_LABEL[r.destinatario]||r.destinatario||'—';
      const data = r.criadoEm?.toDate ? r.criadoEm.toDate().toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric'}) : '—';
      const badge = LABELS_REUNIAO_P[r.estado]||r.estado;
      const extra = r.estado==='confirmada' && r.dataSugerida
        ? `<div class="reuniao-extra ok">Data sugerida: ${escapeHtml(new Date(r.dataSugerida).toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}))} · ${escapeHtml(r.local||'—')}</div>` : '';
      const motivo = r.estado==='recusada' && r.motivoRecusa
        ? `<div class="reuniao-extra warn">Motivo da recusa: ${escapeHtml(r.motivoRecusa)}</div>` : '';
      return `<div class="reuniao-item">
        <div class="reuniao-topo">
          <div class="reuniao-titulo">${escapeHtml(dest)}</div>
          <span class="reuniao-badge">${escapeHtml(badge)}</span>
        </div>
        <div class="reuniao-meta">Pedido enviado em ${escapeHtml(data)}</div>
        <div class="reuniao-assunto">${escapeHtml((r.assunto||'').substring(0,100))}</div>
        ${extra}${motivo}
      </div>`;
    }).join('');
  } catch(e) {
    console.error(e);
    el.innerHTML = '<div class="secretaria-empty">Não foi possível carregar os pedidos de reunião neste momento. Tente novamente dentro de instantes.</div>';
  }
}

// ─── CHAT DE PEDIDOS ─────────────────────────────────────
let _chatPedidoId   = null;
let _unsubChat      = null;
let _chatPedidoData = null;


window.abrirChatPortal = async function(pedidoId) {
  _chatPedidoId = pedidoId;
  if (_unsubChat) _unsubChat();
  const overlay = document.getElementById('chat-overlay');
  const msgsEl  = document.getElementById('chat-msgs');
  // Resetar textarea e focar para escrita imediata
  const chatInput = document.getElementById('chat-input');
  if (chatInput) { chatInput.value = ''; chatInput.style.height = '42px'; }
  overlay.classList.add('aberto');
  msgsEl.innerHTML = '<div class="chat-vazio">⏳ A carregar…</div>';
  // Focar com pequeno delay para animação de abertura completar
  setTimeout(() => { if (chatInput) chatInput.focus(); }, 320);
  // Subscrever em tempo real
  _unsubChat = onSnapshot(doc(db,'pedidos_secretaria',pedidoId), snap => {
    if (!snap.exists()) return;
    const p = snap.data();
    _chatPedidoData = p;
    const assunto = ASSUNTOS_LABEL[p.assunto]||p.assunto||'—';
    document.getElementById('chat-titulo').textContent = assunto;
    const aberto = p.estado !== 'fechado';
    const bar = document.getElementById('chat-estado-bar');
    if (bar) {
      bar.textContent = aberto ? '● Conversa aberta' : '○ Encerrada — envie mensagem para reabrir';
      bar.className = 'chat-estado-bar ' + (aberto ? 'aberto' : 'fechado');
    }
    // Funcionário pode sempre enviar (encerrada é só para secretaria)
    // inputRow sempre visível — reabrir ao enviar

     // Mostrar mensagens — campos legacy + array novo
    const msgs = [];
    if (p.mensagem) {
      const jaEsta = (p.mensagens||[]).some(m => m.texto === p.mensagem && m.autor === 'funcionario');
      if (!jaEsta) msgs.push({ texto:p.mensagem, autor:'funcionario', nomeAutor:p.funcionarioNome||'Funcionário', em:p.criadoEm?.toDate?.()?.toISOString()||null });
    }
    if (p.respostaTexto) {
      const jaEsta = (p.mensagens||[]).some(m => m.texto === p.respostaTexto && m.autor === 'secretaria');
      if (!jaEsta) msgs.push({ texto:p.respostaTexto, autor:'secretaria', nomeAutor:'Secretaria', em:p.respondidoEm?.toDate?.()?.toISOString()||null });
    }
    (p.mensagens||[]).forEach(m => msgs.push(m));
    msgs.sort((a,b) => (a.em||'') <= (b.em||'') ? -1 : 1);
    if (msgs.length===0) { msgsEl.innerHTML='<div class="chat-vazio">Sem mensagens ainda.</div>'; return; }
    const lido = (p.naoLidasSecretaria||0) === 0;
    let lastData2 = '';
    msgsEl.innerHTML = msgs.map((m,i) => {
      const isFunc = m.autor==='funcionario';
      const dt   = m.em ? new Date(m.em) : null;
      const hora = dt ? dt.toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'}) : '';
      const dataStr = dt ? dt.toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric'}) : '';
      let dataSep = '';
      if (dataStr && dataStr !== lastData2) { lastData2 = dataStr; dataSep = `<div class="chat-data-sep"><span>${dataStr}</span></div>`; }
      const idxsFunc = msgs.map((mm,ii)=>mm.autor==='funcionario'?ii:-1).filter(ii=>ii>=0);
      const isUltimaFunc = isFunc && i === idxsFunc[idxsFunc.length-1];
      const visto = isUltimaFunc
        ? `<i class="chat-visto ${lido?'lido':'enviado'}">${lido?'<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20 6 9 17l-5-5"/></svg><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20 6 9 17l-5-5"/></svg>':'<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M20 6 9 17l-5-5"/></svg>'}</i>`
        : '';
      const initials = isFunc
        ? (_funcDoc?.nome||_utilizador?.email||'V').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
        : 'S';
      return `${dataSep}<div class="chat-msg-row ${isFunc?'enviada':'recebida'}">
        <div class="chat-msg-av ${isFunc?'func':'sec'}">${initials}</div>
        <div class="chat-balao">
          ${m.texto}
          <div class="chat-balao-meta">
            <span class="chat-hora">${hora}</span>
            ${visto}
          </div>
        </div>
      </div>`;
    }).join('');
    // Scroll para o fundo
    setTimeout(()=>{ msgsEl.scrollTop = msgsEl.scrollHeight; },50);
    // Marcar como lidas
    if ((p.naoLidasFuncionario||0) > 0) {
      updateDoc(doc(db,'pedidos_secretaria',pedidoId),{naoLidasFuncionario:0}).catch(()=>{});
    }
  }, err => { console.error('Chat:',err); msgsEl.innerHTML='<div class="chat-vazio"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg> Erro ao carregar.</div>'; });
};

window.fecharChatPortal = function() {
  document.getElementById('chat-overlay').classList.remove('aberto');
  if (_unsubChat) { _unsubChat(); _unsubChat=null; }
  _chatPedidoId = null;
  carregarPedidosPortal();
};

window.enviarMensagemChatPortal = async function() {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (!texto || !_chatPedidoId) return;
  const btn = document.getElementById('btn-chat-enviar');
  btn.disabled = true;
  input.value = '';
  input.style.height = '42px'; // reset altura após envio
  try {
    const ref  = doc(db,'pedidos_secretaria',_chatPedidoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('doc não existe');
    const p    = snap.data();
    const agora = new Date().toISOString();
    const nome  = _funcDoc?.nome || _utilizador?.email || 'Funcionário';

    // Construir array completo (inclui campos legacy)
    const arr = [];
    if (p.mensagem) {
      const dup = (p.mensagens||[]).some(x => x.texto===p.mensagem && x.autor==='funcionario');
      if (!dup) arr.push({ texto:p.mensagem, autor:'funcionario', nomeAutor:p.funcionarioNome||nome, em:p.criadoEm?.toDate?.()?.toISOString()||agora });
    }
    if (p.respostaTexto) {
      const dup = (p.mensagens||[]).some(x => x.texto===p.respostaTexto && x.autor==='secretaria');
      if (!dup) arr.push({ texto:p.respostaTexto, autor:'secretaria', nomeAutor:'Secretaria', em:p.respondidoEm?.toDate?.()?.toISOString()||agora });
    }
    (p.mensagens||[]).forEach(x => arr.push(x));
    arr.push({ texto, autor:'funcionario', nomeAutor:nome, em:agora });

    await updateDoc(ref, {
      mensagens:          arr,
      estado:             'novo',
      ultimaMensagem:     texto.substring(0,80),
      ultimaMensagemEm:   serverTimestamp(),
      naoLidasSecretaria: (p.naoLidasSecretaria||0) + 1,
      naoLidasFuncionario: 0
    });
  } catch(e) { console.error('enviar erro:', e); input.value = texto; }
  btn.disabled = false;
};

/* ── Helpers de validação inline – Secretaria ── */
window._secSetErro = function(fieldId, errId) {
  const f = document.getElementById(fieldId);
  const e = errId ? document.getElementById(errId) : null;
  if (f) f.classList.add('campo-erro');
  if (e) e.style.display = 'block';
};
window._secLimparErro = function(fieldId, errId) {
  const f = document.getElementById(fieldId);
  const e = errId ? document.getElementById(errId) : null;
  if (f) f.classList.remove('campo-erro');
  if (e) e.style.display = 'none';
};
function _secFeedback(elId, tipo, texto) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!texto) { el.innerHTML = ''; return; }
  const cls = tipo === 'ok'
    ? 'alerta alerta-sucesso'
    : 'alerta alerta-erro';
  el.innerHTML = `<div class="${cls}" style="margin:8px 0 0">${texto}</div>`;
}

window.enviarPedidoPortal = async function() {
  const assunto  = document.getElementById('sec-assunto').value;
  const mensagem = document.getElementById('sec-mensagem').value.trim();
  const btn      = document.getElementById('btn-enviar-pedido');

  // Validação inline com design system
  let valido = true;
  if (!assunto)  { _secSetErro('sec-assunto',  'err-sec-assunto');  valido = false; }
  if (!mensagem) { _secSetErro('sec-mensagem', 'err-sec-mensagem'); valido = false; }
  if (!valido) return;

  btn.disabled = true; btn.textContent = 'A enviar…';
  try {
    const novoId = await addDoc(collection(db,'pedidos_secretaria'), {
      funcionarioUid:    _utilizador.uid,
      funcionarioNome:   _funcDoc?.nome || _utilizador.email,
      funcionarioNumero: _funcDoc?.numero || '',
      unidade:           _funcDoc?.unidade || '',
      assunto,
      mensagens: [{texto:mensagem, autor:'funcionario', nomeAutor:_funcDoc?.nome||_utilizador.email, em:new Date().toISOString()}],
      estado:            'novo',
      ultimaMensagem:    mensagem.substring(0,80),
      ultimaMensagemEm:  serverTimestamp(),
      criadoEm:          serverTimestamp(),
      naoLidasSecretaria: 1,
      naoLidasFuncionario: 0
    });
    document.getElementById('sec-assunto').value = '';
    document.getElementById('sec-mensagem').value = '';
    document.getElementById('sec-contador').textContent = '0';
    btn.disabled = false; btn.textContent = 'Enviar mensagem';
    _secFeedback('sec-msg-pedido', '', '');
    // Abrir o chat directamente
    setTimeout(()=>abrirChatPortal(novoId.id), 300);
  } catch(e) {
    console.error(e);
    _secFeedback('sec-msg-pedido', 'erro', 'Erro ao enviar. Tente novamente.');
    btn.disabled = false; btn.textContent = 'Enviar mensagem';
  }
};

window.enviarPedidoReuniaoPortal = async function() {
  const dest    = document.getElementById('sec-reuniao-dest').value;
  const assunto = document.getElementById('sec-reuniao-assunto').value.trim();
  const data    = document.getElementById('sec-reuniao-data').value;
  const periodo = document.getElementById('sec-reuniao-periodo').value;
  const btn     = document.getElementById('btn-enviar-reuniao');

  // Validação inline com design system
  let valido = true;
  if (!dest)    { _secSetErro('sec-reuniao-dest',    'err-sec-reuniao-dest');    valido = false; }
  if (!assunto) { _secSetErro('sec-reuniao-assunto', 'err-sec-reuniao-assunto'); valido = false; }
  if (!data) {
    _secSetErro('sec-reuniao-data', 'err-sec-reuniao-data');
    valido = false;
  } else if (new Date(data) < new Date()) {
    const errEl = document.getElementById('err-sec-reuniao-data');
    if (errEl) { errEl.textContent = 'A data não pode ser no passado.'; errEl.style.display = 'block'; }
    document.getElementById('sec-reuniao-data').classList.add('campo-erro');
    valido = false;
  }
  if (!valido) return;

  btn.disabled = true; btn.textContent = 'A enviar…';
  const DEST_NOMES = {
    'director':   'Director Municipal de Saúde',
    'chefe-sperh':'Chefe da Secção de Planeamento, Estatística e RH',
    'chefe-sp':   'Chefe da Secção de Saúde Pública',
    'chefe-is':   'Chefe da Secção de Inspecção Sanitária',
    'chefe-lhm':  'Chefe da Secção de Logística Hospitalar e Medicamentos'
  };
  try {
    await addDoc(collection(db,'reunioes'), {
      funcionarioUid:    _utilizador.uid,
      funcionarioNome:   _funcDoc?.nome || _utilizador.email,
      funcionarioNumero: _funcDoc?.numero || '',
      unidade:           _funcDoc?.unidade || '',
      destinatario:      dest,
      destinatarioNome:  DEST_NOMES[dest]||dest,
      assunto, dataPreferida: data, periodo,
      estado:            'pendente',
      criadoEm:          serverTimestamp(),
      actualizadoEm:     serverTimestamp(),
      geridoPor:         null,
      dataSugerida:      null,
      local:             '',
      motivoRecusa:      '',
      observacoes:       ''
    });
    _secFeedback('sec-msg-reuniao', 'ok', 'Pedido de reunião enviado com sucesso.');
    document.getElementById('sec-reuniao-dest').value = '';
    document.getElementById('sec-reuniao-assunto').value = '';
    document.getElementById('sec-reuniao-data').value = '';
    btn.disabled = false; btn.textContent = 'Enviar pedido';
    setTimeout(() => { carregarReunioesPortal(); }, 1500);
  } catch(e) {
    console.error(e);
    _secFeedback('sec-msg-reuniao', 'erro', 'Erro ao enviar.');
    btn.disabled = false; btn.textContent = 'Enviar pedido';
  }
};


async function iniciarSessaoActiva(user) {
  // Gerar token único para esta sessão
  _sessaoToken = crypto.randomUUID ? crypto.randomUUID()
               : (Math.random().toString(36)+Date.now().toString(36)).slice(2,18);
  try { sessionStorage.setItem("sigdoc_portal_session_token", _sessaoToken); } catch(_) {}

  // Escrever token no documento do utilizador
  try {
    await updateDoc(doc(db,"utilizadores",user.uid), {
      sessaoToken:  _sessaoToken,
      ultimoAcesso: serverTimestamp(),
      dispositivo:  navigator.userAgent.slice(0,120)
    });
  } catch(e) { console.warn("Não foi possível registar sessão activa:", e); return; }

  // Ouvir o documento em tempo real
  _unsubSessao = onSnapshot(
    doc(db,"utilizadores",user.uid),
    (snap) => {
      if (!snap.exists()) { _forcarLogout("conta removida"); return; }
      const d = snap.data();
      // Conta desactivada pelo admin
      if (d.activo === false) { _forcarLogout("conta desactivada"); return; }
      // Token anulado ou substituído pelo admin (expulsão remota)
      if (!d.sessaoToken) return;
      if (d.sessaoToken !== _sessaoToken) { _forcarLogout("sessao_expirada"); return; }
    },
    (err) => { console.warn("Listener sessão:", err); }
  );
}

function _forcarLogout(motivo) {
  if (_unsubSessao) { _unsubSessao(); _unsubSessao = null; }
  if (_unsubSols)   { _unsubSols();   _unsubSols   = null; }
  if (_unsubDocs)   { _unsubDocs();   _unsubDocs   = null; }
  if (window.SIGDOC_SESSION?.parar) window.SIGDOC_SESSION.parar();
  _sessaoToken = null;
  try { sessionStorage.removeItem("sigdoc_portal_session_token"); } catch(_) {}
  signOut(auth).catch(()=>{});
  if (window.SIGDOC_SESSION?.limparToken) window.SIGDOC_SESSION.limparToken();
  _funcDoc=null; _funcDocId=null; _utilizador=null; _tipoSel=null;
  // Mostrar mensagem adequada
  const msgs = {
    "conta desactivada": "A sua conta foi desactivada. Contacte o administrador.",
    "sessao_expirada":   "A sua sessão foi encerrada remotamente pelo administrador.",
    "conta removida":    "A sua conta foi removida do sistema."
  };
  const msg = msgs[motivo] || "A sua sessão foi encerrada.";
  mostrarEcra("ecra-entrada");
  // Injectar alerta no ecrã de entrada
  setTimeout(() => {
    const zona = document.querySelector("#ecra-entrada .entrada-dir");
    if (zona) {
      const alerta = document.createElement("div");
      alerta.className = "alerta alerta-" + (motivo === "sessao_expirada" ? "aviso" : "erro");
      alerta.style.cssText = "margin-bottom:16px;max-width:360px;width:100%";
      alerta.textContent = msg;
      zona.insertBefore(alerta, zona.firstChild);
      setTimeout(() => alerta.remove(), 10000);
    }
  }, 200);
}

// ══════════════════════════════════════════════════════════════
//  SINO DE NOTIFICAÇÕES — tempo real (pedidos + reuniões)
// ══════════════════════════════════════════════════════════════

let _unsubSinoPedidos  = null;
let _unsubSinoReunioes = null;
let _notifCache = [];
let _notifLidas = new Set();

const ESTADOS_NOTIF_PEDIDO  = ['respondido'];
const ESTADOS_NOTIF_REUNIAO = ['confirmada','recusada','remarcada'];

window.iniciarSinoPortal = function(uid) {
  // Cancelar listeners anteriores
  if (_unsubSinoPedidos)  { _unsubSinoPedidos();  _unsubSinoPedidos  = null; }
  if (_unsubSinoReunioes) { _unsubSinoReunioes(); _unsubSinoReunioes = null; }

  // Listener único na collection 'notificacoes' filtrado pelo UID
  _unsubSinoPedidos = onSnapshot(
    query(
      collection(db, 'notificacoes'),
      where('destinatarioUid', '==', uid),
      orderBy('criadaEm', 'desc')
    ),
    snap => {
      _notifCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderizarSino();
    },
    err => console.warn('Sino notificacoes:', err)
  );
};

function renderizarSino() {
  const naoLidas = _notifCache.filter(n => !n.lida);
  const total    = naoLidas.length;

  // Badge nos dois botões (mobile header + desktop topbar)
  ['ph-sino-badge','dt-sino-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = total > 9 ? '9+' : String(total);
    el.classList.toggle('visivel', total > 0);
  });

  const body = document.getElementById('sino-drop-body');
  if (!body) return;

  if (_notifCache.length === 0) {
    body.innerHTML =
      '<div class="sino-vazio">' +
        '<div class="sino-vazio-ic"><svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>' +
        '<div class="sino-vazio-txt">Sem notificações</div>' +
      '</div>';
    return;
  }

  // Mapas de ícone e classe por tipo
  const IC = {
    doc_aprovado:         { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>', cls: 'conf'   },
    doc_rejeitado:        { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>', cls: 'recus'  },
    doc_gerado:           { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>', cls: 'resp'   },
    reuniao_confirmada:   { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>', cls: 'conf'   },
    reuniao_recusada:     { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>', cls: 'recus'  },
    mensagem_secretaria:  { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>', cls: 'resp'   },
    sistema:              { ic: 'ℹ️', cls: 'remarc' },
  };

  body.innerHTML = _notifCache.map(n => {
    const lida    = !!n.lida;
    const icObj   = IC[n.tipo] || { ic: '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>', cls: '' };
    const data    = n.criadaEm?.toDate?.() || null;
    const dataStr = data
      ? data.toLocaleDateString('pt-AO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
      : '';

    return (
      '<div class="sino-notif-item' + (lida ? '' : ' nova') + '" onclick="clicarNotif(\'' + n.id + '\')">' +
        '<div class="sino-notif-ic ' + icObj.cls + '">' + icObj.ic + '</div>' +
        '<div class="sino-notif-texto">' +
          '<div class="sino-notif-titulo">' + (n.titulo || '—') + '</div>' +
          '<div class="sino-notif-sub">'   + (n.corpo  || '')  + '</div>' +
          (dataStr ? '<div class="sino-notif-data">' + dataStr + '</div>' : '') +
        '</div>' +
        (lida ? '' : '<div class="sino-notif-ponto"></div>') +
      '</div>'
    );
  }).join('');
}


window.abrirSinoPortal = function(){
  document.getElementById('sino-drop').classList.add('aberto');
  document.getElementById('sino-overlay').classList.add('visivel');
};
window.fecharSinoPortal = function(){
  document.getElementById('sino-drop').classList.remove('aberto');
  document.getElementById('sino-overlay').classList.remove('visivel');
};
window.clicarNotif = async function(notifId) {
  // Marcar como lida no Firestore
  try {
    await updateDoc(doc(db,'notificacoes',notifId), { lida: true });
  } catch(e) { console.warn('Marcar lida:', e); }
  fecharSinoPortal();
  // Navegar conforme o tipo da notificação
  const n = _notifCache.find(x => x.id === notifId);
  if (!n) return;
  if (n.tipo === 'mensagem_secretaria') {
    navegarAba('aba-secretaria');
    setTimeout(() => {
      const btn = document.getElementById('subtab-pedidos');
      if (btn) trocarSubtabSec('pedidos', btn);
    }, 120);
  } else if (n.tipo === 'reuniao_confirmada' || n.tipo === 'reuniao_recusada') {
    navegarAba('aba-secretaria');
    setTimeout(() => {
      const btn = document.getElementById('subtab-reuniao');
      if (btn) trocarSubtabSec('reuniao', btn);
    }, 120);
  } else if (['doc_aprovado','doc_rejeitado','doc_gerado','sistema'].includes(n.tipo)) {
    navegarAba('aba-docs');
    const docId = n.extra?.docId || n.extra?.documentoId || null;
    const podeAbrir = ['doc_aprovado','doc_gerado'].includes(n.tipo) && docId;
    if (podeAbrir) {
      setTimeout(async () => {
        const abriu = await abrirVisualizacaoPortalPorDocId(docId);
        if (!abriu) notif('Documento localizado, mas ainda não foi possível abrir a visualização.', 'notif-info');
      }, 180);
    }
  }
};

window.marcarTodasLidas = async function() {
  const naoLidas = _notifCache.filter(n => !n.lida);
  await Promise.all(
    naoLidas.map(n =>
      updateDoc(doc(db,'notificacoes',n.id), { lida: true })
        .catch(e => console.warn('marcarLida:', e))
    )
  );
  // O onSnapshot actualiza automaticamente o cache e re-renderiza
};



