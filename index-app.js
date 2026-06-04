// SIGDOC-SUMBE · index-app.js
// Gerado em separação monolítico v1.0
// type="module" — importado por index.html via <script type="module" src="index-app.js">

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut,
         createUserWithEmailAndPassword, onAuthStateChanged,
         setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc,
         updateDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = window.SIGDOC_CONFIG.config;

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(console.warn);

const etiquetasPerfil = {
  admin:"Administrador do Sistema", director:"Director Municipal",
  chefe:"Chefe de Secção", tecnico:"Técnico de RH",
  chefe_unidade:"Chefe de Unidade",
  secretaria:"Secretaria", funcionario:"Funcionário de Unidade"
};

let utilizadorActual = null, perfilActual = null;
let _chefeUnidadeActual = null;
let _carregamentoChefiaSeq = 0;

function normalizarPerfilDocLocal(doc) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.normalizarPerfilDoc(doc)
    : (typeof doc === "string"
        ? { perfil: doc, perfilPrincipal: doc, roles: [doc], perfilBase: doc }
        : (doc || {}));
}

function criarPerfilUtilizadorLocal(dados) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.criarPerfilUtilizador(dados)
    : (dados || {});
}

function payloadPerfilLocal(dados) {
  const perfil = criarPerfilUtilizadorLocal(dados);
  return {
    perfil: perfil.perfil,
    perfilBase: perfil.perfilBase,
    roles: perfil.roles
  };
}

function obterRolesPerfilLocal(doc) {
  return normalizarPerfilDocLocal(doc).roles || [];
}

function obterPerfilPrincipalLocal(doc) {
  const perfil = normalizarPerfilDocLocal(doc);
  return perfil.perfilPrincipal || perfil.perfil || "funcionario";
}

function temAlgumRoleLocal(doc, perfisPermitidos) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.temAlgumRole(doc, perfisPermitidos)
    : [].concat(perfisPermitidos || []).includes(obterPerfilPrincipalLocal(doc));
}

function precisaMigracaoPerfilLocal(doc) {
  return window.SIGDOC_AUTHZ ? window.SIGDOC_AUTHZ.precisaMigracao(doc) : false;
}

function obterEtiquetaPerfilPrincipalLocal(doc) {
  return window.SIGDOC_AUTHZ
    ? window.SIGDOC_AUTHZ.obterEtiquetaPrincipal(doc, etiquetasPerfil)
    : (etiquetasPerfil[obterPerfilPrincipalLocal(doc)] || obterPerfilPrincipalLocal(doc));
}

function badgesRolesHtml(doc) {
  return obterRolesPerfilLocal(doc)
    .map(role => `<span class="badge-perfil perfil-${role}">${etiquetasPerfil[role] || role}</span>`)
    .join(" ");
}

// Guarda de perfil para funções administrativas expostas no window
function _exigirPerfil(perfisPermitidos) {
  if (!utilizadorActual || !perfilActual) return false;
  return temAlgumRoleLocal(perfilActual, perfisPermitidos);
}

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}

function textoNormalizado(valor) {
  return String(valor || "").trim().toLowerCase();
}

function obterEtiquetaPerfilVisual(d) {
  const perfil = normalizarPerfilDocLocal(d);
  if ((obterPerfilPrincipalLocal(perfil) === "funcionario" || obterPerfilPrincipalLocal(perfil) === "chefe_unidade") && _chefeUnidadeActual) {
    return "Chefe de Unidade";
  }
  return obterEtiquetaPerfilPrincipalLocal(perfil);
}

function obterTextoUnidadeVisual(d) {
  return _chefeUnidadeActual?.unidade?.nome || d?.unidade || d?.seccao || "—";
}

function actualizarCabecalhoPainel(u, d) {
  const lblPerfil = obterEtiquetaPerfilVisual(d);
  const perfilEl = document.getElementById("perfil-utilizador-topo");
  if (perfilEl) perfilEl.textContent = lblPerfil;

  const sub = document.getElementById("dash-subtitulo");
  if (sub && lblPerfil) {
    if (_chefeUnidadeActual?.unidade?.nome) sub.textContent = `${lblPerfil} · ${_chefeUnidadeActual.unidade.nome}`;
    else sub.textContent = `${lblPerfil} · Direcção Municipal da Saúde do Sumbe`;
  }

  // Chip de perfil visual — aparece junto ao nome para perfis não-admin
  const roles = Array.isArray(d?.roles) ? d.roles : [d?.perfil].filter(Boolean);
  const p = d?.perfil || "";
  const chipCores = {
    tecnico:     { bg:"#dbeafe", txt:"#1241a1", brd:"#1241a1" },
    chefe:       { bg:"#dcfce7", txt:"#166534", brd:"#166534" },
    director:    { bg:"#fef9c3", txt:"#713f12", brd:"#ca8a04" },
    secretaria:  { bg:"#f5f3ff", txt:"#5b21b6", brd:"#7c3aed" },
    chefe_unidade:{ bg:"#ccfbf1", txt:"#0f766e", brd:"#0d9488" },
  };
  let chipEl = document.getElementById("dash-perfil-chip");
  if (!chipEl) {
    const hdr = document.getElementById("msg-boas-vindas");
    if (hdr) {
      chipEl = document.createElement("span");
      chipEl.id = "dash-perfil-chip";
      chipEl.className = "dash-perfil-chip";
      hdr.parentNode.insertBefore(chipEl, hdr.nextSibling);
    }
  }
  if (chipEl) {
    const cor = chipCores[p];
    if (cor && p !== "admin") {
      chipEl.textContent = lblPerfil;
      chipEl.style.cssText = `
        display:inline-flex;align-items:center;
        font-size:11px;font-weight:700;letter-spacing:.02em;
        background:${cor.bg};color:${cor.txt};
        border:1px solid ${cor.brd};
        padding:3px 10px;border-radius:20px;margin-top:4px;
      `;
    } else {
      chipEl.style.display = "none";
    }
  }
}

function pertenceAUnidade(funcionario, unidade) {
  if (!funcionario || !unidade) return false;
  const funcUnidadeId = String(funcionario.unidadeId || "").trim();
  const unidadeId = String(unidade.id || "").trim();
  if (funcUnidadeId && unidadeId && funcUnidadeId === unidadeId) return true;
  return textoNormalizado(funcionario.unidade) === textoNormalizado(unidade.nome);
}

function limparPainelChefeUnidade() {
  _chefeUnidadeActual = null;
  const wrap = document.getElementById("painel-chefe-unidade");
  const lista = document.getElementById("chefia-lista-funcionarios");
  const total = document.getElementById("chefia-total-func");
  const badge = document.getElementById("chefia-lista-badge");
  const nome = document.getElementById("chefia-unidade-nome");
  const meta = document.getElementById("chefia-unidade-meta");
  const painelDefault = document.getElementById("painel-funcionario-default");

  if (wrap) wrap.style.display = "none";
  if (painelDefault) painelDefault.style.display = "";
  if (total) total.textContent = "0";
  if (badge) badge.textContent = "0 colaboradores";
  if (nome) nome.textContent = "—";
  if (meta) meta.textContent = "Sem unidade sob responsabilidade identificada.";
  if (lista) {
    lista.innerHTML = `<div class="vazio-estado" style="padding:32px 18px"><div class="icone" style="color:var(--pri)">ðŸ“„</div><p style="color:var(--txt-2)">Nenhuma equipa carregada.</p></div>`;
  }
}

async function resolverFuncionarioAssociado(u, d) {
  const funcionarioId = d?.funcionarioId || "";
  if (funcionarioId) {
    try {
      const snapFunc = await getDoc(doc(db, "funcionarios", funcionarioId));
      if (snapFunc.exists()) return { id: snapFunc.id, ...snapFunc.data() };
    } catch(e) { console.warn("Funcionario associado:", e); }
  }

  try {
    const snapPorUid = await getDocs(query(collection(db, "funcionarios"), where("portalUid", "==", u.uid), limit(1)));
    if (!snapPorUid.empty) return { id: snapPorUid.docs[0].id, ...snapPorUid.docs[0].data() };
  } catch(e) { console.warn("Funcionario por portalUid:", e); }

  return null;
}

async function carregarPainelChefeUnidade(u, d) {
  limparPainelChefeUnidade();
  const reqId = ++_carregamentoChefiaSeq;
  if (!temAlgumRoleLocal(d, ["funcionario", "chefe_unidade"])) return false;

  const func = await resolverFuncionarioAssociado(u, d);
  if (!func || reqId !== _carregamentoChefiaSeq) return false;

  let unidadeSnap;
  try {
    unidadeSnap = await getDocs(query(
      collection(db, "unidades_sanitarias"),
      where("responsavel.funcionarioId", "==", func.id),
      limit(1)
    ));
  } catch(e) {
    console.warn("Chefia de unidade:", e);
    return false;
  }
  if (reqId !== _carregamentoChefiaSeq || unidadeSnap.empty) return false;

  const unidadeDoc = unidadeSnap.docs[0];
  const unidade = { id: unidadeDoc.id, ...unidadeDoc.data() };

  let equipa = [];
  try {
    const snapFuncs = await getDocs(collection(db, "funcionarios"));
    equipa = snapFuncs.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .filter(f => pertenceAUnidade(f, unidade))
      .sort((a, b) => String(a.nomeCompleto || a.nome || "").localeCompare(String(b.nomeCompleto || b.nome || ""), "pt"));
  } catch(e) {
    console.warn("Funcionarios da unidade:", e);
    return false;
  }
  if (reqId !== _carregamentoChefiaSeq) return false;

  _chefeUnidadeActual = { funcionario: func, unidade, equipa };

  const wrap = document.getElementById("painel-chefe-unidade");
  const painelDefault = document.getElementById("painel-funcionario-default");
  const nomeEl = document.getElementById("chefia-unidade-nome");
  const metaEl = document.getElementById("chefia-unidade-meta");
  const totalEl = document.getElementById("chefia-total-func");
  const badgeEl = document.getElementById("chefia-lista-badge");
  const listaEl = document.getElementById("chefia-lista-funcionarios");

  if (wrap) wrap.style.display = "block";
  if (painelDefault) painelDefault.style.display = "none";
  if (nomeEl) {
    const nomeTexto = unidade.nome || "Unidade sem nome";
    if (unidade.id) {
      nomeEl.innerHTML = `<a href="ficha-unidade.html?id=${encodeURIComponent(unidade.id)}"
        style="color:inherit;text-decoration:none;border-bottom:1.5px solid rgba(255,255,255,.35);padding-bottom:1px;transition:border-color .15s"
        onmouseover="this.style.borderColor='rgba(255,255,255,.8)'"
        onmouseout="this.style.borderColor='rgba(255,255,255,.35)'"
        title="Ver ficha da unidade">${nomeTexto}</a>`;
    } else {
      nomeEl.textContent = nomeTexto;
    }
  }
  if (metaEl) {
    const cargo = unidade.responsavel?.cargo ? ` · ${unidade.responsavel.cargo}` : "";
    metaEl.textContent = `Identificado a partir do responsavel da unidade${cargo}.`;
  }
  if (totalEl) totalEl.textContent = String(equipa.length);
  if (badgeEl) badgeEl.textContent = `${equipa.length} ${equipa.length === 1 ? "colaborador" : "colaboradores"}`;
  if (listaEl) {
    if (!equipa.length) {
      listaEl.innerHTML = `<div class="chefia-vazio">
        <div class="chefia-vazio-ic">👥</div>
        <div class="chefia-vazio-txt">Nenhum funcionário encontrado</div>
        <div class="chefia-vazio-sub">Nenhum funcionário desta unidade foi encontrado no cadastro.</div>
      </div>`;
    } else {
      let htmlGrupos = "";
      let letraActual = "";
      equipa.forEach(f => {
        const nome   = escaparHtml(f.nomeCompleto || f.nome || "Funcionário sem nome");
        const cargo  = escaparHtml(f.categoria || f.cargo || "Sem categoria definida");
        const numero = escaparHtml(f.numero || f.numeroBeneficiario || "");
        const inic   = String(f.nomeCompleto || f.nome || "?").trim().charAt(0).toUpperCase() || "?";
        const letra  = inic.match(/[A-ZÀ-Ü]/) ? inic : "#";
        if (letra !== letraActual) {
          letraActual = letra;
          htmlGrupos += `<div class="chefia-grupo-letra">${letraActual}</div>`;
        }
        htmlGrupos += `<div class="chefia-item">
          <div class="chefia-item-av">${escaparHtml(inic)}</div>
          <div class="chefia-item-info">
            <div class="chefia-item-nome">${nome}</div>
            <div class="chefia-item-meta">${cargo}</div>
          </div>
          <div class="chefia-item-num">${numero ? "Nº " + numero : "—"}</div>
        </div>`;
      });
      listaEl.innerHTML = htmlGrupos;
    }
  }

  actualizarCabecalhoPainel(u, d);
  return true;
}


const _SVG_OLHO_ABERTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const _SVG_OLHO_FECHADO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

window.toggleSenha = function() {
  const i   = document.getElementById("senha-login");
  const btn = document.querySelector(".toggle-senha");
  const mostrar = i.type === "password";
  i.type = mostrar ? "text" : "password";
  if (btn) btn.innerHTML = mostrar ? _SVG_OLHO_FECHADO : _SVG_OLHO_ABERTO;
};

onAuthStateChanged(auth, async u => {
  if (u) { utilizadorActual = u; await carregarPerfil(u); }
  else    { mostrarLogin(); }
  // Esconder loading DEPOIS do conteúdo estar pronto, sem animação
  const loading = document.getElementById("ecrã-loading");
  if (loading) loading.style.display = "none";
});

