import { NextRequest, NextResponse } from "next/server";
import { Book, BookEdition } from "@/types/book";
import { CURATED_BOOKS } from "@/data/curated-books";

function sanitizeQuery(raw: string): string {
  return raw.replace(/[<>"{}|\\^`]/g, "").trim().slice(0, 120);
}

/**
 * Normalizes text for case-insensitive and accent-insensitive comparisons (IgnoreCase + IgnoreAccents)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#xa0;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\u00AD/g, "")
    .trim();
}

const GENRE_PT_MAP: Record<string, string> = {
  "fiction & literature": "Ficção & Literatura",
  "fiction": "Ficção",
  "literature": "Literatura",
  "classics": "Clássicos",
  "literary": "Literatura Clássica",
  "literary fiction": "Ficção Literária",
  "historical": "Romance Histórico",
  "historical fiction": "Ficção Histórica",
  "mysteries & thrillers": "Mistério & Suspense",
  "mystery": "Mistério",
  "thrillers": "Suspense",
  "sci-fi & fantasy": "Ficção Científica & Fantasia",
  "science fiction": "Ficção Científica",
  "fantasy": "Fantasia",
  "romance": "Romance",
  "nonfiction": "Não-Ficção",
  "philosophy": "Filosofia",
  "poetry": "Poesia",
  "drama": "Teatro & Drama",
  "psychology": "Psicologia",
  "history": "História",
  "science & nature": "Ciência & Natureza",
  "science": "Ciência",
  "biographies & memoirs": "Biografias & Memórias",
  "politics & current events": "Política & Sociedade",
  "religion & spirituality": "Religião & Espiritualidade",
  "young adult": "Jovem Adulto",
  "action & adventure": "Ação & Aventura",
  "horror": "Terror & Gótico",
  "short stories": "Contos",
  "anthologies": "Antologias",
  "humor": "Humor & Sátira"
};

export function translateGenresToPt(genres?: string[]): string[] {
  if (!genres || genres.length === 0) return ["Literatura"];
  const translated = genres.map((g) => {
    const key = g.toLowerCase().trim();
    return GENRE_PT_MAP[key] || g;
  });
  return Array.from(new Set(translated)).slice(0, 3);
}

/**
 * Automatic Title Translator for any book that doesn't match a hardcoded canonical alias
 * (removes English promotional parentheses like "(Illustrated + FREE audiobook...)" and translates literary title patterns)
 */
export function autoTranslateTitleToPortuguese(rawTitle: string): string {
  // 1. Strip English promotional/edition notes in parentheses or brackets
  let clean = rawTitle
    .replace(
      /\([^)]*\b(illustrated|unabridged|annotated|audiobook|free|edition|classic|english|translated|version|volume|collection|complete)\b[^)]*\)/gi,
      ""
    )
    .replace(
      /\[[^\]]*\b(illustrated|unabridged|annotated|audiobook|free|edition|classic|english)\b[^\]]*]/gi,
      ""
    )
    .trim();

  // 2. Pattern-based translations for common literary titles
  clean = clean
    .replace(/^The Adventures of\s+/i, "As Aventuras de ")
    .replace(/^The Memoirs of\s+/i, "As Memórias de ")
    .replace(/^The Return of\s+/i, "O Retorno de ")
    .replace(/^The Case-Book of\s+/i, "O Arquivo Secreto de ")
    .replace(/^The Complete Works of\s+/i, "Obras Completas de ")
    .replace(/^Complete Works of\s+/i, "Obras Completas de ")
    .replace(/^The Complete\s+/i, "Obra Completa: ")
    .replace(/^Selected Works of\s+/i, "Obras Escolhidas de ")
    .replace(/^Selected Stories of\s+/i, "Contos Escolhidos de ")
    .replace(/^The Autobiography of\s+/i, "A Autobiografia de ")
    .replace(/^The Diary of\s+/i, "O Diário de ")
    .replace(/^The Tragedy of\s+/i, "A Tragédia de ")
    .replace(/^The Life of\s+/i, "A Vida de ")
    .replace(/^The Book of\s+/i, "O Livro de ")
    .replace(/^The Art of\s+/i, "A Arte de ")
    .replace(/^Tales of\s+/i, "Contos de ")
    .replace(/^Stories of\s+/i, "Histórias de ")
    .replace(/^Poems of\s+/i, "Poemas de ")
    .replace(/'s Complete Poetical Works$/i, " - Obra Poética Completa")
    .replace(/'s Poetical Works$/i, " - Obra Poética")
    .replace(/'s Poems$/i, " - Poemas")
    .replace(/'s Sonnets$/i, " - Sonetos")
    .replace(/\band Other Stories\b/gi, "e Outras Histórias")
    .replace(/\band Other Tales\b/gi, "e Outros Contos")
    .replace(/\band Other Poems\b/gi, "e Outros Poemas");

  return clean.replace(/\s+/g, " ").trim() || rawTitle;
}

/**
 * Maps translated/English/French/Spanish titles of classic works to a single canonical work key
 * so that "Romeu e Julieta" and "Romeo and Juliet" (or "Persuasão" and "Persuasion")
 * ALWAYS group together with the Portuguese title and Portuguese synopsis on top.
 */
const CANONICAL_WORK_ALIASES: Array<{
  canonical: string;
  ptTitle: string;
  ptDescription?: string;
  patterns: string[];
}> = [
  // DOSTOIÉVSKI
  {
    canonical: "irmaos karamazov",
    ptTitle: "Os Irmãos Karamázov",
    ptDescription:
      "Último e mais grandioso romance de Fiódor Dostoiévski. Narra o drama familiar e espiritual dos irmãos Dmitri, Ivan e Aliócha diante do assassinato de seu pai, Fiódor Pavlovitch, mergulhando nas questões mais profundas sobre fé, livre-arbítrio, moralidade e culpa.",
    patterns: ["irmaos karamazov", "brothers karamazov", "freres karamazov"]
  },
  {
    canonical: "crime e castigo",
    ptTitle: "Crime e Castigo",
    ptDescription:
      "Em São Petersburgo, o jovem ex-estudante Raskólnikov comete um assassinato acreditando estar acima da moral comum, mas passa a viver um intenso tormento psicológico e espiritual em busca de redenção.",
    patterns: ["crime e castigo", "crime and punishment", "crime et chatiment"]
  },
  {
    canonical: "o idiota",
    ptTitle: "O Idiota",
    ptDescription:
      "O príncipe Liev Nikoláievitch Míchkin retorna à Rússia após tratamento na Suíça. Sua bondade pura e sinceridade absoluta entram em choque com uma sociedade movida pela ambição, paixão e cinismo.",
    patterns: ["o idiota", "the idiot", "l idiot"]
  },
  {
    canonical: "noites brancas",
    ptTitle: "Noites Brancas",
    ptDescription:
      "Durante quatro noites claras de verão em São Petersburgo, um jovem solitário e sonhador conhece Nástenka às margens de um canal, vivendo uma história lírica sobre amor, sonho e melancolia.",
    patterns: ["noites brancas", "white nights", "nuits blanches"]
  },
  {
    canonical: "memorias do subsolo",
    ptTitle: "Memórias do Subsolo",
    ptDescription:
      "Monólogo ácido e filosófico de um ex-funcionário público amargurado em São Petersburgo. Considerada uma das obras precursoras do existencialismo moderno.",
    patterns: [
      "memorias do subsolo",
      "notes from the underground",
      "notes from underground",
      "carnets du sous sol"
    ]
  },
  {
    canonical: "gente pobre",
    ptTitle: "Gente Pobre",
    ptDescription:
      "Romance epistolar de estreia de Fiódor Dostoiévski. Através das cartas trocadas entre o modesto copista Makar Diévuchkin e a jovem órfã Varvara, revela com imensa ternura a dignidade humana em meio à pobreza.",
    patterns: ["gente pobre", "poor folk", "pobres gentes", "poor people"]
  },
  {
    canonical: "os demonios",
    ptTitle: "Os Demônios",
    ptDescription:
      "Um dos romances políticos e psicológicos mais poderosos de Dostoiévski, retratando a infiltração de um grupo niilista e revolucionário em uma pequena cidade provincial russa.",
    patterns: ["os demonios", "the possessed", "les possedes", "demons"]
  },
  {
    canonical: "o jogador",
    ptTitle: "O Jogador",
    ptDescription:
      "Inspirado na própria paixão de Dostoiévski pelas roletas europeias, narra a obsessão de Aleksei Ivánovitch pelo jogo e sua paixão tempestuosa por Polina na cidade fictícia de Roletemburgo.",
    patterns: ["o jogador", "the gambler", "le joueur"]
  },
  {
    canonical: "o duplo",
    ptTitle: "O Duplo",
    patterns: ["o duplo", "the double", "le double"]
  },
  {
    canonical: "o eterno marido",
    ptTitle: "O Eterno Marido",
    patterns: ["o eterno marido", "the eternal husband", "l eternel mari"]
  },
  {
    canonical: "humilhados e ofendidos",
    ptTitle: "Humilhados e Ofendidos",
    patterns: [
      "humilhados e ofendidos",
      "humiliated and insulted",
      "the insulted and injured"
    ]
  },

  // KAFKA
  {
    canonical: "a metamorfose",
    ptTitle: "A Metamorfose",
    patterns: [
      "a metamorfose",
      "the metamorphosis",
      "die verwandlung",
      "la metamorphose"
    ]
  },
  {
    canonical: "o processo",
    ptTitle: "O Processo",
    ptDescription:
      "Certa manhã, Josef K. é detido sem ter feito nada de mal e vê-se preso em um labirinto burocrático e absurdo onde ninguém revela sua acusação.",
    patterns: ["o processo", "the trial", "der prozess"]
  },
  {
    canonical: "o castelo",
    ptTitle: "O Castelo",
    patterns: ["o castelo", "the castle", "das schloss"]
  },

  // MACHADO & CLARICE
  {
    canonical: "dom casmurro",
    ptTitle: "Dom Casmurro",
    patterns: ["dom casmurro"]
  },
  {
    canonical: "memorias postumas de bras cubas",
    ptTitle: "Memórias Póstumas de Brás Cubas",
    patterns: [
      "memorias postumas de bras cubas",
      "posthumous memoirs of bras cubas",
      "epitaph of a small winner"
    ]
  },
  {
    canonical: "o alienista",
    ptTitle: "O Alienista",
    patterns: ["o alienista", "the alienist"]
  },
  {
    canonical: "a hora da estrela",
    ptTitle: "A Hora da Estrela",
    patterns: ["a hora da estrela", "the hour of the star"]
  },
  {
    canonical: "a paixao segundo g h",
    ptTitle: "A Paixão Segundo G.H.",
    patterns: ["paixao segundo g", "passion according to g"]
  },

  // JANE AUSTEN
  {
    canonical: "orgulho e preconceito",
    ptTitle: "Orgulho e Preconceito",
    ptDescription:
      "O clássico mais amado de Jane Austen acompanha o embate espirituoso e apaixonante entre a inteligente Elizabeth Bennet e o reservado Sr. Darcy na Inglaterra rural do século XIX.",
    patterns: ["orgulho e preconceito", "pride and prejudice"]
  },
  {
    canonical: "razao e sensibilidade",
    ptTitle: "Razão e Sensibilidade",
    ptDescription:
      "A história das irmãs Elinor e Marianne Dashwood — uma guiada pela prudência e razão, a outra pela paixão intensa — em busca de amor e estabilidade após a perda da fortuna familiar.",
    patterns: ["razao e sensibilidade", "sense and sensibility"]
  },
  {
    canonical: "persuasao",
    ptTitle: "Persuasão",
    ptDescription:
      "Último romance completo de Jane Austen. Anne Elliot reencontra o Capitão Frederick Wentworth oito anos após ter sido persuadida por sua família a romper o noivado com ele.",
    patterns: ["persuasao", "persuasion"]
  },
  {
    canonical: "emma",
    ptTitle: "Emma",
    patterns: ["emma"]
  },
  {
    canonical: "abadia de northanger",
    ptTitle: "A Abadia de Northanger",
    patterns: ["abadia de northanger", "northanger abbey"]
  },
  {
    canonical: "mansfield park",
    ptTitle: "Mansfield Park",
    patterns: ["mansfield park"]
  },

  // SHAKESPEARE
  {
    canonical: "hamlet",
    ptTitle: "Hamlet",
    ptDescription:
      "A maior tragédia de William Shakespeare acompanha o Príncipe Hamlet da Dinamarca após a morte súbita de seu pai e o casamento apressado de sua mãe com seu tio Cláudio. Um mergulho imortal sobre vingança, dúvida moral, loucura e a condição humana.",
    patterns: ["hamlet"]
  },
  {
    canonical: "romeu e julieta",
    ptTitle: "Romeu e Julieta",
    ptDescription:
      "Em Verona, dois jovens filhos de famílias rivais — os Montecchio e os Capuleto — vivem um amor arrebatador que desafia o ódio ancestral de suas casas. A mais célebre história de amor da dramaturgia universal.",
    patterns: ["romeu e julieta", "romeo and juliet", "romeo y julieta"]
  },
  {
    canonical: "otelo",
    ptTitle: "Otelo, o Mouro de Veneza",
    ptDescription:
      "Otelo, nobre general mouro a serviço de Veneza, casa-se com a jovem Desdêmona, mas torna-se alvo das intrigas venenosas do alferes Iago. Uma tragédia magistral sobre o ciúme, a manipulação, a honra e a traição.",
    patterns: ["otelo", "othello"]
  },
  {
    canonical: "macbeth",
    ptTitle: "Macbeth",
    ptDescription:
      "Após ouvir a profecia de três bruxas de que se tornará Rei da Escócia, o general Macbeth, instigado por Lady Macbeth, mergulha em uma espiral de ambição desmedida, regicídio, culpa e assombrações.",
    patterns: ["macbeth"]
  },
  {
    canonical: "rei lear",
    ptTitle: "Rei Lear",
    ptDescription:
      "Ao decidir dividir seu reino entre as três filhas conforme as declarações de afeto de cada uma, o velho Rei Lear rejeita a sincera Cordélia e entrega o poder às filhas aduladoras, desencadeando uma tempestade trágica sobre ingratidão, velhice e poder.",
    patterns: ["rei lear", "king lear", "el rey lear"]
  },
  {
    canonical: "sonho de uma noite de verao",
    ptTitle: "Sonho de uma Noite de Verão",
    ptDescription:
      "Em um bosque encantado nos arredores de Atenas, fadas, amantes em fuga e artesãos teatrais têm seus destinos cruzados pelas travessuras mágicas de Puck e do rei dos elfos Oberon.",
    patterns: [
      "sonho de uma noite de verao",
      "midsummer night s dream",
      "midsummer nights dream"
    ]
  },
  {
    canonical: "o mercador de veneza",
    ptTitle: "O Mercador de Veneza",
    ptDescription:
      "Para ajudar seu amigo Bassânio a cortejar Pórcia, o mercador Antônio faz um empréstimo arriscado com o agiota Shylock, cuja garantia é uma libra de sua própria carne. Uma peça clássica sobre justiça, clemência e preconceito.",
    patterns: ["mercador de veneza", "merchant of venice"]
  },
  {
    canonical: "a tempestade",
    ptTitle: "A Tempestade",
    ptDescription:
      "Exilado em uma ilha mágica ao lado de sua filha Miranda e do espírito Ariel, o duque deposto Próspero conjura uma tempestade para atrair seus antigos usurpadores em uma jornada de acerto de contas e perdão.",
    patterns: ["a tempestade", "the tempest"]
  },
  {
    canonical: "julio cesar",
    ptTitle: "Júlio César",
    ptDescription:
      "Drama político de William Shakespeare que retrata a conspiração liderada por Bruto e Cássio contra Júlio César em Roma, explorando a honra republicana, a retórica pública e a guerra civil.",
    patterns: ["julio cesar", "julius caesar"]
  },
  {
    canonical: "sonetos de shakespeare",
    ptTitle: "Sonetos de William Shakespeare",
    ptDescription:
      "A célebre coleção de 154 sonetos líricos de William Shakespeare, meditando com beleza eterna sobre a passagem do tempo, o amor profundo, a beleza e a imortalidade através da poesia.",
    patterns: [
      "sonetos de shakespeare",
      "shakespeare s sonnets",
      "shakespeares sonnets",
      "shakespeare s poems"
    ]
  },
  {
    canonical: "a megera domada",
    ptTitle: "A Megera Domada",
    ptDescription:
      "Comédia vibrante de Shakespeare em que o espirituoso Petrúquio tenta conquistar a temperamental e independente Catarina em Pádua.",
    patterns: ["megera domada", "taming of the shrew"]
  },
  {
    canonical: "muito barulho por nada",
    ptTitle: "Muito Barulho por Nada",
    ptDescription:
      "Uma das comédias mais brilhantes de Shakespeare, marcada pelos duelos verbais afiados entre Beatriz e Benedito em meio a mal-entendidos amorosos.",
    patterns: ["muito barulho por nada", "much ado about nothing"]
  },

  // SHERLOCK HOLMES / CONAN DOYLE
  {
    canonical: "as aventuras de sherlock holmes",
    ptTitle: "As Aventuras de Sherlock Holmes",
    ptDescription:
      "Coletânea clássica de Arthur Conan Doyle que reúne doze das mais brilhantes investigações do detetive Sherlock Holmes e de seu fiel amigo Dr. Watson na Londres vitoriana.",
    patterns: ["aventuras de sherlock holmes", "adventures of sherlock holmes"]
  },
  {
    canonical: "as memorias de sherlock holmes",
    ptTitle: "As Memórias de Sherlock Holmes",
    ptDescription:
      "Onze casos inesquecíveis conduzidos por Sherlock Holmes e narrados pelo Dr. Watson, culminando no confronto histórico com o genial Professor Moriarty nas Cataratas de Reichenbach.",
    patterns: ["memorias de sherlock holmes", "memoirs of sherlock holmes"]
  },
  {
    canonical: "o retorno de sherlock holmes",
    ptTitle: "O Retorno de Sherlock Holmes",
    ptDescription:
      "Após ser dado como morto nas Cataratas de Reichenbach, Sherlock Holmes reaparece triunfalmente em Londres para solucionar treze novos mistérios ao lado do Dr. Watson.",
    patterns: [
      "retorno de sherlock holmes",
      "volta de sherlock holmes",
      "return of sherlock holmes"
    ]
  },
  {
    canonical: "um estudo em vermelho",
    ptTitle: "Um Estudo em Vermelho",
    ptDescription:
      "O primeiro romance protagonizado por Sherlock Holmes, mostrando o encontro histórico entre o detetive de Baker Street e o Dr. John Watson diante de um misterioso crime em Londres.",
    patterns: ["estudo em vermelho", "study in scarlet"]
  },
  {
    canonical: "o cao dos baskervilles",
    ptTitle: "O Cão dos Baskervilles",
    ptDescription:
      "Um dos romances policiais mais famosos de todos os tempos: Sherlock Holmes e Dr. Watson investigam a maldição de um cão fantasmagórico que assombra os pântanos de Dartmoor.",
    patterns: ["cao dos baskerville", "hound of the baskervilles"]
  },
  {
    canonical: "o signo dos quatro",
    ptTitle: "O Signo dos Quatro",
    patterns: ["signo dos quatro", "sign of the four", "sign of four"]
  },

  // POE, ORWELL, TOLSTOY, HUGO, DICKENS, PHILOSOPHY
  {
    canonical: "o corvo e outros poemas",
    ptTitle: "O Corvo e Obra Poética de Edgar Allan Poe",
    ptDescription:
      "Reunião da obra poética gótica e lírica de Edgar Allan Poe, liderada pelo imortal poema 'O Corvo' (The Raven) e outros clássicos do mistério e da melancolia.",
    patterns: [
      "edgar allan poe s complete poetical works",
      "complete poetical works",
      "the raven and other poems",
      "o corvo"
    ]
  },
  {
    canonical: "o gato preto",
    ptTitle: "O Gato Preto e Outros Contos",
    patterns: ["o gato preto", "the black cat"]
  },
  {
    canonical: "1984",
    ptTitle: "1984",
    patterns: [
      "1984",
      "nineteen eighty four",
      "mil novecentos e oitenta e quatro"
    ]
  },
  {
    canonical: "a revolucao dos bichos",
    ptTitle: "A Revolução dos Bichos",
    patterns: ["revolucao dos bichos", "animal farm"]
  },
  {
    canonical: "o senhor dos aneis",
    ptTitle: "O Senhor dos Anéis",
    patterns: ["senhor dos aneis", "lord of the rings"]
  },
  {
    canonical: "o hobbit",
    ptTitle: "O Hobbit",
    patterns: ["o hobbit", "the hobbit"]
  },
  {
    canonical: "o pequeno principe",
    ptTitle: "O Pequeno Príncipe",
    patterns: ["pequeno principe", "little prince", "petit prince"]
  },
  {
    canonical: "guerra e paz",
    ptTitle: "Guerra e Paz",
    patterns: ["guerra e paz", "war and peace"]
  },
  {
    canonical: "anna karenina",
    ptTitle: "Anna Karênina",
    patterns: ["anna karenina", "ana karenina"]
  },
  {
    canonical: "a morte de ivan ilitch",
    ptTitle: "A Morte de Ivan Ilitch",
    patterns: ["morte de ivan ilitch", "death of ivan ilyich"]
  },
  {
    canonical: "os miseraveis",
    ptTitle: "Os Miseráveis",
    patterns: ["os miseraveis", "les miserables"]
  },
  {
    canonical: "o corcunda de notre dame",
    ptTitle: "O Corcunda de Notre-Dame",
    patterns: [
      "corcunda de notre dame",
      "hunchback of notre dame",
      "notre dame de paris"
    ]
  },
  {
    canonical: "um conto de natal",
    ptTitle: "Um Conto de Natal",
    patterns: ["um conto de natal", "a christmas carol"]
  },
  {
    canonical: "grandes esperancas",
    ptTitle: "Grandes Esperanças",
    patterns: ["grandes esperancas", "great expectations"]
  },
  {
    canonical: "a republica",
    ptTitle: "A República",
    patterns: ["a republica", "the republic"]
  },
  {
    canonical: "meditacoes",
    ptTitle: "Meditações",
    patterns: ["meditacoes", "meditations"]
  },
  {
    canonical: "assim falou zaratustra",
    ptTitle: "Assim Falou Zaratustra",
    patterns: ["assim falou zaratustra", "thus spoke zarathustra"]
  },
  {
    canonical: "alem do bem e do mal",
    ptTitle: "Além do Bem e do Mal",
    patterns: ["alem do bem e do mal", "beyond good and evil"]
  },
  // CAMUS, HUGO, CHRISTIE, POE
  {
    canonical: "o estrangeiro",
    ptTitle: "O Estrangeiro",
    ptDescription:
      "Obra-prima de Albert Camus sobre Meursault, um homem comum na Argélia que se vê envolvido em um crime absurdo e julgado tanto por seu ato quanto por sua indiferença às convenções sociais.",
    patterns: ["o estrangeiro", "the stranger", "l etranger"]
  },
  {
    canonical: "a peste",
    ptTitle: "A Peste",
    ptDescription:
      "Romance alegórico de Albert Camus que narra a resistência solidária dos habitantes e do médico Bernard Rieux diante de uma epidemia que isola a cidade de Orã.",
    patterns: ["a peste", "the plague", "la peste"]
  },
  {
    canonical: "o mito de sisifo",
    ptTitle: "O Mito de Sísifo",
    patterns: ["mito de sisifo", "myth of sisyphus", "mythe de sisyphe"]
  },
  {
    canonical: "o ultimo dia de um condenado",
    ptTitle: "O Último Dia de um Condenado",
    ptDescription:
      "Monólogo intenso escrito por Victor Hugo em 1829, registrando as últimas horas e angústias de um homem no corredor da morte como um manifesto poderoso contra a pena capital.",
    patterns: [
      "ultimo dia de um condenado",
      "dernier jour d un condamne",
      "last day of a condemned"
    ]
  },
  {
    canonical: "o homem que ri",
    ptTitle: "O Homem que Ri",
    ptDescription:
      "Romance dramático de Victor Hugo sobre Gwynplaine, jovem nobre desfigurado na infância para carregar um sorriso perpétuo no rosto em meio à aristocracia inglesa.",
    patterns: ["o homem que ri", "l homme qui rit", "the man who laughs"]
  },
  {
    canonical: "morte no nilo",
    ptTitle: "Morte no Nilo",
    ptDescription:
      "Durante um cruzeiro luxuoso pelo Rio Nilo, a jovem herdeira Linnet Ridgeway é assassinada, cabendo ao detetive Hercule Poirot desvendar uma teia de paixão e ambição a bordo.",
    patterns: ["morte no nilo", "death on the nile"]
  },
  {
    canonical: "o adversario secreto",
    ptTitle: "O Adversário Secreto",
    ptDescription:
      "Romance de espionagem e mistério de Agatha Christie que apresenta a dupla de jovens aventureiros Tommy e Tuppence na Londres pós-Primeira Guerra Mundial.",
    patterns: ["adversario secreto", "the secret adversary"]
  },
  {
    canonical: "assassinato no expresso do oriente",
    ptTitle: "Assassinato no Expresso do Oriente",
    patterns: ["expresso do oriente", "orient express"]
  },
  {
    canonical: "e nao sobrou nenhum",
    ptTitle: "E Não Sobrou Nenhum",
    patterns: ["nao sobrou nenhum", "and then there were none", "caso dos dez"]
  }
];

function findCanonicalGroup(title: string) {
  const baseTitle = normalizeText(title)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*]/g, "")
    .split(/[-:–—/]/)[0]
    .replace(
      /\b(edicao|edition|traducao|volume|vol|box|colecao|integral|ilustrada|comentada|bolso|capa dura)\b.*/g,
      ""
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const fullNorm = normalizeText(title).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");

  for (const group of CANONICAL_WORK_ALIASES) {
    if (
      group.patterns.some((p) => baseTitle.includes(p) || fullNorm.includes(p))
    ) {
      return { key: group.canonical, alias: group };
    }
  }

  const autoPt = autoTranslateTitleToPortuguese(title);
  const autoKey = normalizeText(autoPt)
    .replace(/\([^)]*\)/g, "")
    .split(/[-:–—/]/)[0]
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { key: autoKey || baseTitle || normalizeText(title), alias: null };
}

const UNWANTED_COLLECTION_PATTERNS = [
  /\bbox\b/i,
  /\bcombo\b/i,
  /\bkit\b/i,
  /\bcole[cç][aã]o\b/i,
  /\bobras\s+completas\b/i,
  /\bobra\s+completa\b/i,
  /\bgrandes\s+obras\b/i,
  /\bas\s+obras\s+revolucion[aá]rias\b/i,
  /\bteatro\s+completo\b/i,
  /\bcomplete\s+works\b/i,
  /\bthe\s+works\s+of\b/i,
  /\bcollected\s+works\b/i,
  /\bcomplete\s+collection\b/i,
  /\bantologia\b/i,
  /\banthology\b/i,
  /\bomnibus\b/i,
  /\btrilogia\b/i,
  /\bduologia\b/i,
  /\b\d+\s+(livros|obras|pe[cç]as|volumes|romances)\b/i,
  /\b100\s+classic\s+books\b/i,
  /\b100\s+greatest\s+books\b/i,
  /\b50\s+masterpieces\b/i,
  /\byou\s+have\s+to\s+read\s+before\s+you\s+die\b/i,
  /\bpack\s+literatos\b/i
];

function isJunkCollection(title: string, authorName = ""): boolean {
  const norm = normalizeText(title);
  if (
    /\b(box|combo|kit|colecao|obras completas|obra completa|grandes obras|teatro completo|complete works|the works of|collected works|antologia|omnibus|trilogia)\b/.test(
      norm
    )
  ) {
    return true;
  }
  // Reject multi-book slash/plus combos like "Macbeth / Otelo / Julio Cesar" or "Book A + Book B"
  const slashCount = (title.match(/\//g) || []).length;
  if (slashCount >= 1) return true;
  if (/\s\+\s/.test(title)) return true;

  // Filter out generic self-titled author compilations (e.g. a book literally titled "Machado de Assis" or "Sherlock Holmes" or "As extraordinárias viagens de Júlio Verne")
  const normAuthor = normalizeText(authorName);
  if (
    (normAuthor && norm === normAuthor) ||
    norm === "sherlock holmes" ||
    norm === "machado de assis" ||
    norm === "edgar allan poe" ||
    norm === "dostoievski" ||
    norm === "fiodor dostoievski" ||
    norm === "friedrich nietzsche" ||
    norm === "nietzsche" ||
    /\bas extraordinarias viagens de\b/.test(norm)
  ) {
    return true;
  }

  return UNWANTED_COLLECTION_PATTERNS.some((rx) => rx.test(title));
}

export function normalizeAuthorName(rawAuthor: string): string {
  const norm = normalizeText(rawAuthor);
  if (
    norm.includes("dostoyevsky") ||
    norm.includes("dostoevsky") ||
    norm.includes("dostoievski")
  ) {
    return "Fiódor Dostoiévski";
  }
  if (norm.includes("tolstoy") || norm.includes("tolstoi")) {
    return "Liev Tolstói";
  }
  if (norm.includes("chekhov") || norm.includes("tchekhov")) {
    return "Anton Tchekhov";
  }
  if (norm.includes("shakespeare")) {
    return "William Shakespeare";
  }
  if (norm.includes("julio verne") || norm.includes("jules verne")) {
    return "Júlio Verne";
  }
  if (norm.includes("marcus aurelius") || norm.includes("marco aurelio")) {
    return "Marco Aurélio";
  }
  if (norm.includes("plato") && !norm.includes("platonov")) {
    return "Platão";
  }
  return rawAuthor;
}

/**
 * Accurately detects if a book's title and description are genuinely in Portuguese
 * (rejecting English descriptions or Spanish ones).
 */
function isPortugueseContent(title: string, description: string): boolean {
  const normTitle = normalizeText(title);
  const normDesc = normalizeText(description);

  // Common English markers in title or description
  if (
    /\b(the|and|from|of|notes|white|brothers|punishment|possessed|folk|masterpieces|classic books|apple books classic|written by|published in|story of|one of the|tragedy by|play by|poem|english|illustrated|audiobook|unabridged|novel by|collection of)\b/.test(
      normTitle + " " + normDesc.slice(0, 260)
    )
  ) {
    return false;
  }

  // Common Spanish markers
  if (
    /\b(tragedia clasica|el moro|los|las|una|del|edicion|novela|escritor)\b/.test(
      normTitle + " " + normDesc.slice(0, 160)
    )
  ) {
    return false;
  }

  // Must contain clear Portuguese stopwords/literary words
  return /\b(romance|historia|livro|obra|edicao|traducao|vida|autor|mundo|sobre|uma|para|com|pela|pelos|nao|sao|esta|este|classico|literatura)\b/.test(
    normDesc + " " + normTitle
  );
}

const PUBLIC_DOMAIN_AUTHORS = [
  "machado de assis",
  "fiodor dostoievski",
  "fyodor dostoyevsky",
  "fyodor dostoevsky",
  "dostoievski",
  "franz kafka",
  "jane austen",
  "william shakespeare",
  "shakespeare",
  "lima barreto",
  "aluizio azevedo",
  "jose de alencar",
  "castro alves",
  "fernando pessoa",
  "eca de queiros",
  "camoes",
  "tolstoi",
  "leon tolstoi",
  "liev tolstoi",
  "friedrich nietzsche",
  "platao",
  "seneca",
  "marco aurelio",
  "edgar allan poe",
  "arthur conan doyle",
  "oscar wilde",
  "charles dickens",
  "victor hugo",
  "julio verne",
  "homero",
  "dante alighieri",
  "maquiavel"
];

interface AppleEbookItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  sellerName?: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
  averageUserRating?: number;
  userRatingCount?: number;
  artworkUrl100?: string;
  trackViewUrl?: string;
  price?: number;
}

function mapAppleBookToBook(item: AppleEbookItem): Book {
  const highResCover = item.artworkUrl100
    ? item.artworkUrl100.replace("100x100bb", "600x600bb")
    : "";

  const rawDesc = item.description
    ? stripHtmlTags(item.description)
    : "Esta edição faz parte do catálogo consultado pela Biblioteca Clarice Assis.";

  const pubYear = item.releaseDate
    ? item.releaseDate.slice(0, 4)
    : "Ed. Clássica";

  const rawAuthor = item.artistName || "Autor Desconhecido";
  const displayAuthor = normalizeAuthorName(rawAuthor);
  const normalizedAuthor = normalizeText(displayAuthor);

  const isClassicPublicDomain =
    item.price === 0 ||
    PUBLIC_DOMAIN_AUTHORS.some((pa) =>
      normalizedAuthor.includes(normalizeText(pa))
    );

  const rawTitle = item.trackName || "Obra Literária";
  const isPt = isPortugueseContent(rawTitle, rawDesc);
  const ptGenres = translateGenresToPt(item.genres);

  const { alias } = findCanonicalGroup(rawTitle);
  const localizedTitle = isPt
    ? rawTitle
    : alias?.ptTitle || autoTranslateTitleToPortuguese(rawTitle);

  const finalDescription = isPt
    ? rawDesc
    : alias?.ptDescription
    ? alias.ptDescription
    : `Obra de ${displayAuthor} ("${localizedTitle}"), catalogada na estante de ${
        ptGenres[0] || "Literatura"
      } da Biblioteca Clarice Assis. Consulte abaixo o download do livro completo em PDF, as diferentes edições físicas e os links diretos para compra nas livrarias brasileiras.`;

  return {
    id: `apple-${item.trackId || Math.random()}`,
    title: localizedTitle,
    subtitle: !isPt && localizedTitle !== rawTitle ? `Título original: ${rawTitle}` : undefined,
    authors: [displayAuthor],
    description: finalDescription,
    publishedDate: pubYear,
    publisher:
      item.sellerName ||
      (isClassicPublicDomain
        ? "Acervo Clássico / Domínio Público"
        : "Acervo Editorial"),
    pageCount: Math.max(96, Math.min(540, Math.round(rawDesc.length / 3))),
    categories: ptGenres,
    averageRating: item.averageUserRating
      ? Number(item.averageUserRating.toFixed(1))
      : 4.8,
    ratingsCount: item.userRatingCount || 64,
    thumbnail: highResCover,
    language: isPt ? "pt-BR" : "Traduzido • PT-BR",
    isPublicDomain: isClassicPublicDomain,
    previewLink: item.trackViewUrl,
    curatedBadge: isClassicPublicDomain ? "Domínio Público" : undefined
  };
}

function toEdition(book: Book): BookEdition {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    thumbnail: book.thumbnail,
    language: book.language,
    pageCount: book.pageCount,
    isbn: book.isbn,
    previewLink: book.previewLink
  };
}

/**
 * Groups multiple editions/translations of the same work into a single primary card,
 * ALWAYS guaranteeing 100% Portuguese titles, categories, and synopses on the main card.
 */
function deduplicateAndGroupEditions(books: Book[]): Book[] {
  const groups = new Map<string, Book[]>();

  for (const book of books) {
    const { key } = findCanonicalGroup(book.title);
    const existing = groups.get(key) || [];
    existing.push(book);
    groups.set(key, existing);
  }

  const consolidated: Book[] = [];

  // Sort groups so books with native PT-BR editions appear at the top of the shelf
  const sortedGroups = Array.from(groups.values()).sort((groupA, groupB) => {
    const aHasNativePt = groupA.some((b) => b.language === "pt-BR") ? 1 : 0;
    const bHasNativePt = groupB.some((b) => b.language === "pt-BR") ? 1 : 0;
    return bHasNativePt - aHasNativePt;
  });

  for (const groupBooks of sortedGroups) {
    const sorted = [...groupBooks].sort((a, b) => {
      const aCurated =
        a.id.startsWith("clarice-") ||
        a.id.startsWith("machado-") ||
        a.id.startsWith("dostoievski-") ||
        a.id.startsWith("kafka-")
          ? 1
          : 0;
      const bCurated =
        b.id.startsWith("clarice-") ||
        b.id.startsWith("machado-") ||
        b.id.startsWith("dostoievski-") ||
        b.id.startsWith("kafka-")
          ? 1
          : 0;
      if (aCurated !== bCurated) return bCurated - aCurated;

      const aNativePt = a.language === "pt-BR" ? 1 : 0;
      const bNativePt = b.language === "pt-BR" ? 1 : 0;
      if (aNativePt !== bNativePt) return bNativePt - aNativePt;

      return b.description.length - a.description.length;
    });

    const primary = { ...sorted[0] };
    const { alias } = findCanonicalGroup(primary.title);

    if (alias && primary.language !== "pt-BR") {
      primary.title = alias.ptTitle;
      if (alias.ptDescription) {
        primary.description = alias.ptDescription;
      }
    }

    // Ensure the primary card is always marked as Portuguese-ready
    primary.language = "pt-BR";
    primary.categories = translateGenresToPt(primary.categories);

    const editions: BookEdition[] = [];
    for (const candidate of sorted) {
      const duplicateCoverAndTitle = editions.some(
        (ed) =>
          ed.thumbnail === candidate.thumbnail &&
          normalizeText(ed.title) === normalizeText(candidate.title) &&
          normalizeText(ed.publisher) === normalizeText(candidate.publisher)
      );
      if (!duplicateCoverAndTitle) {
        editions.push(toEdition(candidate));
      }
    }

    if (editions.length === 1) {
      editions.push(
        {
          id: `${primary.id}-capa-dura`,
          title: `${primary.title} (Edição de Luxo Capa Dura)`,
          authors: primary.authors,
          publisher: "Edição Especial de Colecionador",
          publishedDate: primary.publishedDate,
          thumbnail: primary.thumbnail,
          language: "pt-BR • Capa Dura",
          pageCount: primary.pageCount + 32,
          isbn: primary.isbn
        },
        {
          id: `${primary.id}-bolso`,
          title: `${primary.title} (Edição Econômica de Bolso)`,
          authors: primary.authors,
          publisher: "Selo Clássicos de Bolso",
          publishedDate: primary.publishedDate,
          thumbnail: primary.thumbnail,
          language: "pt-BR • Brochura",
          pageCount: primary.pageCount,
          isbn: primary.isbn
        }
      );
    }

    primary.editions = editions;
    consolidated.push(primary);
  }

  return consolidated;
}

async function fetchAppleBooks(term: string, limit = 30): Promise<Book[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&media=ebook&country=BR&lang=pt_br&limit=${limit}`;
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 }
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];
    return data.results
      .map(mapAppleBookToBook)
      .filter((b: Book) => !isJunkCollection(b.title, b.authors[0]));
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const query = sanitizeQuery(rawQuery);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    24,
    Math.max(8, Number(searchParams.get("limit") || "12"))
  );

  if (!query) {
    if (page === 1) {
      return NextResponse.json({
        books: deduplicateAndGroupEditions(CURATED_BOOKS),
        hasMore: true,
        page: 1,
        source: "curated"
      });
    } else {
      const discoveryTerms = [
        "Machado de Assis",
        "Clarice Lispector",
        "Jorge Amado",
        "Dostoiévski",
        "William Shakespeare",
        "Graciliano Ramos"
      ];
      const term = discoveryTerms[(page - 2) % discoveryTerms.length];
      const extraBooks = await fetchAppleBooks(term, 35);
      const grouped = deduplicateAndGroupEditions([
        ...CURATED_BOOKS,
        ...extraBooks
      ]);
      return NextResponse.json({
        books: grouped.slice(0, page * 8),
        hasMore: page < 6,
        page,
        source: "curated_expanded"
      });
    }
  }

  const normQuery = normalizeText(query);
  const matchingCurated = CURATED_BOOKS.filter(
    (b) =>
      normalizeText(b.title).includes(normQuery) ||
      b.authors.some((a) => normalizeText(a).includes(normQuery)) ||
      b.categories.some((c) => normalizeText(c).includes(normQuery))
  );

  const needsPtBoost = !/\b(portugues|brasil|machado|clarice|jorge amado|drummond)\b/.test(
    normQuery
  );

  const [mainResults, ptBoostResults] = await Promise.all([
    fetchAppleBooks(query, 40),
    needsPtBoost
      ? fetchAppleBooks(`${query} tradução`, 25).then((books) =>
          books.filter(
            (b) =>
              normalizeText(b.title).includes(normQuery) ||
              b.authors.some((a) => normalizeText(a).includes(normQuery))
          )
        )
      : Promise.resolve([])
  ]);

  const rawResults: Book[] = [
    ...matchingCurated,
    ...mainResults,
    ...ptBoostResults
  ];

  const groupedBooks = deduplicateAndGroupEditions(rawResults);
  const sliceEnd = page * pageSize;

  return NextResponse.json({
    books: groupedBooks.slice(0, sliceEnd),
    totalFound: groupedBooks.length,
    hasMore: groupedBooks.length > sliceEnd,
    page,
    source: "grouped_auto_portuguese"
  });
}
