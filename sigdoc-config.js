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
