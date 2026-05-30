# Changelog — SIGDOC-SUMBE · Cadastro de Funcionários

> Ficheiro de registo de alterações ao componente `cadastro.html` do sistema SIGDOC-SUMBE.  
> Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) adaptado.  
> Projecto: Direcção Municipal de Saúde do Sumbe · Ibisner Solutions

---

## [Sprint de Qualidade] — 2026-05-30

Sessão de auditoria e remediação completa do `cadastro.html`. Ponto de partida: ficheiro único
de 169 KB / 3 381 linhas com 7 problemas identificados em 4 categorias. Resultado: 4 ficheiros
separados, 7 correcções aplicadas, zero inline styles hardcoded inconsistentes, zero dead code
com padrão XSS, sistema de toast com fila.

---

### 🔴 Corrigido — Bug crítico

**`sigdoc-config.js` carregado duas vezes no `<head>` (K1)**  
O script aparecia na linha 8 (posição correcta, antes dos dependentes) e de novo na linha 777
(após o bloco CSS, no final do `<head>`). A configuração global era executada em duplicado a
cada carregamento da página, com potencial para conflitos de estado no arranque.  
Corrigido: segunda ocorrência removida; a primeira carga, na posição correcta, mantém-se.

---

### 🔴 Corrigido — Dead code com padrão XSS

**Array `campos` em `verFicha` — artefacto de refatoração incompleta (K2)**  
O array de ~70 linhas estava definido com template literals que interpolavam dados do Firestore
directamente em strings HTML sem sanitização: `${f.urlBI}`, `${f.id}`, `${f.nome}`,
`${f.urlCert}` em atributos `onclick` e `href`. O array nunca era iterado — a renderização
real usa exclusivamente `camposSeguro` com DOM API seguro. Era dead code de uma refatoração
incompleta para eliminar XSS, e constituía um risco real caso alguém o reactivasse.  
Corrigido: array `campos` removido na íntegra. `camposSeguro` e toda a lógica de renderização
mantêm-se intactos.

---

### 🟡 Corrigido — Qualidade de código

**Funções `abrirFichaConflito` e `fecharModalDup` definidas duas vezes (K3)**  
Existiam como `window.abrirFichaConflito` e `window.fecharModalDup` (com a lógica real)
e também como funções locais com o mesmo nome que apenas delegavam para as `window.*`.
As versões locais eram dead code puro que confundia a leitura do módulo.  
Corrigido: funções locais removidas. As versões `window.*` e `fecharModalDupInterno`
(para chamadas internas ao módulo) mantêm-se.

---

### 🟡 Corrigido — Visual e design system

**Classes CSS `campo-edicao`, `campo-label`, `campo-input`, `campo-mono` não definidas (K4)**  
Estas classes eram usadas nos campos INSS e Banco de Domiciliação mas não tinham qualquer
regra CSS declarada. Os campos renderizavam sem estilo — sem padding, sem border-radius,
sem transições de foco — quebrando a consistência visual com o resto do formulário.  
Corrigido: declaradas no CSS com propriedades alinhadas ao design system existente
(`var(--line-soft)`, `var(--glow)`, `var(--r-md)`, `var(--mono)`, etc.).

**Inline styles hardcoded inconsistentes com o design system (K5)**  
Sete elementos — `f-numeroConta`, `f-provinciaNatal`, `f-municipioNatal`, `f-salario-base`,
`f-categoria-manual` e `f-cargo-manual` — tinham `style="..."` com valores hardcoded
(`border:1px solid #e5e7eb`, `border-radius:8px`, `padding:8px 10px`, `color:#6b7280`)
em vez das variáveis CSS do sistema. Visualmente heterogéneos face aos outros campos.  
Corrigido: inline styles removidos; campos substituídos por `class="campo-input"`,
`class="campo-label"`, `class="campo"`, `class="campo-hint"` conforme o contexto.
O único `style=""` remanescente é `style="display:none;margin-top:6px"` nos inputs
manuais de categoria/cargo — necessário para o toggle dinâmico de visibilidade.

---

### 🟡 Melhorado — Qualidade de UX

**`notif()` sem sistema de fila — toasts sobrepostos (K6)**  
A função original usava `setTimeout` simples: uma segunda mensagem dentro de 4 segundos
apagava a anterior sem o utilizador a ter lido. Em operações encadeadas (validação → erro
→ retry → sucesso) o feedback era perdido.  
Corrigido: substituída por sistema com fila `_notifFila[]` + `_notifDespachar()`.
Cada toast dura 3.2s; intervalo de 160ms entre consecutivos; nenhuma mensagem é descartada.
Padrão idêntico ao implementado em `portal.html` e `index.html`.

---

### ⚙️ Melhorado — Arquitectura

**Separação do monolítico em 4 ficheiros independentes (K7)**

O `cadastro.html` era singular face aos outros módulos: continha dois blocos de script
com naturezas diferentes (um script global com funções `onclick`, e um módulo ES com Firebase),
o que resultou em 4 ficheiros de saída em vez de 3.

| Ficheiro | Linhas | Conteúdo |
|---|---|---|
| `cadastro.html` | 659 | HTML puro — estrutura e semântica |
| `cadastro.css` | 783 | CSS completo com todas as classes e design tokens |
| `cadastro-utils.js` | 171 | Funções globais: validações BI/IBAN, secções recolhíveis, toggle estudando, helpers categoria/cargo — chamadas via `onclick` no HTML |
| `cadastro-app.js` | 1 741 | Módulo ES: Firebase Auth + Firestore + cadastro, ficha, duplicados, auditoria, foto |

Ponto de partida: `cadastro.html` único com 3 381 linhas / 169 KB.  
A ordem de carregamento no HTML está correcta: `sigdoc-*.js` → Lucide → `cadastro-utils.js`
(global, sem módulo) → `cadastro-app.js` (module) — garantindo que o `app` pode invocar
funções do `utils` expostas em `window`.

---

## Ficheiros afectados

| Ficheiro | Tipo de alteração |
|---|---|
| `cadastro.html` | Correcções K1–K5; separado em 4 ficheiros |
| `cadastro.css` | **Novo** — extraído de `cadastro.html`; classes K4 adicionadas |
| `cadastro-utils.js` | **Novo** — extraído de `cadastro.html`; funções globais de validação e UI |
| `cadastro-app.js` | **Novo** — extraído de `cadastro.html`; correcções K2, K3, K6 aplicadas |

---

## Mensagem de commit sugerida

```
fix(cadastro): auditoria sprint — 7 correcções (segurança, bugs, visual, arquitectura)

- K1: remove sigdoc-config.js duplicado no <head>
- K2: remove array 'campos' (70 linhas dead code com padrão XSS via template literals)
- K3: remove funções locais abrirFichaConflito/fecharModalDup duplicadas (dead code)
- K4: declara classes campo-edicao/campo-label/campo-input/campo-mono no CSS
- K5: substitui inline styles hardcoded (#e5e7eb, border-radius:8px) por classes do sistema
- K6: notif() com fila (_notifFila + _notifDespachar) — sem sobreposição de toasts
- K7: separação monolítico → cadastro.html (659L) + cadastro.css (783L)
       + cadastro-utils.js (171L) + cadastro-app.js (1741L)
```
