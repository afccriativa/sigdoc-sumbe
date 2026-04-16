/**
 * SIGDOC-SUMBE — Configuração Central do Firebase
 *
 * Este é o único lugar onde as credenciais do Firebase existem.
 * Qualquer página que precise do Firebase inclui apenas:
 *
 *   <script src="sigdoc-config.js"></script>
 *
 * E depois no módulo ES usa:
 *
 *   const { app, auth, db } = window.SIGDOC_CONFIG.init();
 *
 * Para mudar de projecto ou rodar credenciais, edita só aqui.
 */

window.SIGDOC_CONFIG = (function () {

  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCCgn96OJulWh-xhj0jE8y-LtO8uEqwdEE",
    authDomain:        "sigdoc-sumbe.firebaseapp.com",
    projectId:         "sigdoc-sumbe",
    storageBucket:     "sigdoc-sumbe.firebasestorage.app",
    messagingSenderId: "323467521938",
    appId:             "1:323467521938:web:1e8170bfd3961784241b4b"
  };

  /**
   * Calcula o nome abreviado canónico de uma unidade sanitária.
   *
   * @param {string} nome     - Nome completo da unidade (campo `nome` do Firestore)
   * @param {string} [override] - Valor do campo `nomeAbreviado` do Firestore (opcional).
   *                              Quando presente, tem prioridade sobre o cálculo programático.
   * @returns {string}
   *
   * Exemplos:
   *   abrvUnidade('Centro de Saúde do Assaca')           → 'CS Assaca'
   *   abrvUnidade('Posto de Saúde do Capolo')            → 'PS Capolo'
   *   abrvUnidade('Direcção Municipal de Saúde do Sumbe')→ 'DMS'
   *   abrvUnidade('CS Assaca', 'CS Assaca')              → 'CS Assaca'  (override)
   */
  function abrvUnidade(nome, override) {
    if (override && override.trim()) return override.trim();
    if (!nome) return '—';
    return nome
      .replace('Direcção Municipal de Saúde do Sumbe', 'DMS')
      .replace('Centro de Saúde de ', 'CS ')
      .replace('Centro de Saúde do ', 'CS ')
      .replace('Centro de Saúde da ', 'CS ')
      .replace('Centro de Saúde', 'CS')
      .replace('Posto de Saúde de ', 'PS ')
      .replace('Posto de Saúde do ', 'PS ')
      .replace('Posto de Saúde da ', 'PS ')
      .replace('Posto de Saúde', 'PS')
      .replace('Secção de ', 'Sec. ')
      .trim();
  }

  const ROLE_PRIORITY = ['admin', 'director', 'chefe', 'chefe_unidade', 'tecnico', 'secretaria', 'funcionario'];
  const ROLE_LABELS = {
    admin: 'Administrador do Sistema',
    director: 'Director Municipal',
    chefe: 'Chefe de SecÃ§Ã£o',
    chefe_unidade: 'Chefe de Unidade',
    tecnico: 'TÃ©cnico de RH',
    secretaria: 'Secretaria',
    funcionario: 'FuncionÃ¡rio de Unidade'
  };

  function normalizarRole(valor) {
    return String(valor || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  function listaRoles(valor) {
    if (Array.isArray(valor)) return valor;
    if (typeof valor === 'string') return valor.split(',');
    return [];
  }

  function dedupeRoles(lista) {
    const vistos = new Set();
    const roles = [];
    lista.forEach(item => {
      const role = normalizarRole(item);
      if (!role || vistos.has(role)) return;
      vistos.add(role);
      roles.push(role);
    });
    return roles;
  }

  function resolverPerfilPrincipal(roles) {
    const lista = dedupeRoles(roles);
    for (const role of ROLE_PRIORITY) {
      if (lista.includes(role)) return role;
    }
    return lista[0] || 'funcionario';
  }

  function normalizarPerfilDoc(doc) {
    if (typeof doc === 'string') return normalizarPerfilDoc({ perfil: doc });
    if (Array.isArray(doc)) return normalizarPerfilDoc({ roles: doc });

    const bruto = doc && typeof doc === 'object' ? { ...doc } : {};
    const perfilLegado = normalizarRole(bruto.perfil);
    const perfilBase = 'funcionario';

    let roles = dedupeRoles(listaRoles(bruto.roles));
    if (!roles.length && perfilLegado) {
      roles = perfilLegado === perfilBase
        ? [perfilBase]
        : [perfilBase, perfilLegado];
    }
    if (!roles.length) roles = ['funcionario'];
    if (!roles.includes(perfilBase)) {
      roles = dedupeRoles([perfilBase].concat(roles));
    }

    const perfilPrincipal = resolverPerfilPrincipal(roles);

    return {
      ...bruto,
      roles,
      perfilBase,
      perfil: perfilPrincipal,
      perfilPrincipal
    };
  }

  function criarPerfilUtilizador(dados) {
    const bruto = dados && typeof dados === 'object' ? { ...dados } : {};
    const perfilBase = 'funcionario';
    const roleLegado = normalizarRole(bruto.perfil);
    const roles = dedupeRoles(
      [perfilBase]
        .concat(listaRoles(bruto.roles))
        .concat(roleLegado && roleLegado !== perfilBase ? [roleLegado] : [])
    );
    const perfilPrincipal = resolverPerfilPrincipal(roles);

    return {
      ...bruto,
      perfilBase,
      roles,
      perfil: perfilPrincipal,
      perfilPrincipal
    };
  }

  function temRole(doc, role) {
    return normalizarPerfilDoc(doc).roles.includes(normalizarRole(role));
  }

  function temAlgumRole(doc, rolesPermitidos) {
    const permitidos = dedupeRoles(listaRoles(rolesPermitidos));
    const normalizado = normalizarPerfilDoc(doc);
    return permitidos.some(role => normalizado.roles.includes(role));
  }

  function obterEtiquetaRole(role, labels) {
    const normalizado = normalizarRole(role);
    return (labels && labels[normalizado]) || ROLE_LABELS[normalizado] || normalizado;
  }

  function obterEtiquetasRoles(doc, labels) {
    return normalizarPerfilDoc(doc).roles.map(role => obterEtiquetaRole(role, labels));
  }

  function precisaMigracao(doc) {
    if (!doc || typeof doc !== 'object') return true;
    const normalizado = normalizarPerfilDoc(doc);
    const rolesActuais = dedupeRoles(listaRoles(doc.roles));
    return (
      !Array.isArray(doc.roles) ||
      doc.perfilBase !== normalizado.perfilBase ||
      normalizarRole(doc.perfil) !== normalizado.perfil ||
      rolesActuais.join('|') !== normalizado.roles.join('|')
    );
  }

  window.SIGDOC_AUTHZ = {
    ROLE_PRIORITY,
    ROLE_LABELS,
    normalizarRole,
    normalizarPerfilDoc,
    criarPerfilUtilizador,
    obterRoles(doc) {
      return normalizarPerfilDoc(doc).roles;
    },
    obterPerfilPrincipal(doc) {
      return normalizarPerfilDoc(doc).perfilPrincipal;
    },
    obterPerfilBase(doc) {
      return normalizarPerfilDoc(doc).perfilBase;
    },
    obterEtiquetaRole,
    obterEtiquetaPrincipal(doc, labels) {
      return obterEtiquetaRole(normalizarPerfilDoc(doc).perfilPrincipal, labels);
    },
    obterEtiquetasRoles,
    temRole,
    temAlgumRole,
    precisaMigracao
  };

  return {
    /**
     * Devolve o objecto de configuração para ser passado
     * ao initializeApp() dentro dos módulos ES de cada página.
     */
    get config() {
      return FIREBASE_CONFIG;
    },

    /**
     * Abreviação canónica de nomes de unidades sanitárias.
     * Usar em todos os ficheiros em vez de lógica local.
     */
    abrvUnidade,
  };

})();
