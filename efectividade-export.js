// SIGDOC-SUMBE · efectividade-export.js
// Gera o "Mapa de Efectividade Mensal" em PDF, replicando fielmente o
// layout institucional (REPÚBLICA DE ANGOLA / GOVERNO / ADM. MUNICIPAL /
// DIRECÇÃO DE SAÚDE / unidade / título / tabela / OBS / assinaturas).
//
// Abordagem: construir uma página HTML isolada (impressão A4) e accionar
// o diálogo de impressão nativo do browser — o utilizador escolhe
// "Guardar como PDF". Sem dependências externas, funciona offline.

function nomeMesPt(mesIso) {
  const [ano, mes] = mesIso.split("-").map(Number);
  const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${nomes[mes - 1]} / ${ano}`;
}

function dataLongaPt(d = new Date()) {
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" });
}

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
}

function pct(valor) {
  return valor ? `${Math.round(valor * 100)}%` : "—";
}

function linhaFuncionarioHtml(f, ordem) {
  const sub = f.subsidios || {};
  return `
    <tr>
      <td class="centro">${ordem}</td>
      <td class="centro auto">${escaparHtml(f.numeroAgente || "—")}</td>
      <td class="esq auto">${escaparHtml(f.nomeCompleto || "")}</td>
      <td class="esq auto">${escaparHtml(f.categoria || "")}</td>
      <td class="centro auto neg">${f.diasTrab ?? 24}</td>
      <td class="centro">${f.falInj || 0}</td>
      <td class="centro">${f.falJus || 0}</td>
      <td class="centro auto">${sub.atavio ? pct(0.05) : "—"}</td>
      <td class="centro auto">${sub.redta ? pct(0.07) : "—"}</td>
      <td class="centro auto">${sub.turno ? pct(0.05) : "—"}</td>
      <td class="centro auto">${sub.noct ? pct(0.07) : "—"}</td>
      <td class="centro auto">${sub.diut ? pct(0.03) : "—"}</td>
      <td class="centro auto">${f.acrescido || "—"}</td>
      <td class="centro auto">${sub.eind ? pct(0.05) : "—"}</td>
      <td class="centro auto">${f.ferias?.estado === "sim" ? escaparHtml(f.ferias.periodo || "Em férias") : "—"}</td>
    </tr>
  `;
}

function construirHtmlMapa(mapa, unidade) {
  const linhas = (mapa.funcionarios || []).map((f, i) => linhaFuncionarioHtml(f, i + 1)).join("");
  const linhaVaziaSeNecessario = (mapa.funcionarios || []).length === 0
    ? `<tr><td colspan="15" class="centro" style="padding:14px;color:#64748b">Sem funcionários nesta unidade.</td></tr>`
    : "";

  const nomeUnidade = escaparHtml((unidade.nome || "UNIDADE SANITÁRIA").toUpperCase());

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Mapa de Efectividade — ${nomeUnidade} — ${escaparHtml(nomeMesPt(mapa.mes))}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; }
  .cabecalho { text-align: center; margin-bottom: 4mm; }
  .cabecalho p { margin: 1px 0; font-size: 11.5px; }
  .cabecalho .unidade { font-weight: 700; font-size: 13px; color: #c0392b; }
  .titulo { text-align: center; font-weight: 700; font-size: 14.5px; margin: 5mm 0 4mm; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #94a3b8; padding: 4px 5px; }
  th { background: #eef2f7; font-weight: 700; text-align: center; font-size: 9px; }
  td.centro { text-align: center; }
  td.esq { text-align: left; }
  td.auto { color: #c0392b; }
  td.neg { font-weight: 700; }
  .obs { font-size: 9.5px; font-style: italic; margin: 4mm 0; color: #334155; }
  .fecho { text-align: center; font-weight: 700; color: #c0392b; font-size: 11px; margin: 5mm 0 7mm; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 4mm; }
  .assinaturas > div { width: 46%; text-align: center; font-size: 11px; }
  .assinaturas .label { margin-bottom: 10mm; }
  .assinaturas .nome { border-top: 1px solid #111827; padding-top: 3px; font-weight: 600; }
  .assinaturas .nome.auto { color: #c0392b; }
  @media print {
    .acoes-no-print { display: none; }
  }
</style>
</head>
<body>

  <div class="acoes-no-print" style="text-align:center;padding:14px;background:#f1f5f9;margin-bottom:10px">
    <button onclick="window.print()" style="font-size:14px;font-weight:700;padding:10px 22px;background:#1241a1;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ Imprimir / Guardar como PDF</button>
    <p style="margin-top:8px;font-size:12px;color:#475569">Na janela de impressão, escolha "Guardar como PDF" como destino.</p>
  </div>

  <div class="cabecalho">
    <p>REPÚBLICA DE ANGOLA</p>
    <p>GOVERNO DA PROVÍNCIA DO CUANZA SUL</p>
    <p style="font-size:13px">ADMINISTRAÇÃO MUNICIPAL DO SUMBE</p>
    <p style="font-weight:700;font-size:13px">DIRECÇÃO MUNICIPAL DE SAÚDE</p>
    <p class="unidade">${nomeUnidade}</p>
  </div>

  <div class="titulo">MAPA DE EFECTIVIDADE REFERENTE AO MÊS DE ${escaparHtml(nomeMesPt(mapa.mes).toUpperCase())}</div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">N/O</th>
        <th rowspan="2">Nº Agente</th>
        <th rowspan="2">Nome Completo</th>
        <th rowspan="2">Categoria</th>
        <th rowspan="2">Dias Trab.</th>
        <th rowspan="2">F. Inj.</th>
        <th rowspan="2">Fal. Jus.</th>
        <th colspan="7">Subsídios e outros Suplementos que têm direito</th>
      </tr>
      <tr>
        <th>Atávio 5%</th><th>R.E.Dta 7%</th><th>Turno 5%</th><th>Noct. 7%</th><th>Diut. 3%</th><th>Trab. Acresc.</th><th>E.Ind. 5%</th>
        <th rowspan="1">Férias</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}${linhaVaziaSeNecessario}
    </tbody>
  </table>

  <p class="obs">OBS: F. Inj. = Faltas Injustificadas · Fal. Jus. = Faltas Justificadas. Os serviços de Horas Acrescidas foram feitos em função de reforços e atendimentos aos pacientes na Unidade Sanitária, nas diferentes áreas.</p>

  <p class="fecho">${nomeUnidade}, AOS ${escaparHtml(dataLongaPt().toUpperCase())}</p>

  <div class="assinaturas">
    <div>
      <p class="label">ELABORADO POR:</p>
      <p class="nome auto">${escaparHtml((mapa.elaboradoPor || "—").toUpperCase())}</p>
    </div>
    <div>
      <p class="label">VERIFICADO POR:</p>
      <p class="nome">${escaparHtml((mapa.verificadoPor || "—").toUpperCase())} — CHEFE DA UNIDADE</p>
    </div>
  </div>

</body>
</html>
  `;
}

function gerarMapaPdf(mapa, unidade) {
  const html = construirHtmlMapa(mapa, unidade);
  const janela = window.open("", "_blank", "width=1100,height=780");
  if (!janela) {
    window.mostrarNotif?.("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.", "aviso");
    return;
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

window.SIGDOC_EXPORT_PDF = function (mapa, unidade) {
  gerarMapaPdf(mapa, unidade);
};
