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

  return {
    /**
     * Devolve o objecto de configuração para ser passado
     * ao initializeApp() dentro dos módulos ES de cada página.
     */
    get config() {
      return FIREBASE_CONFIG;
    }
  };

})();
