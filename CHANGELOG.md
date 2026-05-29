# Changelog — SIGDOC-SUMBE · Portal do Funcionário

> Ficheiro de registo de alterações ao componente `portal.html` do sistema SIGDOC-SUMBE.  
> Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) adaptado.  
> Projecto: Direcção Municipal de Saúde do Sumbe · Ibisner Solutions

---

## [Sprint de Qualidade] — 2026-05-29

Sessão de auditoria e remediação completa do `portal.html`. Ponto de partida: ficheiro único
de 325 KB com 26 problemas identificados. Resultado: 4 ficheiros separados, 26 correcções
e melhorias aplicadas, zero `alert()` nativos, zero emojis de validação, arquitectura
preparada para cache independente por ficheiro.

---

### 🔴 Corrigido — Bugs funcionais

**`_abrirBase64` e `_abrirDocSubcoleccao` inacessíveis fora do módulo ES**  
As duas funções viviam dentro do `<script type="module">` sem exposição em `window`.
Os `onclick` gerados dinamicamente por `mostrarDocsCarregados` (e.g. "abrir BI")
lançavam `ReferenceError` em silêncio. Corrigido com `window._abrirBase64 = _abrirBase64`
e `window._abrirDocSubcoleccao = _abrirDocSubcoleccao`.

**Dupla confirmação de logout**  
`confirmarLogout()` chamava `fazerLogoutFuncionario()` sem o argumento `silencioso`.
Resultado: o utilizador via o modal elegante de confirmação *e*, logo a seguir, o `confirm()`
nativo do browser. Corrigido para `fazerLogoutFuncionario(true)`.

**Variáveis CSS `--neu-50` e `--neu-400` não declaradas**  
Usadas em templates JS (`abrirDetalheDoc`, `obterBlocoDeclaracaoPortal`) mas ausentes
do `:root`. Em ambiente de produção, fundo dos modais de detalhe ficava transparente e
texto de rótulo desaparecia. Declaradas com `#f8fafc` e `#94a3b8` respectivamente.

**Foto de perfil não sincronizava o card verde do Início (desktop)**  
`previewFotoPerfil` actualizava quatro avatares mas omitia `pcv-avatar`. O card
da coluna direita da aba Início permanecia com a foto antiga até ao próximo login.
Adicionado `'pcv-avatar'` à lista de sincronização.

---

### 🟠 Corrigido — Comportamento e UX

**Modal de pedido fechava antes do envio completar**  
`confirmarEnvioSolicitacao` chamava `fecharRevisaoPedido()` imediatamente antes do
`await submeterSolicitacao()`. O utilizador não via o estado de carregamento e,
em caso de erro de rede, o feedback aparecia numa aba possivelmente invisível.
Reestruturado com `try { await } finally { fecharModal }` — o modal mantém-se
visível com spinner durante o envio e fecha apenas após conclusão.

**Scroll para o topo ao trocar de aba não funcionava em mobile**  
`navegarAba()` chamava `main.scrollTo()` num elemento sem `overflow-y:auto` em mobile
(o container correcto em mobile é `window`, não `.portal-abas-content`).
Corrigido com detecção dinâmica do container scrollável.

**`alert()` nativo em três pontos do código**  
Três chamadas a `alert()` em `_abrirBase64` e `_abrirDocSubcoleccao` eram
inconsistentes com o sistema de toast do portal. Substituídas por `notif(msg, 'notif-erro')`.

---

### 🟡 Melhorado — Interface e consistência visual

**Iconografia de logout unificada (4 pontos)**  
O carácter `⇥` (texto plano) era usado em: botão de logout da sidebar desktop,
ícone do modal de confirmação, botão "Sim, terminar sessão" e botão da zona
de perigo no Perfil. Substituído pelo SVG Lucide `log-out` em todos os pontos,
consistente com a iconografia do resto da interface.

**Ícones de validação de campos (4 funções)**  
`setCampo()`, `validarCampoSenha()`, `validarDataInicio()` e `validarTelefone()`
usavam os emojis `'✅'` e `'✕'` como feedback visual. Em Android, a renderização
de emoji varia por fabricante e versão do sistema. Substituídos pelas constantes
`ICO_OK` (SVG checkmark verde `#10c886`) e `ICO_ERR` (SVG círculo de aviso vermelho
`#ef4444`), definidas uma vez e reutilizadas nas quatro funções.

**Sidebar desktop — botão de logout rota pelo modal**  
O botão de logout na sidebar chamava `fazerLogoutFuncionario()` directamente,
contornando o modal de confirmação. Alterado para `abrirModalLogout()`.

