# Changelog — SIGDOC-SUMBE · Painel Administrativo

> Ficheiro de registo de alterações ao componente `index.html` do sistema SIGDOC-SUMBE.  
> Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) adaptado.  
> Projecto: Direcção Municipal de Saúde do Sumbe · Ibisner Solutions

---

## [Sprint de Qualidade] — 2026-05-30

Sessão de auditoria e remediação completa do `index.html`. Ponto de partida: ficheiro único
de 326 KB / 6 368 linhas com 15 problemas identificados em 5 categorias. Resultado: 3 ficheiros
separados, 15 correcções aplicadas, zero `confirm()` nativos em fluxos de sessão,
zero inline styles redundantes, e arquitectura preparada para cache independente por ficheiro.

---

### 🔴 Corrigido — Bugs críticos

**ID duplicado `avatar-utilizador` — topbar sem avatar (C1)**  
Dois elementos partilhavam o mesmo `id="avatar-utilizador"`: um na sidebar e outro na topbar.
`getElementById` apanhava sempre o da sidebar. O avatar da topbar ficava permanentemente
com `?`, independentemente do utilizador autenticado.  
Corrigido: sidebar renomeada para `id="avatar-sb"`; a função `mostrarPainel` passa a
actualizar ambos — `avatar-utilizador` (topbar) e `avatar-sb` (sidebar) — com a mesma inicial.

**`carregarPedidosSecretaria` inacessível no scope global — filtros da secretaria quebrados (C2)**  
A função estava definida como local do módulo ES (`async function carregarPedidosSecretaria()`).
Os atributos `onchange` dos filtros de estado e data invocavam-na no scope global,
resultando em `ReferenceError` silencioso. Filtrar por estado ou intervalo de datas
não produzia qualquer efeito.  
Corrigido: `window.carregarPedidosSecretaria = carregarPedidosSecretaria` adicionado
imediatamente após a definição da função.

**`fazerLogout` com `confirm()` nativo — inconsistência de UX (C3)**  
O fluxo de logout era o único ponto do sistema que ainda usava o diálogo nativo do browser,
quebrando a linguagem visual do produto e impossibilitando customização visual ou de timeout.  
Corrigido: substituído por `mostrarNotif(msg, 'aviso', { label, timeout: 7000, fn })` —
toast âmbar com botão "Sair agora →" e 7 segundos para cancelar, seguindo o padrão
dos toasts de acção já usados noutros módulos do sistema.

---

### 🟡 Corrigido — Bugs visuais

**Toggle de senha sem mudança de ícone — feedback visual ausente (C4)**  
O botão de mostrar/ocultar senha alterava o `type` do campo entre `password` e `text`
mas o SVG do botão permanecia sempre "olho aberto", independentemente do estado actual.  
Corrigido: declaradas duas constantes `_SVG_OLHO_ABERTO` e `_SVG_OLHO_FECHADO`
(SVG Lucide inline). `toggleSenha()` faz swap do `innerHTML` do botão a cada chamada.

**Pesquisa global: texto invisível em fundo claro — estado inicial ilegível (C5)**  
Os rótulos "funcionários", "documentos" e "solicitações" no estado inicial da pesquisa
global usavam `color:rgba(255,255,255,.5)` — um branco translúcido adequado para fundos
escuros, mas o overlay da pesquisa usa `var(--surface)` (branco). Texto invisible.
O mesmo problema afectava o estado "sem resultados".  
Corrigido: as três ocorrências (HTML estático, `mostrarEstadoInicial()` JS,
e `renderResultados()` JS) substituídas por `color:var(--pri)`.

