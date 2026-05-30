// SIGDOC-SUMBE · cadastro-utils.js
// Funções globais: validações de BI, IBAN, secções recolhíveis, toggle estudando,
// categoria/cargo manual — chamadas via onclick no HTML (não são módulo ES).

// ── Validação de Validade do BI ─────────────────────────
window.actualizarEstadoValidadeBI = function() {
  var elVal  = document.getElementById('f-biValidade');
  var elOpc  = document.getElementById('f-biVitalicioOpcao');
  var wrap   = document.getElementById('bi-validade-data-wrap');
  if(!elVal || !elOpc || !wrap){
    return { vitalicio:false, requerData:false, opcao:'' };
  }
  var opcao = elOpc.value || '';
  var vitalicio = opcao === 'sim';
  var requerData = opcao === 'nao';
  wrap.style.display = requerData ? 'block' : 'none';
  elVal.disabled = !requerData;
  if(vitalicio){
    elVal.value = '';
  }
  return { vitalicio:vitalicio, requerData:requerData, opcao:opcao };
};

window.verificarValidadeBI = function() {
  var elVal  = document.getElementById('f-biValidade');
  var hint   = document.getElementById('hint-bi-validade');
  if(!elVal || !hint) return;
  var estado = actualizarEstadoValidadeBI();
  if(estado.vitalicio){
    hint.style.display='block';
    hint.style.background='#eff6ff'; hint.style.borderColor='#bfdbfe'; hint.style.color='#1d4ed8';
    hint.innerHTML='<i data-lucide="check-circle" style="width:11px;height:11px;stroke-width:2.5"></i> BI marcado como vitalicio. Nao e necessario informar uma data de validade.';
    if(window.lucide) lucide.createIcons();
    return;
  }
  if(!estado.requerData){
    hint.style.display='none';
    hint.textContent='';
    return;
  }
  var val = elVal.value;
  if(!val){
    hint.style.display='block';
    hint.style.background='#f8fafc'; hint.style.borderColor='#cbd5e1'; hint.style.color='#475569';
    hint.innerHTML='<i data-lucide="info" style="width:11px;height:11px;stroke-width:2.5"></i> Informe a data de validade do BI.';
    if(window.lucide) lucide.createIcons();
    return;
  }
  var hoje  = new Date(); hoje.setHours(0,0,0,0);
  var vDate = new Date(val + 'T00:00:00');
  var diff  = Math.round((vDate - hoje)/(1000*60*60*24));
  if(diff < 0){
    hint.style.display='block';
    hint.style.background='#fef2f2'; hint.style.borderColor='#fecaca'; hint.style.color='#dc2626';
    hint.innerHTML='<i data-lucide="alert-triangle" style="width:11px;height:11px;stroke-width:2.5"></i> BI expirado há ' + Math.abs(diff) + ' dias. Actualizar antes de gerar documentos.';
  } else if(diff <= 90){
    hint.style.display='block';
    hint.style.background='#fffbeb'; hint.style.borderColor='#fde68a'; hint.style.color='#92400e';
    hint.innerHTML='<i data-lucide="hourglass" style="width:11px;height:11px;stroke-width:2.5"></i> BI expira em ' + diff + ' dias. Considere renovar brevemente.';
  } else {
    hint.style.display='block';
    hint.style.background='#f0fdf4'; hint.style.borderColor='#bbf7d0'; hint.style.color='#166534';
    hint.innerHTML='<i data-lucide="check-circle" style="width:11px;height:11px;stroke-width:2.5"></i> BI válido até ' + vDate.toLocaleDateString('pt-PT') + '.';
  }
  if(window.lucide) lucide.createIcons();
};

