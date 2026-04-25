(function(global) {
  if (global.SIGDOCBuilderUtils) return;

  const DEFAULT_INSIGNIA_SRC = "insignia.jpeg";

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

  global.SIGDOCBuilderUtils = {
    DEFAULT_INSIGNIA_SRC: DEFAULT_INSIGNIA_SRC,
    obterInsigniaSrc: obterInsigniaSrc
  };
})(window);
