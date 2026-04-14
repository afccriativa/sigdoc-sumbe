window.SIGDOC_UNIDADES = (function () {
  function toId(nome) {
    return String(nome || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function clone(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  const DMS_NOME = "Direc\u00e7\u00e3o Municipal de Sa\u00fade do Sumbe";
  const SECCOES_DMS = [
    "Sec\u00e7\u00e3o de Planeamento, Estat\u00edstica e Recursos Humanos",
    "Sec\u00e7\u00e3o de Sa\u00fade P\u00fablica",
    "Sec\u00e7\u00e3o de Inspec\u00e7\u00e3o Sanit\u00e1ria",
    "Sec\u00e7\u00e3o de Log\u00edstica Hospitalar e Medicamentos",
    "Secretaria"
  ];

  const CATALOGO_BASE = [
    {
      codigo: "dms-sumbe",
      nome: DMS_NOME,
      tipo: "dms",
      ordem: 10,
      nomeAbreviado: "DMS",
      servicos: [
        "Gest\u00e3o Municipal",
        "Recursos Humanos",
        "Log\u00edstica",
        "Sa\u00fade P\u00fablica",
        "Estat\u00edstica",
        "Inspec\u00e7\u00e3o Sanit\u00e1ria"
      ],
      estrutura: {
        seccoes: SECCOES_DMS.slice()
      }
    },
    {
      codigo: "cs-pedra-1",
      nome: "Centro de Sa\u00fade da Pedra 1",
      tipo: "centro",
      ordem: 20,
      nomeAbreviado: "CS Pedra 1",
      servicos: [
        "Consulta Externa",
        "Urg\u00eancias",
        "Maternidade",
        "Laborat\u00f3rio",
        "Farm\u00e1cia",
        "PAV",
        "CPN",
        "Testagem VIH"
      ]
    },
    {
      codigo: "cs-assaca",
      nome: "Centro de Sa\u00fade da Assaca",
      tipo: "centro",
      ordem: 30,
      nomeAbreviado: "CS Assaca",
      servicos: [
        "Consulta Externa",
        "Urg\u00eancias",
        "Maternidade",
        "Laborat\u00f3rio",
        "Farm\u00e1cia",
        "PAV",
        "CPN"
      ]
    },
    {
      codigo: "cs-chingo",
      nome: "Centro de Sa\u00fade do Chingo",
      tipo: "centro",
      ordem: 40,
      nomeAbreviado: "CS Chingo",
      servicos: [
        "Consulta Externa",
        "Urg\u00eancias",
        "Maternidade",
        "Farm\u00e1cia",
        "PAV",
        "CPN"
      ]
    },
    {
      codigo: "ps-atuco",
      nome: "Posto de Sa\u00fade do Atuco",
      tipo: "posto",
      ordem: 50,
      nomeAbreviado: "PS Atuco",
      servicos: ["Consulta Externa", "PAV"]
    },
    {
      codigo: "ps-bumba",
      nome: "Posto de Sa\u00fade da Bumba",
      tipo: "posto",
      ordem: 60,
      nomeAbreviado: "PS Bumba",
      servicos: ["Consulta Externa", "PAV", "CPN", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-canguanja",
      nome: "Posto de Sa\u00fade da Canguanja",
      tipo: "posto",
      ordem: 70,
      nomeAbreviado: "PS Canguanja",
      servicos: ["Consulta Externa", "PAV", "CPN", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-cangulo",
      nome: "Posto de Sa\u00fade do Cangulo",
      tipo: "posto",
      ordem: 80,
      nomeAbreviado: "PS Cangulo",
      servicos: ["Consulta Externa", "PAV", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-casa-branca",
      nome: "Posto de Sa\u00fade da Casa Branca",
      tipo: "posto",
      ordem: 90,
      nomeAbreviado: "PS Casa Branca",
      servicos: ["Consulta Externa", "PAV", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-firmar-praia",
      nome: "Posto de Sa\u00fade Firmar/Praia",
      tipo: "posto",
      ordem: 100,
      nomeAbreviado: "PS Firmar/Praia",
      servicos: ["Consulta Externa", "PAV", "CPN"]
    },
    {
      codigo: "ps-mercado-feira",
      nome: "Posto de Sa\u00fade do Mercado da Feira",
      tipo: "posto",
      ordem: 110,
      nomeAbreviado: "PS Mercado Feira",
      servicos: ["Consulta Externa", "PAV", "Testagem VIH"]
    },
    {
      codigo: "ps-njata",
      nome: "Posto de Sa\u00fade da Njata",
      tipo: "posto",
      ordem: 120,
      nomeAbreviado: "PS Njata",
      servicos: ["Consulta Externa", "PAV", "CPN"]
    },
    {
      codigo: "ps-pindo",
      nome: "Posto de Sa\u00fade do Pindo",
      tipo: "posto",
      ordem: 130,
      nomeAbreviado: "PS Pindo",
      servicos: ["Consulta Externa", "PAV"]
    },
    {
      codigo: "ps-pomba-nova",
      nome: "Posto de Sa\u00fade da Pomba Nova",
      tipo: "posto",
      ordem: 140,
      nomeAbreviado: "PS Pomba Nova",
      servicos: ["Consulta Externa", "PAV", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-salinas",
      nome: "Posto de Sa\u00fade das Salinas",
      tipo: "posto",
      ordem: 150,
      nomeAbreviado: "PS Salinas",
      servicos: ["Consulta Externa", "PAV", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-quicombo",
      nome: "Posto de Sa\u00fade do Quicombo",
      tipo: "posto",
      ordem: 160,
      nomeAbreviado: "PS Quicombo",
      servicos: ["Consulta Externa", "PAV", "Farm\u00e1cia"]
    },
    {
      codigo: "ps-santa-cruz",
      nome: "Posto de Sa\u00fade da Santa Cruz",
      tipo: "posto",
      ordem: 170,
      nomeAbreviado: "PS Santa Cruz",
      servicos: ["Consulta Externa", "PAV", "CPN", "Farm\u00e1cia"]
    }
  ].map(function (item) {
    return {
      id: toId(item.nome),
      activa: true,
      ...item
    };
  });

  const MAPA_POR_ID = {};
  const MAPA_POR_CODIGO = {};
  const MAPA_POR_NOME = {};
  const MAPA_ORDEM = {};
  CATALOGO_BASE.forEach(function (u, indice) {
    MAPA_POR_ID[u.id] = u;
    MAPA_POR_CODIGO[u.codigo] = u;
    MAPA_POR_NOME[u.nome] = u;
    MAPA_ORDEM[u.id] = indice;
  });

  function abreviarNome(nome, fallback) {
    const abrvFn = window.SIGDOC_CONFIG && typeof window.SIGDOC_CONFIG.abrvUnidade === "function"
      ? window.SIGDOC_CONFIG.abrvUnidade
      : null;
    if (abrvFn) return abrvFn(nome, fallback);
    return fallback || nome || "";
  }

  function obterBase(ref) {
    if (!ref) return null;
    if (typeof ref === "object" && ref.id && MAPA_POR_ID[ref.id]) return MAPA_POR_ID[ref.id];
    if (typeof ref === "object" && ref.codigo && MAPA_POR_CODIGO[ref.codigo]) return MAPA_POR_CODIGO[ref.codigo];
    if (typeof ref === "object" && ref.nome && MAPA_POR_NOME[ref.nome]) return MAPA_POR_NOME[ref.nome];
    if (typeof ref === "string") {
      return MAPA_POR_ID[ref]
        || MAPA_POR_CODIGO[ref]
        || MAPA_POR_NOME[ref]
        || MAPA_POR_ID[toId(ref)]
        || null;
    }
    return null;
  }

  function normalizarUnidade(registo) {
    const bruto = registo || {};
    const base = obterBase(bruto) || obterBase(bruto.nome) || null;
    const nome = bruto.nome || (base && base.nome) || "";
    const id = bruto.id || (base && base.id) || toId(nome);
    const tipo = bruto.tipo || (base && base.tipo) || "posto";
    const estrutura = bruto.estrutura && typeof bruto.estrutura === "object"
      ? { ...(base && base.estrutura ? clone(base.estrutura) : {}), ...clone(bruto.estrutura) }
      : (base && base.estrutura ? clone(base.estrutura) : {});

    return {
      ...(base ? clone(base) : {}),
      ...clone(bruto),
      id: id,
      codigo: bruto.codigo || (base && base.codigo) || id,
      nome: nome,
      tipo: tipo,
      nomeAbreviado: bruto.nomeAbreviado || (base && base.nomeAbreviado) || abreviarNome(nome),
      servicos: Array.isArray(bruto.servicos)
        ? bruto.servicos.slice()
        : (base && Array.isArray(base.servicos) ? base.servicos.slice() : []),
      estrutura: estrutura
    };
  }

  function ordenarUnidades(lista) {
    const ordemTipo = { dms: 0, centro: 1, posto: 2, seccao: 3 };
    return (lista || [])
      .map(normalizarUnidade)
      .sort(function (a, b) {
        const idxA = MAPA_ORDEM[a.id];
        const idxB = MAPA_ORDEM[b.id];
        if (idxA !== undefined || idxB !== undefined) {
          if (idxA === undefined) return 1;
          if (idxB === undefined) return -1;
          if (idxA !== idxB) return idxA - idxB;
        }
        const tipoA = ordemTipo[a.tipo] !== undefined ? ordemTipo[a.tipo] : 99;
        const tipoB = ordemTipo[b.tipo] !== undefined ? ordemTipo[b.tipo] : 99;
        if (tipoA !== tipoB) return tipoA - tipoB;
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt");
      });
  }

  function buildOption(unidade, opcoes) {
    const opt = document.createElement("option");
    const valueField = opcoes.valueField || "nome";
    const valor = valueField === "id"
      ? unidade.id
      : valueField === "codigo"
        ? (unidade.codigo || unidade.id)
        : unidade.nome;
    opt.value = valor || "";
    opt.textContent = opcoes.useAbbreviation
      ? (unidade.nomeAbreviado || abreviarNome(unidade.nome))
      : unidade.nome;
    opt.dataset.unidadeId = unidade.id || "";
    opt.dataset.codigo = unidade.codigo || "";
    opt.dataset.tipo = unidade.tipo || "";
    return opt;
  }

  function renderUnidadeSelect(selectEl, unidades, opcoes) {
    if (!selectEl) return;
    const cfg = {
      includeBlank: true,
      blankLabel: "Seleccione...",
      valueField: "nome",
      useAbbreviation: false,
      selected: selectEl.value || "",
      ...opcoes
    };
    const lista = ordenarUnidades(unidades);
    const selected = cfg.selected || "";
    let encontrouSeleccionado = !selected;

    selectEl.innerHTML = "";
    if (cfg.includeBlank) {
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = cfg.blankLabel;
      selectEl.appendChild(blank);
    }

    const grupos = { dms: [], centro: [], posto: [], outro: [] };
    lista.forEach(function (u) {
      const chave = grupos[u.tipo] ? u.tipo : "outro";
      grupos[chave].push(u);
    });

    function appendGrupo(label, items) {
      if (!items.length) return;
      const alvo = label ? document.createElement("optgroup") : selectEl;
      if (label) alvo.label = label;
      items.forEach(function (u) {
        const opt = buildOption(u, cfg);
        if (opt.value === selected) encontrouSeleccionado = true;
        alvo.appendChild(opt);
      });
      if (label) selectEl.appendChild(alvo);
    }

    appendGrupo("", grupos.dms);
    appendGrupo("Centros de Saude", grupos.centro);
    appendGrupo("Postos de Saude", grupos.posto);
    appendGrupo("Outras Unidades", grupos.outro);

    if (!encontrouSeleccionado && selected) {
      const legado = document.createElement("option");
      legado.value = selected;
      legado.textContent = selected;
      legado.dataset.legacy = "true";
      selectEl.appendChild(legado);
    }

    selectEl.value = selected;
  }

  function renderSeccaoSelect(selectEl, opcoes) {
    if (!selectEl) return;
    const cfg = {
      includeBlank: true,
      blankLabel: "Seleccione a Seccao...",
      selected: selectEl.value || "",
      seccoes: SECCOES_DMS.slice(),
      ...opcoes
    };
    const selected = cfg.selected || "";
    let encontrouSeleccionado = !selected;

    selectEl.innerHTML = "";
    if (cfg.includeBlank) {
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = cfg.blankLabel;
      selectEl.appendChild(blank);
    }
    cfg.seccoes.forEach(function (sec) {
      const opt = document.createElement("option");
      opt.value = sec;
      opt.textContent = sec;
      if (sec === selected) encontrouSeleccionado = true;
      selectEl.appendChild(opt);
    });
    if (!encontrouSeleccionado && selected) {
      const legado = document.createElement("option");
      legado.value = selected;
      legado.textContent = selected;
      legado.dataset.legacy = "true";
      selectEl.appendChild(legado);
    }
    selectEl.value = selected;
  }

  function buildSeedPayload(unidade, serverTimestamp) {
    return {
      id: unidade.id,
      codigo: unidade.codigo,
      nome: unidade.nome,
      nomeAbreviado: unidade.nomeAbreviado || abreviarNome(unidade.nome),
      tipo: unidade.tipo,
      activa: true,
      servicos: Array.isArray(unidade.servicos) ? unidade.servicos.slice() : [],
      estrutura: unidade.estrutura ? clone(unidade.estrutura) : {},
      criadoEm: typeof serverTimestamp === "function" ? serverTimestamp() : null,
      actualizadoEm: typeof serverTimestamp === "function" ? serverTimestamp() : null
    };
  }

  async function garantirCatalogoMinimo(db, fns) {
    const api = fns || {};
    if (!db || !api.collection || !api.getDocs || !api.doc || !api.setDoc) {
      throw new Error("SIGDOC_UNIDADES.garantirCatalogoMinimo requer db, collection, getDocs, doc e setDoc.");
    }

    const colRef = api.collection(db, "unidades_sanitarias");
    let snap = await api.getDocs(colRef);
    const existentes = new Set(snap.docs.map(function (d) { return d.id; }));
    const faltantes = CATALOGO_BASE.filter(function (u) { return !existentes.has(u.id); });

    if (faltantes.length) {
      try {
        if (api.writeBatch) {
          const batch = api.writeBatch(db);
          faltantes.forEach(function (u) {
            batch.set(
              api.doc(db, "unidades_sanitarias", u.id),
              buildSeedPayload(u, api.serverTimestamp),
              { merge: true }
            );
          });
          await batch.commit();
        } else {
          await Promise.all(faltantes.map(function (u) {
            return api.setDoc(
              api.doc(db, "unidades_sanitarias", u.id),
              buildSeedPayload(u, api.serverTimestamp),
              { merge: true }
            );
          }));
        }
        snap = await api.getDocs(colRef);
      } catch (erro) {
        console.warn("SIGDOC_UNIDADES: nao foi possivel completar o catalogo.", erro && (erro.code || erro.message || erro));
        if (snap.docs.length) {
          return ordenarUnidades(snap.docs.map(function (d) {
            return normalizarUnidade({ id: d.id, ...d.data() });
          }));
        }
        return CATALOGO_BASE.map(clone);
      }
    }

    return ordenarUnidades(snap.docs.map(function (d) {
      return normalizarUnidade({ id: d.id, ...d.data() });
    }));
  }

  return {
    DMS_ID: toId(DMS_NOME),
    DMS_NOME: DMS_NOME,
    toId: toId,
    catalogoBase: function () { return CATALOGO_BASE.map(clone); },
    seccoesDms: function () { return SECCOES_DMS.slice(); },
    obterBase: function (ref) { return obterBase(ref) ? clone(obterBase(ref)) : null; },
    obterTipo: function (ref) {
      if (ref && typeof ref === "object" && ref.tipo) return ref.tipo;
      const base = obterBase(ref);
      return base ? base.tipo : "";
    },
    isDms: function (ref) { return this.obterTipo(ref) === "dms"; },
    isCentro: function (ref) { return this.obterTipo(ref) === "centro"; },
    normalizarUnidade: normalizarUnidade,
    ordenarUnidades: ordenarUnidades,
    renderUnidadeSelect: renderUnidadeSelect,
    renderSeccaoSelect: renderSeccaoSelect,
    garantirCatalogoMinimo: garantirCatalogoMinimo
  };
})();
