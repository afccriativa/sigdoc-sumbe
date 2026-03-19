/**
 * sigdoc-session.js — Gestão de Sessão Concorrente
 * SIGDOC-SUMBE · Direcção Municipal de Saúde do Sumbe
 *
 * Detecta e invalida sessões duplicadas em tempo real via Firestore onSnapshot.
 * Quando um utilizador abre o sistema noutro browser/aba, a sessão mais antiga
 * é terminada automaticamente com uma mensagem explicativa.
 *
 * ── Uso (após auth confirmar) ──────────────────────────────────────────────
 *
 *   // No login (index.html / carregarPerfil):
 *   const token = SIGDOC_SESSION.gerarToken();
 *   await SIGDOC_SESSION.registarLogin(db, user.uid, token, { updateDoc, doc, serverTimestamp });
 *
 *   // Em cada página protegida (depois de SIGDOC_NAV.mount):
 *   SIGDOC_SESSION.vigiar(db, user.uid, auth, { onSnapshot, doc, signOut });
 *
 * ── Campos escritos em utilizadores/{uid} ──────────────────────────────────
 *   sessaoToken  : string UUID — token único da sessão activa
 *   dispositivo  : string — user-agent resumido + timestamp
 *   ultimoAcesso : Timestamp Firestore
 *
 * ── Regra Firestore necessária (já existe) ─────────────────────────────────
 *   allow update: if autenticado() && request.auth.uid == uid
 *     && request.resource.data.diff(resource.data)
 *                            .affectedKeys()
 *                            .hasOnly(['sessaoToken','ultimoAcesso','dispositivo']);
 */

