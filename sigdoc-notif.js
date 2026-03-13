/**
 * sigdoc-notif.js — Módulo de Notificações em Tempo Real
 * SIGDOC-SUMBE · Direcção Municipal de Saúde do Sumbe
 *
 * Uso em qualquer página:
 *   <script src="sigdoc-notif.js"></script>
 *   ...depois do auth:
 *   SIGDOC_NOTIF.init(db, user.uid, { onSnapshot, collection, query, where, orderBy, updateDoc, doc });
 *
 * O módulo:
 *  - Injecta um sino flutuante (🔔) com badge de não lidas
 *  - Abre um painel lateral de notificações com onSnapshot em tempo real
 *  - Mostra toast para cada nova notificação recebida
 *  - Marca como lida ao clicar
 */

window.SIGDOC_NOTIF = (function () {

  // ── Estado ──
  let _db        = null;
  let _uid       = null;
  let _fns       = {};
  let _unsub     = null;
  let _naoLidas  = 0;
  let _todas     = [];
  let _painelAberto = false;

  // ── Injectar CSS ──
  const CSS = `
    #sn-btn{
      position:fixed;top:14px;right:72px;z-index:1000;
      width:38px;height:38px;border-radius:50%;
      background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;font-size:17px;transition:all .2s;
      backdrop-filter:blur(4px);
    }
    #sn-btn:hover{background:rgba(255,255,255,.25)}
    #sn-badge{
      position:absolute;top:-4px;right:-4px;
      min-width:16px;height:16px;border-radius:99px;
      background:#dc2626;color:#fff;font-size:9px;font-weight:800;
      display:none;align-items:center;justify-content:center;
      padding:0 4px;font-family:'Plus Jakarta Sans',sans-serif;
      border:1.5px solid var(--c-800,#0b4f3a);
      animation:sn-pulse 2s ease-in-out infinite;
    }
    #sn-badge.vis{display:flex}
    @keyframes sn-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}

    #sn-painel{
      position:fixed;top:0;right:-360px;width:340px;height:100vh;
      background:#fff;z-index:999;
      box-shadow:-4px 0 30px rgba(0,0,0,.15);
      transition:right .3s cubic-bezier(.4,0,.2,1);
      display:flex;flex-direction:column;
      font-family:'Plus Jakarta Sans',sans-serif;
    }
    #sn-painel.aberto{right:0}
    #sn-overlay{
      position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:998;
      display:none;backdrop-filter:blur(1px);
    }
    #sn-overlay.vis{display:block}

    #sn-header{
      background:linear-gradient(135deg,#052e1c 0%,#0b4f3a 60%,#0d6e4f 100%);
      padding:18px 20px;display:flex;align-items:center;justify-content:space-between;
      flex-shrink:0;
    }
    #sn-header-titulo{font-size:14px;font-weight:800;color:#fff}
    #sn-header-sub{font-size:10px;color:rgba(255,255,255,.5);margin-top:2px}
    #sn-fechar{
      background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);
      color:#fff;width:28px;height:28px;border-radius:50%;
      cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
      transition:background .15s;flex-shrink:0;
    }
    #sn-fechar:hover{background:rgba(255,255,255,.28)}

    #sn-acoes{
      padding:10px 14px;border-bottom:1px solid #f1f5f9;
      display:flex;align-items:center;gap:8px;flex-shrink:0;
    }
    #sn-marcar-todas{
      font-size:11px;font-weight:600;color:#059669;cursor:pointer;
      background:rgba(16,200,134,.08);border:1px solid rgba(16,200,134,.2);
      padding:5px 12px;border-radius:20px;transition:all .15s;
      font-family:'Plus Jakarta Sans',sans-serif;
    }
    #sn-marcar-todas:hover{background:rgba(16,200,134,.16)}
    #sn-contagem{font-size:11px;color:#94a3b8;margin-left:auto}

    #sn-lista{flex:1;overflow-y:auto;padding:8px 0}
    #sn-lista::-webkit-scrollbar{width:4px}
    #sn-lista::-webkit-scrollbar-track{background:#f8fafc}
    #sn-lista::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}

    .sn-item{
      padding:12px 16px;border-bottom:1px solid #f1f5f9;
      cursor:pointer;transition:background .12s;display:flex;gap:12px;align-items:flex-start;
    }
    .sn-item:hover{background:#f8fafc}
    .sn-item.nao-lida{background:#f0fdf4;border-left:3px solid #10c886}
    .sn-item.nao-lida:hover{background:#dcfce7}
    .sn-icone{
      width:32px;height:32px;border-radius:8px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;font-size:14px;
    }
    .sn-icone-info   {background:#eff6ff}
    .sn-icone-sucesso{background:#f0fdf4}
    .sn-icone-aviso  {background:#fffbeb}
    .sn-icone-erro   {background:#fef2f2}
    .sn-corpo{flex:1;min-width:0}
    .sn-titulo{font-size:12px;font-weight:700;color:#0f172a;line-height:1.3}
    .sn-mensagem{font-size:11px;color:#475569;margin-top:2px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .sn-data{font-size:10px;color:#94a3b8;margin-top:5px;font-family:'DM Mono',monospace}
    .sn-dot{width:7px;height:7px;border-radius:50%;background:#10c886;flex-shrink:0;margin-top:4px}

    .sn-vazio{
      padding:48px 20px;text-align:center;color:#94a3b8;
    }
    .sn-vazio-ic{font-size:40px;margin-bottom:12px}
    .sn-vazio-txt{font-size:13px;font-weight:600;margin-bottom:4px;color:#64748b}
    .sn-vazio-sub{font-size:11px}

    /* Toast */
    #sn-toast{
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#064e35;color:#6ee7b7;border-left:4px solid #10c886;
      border-radius:12px;padding:12px 18px;font-size:12px;font-weight:600;
      font-family:'Plus Jakarta Sans',sans-serif;z-index:9998;
      opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap;
      box-shadow:0 8px 30px rgba(0,0,0,.2);max-width:90vw;overflow:hidden;text-overflow:ellipsis;
    }
    #sn-toast.vis{opacity:1;transform:translateX(-50%) translateY(0)}

    @media(max-width:400px){
      #sn-painel{width:100vw;right:-100vw}
    }
  `;

  function injectCSS() {
    if (document.getElementById('sn-css')) return;
    const s = document.createElement('style');
    s.id = 'sn-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Injectar HTML ──
  function injectHTML() {
    if (document.getElementById('sn-btn')) return;

    // Sino flutuante
    const btn = document.createElement('div');
    btn.id = 'sn-btn';
    btn.title = 'Notificações';
    btn.innerHTML = '🔔<span id="sn-badge"></span>';
    btn.addEventListener('click', togglePainel);
    document.body.appendChild(btn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'sn-overlay';
    overlay.addEventListener('click', fecharPainel);
    document.body.appendChild(overlay);

    // Painel lateral
    const painel = document.createElement('div');
    painel.id = 'sn-painel';
    painel.innerHTML = `
      <div id="sn-header">
        <div>
          <div id="sn-header-titulo">🔔 Notificações</div>
          <div id="sn-header-sub">Mensagens do sistema</div>
        </div>
        <button id="sn-fechar" onclick="SIGDOC_NOTIF._fechar()">✕</button>
      </div>
      <div id="sn-acoes">
        <button id="sn-marcar-todas" onclick="SIGDOC_NOTIF._marcarTodas()">✓ Marcar todas como lidas</button>
        <span id="sn-contagem">0 notificações</span>
      </div>
      <div id="sn-lista">
        <div class="sn-vazio">
          <div class="sn-vazio-ic">🔔</div>
          <div class="sn-vazio-txt">A carregar…</div>
        </div>
      </div>`;
    document.body.appendChild(painel);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'sn-toast';
    document.body.appendChild(toast);
  }

  // ── Painel ──
  function togglePainel() {
    _painelAberto ? fecharPainel() : abrirPainel();
  }
  function abrirPainel() {
    _painelAberto = true;
    document.getElementById('sn-painel').classList.add('aberto');
    document.getElementById('sn-overlay').classList.add('vis');
  }
  function fecharPainel() {
    _painelAberto = false;
    document.getElementById('sn-painel').classList.remove('aberto');
    document.getElementById('sn-overlay').classList.remove('vis');
  }

  // ── Toast ──
  let _toastTimer;
  function mostrarToast(msg) {
    const el = document.getElementById('sn-toast');
    if (!el) return;
    el.textContent = '🔔 ' + msg;
    el.classList.add('vis');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('vis'), 4000);
  }

  // ── Badge ──
  function actualizarBadge(n) {
    const badge = document.getElementById('sn-badge');
    if (!badge) return;
    _naoLidas = n;
    badge.textContent = n > 99 ? '99+' : n;
    badge.classList.toggle('vis', n > 0);
    // Actualizar título da aba
    const titulo = document.title.replace(/^\(\d+\) /, '');
    document.title = n > 0 ? `(${n}) ${titulo}` : titulo;
  }

  // ── Render lista ──
  const TIPO_ICONE = {
    info:    { ic:'ℹ️',  cls:'sn-icone-info'    },
    sucesso: { ic:'✅',  cls:'sn-icone-sucesso'  },
    aviso:   { ic:'⚠️',  cls:'sn-icone-aviso'   },
    erro:    { ic:'❌',  cls:'sn-icone-erro'     },
    documento:{ ic:'📄', cls:'sn-icone-info'     },
    ferias:  { ic:'🌴',  cls:'sn-icone-sucesso'  },
    aprovacao:{ ic:'✅', cls:'sn-icone-sucesso'  },
    rejeicao: { ic:'❌', cls:'sn-icone-erro'     },
    pedido:  { ic:'📨',  cls:'sn-icone-aviso'   },
  };

  function fmtData(ts) {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds*1000) : new Date(ts));
      const agora = new Date();
      const diff  = Math.floor((agora - d) / 60000); // minutos
      if (diff < 1)  return 'Agora mesmo';
      if (diff < 60) return `Há ${diff} min`;
      if (diff < 1440) return `Há ${Math.floor(diff/60)} h`;
      return d.toLocaleDateString('pt-AO', {day:'2-digit', month:'short'});
    } catch { return '—'; }
  }

  function renderLista() {
    const el = document.getElementById('sn-lista');
    if (!el) return;

    const contEl = document.getElementById('sn-contagem');
    if (contEl) contEl.textContent = `${_todas.length} notificação${_todas.length!==1?'ões':''}`;

    if (!_todas.length) {
      el.innerHTML = `<div class="sn-vazio">
        <div class="sn-vazio-ic">🔕</div>
        <div class="sn-vazio-txt">Sem notificações</div>
        <div class="sn-vazio-sub">Está tudo em dia por aqui.</div>
      </div>`;
      return;
    }

    el.innerHTML = _todas.map(n => {
      const tipo = TIPO_ICONE[n.tipo] || TIPO_ICONE.info;
      const lida = n.lida === true;
      return `<div class="sn-item${lida?'':' nao-lida'}" onclick="SIGDOC_NOTIF._marcarLida('${n.id}')">
        <div class="sn-icone ${tipo.cls}">${tipo.ic}</div>
        <div class="sn-corpo">
          <div class="sn-titulo">${n.titulo || 'Notificação'}</div>
          <div class="sn-mensagem">${n.corpo || ''}</div>
          <div class="sn-data">${fmtData(n.criadaEm)}</div>
        </div>
        ${lida ? '' : '<div class="sn-dot"></div>'}
      </div>`;
    }).join('');
  }

  // ── Marcar como lida ──
  async function marcarLida(id) {
    if (!_db || !id) return;
    const idx = _todas.findIndex(n => n.id === id);
    if (idx === -1 || _todas[idx].lida) return;
    try {
      await _fns.updateDoc(_fns.doc(_db, 'notificacoes', id), { lida: true });
      // onSnapshot vai actualizar automaticamente
    } catch(e) {
      console.warn('SIGDOC_NOTIF: erro ao marcar lida:', e);
    }
  }

  async function marcarTodas() {
    const naoLidas = _todas.filter(n => !n.lida);
    for (const n of naoLidas) {
      await marcarLida(n.id);
    }
  }

  // ── Inicializar listener onSnapshot ──
  function init(db, uid, fns) {
    if (!db || !uid) { console.warn('SIGDOC_NOTIF.init: db ou uid em falta'); return; }
    _db  = db;
    _uid = uid;
    _fns = fns; // { onSnapshot, collection, query, where, orderBy, updateDoc, doc }

    injectCSS();
    injectHTML();

    // Cancelar listener anterior se existir
    if (_unsub) { _unsub(); _unsub = null; }

    const { onSnapshot, collection, query, where, orderBy } = fns;

    try {
      const q = query(
        collection(db, 'notificacoes'),
        where('destinatarioUid', '==', uid),
        orderBy('criadaEm', 'desc')
      );

      const idsAntigos = new Set(_todas.map(n => n.id));

      _unsub = onSnapshot(q, (snap) => {
        const novosIds = new Set();
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Detectar notificações genuinamente novas (não lidas + não existiam antes)
        lista.forEach(n => {
          if (!n.lida && !idsAntigos.has(n.id) && idsAntigos.size > 0) {
            novosIds.add(n.id);
          }
          idsAntigos.add(n.id);
        });

        _todas = lista;
        const naoLidas = lista.filter(n => !n.lida).length;
        actualizarBadge(naoLidas);
        renderLista();

        // Toast para cada nova
        novosIds.forEach(id => {
          const n = lista.find(x => x.id === id);
          if (n) mostrarToast(n.titulo || 'Nova notificação');
        });

        // Actualizar sub-título do header do painel
        const sub = document.getElementById('sn-header-sub');
        if (sub) sub.textContent = naoLidas > 0
          ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}`
          : 'Sem mensagens por ler';

      }, (err) => {
        console.warn('SIGDOC_NOTIF: erro no listener:', err.code || err.message);
        // Erros de permissão são silenciosos — o utilizador pode não ter notificações
      });

    } catch(e) {
      console.warn('SIGDOC_NOTIF: init falhou:', e);
    }
  }

  // ── Destruir (quando a página faz signOut) ──
  function destroy() {
    if (_unsub) { _unsub(); _unsub = null; }
    _todas = []; _naoLidas = 0;
    ['sn-btn','sn-painel','sn-overlay','sn-toast','sn-css'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  return {
    init,
    destroy,
    _fechar: fecharPainel,
    _marcarLida: marcarLida,
    _marcarTodas: marcarTodas,
  };

})();
