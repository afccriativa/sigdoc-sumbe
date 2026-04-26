/**
 * SIGDOC-SUMBE — Navegação Lateral Partilhada
 * Inclui este ficheiro em qualquer página e chama:
 *   SIGDOC_NAV.mount({ pagina: 'painel', nome: 'Nome', perfil: 'admin' })
 *
 * Páginas válidas: 'index' | 'cadastro' | 'portal' | 'aprovacoes' |
 *                  'auditoria' | 'painel' | 'unidades' | 'utilizadores'
 */

window.SIGDOC_NAV = (function () {

  /* ─────────────────────────────────────────
     ESTRUTURA DE NAVEGAÇÃO
  ───────────────────────────────────────── */
  /* ── Helper interno: gera SVG string para item de navegação ── */
  function _svg(name, size, sw) {
    size = size || 16; sw = sw || '1.75';
    var paths = {
      'dashboard':    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
      'users':        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      'file-text':    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
      'check-square': '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
      'shield':       '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      'activity':     '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      'building':     '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8"/><path d="M18 9h2a2 2 0 0 1 2 2v11"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="10" y1="10" x2="14" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/><line x1="10" y1="18" x2="14" y2="18"/>',
      'pie-chart':    '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
      'book-open':    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      'calendar':     '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      'settings':     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      'layers':       '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
      'log-out':      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
      'menu':         '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
      'x':            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  const GRUPOS = [
    {
      label: 'PRINCIPAL',
      itens: [
        { id: 'index',        icon: _svg('dashboard'),    texto: 'Dashboard',         href: 'index.html',              perfis: ['admin','director','chefe','tecnico','funcionario'] },
        { id: 'cadastro',     icon: _svg('users'),        texto: 'Cadastro',          href: 'cadastro.html',           perfis: ['admin','director','chefe','tecnico'] },
        { id: 'portal',       icon: _svg('file-text'),    texto: 'Documentos',        href: 'documentos.html',         perfis: ['admin','director','chefe','tecnico'] },
        { id: 'aprovacoes',   icon: _svg('check-square'), texto: 'Aprovações',        href: 'aprovacao.html',          perfis: ['admin','director','chefe'] },
      ]
    },
    {
      label: 'GESTÃO',
      itens: [
        { id: 'auditoria',    icon: _svg('shield'),       texto: 'Auditoria',         href: 'auditoria.html',          perfis: ['admin','director','chefe'] },
        { id: 'painel',       icon: _svg('activity'),     texto: 'Painel RH',         href: 'painel.html',             perfis: ['admin','director'] },
        { id: 'unidades',     icon: _svg('building'),     texto: 'Unidades',          href: 'unidades.html',           perfis: ['admin','director','chefe','tecnico','secretaria'] },
        { id: 'estatisticas', icon: _svg('pie-chart'),    texto: 'Estatísticas',      href: 'estatisticas.html',       perfis: ['admin','director','chefe','tecnico'] },
        { id: 'relatorios',   icon: _svg('book-open'),    texto: 'Relatórios',        href: 'relatorios.html',         perfis: ['admin','director','chefe','tecnico'] },
        { id: 'ferias',       icon: _svg('calendar'),     texto: 'Férias/Ausências',  href: 'ferias.html',             perfis: ['admin','director','chefe','tecnico'] },
        { id: 'utilizadores', icon: _svg('settings'),     texto: 'Utilizadores',      href: 'index.html#utilizadores', perfis: ['admin'] },
      ]
    }
  ];

  const PERFIL_LABEL = {
    admin:       'Administrador',
    director:    'Director Municipal',
    chefe:       'Chefe de Secção',
    chefe_unidade: 'Chefe de Unidade',
    tecnico:     'Técnico de RH',
    secretaria:  'Secretaria',
    funcionario: 'Funcionário'
  };

  /* ─────────────────────────────────────────
     CSS
  ───────────────────────────────────────── */
  const CSS = `
    /* ── Reset de layout para acomodar sidebar ── */
    html, body { height: 100%; }
    body.sigdoc-nav-ready { display: flex; min-height: 100vh; }

    /* ── Sidebar ── */
    #sigdoc-sidebar {
      width: 220px;
      min-width: 220px;
      background: #111827;
      border-right: 1px solid rgba(255,255,255,.07);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 200;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.1) transparent;
      transition: transform .3s cubic-bezier(.4,0,.2,1);
    }
    #sigdoc-sidebar::-webkit-scrollbar { width: 4px; }
    #sigdoc-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }

    /* ── Conteúdo da página desloca para a direita ── */
    #sigdoc-page-content {
      flex: 1;
      margin-left: 220px;
      min-width: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Brand ── */
    .snav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 18px 18px;
      border-bottom: 1px solid rgba(255,255,255,.07);
    }
    .snav-brand-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #064e35, #10c886);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      color: #fff;
    }
    .snav-brand-icon svg {
      width: 18px; height: 18px;
      display: block;
    }
    .snav-brand-nome {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 800; color: #fff; line-height: 1.1;
    }
    .snav-brand-sub {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 10px; color: rgba(255,255,255,.4); margin-top: 2px;
    }

    /* ── Grupos de navegação ── */
    .snav-body { flex: 1; padding: 14px 0; }
    .snav-grupo { margin-bottom: 6px; }
    .snav-grupo-label {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 9px; font-weight: 700;
      letter-spacing: 1.4px; text-transform: uppercase;
      color: rgba(255,255,255,.25);
      padding: 10px 18px 6px;
    }

    /* ── Item de navegação ── */
    .snav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 18px;
      margin: 1px 8px;
      border-radius: 8px;
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 500;
      color: rgba(255,255,255,.55);
      text-decoration: none;
      cursor: pointer;
      transition: all .18s ease;
      position: relative;
    }
    .snav-item:hover {
      background: rgba(255,255,255,.07);
      color: rgba(255,255,255,.9);
    }
    .snav-item.snav-activo {
      background: rgba(16,200,134,.14);
      color: #10c886;
      font-weight: 700;
    }
    .snav-item.snav-activo::before {
      content: '';
      position: absolute;
      left: -8px; top: 50%;
      transform: translateY(-50%);
      width: 3px; height: 20px;
      background: #10c886;
      border-radius: 0 3px 3px 0;
    }
    .snav-item-icon {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .snav-item-icon svg {
      width: 16px; height: 16px;
      display: block;
    }
    .snav-item-texto { line-height: 1; }

    /* ── Badge de notificação (opcional) ── */
    .snav-badge {
      margin-left: auto;
      background: #ef4444;
      color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 1px 6px;
      border-radius: 10px;
      min-width: 18px; text-align: center;
    }

    /* ── Divider ── */
    .snav-divider {
      height: 1px;
      background: rgba(255,255,255,.06);
      margin: 8px 18px;
    }

    /* ── Footer: utilizador ── */
    .snav-footer {
      padding: 14px 14px;
      border-top: 1px solid rgba(255,255,255,.07);
      display: flex; align-items: center; gap: 10px;
    }
    .snav-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #064e35, #10c886);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: #fff;
      flex-shrink: 0;
    }
    .snav-user-info { flex: 1; min-width: 0; }
    .snav-user-nome {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 700; color: #fff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .snav-user-perfil {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      font-size: 10px; color: rgba(255,255,255,.4); margin-top: 2px;
    }
    .snav-logout-btn {
      background: none; border: none;
      color: rgba(255,255,255,.3);
      cursor: pointer; padding: 4px; border-radius: 6px;
      transition: all .18s; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
    }
    .snav-logout-btn svg {
      width: 15px; height: 15px;
      display: block;
    }
    .snav-logout-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }

    /* ── Botão toggler mobile ── */
    #sigdoc-nav-toggle {
      display: none;
      position: fixed;
      top: 14px; left: 14px; z-index: 300;
      background: #111827;
      border: 1px solid rgba(255,255,255,.12);
      color: #fff; width: 36px; height: 36px;
      border-radius: 8px;
      align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.4);
    }
    #sigdoc-nav-toggle svg { width: 18px; height: 18px; display: block; }

    /* ── Overlay mobile ── */
    #sigdoc-nav-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,.6);
      z-index: 190;
      backdrop-filter: blur(2px);
    }

    /* ── Tooltip para modo colapsado (futuro) ── */
    .snav-tooltip {
      position: absolute;
      left: calc(100% + 10px); top: 50%;
      transform: translateY(-50%);
      background: #1a2236;
      border: 1px solid rgba(255,255,255,.12);
      color: #fff; font-size: 11px; font-weight: 600;
      padding: 4px 10px; border-radius: 6px;
      white-space: nowrap; pointer-events: none;
      opacity: 0; transition: opacity .15s;
      z-index: 999;
    }

    /* ── Responsivo ── */
    @media (max-width: 768px) {
      #sigdoc-sidebar {
        transform: translateX(-100%);
        box-shadow: 4px 0 40px rgba(0,0,0,.5);
      }
      #sigdoc-sidebar.snav-aberto {
        transform: translateX(0);
      }
      #sigdoc-page-content {
        margin-left: 0 !important;
      }
      #sigdoc-nav-toggle {
        display: flex;
      }
      #sigdoc-nav-overlay.snav-aberto {
        display: block;
      }
    }
  `;

  /* ─────────────────────────────────────────
     RENDER HTML
  ───────────────────────────────────────── */
  function buildSidebar(config) {
    const authz = window.SIGDOC_AUTHZ;
    const perfilInfo = authz
      ? authz.normalizarPerfilDoc(config.roles || config.perfil || 'funcionario')
      : { perfilPrincipal: config.perfil || 'funcionario', roles: [config.perfil || 'funcionario'] };
    const perfil = perfilInfo.perfilPrincipal || 'funcionario';
    const roles = perfilInfo.roles || [perfil];
    const perfilLabel = authz
      ? authz.obterEtiquetaPrincipal(perfilInfo, PERFIL_LABEL)
      : (PERFIL_LABEL[perfil] || perfil);
    const iniciais = (config.nome || '?').split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();

    // Grupos filtrados por roles
    const gruposHtml = GRUPOS.map(grupo => {
      const itensHtml = grupo.itens
        .filter(item => item.perfis.some(role => roles.includes(role)))
        .map(item => {
          const activo = item.id === config.pagina ? ' snav-activo' : '';
          const badge = (config.badges && config.badges[item.id])
            ? `<span class="snav-badge">${config.badges[item.id]}</span>` : '';
          return `
            <a class="snav-item${activo}" href="${item.href}" data-pagina="${item.id}">
              <span class="snav-item-icon">${item.icon}</span>
              <span class="snav-item-texto">${item.texto}</span>
              ${badge}
            </a>`;
        }).join('');

      if (!itensHtml.trim()) return '';
      return `
        <div class="snav-grupo">
          <div class="snav-grupo-label">${grupo.label}</div>
          ${itensHtml}
        </div>`;
    }).join('');

    return `
      <!-- TOGGLE MOBILE -->
      <button id="sigdoc-nav-toggle" onclick="SIGDOC_NAV.toggle()" aria-label="Menu">${_svg('menu', 18, '2')}</button>
      <div id="sigdoc-nav-overlay" onclick="SIGDOC_NAV.toggle()"></div>

      <!-- SIDEBAR -->
      <aside id="sigdoc-sidebar" role="navigation" aria-label="Navegação SIGDOC">

        <!-- Brand -->
        <div class="snav-brand">
          <div class="snav-brand-icon">${_svg('layers', 18, '1.5')}</div>
          <div>
            <div class="snav-brand-nome">SIGDOC-SUMBE</div>
            <div class="snav-brand-sub">Gestão Documental e RH</div>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="snav-body">
          ${gruposHtml}
        </nav>

        <!-- Divider -->
        <div class="snav-divider"></div>

        <!-- Footer utilizador -->
        <div class="snav-footer">
          <div class="snav-avatar" id="snav-avatar">${iniciais}</div>
          <div class="snav-user-info">
            <div class="snav-user-nome" id="snav-nome">${config.nome || '—'}</div>
            <div class="snav-user-perfil" id="snav-perfil">${perfilLabel}</div>
          </div>
          <button class="snav-logout-btn" onclick="SIGDOC_NAV.logout()" title="Terminar sessão">${_svg('log-out', 15, '2')}</button>
        </div>

      </aside>`;
  }

  /* ─────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────── */
  let _config = {};
  let _aberto = false;

  return {

    /**
     * Inicializa a navegação.
     * @param {Object} config
     * @param {string} config.pagina   - ID da página actual (ex: 'painel')
     * @param {string} config.nome     - Nome do utilizador
     * @param {string} config.perfil   - Perfil: admin|director|chefe|tecnico|funcionario
     * @param {string[]} [config.roles] - Lista de roles do utilizador
     * @param {Object} [config.badges] - Ex: { aprovacoes: 3 }
     * @param {Function} [config.onLogout] - Callback de logout personalizado
     */
    mount(config) {
      _config = config;

      // Injectar CSS
      if (!document.getElementById('sigdoc-nav-style')) {
        const style = document.createElement('style');
        style.id = 'sigdoc-nav-style';
        style.textContent = CSS;
        document.head.appendChild(style);
      }

      // Envolver conteúdo existente do body num wrapper
      const bodyChildren = Array.from(document.body.childNodes);
      const pageContent = document.createElement('div');
      pageContent.id = 'sigdoc-page-content';
      bodyChildren.forEach(node => pageContent.appendChild(node));
      document.body.appendChild(pageContent);

      // Injectar sidebar antes do content wrapper
      const navContainer = document.createElement('div');
      navContainer.innerHTML = buildSidebar(config);
      while (navContainer.firstChild) {
        document.body.insertBefore(navContainer.firstChild, pageContent);
      }

      // Preparar layout body
      document.body.classList.add('sigdoc-nav-ready');

      // Fechar sidebar ao clicar num link (mobile)
      document.querySelectorAll('.snav-item').forEach(el => {
        el.addEventListener('click', () => {
          if (window.innerWidth <= 768) this.fechar();
        });
      });

      // Atalho de teclado: Alt+M para abrir/fechar
      document.addEventListener('keydown', e => {
        if (e.altKey && e.key === 'm') this.toggle();
      });
    },

    /** Actualiza dados do utilizador sem re-renderizar tudo */
    setUser(nome, perfil, roles) {
      const authz = window.SIGDOC_AUTHZ;
      const perfilInfo = authz
        ? authz.normalizarPerfilDoc(roles ? { perfil, roles } : perfil)
        : { perfilPrincipal: perfil };
      const el_nome   = document.getElementById('snav-nome');
      const el_perfil = document.getElementById('snav-perfil');
      const el_avatar = document.getElementById('snav-avatar');
      if (el_nome)   el_nome.textContent   = nome;
      if (el_perfil) {
        el_perfil.textContent = authz
          ? authz.obterEtiquetaPrincipal(perfilInfo, PERFIL_LABEL)
          : (PERFIL_LABEL[perfil] || perfil);
      }
      if (el_avatar) el_avatar.textContent = nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
    },

    /** Actualiza badges de notificação */
    setBadges(badges) {
      Object.entries(badges).forEach(([paginaId, count]) => {
        const item = document.querySelector(`.snav-item[data-pagina="${paginaId}"]`);
        if (!item) return;
        let badge = item.querySelector('.snav-badge');
        if (count > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'snav-badge';
            item.appendChild(badge);
          }
          badge.textContent = count;
        } else if (badge) {
          badge.remove();
        }
      });
    },

    toggle() {
      const sidebar  = document.getElementById('sigdoc-sidebar');
      const overlay  = document.getElementById('sigdoc-nav-overlay');
      const toggle   = document.getElementById('sigdoc-nav-toggle');
      _aberto = !_aberto;
      sidebar.classList.toggle('snav-aberto', _aberto);
      overlay.classList.toggle('snav-aberto', _aberto);
      if (toggle) toggle.innerHTML = _aberto ? _svg('x', 18, '2') : _svg('menu', 18, '2');
    },

    fechar() {
      const sidebar  = document.getElementById('sigdoc-sidebar');
      const overlay  = document.getElementById('sigdoc-nav-overlay');
      const toggle   = document.getElementById('sigdoc-nav-toggle');
      _aberto = false;
      sidebar.classList.remove('snav-aberto');
      overlay.classList.remove('snav-aberto');
      if (toggle) toggle.innerHTML = _svg('menu', 18, '2');
    },

    logout() {
      if (_config.onLogout) {
        _config.onLogout();
      } else {
        // Comportamento padrão: tentar usar Firebase signOut se disponível
        if (window._sigdocAuth) {
          import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            .then(({ signOut }) => signOut(window._sigdocAuth))
            .then(() => { window.location.href = 'index.html'; })
            .catch(() => { window.location.href = 'index.html'; });
        } else {
          window.location.href = 'index.html';
        }
      }
    }
  };

})();


/* ═══════════════════════════════════════════════════════════════
   INSTRUÇÕES DE INTEGRAÇÃO — Como usar em qualquer página
   ═══════════════════════════════════════════════════════════════

   1. Copiar sigdoc-nav.js para a mesma pasta das páginas HTML.

   2. Adicionar no <head> da página, ANTES dos outros scripts:
      <script src="sigdoc-nav.js"></script>

   3. No bloco de autenticação Firebase, após confirmar o perfil,
      chamar SIGDOC_NAV.mount(). Exemplo para auditoria.html:

      // Mostrar painel
      document.getElementById("ecra-carregando").style.display = "none";
      document.getElementById("ecra-principal").style.display = "block";

      // Montar navegação
      SIGDOC_NAV.mount({
        pagina:   'auditoria',          // id da página actual
        nome:     nome,                 // nome do utilizador
        perfil:   perfil,               // perfil Firebase
        onLogout: async () => {
          const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
          await signOut(auth);
          window.location.href = "index.html";
        }
      });

   4. Remover o botão "← Painel" / "← Voltar" das topbars
      (a sidebar já substitui essa navegação).

   5. IDs das páginas disponíveis:
      'index'       → index.html        (Dashboard)
      'cadastro'    → cadastro.html     (Cadastro)
      'portal'      → portal.html       (Documentos)
      'aprovacoes'  → aprovacoes.html   (Aprovações)
      'auditoria'   → auditoria.html    (Auditoria)
      'painel'      → painel.html       (Painel RH)
      'utilizadores'→ index.html        (Utilizadores)

   6. Para mostrar badges (ex: 3 aprovações pendentes):
      SIGDOC_NAV.setBadges({ aprovacoes: 3 });

═══════════════════════════════════════════════════════════════ */