window.fazerLogin = async function() {
  const email = document.getElementById("email-login").value.trim();
  const senha = document.getElementById("senha-login").value;
  const btn   = document.getElementById("btn-entrar");
  const err   = document.getElementById("msg-erro");
  if (!email || !senha) { mostrarErro("Preencha o e-mail e a senha."); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> A entrar...';
  err.style.display = "none";
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch(e) {
    btn.disabled = false; btn.innerHTML = "Entrar no Sistema →";
    const m = { "auth/user-not-found":"E-mail ou senha incorrectos.",
                "auth/wrong-password":"E-mail ou senha incorrectos.",
                "auth/invalid-credential":"E-mail ou senha incorrectos.",
                "auth/too-many-requests":"Muitas tentativas. Aguarde.",
                "auth/network-request-failed":"Sem ligação à Internet." };
    mostrarErro(m[e.code] || "Erro ao entrar. Verifique as credenciais.");
  }
};

document.getElementById("senha-login").addEventListener("keydown", e => { if(e.key==="Enter") window.fazerLogin(); });
document.getElementById("email-login").addEventListener("keydown", e => { if(e.key==="Enter") document.getElementById("senha-login").focus(); });

window.fazerLogout = function() {
  mostrarNotif(
    "Tem a certeza que deseja sair do sistema?",
    "aviso",
    {
      label: "Sair agora →",
      timeout: 7000,
      fn: async () => {
        if (utilizadorActual && perfilActual)
          await registarSessao(utilizadorActual, perfilActual, "saída");
        SIGDOC_SESSION.parar();
        SIGDOC_SESSION.limparToken();
        await signOut(auth);
      }
    }
  );
};

async function carregarPerfil(u) {
  try {
    const snap = await getDoc(doc(db, "utilizadores", u.uid));
    if (snap.exists()) {
      const dadosBrutos = snap.data();
      const d = normalizarPerfilDocLocal(dadosBrutos);
      perfilActual = d;
      if (precisaMigracaoPerfilLocal(dadosBrutos)) {
        try {
          await updateDoc(doc(db, "utilizadores", u.uid), payloadPerfilLocal(d));
        } catch(eMig) { console.warn("Migracao de roles:", eMig); }
      }
      await registarSessao(u, d, "entrada");
      // ── Gestão de sessão concorrente ──
      const _sToken = SIGDOC_SESSION.gerarEPersistirToken();
      await SIGDOC_SESSION.registarLogin(db, u.uid, _sToken, { updateDoc, doc, serverTimestamp });
      await mostrarPainel(u, d);
    } else {
      const d = {
        nome: u.email.split("@")[0],
        email: u.email,
        unidade:"Direcção Municipal",
        activo:true,
        criadoEm: serverTimestamp(),
        ultimoAcesso: serverTimestamp(),
        ...payloadPerfilLocal({ roles:["admin"] })
      };
      await setDoc(doc(db,"utilizadores",u.uid), d);
      perfilActual = d;
      await registarSessao(u, d, "entrada");
      // ── Gestão de sessão concorrente ──
      const _sToken = SIGDOC_SESSION.gerarEPersistirToken();
      await SIGDOC_SESSION.registarLogin(db, u.uid, _sToken, { updateDoc, doc, serverTimestamp });
      await mostrarPainel(u, d);
      mostrarNotif("✅ Conta de administrador criada automaticamente!");
    }
  } catch(e) { console.error("carregarPerfil:",e); mostrarLogin(); setTimeout(()=>mostrarErro("Erro ao carregar perfil. As regras de acesso podem não estar actualizadas. Contacte o administrador."),100); }
}

// Navegação entre secções do dashboard
window.mostrarSecção = function(id) {
  const secções = ["dashboard","utilizadores","sessoes","secretaria"];
  secções.forEach(s => {
    const el = document.getElementById("secção-" + s);
    if(el) el.style.display = s === id ? "block" : "none";
  });
  const titulos = { dashboard:"Dashboard", utilizadores:"Gestão de Utilizadores", sessoes:"Acessos Recentes", secretaria:"Secretaria" };
  const tt = document.getElementById("topbar-titulo");
  if(tt) tt.textContent = titulos[id] || "Dashboard";
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("activo"));
  if(id === "secretaria") {
    carregarPedidosSecretaria();
    // Se o chat inline estava aberto por outro item, fechar ao navegar para a secretaria de novo
    const overlay = document.getElementById('chat-sec-overlay');
    if (overlay && overlay.classList.contains('aberto') && window.innerWidth > 768) {
      // não fechar automaticamente — manter contexto se a secretária só refrescou
    }
  }
};

window.filtrarSecretaria = function(tipo, btn) {
  document.querySelectorAll('.btn-filtro-sec').forEach(b => b.classList.remove('activo'));
  if (btn) btn.classList.add('activo');
  document.getElementById('painel-pedidos-sec').style.display  = tipo === 'pedidos'  ? '' : 'none';
  document.getElementById('painel-reunioes-sec').style.display = tipo === 'reunioes' ? '' : 'none';
  // Ao mudar de aba, fechar o chat inline para evitar contexto errado no painel direito
  const overlay = document.getElementById('chat-sec-overlay');
  if (overlay && overlay.classList.contains('aberto') && window.innerWidth > 768) {
    fecharChatSecretaria();
  }
  if (tipo === 'pedidos')  carregarPedidosSecretaria();
  if (tipo === 'reunioes') carregarReunioesSecretaria();
};

async function mostrarPainel(u, d) {
  const perfilDoc = normalizarPerfilDocLocal(d);
  const p = perfilDoc.perfil;
  const roles = perfilDoc.roles || [];
  document.getElementById("ecrã-login").style.display = "none";
  document.getElementById("ecrã-painel").style.display = "flex";
  const _avatarInic = (perfilDoc.nome||u.email)[0].toUpperCase();
  document.getElementById("avatar-utilizador").textContent = _avatarInic;
  document.getElementById("avatar-sb").textContent = _avatarInic;
  document.getElementById("nome-utilizador-topo").textContent = perfilDoc.nome || u.email;
  limparPainelChefeUnidade();
  (()=>{
    const h=new Date().getHours();
    const s=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
    const n=(perfilDoc.nome||"Utilizador").split(" ")[0];
    const el=document.getElementById("msg-boas-vindas");
    if(el) el.textContent=`${s}, ${n}`;
    // Subtítulo com perfil
    const sub=document.getElementById("dash-subtitulo");
    const etq=obterEtiquetaPerfilPrincipalLocal(perfilDoc);
    if(sub && etq) sub.textContent=`${etq} · Direcção Municipal da Saúde do Sumbe`;
  })();
  actualizarCabecalhoPainel(u, perfilDoc);
  actualizarDataHora(); setInterval(actualizarDataHora, 60000);

  // Mostrar/ocultar secções conforme perfil
  if (p==="admin") {
    carregarUtilizadores(); carregarSessoes(); carregarSessoesActivas(); carregarIndicadores();
  } else if (p==="chefe"||p==="director") {
    carregarSessoes(); carregarIndicadores();
  } else if (p==="tecnico") {
    carregarIndicadores(); // sessoes: só gestão tem acesso
    // Esconder secção Acessos Recentes — tecnico não tem permissão na colecção sessoes
    const secSessoes = document.getElementById("secção-sessoes-mini");
    const secSessoesWrap = secSessoes?.closest(".sessoes-rodape-secção");
    if (secSessoes)     secSessoes.style.display = "none";
    if (secSessoesWrap) secSessoesWrap.style.display = "none";
  } else if (p==="secretaria") {
    // ── M1 fix: Secretaria vê imediatamente a sua fila de trabalho ──
    // Ocultar KPIs de sistema (métricas de admin sem relevância operacional)
    const kpiGrid = document.getElementById("indicadores");
    if (kpiGrid) kpiGrid.style.display = "none";
    // Ocultar grelha de módulos (módulos de admin não acessíveis)
    const menuMods = document.getElementById("menu-modulos");
    if (menuMods) menuMods.style.display = "none";
    // Ocultar card de sessões recentes
    const secSessoes2 = document.getElementById("secção-sessoes-mini");
    const secSessoesWrap2 = secSessoes2?.closest(".sessoes-rodape-secção");
    if (secSessoes2)     secSessoes2.style.display = "none";
    if (secSessoesWrap2) secSessoesWrap2.style.display = "none";
    // Mostrar o dashboard específico da secretaria
    const dashSec = document.getElementById("dash-home-secretaria");
    if (dashSec) dashSec.style.display = "block";
    // Arrancar os watchers (já inicializados em baixo) —
    // eles vão popular os KPIs e a fila via actualizarDashHomeSecretaria()
  } else {
    // funcionário
    // ── M1 fix: Funcionário sem chefia vê o portal em destaque ──
    const kpiGridF = document.getElementById("indicadores");
    if (kpiGridF) kpiGridF.style.display = "none";
    const menuModsF = document.getElementById("menu-modulos");
    if (menuModsF) menuModsF.style.display = "none";
    const secSessoesF = document.getElementById("secção-sessoes-mini");
    const secSessoesWrapF = secSessoesF?.closest(".sessoes-rodape-secção");
    if (secSessoesF)     secSessoesF.style.display = "none";
    if (secSessoesWrapF) secSessoesWrapF.style.display = "none";
    // O painel de chefia (chefe_unidade) usa secção-funcionario.
    // O funcionário simples usa dash-home-funcionario.
    document.getElementById("secção-funcionario").style.display="block";
    const ehChefeUnidade = await carregarPainelChefeUnidade(u, perfilDoc);
    if (!ehChefeUnidade) {
      // Não é chefe de unidade: mostrar CTA do portal em destaque
      const dashFunc = document.getElementById("dash-home-funcionario");
      if (dashFunc) dashFunc.style.display = "block";
      // Manter painel-funcionario-default oculto (substituído pelo hero)
      const pfDefault = document.getElementById("painel-funcionario-default");
      if (pfDefault) pfDefault.style.display = "none";
    }
  }

  const IC = {
    user:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    fileText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    search:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    barChart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
    checkCircle:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
    mail:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
    smartphone:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  };
  // ── Acções Rápidas — filtradas por perfil ──
  const ACCOES_POR_PERFIL = {
    admin:    [
      { href:"cadastro.html",   ic:IC.user,      txt:"Novo Funcionário",  sub:"Adicionar ao sistema"     },
      { href:"documentos.html", ic:IC.fileText,  txt:"Gerar Documento",   sub:"Modelos pré-definidos"    },
      { href:"auditoria.html",  ic:IC.search,    txt:"Auditoria",         sub:"Rastreio de actividade"   },
      { href:"painel.html",     ic:IC.barChart,  txt:"Painel RH",         sub:"Indicadores de gestão"    },
    ],
    chefe:    [
      { href:"cadastro.html",   ic:IC.user,      txt:"Novo Funcionário",  sub:"Adicionar ao sistema"     },
      { href:"documentos.html", ic:IC.fileText,  txt:"Gerar Documento",   sub:"Modelos pré-definidos"    },
      { href:"auditoria.html",  ic:IC.search,    txt:"Auditoria",         sub:"Rastreio de actividade"   },
    ],
    tecnico:  [
      { href:"cadastro.html",   ic:IC.user,       txt:"Novo Funcionário", sub:"Adicionar ao sistema"     },
      { href:"documentos.html", ic:IC.fileText,   txt:"Gerar Documento",  sub:"Modelos pré-definidos"    },
      { href:"aprovacao.html",  ic:IC.checkCircle,txt:"Solicitações",     sub:"Aprovar pendentes"        },
      { onclick:"mostrarSecção('secretaria')", ic:IC.mail, txt:"Secretaria", sub:"Gestão de expediente"  },
    ],
    secretaria: [
      { href:"index.html#secretaria", ic:IC.mail,     txt:"Pedidos"   },
      { href:"index.html#reunioes",   ic:IC.calendar, txt:"Reuniões"  },
    ],
    director: [
      { href:"auditoria.html",  ic:IC.search,   txt:"Auditoria"        },
      { href:"painel.html",     ic:IC.barChart, txt:"Painel RH"        },
    ],
    chefe_unidade: [
      { href:"documentos.html", ic:IC.fileText,  txt:"Documentos"      },
      { href:"ferias.html",     ic:IC.calendar,  txt:"Férias/Ausências" },
      { href:"portal.html",     ic:IC.smartphone, txt:"Portal"         },
    ],
  };
  const grid = document.getElementById("quick-actions-grid");
  if (grid) {
    const accoes = roles.reduce((lista, role) => {
      (ACCOES_POR_PERFIL[role] || []).forEach(accao => {
        const chave = accao.href || accao.onclick || accao.txt;
        if (!lista.some(item => (item.href || item.onclick || item.txt) === chave)) lista.push(accao);
      });
      return lista;
    }, []);
    grid.innerHTML = accoes.map(a => {
      const dest  = a.href ? `href="${a.href}"` : `href="#"`;
      const click = a.onclick ? `onclick="${a.onclick};return false;"` : "";
      return `<a ${dest} ${click} class="qa-btn">
        <div class="qa-ic-wrap"><span class="qa-ic">${a.ic}</span></div>
        <div class="qa-txt-wrap">
          <span class="qa-txt">${a.txt}</span>
          ${a.sub ? `<span class="qa-sub">${a.sub}</span>` : ''}
        </div>
      </a>`;
    }).join("");
  }

  // Mostrar/ocultar itens da sidebar conforme perfil
  const acessoSidebar = {
    admin:       ["mod-cadastro","mod-documentos","mod-auditoria","mod-painel","mod-portal","mod-utilizadores-card","mod-secretaria"],
    chefe:       ["mod-cadastro","mod-documentos","mod-auditoria","mod-portal"],
    tecnico:     ["mod-cadastro","mod-documentos","mod-aprovacao","mod-secretaria","mod-portal","mod-utilizadores-card"],
    secretaria:  ["mod-secretaria"],
    director:    ["mod-auditoria","mod-painel"],
    funcionario: []
  };
  const vis = [...new Set(roles.flatMap(role => acessoSidebar[role] || []))];
  ["mod-cadastro","mod-documentos","mod-aprovacao","mod-auditoria","mod-painel","mod-portal","mod-utilizadores-card","mod-secretaria"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = vis.includes(id) ? "" : "none";
  });
  // Ocultar section labels se nenhum item do grupo estiver visível
  const principalVis = ["mod-cadastro","mod-documentos","mod-aprovacao","mod-secretaria"].some(id => vis.includes(id));
  const gestaoVis    = ["mod-auditoria","mod-painel","mod-portal","mod-utilizadores-card"].some(id => vis.includes(id));
  const lp = document.getElementById("label-principal");
  const lg = document.getElementById("label-gestao");
  if(lp) lp.style.display = principalVis ? "" : "none";
  if(lg) lg.style.display = gestaoVis    ? "" : "none";

  // Controlar os cards do dashboard com a mesma matriz —
  // cada card tem id = sidebar_id + "-card"
  // O admin vê tudo, os outros só os seus módulos
  const acessoCards = {
    admin:       ["mod-cadastro-card","mod-documentos-card","mod-auditoria-card","mod-painel-card","mod-secretaria-card","mod-unidades-card","mod-estatisticas-card","mod-relatorios-card","mod-ferias-card"],
    chefe:       ["mod-cadastro-card","mod-documentos-card","mod-auditoria-card","mod-unidades-card","mod-estatisticas-card","mod-relatorios-card","mod-ferias-card"],
    tecnico:     ["mod-cadastro-card","mod-documentos-card","mod-aprovacao-card","mod-secretaria-card","mod-unidades-card","mod-estatisticas-card","mod-relatorios-card","mod-ferias-card"],
    secretaria:  ["mod-secretaria-card","mod-unidades-card"],
    director:    ["mod-auditoria-card","mod-painel-card","mod-unidades-card","mod-estatisticas-card","mod-relatorios-card","mod-ferias-card"],
    funcionario: []
  };
  const visCards = [...new Set(roles.flatMap(role => acessoCards[role] || []))];
  ["mod-cadastro-card","mod-documentos-card","mod-aprovacao-card","mod-auditoria-card","mod-painel-card","mod-secretaria-card","mod-unidades-card","mod-estatisticas-card","mod-relatorios-card","mod-ferias-card"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = visCards.includes(id) ? "" : "none";
  });

  // C9 fix: "+ Novo Registo" restrito a admin — único perfil que cria utilizadores
  const _btnNovo = document.getElementById("topbar-btn-new");
  if (_btnNovo) _btnNovo.style.display = roles.includes("admin") ? "" : "none";

  // Grelha de módulos em 4 colunas para técnico (8 cards → 2 linhas em vez de 4)
  const modulosGrid = document.querySelector(".modulos-grid");
  if (modulosGrid) {
    if (p === "tecnico") modulosGrid.classList.add("modulos-grid-4col");
    else modulosGrid.classList.remove("modulos-grid-4col");
  }

  // Activar notificações em tempo real conforme perfil
  if (["admin","chefe","director"].includes(p)) {
    iniciarWatcherPendentes();
  } else if (p === "tecnico") {
    iniciarWatcherTecnico();
  } else if (p === "secretaria") {
    iniciarWatcherSecretaria();
  } else {
    // Esconder sino para perfis sem acesso
    const sino = document.getElementById("sino-btn");
    if (sino) sino.style.display = "none";
  }

  // ── Vigiar sessão concorrente ──
  SIGDOC_SESSION.vigiar(db, u.uid, auth, { onSnapshot, doc, signOut });
}

// ── NOTIFICAÇÕES EM TEMPO REAL ──
let _unsubPendentes = null;

let _unsubFormsRH = null;
let _docsRHPend = [], _formsRHPend = [];

