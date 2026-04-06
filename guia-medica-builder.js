/**
 * SIGDOC-SUMBE — Guia Médica Builder
 * Constrói automaticamente guias médicas em 2 páginas conforme modelo oficial
 * 
 * Uso: construirGuiaMedica(funcionarioData) → HTML de 2 páginas pronto para impressão
 */

// Base64 da insignia (coat of arms de Angola) — inlined para evitar requisições
const INSIGNIA_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAH0AfQDASIAAhEBAxEB/8QAHQABAAEFAQEBAAAAAAAAAAAAAAYDBAUHCAIBCf/EAFMQAAEDAwIEBAMFBAYGCAUBCQECAwQABREGIQcSMUETUWFxIoGRCBQyobEVI0LBUmJy0eHwFiQzQ4KSFzQ1OHWisvElRFNVlSZFVGRzdIWjs8L/xAAcAQEAAgMBAQEAAAAAAAAAAAAABQYBAwQCBwj/xABCEQABAwMCBAMEBwYFBAIDAAABAAIDBAURITEGEkFRImFxEzKBkRRCUqGxwfAHFSMzctEWJDVi4RclQ/E0UyaSov/aAAwDAQACEQMRAD8A4ypSlESlKURKUpRFJSlESlKURKUpRFJSlESlKURKUpRFJSlESlKURK';

/**
 * Construir guia médica HTML
 * @param {object} funcionario - Dados do funcionário
 * @returns {string} HTML de 2 páginas
 */
