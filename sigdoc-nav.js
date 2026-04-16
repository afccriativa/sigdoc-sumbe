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
  const GRUPOS = [
    {
      label: 'PRINCIPAL',
      itens: [
        { id: 'index',       icon: '📊', texto: 'Dashboard',    href: 'index.html',       perfis: ['admin','director','chefe','tecnico','funcionario'] },
        { id: 'cadastro',    icon: '👤', texto: 'Cadastro',     href: 'cadastro.html',    perfis: ['admin','director','chefe','tecnico'] },
        { id: 'portal',      icon: '📄', texto: 'Documentos',   href: 'documentos.html',  perfis: ['admin','director','chefe','tecnico'] },
        { id: 'aprovacoes',  icon: '✅', texto: 'Aprovações',   href: 'aprovacao.html',  perfis: ['admin','director','chefe'] },
      ]
    },
    {
      label: 'GESTÃO',
      itens: [
        { id: 'auditoria',   icon: '🔍', texto: 'Auditoria',    href: 'auditoria.html',   perfis: ['admin','director','chefe'] },
        { id: 'painel',      icon: '📈', texto: 'Painel RH',    href: 'painel.html',      perfis: ['admin','director'] },
        { id: 'unidades',    icon: '🏥', texto: 'Unidades',     href: 'unidades.html',    perfis: ['admin','director','chefe','tecnico','secretaria'] },
        { id: 'estatisticas', icon: '📊', texto: 'Estatísticas',  href: 'estatisticas.html', perfis: ['admin','director','chefe','tecnico'] },
        { id: 'relatorios',  icon: '📋', texto: 'Relatórios',   href: 'relatorios.html',  perfis: ['admin','director','chefe','tecnico'] },
        { id: 'ferias',      icon: '🌴', texto: 'Férias/Ausências', href: 'ferias.html', perfis: ['admin','director','chefe','tecnico'] },
        { id: 'utilizadores',icon: '⚙️', texto: 'Utilizadores', href: 'index.html#utilizadores', perfis: ['admin'] },
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
      font-size: 17px; flex-shrink: 0;
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
      width: 20px; text-align: center;
      font-size: 14px; flex-shrink: 0;
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
      color: rgba(255,255,255,.3); font-size: 15px;
      cursor: pointer; padding: 4px; border-radius: 6px;
      transition: all .18s; flex-shrink: 0;
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
      border-radius: 8px; font-size: 17px;
      align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.4);
    }

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
      <button id="sigdoc-nav-toggle" onclick="SIGDOC_NAV.toggle()" aria-label="Menu">☰</button>
      <div id="sigdoc-nav-overlay" onclick="SIGDOC_NAV.toggle()"></div>

      <!-- SIDEBAR -->
      <aside id="sigdoc-sidebar" role="navigation" aria-label="Navegação SIGDOC">

        <!-- Brand -->
        <div class="snav-brand">
          <div class="snav-brand-icon">📋</div>
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
          <button class="snav-logout-btn" onclick="SIGDOC_NAV.logout()" title="Terminar sessão">⇥</button>
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
      if (toggle) toggle.textContent = _aberto ? '✕' : '☰';
    },

    fechar() {
      const sidebar  = document.getElementById('sigdoc-sidebar');
      const overlay  = document.getElementById('sigdoc-nav-overlay');
      const toggle   = document.getElementById('sigdoc-nav-toggle');
      _aberto = false;
      sidebar.classList.remove('snav-aberto');
      overlay.classList.remove('snav-aberto');
      if (toggle) toggle.textContent = '☰';
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