// ── Validação de Número de Conta / IBAN ─────────────────
window.validarNumeroConta = function(input) {
  var hint = document.getElementById('hint-numero-conta');
  if (!hint) return;
  var raw = input.value.replace(/\s/g, '').toUpperCase();
  if (!raw) { hint.style.display = 'none'; return; }

  // IBAN angolano: AO + 2 dígitos de controlo + 21 dígitos = 25 chars
  var isIBAN = /^AO\d{23}$/.test(raw);
  // NIB simples: 21 dígitos numéricos (formato BNA)
  var isNIB  = /^\d{21}$/.test(raw);

  hint.style.display = 'block';
  if (isIBAN) {
    hint.style.background = '#f0fdf4'; hint.style.borderColor = '#bbf7d0'; hint.style.color = '#166534';
    hint.innerHTML = '<i data-lucide="check-circle" style="width:11px;height:11px;stroke-width:2.5"></i> Formato IBAN angolano válido (AO + 23 dígitos).';
  } else if (isNIB) {
    hint.style.background = '#f0fdf4'; hint.style.borderColor = '#bbf7d0'; hint.style.color = '#166534';
    hint.innerHTML = '<i data-lucide="check-circle" style="width:11px;height:11px;stroke-width:2.5"></i> NIB com 21 dígitos reconhecido.';
  } else if (raw.startsWith('AO') && raw.length < 25) {
    hint.style.background = '#fffbeb'; hint.style.borderColor = '#fde68a'; hint.style.color = '#92400e';
    hint.innerHTML = '<i data-lucide="hourglass" style="width:11px;height:11px;stroke-width:2.5"></i> IBAN AO incompleto — faltam ' + (25 - raw.length) + ' caracteres.';
  } else {
    hint.style.background = '#f9fafb'; hint.style.borderColor = '#e5e7eb'; hint.style.color = '#6b7280';
    hint.innerHTML = '<i data-lucide="info" style="width:11px;height:11px;stroke-width:2.5"></i> Guardado como inserido. Formato esperado: AO06 + 21 dígitos.';
  }
};

// ── Secções recolhíveis ──────────────────────────────────
window.toggleSecao = function(id) {
  document.getElementById(id).classList.toggle('recolhida');
};

// Expandir programaticamente (ao editar, para mostrar campos preenchidos)
function expandirSecao(id) {
  document.getElementById(id).classList.remove('recolhida');
}

// ── Toggle Estudando ─────────────────────────────────────
window.setEstudando = function(sim) {
  document.getElementById('f-estudando').value = sim ? 'true' : 'false';
  var btnSim  = document.getElementById('btn-estuda-sim');
  var btnNao  = document.getElementById('btn-estuda-nao');
  var wrap    = document.getElementById('curso-wrap');
  btnSim.className = sim  ? 'activo-sim' : '';
  btnNao.className = !sim ? 'activo-nao' : '';
  if (sim) { wrap.classList.add('visivel'); }
  else     { wrap.classList.remove('visivel'); }
};

function limparEstudando() {
  document.getElementById('f-estudando').value = '';
  document.getElementById('btn-estuda-sim').className = '';
  document.getElementById('btn-estuda-nao').className = '';
  document.getElementById('curso-wrap').classList.remove('visivel');
  ['f-curso','f-instituicao'].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('f-anoCurso').value = '';
  var elMod = document.getElementById('f-modalidadeEstudo'); if(elMod) elMod.value = '';
}

function toggleCategoriaOutra(sel) {
  var manual = document.getElementById('f-categoria-manual');
  if (!manual) return;
  var activo = sel.value === '__outra__';
  manual.disabled = !activo;
  manual.required = activo;
  if (activo) {
    manual.style.display = 'block';
    manual.focus();
  } else {
    manual.style.display = 'none';
    manual.value = '';
  }
}
function toggleCargoOutro(sel) {
  var manual = document.getElementById('f-cargo-manual');
  if (!manual) return;
  var activo = sel.value === '__outro_cargo__';
  manual.disabled = !activo;
  manual.required = activo;
  if (activo) {
    manual.style.display = 'block';
    manual.focus();
  } else {
    manual.style.display = 'none';
    manual.value = '';
  }
}
function lerCategoria() {
  var sel = document.getElementById('f-categoria');
  if (!sel) return '';
  if (sel.value === '__outra__') {
    return (document.getElementById('f-categoria-manual') || {value:''}).value.trim();
  }
  return sel.value;
}
function lerCargo() {
  var sel = document.getElementById('f-cargo');
  if (!sel || !sel.value) return '';
  if (sel.value === '__outro_cargo__') {
    return (document.getElementById('f-cargo-manual') || {value:''}).value.trim();
  }
  return sel.value;
}