function iniciarWatcherPendentes() {
  if (_unsubPendentes) _unsubPendentes();
  if (_unsubFormsRH)   _unsubFormsRH();

  // Watcher 1 — documentos pendentes de aprovação
  const q = query(collection(db, "documentos"), where("estado", "==", "pendente"));
  _unsubPendentes = onSnapshot(q, snap => {
    _docsRHPend = snap.docs.map(d => ({ id: d.id, ...d.data(), _categoria: "doc" }));
    actualizarSino();
  }, err => { console.error("Watcher documentos:", err); });

  // Watcher 2 — formulários submetidos por funcionários mas não revistos
  const qF = query(collection(db, "funcionarios"), where("formularioPendente", "==", true));
  _unsubFormsRH = onSnapshot(qF, snap => {
    _formsRHPend = snap.docs.map(d => ({ id: d.id, ...d.data(), _categoria: "form" }));
    actualizarSino();
  }, err => { console.error("Watcher formulários:", err); });
}

// ── WATCHER TÉCNICO — solicitações novas ──
let _unsubSolsNovas = null;
let _solsNovas = [];
// Histórico de IDs já anunciados via toast (persiste durante a sessão)
const _notifJaAnunciadas = new Set();

function iniciarWatcherTecnico() {
  if (_unsubSolsNovas) _unsubSolsNovas();
  // IMPORTANTE: sem orderBy para evitar índice composto no Firestore
  const q = query(collection(db, "solicitacoes"), where("estado", "==", "nova"));
  _unsubSolsNovas = onSnapshot(q, snap => {
    _solsNovas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    actualizarSinoTecnico();
  }, err => { console.error("Watcher solicitações técnico:", err); });
}

function actualizarSinoTecnico() {
  const total    = _solsNovas.length;
  const lista    = document.getElementById("notif-drop-lista");

  actualizarBadgeSino(total, 0); // solicitações novas = todas urgentes

  if (window.SIGDOC_NAV) SIGDOC_NAV.setBadges({ aprovacoes: total });

  if (!lista) return;

  const items = _solsNovas.map(s => {
    const tipo = s.tipo || s.tipoDocumento || "Solicitação";
    const func = s.funcionarioNome || s.funcionarioEmail || "—";
    const hora = s.criadaEm?.toDate
      ? s.criadaEm.toDate().toLocaleDateString("pt-AO", { day:"2-digit", month:"short" })
      : "—";
    return {
      id:       s.id,
      tipo:     "urgente",
      icon:     "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg>",
      icClasse: "notif-ic-sol",
      titulo:   func,
      sub:      tipo + " · " + hora,
      href:     "aprovacao.html",
      ts:       s.criadaEm || null,
    };
  });

  lista.innerHTML = _renderNotifAgrupada(items);

  // Mostrar toast contextual para novas solicitações (apenas 1ª vez que aparece cada uma)
  _solsNovas.forEach(s => {
    if (!_notifJaAnunciadas.has(s.id)) {
      _notifJaAnunciadas.add(s.id);
      const func = s.funcionarioNome || "Funcionário";
      const tipo = s.tipo || "Solicitação";
      mostrarNotif(
        `${func} submeteu: ${tipo}`,
        "aviso",
        { label: "Ver agora →", fn: () => { window.location.href = "aprovacao.html"; } }
      );
    }
  });
} // fim actualizarSinoTecnico

function actualizarSino() {
  const totalDocs  = _docsRHPend.length;
  const totalForms = _formsRHPend.length;

  // Docs pendentes = urgente; forms = informativo
  actualizarBadgeSino(totalDocs, totalForms);

  // Badge sidebar — só documentos para aprovação
  if (window.SIGDOC_NAV) SIGDOC_NAV.setBadges({ aprovacoes: totalDocs });

  const lista = document.getElementById("notif-drop-lista");
  if (!lista) return;

  const items = [];

  _docsRHPend.forEach(d => {
    const tipo = d.tipo || d.tipoDocumento || "Documento";
    const func = d.funcionarioNome || d.geradoPorEmail || "—";
    items.push({
      id:       d.id,
      tipo:     "urgente",
      icon:     "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg>",
      icClasse: "notif-ic-pend",
      titulo:   func,
      sub:      tipo,
      href:     "aprovacao.html",
      ts:       d.geradoEm || null,
    });
  });

  _formsRHPend.forEach(f => {
    items.push({
      id:       f.id,
      tipo:     "info",
      icon:     "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg>",
      icClasse: "notif-ic-sol",
      titulo:   f.nome || "—",
      sub:      "Formulário submetido",
      href:     "cadastro.html",
      ts:       f.formularioPreenchidoEm || null,
    });
  });

  lista.innerHTML = _renderNotifAgrupada(items);
}

window.toggleDropdownNotif = function(e) {
  e.stopPropagation();
  document.getElementById("notif-dropdown").classList.toggle("aberto");
};

// Fechar dropdown ao clicar fora
document.addEventListener("click", () => {
  const dd = document.getElementById("notif-dropdown");
  if (dd) dd.classList.remove("aberto");
});

// ── Badge dual SVG: atualiza os dois arcos (urgente+info) ──────
function actualizarBadgeSino(nUrgente, nInfo) {
  const svg    = document.getElementById("sino-badge-svg");
  const arcU   = document.getElementById("sino-arco-urgente");
  const arcI   = document.getElementById("sino-arco-info");
  const numEl  = document.getElementById("sino-badge-num");
  const dot    = document.getElementById("notif-dot");
  const total  = nUrgente + nInfo;

  if (total === 0) {
    if (svg) svg.classList.remove("visivel");
    if (dot) dot.classList.remove("visivel");
    return;
  }

  if (svg) svg.classList.add("visivel");
  if (dot) { if (nUrgente > 0) dot.classList.add("visivel"); else dot.classList.remove("visivel"); }

  // Circunferência do círculo r=8 → C = 2π×8 ≈ 50.27
  const C = 50.27;
  const dashU = C * (nUrgente / total);
  const dashI = C * (nInfo    / total);

  if (arcU) {
    arcU.setAttribute("stroke-dasharray",  `${dashU} ${C - dashU}`);
    arcU.setAttribute("stroke-dashoffset", "0");
    arcU.style.opacity = nUrgente > 0 ? "1" : "0";
  }
  if (arcI) {
    arcI.setAttribute("stroke-dasharray",  `${dashI} ${C - dashI}`);
    // Offset: deslocar o início do arco azul para logo após o laranja
    arcI.setAttribute("stroke-dashoffset", `${-dashU}`);
    arcI.style.opacity = nInfo > 0 ? "1" : "0";
  }
  if (numEl) numEl.textContent = total > 99 ? "99" : String(total);
  // C13 fix: sincronizar badges mobile de forma reactiva (sem polling)
  sincronizarBadgesMobile();
}

// ── Dispensar notificação individual ───────────────────────────
// Guarda IDs dispensados em memória (reset ao recarregar — comportamento intencional)
const _notifDispensadas = new Set();

window.dispensarNotif = function(e, id) {
  e.stopPropagation();
  e.preventDefault();
  _notifDispensadas.add(id);
  // Remover o item do DOM com micro-animação
  const item = e.target.closest(".notif-item");
  if (item) {
    item.style.transition = "opacity .18s, transform .18s, max-height .22s";
    item.style.opacity    = "0";
    item.style.transform  = "translateX(12px)";
    item.style.maxHeight  = item.offsetHeight + "px";
    setTimeout(() => {
      item.style.maxHeight  = "0";
      item.style.padding    = "0";
      item.style.borderWidth = "0";
    }, 170);
    setTimeout(() => {
      item.remove();
      // Limpar labels de secção sem filhos
      document.querySelectorAll(".notif-secao-temporal, .notif-secao-tipo").forEach(lbl => {
        // Verificar se tem itens irmãos após ele
        let next = lbl.nextElementSibling;
        if (!next || next.classList.contains("notif-secao-temporal") || next.classList.contains("notif-secao-tipo")) {
          lbl.remove();
        }
      });
    }, 400);
  }
};

// Dispensar todas (marcar todas como lidas)
window.dispensarTodasNotif = function(e) {
  e.preventDefault();
  const lista = document.getElementById("notif-drop-lista");
  if (!lista) return;
  lista.querySelectorAll(".notif-item[data-notif-id]").forEach(el => {
    _notifDispensadas.add(el.dataset.notifId);
  });
  lista.innerHTML = '<div class="notif-drop-vazio">✅ Todas as notificações lidas</div>';
  actualizarBadgeSino(0, 0);
  document.getElementById("notif-dot")?.classList.remove("visivel");
};

// ── Classificar timestamp numa categoria temporal ──────────────
function _categoriaTemporalNotif(ts) {
  if (!ts?.toDate) return "antigas";
  const d     = ts.toDate();
  const agora = new Date();
  const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const semana = new Date(hoje); semana.setDate(hoje.getDate() - 6);
  if (d >= hoje)   return "hoje";
  if (d >= semana) return "semana";
  return "antigas";
}

// ── Construir HTML agrupado (tipo + tempo) ─────────────────────
// items: [{ id, icon, classe, titulo, sub, href, onclick, ts, tipo:"urgente"|"info" }]
function _renderNotifAgrupada(items) {
  if (!items || items.length === 0) {
    return '<div class="notif-drop-vazio">✅ Sem pendentes</div>';
  }

  // Filtrar dispensadas
  const visiveis = items.filter(it => !_notifDispensadas.has(it.id));
  if (visiveis.length === 0) {
    return '<div class="notif-drop-vazio">✅ Todas as notificações lidas</div>';
  }

  // Separar urgentes / informativas
  const urgentes = visiveis.filter(it => it.tipo === "urgente");
  const infos    = visiveis.filter(it => it.tipo !== "urgente");

  let html = "";

  const _renderGrupoTemporal = (lista, classeBase) => {
    // Agrupar por tempo
    const grupos = { hoje: [], semana: [], antigas: [] };
    lista.forEach(it => { grupos[_categoriaTemporalNotif(it.ts)].push(it); });

    const labels = { hoje: "Hoje", semana: "Esta semana", antigas: "Mais antigas" };
    ["hoje", "semana", "antigas"].forEach(cat => {
      if (grupos[cat].length === 0) return;
      html += `<div class="notif-secao-temporal">${labels[cat]}</div>`;
      grupos[cat].forEach(it => { html += _itemHtml(it, classeBase); });
    });
  };

  if (urgentes.length > 0) {
    html += `<div class="notif-secao-tipo urgente" style="display:flex;align-items:center;gap:5px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'/></svg> Requer acção (${urgentes.length})</div>`;
    _renderGrupoTemporal(urgentes, "urgente");
  }
  if (infos.length > 0) {
    html += `<div class="notif-secao-tipo info">Informativas (${infos.length})</div>`;
    _renderGrupoTemporal(infos, "info");
  }

  return html;
}

function _itemHtml(it, classeBase) {
  const onclickAttr = it.href && it.href !== "#"
    ? `href="${it.href}"`
    : `href="#" onclick="${it.onclick || ''};return false;"`;
  return `<a class="notif-item ${classeBase}" ${onclickAttr} data-notif-id="${it.id}">
    <div class="notif-ic ${it.icClasse || 'notif-ic-sol'}">${it.icon}</div>
    <div class="notif-corpo">
      <div class="notif-titulo">${it.titulo}</div>
      <div class="notif-sub">${it.sub}</div>
    </div>
    <button class="notif-dismiss" onclick="dispensarNotif(event,'${it.id}')" title="Marcar como lida">✕</button>
  </a>`;
}

function mostrarLogin() {
  document.getElementById("ecrã-painel").style.display="none";
  document.getElementById("ecrã-login").style.display="flex";
  const b = document.getElementById("btn-entrar");
  b.disabled=false; b.innerHTML="Entrar no Sistema →";
  utilizadorActual=null; perfilActual=null;
  limparPainelChefeUnidade();
}


async function carregarIndicadores() {
  try {
    const snap = await getDocs(collection(db,"utilizadores"));
    let activos = 0;
    snap.forEach(d=>{ if(d.data().activo) activos++; });
    document.getElementById("total-utilizadores").textContent = snap.size;
    document.getElementById("total-activos").textContent = activos;
  } catch(e) { console.error(e); mostrarNotif("⚠️ Erro ao carregar indicadores.","aviso"); }
  try {
    const snapF = await getDocs(collection(db,"funcionarios"));
    const uns = new Set();
    snapF.forEach(d=>{ const u=d.data().unidade; if(u) uns.add(u); });
    document.getElementById("total-funcionarios").textContent = snapF.size;
    document.getElementById("total-unidades").textContent = uns.size || 16;
  } catch(e) {}
}

async function carregarUtilizadores() {
  const tb = document.getElementById("corpo-tabela-utilizadores");
  tb.innerHTML=`<tr><td colspan="6"><div class="vazio-estado"><p>A carregar...</p></div></td></tr>`;
  try {
    const snap = await getDocs(collection(db,"utilizadores"));
    if(snap.empty){ tb.innerHTML=`<tr><td colspan="6"><div class="vazio-estado"><div class="icone">👥</div><p>Nenhum utilizador.</p></div></td></tr>`; return; }
    let html="";
    snap.forEach(d=>{
      const u=normalizarPerfilDocLocal(d.data()), uid=d.id;
      const bge = u.activo?`<span class="b-activo">● Activo</span>`:`<span class="b-inactivo">○ Inactivo</span>`;
      const acs = u.ultimoAcesso?.toDate ? fmtData(u.ultimoAcesso.toDate()) : "—";
      const btn = !temAlgumRoleLocal(u, ["admin"])
        ? `<button class="btn-acao-ln ${u.activo?"btn-desat":"btn-ativar"}" onclick="toggleUser('${uid}',${u.activo})">${u.activo?"Desactivar":"Activar"}</button>`
        : `<span style="font-size:11px;color:var(--neu-300)">—</span>`;
      html+=`<tr>
        <td><strong>${u.nome||"—"}</strong><br><small style="color:var(--neu-400)">${u.unidade||""}</small></td>
        <td style="font-family:var(--mono);font-size:12px">${u.email||"—"}</td>
        <td>${badgesRolesHtml(u) || `<span class="badge-perfil perfil-funcionario">${etiquetasPerfil.funcionario}</span>`}</td>
        <td>${bge}</td>
        <td style="font-size:12px;color:var(--neu-400)">${acs}</td>
        <td>${btn}</td>
      </tr>`;
    });
    tb.innerHTML=html;
  } catch(e){ tb.innerHTML=`<tr><td colspan="6"><div class="vazio-estado"><p>Erro ao carregar.</p></div></td></tr>`; }
}

window.toggleUser = async function(uid, actual) {
  if(!_exigirPerfil(["admin"])){console.warn("Acesso negado: toggleUser");return;}
  if(!confirm(actual?"Desactivar?":"Activar?")) return;
  try{
    await updateDoc(doc(db,"utilizadores",uid),{activo:!actual});
    mostrarNotif(!actual?"✅ Utilizador activado!":"🔴 Utilizador desactivado.");
    carregarUtilizadores(); carregarIndicadores();
  }catch(e){ console.error(e); mostrarNotif("❌ Erro ao actualizar o utilizador.","erro"); }
};

// Manter compatibilidade com chamadas antigas
window.toggleEstadoUtilizador = window.toggleUser;

window.abrirModalNovoUtilizador = ()=>{ if(!_exigirPerfil(["admin"])){console.warn("Acesso negado: abrirModalNovoUtilizador");return;} document.getElementById("overlay-novo-utilizador").classList.add("activo"); };
window.fecharModal = ()=>{
  document.getElementById("overlay-novo-utilizador").classList.remove("activo");
  limparRolesNovoUtilizador();
};

function obterRolesNovoUtilizador() {
  return Array.from(document.querySelectorAll("[data-role-novo]:checked")).map(el => el.value);
}

function limparRolesNovoUtilizador() {
  document.querySelectorAll("[data-role-novo]").forEach(el => { el.checked = false; });
}

