/**
 * SIGDOC-SUMBE · Script de Limpeza de Contas de Teste
 * ─────────────────────────────────────────────────────
 * Elimina utilizadores do Firestore (utilizadores/) E da
 * Firebase Authentication em simultâneo.
 *
 * REQUISITOS:
 *   node >= 18
 *   npm install firebase-admin
 *
 * CONFIGURAÇÃO:
 *   1. Firebase Console → Definições do Projecto → Contas de Serviço
 *   2. Gerar nova chave privada → guardar como serviceAccountKey.json
 *      (na mesma pasta deste ficheiro)
 *   3. Definir os emails a eliminar em EMAILS_A_ELIMINAR abaixo
 *
 * EXECUÇÃO:
 *   node cleanup-contas-teste.js
 *   node cleanup-contas-teste.js --modo=simulacao   (não elimina, só lista)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth }             from "firebase-admin/auth";
import { getFirestore }        from "firebase-admin/firestore";
import { createRequire }       from "module";

const require = createRequire(import.meta.url);
const key     = require("./serviceAccountKey.json");

// ──────────────────────────────────────────────────────
//  CONFIGURAÇÃO — define aqui os emails a eliminar
// ──────────────────────────────────────────────────────
const EMAILS_A_ELIMINAR = [
  "funcionarioteste@dms.ao",
  "funcionarioteste2@dms.ao",
  "tecnicoteste@sumbe.com",
  "chefe@sumbe.ao",
  "directorteste@sumbe.ao",
  // adiciona mais emails conforme necessário
];

// Para eliminar por padrão de nome (ex: todos com "teste" no nome):
const PADRAO_NOME_TESTE = /teste|test|dummy|exemplo/i;

// ──────────────────────────────────────────────────────
//  Modo simulação: passa --modo=simulacao para não eliminar nada
// ──────────────────────────────────────────────────────
const SIMULACAO = process.argv.includes("--modo=simulacao");

// ──────────────────────────────────────────────────────

initializeApp({ credential: cert(key) });

const auth = getAuth();
const db   = getFirestore();

async function main() {
  console.log("\n══════════════════════════════════════════════");
  console.log("  SIGDOC-SUMBE · Limpeza de Contas de Teste");
  console.log(SIMULACAO ? "  MODO: SIMULAÇÃO (nada será eliminado)" : "  MODO: ELIMINAÇÃO REAL");
  console.log("══════════════════════════════════════════════\n");

  // 1. Ler todos os documentos de utilizadores
  const snap = await db.collection("utilizadores").get();
  const todos = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

  // 2. Filtrar os que devem ser eliminados
  const alvos = todos.filter(u => {
    const emailMatch = EMAILS_A_ELIMINAR.includes(u.email);
    const nomeMatch  = u.nome && PADRAO_NOME_TESTE.test(u.nome);
    return emailMatch || nomeMatch;
  });

  if (alvos.length === 0) {
    console.log("✓ Nenhuma conta de teste encontrada com os critérios definidos.");
    process.exit(0);
  }

  console.log(`Contas a eliminar (${alvos.length}):\n`);
  alvos.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.nome || "—"}`);
    console.log(`     Email : ${u.email || "—"}`);
    console.log(`     UID   : ${u.uid}`);
    console.log(`     Roles : ${u.roles?.join(", ") || u.perfil || "—"}`);
    console.log();
  });

  if (SIMULACAO) {
    console.log("── Modo simulação: nenhuma acção executada. ──");
    console.log("   Remove --modo=simulacao para eliminar.\n");
    process.exit(0);
  }

  // 3. Eliminar
  let ok = 0, erros = 0;

  for (const u of alvos) {
    process.stdout.write(`  Eliminar ${u.nome || u.email}... `);
    try {
      // Eliminar do Firestore
      await db.collection("utilizadores").doc(u.uid).delete();

      // Eliminar do Firebase Auth
      try {
        await auth.deleteUser(u.uid);
        console.log("✓ Firestore + Auth");
      } catch (authErr) {
        // Conta Auth pode não existir se foi criada por outro método
        console.log("✓ Firestore  (Auth: " + authErr.code + ")");
      }

      ok++;
    } catch (e) {
      console.log("✗ ERRO:", e.message);
      erros++;
    }
  }

  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  Concluído: ${ok} eliminados, ${erros} erros`);
  console.log(`══════════════════════════════════════════════\n`);
}

main().catch(e => { console.error("Erro fatal:", e); process.exit(1); });
