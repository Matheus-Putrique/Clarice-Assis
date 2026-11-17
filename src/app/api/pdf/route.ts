import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toWinAnsiSafe(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    // Keep characters supported by WinAnsi (ISO-8859-1 / Latin-1)
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

function wrapText(
  text: string,
  maxCharsPerLine: number
): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && !words[0])) {
      lines.push("");
      continue;
    }

    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    lines.push("");
  }

  return lines;
}

const CLASSIC_EXCERPTS: Record<string, string[]> = {
  "dom casmurro": [
    "CAPÍTULO I - DO TÍTULO",
    "Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da Lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus. Sucedeu, porém, que, como eu estava cansado, fechei os olhos três ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso.",
    "— Continue, disse eu acordando. — Já acabei, murmurou ele. — São muito bonitos.",
    "CAPÍTULO II - DO LIVRO",
    "Agora que expliquei o título, passo a escrever o livro. Antes disso, porém, digamos os motivos que me põem a pena na mão. Vivo só, com um criado. A casa em que moro é própria; fi-la construir de propósito, levado de um desejo tão particular que me vexa imprimi-lo, mas vá lá. Um dia, há bastantes anos, lembrou-me reproduzir no Engenho Novo a casa em que me criei na antiga Rua de Matacavalos, dando-lhe o mesmo aspecto e economia daquela outra, que desapareceu.",
    "CAPÍTULO XXXII - OLHOS DE RESSACA",
    "Tinha-me lembrado a definição que José Dias dera deles, 'olhos de cigana oblíqua e dissimulada'. Eu não sabia o que era oblíqua, mas dissimulada sabia, e queria ver se podiam chamar assim. Capitu deixou-se fitar e examinar. Só me perguntava o que era, se nunca os vira; eu nada achei extraordinário; a cor e a doçura eram minhas conhecidas. A demora da contemplação creio que lhe deu outra ideia do meu intento; imaginou que era um pretexto para mirá-los mais de perto, com os meus olhos longos, constantes, enfiados neles, e a isto atribuo que entrassem a ficar crescidos, crescidos e sombrios, com tal expressão que... Retórica dos namorados, dá-me uma comparação exata e poética para dizer o que foram aqueles olhos de Capitu. Não me acode imagem capaz de dizer, sem quebra da dignidade do estilo, o que eles foram e me fizeram. Olhos de ressaca? Vá, de ressaca. É o que me dá ideia daquela feição nova. Traziam não sei que fluido misterioso e enérgico, uma força que arrastava para dentro, como a vaga que se retira da praia, nos dias de ressaca."
  ],
  "memorias postumas": [
    "AO LEITOR",
    "Ao verme que primeiro roeu as frias carnes do meu cadáver dedico como saudosa lembrança estas Memórias Póstumas.",
    "CAPÍTULO I - ÓBITO DO AUTOR",
    "Algum tempo hesitei se devia abrir estas memórias pelo princípio ou pelo fim, isto é, se poria em primeiro lugar o meu nascimento ou a minha morte. Suposto o uso vulgar seja começar pelo nascimento, duas considerações me levaram a adotar diferente método: a primeira é que eu não sou propriamente um autor defunto, mas um defunto autor, para quem a campa foi outro berço; a segunda é que o escrito ficaria assim mais galante e mais novo. Moisés, que também contou a sua morte, não a pôs no introito, mas no cabo: diferença radical entre este livro e o Pentateuco.",
    "Dito isto, expirei às duas horas da tarde de uma sexta-feira do mês de agosto de 1869, na minha bela chácara de Catumbi. Tinha uns sessenta e quatro anos, rijos e prósperos, era solteiro, possuía cerca de trezentos contos e fui acompanhado ao cemitério por onze amigos. Onze amigos! Verdade é que não houve cartas nem anúncios. Acresce que chovia — peneirava — uma chuvinha miúda, triste e constante, tão constante e tão triste, que levou um daqueles fiéis da última hora a intercalar esta engenhosa ideia no discurso que proferiu à beira de minha cova: — 'Vós, que o conhecestes, meus senhores, vós podeis dizer comigo que a natureza parece estar chorando a perda irreparável de um dos mais belos caracteres que têm honrado a humanidade.'"
  ],
  "a hora da estrela": [
    "DEDICATÓRIA DO AUTOR (Na verdade Clarice Lispector)",
    "Tudo no mundo começou com um sim. Uma molécula disse sim a outra molécula e nasceu a vida. Mas antes da pré-história havia a pré-história da pré-história e havia o nunca e havia o sim. Sempre houve. Não sei o quê, mas sei que o universo jamais começou.",
    "Enquanto eu tiver perguntas e não houver resposta continuarei a escrever. Como começar pelo início, se as coisas acontecem antes de acontecer? Se antes da pré-história já havia os monstros apocalípticos? Se esta história não existe, passará a existir. Pensar é um ato. Sentir é um fato. Os dois juntos — sou eu que escrevo o que estou escrevendo."
  ],
  "gente pobre": [
    "8 DE ABRIL — MAKAR DIÉVUCHKIN A VARVARA DOBROSSIÉLOVA",
    "Minha inestimável Varvara Aleksiêievna! Ontem fui feliz, imensamente feliz, absurdamente feliz! Pela primeira vez na vida a senhorita seguiu um conselho meu. À tardinha, por volta das oito horas, acordei (a senhorita sabe que gosto de cochilar uma horinha depois do expediente), peguei a vela, preparei o papel, aparava a pena, quando de repente ergui os olhos por acaso — confesso que meu coração até deu um salto! A senhorita havia entendido o que eu queria, o que meu coraçãozinho desejava! Vi que uma pontinha da cortina da sua janela estava dobrada e presa ao vaso de bálsamo, exatamente como eu lhe havia sugerido naquela ocasião. Pareceu-me até que seu rostinho surgiu por um instante na janela, que a senhorita também olhava para mim do seu quartinho, que pensava em mim."
  ]
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = toWinAnsiSafe(searchParams.get("title") || "Obra Literaria");
  const author = toWinAnsiSafe(searchParams.get("author") || "Autor Classico");
  const year = toWinAnsiSafe(searchParams.get("year") || "Edicao Classica");
  const publisher = toWinAnsiSafe(searchParams.get("publisher") || "Biblioteca Clarice Assis");
  const description = toWinAnsiSafe(
    searchParams.get("description") ||
      "Edicao digital preparada pela Biblioteca Clarice Assis."
  );
  const quote = toWinAnsiSafe(searchParams.get("quote") || "");

  const pdfDoc = await PDFDocument.create();
  const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // PAGE 1: Classic Parchment Title Page & Catalog Card
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Warm parchment background
  page1.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.984, 0.972, 0.953)
  });

  // Outer classic double border
  page1.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: rgb(0.172, 0.118, 0.086),
    borderWidth: 2
  });
  page1.drawRectangle({
    x: 42,
    y: 42,
    width: width - 84,
    height: height - 84,
    borderColor: rgb(0.784, 0.616, 0.329),
    borderWidth: 1
  });

  // Header Banner
  page1.drawText("BIBLIOTECA CLARICE ASSIS", {
    x: 65,
    y: height - 85,
    size: 13,
    font: serifBold,
    color: rgb(0.172, 0.118, 0.086)
  });
  page1.drawText("Gabinete de Leitura, Acervo Digital & Ficha Catalografica", {
    x: 65,
    y: height - 102,
    size: 10,
    font: serifItalic,
    color: rgb(0.43, 0.33, 0.25)
  });

  page1.drawLine({
    start: { x: 65, y: height - 115 },
    end: { x: width - 65, y: height - 115 },
    thickness: 1,
    color: rgb(0.784, 0.616, 0.329)
  });

  // Book Title & Author
  const titleLines = wrapText(title, 38).filter(Boolean);
  let yCursor = height - 165;

  for (const tLine of titleLines.slice(0, 3)) {
    page1.drawText(tLine, {
      x: 65,
      y: yCursor,
      size: 24,
      font: serifBold,
      color: rgb(0.172, 0.118, 0.086)
    });
    yCursor -= 30;
  }

  page1.drawText(`Por ${author}`, {
    x: 65,
    y: yCursor - 5,
    size: 14,
    font: serifItalic,
    color: rgb(0.36, 0.25, 0.16)
  });
  yCursor -= 35;

  // Metadata Box
  page1.drawRectangle({
    x: 65,
    y: yCursor - 45,
    width: width - 130,
    height: 42,
    color: rgb(0.953, 0.929, 0.886),
    borderColor: rgb(0.84, 0.77, 0.66),
    borderWidth: 0.8
  });

  page1.drawText(`Publicacao: ${year}   |   Editora/Selo: ${publisher.slice(0, 42)}`, {
    x: 78,
    y: yCursor - 28,
    size: 10.5,
    font: serifBold,
    color: rgb(0.172, 0.118, 0.086)
  });
  yCursor -= 75;

  // Quote if available
  if (quote) {
    const qLines = wrapText(`"${quote}"`, 72).filter(Boolean);
    for (const qLine of qLines.slice(0, 3)) {
      page1.drawText(qLine, {
        x: 75,
        y: yCursor,
        size: 11,
        font: serifItalic,
        color: rgb(0.36, 0.25, 0.16)
      });
      yCursor -= 16;
    }
    yCursor -= 15;
  }

  // Synopsis Section
  page1.drawText("SINOPSE E APRESENTACAO DA OBRA", {
    x: 65,
    y: yCursor,
    size: 12,
    font: serifBold,
    color: rgb(0.172, 0.118, 0.086)
  });
  yCursor -= 22;

  const descLines = wrapText(description, 78);
  for (const line of descLines) {
    if (yCursor < 95) break;
    page1.drawText(line, {
      x: 65,
      y: yCursor,
      size: 11,
      font: serifFont,
      color: rgb(0.172, 0.118, 0.086)
    });
    yCursor -= 16;
  }

  // Footer Page 1
  page1.drawText("Documento PDF gerado pela Biblioteca Clarice Assis - Pagina 1", {
    x: 65,
    y: 55,
    size: 9,
    font: serifItalic,
    color: rgb(0.5, 0.4, 0.3)
  });

  // PAGE 2: Reading Excerpt / Literary Chapter
  const normKey = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let excerptParagraphs: string[] | null = null;
  for (const [k, paras] of Object.entries(CLASSIC_EXCERPTS)) {
    if (normKey.includes(k)) {
      excerptParagraphs = paras;
      break;
    }
  }

  if (excerptParagraphs) {
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    page2.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.984, 0.972, 0.953)
    });
    page2.drawRectangle({
      x: 36,
      y: 36,
      width: width - 72,
      height: height - 72,
      borderColor: rgb(0.172, 0.118, 0.086),
      borderWidth: 1.5
    });

    let y2 = height - 80;
    page2.drawText(`CADERNO DE LEITURA: ${title.toUpperCase().slice(0, 45)}`, {
      x: 65,
      y: y2,
      size: 12,
      font: serifBold,
      color: rgb(0.172, 0.118, 0.086)
    });
    y2 -= 30;

    for (const para of excerptParagraphs) {
      const pLines = wrapText(toWinAnsiSafe(para), 78);
      for (const l of pLines) {
        if (y2 < 80) break;
        const isHeading = l.startsWith("CAP") || l.startsWith("DEDICAT") || l.startsWith("AO LEITOR") || l.startsWith("8 DE ABRIL");
        page2.drawText(l, {
          x: 65,
          y: y2,
          size: isHeading ? 11.5 : 11,
          font: isHeading ? serifBold : serifFont,
          color: rgb(0.172, 0.118, 0.086)
        });
        y2 -= 16;
      }
    }

    page2.drawText("Biblioteca Clarice Assis - Caderno de Leitura - Pagina 2", {
      x: 65,
      y: 55,
      size: 9,
      font: serifItalic,
      color: rgb(0.5, 0.4, 0.3)
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeFilename = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="clarice-assis-${safeFilename || "livro"}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
