/**
 * SIGDOC-SUMBE — Guia Médica Builder
 * 
 * Retorna apenas HTML string para inserir no div
 * Sem <!DOCTYPE>, sem <style>, sem <html>
 * CSS está em documentos.html (classe .documento-gm-*)
 */

window.construirGuiaMedica = function(dados, unidadeSanitaria) {
  const d = dados || {};
  
  const numGuia = (d.numGuia && d.anoGuia) ? d.numGuia + "/" + d.anoGuia : "___/____";
  const nome = d.nomeFuncionario || "___________________________";
  const pai = d.nomePai || "___________________________";
  const mae = d.nomeMae || "___________________________";
  const situacao = d.situacao || "Funcionário";
  const naturalidade = d.naturalidade || "___________________________";
  const provincia = d.provincia || "Cuanza Sul";
  const idade = d.idade || "___";
  const sexo = d.sexo || "_";
  const chefe = d.nomeChefe || "___________________________";
  const unidade = unidadeSanitaria || "HOSPITAL MUNICIPAL DO SUMBE";
  const dataEmissao = d.dataEmissao ? fmtExtenso(d.dataEmissao) : "___ DE ___________ DE 2026";
  
  function fmtExtenso(str) {
    if (!str) return "___ DE ___________ DE 2026";
    const meses = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
    const d = new Date(str + "T12:00:00");
    return d.getDate() + " DE " + meses[d.getMonth()] + " DE " + d.getFullYear();
  }

  // PÁGINA 1: Cabeçalho + Dados + Rodapé + 1 Prescrição
  const pagina1 = `
    <div class="gm-pagina">
      <div class="gm-cabecalho">
        <img class="gm-logo" src="angola_coat_of_arms-removebg-preview.png" alt="Angola"/>
        <p>REPÚBLICA DE ANGOLA</p>
        <p>GOVERNO DA PROVÍNCIA DO CUANZA-SUL</p>
        <p>ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
        <p><strong>DIRECÇÃO DE SAÚDE</strong></p>
        <p style="text-decoration:underline;font-size:9px;margin-top:1mm">SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS</p>
      </div>
      
      <div class="gm-titulo">GUIA MÉDICA Nº ${numGuia}</div>
      
      <div class="gm-apresentacao">VAI APRESENTAR-SE AO ${unidade}</div>
      
      <div class="gm-campos">
        <div class="gm-campo">
          <span class="gm-label">Nome:</span>
          <span class="gm-valor">${nome}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Pai:</span>
          <span class="gm-valor">${pai}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Mãe:</span>
          <span class="gm-valor">${mae}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Situação:</span>
          <span class="gm-valor">${situacao}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Naturalidade:</span>
          <span class="gm-valor">${naturalidade}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Província:</span>
          <span class="gm-valor">${provincia}</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Idade:</span>
          <span class="gm-valor">${idade} anos</span>
        </div>
        <div class="gm-campo">
          <span class="gm-label">Sexo:</span>
          <span class="gm-valor">${sexo}</span>
        </div>
      </div>
      
      <div class="gm-rodape">
        <div class="gm-rodape-texto">
          SECÇÃO DE PLANEAMENTO, ESTATÍSTICA E RECURSOS HUMANOS DA DIRECÇÃO<br>
          MUNICIPAL DA SAÚDE DO SUMBE, ${dataEmissao}.
        </div>
        <div class="gm-assinatura">
          <div style="font-weight:bold;margin-bottom:15mm">O CHEFE DE SECÇÃO,</div>
          <div class="gm-linha-assinatura"></div>
          <div style="font-weight:bold;font-size:9px">${chefe}</div>
        </div>
      </div>
      
      <div class="gm-prescricao">
        <div style="text-align:center;font-weight:bold;font-size:10px;margin-bottom:3mm">PRESCRIÇÃO MÉDICA</div>
        <div class="gm-linhas">
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <span>Sumbe ____/____/2026</span>
          <div style="text-align:right">
            <div>O Médico</div>
            <div class="gm-linha-assinatura-medico"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // PÁGINA 2: 5 Prescrições
  let pagina2Html = '';
  for (let i = 0; i < 5; i++) {
    pagina2Html += `
      <div class="gm-prescricao">
        <div style="text-align:center;font-weight:bold;font-size:10px;margin-bottom:3mm">PRESCRIÇÃO MÉDICA</div>
        <div class="gm-linhas">
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
          <div class="gm-linha"></div>
        </div>
        <div class="gm-prescricao-rodape">
          <span>Sumbe ____/____/2026</span>
          <div style="text-align:right">
            <div>O Médico</div>
            <div class="gm-linha-assinatura-medico"></div>
          </div>
        </div>
      </div>
    `;
  }

  const pagina2 = `
    <div class="gm-pagina">
      ${pagina2Html}
      <div style="text-align:center;font-weight:bold;font-size:9px;margin-top:4mm">▲ GOVERNO DE ANGOLA</div>
    </div>
  `;

  return '<div class="documento-gm">' + pagina1 + pagina2 + '</div>';
};
