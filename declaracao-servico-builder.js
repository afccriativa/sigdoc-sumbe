/**
 * SIGDOC-SUMBE — Construtor de Declaração de Adiantamento Salarial
 * Gera um documento A4 retrato fiel ao modelo físico usado no processo.
 */
(function() {
  // ============================================================
  // insignia_Base64 (PNG 200px)
  // Cole aqui o valor gerado pelo conversor-base64.html
  // Formato: data:image/png;base64,XXXXXXX...
  // ============================================================
  const INSIGNIA_BASE64 = "insignia.jpeg";
  // ============================================================
  const MESES = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];
  const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
  const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  const MESES_EXTENSO = {
    1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco", 6: "seis",
    7: "sete", 8: "oito", 9: "nove", 10: "dez", 11: "onze", 12: "doze"
  };

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function capitalizar(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function extensoAte999(numero) {
    if (numero === 0) return "zero";
    if (numero === 100) return "cem";
    const centenas = Math.floor(numero / 100);
    const resto = numero % 100;
    const partes = [];
    if (centenas > 0) partes.push(CENTENAS[centenas]);
    if (resto > 0) {
      if (resto < 10) {
        partes.push(UNIDADES[resto]);
      } else if (resto < 20) {
        partes.push(DEZ_A_DEZENOVE[resto - 10]);
      } else {
        const dezena = Math.floor(resto / 10);
        const unidade = resto % 10;
        partes.push(unidade > 0 ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
      }
    }
    return partes.join(" e ");
  }

  function numeroPorExtenso(numero) {
    const n = Math.round(Number(numero) || 0);
    if (n < 1000) return extensoAte999(n);
    if (n < 1000000) {
      const milhares = Math.floor(n / 1000);
      const resto = n % 1000;
      const prefixo = milhares === 1 ? "mil" : `${extensoAte999(milhares)} mil`;
      if (!resto) return prefixo;
      return prefixo + (resto < 100 ? " e " : " ") + extensoAte999(resto);
    }
    const milhoes = Math.floor(n / 1000000);
    const resto = n % 1000000;
    const prefixo = milhoes === 1 ? "um milhão" : `${numeroPorExtenso(milhoes)} milhões`;
    if (!resto) return prefixo;
    return prefixo + (resto < 100 ? " e " : " ") + numeroPorExtenso(resto);
  }

  function valorAkzPorExtenso(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) return "Zero kwanzas";
    const inteiro = Math.floor(numero);
    const centavos = Math.round((numero - inteiro) * 100);
    const partes = [];
    if (inteiro > 0) {
      partes.push(`${numeroPorExtenso(inteiro)} kwanzas`);
    }
    if (centavos > 0) {
      partes.push(`${numeroPorExtenso(centavos)} cêntimos`);
    }
    return capitalizar(partes.join(" e "));
  }

  function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "________________";
    return numero.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatarMesesExtenso(total) {
    const numero = Number(total);
    if (!Number.isFinite(numero) || numero <= 0) return "________";
    return MESES_EXTENSO[numero] || numeroPorExtenso(numero);
  }

  function formatarDataCabecalho(dataEmissao) {
    if (!dataEmissao) return "DIRECÇÃO MUNICIPAL DA SAÚDE DO SUMBE, ___ DE __________ DE ____.";
    const d = new Date(dataEmissao + "T12:00:00");
    return `DIRECÇÃO MUNICIPAL DA SAÚDE DO SUMBE, ${d.getDate()} DE ${MESES[d.getMonth()]} DE ${d.getFullYear()}.`;
  }

  /**
   * Determina a preposição correcta consoante o tipo de unidade de colocação.
   * Exemplos: "no Centro de Saúde", "no Posto de Saúde", "na Direcção", "no Hospital"
   */
  function preposicaoLocal(local) {
    const texto = String(local || "").trim().toLowerCase();
    // Palavras femininas → "na"
    if (/^(direc[çc]|clín|clinica|sede|maternidade|enfermaria|farmácia|farmacia)/.test(texto)) return "na";
    // Palavras masculinas → "no"
    if (/^(centro|posto|hospital|laboratório|laboratorio|dispensário|dispensario|servi[çc])/.test(texto)) return "no";
    // Predefinição
    return "em";
  }

  window.construirDeclaracaoServico = function(dados) {
    const {
      nomeFuncionario = "___________________________",
      sexo = "Masculino",
      categoria = "___________________________",
      localColocacao = "___________________________",
      numeroAgente = "________________",
      salarioLiquido = NaN,
      mesesAdiantamento = NaN,
      numeroConta = "________________",
      dataEmissao = "",
      nomeDirector = "António Fernando Afonso"
    } = dados || {};

    const feminino = /^f/i.test(String(sexo || ""));
    const tratamento = feminino ? "a senhora" : "o senhor";
    const funcionarioTxt = feminino ? "funcionária" : "funcionário";
    const colocadoTxt = feminino ? "colocada" : "colocado";
    const preposicao = preposicaoLocal(localColocacao);
    const mesesNumero = Number.isFinite(Number(mesesAdiantamento)) && Number(mesesAdiantamento) > 0
      ? String(Number(mesesAdiantamento))
      : "__";
    const mesesTexto = formatarMesesExtenso(mesesAdiantamento);
    const mesesSufixo = Number(mesesAdiantamento) === 1 ? "mês" : "meses";
    const salarioFmt = formatarMoeda(salarioLiquido);
    const salarioExt = valorAkzPorExtenso(salarioLiquido);
    const contaFmt = String(numeroConta || "________________").trim().toUpperCase();
    const dataCabecalho = formatarDataCabecalho(dataEmissao);

    // Usa Base64 embutida; fallback para URL caso ainda não tenha sido preenchida
    const INSIGNIA_SRC = (INSIGNIA_BASE64 && INSIGNIA_BASE64 !== "BASE64_AQUI")
      ? INSIGNIA_BASE64
      : "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png";

    return `
      <style>
        .ds-documento {
          width: 210mm;
          margin: 0 auto;
          background: #fff;
          color: #000;
          font-family: "Calibri", "Arial", sans-serif;
        }
        .ds-pagina {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          overflow: hidden;
          padding: 12mm 18mm 14mm;
          box-sizing: border-box;
        }
        .ds-cabecalho {
          text-align: center;
          line-height: 1.15;
          margin-bottom: 8mm;
        }
        .ds-logo {
          width: 24mm;
          height: 24mm;
          object-fit: contain;
          display: block;
          margin: 0 auto 3mm;
        }
        .ds-cabecalho p {
          margin: 0;
          font-size: 11pt;
          font-weight: 700;
        }
        .ds-titulo {
          text-align: center;
          font-size: 14pt;
          font-weight: 700;
          text-decoration: underline;
          letter-spacing: 0.4px;
          margin: 2mm 0 8mm;
        }
        .ds-subtitulo {
          text-align: center;
          font-size: 12pt;
          font-weight: 700;
          text-decoration: underline;
          margin: 9mm 0 5mm;
        }
        .ds-corpo p {
          margin: 0 0 3mm;
          font-size: 12pt;
          line-height: 1.6;
          text-align: justify;
        }
        .ds-corpo strong {
          font-weight: 700;
        }
        .ds-data {
          margin-top: 6mm;
          font-size: 12pt;
          font-weight: 700;
          text-align: left;
        }
        .ds-assinatura {
          margin-top: 8mm;
          text-align: center;
        }
        .ds-assinatura-titulo {
          font-size: 12pt;
          font-weight: 400;
          margin-bottom: 10mm;
        }
        .ds-assinatura-linha {
          width: 78mm;
          border-top: 1px solid #000;
          margin: 0 auto 3mm;
        }
        .ds-assinatura-nome {
          font-size: 12pt;
          font-weight: 700;
          text-transform: uppercase;
        }
        .ds-assinatura-cargo {
          font-size: 11pt;
          margin-top: 2mm;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .ds-documento {
            width: 210mm;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }
          .ds-pagina {
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      </style>

      <div class="ds-documento">
        <div class="ds-pagina">
          <div class="ds-cabecalho">
            <img class="ds-logo" src="${INSIGNIA_SRC}" alt="Insígnia de Angola"/>
            <p>REPÚBLICA DE ANGOLA</p>
            <p>GOVERNO DA PROVÍNCIA DO CUANZA-SUL</p>
            <p>ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
            <p>DIRECÇÃO DA SAÚDE</p>
          </div>

          <div class="ds-titulo">DECLARAÇÃO</div>

          <div class="ds-corpo">
            <p>
              Para efeito de obtenção de adiantamento salarial, junto do Banco de Poupança e Crédito (BPC),
              declara-se que ${tratamento} <strong>${escapeHtml(nomeFuncionario)}</strong>, é ${funcionarioTxt}
              do Ministério da Saúde, ${colocadoTxt} ${preposicao} <strong>${escapeHtml(localColocacao)}</strong>,
              com a categoria de <strong>${escapeHtml(categoria)}</strong>, agente nº
              <strong>${escapeHtml(numeroAgente)}</strong>, auferindo o salário líquido mensal de
              <strong>AKZ ${escapeHtml(salarioFmt)}</strong> (${escapeHtml(salarioExt)}).
            </p>
          </div>

          <div class="ds-subtitulo">COMPROMISSO</div>

          <div class="ds-corpo">
            <p>
              A Direcção acima citada compromete-se a depositar/creditar os salários do seu funcionário,
              creditados na conta nº <strong>${escapeHtml(contaFmt)}</strong>, até à totalidade do referido adiantamento.
            </p>
            <p>
              2- A Direcção acima citada compromete-se a comunicar ao Banco quaisquer alterações que vierem
              a verificar-se no vínculo jurídico entre o funcionário e a Instituição.
            </p>
            <p>
              <strong>OBS:</strong> A presente declaração destina-se exclusivamente ao Banco de Poupança e Crédito (BPC)
              para obtenção de salário antecipado de <strong>(${escapeHtml(mesesNumero)}) ${escapeHtml(mesesTexto)}</strong>
              ${escapeHtml(mesesSufixo)}.
            </p>
            <p>
              Por ser verdade e nos ter sido solicitado, foi passada a presente declaração que vai devidamente
              assinada e autenticada com o carimbo a óleo em uso nesta Instituição.
            </p>
          </div>

          <div class="ds-data">${escapeHtml(dataCabecalho)}</div>

          <div class="ds-assinatura">
            <div class="ds-assinatura-titulo">O DIRECTOR MUNICIPAL</div>
            <div class="ds-assinatura-linha"></div>
            <div class="ds-assinatura-nome">${escapeHtml(String(nomeDirector || "").toUpperCase())}</div>
            <div class="ds-assinatura-cargo">Gestor Hospitalar</div>
          </div>
        </div>
      </div>
    `;
  };
})();
