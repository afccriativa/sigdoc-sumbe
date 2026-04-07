/**
 * SIGDOC-SUMBE — Guia Médica Builder
 * 
 * Especificações exactas:
 * - Formato: A4 RETRATO (210mm × 297mm)
 * - Páginas: EXACTAMENTE 2
 *   • Página 1: Cabeçalho + Dados + Rodapé + 1 Prescrição
 *   • Página 2: 5-6 Prescrições + Logo rodapé
 * - Logo: PNG Angola (carregada do servidor)
 * - Estilo: Fiel ao modelo PDF oficial
 * - NATURALIDADE: Preenchida automaticamente
 * - "VAI APRESENTAR-SE AO": Dinâmico conforme unidade sanitária
 */

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const d = dados || {};
  
  // ═══════════════════════════════════════════════════════════════════
  // DADOS
  // ═══════════════════════════════════════════════════════════════════
  
  const numGuia = (d.numGuia || '___/2026').toString();
  const nome = (d.nomeFuncionario || '___________________________').toUpperCase();
  const pai = (d.nomePai || '___________________________').toUpperCase();
  const mae = (d.nomeMae || '___________________________').toUpperCase();
  const situacao = (d.situacao || 'Funcionário');
  const naturalidade = (d.naturalidade || '___________________________').toUpperCase();
  const provincia = (d.provincia || 'Cuanza Sul');
  const idade = (d.idade || '___');
  const sexo = (d.sexo || '_').charAt(0).toUpperCase();
  const chefe = (d.nomeChefe || '___________________________').toUpperCase();
  const unidade = (unidadeSanitaria || 'HOSPITAL MUNICIPAL DO SUMBE').toUpperCase();
  const dataEmissao = d.dataEmissao ? fmtExtenso(d.dataEmissao) : '___ DE ___________ DE 2026';
  
  // Função auxiliar: formatar data
  function fmtExtenso(str) {
    if (!str) return '___ DE ___________ DE 2026';
    try {
      const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
      const [a, m, d] = str.split('-');
      const dia = parseInt(d, 10);
      const mes = meses[parseInt(m, 10) - 1];
      const ano = a;
      return dia + ' DE ' + mes + ' DE ' + ano;
    } catch(e) {
      return '___ DE ___________ DE 2026';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // CSS — Formatação profissional A4 retrato
  // ═══════════════════════════════════════════════════════════════════
  
  const css = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }
      body { 
        font-family: Arial, sans-serif;
        background: #f0f0f0;
        padding: 0;
      }
      
      /* Página A4 RETRATO */
      .pagina-gm {
        width: 210mm;
        height: 297mm;
        background: white;
        margin: 5mm auto;
        padding: 15mm;
        color: #000;
        font-size: 11px;
        line-height: 1.4;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        page-break-after: always;
        display: flex;
        flex-direction: column;
      }
      
      /* Cabeçalho */
      .gm-header {
        text-align: center;
        margin-bottom: 10mm;
        padding-bottom: 8mm;
        border-bottom: 1px solid #000;
      }
      
      .gm-logo {
        width: 35mm;
        height: auto;
        margin: 0 auto 5mm;
        display: block;
      }
      
      .gm-header p {
        font-weight: bold;
        font-size: 10px;
        margin: 1mm 0;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      
      .gm-header p.secao {
        font-size: 9px;
        margin-top: 2mm;
        text-decoration: underline;
      }
      
      /* Título */
      .gm-titulo {
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        text-decoration: underline;
        margin: 6mm 0 6mm;
        text-transform: uppercase;
      }
      
      /* Apresentação */
      .gm-apresentacao {
        text-align: center;
        font-size: 11px;
        font-weight: bold;
        margin: 6mm 0 10mm;
        text-transform: uppercase;
      }
      
      /* Campos de dados */
      .gm-campo {
        display: flex;
        margin-bottom: 4mm;
        align-items: baseline;
        page-break-inside: avoid;
      }
      
      .gm-label {
        font-weight: bold;
        width: 85mm;
        padding-right: 2mm;
      }
      
      .gm-valor {
        flex: 1;
        border-bottom: 1px solid #000;
        padding: 1mm 2mm;
        min-height: 4mm;
      }
      
      /* Rodapé com assinatura */
      .gm-footer {
        margin-top: 8mm;
        text-align: center;
      }
      
      .gm-footer-texto {
        font-weight: bold;
        font-size: 9px;
        line-height: 1.4;
        margin-bottom: 8mm;
      }
      
      .gm-assinatura {
        margin-top: 10mm;
      }
      
      .gm-ass-titulo {
        font-weight: bold;
        font-size: 10px;
        margin-bottom: 15mm;
      }
      
      .gm-ass-linha {
        border-top: 1px solid #000;
        width: 70mm;
        height: 1px;
        margin: 0 auto 2mm;
      }
      
      .gm-ass-nome {
        font-weight: bold;
        font-size: 10px;
      }
      
      /* Prescrição */
      .gm-prescricao {
        margin-top: 8mm;
        page-break-inside: avoid;
      }
      
      .gm-prescricao-titulo {
        text-align: center;
        font-weight: bold;
        font-size: 11px;
        text-transform: uppercase;
        margin-bottom: 4mm;
      }
      
      .gm-linhas {
        margin-bottom: 4mm;
      }
      
      .gm-linha {
        border-bottom: 1px solid #666;
        height: 13px;
        margin-bottom: 4px;
      }
      
      .gm-prescricao-rodape {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin-top: 3mm;
      }
      
      .gm-medico {
        text-align: right;
      }
      
      .gm-medico-linha {
        border-top: 1px solid #000;
        width: 50mm;
        margin: 10mm 0 1mm;
      }
      
      /* Logo rodapé */
      .gm-logo-rodape {
        text-align: center;
        font-weight: bold;
        font-size: 9px;
        margin-top: 6mm;
      }
      
      /* Print */
      @media print {
        body { background: white; margin: 0; padding: 0; }
        .pagina-gm { margin: 0; box-shadow: none; }
      }
    </style>
  `;

  // ═══════════════════════════════════════════════════════════════════
  // PÁGINA 1: Cabeçalho + Dados + Rodapé + 1 Prescrição
  // ═══════════════════════════════════════════════════════════════════
  
  const pagina1 = `
    <div class="pagina-gm">
      <!-- CABEÇALHO -->
      <div class="gm-header">
        <img class="gm-logo" src="angola_coat_of_arms-removebg-preview.png" alt="Insignia Angola"/>
        <p>República de Angola</p>
        <p>Governo da Província do Cuanza-Sul</p>
        <p>Administração Municipal do Sumbe</p>
        <p>Direcção de Saúde</p>
        <p class="secao">Secção de Planeamento, Estatística e Recursos Humanos</p>
      </div>
      
      <!-- TÍTULO -->
      <div class="gm-titulo">Guia Médica Nº ${numGuia}</div>
      
      <!-- APRESENTAÇÃO DINÂMICA -->
      <div class="gm-apresentacao">Vai apresentar-se ao ${unidade}</div>
      
      <!-- CAMPOS DE DADOS -->
      <div class="gm-campo">
        <div class="gm-label">Nome:</div>
        <div class="gm-valor">${nome}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-label">Pai:</div>
        <div class="gm-valor">${pai}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-label">Mãe:</div>
        <div class="gm-valor">${mae}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-label">Situação:</div>
        <div class="gm-valor">${situacao}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-label">Naturalidade:</div>
        <div class="gm-valor">${naturalidade}</div>
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
      
      <!-- RODAPÉ COM ASSINATURA -->
      <div class="gm-footer">
        <div class="gm-footer-texto">
          Secção de Planeamento, Estatística e Recursos Humanos da Direcção<br>
          Municipal da Saúde do Sumbe, ${dataEmissao}.
        </div>
        <div class="gm-assinatura">
          <div class="gm-ass-titulo">O Chefe de Secção,</div>
          <div class="gm-ass-linha"></div>
          <div class="gm-ass-nome">${chefe}</div>
        </div>
      </div>
      
      <!-- PRESCRIÇÃO 1 -->
      <div class="gm-prescricao">
        <div class="gm-prescricao-titulo">Prescrição Médica</div>
        <div class="gm-linhas">
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <span>Sumbe ____/____/2026</span>
          <div class="gm-medico">
            O Médico
            <div class="gm-medico-linha"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════════
  // PÁGINA 2: 5-6 Prescrições + Logo rodapé
  // ═══════════════════════════════════════════════════════════════════
  
  let prescrições = '';
  for (let i = 0; i < 5; i++) {
    prescrições += `
      <div class="gm-prescricao">
        <div class="gm-prescricao-titulo">Prescrição Médica</div>
        <div class="gm-linhas">
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <span>Sumbe ____/____/2026</span>
          <div class="gm-medico">
            O Médico
            <div class="gm-medico-linha"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  const pagina2 = `
    <div class="pagina-gm">
      ${prescrições}
      <div class="gm-logo-rodape">
        ▲ Governo de Angola
      </div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════════
  // RETORNAR HTML COMPLETO
  // ═══════════════════════════════════════════════════════════════════
  
  return css + pagina1 + pagina2;
};

// Exportar para window
window.guiaMedicaBuilder = { construir: window.construirGuiaMedica };
