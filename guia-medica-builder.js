/**
 * SIGDOC-SUMBE — Guia Médica Builder (CORRIGIDO)
 * 
 * - A4 RETRATO exacto (sem quebras automáticas)
 * - Exactamente 2 páginas
 * - Naturalidade = campo "municipio" do cadastro
 * - CSS optimizado para print
 */

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const d = dados || {};
  
  const numGuia = (d.numGuia || '___/2026').toString();
  const nome = (d.nomeFuncionario || '___________________________');
  const pai = (d.nomePai || '___________________________');
  const mae = (d.nomeMae || '___________________________');
  const situacao = (d.situacao || 'Funcionário');
  const naturalidade = (d.naturalidade || '___________________________'); // Vem de "municipio" do cadastro
  const provincia = (d.provincia || 'Cuanza Sul');
  const idade = (d.idade || '___');
  const sexo = (d.sexo || '_');
  const chefe = (d.nomeChefe || '___________________________');
  const unidade = (unidadeSanitaria || 'HOSPITAL MUNICIPAL DO SUMBE');
  const dataEmissao = d.dataEmissao ? fmtExtenso(d.dataEmissao) : '___ DE ___________ DE 2026';
  
  function fmtExtenso(str) {
    if (!str) return '___ DE ___________ DE 2026';
    try {
      const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
      const [a, m, dia] = str.split('-');
      return parseInt(dia) + ' DE ' + meses[parseInt(m) - 1] + ' DE ' + a;
    } catch (e) {
      return '___ DE ___________ DE 2026';
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Guia Médica</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          margin: 0;
          padding: 10px;
        }
        
        /* CONTENEDOR COM 2 PÁGINAS A4 RETRATO */
        .documento-gm {
          max-width: 210mm;
          margin: 10px auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        
        /* PÁGINA (A4: 210mm × 297mm) */
        .pagina-gm {
          width: 210mm;
          height: 297mm;
          padding: 13mm;
          margin: 0;
          page-break-after: always;
          page-break-inside: avoid;
          font-size: 11px;
          line-height: 1.35;
          color: #000;
          display: block;
          overflow: hidden;
        }
        
        /* CABEÇALHO */
        .gm-cabecalho {
          text-align: center;
          margin-bottom: 8mm;
          padding-bottom: 5mm;
          border-bottom: 1px solid #000;
        }
        
        .gm-logo {
          width: 30mm;
          height: auto;
          margin: 0 auto 4mm;
          display: block;
        }
        
        .gm-cabecalho-linhas {
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          line-height: 1.3;
        }
        
        .gm-cabecalho-secao {
          font-size: 9px;
          margin-top: 1mm;
          text-decoration: underline;
          font-weight: bold;
        }
        
        /* TÍTULO */
        .gm-titulo {
          text-align: center;
          font-size: 11px;
          font-weight: bold;
          text-decoration: underline;
          margin: 4mm 0 5mm;
          text-transform: uppercase;
        }
        
        /* APRESENTAÇÃO */
        .gm-apresentacao {
          text-align: center;
          font-size: 10px;
          font-weight: bold;
          margin: 4mm 0 6mm;
          text-transform: uppercase;
        }
        
        /* DADOS */
        .gm-dados {
          margin-bottom: 6mm;
        }
        
        .gm-campo {
          display: flex;
          margin-bottom: 3mm;
          line-height: 1.2;
        }
        
        .gm-label {
          font-weight: bold;
          width: 80mm;
          padding-right: 2mm;
          font-size: 10px;
        }
        
        .gm-valor {
          flex: 1;
          border-bottom: 1px solid #000;
          padding: 0 1mm;
          min-height: 3.5mm;
          font-size: 10px;
        }
        
        /* RODAPÉ COM ASSINATURA */
        .gm-rodape {
          margin-top: 6mm;
          text-align: center;
          font-size: 9px;
        }
        
        .gm-rodape-texto {
          font-weight: bold;
          line-height: 1.3;
          margin-bottom: 6mm;
        }
        
        .gm-ass-titulo {
          font-weight: bold;
          margin-bottom: 12mm;
          font-size: 9px;
        }
        
        .gm-ass-linha {
          border-top: 1px solid #000;
          width: 65mm;
          height: 1px;
          margin: 0 auto 1mm;
        }
        
        .gm-ass-nome {
          font-weight: bold;
          font-size: 9px;
        }
        
        /* PRESCRIÇÃO */
        .gm-prescricao {
          margin-top: 6mm;
          font-size: 10px;
        }
        
        .gm-prescricao-titulo {
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 3mm;
          text-transform: uppercase;
        }
        
        .gm-prescricao-linhas {
          margin-bottom: 2mm;
        }
        
        .gm-linha {
          border-bottom: 1px solid #666;
          height: 12px;
          margin-bottom: 3px;
        }
        
        .gm-prescricao-rodape {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 9px;
          margin-top: 2mm;
        }
        
        .gm-medico-assinatura {
          text-align: right;
        }
        
        .gm-medico-linha {
          border-top: 1px solid #000;
          width: 45mm;
          margin: 8mm 0 0.5mm;
        }
        
        /* LOGO RODAPÉ */
        .gm-logo-rodape {
          text-align: center;
          font-weight: bold;
          font-size: 8px;
          margin-top: 4mm;
        }
        
        /* PRINT */
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .documento-gm {
            max-width: 100%;
            margin: 0;
            box-shadow: none;
          }
          .pagina-gm {
            margin: 0;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="documento-gm">
        
        <!-- PÁGINA 1 -->
        <div class="pagina-gm">
          <div class="gm-cabecalho">
            <img class="gm-logo" src="angola_coat_of_arms-removebg-preview.png" alt="Angola"/>
            <div class="gm-cabecalho-linhas">
              República de Angola<br>
              Governo da Província do Cuanza-Sul<br>
              Administração Municipal do Sumbe<br>
              Direcção de Saúde
            </div>
            <div class="gm-cabecalho-secao">Secção de Planeamento, Estatística e Recursos Humanos</div>
          </div>
          
          <div class="gm-titulo">Guia Médica Nº ${numGuia}</div>
          
          <div class="gm-apresentacao">Vai apresentar-se ao ${unidade.toUpperCase()}</div>
          
          <div class="gm-dados">
            <div class="gm-campo">
              <div class="gm-label">Nome:</div>
              <div class="gm-valor">${nome.toUpperCase()}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Pai:</div>
              <div class="gm-valor">${pai.toUpperCase()}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Mãe:</div>
              <div class="gm-valor">${mae.toUpperCase()}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Situação:</div>
              <div class="gm-valor">${situacao}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Naturalidade:</div>
              <div class="gm-valor">${naturalidade.toUpperCase()}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Província:</div>
              <div class="gm-valor">${provincia}</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Idade:</div>
              <div class="gm-valor">${idade} anos</div>
            </div>
            <div class="gm-campo">
              <div class="gm-label">Sexo:</div>
              <div class="gm-valor">${sexo}</div>
            </div>
          </div>
          
          <div class="gm-rodape">
            <div class="gm-rodape-texto">
              Secção de Planeamento, Estatística e Recursos Humanos da Direcção<br>
              Municipal da Saúde do Sumbe, ${dataEmissao}.
            </div>
            <div class="gm-ass-titulo">O Chefe de Secção,</div>
            <div class="gm-ass-linha"></div>
            <div class="gm-ass-nome">${chefe.toUpperCase()}</div>
          </div>
          
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- PÁGINA 2 -->
        <div class="pagina-gm">
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
          
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
          
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
          
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
          
          <div class="gm-prescricao">
            <div class="gm-prescricao-titulo">Prescrição Médica</div>
            <div class="gm-prescricao-linhas">
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
              <div class="gm-linha"></div>
            </div>
            <div class="gm-prescricao-rodape">
              <span>Sumbe ____/____/2026</span>
              <div class="gm-medico-assinatura">
                O Médico
                <div class="gm-medico-linha"></div>
              </div>
            </div>
          </div>
          
          <div class="gm-logo-rodape">▲ Governo de Angola</div>
        </div>
        
      </div>
    </body>
    </html>
  `;

  return html;
};

window.guiaMedicaBuilder = { construir: window.construirGuiaMedica };
