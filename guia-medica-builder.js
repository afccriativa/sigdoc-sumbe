/**
 * SIGDOC-SUMBE — Construtor de Guia Médica (Fiel ao Modelo PDF)
 * Gera um documento A4 Retrato com 2 páginas.
 */

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const {
    numGuia = '___',
    nomeFuncionario = '__________________________________________',
    nomePai = '__________________________________________',
    nomeMae = '__________________________________________',
    situacao = '___________________',
    naturalidade = '___________________',
    provincia = 'Cuanza Sul',
    idade = '____',
    sexo = '__________',
    nomeChefe = 'HILDEBRANDO M.T. CASSACULA',
    dataEmissao = ''
  } = dados;

  const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
                 "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  
  const anoAtual = new Date().getFullYear();
  let dataFmt = `____ DE __________ DE ${anoAtual}`;
  if (dataEmissao) {
    const d = new Date(dataEmissao + "T12:00:00");
    dataFmt = d.getDate() + " DE " + meses[d.getMonth()] + " DE " + d.getFullYear();
  }

  // Insígnia de Angola (Base64 do ficheiro carregado)
  const INSIGNIA_SRC = "data:image/png;base64,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";

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
        padding: 15mm 20mm;
        box-sizing: border-box;
        position: relative;
        page-break-after: always;
        background: white;
        border: 1px solid #eee; /* Apenas para visualização no browser */
      }
      .gm-cabecalho {
        text-align: center;
        margin-bottom: 5mm;
        line-height: 1.2;
      }
      .gm-logo {
        width: 25mm;
        height: 25mm;
        object-fit: contain;
        margin-bottom: 3mm;
      }
      .gm-cabecalho p {
        margin: 0;
        font-size: 10pt;
        font-weight: normal;
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
        border-bottom: 0;
        flex: 1;
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
      .gm-linha-assinatura {
        border-top: 1px solid #000;
        width: 80mm;
        margin: 0 auto 2mm;
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
        border-top: 1px solid #000;
        padding-top: 5mm;
      }
      .gm-prescricao-titulo {
        font-weight: bold;
        text-decoration: underline;
        font-size: 10pt;
        margin-bottom: 3mm;
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
        bottom: 10mm;
        left: 50%;
        transform: translateX(-50%);
        width: 60mm;
      }
      
      @media print {
        .gm-pagina {
          border: none;
          margin: 0;
        }
      }
    </style>

    <div class="gm-documento">
      <!-- PÁGINA 1 -->
      <div class="gm-pagina">
        <div class="gm-cabecalho">
          <img class="gm-logo" src="${INSIGNIA_SRC}" alt="Insignia de Angola"/>
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
          <div class="gm-campo"><div class="gm-label">SITUAÇÃO:</div><div class="gm-valor">${situacao.toUpperCase()}</div></div>
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

        <!-- Primeira Prescrição na Pág 1 -->
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

        <img class="gm-logo-rodape" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Logo_Governo_de_Angola.png/640px-Logo_Governo_de_Angola.png" alt="Governo de Angola"/>
      </div>

      <!-- PÁGINA 2 -->
      <div class="gm-pagina">
        ${[1, 2, 3, 4].map(() => `
          <div class="gm-prescricao-bloco" style="margin-top: 5mm; border-top: none;">
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
          <div style="height: 10mm;"></div>
        `).join('')}

        <img class="gm-logo-rodape" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Logo_Governo_de_Angola.png/640px-Logo_Governo_de_Angola.png" alt="Governo de Angola"/>
      </div>
    </div>
  `;
};