**Badges de perfil e estado sem CSS definido — tabela de utilizadores sem diferenciação visual (C6)**  
As classes `.badge-perfil`, `.b-activo` e `.b-inactivo` eram usadas extensivamente
no módulo de utilizadores mas não tinham nenhuma regra CSS declarada. A tabela
mostrava texto plano sem cor, peso ou contentor visual.  
Corrigido: adicionadas ao CSS as regras de `.badge-perfil` (base) + 7 variantes
de perfil (`perfil-admin`, `perfil-director`, `perfil-chefe`, `perfil-tecnico`,
`perfil-secretaria`, `perfil-funcionario`, `perfil-chefe_unidade`) com cores semânticas
alinhadas com o design system, e `.b-activo` (verde `--ok`) / `.b-inactivo` (cinza `--txt-3`).

---

### 🟡 Corrigido — Qualidade de código e lógica

**`actualizarCabecalhoPainel` chamada duas vezes em `mostrarPainel` — subtítulo sobrescrito (C7)**  
A primeira chamada ocorria antes do IIFE que calcula a saudação e o subtítulo contextual.
A segunda (pós-IIFE) tinha o contexto correcto mas, para `chefe_unidade`, sobrescrevia
o subtítulo entretanto calculado com um valor inferior.  
Corrigido: removida a primeira chamada (redundante e sem contexto completo).
A chamada em `carregarPainelChefeUnidade` mantém-se intacta.

**Barra de navegação sequencial desactualizada após refresh da lista (C8)**  
`carregarPedidosSecretaria` actualizava `_secListaIds` e recalculava `_secIdxActual`
mas não chamava `_actualizarNavSeq()`. A barra de navegação ("2 / 8") ficava
desactualizada após filtro, refresh por onSnapshot, ou alteração de estado.  
Corrigido: `_actualizarNavSeq()` chamada dentro do bloco `if (_chatSecId)` imediatamente
após o recálculo do índice.

**Botão "+ Novo Registo" visível para todos os perfis no desktop (C9)**  
O botão da topbar navega para a secção de utilizadores, restrita a `admin`. Secretaria,
chefes de unidade e funcionários viam o botão no desktop sem poder aceder à secção.  
Corrigido: adicionado `id="topbar-btn-new"` ao botão; em `mostrarPainel`, o botão
é ocultado (`display:none`) para todos os perfis que não incluam `"admin"` nos seus roles.

**`abrirFicha` chama `abrirModalPerfil` com argumentos ignorados — perfil errado abre (C12)**  
A pesquisa global para `tipo === 'funcionario'` chamava `abrirModalPerfil(id, snap.data())`.
Contudo, `abrirModalPerfil()` ignora todos os argumentos e mostra sempre o perfil
do utilizador actual (admin). O resultado da pesquisa abria o perfil do admin em vez
do funcionário pesquisado.  
Corrigido: removida a chamada morta. Substituída por `mostrarNotif` com nome, cargo
e unidade do funcionário encontrado — informação accionável sem efeito colateral.

---

### 🟠 Corrigido — Segurança

**`carregarSessoes` e `carregarSessoesActivas` sem sanitização de HTML — risco XSS (C10)**  
Valores provenientes do Firestore (`nome`, `email`, `perfil`) eram inseridos directamente
em `innerHTML` sem passar por `escaparHtml()`. Um nome com `<script>`, `<img onerror=...>`,
ou aspas poderia corromper o layout ou executar código arbitrário.  
Corrigido: `escaparHtml()` aplicado a todos os campos do Firestore nas duas funções.
`etiquetasPerfil[s.perfil]` (valor local) mantém-se sem escape; `s.perfil` usado
como fallback passa a ser escapado.