window.criarNovoUtilizador = async function() {
  if(!_exigirPerfil(["admin"])){console.warn("Acesso negado: criarNovoUtilizador");return;}
  const nome=document.getElementById("novo-nome").value.trim();
  const email=document.getElementById("novo-email").value.trim();
  const senha=document.getElementById("novo-senha").value.trim();
  const roles=obterRolesNovoUtilizador();
  const perfilPrincipal=obterEtiquetaPerfilPrincipalLocal({ roles:["funcionario"].concat(roles), perfilBase:"funcionario" });
  const perfil=perfilPrincipal;
  const unidade=document.getElementById("novo-unidade").value;
  if(!nome||!email||!senha){mostrarNotif("⚠️ Preencha todos os campos obrigatórios.","aviso");return;}
  if(senha.length<6){mostrarNotif("⚠️ A senha deve ter pelo menos 6 caracteres.","aviso");return;}
  try{
    // Usar app secundária para NÃO substituir a sessão do admin
    const appSec = initializeApp(firebaseConfig, `criar-user-${Date.now()}`);
    const authSec = getAuth(appSec);
    const cred = await createUserWithEmailAndPassword(authSec, email, senha);
    const novoUid = cred.user.uid;
    // Fazer sign out da app secundária imediatamente
    await authSec.signOut();
    // Escrever o documento usando a sessão do admin (db principal)
    await setDoc(doc(db,"utilizadores",novoUid),{
      nome, email, unidade, activo:true,
      criadoEm:serverTimestamp(), ultimoAcesso:null,
      criadoPor:utilizadorActual.uid,
      ...payloadPerfilLocal({ roles })
    });
    fecharModal();
    mostrarNotif(`✅ Utilizador "${nome}" (${perfil}) criado com sucesso!`);
    carregarUtilizadores(); carregarIndicadores();
    document.getElementById("novo-nome").value="";
    document.getElementById("novo-email").value="";
    document.getElementById("novo-senha").value="Sumbe2026!";
    limparRolesNovoUtilizador();
  }catch(e){
    console.error("criarNovoUtilizador:",e);
    const m={"auth/email-already-in-use":"❌ E-mail já está registado.","auth/invalid-email":"❌ E-mail inválido.","auth/weak-password":"❌ Senha fraca (mínimo 6 caracteres)."};
    mostrarNotif(m[e.code]||`❌ Erro: ${e.message}`,"erro");
  }
};

async function registarSessao(u,d,tipo){
  try{ await setDoc(doc(db,"sessoes",`${u.uid}_${Date.now()}`),{uid:u.uid,nome:d.nome||u.email,perfil:d.perfil,email:u.email,tipo,timestamp:serverTimestamp()}); }catch(e){ console.warn("Sessão não registada:",e); }
}

async function carregarSessoes(){
  const lista=document.getElementById("lista-sessoes");
  try{
    const q=query(collection(db,"sessoes"),orderBy("timestamp","desc"),limit(15));
    const snap=await getDocs(q);
    if(snap.empty){lista.innerHTML=`<div class="vazio-estado"><div class="icone">📋</div><p>Nenhum registo.</p></div>`;return;}
    let html="", htmlMini=""; let mini=0;
    snap.forEach(d=>{
      const s=d.data(), ent=s.tipo==="entrada";
      const h=s.timestamp?.toDate?fmtData(s.timestamp.toDate()):"—";
      const item=`<div class="sessao-item">
        <div class="sessao-dot ${ent?"dot-in":"dot-out"}"></div>
        <div class="sessao-info">
          <div class="sessao-nome">${escaparHtml(s.nome||s.email||'—')}</div>
          <div class="sessao-det">${etiquetasPerfil[s.perfil]||escaparHtml(s.perfil||'—')} · ${ent?"Entrou":"Saiu"}</div>
        </div>
        <div class="sessao-hora">${h}</div>
      </div>`;
      html+=item;
      if(mini<4){htmlMini+=item;mini++;}
    });
    lista.innerHTML=html;
    const mini_el=document.getElementById("lista-sessoes-mini");
    if(mini_el) mini_el.innerHTML=htmlMini;
  }catch(e){ console.error(e); lista.innerHTML=`<div class="vazio-estado"><p>⚠️ Erro ao carregar sessões.</p></div>`; mostrarNotif("❌ Não foi possível carregar os acessos recentes.","erro"); }
}

window.abrirModalPerfil=function(){
  if(!utilizadorActual||!perfilActual) return;
  const d=perfilActual, nome=d.nome||utilizadorActual.email;
  document.getElementById("perfil-avatar-grande").textContent=nome[0].toUpperCase();
  document.getElementById("perfil-nome-modal").textContent=nome;
  document.getElementById("perfil-cargo-modal").textContent=obterEtiquetaPerfilVisual(d);
  document.getElementById("perfil-email-modal").textContent=utilizadorActual.email;
  document.getElementById("perfil-unidade-modal").textContent=d.unidade||d.seccao||"—";
  document.getElementById("perfil-unidade-modal").textContent=obterTextoUnidadeVisual(d);
  document.getElementById("overlay-perfil").style.display="flex";
};
window.fecharModalPerfil=()=>{document.getElementById("overlay-perfil").style.display="none";};
document.getElementById("overlay-perfil").addEventListener("click",function(e){if(e.target===this)window.fecharModalPerfil();});
document.getElementById("overlay-novo-utilizador").addEventListener("click",function(e){if(e.target===this)window.fecharModal();});

function mostrarErro(msg){const e=document.getElementById("msg-erro");e.textContent=msg;e.style.display="block";}

// ─────────────────────────────────────────────────────────────
//  mostrarNotif — Toast contextual com botão de acção opcional
//  Uso: mostrarNotif("Mensagem", "sucesso")
//       mostrarNotif("João pediu reunião", "aviso", { label:"Ver agora →", fn: ()=>mostrarSecção('secretaria') })
// ─────────────────────────────────────────────────────────────
let _toastTimer = null;

window.fecharToast = function() {
  const e = document.getElementById("notificacao");
  if (!e) return;
  e.classList.remove("visivel");
  e.style.display = "none";
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
};

function mostrarNotif(msg, tipo="sucesso", accao=null) {
  const icones = { sucesso:"✅", aviso:"⚠️", erro:"❌", info:"ℹ️" };
  const e      = document.getElementById("notificacao");
  const icEl   = document.getElementById("toast-ic");
  const txtEl  = document.getElementById("toast-txt");
  const rowEl  = document.getElementById("toast-accao-row");
  const btnEl  = document.getElementById("toast-btn-accao");

  if (!e) return;

  // Texto e ícone
  icEl.textContent  = icones[tipo] || "ℹ️";
  txtEl.textContent = msg;

  // Botão de acção opcional
  if (accao && accao.label && accao.fn) {
    btnEl.textContent  = accao.label;
    btnEl.onclick      = () => { accao.fn(); fecharToast(); };
    rowEl.style.display = "";
  } else {
    rowEl.style.display = "none";
  }

  // Classe de tipo + animação
  e.className  = `toast toast-${tipo}`;
  e.style.display = "flex";
  // Forçar reflow para reiniciar animação
  void e.offsetWidth;
  e.classList.add("visivel");

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(fecharToast, accao ? (accao.timeout || 7000) : 4500);
}
function fmtData(d){if(!d)return"—";return d.toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function actualizarDataHora(){
  const a=new Date();
  document.getElementById("data-hora-actual").textContent=
    a.toLocaleDateString("pt-AO",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})+" · "+
    a.toLocaleTimeString("pt-AO",{hour:"2-digit",minute:"2-digit"});
}

// ══════════════════════════════════════════════════════════
//  PESQUISA GLOBAL — busca real no Firestore
// ══════════════════════════════════════════════════════════

let _spTimer = null;
let _spFocoIdx = -1;

// Atalho de teclado: / para abrir, Esc para fechar
document.addEventListener('keydown', e => {
  if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    abrirPesquisa();
  }
  if (e.key === 'Escape') fecharPesquisa();
});

window.abrirPesquisa = function() {
  document.getElementById('sp-overlay').classList.add('activo');
  const inp = document.getElementById('sp-input');
  inp.value = '';
  inp.focus();
  _spFocoIdx = -1;
  mostrarEstadoInicial();
};

window.fecharPesquisa = function() {
  document.getElementById('sp-overlay').classList.remove('activo');
};

function mostrarEstadoInicial() {
  document.getElementById('sp-resultados').innerHTML =
    `<div class="sp-vazio" id="sp-estado-inicial">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      Escreva para pesquisar em <strong style="color:var(--pri)">funcionários</strong>,
      <strong style="color:var(--pri)">documentos</strong> e
      <strong style="color:var(--pri)">solicitações</strong>
    </div>`;
}

window.pesquisarGlobal = function(termo) {
  clearTimeout(_spTimer);
  const t = (termo || '').trim().toLowerCase();
  if (!t) { mostrarEstadoInicial(); return; }
  if (t.length < 2) return;
  document.getElementById('sp-resultados').innerHTML =
    '<div class="sp-carregando">⏳ A pesquisar…</div>';
  _spTimer = setTimeout(() => executarPesquisa(t), 280);
};

async function executarPesquisa(termo) {
  const resultados = { funcionarios: [], documentos: [], solicitacoes: [] };

  try {
    // ── Funcionários: pesquisa local por nome, número, BI, unidade, categoria ──
    const snapF = await getDocs(collection(db, 'funcionarios'));
    snapF.forEach(d => {
      const f = d.data();
      const campos = [f.nome, f.numero, f.bi, f.unidade, f.categoria, f.email].join(' ').toLowerCase();
      if (campos.includes(termo)) resultados.funcionarios.push({ id: d.id, ...f });
    });
  } catch(e) { console.warn('Pesquisa funcionarios:', e); }

  try {
    // ── Documentos: pesquisa por tipo, referência, nome do funcionário, estado ──
    const snapD = await getDocs(collection(db, 'documentos'));
    snapD.forEach(d => {
      const doc = d.data();
      const campos = [doc.tipo, doc.referencia, doc.nomeFuncionario, doc.estado, doc.unidade].join(' ').toLowerCase();
      if (campos.includes(termo)) resultados.documentos.push({ id: d.id, ...doc });
    });
  } catch(e) { console.warn('Pesquisa documentos:', e); }

  try {
    // ── Solicitações: pesquisa por tipo, estado, nome ──
    const snapS = await getDocs(collection(db, 'solicitacoes'));
    snapS.forEach(d => {
      const s = d.data();
      const campos = [s.tipo, s.estado, s.nomeFuncionario, s.numero].join(' ').toLowerCase();
      if (campos.includes(termo)) resultados.solicitacoes.push({ id: d.id, ...s });
    });
  } catch(e) { console.warn('Pesquisa solicitacoes:', e); }

  renderResultados(resultados, termo);
}

