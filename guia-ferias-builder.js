(function() {
  function fmtSimples(str) {
    const d = new Date(str + "T12:00:00");
    return String(d.getDate()).padStart(2, "0") + "." +
           String(d.getMonth() + 1).padStart(2, "0") + "." +
           d.getFullYear();
  }

  function fmtExtenso(str) {
    const meses = ["JANEIRO", "FEVEREIRO", "MAR&Ccedil;O", "ABRIL", "MAIO", "JUNHO",
                   "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const d = new Date(str + "T12:00:00");
    return d.getDate() + " DE " + meses[d.getMonth()] + " DE " + d.getFullYear();
  }

  function obterTextoLocal(localColocacao) {
    const texto = String(localColocacao || "").trim();
    if (!texto) return "no local de coloca&ccedil;&atilde;o";

    const textoNorm = texto.toLowerCase();
    if (textoNorm.startsWith("dire")) {
      return "na " + texto;
    }
    return "no " + texto;
  }

  function obterInsigniaSrc(opcoes) {
    if (window.SIGDOCBuilderUtils && typeof window.SIGDOCBuilderUtils.obterInsigniaSrc === "function") {
      return window.SIGDOCBuilderUtils.obterInsigniaSrc(opcoes);
    }
    return (opcoes && opcoes.insigniaSrc) ? opcoes.insigniaSrc : "insignia.jpeg";
  }

  window.construirGuiaFerias = function(d, opcoes) {
    const numFmt = d.numGuia && d.anoGuia ? d.numGuia + "/" + d.anoGuia : "___/____";
    const nome = d.nomeFuncionario || "___________________________";
    const cat = d.categoria || "___________________________";
    const dias = "22";
    const inicioFmt = d.dataInicio ? fmtSimples(d.dataInicio) : "__.__.____";
    const emissaoExt = d.dataEmissao ? fmtExtenso(d.dataEmissao) : "___ DE __________ DE ____";
    const apFmt = d.dataApresentacao ? fmtSimples(d.dataApresentacao) : "__.__.____";

    const fem = d.sexo === "Feminino";
    const trat = fem ? "a senhora" : "o senhor";
    const funcG = fem ? "Funcion&aacute;ria" : "Funcion&aacute;rio";
    const colocG = fem ? "colocada" : "colocado";
    const autorG = fem ? "autorizada" : "autorizado";
    const textoLocal = obterTextoLocal(d.localColocacao);
    const insigniaSrc = obterInsigniaSrc(opcoes);

    const metade =
      '<div class="doc-metade">' +
        '<div class="doc-cabecalho">' +
          '<img class="doc-insignia" src="' + insigniaSrc + '" alt="Insignia de Angola"/>' +
          '<p>REP&Uacute;BLICA DE ANGOLA</p>' +
          '<p>GOVERNO PROVINCIAL DO CUANZA &ndash; SUL</p>' +
          '<p>ADMINISTRA&Ccedil;&Atilde;O MUNICIPAL DO SUMBE</p>' +
          '<p class="negrito">DIREC&Ccedil;&Atilde;O DA SA&Uacute;DE</p>' +
          '<p>SEC&Ccedil;&Atilde;O DE PLANEAMENTO, ESTAT&Iacute;STICA E RECURSOS HUMANOS</p>' +
        '</div>' +

        '<div class="doc-titulo">GUIA DE F&Eacute;RIAS N&ordm; ' + numFmt + '</div>' +

        '<div class="doc-corpo">' +
          '<p>Por esta Direc&ccedil;&atilde;o Municipal se faz constar as autoridades a quem o conhecimento desta competir que ' +
          trat + ' <strong>' + nome + '</strong>, ' + funcG + ' desta Direc&ccedil;&atilde;o, ' + colocG + ' ' + textoLocal +
          ', com a categoria de <strong>' + cat + '</strong>, est&aacute; ' + autorG +
          ' a ausentar-se por um per&iacute;odo de <strong>' + dias +
          '</strong> (dias &uacute;teis) em gozo de suas f&eacute;rias anuais que tem direito nos termos do artigo 79&ordm;,' +
          ' <strong>da Lei n&ordm; 26/22, de 22 de Agosto</strong>, com in&iacute;cio dia <strong>' + inicioFmt + '</strong>.</p>' +
        '</div>' +

        '<div class="doc-rodape">' +
          '<div class="doc-local-data">' +
            'SEC&Ccedil;&Atilde;O DE PLANEAMENTO, ESTAT&Iacute;STICA E RECURSOS HUMANOS, ' + emissaoExt + '.' +
          '</div>' +
          '<div class="doc-assinaturas">' +
            '<div class="doc-ass-col esquerda">' +
              '<div class="doc-ass-titulo">APRESENTA&Ccedil;&Atilde;O</div>' +
              '<div class="doc-ass-data">' + apFmt + '</div>' +
            '</div>' +
            '<div class="doc-ass-col direita">' +
              '<div class="doc-ass-titulo">O CHEFE DE SEC&Ccedil;&Atilde;O</div>' +
              '<div class="doc-ass-linha"></div>' +
              '<div class="doc-ass-nome">' + (d.nomeChefe || "___________________________") + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return '<style>' +
      '.doc-metade {' +
        'padding: 1cm !important;' +
        'box-sizing: border-box !important;' +
        'height: fit-content !important;' +
        'align-self: flex-start !important;' +
      '}' +
      '.documento-oficial, .documento-oficial * {' +
        'font-family: "Times New Roman", serif !important;' +
        'font-size: 11pt !important;' +
      '}' +
      '.doc-local-data {' +
        'font-size: 11pt !important;' +
      '}' +
      '@media print {' +
        '@page { size: A4 landscape; margin: 0; }' +
        'html, body {' +
          'width: 297mm !important;' +
          'height: 210mm !important;' +
          'max-height: 210mm !important;' +
          'overflow: hidden !important;' +
          'margin: 0 !important;' +
          'padding: 0 !important;' +
        '}' +
        '.documento-oficial {' +
          'width: 297mm !important;' +
          'height: 210mm !important;' +
          'overflow: hidden !important;' +
          'page-break-after: avoid !important;' +
          'page-break-inside: avoid !important;' +
        '}' +
      '}' +
      '</style>' +
      '<div class="documento-oficial">' + metade + metade + '</div>';
  };
})();
