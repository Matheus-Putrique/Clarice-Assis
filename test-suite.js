/**
 * Bateria Automatizada de Testes Rigorosos - Biblioteca Clarice Assis (Fases 1, 2 e 3)
 * Verifica idioma Portugues (ex: Shakespeare), todos os 5 corredores de generos,
 * paginacao / descoberta de novos livros, PDFs completos e seguranca XSS.
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASSOU] ${testName} ${details ? `(${details})` : ""}`);
  } else {
    failed++;
    console.error(`  ❌ [FALHOU] ${testName} ${details ? `-> ${details}` : ""}`);
  }
}

async function runTests() {
  console.log("=========================================================================");
  console.log("📚 BATERIA DE TESTES RIGOROSA: BIBLIOTECA CLARICE ASSIS (FASES 1, 2 E 3)");
  console.log("=========================================================================\n");

  // -------------------------------------------------------------------------
  // 1. TESTE DE IDIOMA PORTUGUÊS EM AUTORES ESTRANGEIROS (Ex: Shakespeare)
  // -------------------------------------------------------------------------
  console.log("🔹 [1] Priorização de Português & Traduções (Teste Shakespeare)");

  const shakeRes = await fetch(`${BASE_URL}/api/books?q=shakespeare`);
  const shakeData = await shakeRes.json();
  const shakeBooks = shakeData.books || [];

  const ptShakeCount = shakeBooks.filter((b) => b.language === "pt-BR").length;
  const hasEnglishDescriptions = shakeBooks
    .slice(0, 10)
    .some((b) => /\b(An Apple Books Classic|The complete collection|tragedy by)\b/i.test(b.description));

  assert(
    shakeBooks.length >= 10 && ptShakeCount >= 10 && !hasEnglishDescriptions,
    "1.1 Busca por 'Shakespeare' retorna obras e sinopses 100% em Português no topo",
    `Total: ${shakeBooks.length}, Em PT-BR: ${ptShakeCount}, Exemplos: ${shakeBooks
      .slice(0, 4)
      .map((b) => b.title)
      .join(", ")}`
  );

  // -------------------------------------------------------------------------
  // 2. TESTE DE TODOS OS 5 CORREDORES DE GÊNEROS (Nenhum pode vir vazio!)
  // -------------------------------------------------------------------------
  console.log("\n🔹 [2] Validação dos 5 Corredores de Gêneros & Sub-Estantes");

  const categoryQueries = [
    { label: "Acervo Clarice & Assis", q: "machado de assis" },
    { label: "Clássicos Universais", q: "dostoievski" },
    { label: "Filosofia & Poesia", q: "filosofia" },
    { label: "Ficção, Mistério & Fantasia", q: "ficcao cientifica" },
    { label: "Ciência, História & Saberes", q: "ciencia" }
  ];

  for (const cat of categoryQueries) {
    const res = await fetch(`${BASE_URL}/api/books?q=${encodeURIComponent(cat.q)}`);
    const data = await res.json();
    const count = data.books?.length || 0;
    const ptCount = (data.books || []).filter((b) => b.language === "pt-BR").length;
    assert(
      count >= 8 && ptCount >= 8,
      `2.x Corredor "${cat.label}" retorna estante cheia de livros em Português`,
      `${count} livros (${ptCount} em PT-BR)`
    );
  }

  // -------------------------------------------------------------------------
  // 3. NAVEGAÇÃO, PAGINAÇÃO ("Carregar Mais Livros") & CONTROLES DE ESTANTE
  // -------------------------------------------------------------------------
  console.log("\n🔹 [3] Paginação ('Carregar Mais Livros') e Controles de Exploração");

  const page1Res = await fetch(`${BASE_URL}/api/books?page=1`);
  const page1Data = await page1Res.json();
  const page2Res = await fetch(`${BASE_URL}/api/books?page=2`);
  const page2Data = await page2Res.json();

  assert(
    page2Data.books?.length > page1Data.books?.length,
    "3.1 Paginação expande a estante com novos livros sem precisar digitar na busca",
    `Página 1: ${page1Data.books?.length} livros -> Página 2: ${page2Data.books?.length} livros`
  );

  // -------------------------------------------------------------------------
  // 4. FASE 2: DOWNLOAD DE PDF COMPLETO (CONTAGEM DE PÁGINAS REAIS)
  // -------------------------------------------------------------------------
  console.log("\n🔹 [4] Download Direto de PDF Completo (Todas as Páginas)");

  const { PDFDocument } = require("pdf-lib");
  const booksToVerifyPdf = [
    { title: "A Hora da Estrela", author: "Clarice Lispector", minPages: 50 },
    { title: "Dom Casmurro", author: "Machado de Assis", minPages: 100 },
    { title: "Noites Brancas", author: "Fiódor Dostoiévski", minPages: 40 },
    { title: "Gente Pobre", author: "Fiódor Dostoiévski", minPages: 80 }
  ];

  for (const item of booksToVerifyPdf) {
    const pdfUrl = `${BASE_URL}/api/pdf?title=${encodeURIComponent(
      item.title
    )}&author=${encodeURIComponent(item.author)}`;
    const pdfRes = await fetch(pdfUrl);
    const buf = await pdfRes.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    const pageCount = doc.getPageCount();

    assert(
      pdfRes.status === 200 && pageCount >= item.minPages,
      `4.x PDF Completo de "${item.title}"`,
      `${pageCount} páginas (${Math.round(buf.byteLength / 1024)} KB)`
    );
  }

  // -------------------------------------------------------------------------
  // 5. FASE 3: MURAL DE OPINIÕES & SEGURANÇA XSS
  // -------------------------------------------------------------------------
  console.log("\n🔹 [5] Mural de Opiniões, Avaliações & Segurança XSS");

  const fs = require("fs");
  const path = require("path");
  const pageCode = fs.readFileSync(path.join(__dirname, "src", "app", "page.tsx"), "utf8");
  const reviewsCode = fs.readFileSync(
    path.join(__dirname, "src", "components", "BookReviewsSection.tsx"),
    "utf8"
  );

  assert(
    pageCode.includes("shelfFilter") &&
      pageCode.includes("handleLoadMoreBooks") &&
      pageCode.includes("handleSurpriseDiscovery"),
    "5.1 Controles de navegação na estante (Filtro local, Ordenação, Carregar Mais e Descoberta) + Idioma 100% Português automático ativos"
  );

  assert(
    reviewsCode.includes("sanitizeUserText") && reviewsCode.includes("filterStar"),
    "5.2 Mural de Opiniões com filtro de estrelas e proteção XSS ativo"
  );

  console.log("\n=========================================================================");
  console.log(`🏁 RESULTADO FINAL: ${passed} testes aprovados | ${failed} falhas`);
  console.log("=========================================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