window.SIGDOC_SESSION = (function () {

  // Chave de armazenamento local — sessionStorage (morre ao fechar o tab/browser)
  const STORAGE_KEY = 'sigdoc_session_token';
  const HEARTBEAT_INTERVALO = 5 * 60 * 1000; // 5 minutos

  let _unsub          = null;
  let _heartbeatTimer = null;
  let _terminando     = false; // evitar loops

  // ────────────────────────────────────────────────────────────
  //  UTILITÁRIOS
  // ────────────────────────────────────────────────────────────

  /** Gera um UUID v4 simples sem dependências externas */
  function gerarToken() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    // fallback manual
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  /** Resumo do user-agent para identificar o dispositivo */
  function resumoDispositivo() {
    const ua = navigator.userAgent;
    let browser = 'Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg'))  browser = 'Chrome';
    else if (ua.includes('Firefox'))                    browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg'))                        browser = 'Edge';

    let so = 'Desktop';
    if (ua.includes('Android')) so = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) so = 'iOS';
    else if (ua.includes('Windows')) so = 'Windows';
    else if (ua.includes('Mac'))     so = 'macOS';
    else if (ua.includes('Linux'))   so = 'Linux';

    const hora = new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
    return `${browser} · ${so} · ${hora}`;
  }

  // ────────────────────────────────────────────────────────────
  //  CSS DO MODAL (injectado uma única vez)
  // ────────────────────────────────────────────────────────────
  const CSS = `
    #ss-overlay{
      position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;
      display:none;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);font-family:'Plus Jakarta Sans',sans-serif;
    }
    #ss-overlay.vis{display:flex;animation:ss-fade-in .25s ease}
    @keyframes ss-fade-in{from{opacity:0}to{opacity:1}}
    #ss-caixa{
      background:#fff;border-radius:20px;padding:32px 28px;
      max-width:400px;width:100%;text-align:center;
      box-shadow:0 25px 60px rgba(0,0,0,.3);
      animation:ss-slide-up .3s cubic-bezier(.4,0,.2,1);
    }
    @keyframes ss-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    #ss-icone{font-size:48px;margin-bottom:16px;display:block}
    #ss-titulo{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px}
    #ss-msg{font-size:13px;color:#475569;line-height:1.6;margin-bottom:6px}
    #ss-dispositivo{
      font-size:11px;color:#94a3b8;font-family:'DM Mono',monospace;
      background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
      padding:8px 12px;margin:12px 0 20px;
    }
    #ss-btn{
      background:linear-gradient(135deg,#052e1c,#0b4f3a);
      color:#fff;border:none;border-radius:10px;padding:13px 24px;
      font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;
      cursor:pointer;width:100%;transition:opacity .18s;
    }
    #ss-btn:hover{opacity:.88}
    #ss-contador{font-size:11px;color:#94a3b8;margin-top:10px}
  `;

  function injectCSS() {
    if (document.getElementById('ss-css')) return;
    const s   = document.createElement('style');
    s.id      = 'ss-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mostrarModal(dispositivoNovo, onConfirm) {
    injectCSS();

    // Remover modal anterior se existir
    document.getElementById('ss-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id    = 'ss-overlay';
    overlay.innerHTML = `
      <div id="ss-caixa">
        <span id="ss-icone">⚠️</span>
        <div id="ss-titulo">Sessão terminada</div>
        <div id="ss-msg">
          Foi iniciada uma nova sessão com a sua conta noutro dispositivo ou browser.
          Por segurança, esta sessão foi encerrada.
        </div>
        <div id="ss-dispositivo">🖥 Nova sessão: ${dispositivoNovo || '—'}</div>
        <button id="ss-btn" onclick="document.getElementById('ss-overlay').remove(); (${onConfirm.toString()})()">
          Ir para o login
        </button>
        <div id="ss-contador" id="ss-cnt"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.classList.add('vis');

    // Contador regressivo — redireciona automaticamente em 15s
    let restam = 15;
    const cntEl = overlay.querySelector('#ss-contador');
    if (cntEl) cntEl.textContent = `Redireccionamento automático em ${restam}s`;
    const timer = setInterval(() => {
      restam--;
      if (cntEl) cntEl.textContent = `Redireccionamento automático em ${restam}s`;
      if (restam <= 0) {
        clearInterval(timer);
        overlay.remove();
        onConfirm();
      }
    }, 1000);
  }

  // ────────────────────────────────────────────────────────────
  //  API PÚBLICA
  // ────────────────────────────────────────────────────────────

  /**
   * Gerar e persistir token localmente.
   * Deve ser chamado ANTES de registarLogin para que o token esteja
   * disponível mesmo que o onSnapshot dispare muito rapidamente.
   */
  function gerarEPersistirToken() {
    const token = gerarToken();
    try { sessionStorage.setItem(STORAGE_KEY, token); } catch(e) { /* privado */ }
    return token;
  }

  /** Obter token local actual */
  function tokenLocal() {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
  }

  /**
   * Registar login — escreve sessaoToken em utilizadores/{uid}.
   * Chamar em carregarPerfil() no index.html, logo após auth confirmar.
   *
   * @param {Firestore} db
   * @param {string}    uid
   * @param {string}    token  — gerado por gerarEPersistirToken()
   * @param {object}    fns    — { updateDoc, doc, serverTimestamp }
   */
  async function registarLogin(db, uid, token, fns) {
    try {
      await fns.updateDoc(fns.doc(db, 'utilizadores', uid), {
        sessaoToken:  token,
        dispositivo:  resumoDispositivo(),
        ultimoAcesso: fns.serverTimestamp()
      });
    } catch(e) {
      // Não bloquear o login por falha na escrita do token
      console.warn('SIGDOC_SESSION.registarLogin: erro ao escrever token —', e.code || e.message);
    }
  }

  /**
   * Vigiar sessão — inicia onSnapshot no doc do utilizador.
   * Se sessaoToken mudar para um valor diferente do local → forçar logout.
   *
   * @param {Firestore} db
   * @param {string}    uid
   * @param {Auth}      auth
   * @param {object}    fns  — { onSnapshot, doc, signOut }
   */
  /**
   * Vigiar sessão — inicia onSnapshot no doc do utilizador.
   * Se sessaoToken mudar para um valor diferente do local → forçar logout.
   *
   * @param {Firestore} db
   * @param {string}    uid
   * @param {Auth}      auth
   * @param {object}    [fns]  — opcional: { onSnapshot, doc, signOut }
   *                             Se omitido, faz dynamic import automaticamente.
   */
  async function vigiar(db, uid, auth, fns) {
    if (!db || !uid || !auth) {
      console.warn('SIGDOC_SESSION.vigiar: parâmetros incompletos');
      return;
    }

    // Cancelar vigília anterior
    parar();
    _terminando = false;

    const tokenAtual = tokenLocal();
    if (!tokenAtual) {
      // Sem token local → sessão não foi iniciada por este módulo (acesso directo por URL?)
      // Não interferir — simplesmente não vigiar.
      return;
    }

    // Resolver funções — usar as passadas ou fazer dynamic import
    let _onSnapshot, _doc, _signOut;
    if (fns?.onSnapshot && fns?.doc && fns?.signOut) {
      _onSnapshot = fns.onSnapshot;
      _doc        = fns.doc;
      _signOut    = fns.signOut;
    } else {
      try {
        const fsModule   = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        _onSnapshot = fns?.onSnapshot || fsModule.onSnapshot;
        _doc        = fns?.doc        || fsModule.doc;
        _signOut    = fns?.signOut    || authModule.signOut;
      } catch(e) {
        console.warn('SIGDOC_SESSION.vigiar: falha no dynamic import —', e);
        return;
      }
    }

    try {
      _unsub = _onSnapshot(
        _doc(db, 'utilizadores', uid),
        (snap) => {
          if (_terminando) return;
          if (!snap.exists()) return;

          const tokenFirestore = snap.data()?.sessaoToken;

          // Se o Firestore ainda não tem token, ignorar (estado transitório)
          if (!tokenFirestore) return;

          // Token diverge → outra sessão iniciou
          if (tokenFirestore !== tokenAtual) {
            _terminando = true;
            parar(); // cancelar onSnapshot imediatamente

            const dispNovo = snap.data()?.dispositivo || '—';

            mostrarModal(dispNovo, async () => {
              try {
                await _signOut(auth);
              } catch(e) { /* já estava desligado */ }
              window.location.href = 'index.html';
            });
          }
        },
        (err) => {
          // Erros de permissão são esperados após logout — ignorar silenciosamente
          if (err.code !== 'permission-denied') {
            console.warn('SIGDOC_SESSION: erro no listener —', err.code || err.message);
          }
        }
      );
    } catch(e) {
      console.warn('SIGDOC_SESSION.vigiar: falha ao iniciar listener —', e);
    }

    // Heartbeat — mantém ultimoAcesso actualizado
    _iniciarHeartbeat(db, uid, { doc: _doc });
  }

  /** Iniciar heartbeat de ultimoAcesso */
  function _iniciarHeartbeat(db, uid, fns) {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(async () => {
      if (_terminando) return;
      try {
        const fsModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const upd = fsModule.updateDoc;
        const d   = fns?.doc || fsModule.doc;
        const sts = fsModule.serverTimestamp;
        await upd(d(db, 'utilizadores', uid), { ultimoAcesso: sts() });
      } catch(e) {
        // Falha silenciosa — utilizador pode já ter saído
      }
    }, HEARTBEAT_INTERVALO);
  }

  /** Parar vigilância e heartbeat (chamar no logout) */
  function parar() {
    if (_unsub)          { _unsub(); _unsub = null; }
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  }

  /** Limpar token local (chamar no logout voluntário) */
  function limparToken() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch(e) { /* */ }
  }

  return {
    gerarEPersistirToken,
    tokenLocal,
    registarLogin,
    vigiar,
    parar,
    limparToken,
  };

})();
