/**
 * SIGDOC-SUMBE - Construtor de Guia Medica
 * Layout ajustado para ficar mais fiel ao modelo PDF de 2 paginas.
 */

// ============================================================
// insignia_Base64
// Pode ser um data URL em Base64 ou um caminho local.
// ============================================================
const INSIGNIA_BASE64 = "insignia.jpeg";
// ============================================================

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const {
    numGuia = "___",
    nomeFuncionario = "__________________________________________",
    nomePai = "__________________________________________",
    nomeMae = "__________________________________________",
    naturalidade = "___________________",
    provincia = "Cuanza Sul",
    idade = "____",
    sexo = "Masculino",
    nomeChefe = "HILDEBRANDO M.T. CASSACULA",
    dataEmissao = ""
  } = dados || {};

  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MAR&Ccedil;O",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];

  const escapeHtml = (valor) => String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const texto = (valor, fallback = "") => {
    const base = valor === null || valor === undefined || String(valor).trim() === ""
      ? fallback
      : String(valor).trim();
    return escapeHtml(base);
  };

  const textoMaiusculo = (valor, fallback = "") => {
    const base = valor === null || valor === undefined || String(valor).trim() === ""
      ? fallback
      : String(valor).trim().toUpperCase();
    return escapeHtml(base);
  };

  const sexoNormalizado = String(sexo || "").trim().toLowerCase();
  const situacaoAuto = sexoNormalizado.startsWith("f")
    ? "Funcion&aacute;ria"
    : "Funcion&aacute;rio";
  const sexoGuia = sexoNormalizado.startsWith("f")
    ? "F"
    : sexoNormalizado.startsWith("m")
      ? "M"
      : textoMaiusculo(sexo, "___");

  const anoAtual = new Date().getFullYear();
  let dataFmt = `____ DE __________ DE ${anoAtual}`;

  if (dataEmissao) {
    const data = new Date(`${dataEmissao}T12:00:00`);
    if (!Number.isNaN(data.getTime())) {
      dataFmt = `${data.getDate()} DE ${meses[data.getMonth()]} DE ${data.getFullYear()}`;
    }
  }

  const INSIGNIA_SRC = (INSIGNIA_BASE64 && INSIGNIA_BASE64 !== "BASE64_AQUI")
    ? INSIGNIA_BASE64
    : "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png";

  const idadeTexto = texto(idade, "____");
  const rodapeSrc = "Imagem1.png";

  const renderLinhasPrescricao = () => Array.from(
    { length: 5 },
    () => '<div class="gm-linha-vazia"></div>'
  ).join("");

  const renderBlocoPrescricao = (classeExtra = "") => `
    <section class="gm-prescricao-bloco ${classeExtra}">
      <div class="gm-prescricao-titulo">PRESCRI&Ccedil;&Atilde;O M&Eacute;DICA</div>
      <div class="gm-linhas-prescricao">
        ${renderLinhasPrescricao()}
      </div>
      <div class="gm-prescricao-rodape">
        <div class="gm-data-linha">Sumbe ____/____/${anoAtual}</div>
        <div class="gm-medico-assinatura">
          <div class="gm-linha-medico"></div>
          <div>O M&Eacute;DICO</div>
        </div>
      </div>
    </section>
  `;

  const blocosPagina2 = Array.from(
    { length: 4 },
    () => renderBlocoPrescricao("gm-prescricao-bloco--compacto")
  ).join("");

  return `
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }

      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }

      .gm-documento {
        width: 210mm;
        margin: 0 auto;
        background: #fff;
        color: #000;
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .gm-documento * {
        box-sizing: border-box;
      }

      .gm-documento .gm-pagina {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 12mm 18mm 23mm;
        position: relative;
        overflow: hidden;
        background: #fff;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        display: block !important;
      }

      .gm-documento .gm-pagina:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .gm-corpo-pagina1 {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        z-index: 1;
      }

      .gm-cabecalho {
        text-align: center;
        line-height: 1.15;
        margin-bottom: 8mm;
      }

      .gm-logo {
        width: 17.5mm;
        height: 18.4mm;
        object-fit: contain;
        display: block;
        margin: 0 auto 2.5mm;
      }

      .gm-cabecalho p {
        margin: 0 0 1mm;
        font-size: 12pt;
        font-weight: 700;
      }

      .gm-titulo {
        margin: 0 0 9mm;
        text-align: center;
        font-size: 12pt;
        font-weight: 700;
        text-decoration: underline;
        letter-spacing: 0.02em;
      }

      .gm-apresentacao {
        margin: 0 0 9mm;
        font-size: 14pt;
        font-weight: 700;
        text-transform: uppercase;
      }

      .gm-campos {
        margin-bottom: 8mm;
      }

      .gm-campo {
        display: flex;
        align-items: flex-end;
        margin-bottom: 5.6mm;
        font-size: 14pt;
        line-height: 1;
      }

      .gm-label {
        flex: 0 0 35mm;
        font-weight: 700;
      }

      .gm-valor {
        flex: 1 1 auto;
        min-width: 0;
      }

      .gm-texto-final {
        margin: 2mm 0 8mm;
        font-size: 12pt;
        line-height: 1.28;
        text-align: justify;
        text-transform: uppercase;
        font-weight: 700;
      }

      .gm-assinatura-bloco {
        margin: 0 0 8mm;
        text-align: center;
      }

      .gm-cargo-chefe {
        margin-bottom: 5mm;
        font-size: 11pt;
        font-weight: 700;
        text-transform: uppercase;
      }

      .gm-nome-chefe {
        font-size: 12pt;
        font-weight: 700;
      }

      .gm-prescricao-bloco {
        display: flex;
        flex-direction: column;
        min-height: 55mm;
      }

      .gm-prescricao-bloco--pagina1 {
        margin-top: auto;
        min-height: 63mm;
      }

      .gm-prescricao-titulo {
        margin: 0 0 2.4mm;
        text-align: center;
        font-size: 9pt;
        font-weight: 700;
        text-decoration: underline;
        text-transform: uppercase;
      }

      .gm-linhas-prescricao {
        flex: 1 1 auto;
        display: grid;
        grid-template-rows: repeat(5, 1fr);
        gap: 1.2mm;
        min-height: 0;
      }

      .gm-linha-vazia {
        border-bottom: 1px solid #000;
        min-height: 0;
      }

      .gm-prescricao-rodape {
        margin-top: 3mm;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 8mm;
        font-size: 9pt;
      }

      .gm-data-linha {
        min-width: 45mm;
      }

      .gm-medico-assinatura {
        min-width: 64mm;
        text-align: center;
      }

      .gm-linha-medico {
        width: 100%;
        border-top: 1px solid #000;
        margin-bottom: 1mm;
      }

      .gm-documento .gm-pagina--prescricoes {
        padding-top: 10mm;
        padding-bottom: 20mm;
        display: grid !important;
        grid-template-rows: repeat(4, 1fr);
        gap: 3.6mm;
        align-items: stretch;
      }

      .gm-prescricao-bloco--compacto {
        min-height: 0;
      }

      .gm-logo-rodape {
        position: absolute;
        left: 50%;
        bottom: 7mm;
        transform: translateX(-50%);
        width: 49.5mm;
        max-width: calc(100% - 36mm);
        max-height: 12.8mm;
        height: auto;
        object-fit: contain;
        object-position: center;
        display: block;
        pointer-events: none;
      }

      @media print {
        html,
        body {
          width: 210mm;
          margin: 0;
          padding: 0;
          background: #fff;
        }

        .gm-documento {
          width: 210mm;
          margin: 0;
        }

        .gm-documento .gm-pagina:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    </style>

    <div class="gm-documento">
      <div class="gm-pagina">
        <div class="gm-corpo-pagina1">
          <div class="gm-cabecalho">
            <img class="gm-logo" src="${INSIGNIA_SRC}" alt="Insignia de Angola" />
            <p>REP&Uacute;BLICA DE ANGOLA</p>
            <p>GOVERNO DA PROV&Iacute;NCIA DO CUANZA-SUL</p>
            <p>ADMINISTRA&Ccedil;&Atilde;O MUNICIPAL DO SUMBE</p>
            <p>DIREC&Ccedil;&Atilde;O DE SA&Uacute;DE</p>
            <p>SEC&Ccedil;&Atilde;O DE PLANEAMENTO, ESTAT&Iacute;STICA E RECURSOS HUMANOS</p>
          </div>

          <div class="gm-titulo">GUIA M&Eacute;DICA N.&ordm; ${texto(numGuia, "___")}/${anoAtual}</div>

          <div class="gm-apresentacao">
            VAI APRESENTAR-SE AO ${textoMaiusculo(unidadeSanitaria, "________________________________")}
          </div>

          <div class="gm-campos">
            <div class="gm-campo"><div class="gm-label">NOME:</div><div class="gm-valor">${texto(nomeFuncionario, "__________________________________________")}</div></div>
            <div class="gm-campo"><div class="gm-label">PAI:</div><div class="gm-valor">${texto(nomePai, "__________________________________________")}</div></div>
            <div class="gm-campo"><div class="gm-label">M&Atilde;E:</div><div class="gm-valor">${texto(nomeMae, "__________________________________________")}</div></div>
            <div class="gm-campo"><div class="gm-label">SITUA&Ccedil;&Atilde;O:</div><div class="gm-valor">${situacaoAuto}</div></div>
            <div class="gm-campo"><div class="gm-label">NATURALIDADE:</div><div class="gm-valor">${texto(naturalidade, "___________________")}</div></div>
            <div class="gm-campo"><div class="gm-label">PROV&Iacute;NCIA:</div><div class="gm-valor">${texto(provincia, "Cuanza Sul")}</div></div>
            <div class="gm-campo"><div class="gm-label">IDADE:</div><div class="gm-valor">${idadeTexto} anos</div></div>
            <div class="gm-campo"><div class="gm-label">SEXO:</div><div class="gm-valor">${sexoGuia}</div></div>
          </div>

          <div class="gm-texto-final">
            SEC&Ccedil;&Atilde;O DE PLANEAMENTO, ESTAT&Iacute;STICA E RECURSOS HUMANOS DA DIREC&Ccedil;&Atilde;O MUNICIPAL DA SA&Uacute;DE DO SUMBE, ${dataFmt}.
          </div>

          <div class="gm-assinatura-bloco">
            <div class="gm-cargo-chefe">O CHEFE DE SEC&Ccedil;&Atilde;O,</div>
            <div class="gm-nome-chefe">${textoMaiusculo(nomeChefe, "HILDEBRANDO M.T. CASSACULA")}</div>
          </div>

          ${renderBlocoPrescricao("gm-prescricao-bloco--pagina1")}
        </div>

      <div class="gm-pagina gm-pagina--prescricoes">
        ${blocosPagina2}
        <img class="gm-logo-rodape" src="${rodapeSrc}" alt="Rodape da guia" />
      </div>
    </div>
  `;
};