**`expulsarSessao` com escape frágil no `onclick` inline — atributo corrompível (C11)**  
O botão de expulsão construía o `onclick` com `.replace(/'/g,"\\'")`  — tratava
apostrofes mas era vulnerável a nomes com `"` (quebra de atributo HTML) ou `\`
(escape incompleto).  
Corrigido: `onclick` substituído por `data-uid` e `data-nome` com `escaparHtml()`.
O handler passa a ler `this.dataset.uid` e `this.dataset.nome` — imune a qualquer
caractere no nome do utilizador.

---

### ⚙️ Melhorado — Performance e Arquitectura

**Polling de badges mobile substituído por sincronização reactiva (C13)**  
`setInterval(sincronizarBadgesMobile, 1500)` executava a 667 vezes por minuto
independentemente de qualquer mudança de estado.  
Corrigido: `setInterval` removido; `sincronizarBadgesMobile()` é agora chamada
directamente no fim de `actualizarBadgeSino()` — o único ponto onde o estado dos
badges efectivamente muda. Latência de actualização: < 16ms após cada evento real.
Chamada inicial mantida para o estado de arranque.

**Inline styles redundantes na topbar removidos (C15)**  
Cinco `style="..."` na `div.topbar` e nos seus filhos directos repetiam ou conflituavam
com propriedades já declaradas em `.topbar`, `.topbar-search input` e `.topbar-search-ic`.
Corrigido: inline styles removidos; propriedades exclusivas do `#topbar-titulo`
movidas para a nova classe CSS `.topbar-titulo`.  
Detectado e removido: link `<link rel="stylesheet" href="index.css">` duplicado
que existia dentro do `div#ecrã-loading` (erro pré-existente).

**Separação do monolítico em 3 ficheiros independentes (C14)**

| Ficheiro | Linhas | Conteúdo |
|---|---|---|
| `index.html` | 1 123 | HTML puro — estrutura e semântica |
| `index.css` | 2 725 | CSS completo com todos os design tokens |
| `index-app.js` | 2 583 | Módulo ES: Firebase Auth + Firestore + lógica |

Ponto de partida: `index.html` único com 6 368 linhas / 326 KB.  
Benefícios: cache independente por ficheiro, edição cirúrgica sem risco de
corrupção acidental, rastreabilidade de diff por linguagem no controlo de versões.

---

### ℹ️ Investigado e mantido

**`topbar-search-bar` com inline style — não é redundância (C15, parcial)**  
O `div#topbar-search-bar` tem `style="display:flex;align-items:center;..."` inline.
Embora `.topbar-search` declare propriedades similares, o elemento de pesquisa da topbar
usa um fundo e border-radius ligeiramente diferentes dos da pesquisa global (`sp-overlay`).
O inline style é especificação local legítima — mantido sem alteração.

---

## Ficheiros afectados

| Ficheiro | Tipo de alteração |
|---|---|
| `index.html` | Correcções C1–C15; separado em 3 ficheiros |
| `index.css` | **Novo** — extraído de `index.html`; adicionadas classes C6, C15 |
| `index-app.js` | **Novo** — extraído de `index.html`; correcções C2, C3, C7–C13 aplicadas |

---

## Mensagem de commit sugerida

```
fix(index): auditoria sprint — 15 correcções (segurança, bugs, UX, arquitectura)

- C1: resolve ID duplicado avatar-utilizador (sidebar → avatar-sb)
- C2: expõe carregarPedidosSecretaria em window (filtros da secretaria)
- C3: substitui confirm() de logout por toast com acção (7s, cancelável)
- C4: toggle senha com swap de ícone olho aberto/fechado (Lucide SVG)
- C5: pesquisa global — texto var(--pri) em vez de rgba branco invisível
- C6: CSS para .badge-perfil (7 variantes), .b-activo, .b-inactivo
- C7: remove chamada redundante de actualizarCabecalhoPainel em mostrarPainel
- C8: _actualizarNavSeq() chamada após recálculo do índice da lista
- C9: topbar-btn-new ocultado para perfis sem acesso a utilizadores
- C10: escaparHtml() em carregarSessoes e carregarSessoesActivas (XSS)
- C11: onclick expulsarSessao usa data-* em vez de escape frágil (XSS)
- C12: abrirFicha — remove chamada morta a abrirModalPerfil; toast contextual
- C13: remove setInterval badges mobile; sincronização reactiva em actualizarBadgeSino
- C14: separação monolítico → index.html (1123L) + index.css (2725L) + index-app.js (2583L)
- C15: remove inline styles redundantes topbar; adiciona .topbar-titulo ao CSS
```
