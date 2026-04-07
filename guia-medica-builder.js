/**
 * SIGDOC-SUMBE — Guia Médica Builder v2.0
 * 
 * Formato: A4 RETRATO (210mm × 297mm)
 * Páginas: EXATAMENTE 2 (Página 1: Dados + 1 Prescrição | Página 2: 9 Prescrições)
 * Logo: Angola PNG melhorada (carregada do servidor)
 * 
 * ✅ NATURALIDADE preenchida automaticamente do cadastro do funcionário
 * ✅ "VAI APRESENTAR-SE AO..." dinâmico conforme unidade sanitária escolhida
 * ✅ Formato exactamente conforme modelo PDF oficial
 * ✅ Optimizado para impressão A4 retrato
 * 
 * Uso:
 *   window.construirGuiaMedica(funcionarioData, unidadeSanitaria)
 * 
 * Exemplo:
 *   construirGuiaMedica({
 *     numGuia: "101/2026",
 *     nomeFuncionario: "João da Silva",
 *     naturalidade: "Sumbe",
 *     ...
 *   }, "Hospital Central de Luanda")
 */

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const f = dados || {};
  
  // ═══════════════════════════════════════════════════════════════
  // PREENCHIMENTO DE DADOS
  // ═══════════════════════════════════════════════════════════════
  
  const numGuia = f.numGuia || '___/2026';
  const nomeFuncionario = f.nomeFuncionario || '___________________________';
  const nomePai = f.nomePai || '___________________________';
  const nomeMae = f.nomeMae || '___________________________';
  const situacao = f.situacao || 'Funcionário';
  
  // ✅ NATURALIDADE — preenchida automaticamente do cadastro
  const naturalidade = f.naturalidade || '___________________________';
  
  const provincia = f.provincia || 'Cuanza Sul';
  const idade = f.idade ? String(f.idade).padStart(2, ' ') : '__';
  const sexo = f.sexo ? f.sexo.charAt(0).toUpperCase() : '_';
  const nomeChefe = f.nomeChefe || '___________________________';
  const dataEmissao = f.dataEmissao ? fmtExtenso(f.dataEmissao) : '___ DE ___________ DE 2026';
  
  // ✅ UNIDADE SANITÁRIA — dinâmica conforme input
  const unidadeSanitariaTexto = unidadeSanitaria 
    ? unidadeSanitaria.toUpperCase().trim()
    : 'HOSPITAL MUNICIPAL DO SUMBE';
  
  // ═══════════════════════════════════════════════════════════════
  // FUNÇÃO AUXILIAR: Formatar data para extenso português
  // ═══════════════════════════════════════════════════════════════
  
  function fmtExtenso(dataStr) {
    if (!dataStr) return '___ DE ___________ DE 2026';
    try {
      const [ano, mes, dia] = dataStr.split('-').map(x => parseInt(x, 10));
      const meses = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
      ];
      return String(dia).padStart(2, ' ') + ' DE ' + meses[mes - 1] + ' DE ' + ano;
    } catch (e) {
      return '___ DE ___________ DE 2026';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CSS — Otimizado para A4 RETRATO + Impressão
  // ═══════════════════════════════════════════════════════════════
  
  const css = `
    <style>
      /* Reset */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; }
      
      body { 
        font-family: 'Times New Roman', Times, serif;
        background: #f5f5f5;
        padding: 0;
        margin: 0;
      }
      
      /* ═══ PÁGINA A4 RETRATO ═══ */
      .pagina-gm {
        width: 210mm;
        height: 297mm;
        background: white;
        margin: 5mm auto;
        padding: 12mm 15mm;
        color: #000;
        font-size: 11px;
        line-height: 1.3;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        page-break-after: always;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      /* ═══ CABEÇALHO ═══ */
      .gm-cabecalho {
        text-align: center;
        margin-bottom: 10mm;
        padding-bottom: 8mm;
        border-bottom: 2px solid #000;
      }
      
      .gm-logo {
        width: 35mm;
        height: auto;
        margin: 0 auto 4mm;
        display: block;
      }
      
      .gm-cabecalho-texto {
        font-weight: bold;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1.5;
      }
      
      .gm-cabecalho-texto-secao {
        font-weight: bold;
        font-size: 9px;
        margin-top: 2mm;
        text-decoration: underline;
      }
      
      /* ═══ TÍTULO ═══ */
      .gm-titulo {
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        text-decoration: underline;
        margin: 6mm 0 8mm;
        text-transform: uppercase;
      }
      
      /* ═══ APRESENTAÇÃO ═══ */
      .gm-apresentacao {
        text-align: center;
        font-size: 11px;
        font-weight: bold;
        margin: 8mm 0 10mm;
        text-transform: uppercase;
      }
      
      /* ═══ CAMPOS DE DADOS ═══ */
      .gm-campo {
        display: flex;
        margin-bottom: 4mm;
        align-items: baseline;
      }
      
      .gm-rotulo {
        font-weight: bold;
        font-size: 11px;
        min-width: 85mm;
        padding-right: 2mm;
      }
      
      .gm-valor {
        flex: 1;
        border-bottom: 1px solid #000;
        padding-bottom: 1mm;
        min-height: 4mm;
        font-size: 11px;
      }
      
      /* ═══ RODAPÉ COM ASSINATURA ═══ */
      .gm-rodape-texto {
        text-align: center;
        font-weight: bold;
        font-size: 10px;
        margin-top: 8mm;
        margin-bottom: 5mm;
        line-height: 1.4;
      }
      
      .gm-rodape-assinatura {
        text-align: center;
        margin-top: 12mm;
      }
      
      .gm-ass-titulo {
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 18mm;
      }
      
      .gm-ass-linha {
        border-top: 1px solid #000;
        width: 75mm;
        margin: 0 auto 2mm;
      }
      
      .gm-ass-nome {
        font-weight: bold;
        font-size: 10px;
      }
      
      /* ═══ PRESCRIÇÕES ═══ */
      .gm-prescricao {
        margin-top: 10mm;
        padding-top: 8mm;
        border-top: 1px solid #000;
      }
      
      .gm-prescricao-titulo {
        text-align: center;
        font-weight: bold;
        font-size: 11px;
        text-transform: uppercase;
        margin-bottom: 4mm;
      }
      
      .gm-prescricao-linhas {
        margin-bottom: 4mm;
      }
      
      .gm-prescricao-linha {
        border-bottom: 1px solid #999;
        height: 15px;
        margin-bottom: 6px;
      }
      
      .gm-prescricao-rodape {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 10px;
        margin-top: 3mm;
      }
      
      .gm-medico-bloco {
        text-align: right;
      }
      
      .gm-medico-assinatura {
        border-top: 1px solid #000;
        width: 50mm;
        height: 15px;
        margin: 10mm 0 1mm;
      }
      
      .gm-medico-nome {
        font-size: 9px;
        text-align: center;
      }
      
      /* ═══ LOGO RODAPÉ ═══ */
      .gm-logo-rodape {
        text-align: center;
        margin-top: 6mm;
        font-size: 10px;
        font-weight: bold;
      }
      
      /* ═══ PRINT ═══ */
      @media print {
        body {
          background: white;
          margin: 0;
          padding: 0;
        }
        .pagina-gm {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
        }
      }
    </style>
  `;

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 1: CABEÇALHO + DADOS + 1 PRESCRIÇÃO
  // ═══════════════════════════════════════════════════════════════
  
  const pagina1 = `
    <div class="pagina-gm">
      <!-- Cabeçalho -->
      <div class="gm-cabecalho">
        <img class="gm-logo" src="angola_coat_of_arms-removebg-preview.png" alt="Insígnia de Angola"/>
        <div class="gm-cabecalho-texto">
          República de Angola<br>
          Governo da Província do Cuanza-Sul<br>
          Administração Municipal do Sumbe<br>
          Direcção de Saúde
        </div>
        <div class="gm-cabecalho-texto-secao">Secção de Planeamento, Estatística e Recursos Humanos</div>
      </div>
      
      <!-- Título da Guia -->
      <div class="gm-titulo">Guia Médica Nº ${numGuia}</div>
      
      <!-- Apresentação — DINÂMICA conforme unidade sanitária -->
      <div class="gm-apresentacao">Vai apresentar-se ao ${unidadeSanitariaTexto}</div>
      
      <!-- Dados do Funcionário -->
      <div class="gm-campo">
        <div class="gm-rotulo">Nome:</div>
        <div class="gm-valor">${nomeFuncionario}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Pai:</div>
        <div class="gm-valor">${nomePai}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Mãe:</div>
        <div class="gm-valor">${nomeMae}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Situação:</div>
        <div class="gm-valor">${situacao}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Naturalidade:</div>
        <div class="gm-valor">${naturalidade}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Província:</div>
        <div class="gm-valor">${provincia}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Idade:</div>
        <div class="gm-valor">${idade} anos</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">Sexo:</div>
        <div class="gm-valor">${sexo}</div>
      </div>
      
      <!-- Rodapé com Data e Assinatura -->
      <div class="gm-rodape-texto">
        Secção de Planeamento, Estatística e Recursos Humanos da Direcção<br>
        Municipal da Saúde do Sumbe, ${dataEmissao}.
      </div>
      
      <div class="gm-rodape-assinatura">
        <div class="gm-ass-titulo">O Chefe de Secção,</div>
        <div class="gm-ass-linha"></div>
        <div class="gm-ass-nome">${nomeChefe}</div>
      </div>
      
      <!-- Primeira Prescrição Médica -->
      <div class="gm-prescricao">
        <div class="gm-prescricao-titulo">Prescrição Médica</div>
        <div class="gm-prescricao-linhas">
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <div>Sumbe ____/____/2026</div>
          <div class="gm-medico-bloco">
            <div>O Médico</div>
            <div class="gm-medico-assinatura"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 2: 9 PRESCRIÇÕES ADICIONAIS + LOGO RODAPÉ
  // ═══════════════════════════════════════════════════════════════
  
  let prescricoes = '';
  for (let i = 0; i < 9; i++) {
    prescricoes += `
      <div class="gm-prescricao">
        <div class="gm-prescricao-titulo">Prescrição Médica</div>
        <div class="gm-prescricao-linhas">
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <div>Sumbe ____/____/2026</div>
          <div class="gm-medico-bloco">
            <div>O Médico</div>
            <div class="gm-medico-assinatura"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  const pagina2 = `
    <div class="pagina-gm">
      ${prescricoes}
      <div class="gm-logo-rodape">
        ▲ Governo de Angola
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════
  // RETORNAR HTML COMPLETO (CSS + PÁGINA 1 + PÁGINA 2)
  // ═══════════════════════════════════════════════════════════════
  
  return css + pagina1 + pagina2;
};

// ✅ Exportar função globalmente
window.guiaMedicaBuilder = {
  construir: window.construirGuiaMedica
};