function highlight(texto, termo) {
  if (!texto || !termo) return texto || '—';
  const re = new RegExp('(' + termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return String(texto).replace(re, '<span class="sp-highlight">$1</span>');
}

function renderResultados(res, termo) {
  const total = res.funcionarios.length + res.documentos.length + res.solicitacoes.length;
  const el = document.getElementById('sp-resultados');

  if (total === 0) {
    el.innerHTML = `<div class="sp-vazio">
      <div style="font-size:32px;margin-bottom:8px">😶</div>
      Sem resultados para <strong style="color:var(--pri)">"${termo}"</strong>
    </div>`;
    return;
  }

  let html = '';

  if (res.funcionarios.length) {
    html += `<div class="sp-grupo-titulo"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg> Funcionários (${res.funcionarios.length})</div>`;
    res.funcionarios.slice(0, 6).forEach(f => {
      const sub = [f.categoria, f.unidade, f.numero ? 'Nº '+f.numero : ''].filter(Boolean).join(' · ');
      const est = f.estado === 'activo'
        ? `<span class="sp-item-badge" style="background:rgba(16,200,134,.15);color:var(--c-500)">Activo</span>`
        : `<span class="sp-item-badge" style="background:rgba(148,163,184,.1);color:var(--neu-400)">${f.estado||'—'}</span>`;
      html += `<div class="sp-item" onclick="abrirFicha('${f.id}','funcionario')" data-sp-item>
        <div class="sp-item-ic sp-ic-func"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg></div>
        <div>
          <div class="sp-item-nome">${highlight(f.nome, termo)}</div>
          <div class="sp-item-sub">${highlight(sub, termo)}</div>
        </div>
        ${est}
      </div>`;
    });
  }

  if (res.documentos.length) {
    html += `<div class="sp-grupo-titulo"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg> Documentos (${res.documentos.length})</div>`;
    res.documentos.slice(0, 6).forEach(d => {
      const sub = [d.nomeFuncionario, d.referencia ? 'Ref: '+d.referencia : ''].filter(Boolean).join(' · ');
      const estadoCor = {
        'aprovado':'rgba(16,200,134,.15);color:var(--c-500)',
        'pendente':'rgba(245,158,11,.15);color:var(--a-500)',
        'rejeitado':'rgba(220,38,38,.15);color:var(--r-600)',
        'processando':'rgba(37,99,235,.15);color:#60a5fa'
      }[d.estado] || 'rgba(148,163,184,.1);color:var(--neu-400)';
      html += `<div class="sp-item" onclick="abrirFicha('${d.id}','documento')" data-sp-item>
        <div class="sp-item-ic sp-ic-doc"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg></div>
        <div>
          <div class="sp-item-nome">${highlight(d.tipo||d.referencia||'Documento', termo)}</div>
          <div class="sp-item-sub">${highlight(sub, termo)}</div>
        </div>
        <span class="sp-item-badge" style="background:${estadoCor}">${d.estado||'—'}</span>
      </div>`;
    });
  }

  if (res.solicitacoes.length) {
    html += `<div class="sp-grupo-titulo"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg> Solicitações (${res.solicitacoes.length})</div>`;
    res.solicitacoes.slice(0, 6).forEach(s => {
      const sub = [s.nomeFuncionario, s.numero ? 'Nº '+s.numero : ''].filter(Boolean).join(' · ');
      const estadoCor = {
        'aprovado':'rgba(16,200,134,.15);color:var(--c-500)',
        'pendente':'rgba(245,158,11,.15);color:var(--a-500)',
        'nova':'rgba(37,99,235,.15);color:#60a5fa',
        'rejeitado':'rgba(220,38,38,.15);color:var(--r-600)'
      }[s.estado] || 'rgba(148,163,184,.1);color:var(--neu-400)';
      html += `<div class="sp-item" onclick="abrirFicha('${s.id}','solicitacao')" data-sp-item>
        <div class="sp-item-ic sp-ic-sol"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg></div>
        <div>
          <div class="sp-item-nome">${highlight(s.tipo||'Solicitação', termo)}</div>
          <div class="sp-item-sub">${highlight(sub, termo)}</div>
        </div>
        <span class="sp-item-badge" style="background:${estadoCor}">${s.estado||'—'}</span>
      </div>`;
    });
  }

  el.innerHTML = html;
  _spFocoIdx = -1;
}

// Navegação por teclado nos resultados
window.navegarResultados = function(e) {
  const items = document.querySelectorAll('[data-sp-item]');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _spFocoIdx = Math.min(_spFocoIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _spFocoIdx = Math.max(_spFocoIdx - 1, 0);
  } else if (e.key === 'Enter' && _spFocoIdx >= 0) {
    e.preventDefault();
    items[_spFocoIdx]?.click();
    return;
  } else { return; }
  items.forEach((el, i) => el.classList.toggle('foco', i === _spFocoIdx));
  items[_spFocoIdx]?.scrollIntoView({ block: 'nearest' });
};

// Abrir ficha do resultado seleccionado
window.abrirFicha = async function(id, tipo) {
  fecharPesquisa();
  if (tipo === 'funcionario') {
    mostrarSecção('utilizadores');
    await carregarUtilizadores();
    // C12 fix: abrirModalPerfil() ignora argumentos (mostra o utilizador actual).
    // Mostrar um toast com os dados do funcionário encontrado é o comportamento correcto.
    try {
      const snap = await getDoc(doc(db, 'funcionarios', id));
      if (snap.exists()) {
        const f = snap.data();
        const nome   = escaparHtml(f.nomeCompleto || f.nome || '—');
        const cargo  = escaparHtml(f.categoria || f.cargo || '—');
        const unidade = escaparHtml(f.unidade || '—');
        mostrarNotif(`👤 ${nome} · ${cargo} · ${unidade}`, 'info');
      } else {
        mostrarNotif('📌 Funcionário encontrado — sem dados adicionais.', 'info');
      }
    } catch(e) {
      mostrarNotif('❌ Erro ao carregar dados do funcionário.', 'erro');
    }
  } else if (tipo === 'documento' || tipo === 'solicitacao') {
    const col = tipo === 'documento' ? 'documentos' : 'solicitacoes';
    mostrarSecção('dashboard');
    try {
      const snap = await getDoc(doc(db, col, id));
      if (snap.exists()) {
        const d = snap.data();
        const label = tipo === 'documento'
          ? (d.tipo || 'Documento') + (d.referencia ? ' — Ref: ' + d.referencia : '')
          : (d.tipo || 'Solicitação') + ' — ' + (d.nomeFuncionario || '');
        mostrarNotif('📌 ' + label + ' → estado: ' + (d.estado || '—'), 'info');
      }
    } catch(e) { mostrarNotif('❌ Erro ao abrir registo.', 'erro'); }
  }
};


// ══════════════════════════════════════════════════════════
//  SECRETARIA — pedidos e reuniões
// ══════════════════════════════════════════════════════════

const BADGE_PEDIDO = {
  novo:       '<span class="badge-sec-novo">🔵 Novo</span>',
  em_analise: '<span class="badge-sec-analise">🟡 Em análise</span>',
  respondido: '<span class="badge-sec-resp">🟢 Respondido</span>',
  fechado:    '<span class="badge-sec-fechado">⚫ Fechado</span>'
};
const BADGE_REUNIAO = {
  pendente:   '<span class="badge-sec-pend">⏳ Pendente</span>',
  confirmada: '<span class="badge-sec-conf">✅ Confirmada</span>',
  recusada:   '<span class="badge-sec-rec">❌ Recusada</span>',
  remarcada:  '<span class="badge-sec-remapc">🔄 Remarcada</span>',
  realizada:  '<span class="badge-sec-fechado">✔ Realizada</span>'
};
const ASSUNTOS_SEC = {
  'ferias-licencas':'Férias e Licenças','abonos-salarios':'Abonos e Salários',
  'documentacao':'Documentação Pessoal','transferencias':'Transferências',
  'escalas':'Escalas de Serviço','outro':'Outro'
};
const DEST_REUNIAO = {
  'director':   'Director Municipal de Saúde',
  'chefe-sperh':'Chefe da Secção de Planeamento, Estatística e RH',
  'chefe-sp':   'Chefe da Secção de Saúde Pública',
  'chefe-is':   'Chefe da Secção de Inspecção Sanitária',
  'chefe-lhm':  'Chefe da Secção de Logística Hospitalar e Medicamentos'
};

// ── helpers de filtro de data ──
function _dentroDoIntervalo(ts, de, ate) {
  if (!ts?.toDate) return true;
  const d = ts.toDate();
  if (de  && d < new Date(de))  return false;
  if (ate && d > new Date(ate + 'T23:59:59')) return false;
  return true;
}

window.limparFiltrosPedidos = function() {
  document.getElementById('filtro-estado-pedidos').value = '';
  document.getElementById('filtro-data-de-pedidos').value  = '';
  document.getElementById('filtro-data-ate-pedidos').value = '';
  carregarPedidosSecretaria();
};
window.limparFiltrosReunioes = function() {
  document.getElementById('filtro-estado-reunioes').value = '';
  document.getElementById('filtro-data-de-reunioes').value  = '';
  document.getElementById('filtro-data-ate-reunioes').value = '';
  carregarReunioesSecretaria();
};

// ── Agendamentos de Reunião ─────────────────────────────────
window.carregarReunioesSecretaria = async function() {
  const el = document.getElementById('lista-reunioes-secretaria');
  const ctr = document.getElementById('sec-reunioes-contador');
  if (!el) return;
  el.innerHTML = '<div class="vazio-estado"><div class="icone">📅</div><p>⏳ A carregar…</p></div>';

  try {
    const filtroEstado = document.getElementById('filtro-estado-reunioes')?.value || '';
    const filtroDe     = document.getElementById('filtro-data-de-reunioes')?.value  || '';
    const filtroAte    = document.getElementById('filtro-data-ate-reunioes')?.value || '';

    const snap = await getDocs(query(collection(db,'reunioes'), orderBy('criadoEm','desc')));
    let docs = snap.docs.map(d => ({id:d.id, ...d.data()}));

    if (filtroEstado) docs = docs.filter(r => r.estado === filtroEstado);
    if (filtroDe)     docs = docs.filter(r => { const d = r.dataPreferida; return d && d >= filtroDe; });
    if (filtroAte)    docs = docs.filter(r => { const d = r.dataPreferida; return d && d <= filtroAte; });

    if (ctr) ctr.textContent = docs.length > 0 ? `${docs.length} agendamento${docs.length!==1?'s':''}` : '0';

    if (docs.length === 0) {
      const temFiltros = filtroEstado || filtroDe || filtroAte;
      if (temFiltros) {
        el.innerHTML = `<div class="vazio-estado-filtros">
          <div class="icone">📅</div>
          <p>Nenhum agendamento com este estado ou período.</p>
          <button class="btn-limpar-filtros" onclick="limparFiltrosReunioes()">✕ Limpar filtros</button>
        </div>`;
      } else {
        el.innerHTML = `<div class="vazio-estado-verde">
          <div class="icone">🗓️</div>
          <p>Tudo em dia!</p>
          <div class="sub">Sem reuniões pendentes por agora.</div>
        </div>`;
      }
      return;
    }

    const corEstado = { pendente:'#f59e0b', confirmada:'#10b981', recusada:'#ef4444', remarcada:'#6366f1', realizada:'#8b5cf6' };
    const labelEstado = { pendente:'Pendente', confirmada:'Confirmado', recusada:'Recusado', remarcada:'Remarcado', realizada:'Realizado' };
    const labelPeriodo = { manha:'Manhã', tarde:'Tarde', qualquer:'Qualquer hora' };

    el.innerHTML = docs.map(r => {
      const estado  = r.estado || 'pendente';
      const cor     = corEstado[estado] || '#8b5cf6';
      const dest    = DEST_REUNIAO[r.destinatario] || r.destinatario || '—';
      const data    = r.dataPreferida || '—';
      const periodo = labelPeriodo[r.periodo] || r.periodo || '—';
      const criado  = r.criadoEm?.toDate ? r.criadoEm.toDate().toLocaleDateString('pt-AO') : '—';

      // v4: acções rápidas inline — confirmar não abre modal; recusar/remarcar abrem só quando necessário
      const icCheck = `<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>`;
      const icX     = `<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>`;
      const icRem   = `<svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/></svg>`;
      let acoes = '';
      if (estado === 'pendente') {
        acoes = `<div class="reu-acoes-rapidas">
          <button class="btn-reu-acao btn-reu-conf"
            onclick="event.stopPropagation();confirmarReuniaoRapido('${r.id}',this)"
            title="Confirmar imediatamente (sem campos adicionais)">${icCheck} Confirmar</button>
          <button class="btn-reu-acao btn-reu-recus"
            onclick="event.stopPropagation();recusarReuniaoRapido('${r.id}')"
            title="Recusar (pede motivo)">${icX} Recusar</button>
          <button class="btn-reu-acao btn-reu-mais"
            onclick="event.stopPropagation();abrirModalReuniaoAcao('${r.id}','remarcar')"
            title="Sugerir nova data">${icRem} Remarcar</button>
        </div>`;
      } else if (estado === 'confirmada') {
        acoes = `<div style="margin-top:8px">
          ${r.local ? `<div style="font-size:12px;color:var(--txt-2);margin-bottom:8px">📍 Local: <strong style="color:var(--txt-1)">${escaparHtml(r.local)}</strong></div>` : ''}
          <div class="reu-acoes-rapidas">
            <button class="btn-reu-acao btn-reu-real"
              onclick="event.stopPropagation();abrirModalReuniaoAcao('${r.id}','realizada')">${icCheck} Realizada</button>
            <button class="btn-reu-acao btn-reu-recus"
              onclick="event.stopPropagation();recusarReuniaoRapido('${r.id}')">${icX} Cancelar</button>
          </div>
        </div>`;
      } else if (estado === 'remarcada') {
        acoes = `<div style="margin-top:8px">
          ${r.dataSugerida ? `<div style="font-size:12px;color:var(--txt-2);margin-bottom:6px">📌 Nova data sugerida: <strong style="color:var(--txt-1)">${r.dataSugerida}</strong></div>` : ''}
          ${r.observacoes  ? `<div style="font-size:12px;color:var(--txt-2);margin-bottom:8px">💬 ${escaparHtml(r.observacoes)}</div>` : ''}
          <div class="reu-acoes-rapidas">
            <button class="btn-reu-acao btn-reu-conf"
              onclick="event.stopPropagation();confirmarReuniaoRapido('${r.id}',this)">${icCheck} Confirmar nova data</button>
            <button class="btn-reu-acao btn-reu-recus"
              onclick="event.stopPropagation();recusarReuniaoRapido('${r.id}')">${icX} Recusar</button>
          </div>
        </div>`;
      } else {
        acoes = `<div style="margin-top:6px">
          ${r.motivoRecusa ? `<div style="font-size:12px;color:#f87171;margin-top:4px">✕ Motivo: ${escaparHtml(r.motivoRecusa)}</div>` : ''}
          ${r.observacoes && estado === 'realizada' ? `<div style="font-size:12px;color:var(--txt-2);margin-top:4px">📝 ${escaparHtml(r.observacoes)}</div>` : ''}
        </div>`;
      }

      return `<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:var(--sh-xs)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--txt-1)">${escaparHtml(r.funcionarioNome||'—')}</div>
            <div style="font-size:12px;color:var(--txt-2);margin-top:2px">${escaparHtml(r.unidade||'—')}</div>
          </div>
          <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:${cor}22;color:${cor};border:1px solid ${cor}33;white-space:nowrap">${labelEstado[estado]||estado}</span>
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--txt-2)">
          <div style="display:flex;align-items:center;gap:4px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg> <strong style="color:var(--txt-1)">${escaparHtml(r.assunto||'—')}</strong></div>
          <div style="margin-top:3px;display:flex;align-items:center;gap:4px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg> Destinatário: ${escaparHtml(dest)}</div>
          <div style="margin-top:3px;display:flex;align-items:center;gap:4px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/></svg> Preferência: ${data} · ${periodo}</div>
          <div style="margin-top:3px;font-size:11px;color:var(--txt-3)">Submetido em ${criado}</div>
        </div>
        ${acoes}
      </div>`;
    }).join('');
  } catch(e) {
    console.error('carregarReunioesSecretaria:', e);
    el.innerHTML = '<div class="vazio-estado"><p>⚠️ Erro ao carregar.</p></div>';
  }
};

// ── Modal acções de reunião ─────────────────────────────────
let _reuniaoModalId   = null;
let _reuniaoModalModo = null;

window.abrirModalReuniaoAcao = async function(id, modo) {
  _reuniaoModalId   = id;
  _reuniaoModalModo = modo;

  // Limpar erros e campos
  ['mra-local','mra-obs','mra-motivo','mra-obs-realizada'].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = '';
  });
  ['mra-remarcar-erro','mra-recusar-erro'].forEach(i => {
    const el = document.getElementById(i); if (el) el.textContent = '';
  });
  // Data mínima = amanhã
  const dataInput = document.getElementById('mra-data-nova');
  if (dataInput) {
    const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
    dataInput.min   = amanha.toISOString().slice(0,10);
    dataInput.value = '';
  }

  // Carregar info da reunião para o painel de contexto
  try {
    const snap = await getDoc(doc(db,'reunioes',id));
    const r    = snap.exists() ? snap.data() : {};
    const dest = DEST_REUNIAO[r.destinatario] || r.destinatario || '—';
    document.getElementById('mra-info').innerHTML =
      `<strong>${r.funcionarioNome||'—'}</strong> · ${r.unidade||'—'}<br>` +
      `<span style="opacity:.75;display:inline-flex;align-items:center;gap:3px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg> ${r.assunto||'—'}</span><br>` +
      `<span style="opacity:.75;display:inline-flex;align-items:center;gap:3px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg> ${dest} · <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/></svg> ${r.dataPreferida||'—'}</span>`;
  } catch(e) {
    document.getElementById('mra-info').textContent = '—';
  }

  // Títulos e visibilidade dos painéis
  const configs = {
    confirmar: { titulo:'✔ Confirmar Reunião',       painel:'mra-confirmar' },
    remarcar:  { titulo:'↷ Sugerir Nova Data',        painel:'mra-remarcar'  },
    recusar:   { titulo:'✕ Recusar Reunião',          painel:'mra-recusar'   },
    realizada: { titulo:'✔ Marcar como Realizada',    painel:'mra-realizada' },
  };
  const cfg = configs[modo];
  if (!cfg) return;
  document.getElementById('mra-titulo').textContent = cfg.titulo;
  ['mra-confirmar','mra-remarcar','mra-recusar','mra-realizada'].forEach(p => {
    document.getElementById(p).style.display = p === cfg.painel ? '' : 'none';
  });

  document.getElementById('modal-reuniao-acao').style.display = 'flex';
  // Foco no primeiro campo do modo activo
  setTimeout(() => {
    const primeiro = document.querySelector(`#${cfg.painel} input, #${cfg.painel} textarea`);
    if (primeiro) primeiro.focus();
  }, 80);
};

window.fecharModalReuniaoAcao = function() {
  document.getElementById('modal-reuniao-acao').style.display = 'none';
  _reuniaoModalId = null; _reuniaoModalModo = null;
};

