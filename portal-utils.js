/* ============================================================
   SIGDOC-SUMBE — portal-utils.js  (script global)
   Modais, toggle senha — chamados por onclick inline
   ============================================================ */

  window.abrirModalLogout = function() {
    const overlay = document.getElementById('logout-modal-overlay');
    if (overlay) overlay.classList.add('aberto');
  };
  window.fecharModalLogout = function() {
    const overlay = document.getElementById('logout-modal-overlay');
    if (overlay) overlay.classList.remove('aberto');
  };
  window.confirmarLogout = async function() {
    fecharModalLogout();
    await fazerLogoutFuncionario(true); // silencioso — confirmação já foi feita pelo modal
  };
  // Fechar com Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharModalLogout();
  });

  // ── Modal de revisão de pedido ──
  window.fecharRevisaoPedido = function() {
    document.getElementById('overlay-revisao-pedido')?.classList.remove('activo');
  };
  window.confirmarEnvioSolicitacao = async function() {
    const btnConfirmar = document.getElementById('btn-confirmar-envio');
    const btnRever     = document.querySelector('#overlay-revisao-pedido .btn-rever-pedido');
    // Mostrar loading no modal e bloquear ambos os botões
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '<span class="spinner"></span> A enviar…';
    }
    if (btnRever) { btnRever.disabled = true; btnRever.style.opacity = '0.45'; }
    // Enviar — modal permanece visível (o utilizador vê o estado de carregamento)
    try {
      await window.submeterSolicitacao();
    } finally {
      // Fechar modal após conclusão (sucesso ou erro — o feedback já aparece na aba de solicitar)
      fecharRevisaoPedido();
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg> Confirmar envio';
      }
      if (btnRever) { btnRever.disabled = false; btnRever.style.opacity = ''; }
    }
  };
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharRevisaoPedido();
  });

/* ── Toggle ver/ocultar senha ── */
  function toggleVerSenha(inputId, btn) {
    const inp  = document.getElementById(inputId);
    if (!inp) return;
    const visivel = inp.type === 'text';
    inp.type = visivel ? 'password' : 'text';
    btn.innerHTML = visivel
      ? '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
    btn.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
  }