window.construirGuiaMedica = function(funcionario) {
  const f = funcionario || {};
  
  const numGuia = f.numGuia || '___/2026';
  const nome = f.nomeFuncionario || '___________________________';
  const pai = f.nomePai || '___________________________';
  const mae = f.nomeMae || '___________________________';
  const situacao = f.situacao || 'Funcionário';
  const naturalidade = f.naturalidade || '___________________________';
  const provincia = f.provincia || 'Cuanza Sul';
  const idade = f.idade || '___';
  const sexo = f.sexo || '___';
  const chefe = f.nomeChefe || '___________________________';
  const dataEmissao = f.dataEmissao ? fmtExtenso(f.dataEmissao) : '___ DE __________ DE ____';

  // CSS de impressão
  const css = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: #e0e0e0; }
      .pagina-gm {
        width: 210mm;
        height: 297mm;
        background: white;
        padding: 20px;
        margin: 10px auto;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        font-size: 12px;
        line-height: 1.5;
        color: #333;
        position: relative;
      }
      .gm-cabecalho {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }
      .gm-insignia {
        width: 50px;
        height: 50px;
        margin: 0 auto 5px;
        display: block;
      }
      .gm-cabecalho p {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: bold;
        margin: 2px 0;
        letter-spacing: 0.5px;
      }
      .gm-titulo {
        text-align: center;
        font-size: 13px;
        font-weight: bold;
        text-decoration: underline;
        text-transform: uppercase;
        margin: 15px 0 20px;
      }
      .gm-campo {
        margin-bottom: 8px;
        display: flex;
        align-items: center;
      }
      .gm-rotulo {
        font-weight: bold;
        min-width: 120px;
        display: inline-block;
      }
      .gm-valor {
        flex: 1;
        border-bottom: 1px solid #333;
        padding: 2px 5px;
      }
      .gm-rodape {
        margin-top: 30px;
        font-size: 11px;
      }
      .gm-assinatura-bloco {
        margin-top: 20px;
        text-align: center;
      }
      .gm-ass-linha {
        border-top: 1px solid #333;
        width: 150px;
        margin: 30px auto 5px;
      }
      .gm-ass-nome {
        font-weight: bold;
        font-size: 11px;
      }
      .gm-prescrição {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #333;
      }
      .gm-prescrição-titulo {
        text-align: center;
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 12px;
      }
      .gm-prescrição-linhas {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .gm-prescricao-linha {
        border-bottom: 1px solid #999;
        height: 20px;
      }
      .gm-data-medico {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
        font-size: 11px;
      }
      .gm-logo-rodape {
        text-align: center;
        margin-top: 20px;
        font-size: 10px;
        color: #666;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      @media print {
        body { background: white; }
        .pagina-gm { margin: 0; box-shadow: none; }
      }
    </style>
  `;

  // Função formatação de data
  function fmtExtenso(str) {
    if (!str) return '___ DE __________ DE ____';
    const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                   'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
    const d = new Date(str + 'T12:00:00');
    return d.getDate() + ' DE ' + meses[d.getMonth()] + ' DE ' + d.getFullYear();
  }

  // PÁGINA 1: Cabeçalho + Dados do Funcionário + Prescrição
  const pagina1 = `
    <div class="pagina-gm">
      <div class="gm-cabecalho">
        <img class="gm-insignia" src="data:image/jpeg;base64,${INSIGNIA_BASE64}" alt="Insignia de Angola"/>
        <p>REPÚBLICA DE ANGOLA</p>
        <p>GOVERNO DA PROVÍNCIA DO CUANZA-SUL</p>
        <p>ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
        <p>DIRECÇÃO DE SAÚDE</p>
        <p style="margin-top: 5px;">SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS</p>
      </div>
      
      <div class="gm-titulo">GUIA MÉDICA Nº ${numGuia}</div>
      
      <div class="gm-titulo" style="font-size: 11px; text-decoration: none; margin: 10px 0 15px;">
        VAI APRESENTAR-SE AO HOSPITAL MUNICIPAL DO SUMBE
      </div>
      
      <div class="gm-campo">
        <div class="gm-rotulo">NOME:</div>
        <div class="gm-valor">${nome}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">PAI:</div>
        <div class="gm-valor">${pai}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">MÃE:</div>
        <div class="gm-valor">${mae}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">SITUAÇÃO:</div>
        <div class="gm-valor">${situacao}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">NATURALIDADE:</div>
        <div class="gm-valor">${naturalidade}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">PROVÍNCIA:</div>
        <div class="gm-valor">${provincia}</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">IDADE:</div>
        <div class="gm-valor">${idade} anos</div>
      </div>
      <div class="gm-campo">
        <div class="gm-rotulo">SEXO:</div>
        <div class="gm-valor">${sexo}</div>
      </div>
      
      <div class="gm-rodape">
        <p style="font-weight: bold; margin-bottom: 10px;">SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS DA DIRECÇÃO MUNICIPAL DA SAÚDE DO SUMBE, ${dataEmissao}.</p>
        <p style="text-align: center; margin-bottom: 15px;">O CHEFE DE SECÇÃO,</p>
        <div style="height: 40px;"></div>
        <p style="text-align: center; font-weight: bold;">${chefe}</p>
      </div>
      
      <div class="gm-prescrição">
        <div class="gm-prescrição-titulo">PRESCRIÇÃO MÉDICA</div>
        <div class="gm-prescrição-linhas">
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
        </div>
        <div class="gm-data-medico">
          <div>Sumbe ____/____/2026</div>
          <div style="text-align: right;">O Médico<br><div style="height: 30px;"></div></div>
        </div>
      </div>
    </div>
  `;

  // PÁGINAS 2-6: Prescrições Múltiplas (5 secções por página × 2 páginas = 10 prescrições)
  const prescricoes = [];
  for (let i = 0; i < 10; i++) {
    prescricoes.push(`
      <div class="gm-prescrição">
        <div class="gm-prescrição-titulo">PRESCRIÇÃO MÉDICA</div>
        <div class="gm-prescrição-linhas">
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
          <div class="gm-prescricao-linha"></div>
        </div>
        <div class="gm-data-medico">
          <div>Sumbe ____/____/2026</div>
          <div style="text-align: right;">O Médico<br><div style="height: 30px;"></div></div>
        </div>
      </div>
    `);
  }

  // Agrupar prescrições em 2 páginas (5 por página)
  const pags = [];
  for (let p = 0; p < 2; p++) {
    let html = `<div class="pagina-gm ${p > 0 ? 'page-break' : ''}">`;
    for (let i = 0; i < 5; i++) {
      html += prescricoes[p * 5 + i];
    }
    html += `
      <div class="gm-logo-rodape">
        <strong>GOVERNO DE ANGOLA</strong>
      </div>
    </div>`;
    pags.push(html);
  }

  return css + pagina1 + pags.join('');
};

// Exportar para janela
window.guiaMedicaBuilder = {
  construir: window.construirGuiaMedica
};
