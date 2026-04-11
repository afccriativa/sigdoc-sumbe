/**
 * SIGDOC-SUMBE — Construtor de Guia Médica
 * Este ficheiro contém a lógica para gerar o HTML da Guia Médica
 * seguindo o padrão institucional da Direcção Municipal da Saúde do Sumbe.
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
    nomeChefe = 'Hildebrando M.T. Cassacula',
    dataEmissao = ''
  } = dados;

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  let dataFmt = "____ de __________ de 202__";
  if (dataEmissao) {
    const d = new Date(dataEmissao + "T12:00:00");
    dataFmt = d.getDate() + " de " + meses[d.getMonth()] + " de " + d.getFullYear();
  }

  const INSIGNIA_SRC = "data:image/png;base64,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";

  return `
    <div class="documento-gm">
      <div class="gm-pagina">
        <div class="gm-cabecalho">
          <img class="gm-logo" src="${INSIGNIA_SRC}" alt="Insignia de Angola"/>
          <p>REPÚBLICA DE ANGOLA</p>
          <p>GOVERNO PROVINCIAL DO CUANZA - SUL</p>
          <p>ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
          <p>DIRECÇÃO MUNICIPAL DA SAÚDE</p>
        </div>

        <div class="gm-titulo">GUIA MÉDICA Nº ${numGuia} / ${new Date().getFullYear()}</div>

        <div class="gm-apresentacao">
          VAI APRESENTAR-SE AO: <u>${unidadeSanitaria.toUpperCase()}</u>
        </div>

        <div class="gm-campos">
          <div class="gm-campo">
            <div class="gm-label">NOME COMPLETO:</div>
            <div class="gm-valor">${nomeFuncionario.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">FILHO DE:</div>
            <div class="gm-valor">${nomePai.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">E DE:</div>
            <div class="gm-valor">${nomeMae.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">SITUAÇÃO:</div>
            <div class="gm-valor">${situacao.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">NATURAL DE:</div>
            <div class="gm-valor">${naturalidade.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">PROVÍNCIA DE:</div>
            <div class="gm-valor">${provincia.toUpperCase()}</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">IDADE:</div>
            <div class="gm-valor">${idade} ANOS</div>
          </div>
          <div class="gm-campo">
            <div class="gm-label">SEXO:</div>
            <div class="gm-valor">${sexo.toUpperCase()}</div>
          </div>
        </div>

        <div class="gm-rodape">
          <div class="gm-rodape-texto">
            DIRECÇÃO MUNICIPAL DA SAÚDE DO SUMBE, AOS ${dataFmt.toUpperCase()}.
          </div>
          <div class="gm-assinatura">
            <div class="gm-linha-assinatura"></div>
            <div class="gm-ass-nome">O CHEFE DE SECÇÃO</div>
            <div style="font-weight: bold; margin-top: 2mm;">${nomeChefe.toUpperCase()}</div>
          </div>
        </div>

        <div class="gm-prescricao">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3mm;">PRESCRIÇÃO MÉDICA:</div>
          <div class="gm-linhas">
            <div class="gm-linha"></div>
            <div class="gm-linha"></div>
            <div class="gm-linha"></div>
            <div class="gm-linha"></div>
            <div class="gm-linha"></div>
          </div>
          <div class="gm-prescricao-rodape">
            <div>DATA: ____/____/202__</div>
            <div style="text-align: center;">
              <div class="gm-linha-assinatura-medico"></div>
              <div>O MÉDICO</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};