**Sistema de notificações com fila de espera**  
A função `notif()` original sobrepunha mensagens: uma segunda notificação num
intervalo de 3.5 s reiniciava o texto mas não o timer, fazendo a mensagem nova
desaparecer demasiado cedo. Reescrita com fila (`_notifFila[]`) e flag `_notifActivo`.
Cada toast dura 3.2 s; mensagens consecutivas aguardam 160 ms entre si.

**Card verde do Início — avatar com affordance de navegação (desktop)**  
O `pcv-avatar` não tinha qualquer indicação de ser interactivo. Adicionados:
`onclick` para navegar ao Perfil, `role="button"`, `tabindex="0"`, suporte de
teclado (`Enter`/`Space`), `title="Ir para o Perfil"`, e CSS de hover
(`opacity .82` + `scale(1.07)` + `box-shadow` branco translúcido).

**Chat — textarea com auto-resize e teclado mobile optimizado**  
O campo de texto do chat tinha `rows="1"` fixo — mensagens longas saíam do campo
sem expandi-lo. Adicionado `oninput` para ajuste dinâmico da altura entre
`42px` (mínimo) e `140px` (máximo). Adicionado `enterkeyhint="send"` para
que teclados Android/iOS mostrem "Enviar" em vez de "Enter". A altura reseta
ao enviar e ao abrir o chat; o cursor foca automaticamente após a animação
de abertura completar (delay de 320 ms).

**Transição suave entre abas**  
Troca de separadores sem animação tornava o salto de conteúdo abrupto. Adicionado
`@keyframes aba-fade-in` (`opacity 0→1` + `translateY 5px→0`, 180 ms). A especificidade
dos selectores de ID (`#aba-docs.activa { display:grid }`) garante que os layouts
de grelha do desktop não são afectados pela regra `display:block` da animação.

---

### 🔵 Removido — Redundâncias

**`@media(min-width:1024px)` duplicado para `.bottom-nav`**  
Regra `display:none` escrita duas vezes em dois blocos `@media` separados.
Removida a ocorrência redundante.

**Atributo inline `style="grid-column:span 2"` em `perfil-header-aba`**  
A mesma regra já estava declarada em CSS como `#aba-perfil.activa .perfil-header-aba
{ grid-column: span 2 }`. O atributo inline foi removido.

---

### ⚙️ Refactorização — Qualidade de código

**Helper `_setKpi` — actualização de KPIs consolidada**  
Seis chamadas `getElementById` dispersas em duas iterações distintas (mobile + desktop)
substituídas por uma função auxiliar de uma linha que actualiza ambos os conjuntos
de elementos num único `forEach` declarativo.

**Separação CSS/JS em ficheiros independentes**  
O ficheiro monolítico de 329 KB foi dividido em quatro ficheiros com responsabilidades
claras, permitindo cache independente e manutenção por área:

| Ficheiro | Tamanho | Conteúdo |
|---|---|---|
| `portal.html` | 75 KB | Estrutura HTML pura |
| `portal.css` | 109 KB | Todo o CSS, incluindo animações do loading screen |
| `portal-app.js` | 133 KB | Módulo ES: Firebase, lógica de aplicação, componentes |
| `portal-utils.js` | 3.5 KB | Utilitários globais: modais, toggle de senha |

O CSS do loading screen (anteriormente num `<style>` dentro do body)
foi movido para `portal.css`. O `portal-app.js` foi desindentado (remoção dos 2 espaços
herdados da formatação do bloco `<script>`). A cadeia de carregamento mantém a ordem
correcta: `sigdoc-config.js` (síncrono, necessário para Firebase) → `portal.css` (paralelo)
→ `portal-app.js` (módulo, diferido implícito) → `portal-utils.js` (diferido explícito).

---

### 📋 Nota técnica — Item investigado e descartado

**`portal-header::after` com valor percentual negativo**  
Identificado em diagnóstico inicial como potencial causa de overflow horizontal em
ecrãs de 360 px. Após revisão do código completo, confirmado que o elemento pai
`.portal-header` tem `overflow:hidden`, pelo que o orb decorativo está correctamente
contido nos limites do header. Não havia bug a corrigir.

---

### 📁 Ficheiros afectados

```
portal.html        ← substitui o ficheiro original
portal.css         ← novo
portal-app.js      ← novo
portal-utils.js    ← novo
CHANGELOG.md       ← este ficheiro
```

> Os ficheiros `sigdoc-config.js`, `sigdoc-nav.js`, `sigdoc-session.js` e restantes
> módulos partilhados não foram alterados nesta sprint.

---

*SIGDOC-SUMBE · Ibisner Solutions · Sumbe, Kwanza Sul, Angola*