window.submeterModalReuniaoAcao = async function() {
  if (!_reuniaoModalId || !_reuniaoModalModo) return;
  const id   = _reuniaoModalId;
  const modo = _reuniaoModalModo;
  const btn  = document.querySelector(`#mra-${modo} button:last-child`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ A guardar…'; }

  try {
    if (modo === 'confirmar') {
      const local = document.getElementById('mra-local').value.trim();
      await updateDoc(doc(db,'reunioes',id), {
        estado:'confirmada', local,
        geridoPor:utilizadorActual?.uid, actualizadoEm:serverTimestamp()
      });
      mostrarNotif('✅ Reunião confirmada!');

    } else if (modo === 'remarcar') {
      const dataNova = document.getElementById('mra-data-nova').value;
      const erroEl   = document.getElementById('mra-remarcar-erro');
      if (!dataNova) {
        erroEl.textContent = '⚠️ Indique a nova data.';
        if (btn) { btn.disabled=false; btn.textContent='↷ Sugerir nova data'; }
        return;
      }
      if (dataNova <= new Date().toISOString().slice(0,10)) {
        erroEl.textContent = '⚠️ A data tem de ser futura.';
        if (btn) { btn.disabled=false; btn.textContent='↷ Sugerir nova data'; }
        return;
      }
      erroEl.textContent = '';
      const periodo = document.getElementById('mra-periodo-novo').value;
      const obs     = document.getElementById('mra-obs').value.trim();
      await updateDoc(doc(db,'reunioes',id), {
        estado:'remarcada', dataSugerida:dataNova, periodo, observacoes:obs,
        geridoPor:utilizadorActual?.uid, actualizadoEm:serverTimestamp()
      });
      mostrarNotif('✅ Nova data sugerida!');

    } else if (modo === 'recusar') {
      const motivo = document.getElementById('mra-motivo').value.trim();
      const erroEl = document.getElementById('mra-recusar-erro');
      if (!motivo) {
        erroEl.textContent = '⚠️ O motivo é obrigatório.';
        if (btn) { btn.disabled=false; btn.textContent='✕ Recusar reunião'; }
        return;
      }
      erroEl.textContent = '';
      await updateDoc(doc(db,'reunioes',id), {
        estado:'recusada', motivoRecusa:motivo,
        geridoPor:utilizadorActual?.uid, actualizadoEm:serverTimestamp()
      });
      // Toast com desfazer — janela de 5 segundos
      mostrarNotif('Reunião recusada.', 'aviso', {
        label: '↩ Desfazer', timeout: 5000,
        fn: async () => {
          try {
            await updateDoc(doc(db,'reunioes',id), { estado:'pendente', motivoRecusa:null, geridoPor:null, actualizadoEm:serverTimestamp() });
            mostrarNotif('↩ Acção revertida com sucesso.', 'sucesso');
            carregarReunioesSecretaria();
          } catch(e) { mostrarNotif('❌ Erro ao desfazer.', 'erro'); }
        }
      });

    } else if (modo === 'realizada') {
      const obs = document.getElementById('mra-obs-realizada').value.trim();
      await updateDoc(doc(db,'reunioes',id), {
        estado:'realizada', observacoes:obs,
        geridoPor:utilizadorActual?.uid, realizadaEm:serverTimestamp(),
        actualizadoEm:serverTimestamp()
      });
      mostrarNotif('✔ Reunião marcada como realizada.');
    }

    fecharModalReuniaoAcao();
    addDoc(collection(db,'auditoria'),{
      coleccao:'reunioes', docId:id, acao:modo,
      por:utilizadorActual?.uid, em:serverTimestamp()
    }).catch(()=>{});
    carregarReunioesSecretaria();

  } catch(e) {
    mostrarNotif('❌ Erro: '+e.message, 'erro');
    if (btn) { btn.disabled=false; }
  }
};

// ── Helper: timestamp relativo ─────────────────────────────
function tempoRelativo(ts) {
  if (!ts?.toDate) return '—';
  const d = ts.toDate();
  const agora = new Date();
  const diff  = (agora - d) / 1000; // segundos
  if (diff < 60)    return 'agora mesmo';
  if (diff < 3600)  return `há ${Math.floor(diff/60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff/3600)}h`;
  const dias = Math.floor(diff/86400);
  if (dias === 1)   return 'ontem';
  if (dias < 7)     return `há ${dias} dias`;
  return d.toLocaleDateString('pt-AO', { day:'2-digit', month:'short' });
}

// ── Fechar todos os menus contextuais abertos ────────────────
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ped-ctx-wrap')) {
    document.querySelectorAll('.ped-ctx-menu.aberto').forEach(m => m.classList.remove('aberto'));
  }
});

// ── Helper: spinner inline no botão primário do item ────────
window._pedBtnClick = function(btnEl, id, idx) {
  if (btnEl && !btnEl.disabled) {
    const orig = btnEl.innerHTML;
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner"></span>';
    // O onSnapshot vai actualizar o painel; restaurar após breve instante
    setTimeout(() => { if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; } }, 900);
  }
  abrirChatSecretaria(id, idx);
};

window.toggleCtxMenu = function(event, menuId) {
  event.stopPropagation();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const estaAberto = menu.classList.contains('aberto');
  document.querySelectorAll('.ped-ctx-menu.aberto').forEach(m => m.classList.remove('aberto'));
  if (!estaAberto) menu.classList.add('aberto');
};

