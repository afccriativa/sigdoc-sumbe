/**
 * SIGDOC-SUMBE — Construtor de Guia Médica (Fiel ao Modelo PDF)
 * Gera um documento A4 Retrato com 2 páginas.
 *
 * INSTRUÇÃO DE MANUTENÇÃO:
 * A constante insignia_BASE64 abaixo contém a Insígnia de Angola em Base64.
 * Para actualizar, use o utilitário "conversor-base64.html" incluído no repositório.
 */

// ============================================================
// insignia_Base64 (PNG 200px)
// Cole aqui o valor gerado pelo conversor-base64.html
// Formato: data:image/png;base64,XXXXXXX...
// ============================================================
const INSIGNIA_BASE64 = "insignia.jpeg";
// ============================================================

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const {
    numGuia = '___',
    nomeFuncionario = '__________________________________________',
    nomePai = '__________________________________________',
    nomeMae = '__________________________________________',
    naturalidade = '___________________',
    provincia = 'Cuanza Sul',
    idade = '____',
    sexo = 'Masculino',
    nomeChefe = 'HILDEBRANDO M.T. CASSACULA',
    dataEmissao = ''
  } = dados;

  const situacaoAuto = (sexo.toLowerCase() === 'feminino' || sexo.toLowerCase() === 'f') ? 'FUNCIONÁRIA' : 'FUNCIONÁRIO';

  const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
                 "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  const anoAtual = new Date().getFullYear();
  let dataFmt = `____ DE __________ DE ${anoAtual}`;
  if (dataEmissao) {
    const d = new Date(dataEmissao + "T12:00:00");
    dataFmt = d.getDate() + " DE " + meses[d.getMonth()] + " DE " + d.getFullYear();
  }

  // Usa Base64 embutida; fallback para URL caso ainda não tenha sido preenchida
  const INSIGNIA_SRC = (INSIGNIA_BASE64 && INSIGNIA_BASE64 !== "BASE64_AQUI")
    ? INSIGNIA_BASE64
    : "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png";

  return `
    <style>
      .gm-documento {
        width: 210mm;
        background: #fff;
        font-family: Arial, sans-serif;
        color: #000;
        margin: 0 auto;
      }
      .gm-pagina {
        width: 210mm;
        height: 297mm;
        padding: 15mm 20mm 30mm;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }
      .gm-cabecalho {
        text-align: center;
        margin-bottom: 5mm;
        line-height: 1.2;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .gm-logo {
        width: 28mm;
        height: 28mm;
        object-fit: contain;
        margin-bottom: 3mm;
        display: block;
      }
      .gm-cabecalho p {
        margin: 0;
        font-size: 10pt;
        font-weight: normal;
        text-align: center;
      }
      .gm-cabecalho .negrito {
        font-weight: bold;
      }
      .gm-titulo {
        text-align: center;
        font-size: 12pt;
        font-weight: bold;
        text-decoration: underline;
        margin: 5mm 0;
      }
      .gm-apresentacao {
        font-weight: bold;
        font-size: 11pt;
        margin-bottom: 8mm;
        text-transform: uppercase;
      }
      .gm-campos {
        margin-bottom: 10mm;
      }
      .gm-campo {
        margin-bottom: 4mm;
        display: flex;
        font-size: 11pt;
      }
      .gm-label {
        font-weight: bold;
        width: 45mm;
      }
      .gm-valor {
  flex: 1;
  padding: 0 1mm;
  /* REMOVE ESTA LINHA SE EXISTIR: border-bottom: 1px solid #000; */
}
      .gm-texto-final {
        font-size: 10pt;
        font-weight: bold;
        text-align: justify;
        margin: 10mm 0;
        text-transform: uppercase;
        line-height: 1.4;
      }
      .gm-assinatura-bloco {
        text-align: center;
        margin-top: 10mm;
      }
      .gm-cargo-chefe {
        font-size: 10pt;
        font-weight: bold;
      }
      .gm-nome-chefe {
        font-size: 11pt;
        font-weight: bold;
        margin-top: 2mm;
      }
      .gm-prescricao-bloco {
        margin-top: 10mm;
        padding-top: 5mm;
      }
      .gm-prescricao-titulo {
        font-weight: bold;
        text-decoration: underline;
        font-size: 10pt;
        margin-bottom: 3mm;
        text-align: center;
      }
      .gm-linhas-prescricao {
        margin-bottom: 5mm;
      }
      .gm-linha-vazia {
        border-bottom: 1px solid #000;
        height: 8mm;
      }
      .gm-prescricao-rodape {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 10pt;
        margin-top: 5mm;
      }
      .gm-data-linha {
        width: 50mm;
      }
      .gm-medico-assinatura {
        text-align: center;
      }
      .gm-linha-medico {
        border-top: 1px solid #000;
        width: 50mm;
        margin-bottom: 1mm;
      }
      .gm-logo-rodape {
        position: absolute;
        left: 50%;
        bottom: 8mm;
        transform: translateX(-50%);
        width: 60mm;
        max-width: calc(100% - 40mm);
        max-height: 16mm;
        height: auto;
        object-fit: contain;
        object-position: center;
        display: block;
        pointer-events: none;
      }
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; }
        .gm-documento { width: 210mm; }
        .gm-pagina {
          width: 210mm;
          border: none;
          margin: 0;
          height: 297mm;
          page-break-after: always;
          display: block !important;
          visibility: visible !important;
        }
        .gm-pagina * { visibility: visible !important; }
      }
    </style>

    <div class="gm-documento">
      <!-- PÁGINA 1 -->
      <div class="gm-pagina">
        <div class="gm-cabecalho">
          <img class="gm-logo" src="${INSIGNIA_SRC}" alt="Insígnia de Angola"/>
          <p class="negrito">REPÚBLICA DE ANGOLA</p>
          <p class="negrito">GOVERNO DA PROVÍNCIA DO CUANZA-SUL</p>
          <p class="negrito">ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
          <p class="negrito">DIRECÇÃO DE SAÚDE</p>
          <p class="negrito">SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS</p>
        </div>

        <div class="gm-titulo">GUIA MÉDICA N.º ${numGuia}/${anoAtual}</div>

        <div class="gm-apresentacao">
          VAI APRESENTAR-SE AO ${unidadeSanitaria.toUpperCase()}
        </div>

        <div class="gm-campos">
          <div class="gm-campo"><div class="gm-label">NOME:</div><div class="gm-valor">${nomeFuncionario.toUpperCase()}</div></div>
          <div class="gm-campo"><div class="gm-label">PAI:</div><div class="gm-valor">${nomePai.toUpperCase()}</div></div>
          <div class="gm-campo"><div class="gm-label">MÃE:</div><div class="gm-valor">${nomeMae.toUpperCase()}</div></div>
          <div class="gm-campo"><div class="gm-label">SITUAÇÃO:</div><div class="gm-valor">${situacaoAuto}</div></div>
          <div class="gm-campo"><div class="gm-label">NATURALIDADE:</div><div class="gm-valor">${naturalidade.toUpperCase()}</div></div>
          <div class="gm-campo"><div class="gm-label">PROVINCIA:</div><div class="gm-valor">${provincia.toUpperCase()}</div></div>
          <div class="gm-campo"><div class="gm-label">IDADE:</div><div class="gm-valor">${idade} ANOS</div></div>
          <div class="gm-campo"><div class="gm-label">SEXO:</div><div class="gm-valor">${sexo.toUpperCase()}</div></div>
        </div>

        <div class="gm-texto-final">
          SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS DA DIRECÇÃO MUNICIPAL DA SAÚDE DO SUMBE, ${dataFmt}.
        </div>

        <div class="gm-assinatura-bloco">
          <div class="gm-cargo-chefe">O CHEFE DE SECÇÃO,</div>
          <div class="gm-nome-chefe">${nomeChefe.toUpperCase()}</div>
        </div>

        <div class="gm-prescricao-bloco">
          <div class="gm-prescricao-titulo">PRESCRIÇÃO MÉDICA</div>
          <div class="gm-linhas-prescricao">
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div class="gm-data-linha">SUMBE ____/____/${anoAtual}</div>
            <div class="gm-medico-assinatura">
              <div class="gm-linha-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>

       <img class="gm-logo-rodape" src="Imagem1.png" alt="Rodape da guia"/>
      </div>

      <!-- PÁGINA 2 -->
      <div class="gm-pagina">
        <div class="gm-prescricao-bloco">
          <div class="gm-prescricao-titulo">PRESCRIÇÃO MÉDICA</div>
          <div class="gm-linhas-prescricao">
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div class="gm-data-linha">SUMBE ____/____/${anoAtual}</div>
            <div class="gm-medico-assinatura">
              <div class="gm-linha-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>

        <div class="gm-prescricao-bloco">
          <div class="gm-prescricao-titulo">PRESCRIÇÃO MÉDICA</div>
          <div class="gm-linhas-prescricao">
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div class="gm-data-linha">SUMBE ____/____/${anoAtual}</div>
            <div class="gm-medico-assinatura">
              <div class="gm-linha-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>

        <div class="gm-prescricao-bloco">
          <div class="gm-prescricao-titulo">PRESCRIÇÃO MÉDICA</div>
          <div class="gm-linhas-prescricao">
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div class="gm-data-linha">SUMBE ____/____/${anoAtual}</div>
            <div class="gm-medico-assinatura">
              <div class="gm-linha-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>

        <div class="gm-prescricao-bloco">
          <div class="gm-prescricao-titulo">PRESCRIÇÃO MÉDICA</div>
          <div class="gm-linhas-prescricao">
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
            <div class="gm-linha-vazia"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div class="gm-data-linha">SUMBE ____/____/${anoAtual}</div>
            <div class="gm-medico-assinatura">
              <div class="gm-linha-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>

        <img class="gm-logo-rodape" src="Imagem1.png" alt="Rodape da guia"/>
      </div>
    </div>
  `;
};
