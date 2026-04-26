(function(global) {
  if (global.SIGDOCBuilderUtils) return;

  const DEFAULT_INSIGNIA_SRC = "insignia.jpeg";
  const FILE_DOCUMENT_TYPE_LABELS = Object.freeze({
    "guia-ferias": "Guia de F\u00e9rias",
    "guia-medica": "Guia M\u00e9dica",
    "declaracao-servico": "Declara\u00e7\u00e3o"
  });
  const INVALID_FILENAME_CHARS_REGEX = /[\/\\:*?"<>|]/g;
  const CONTROL_CHARS_REGEX = /[\u0000-\u001f]/g;
  const MULTIPLE_SPACES_REGEX = /\s+/g;
  const EDGE_DOTS_AND_SPACES_REGEX = /^[. ]+|[. ]+$/g;

  function obterInsigniaSrc(opcoes) {
    const insigniaSrc = opcoes && typeof opcoes.insigniaSrc === "string"
      ? opcoes.insigniaSrc.trim()
      : "";

    if (insigniaSrc) return insigniaSrc;

    const insigniaBase64 = opcoes && typeof opcoes.insigniaBase64 === "string"
      ? opcoes.insigniaBase64.trim()
      : "";

    if (insigniaBase64 && insigniaBase64 !== "BASE64_AQUI") {
      return insigniaBase64;
    }

    return DEFAULT_INSIGNIA_SRC;
  }

  function normalizarEspacos(valor) {
    return String(valor ?? "")
      .replace(MULTIPLE_SPACES_REGEX, " ")
      .trim();
  }

  function sanitizarSegmentoNomeFicheiro(valor) {
    return normalizarEspacos(
      String(valor ?? "")
        .replace(INVALID_FILENAME_CHARS_REGEX, " ")
        .replace(CONTROL_CHARS_REGEX, " ")
    ).replace(EDGE_DOTS_AND_SPACES_REGEX, "");
  }

  function obterNomeFormalTipoDocumento(tipoDocumento) {
    const tipoNormalizado = normalizarEspacos(tipoDocumento);
    return FILE_DOCUMENT_TYPE_LABELS[tipoNormalizado]
      || sanitizarSegmentoNomeFicheiro(tipoNormalizado)
      || "Documento";
  }

  function gerarNomeFicheiro(tipoDocumento, nomeFuncionario) {
    const nomeSeguro = sanitizarSegmentoNomeFicheiro(nomeFuncionario);
    if (!nomeSeguro) return "Documento Sem Nome.pdf";

    const tipoSeguro = obterNomeFormalTipoDocumento(tipoDocumento);
    return tipoSeguro + " - " + nomeSeguro + ".pdf";
  }

  global.SIGDOCBuilderUtils = {
    DEFAULT_INSIGNIA_SRC: DEFAULT_INSIGNIA_SRC,
    FILE_DOCUMENT_TYPE_LABELS: FILE_DOCUMENT_TYPE_LABELS,
    gerarNomeFicheiro: gerarNomeFicheiro,
    normalizarEspacos: normalizarEspacos,
    obterInsigniaSrc: obterInsigniaSrc,
    obterNomeFormalTipoDocumento: obterNomeFormalTipoDocumento,
    sanitizarSegmentoNomeFicheiro: sanitizarSegmentoNomeFicheiro
  };
})(window);