async function carregarPedidosSecretaria() {
  const el = document.getElementById('lista-pedidos-secretaria');
  if (!el) return;
  el.innerHTML = '<div class="vazio-estado"><p>⏳ A carregar…</p></div>';
  try {
    const filtroEstado = document.getElementById('filtro-estado-pedidos')?.value || '';
    const filtroDe  = document.getElementById('filtro-data-de-pedidos')?.value  || '';
    const filtroAte = document.getElementById('filtro-data-ate-pedidos')?.value || '';
    let q = filtroEstado
      ? query(collection(db,'pedidos_secretaria'), where('estado','==',filtroEstado))
      : query(collection(db,'pedidos_secretaria'));
    const snap = await getDocs(q);
    let docs = snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(p => _dentroDoIntervalo(p.criadoEm, filtroDe, filtroAte))
      .sort((a,b)=>(b.ultimaMensagemEm?.toDate?.()?.getTime()||b.criadoEm?.toDate?.()?.getTime()||0)
                  -(a.ultimaMensagemEm?.toDate?.()?.getTime()||a.criadoEm?.toDate?.()?.getTime()||0));

    // Actualizar contador no header v2
    const ctr = document.getElementById('sec-pedidos-contador');
    if (ctr) ctr.textContent = docs.length > 0 ? `${docs.length} encontrado${docs.length!==1?'s':''}` : '0';

    if (docs.length===0) {
      const temFiltros = filtroEstado || filtroDe || filtroAte;
      if (temFiltros) {
        el.innerHTML = `<div class="vazio-estado-filtros">
          <div class="icone">🔍</div>
          <p>Nenhum pedido com este estado ou período.</p>
          <button class="btn-limpar-filtros" onclick="limparFiltrosPedidos()">✕ Limpar filtros</button>
        </div>`;
      } else {
        el.innerHTML = `<div class="vazio-estado-verde">
          <div class="icone">✅</div>
          <p>Tudo em dia!</p>
          <div class="sub">Sem pedidos pendentes por agora.</div>
        </div>`;
      }
      return;
    }

    const LABELS_ESTADO = { novo:'● Novo', em_analise:'● Em análise', respondido:'● Respondido', fechado:'● Fechado' };

    // v4: guardar lista de IDs para navegação sequencial
    _secListaIds = docs.map(d => d.id);
    // Se há um pedido activo e ainda está na lista, manter o índice; senão resetar
    if (_chatSecId) {
      const idxActual = _secListaIds.indexOf(_chatSecId);
      _secIdxActual = idxActual >= 0 ? idxActual : -1;
      // C8 fix: sincronizar a barra de navegação com a lista actualizada
      _actualizarNavSeq();
    }

    el.innerHTML = docs.map((p, idx) => {
      const estado   = p.estado || 'novo';
      const assunto  = ASSUNTOS_SEC[p.assunto] || p.assunto || '—';
      const msgs     = p.mensagens || [];
      const ultima   = msgs[msgs.length - 1];
      // Preview da mensagem: última msg ou campo legado
      const previewTexto = ultima
        ? ultima.texto
        : (p.mensagem || '');
      const previewAutor = ultima
        ? (ultima.autor === 'secretaria' ? 'Você: ' : '')
        : '';
      const preview = (previewAutor + previewTexto).substring(0, 72) + (previewTexto.length > 72 ? '…' : '');

      const ts       = tempoRelativo(p.ultimaMensagemEm || p.criadoEm);
      const novas    = p.naoLidasSecretaria || 0;
      const aberto   = estado !== 'fechado';
      const initials = (p.funcionarioNome || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
      const menuId   = `ctx-${p.id}`;
      const isActivo = p.id === _chatSecId;

      // Botão primário — muda com o estado
      let btnLabel, btnClass;
      if (estado === 'novo' || estado === 'em_analise') {
        btnLabel = 'Responder →'; btnClass = 'responder';
      } else if (estado === 'respondido') {
        btnLabel = 'Ver conversa →'; btnClass = 'ver';
      } else {
        btnLabel = 'Ver conversa'; btnClass = 'fechado';
      }

      // Badge de novas mensagens não lidas
      const badgeNovas = novas > 0
        ? `<span style="background:var(--warn);color:#fff;font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px;flex-shrink:0">${novas}</span>`
        : '';

      return `<div class="ped-item${isActivo ? ' activo' : ''}" id="ped-item-${p.id}" onclick="abrirChatSecretaria('${p.id}', ${idx})">
        <div class="ped-item-bar ${estado}"></div>
        <div class="ped-item-inner">
          <div class="ped-item-av">${initials}</div>
          <div class="ped-item-body">
            <div class="ped-item-top">
              <div class="ped-item-top-left">
                <span class="ped-item-nome">${escaparHtml(p.funcionarioNome||'—')}</span>
                <span class="ped-item-badge ${estado}">${LABELS_ESTADO[estado]||estado}</span>
                ${badgeNovas}
              </div>
              <span class="ped-item-ts">${ts}</span>
            </div>
            <div class="ped-item-subject">
              ${escaparHtml(assunto)}
              <span class="ped-dot">●</span>
              <span style="font-size:11px;color:var(--txt-3)">${escaparHtml(p.unidade||'—')}</span>
            </div>
            <div class="ped-item-preview">${escaparHtml(preview || 'Sem mensagem')}</div>
            <div class="ped-item-footer" onclick="event.stopPropagation()">
              <button class="ped-btn-primario ${btnClass}"
                onclick="event.stopPropagation();_pedBtnClick(this,'${p.id}',${idx})">
                ${btnLabel}
              </button>
              <div class="ped-ctx-wrap">
                <button class="ped-ctx-btn" title="Mais acções"
                  onclick="toggleCtxMenu(event,'${menuId}')">⋯</button>
                <div class="ped-ctx-menu" id="${menuId}">
                  ${estado === 'novo' ? `<button class="ped-ctx-item" onclick="event.stopPropagation();marcarEmAnalise('${p.id}',this)">
                    <span class="ctx-ic">🔍</span> Marcar Em Análise
                  </button>` : ''}
                  ${estado !== 'respondido' && estado !== 'fechado' ? `<button class="ped-ctx-item" onclick="event.stopPropagation();abrirChatSecretaria('${p.id}', ${idx})">
                    <span class="ctx-ic">💬</span> Abrir Conversa
                  </button>` : ''}
                  <button class="ped-ctx-item" onclick="event.stopPropagation();verHistoricoPedido('${p.id}')">
                    <span class="ctx-ic">🕑</span> Ver Histórico
                  </button>
                  ${aberto ? `<button class="ped-ctx-item danger" onclick="event.stopPropagation();fecharPedidoDirecto('${p.id}',this)">
                    <span class="ctx-ic">✖</span> Fechar Pedido
                  </button>` : ''}
                </div>
              </div>
            </div><!-- /ped-item-footer -->
          </div><!-- /ped-item-body -->
        </div><!-- /ped-item-inner -->
        <span class="ped-item-hover-arrow" aria-hidden="true">→</span>
      </div>`;
    }).join('');
  } catch(e) { console.error(e); el.innerHTML = '<div class="vazio-estado"><p>⚠️ Erro ao carregar.</p></div>'; }
}

// ── Acções rápidas do menu contextual ───────────────────────
// C2 fix: exposta aqui para que os onchange dos filtros HTML a encontrem no scope global
window.carregarPedidosSecretaria = carregarPedidosSecretaria;
window.marcarEmAnalise = async function(id, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="ctx-ic"><span class="spinner" style="width:11px;height:11px;border-width:2px;border-top-color:var(--warn)"></span></span> A marcar…'; }
  try {
    const nome = perfilActual?.nome || utilizadorActual?.email || 'Secretaria';
    const snap = await getDoc(doc(db,'pedidos_secretaria',id));
    if (!snap.exists()) return;
    const p = snap.data();
    const hist = [...(p.historico||[]), { acao:'Em análise', detalhe:'Marcado em análise pela secretaria', por:nome, em:new Date().toISOString() }];
    await updateDoc(doc(db,'pedidos_secretaria',id), { estado:'em_analise', historico:hist, actualizadoEm:serverTimestamp() });
    mostrarNotif('🔍 Marcado em análise.');
    carregarPedidosSecretaria();
  } catch(e) {
    console.error(e); mostrarNotif('❌ Erro ao actualizar estado.', 'erro');
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<span class="ctx-ic">🔍</span> Marcar Em Análise'; }
  }
};

window.fecharPedidoDirecto = async function(id, btnEl) {
  if (!confirm('Fechar este pedido? O funcionário não poderá enviar mais mensagens.')) return;
  // Guardar estado anterior para poder desfazer
  let estadoAnterior = 'respondido';
  try {
    const snapAtual = await getDoc(doc(db,'pedidos_secretaria',id));
    if (snapAtual.exists()) estadoAnterior = snapAtual.data().estado || 'respondido';
  } catch(e) {}
  // Spinner no botão enquanto processa
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner" style="width:11px;height:11px;border-width:2px"></span>'; }
  try {
    await updateDoc(doc(db,'pedidos_secretaria',id),{estado:'fechado',fechadoEm:serverTimestamp()});
    addDoc(collection(db,'auditoria'),{coleccao:'pedidos_secretaria',docId:id,acao:'Fechado',detalhe:'Pedido encerrado pela secretaria',por:utilizadorActual?.uid,em:serverTimestamp()}).catch(()=>{});
    // Toast com botão Desfazer — janela de 5 segundos
    mostrarNotif('✖ Pedido fechado.', 'aviso', {
      label: '↩ Desfazer', timeout: 5000,
      fn: async () => {
        try {
          await updateDoc(doc(db,'pedidos_secretaria',id), { estado: estadoAnterior, fechadoEm: null, actualizadoEm: serverTimestamp() });
          mostrarNotif('↩ Acção revertida com sucesso.', 'sucesso');
          carregarPedidosSecretaria();
        } catch(e) { mostrarNotif('❌ Erro ao desfazer.', 'erro'); }
      }
    });
    carregarPedidosSecretaria();
  } catch(e){
    console.error(e); mostrarNotif('❌ Erro ao fechar.', 'erro');
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<span class="ctx-ic">✖</span> Fechar Pedido'; }
  }
};

// ── Chat da secretaria ────────────────────────────────────
let _chatSecId   = null;
let _unsubChatSec = null;
let _chatSecFuncUid  = null;
let _chatSecFuncNome = null;
// v4: navegação sequencial — lista de IDs de pedidos visíveis e índice actual
let _secListaIds = [];
let _secIdxActual = -1;
// v5: rastrear estado anterior para animações in-place
let _prevEstadoChat = null;

window.abrirChatSecretaria = async function(pedidoId, idx) {
  _chatSecId = pedidoId;
  _prevEstadoChat = null; // reset ao abrir novo pedido
  // v4: actualizar índice de navegação
  if (typeof idx === 'number') {
    _secIdxActual = idx;
  } else {
    const found = _secListaIds.indexOf(pedidoId);
    _secIdxActual = found >= 0 ? found : -1;
  }
  // Destacar item activo na lista e remover dos restantes
  document.querySelectorAll('.ped-item.activo').forEach(el => el.classList.remove('activo'));
  const itemEl = document.getElementById('ped-item-' + pedidoId);
  if (itemEl) itemEl.classList.add('activo');

  if (_unsubChatSec) _unsubChatSec();
  document.getElementById('chat-sec-overlay').classList.add('aberto');
  const msgsEl = document.getElementById('chat-sec-msgs');
  msgsEl.innerHTML = '<div style="text-align:center;padding:24px;opacity:.5">⏳ A carregar…</div>';
  // v4: injectar/actualizar barra de navegação sequencial
  _actualizarNavSeq();
  _unsubChatSec = onSnapshot(doc(db,'pedidos_secretaria',pedidoId), snap => {
    if (!snap.exists()) return;
    const p = snap.data();
    // Guardar identificadores do funcionário para o atalho de documentos
    _chatSecFuncUid  = p.funcionarioUid  || null;
    _chatSecFuncNome = p.funcionarioNome || '';
    const btnDoc = document.getElementById('chat-sec-btn-doc');
    if (btnDoc) btnDoc.style.display = _chatSecFuncUid ? '' : 'none';
    const assunto = ASSUNTOS_SEC[p.assunto]||p.assunto||'—';
    document.getElementById('chat-sec-titulo').textContent = assunto;
    document.getElementById('chat-sec-sub').textContent = (p.funcionarioNome||'—') + ' · ' + (p.unidade||'—');
    const aberto = p.estado !== 'fechado';

    // ── v5: animação in-place ao mudar estado (badge + barra lateral) ──
    const estadoActual = p.estado || 'novo';
    if (_prevEstadoChat && _prevEstadoChat !== estadoActual) {
      const itemEl = document.getElementById('ped-item-' + pedidoId);
      if (itemEl) {
        // Actualizar barra lateral com transição de cor
        const barEl = itemEl.querySelector('.ped-item-bar');
        if (barEl) barEl.className = 'ped-item-bar ' + estadoActual;
        // Actualizar badge com transição de cor
        const badgeEl = itemEl.querySelector('.ped-item-badge');
        const LABELS_ESTADO_LOCAL = { novo:'● Novo', em_analise:'● Em análise', respondido:'● Respondido', fechado:'● Fechado' };
        if (badgeEl) {
          badgeEl.className = 'ped-item-badge ' + estadoActual;
          badgeEl.textContent = LABELS_ESTADO_LOCAL[estadoActual] || estadoActual;
        }
        // Slide out suave se o filtro activo excluir o novo estado
        const filtroActivo = document.getElementById('filtro-estado-pedidos')?.value || '';
        if (filtroActivo && filtroActivo !== estadoActual) {
          itemEl.classList.add('saindo');
          setTimeout(() => carregarPedidosSecretaria(), 380);
        }
      }
    }
    _prevEstadoChat = estadoActual;
    const fechaRow = document.getElementById('chat-sec-fechar-row');
    if (fechaRow) fechaRow.style.display = aberto ? '' : 'none';
    document.querySelector('.chat-sec-input-row').style.display = aberto ? '' : 'none';
    const bar = document.getElementById('chat-sec-estado-bar');
    if (bar) {
      bar.textContent = aberto ? '● Conversa aberta' : '○ Conversa encerrada';
      bar.className = 'chat-estado-bar-sec ' + (aberto ? 'aberto' : 'fechado');
    }
    // ── Novos elementos v3 ──
    // Dot + texto de estado inline no header
    const dot = document.getElementById('chat-sec-estado-dot');
    const estadoTxt = document.getElementById('chat-sec-estado-txt');
    if (dot) { dot.className = 'chat-estado-dot ' + (aberto ? 'aberto' : 'fechado'); }
    if (estadoTxt) {
      estadoTxt.textContent = aberto ? 'Conversa aberta' : 'Conversa encerrada';
      estadoTxt.className = 'chat-estado-txt ' + (aberto ? 'aberto' : 'fechado');
    }
    // Botão encerrar — visível só se aberto
    const btnEncerrar = document.getElementById('chat-sec-btn-encerrar');
    if (btnEncerrar) btnEncerrar.style.display = aberto ? '' : 'none';
    // Chips de resposta rápida — visíveis só se aberto
    const chips = document.getElementById('chat-respostas-rapidas');
    if (chips) chips.classList.toggle('fechada', !aberto);
    // Painel de detalhes do pedido (mobile) — preencher info
    const detalhesInner = document.getElementById('chat-pedido-detalhes-inner');
    if (detalhesInner) {
      const dest = p.destinatario ? '' : '';
      detalhesInner.innerHTML = `
        <div class="chat-ped-detalhe-row">
          <span class="chat-ped-detalhe-ic"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg></span>
          <div class="chat-ped-detalhe-txt"><strong>${p.funcionarioNome||'—'}</strong></div>
        </div>
        <div class="chat-ped-detalhe-row">
          <span class="chat-ped-detalhe-ic"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z'/><path d='M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2'/><path d='M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2'/><path d='M10 6h4'/><path d='M10 10h4'/><path d='M10 14h4'/><path d='M10 18h4'/></svg></span>
          <div class="chat-ped-detalhe-txt">${p.unidade||'—'}</div>
        </div>
        <div class="chat-ped-detalhe-row">
          <span class="chat-ped-detalhe-ic"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg></span>
          <div class="chat-ped-detalhe-txt">${ASSUNTOS_SEC[p.assunto]||p.assunto||'—'}</div>
        </div>
        ${p.mensagem ? `<div class="chat-ped-detalhe-row">
          <span class="chat-ped-detalhe-ic">💬</span>
          <div class="chat-ped-detalhe-txt" style="opacity:.75;font-style:italic">${p.mensagem.substring(0,120)}</div>
        </div>` : ''}
      `;
    }
    // Construir mensagens — sempre mostrar legacy + array
    const msgs = [];
    if (p.mensagem) {
      const dup = (p.mensagens||[]).some(x => x.texto === p.mensagem && x.autor === 'funcionario');
      if (!dup) msgs.push({ texto:p.mensagem, autor:'funcionario', nomeAutor:p.funcionarioNome||'—', em:p.criadoEm?.toDate?.()?.toISOString()||null });
    }
    if (p.respostaTexto) {
      const dup = (p.mensagens||[]).some(x => x.texto === p.respostaTexto && x.autor === 'secretaria');
      if (!dup) msgs.push({ texto:p.respostaTexto, autor:'secretaria', nomeAutor:'Secretaria', em:p.respondidoEm?.toDate?.()?.toISOString()||null });
    }
    (p.mensagens||[]).forEach(m => msgs.push(m));
    const lido = (p.naoLidasFuncionario||0) === 0;
    if (msgs.length===0) {
      msgsEl.innerHTML = '<div style="text-align:center;padding:32px;opacity:.4;font-size:13px">Sem mensagens ainda</div>';
    } else {
      let lastData = '';
      msgsEl.innerHTML = msgs.map((m,i) => {
        const isSec = m.autor==='secretaria';
        const dt    = m.em ? new Date(m.em) : null;
        const hora  = dt ? dt.toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'}) : '';
        const dataStr = dt ? dt.toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric'}) : '';
        let dataSep = '';
        if (dataStr && dataStr !== lastData) { lastData = dataStr; dataSep = `<div class="chat-data-sep"><span>${dataStr}</span></div>`; }
        const isUltimaSec = isSec && i === msgs.map((mm,ii)=>mm.autor==='secretaria'?ii:-1).filter(ii=>ii>=0).pop();
        const visto = isUltimaSec
          ? `<i class="chat-sec-tick ${lido?'lido':'enviado'}">${lido?'✓✓':'✓'}</i>`
          : '';
        const initials = isSec ? 'S' : (m.nomeAutor||'F').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
        return `${dataSep}<div class="chat-msg-row ${isSec?'enviada':'recebida'}">
          <div class="chat-msg-av ${isSec?'sec':'func'}">${initials}</div>
          <div class="chat-sec-balao">
            ${m.texto}
            <div class="chat-sec-meta">
              <span class="chat-sec-hora">${hora}</span>
              ${visto}
            </div>
          </div>
        </div>`;
      }).join('');
    }
    setTimeout(()=>{ msgsEl.scrollTop=msgsEl.scrollHeight; },50);
    // Marcar como lidas
    if ((p.naoLidasSecretaria||0)>0) updateDoc(doc(db,'pedidos_secretaria',pedidoId),{naoLidasSecretaria:0}).catch(()=>{});
  }, err=>{ console.error(err); msgsEl.innerHTML='<div style="padding:16px;color:#f87171">⚠️ Erro</div>'; });
};

// ── v4: Navegação sequencial entre pedidos ──────────────────
function _actualizarNavSeq() {
  // Garantir que o contentor da barra existe no painel de detalhe
  let navBar = document.getElementById('sec-nav-seq');
  if (!navBar) {
    // Inserir antes do chat-sec-msgs
    const ref = document.getElementById('chat-sec-msgs');
    if (!ref) return;
    navBar = document.createElement('div');
    navBar.id = 'sec-nav-seq';
    navBar.className = 'sec-nav-seq';
    ref.parentNode.insertBefore(navBar, ref);
  }
  const total = _secListaIds.length;
  const idx   = _secIdxActual;
  if (total <= 1) { navBar.style.display = 'none'; return; }
  navBar.style.display = 'flex';
  navBar.innerHTML = `
    <button class="sec-nav-seq-btn" ${idx <= 0 ? 'disabled' : ''}
      onclick="navegarPedidoSeq(-1)" title="Pedido anterior">
      ← Anterior
    </button>
    <span class="sec-nav-seq-pos">${idx + 1} / ${total}</span>
    <button class="sec-nav-seq-btn" ${idx >= total - 1 ? 'disabled' : ''}
      onclick="navegarPedidoSeq(1)" title="Próximo pedido">
      Próximo →
    </button>`;
}

window.navegarPedidoSeq = function(delta) {
  const novoIdx = _secIdxActual + delta;
  if (novoIdx < 0 || novoIdx >= _secListaIds.length) return;
  const novoId = _secListaIds[novoIdx];
  abrirChatSecretaria(novoId, novoIdx);
  // Fazer scroll do item na lista para ficar visível
  const itemEl = document.getElementById('ped-item-' + novoId);
  if (itemEl) itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ── v4: Confirmar reunião sem modal ─────────────────────────
window.confirmarReuniaoRapido = async function(id, btnEl) {
  if (!id) return;
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;border-color:rgba(5,150,105,.2);border-top-color:var(--ok)"></span> A confirmar…'; }
  try {
    await updateDoc(doc(db, 'reunioes', id), {
      estado: 'confirmada',
      local: '',
      geridoPor: utilizadorActual?.uid,
      actualizadoEm: serverTimestamp()
    });
    addDoc(collection(db,'auditoria'),{
      coleccao:'reunioes', docId:id, acao:'confirmar',
      por:utilizadorActual?.uid, em:serverTimestamp()
    }).catch(()=>{});
    mostrarNotif('✅ Reunião confirmada!');
    carregarReunioesSecretaria();
  } catch(e) {
    mostrarNotif('❌ Erro ao confirmar: ' + e.message, 'erro');
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = '✔ Confirmar'; }
  }
};

// ── v4: Recusar reunião rápido — abre modal só com campo motivo ──
window.recusarReuniaoRapido = function(id) {
  abrirModalReuniaoAcao(id, 'recusar');
};

window.fecharChatSecretaria = function() {
  document.getElementById('chat-sec-overlay').classList.remove('aberto');
  if (_unsubChatSec) { _unsubChatSec(); _unsubChatSec=null; }
  // v4: limpar estado activo na lista
  document.querySelectorAll('.ped-item.activo').forEach(el => el.classList.remove('activo'));
  _chatSecId=null; _chatSecFuncUid=null; _chatSecFuncNome=null;
  _secIdxActual = -1;
  // Colapsar painel de detalhes (mobile) ao fechar
  const detPainel = document.getElementById('chat-pedido-detalhes');
  const detBtn    = document.getElementById('chat-btn-ver-pedido');
  if (detPainel) detPainel.classList.remove('expandido');
  if (detBtn)    detBtn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg> Ver pedido`;
  carregarPedidosSecretaria();
};

window.enviarMensagemSecretaria = async function() {
  const input = document.getElementById('chat-sec-input');
  const texto = input.value.trim();
  if (!texto || !_chatSecId) return;
  const btn = document.getElementById('btn-chat-sec-enviar');
  if (btn) btn.disabled = true;
  try {
    const ref  = doc(db, 'pedidos_secretaria', _chatSecId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Documento não encontrado');
    const p    = snap.data();
    const agora = new Date().toISOString();
    const nome  = perfilActual?.nome || utilizadorActual?.email || 'Secretaria';

    // Construir array completo — inclui campos legacy se ainda não migrados
    const arr = [];
    if (p.mensagem) {
      const dup = (p.mensagens||[]).some(x => x.texto === p.mensagem && x.autor === 'funcionario');
      if (!dup) arr.push({ texto:p.mensagem, autor:'funcionario', nomeAutor:p.funcionarioNome||'—', em: p.criadoEm?.toDate?.()?.toISOString() || agora });
    }
    if (p.respostaTexto) {
      const dup = (p.mensagens||[]).some(x => x.texto === p.respostaTexto && x.autor === 'secretaria');
      if (!dup) arr.push({ texto:p.respostaTexto, autor:'secretaria', nomeAutor:'Secretaria', em: p.respondidoEm?.toDate?.()?.toISOString() || agora });
    }
    (p.mensagens||[]).forEach(x => arr.push(x));
    arr.push({ texto, autor:'secretaria', nomeAutor:nome, em:agora });

    // Novo registo de histórico no próprio documento
    const novoHist = { acao:'Respondido', detalhe:texto.substring(0,80), por:nome, em:agora };
    const hist = [...(p.historico||[]), novoHist];

    await updateDoc(ref, {
      mensagens:           arr,
      historico:           hist,
      estado:              'respondido',
      ultimaMensagem:      texto.substring(0,80),
      ultimaMensagemEm:    serverTimestamp(),
      naoLidasFuncionario: (p.naoLidasFuncionario||0) + 1,
      naoLidasSecretaria:  0,
      respondidoEm:        serverTimestamp(),
      respondidoPor:       utilizadorActual?.uid
    });

    // Limpar input só após escrita confirmada
    input.value = '';
    // Auditoria separada — não crítica
    addDoc(collection(db,'auditoria'),{coleccao:'pedidos_secretaria',docId:_chatSecId,acao:'Respondido',detalhe:texto.substring(0,80),por:utilizadorActual?.uid,em:serverTimestamp()}).catch(()=>{});
    mostrarNotif('✅ Mensagem enviada!');
  } catch(e) {
    console.error('enviarMensagemSecretaria:', e);
    mostrarNotif('❌ Erro ao enviar: ' + e.message, 'erro');
  }
  if (btn) btn.disabled = false;
};
// Atalho: abrir documentos.html pré-seleccionado com o funcionário do chat activo
window.abrirDocumentosParaFuncionario = async function() {
  if (!_chatSecFuncUid) return;
  const btn = document.getElementById('chat-sec-btn-doc');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    // Resolver Auth UID → Firestore doc ID via portalUid
    const snap = await getDocs(
      query(collection(db,'funcionarios'), where('portalUid','==',_chatSecFuncUid))
    );
    if (snap.empty) {
      mostrarNotif('⚠️ Funcionário sem registo activo no sistema.', 'aviso');
      if (btn) { btn.disabled=false; btn.innerHTML=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg> Gerar doc`; }
      return;
    }
    const docId = snap.docs[0].id;
    const nome  = encodeURIComponent(_chatSecFuncNome || '');
    window.open(`documentos.html?func=${docId}&origem=secretaria&nome=${nome}`, '_blank');
  } catch(e) {
    mostrarNotif('❌ Erro ao abrir documentos: ' + e.message, 'erro');
  }
  if (btn) { btn.disabled=false; btn.innerHTML=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg> Gerar doc`; }
};

window.fecharConversaSecretaria = async function() {
  if (!_chatSecId) return;
  if (!confirm('Fechar esta conversa? O funcionário não poderá enviar mais mensagens.')) return;
  try {
    await updateDoc(doc(db,'pedidos_secretaria',_chatSecId),{estado:'fechado',fechadoEm:serverTimestamp()});
    addDoc(collection(db,'auditoria'),{coleccao:'pedidos_secretaria',docId:_chatSecId,acao:'Fechado',detalhe:'Conversa encerrada pela secretaria',por:utilizadorActual?.uid,em:serverTimestamp()}).catch(()=>{});
    mostrarNotif('✖ Conversa fechada.');
    fecharChatSecretaria();
  } catch(e){ console.error(e); }
};

// ── Chips de resposta rápida ────────────────────────────────
window.preencherResposta = function(texto) {
  const input = document.getElementById('chat-sec-input');
  if (!input) return;
  input.value = texto;
  input.focus();
  // Seleccionar todo o texto para o operador poder editar facilmente
  input.setSelectionRange(0, texto.length);
  // Auto-resize se textarea
  input.dispatchEvent(new Event('input'));
};

// ── Painel de detalhes do pedido — toggle mobile ────────────
window.toggleDetalhesPedido = function() {
  const painel = document.getElementById('chat-pedido-detalhes');
  const btn    = document.getElementById('chat-btn-ver-pedido');
  if (!painel) return;
  const expandido = painel.classList.toggle('expandido');
  if (btn) btn.innerHTML = expandido ? '✕ Fechar' : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg> Ver pedido`;
};

// ── Indicador "a escrever…" (para activar quando backend suportar) ──
window.mostrarEscrevendo = function(visivel) {
  const el = document.getElementById('chat-typing-indicator');
  if (el) el.style.display = visivel ? 'flex' : 'none';
};

// ── Histórico de pedido ──────────────────────────────────
window.verHistoricoPedido = async function(id) {
  const modal = document.getElementById('modal-historico-sec');
  const info  = document.getElementById('modal-historico-sec-info');
  const lista = document.getElementById('modal-historico-sec-lista');
  info.textContent = '⏳ A carregar…';
  lista.innerHTML  = '';
  modal.style.display = 'flex';
  try {
    const snap = await getDoc(doc(db,'pedidos_secretaria',id));
    const p = snap.data();
    const assunto = ASSUNTOS_SEC[p.assunto]||p.assunto||'—';
    info.innerHTML = `<strong>${p.funcionarioNome||'—'}</strong> · ${assunto}<br>
      <span style="opacity:.7;font-size:12px">${p.unidade||'—'} · ${p.criadoEm?.toDate?p.criadoEm.toDate().toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric'}):''}</span>`;
    const hist = p.historico || [];
    const ICONES = {'Em análise':'🔍','Respondido':'💬','Fechado':'✖','Confirmada':'✅','Recusada':'❌','Remarcada':'🔄'};
    lista.innerHTML = (hist.length === 0
      ? '<div style="text-align:center;padding:24px;opacity:.5;font-size:13px">Sem registos de alterações ainda</div>'
      : hist.slice().reverse().map(h => {
          const dt = h.em ? new Date(h.em).toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
          return `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <div style="font-size:18px;line-height:1.2">${ICONES[h.acao]||'•'}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700;color:var(--txt-pri)">${h.acao}</div>
              ${h.detalhe?`<div style="font-size:12px;color:var(--txt-sec);margin-top:3px">${h.detalhe.substring(0,120)}</div>`:''}
              <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:4px">${h.por||'—'} · ${dt}</div>
            </div>
          </div>`;
        }).join('')
    ) + `<div style="display:flex;gap:12px;padding:12px 0">
      <div style="font-size:18px;line-height:1.2">📬</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--txt-pri)">Pedido criado</div>
        <div style="font-size:12px;color:var(--txt-sec);margin-top:3px">${(p.mensagem||'').substring(0,80)}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:4px">${p.funcionarioNome||'—'} · ${p.criadoEm?.toDate?p.criadoEm.toDate().toLocaleDateString('pt-AO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}</div>
      </div>
    </div>`;
  } catch(e){ console.error(e); info.textContent='⚠️ Erro ao carregar histórico.'; }
};

// ── WATCHER SECRETARIA — pedidos novos + reuniões pendentes ──
let _unsubPedidosSec = null, _unsubReunioesSec = null, _unsubReunioesConf = null;
let _pedidosNovos = [], _reunioesPend = [], _reunioesConfirmadas = [];

function iniciarWatcherSecretaria() {
  if (_unsubPedidosSec) _unsubPedidosSec();
  if (_unsubReunioesSec) _unsubReunioesSec();
  if (_unsubReunioesConf) _unsubReunioesConf();

  _unsubPedidosSec = onSnapshot(
    query(collection(db,'pedidos_secretaria'), where('naoLidasSecretaria','>',0)),
    snap => { _pedidosNovos = snap.docs.map(d=>({id:d.id,...d.data()})); actualizarSinoSecretaria(); },
    err => console.error('Watcher pedidos sec:',err)
  );
  _unsubReunioesSec = onSnapshot(
    query(collection(db,'reunioes'), where('estado','==','pendente')),
    snap => { _reunioesPend = snap.docs.map(d=>({id:d.id,...d.data()})); actualizarSinoSecretaria(); },
    err => console.error('Watcher reunioes sec:',err)
  );
  // Watcher para reuniões confirmadas (para calcular agenda de hoje)
  _unsubReunioesConf = onSnapshot(
    query(collection(db,'reunioes'), where('estado','==','confirmada')),
    snap => { _reunioesConfirmadas = snap.docs.map(d=>({id:d.id,...d.data()})); actualizarDashHomeSecretaria(); },
    err => console.error('Watcher reunioes conf:',err)
  );
}

function actualizarSinoSecretaria() {
  const nUrgente = _pedidosNovos.length;   // requerem acção
  const nInfo    = _reunioesPend.length;   // pendentes (a gerir)
  const total    = nUrgente + nInfo;
  const lista    = document.getElementById('notif-drop-lista');

  // Badge dual SVG
  actualizarBadgeSino(nUrgente, nInfo);

  // ── Actualizar KPIs da barra de status da Secretaria ──
  const sbNovos = document.getElementById('sec-sb-novos');
  const sbPend  = document.getElementById('sec-sb-pend');
  const sbTotal = document.getElementById('sec-sb-total');
  if (sbNovos) sbNovos.textContent = nUrgente;
  if (sbPend)  sbPend.textContent  = nInfo;
  if (sbTotal) sbTotal.textContent = total;

  if (!lista) return;

  // Construir lista de items normalizada para o renderizador genérico
  const items = [];

  _pedidosNovos.forEach(p => {
    if (_notifDispensadas.has(p.id)) return;
    const assunto = ASSUNTOS_SEC[p.assunto] || p.assunto || '—';
    items.push({
      id:       p.id,
      tipo:     'urgente',
      icon:     `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='20' height='16' x='2' y='4' rx='2'/><path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'/></svg>`,
      icClasse: 'notif-ic-pend',
      titulo:   p.funcionarioNome || '—',
      sub:      assunto + (p.naoLidasSecretaria > 1 ? ` · ${p.naoLidasSecretaria} msgs` : ''),
      href:     '#',
      onclick:  `mostrarSecção('secretaria');filtrarSecretaria('pedidos',document.getElementById('tab-sec-pedidos'))`,
      ts:       p.ultimaMensagemEm || p.criadoEm || null,
    });
  });

  _reunioesPend.forEach(r => {
    if (_notifDispensadas.has(r.id)) return;
    const dest = DEST_REUNIAO[r.destinatario] || r.destinatario || '—';
    items.push({
      id:       r.id,
      tipo:     'urgente',
      icon:     `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2v4'/><path d='M16 2v4'/><rect width='18' height='18' x='3' y='4' rx='2'/><path d='M3 10h18'/></svg>`,
      icClasse: 'notif-ic-pend',
      titulo:   r.funcionarioNome || '—',
      sub:      dest,
      href:     '#',
      onclick:  `mostrarSecção('secretaria');filtrarSecretaria('reunioes',document.getElementById('tab-sec-reunioes'))`,
      ts:       r.criadoEm || null,
    });
  });

  lista.innerHTML = _renderNotifAgrupada(items);

  // Sincronizar também o dashboard home da secretaria
  actualizarDashHomeSecretaria();
}

// ── M1 fix: população em tempo real do dashboard home da secretaria ──
function actualizarDashHomeSecretaria() {
  const dashEl = document.getElementById('dash-home-secretaria');
  if (!dashEl || dashEl.style.display === 'none') return;

  const nPed = _pedidosNovos.length;
  const nReu = _reunioesPend.length;
  const total = nPed + nReu;

  // Reuniões confirmadas para hoje
  const hoje = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const nConf = _reunioesConfirmadas.filter(r => {
    if (!r.dataPreferida) return false;
    if (r.dataPreferida?.toDate) {
      return r.dataPreferida.toDate().toISOString().split('T')[0] === hoje;
    }
    return r.dataPreferida === hoje;
  }).length;

  // KPIs — números
  const elPed  = document.getElementById('sh-kpi-pedidos-novos');
  const elReu  = document.getElementById('sh-kpi-reunioes-pend');
  const elConf = document.getElementById('sh-kpi-reunioes-conf');
  const elTot  = document.getElementById('sh-kpi-total-aberto');
  if (elPed)  elPed.textContent  = nPed;
  if (elReu)  elReu.textContent  = nReu;
  if (elConf) elConf.textContent = nConf;
  if (elTot)  elTot.textContent  = total;

  // Urgência contextual: fundo âmbar + número âmbar quando há pedidos novos
  const kpiPedCard = document.getElementById('sh-kpi-card-pedidos');
  if (kpiPedCard) kpiPedCard.classList.toggle('kpi-urgente', nPed > 0);

  // Verde "hoje": só quando há reuniões confirmadas para hoje
  const kpiConfCard = document.getElementById('sh-kpi-card-conf');
  if (kpiConfCard) kpiConfCard.classList.toggle('kpi-hoje', nConf > 0);

  // Badge pedidos
  const badgePed = document.getElementById('sh-fila-pedidos-badge');
  if (badgePed) badgePed.textContent = nPed;

  // Fila pedidos (máx 5)
  const listaPed = document.getElementById('sh-fila-pedidos-lista');
  if (listaPed) {
    if (nPed === 0) {
      listaPed.innerHTML = '<div class="sec-home-fila-vazio">✅ Sem pedidos novos</div>';
    } else {
      listaPed.innerHTML = _pedidosNovos.slice(0, 5).map(p => {
        const assunto = ASSUNTOS_SEC[p.assunto] || p.assunto || '—';
        const data = p.criadoEm?.toDate
          ? p.criadoEm.toDate().toLocaleDateString('pt-AO', { day:'2-digit', month:'short' })
          : '—';
        return `<div class="sec-home-item"
          onclick="mostrarSecção('secretaria');filtrarSecretaria('pedidos',document.getElementById('tab-sec-pedidos'))">
          <div class="sec-home-item-ic"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
          <div class="sec-home-item-corpo">
            <div class="sec-home-item-nome">${p.funcionarioNome || '—'}</div>
            <div class="sec-home-item-meta">${assunto} · ${data}</div>
          </div>
          <span class="sec-home-item-estado estado-novo">Novo</span>
        </div>`;
      }).join('');
    }
  }

  // Badge reuniões
  const badgeReu = document.getElementById('sh-fila-reunioes-badge');
  if (badgeReu) badgeReu.textContent = nReu;

  // Fila reuniões (máx 4)
  const listaReu = document.getElementById('sh-fila-reunioes-lista');
  if (listaReu) {
    if (nReu === 0) {
      listaReu.innerHTML = '<div class="sec-home-fila-vazio">✅ Sem reuniões pendentes</div>';
    } else {
      listaReu.innerHTML = _reunioesPend.slice(0, 4).map(r => {
        const dest = DEST_REUNIAO[r.destinatario] || r.destinatario || '—';
        const data = r.dataPreferida || (r.criadoEm?.toDate
          ? r.criadoEm.toDate().toLocaleDateString('pt-AO', { day:'2-digit', month:'short' })
          : '—');
        return `<div class="sec-home-item"
          onclick="mostrarSecção('secretaria');filtrarSecretaria('reunioes',document.getElementById('tab-sec-reunioes'))">
          <div class="sec-home-item-ic reuniao"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></div>
          <div class="sec-home-item-corpo">
            <div class="sec-home-item-nome">${r.funcionarioNome || '—'}</div>
            <div class="sec-home-item-meta">${dest} · ${data}</div>
          </div>
          <span class="sec-home-item-estado estado-pendente">Pendente</span>
        </div>`;
      }).join('');
    }
  }
}

// ══════════════════════════════════════════════════════════
//  SESSÕES ACTIVAS — leitura e expulsão remota
// ══════════════════════════════════════════════════════════
window.carregarSessoesActivas = async function() {
  if (!_exigirPerfil(['admin','chefe','director'])) return;
  const el = document.getElementById('lista-sessoes-activas');
  el.innerHTML = '<div class="vazio-estado"><p>⏳ A carregar…</p></div>';
  try {
    // Utilizadores com sessaoToken definido (não null) = sessão activa
    const snap = await getDocs(query(
      collection(db,'utilizadores'),
      where('sessaoToken','!=',null)
    ));
    if (snap.empty) {
      el.innerHTML = '<div class="vazio-estado"><div class="icone">🟢</div><p>Nenhuma sessão activa.</p></div>';
      return;
    }
    let html = '';
    snap.forEach(d => {
      const u = d.data(), uid = d.id;
      const acesso = u.ultimoAcesso?.toDate ? fmtData(u.ultimoAcesso.toDate()) : '—';
      const disp = u.dispositivo
        ? u.dispositivo.includes('Mobile') ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='14' height='20' x='5' y='2' rx='2' ry='2'/><path d='M12 18h.01'/></svg> Móvel` : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='20' height='14' x='2' y='3' rx='2'/><path d='M8 21h8'/><path d='M12 17v4'/></svg> Computador`
        : '—';
      const isSelf = uid === utilizadorActual?.uid;
      const btnExpulsar = isSelf
        ? `<span style="font-size:11px;color:var(--neu-400)">Tu</span>`
        : `<button class="btn-expulsar"
             data-uid="${uid}"
             data-nome="${escaparHtml(u.nome||u.email||'—')}"
             onclick="expulsarSessao(this.dataset.uid, this.dataset.nome)"
             style="display:inline-flex;align-items:center;gap:5px"><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' x2='9' y1='12' y2='12'/></svg> Expulsar</button>`;
      html += `<div class="sa-item">
        <div class="sa-pulse"></div>
        <div class="sa-info">
          <div class="sa-nome">${escaparHtml(u.nome||u.email||uid)}</div>
          <div class="sa-det">${etiquetasPerfil[u.perfil]||escaparHtml(u.perfil||'—')} · ${disp} · ${acesso}</div>
        </div>
        ${btnExpulsar}
      </div>`;
    });
    el.innerHTML = html;
  } catch(e) {
    console.error(e);
    el.innerHTML = '<div class="vazio-estado"><p>⚠️ Erro ao carregar sessões activas.</p></div>';
  }
};

window.expulsarSessao = async function(uid, nome) {
  if (!_exigirPerfil(['admin','chefe','director'])) return;
  if (!confirm(`Expulsar a sessão de ${nome}?\nO utilizador será desligado em segundos.`)) return;
  try {
    // Anular o sessaoToken — o listener no portal detecta e faz logout
    await updateDoc(doc(db,'utilizadores',uid), { sessaoToken: null });
    mostrarNotif(`⏏ Sessão de ${nome} encerrada.`, 'sucesso');
    setTimeout(carregarSessoesActivas, 1500);
  } catch(e) {
    console.error(e);
    mostrarNotif('❌ Erro ao expulsar sessão.', 'erro');
  }
};


// ── Bottom nav mobile ────────────────────────────────────────
window.mbnIr = function(seccao) {
  mostrarSecção(seccao);
  document.querySelectorAll('.mbn-item').forEach(b => b.classList.remove('activo'));
  const btn = document.getElementById('mbn-' + seccao);
  if (btn) btn.classList.add('activo');
};

function sincronizarBadgesMobile() {
  const secBadge   = document.getElementById('mbn-badge-sec');
  const badgeSvg   = document.getElementById('sino-badge-svg');
  if (secBadge && badgeSvg) {
    const numEl = document.getElementById('sino-badge-num');
    const n = numEl ? parseInt(numEl.textContent) || 0 : 0;
    secBadge.textContent = n > 0 ? n : '';
    secBadge.style.display = n > 0 ? 'flex' : 'none';
  }
  const notifBadge = document.getElementById('mbn-badge-notif');
  const dot        = document.getElementById('notif-dot');
  if (notifBadge && dot) {
    const vis = dot.style.display !== 'none' && dot.className.includes('visivel');
    notifBadge.style.display = vis ? 'flex' : 'none';
  }
}
// C13 fix: polling removido — sincronizarBadgesMobile() é agora chamada
// directamente em actualizarBadgeSino(), reagindo a cada mudança real.
sincronizarBadgesMobile(); // chamada inicial para estado de arranque
