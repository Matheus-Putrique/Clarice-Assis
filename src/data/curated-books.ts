import { Book, BookCategory } from "@/types/book";

export const BOOK_CATEGORIES: BookCategory[] = [
  {
    id: "acervo-clarice-assis",
    label: "Acervo Clarice & Assis",
    query: "Machado de Assis Clarice Lispector",
    description: "As obras imortais que batizam e inspiram nossa biblioteca."
  },
  {
    id: "classicos-mundiais",
    label: "Clássicos Universais",
    query: "Dostoiévski Tolstói Jane Austen George Orwell",
    description: "Grandes romances e obras que atravessaram os séculos."
  },
  {
    id: "filosofia-poesia",
    label: "Filosofia & Poesia",
    query: "Filosofia Nietzsche Sêneca Poesia Fernando Pessoa",
    description: "Reflexões profundas sobre a alma humana, o tempo e a arte."
  },
  {
    id: "fantasia-ficcao",
    label: "Ficção & Fantasia",
    query: "Tolkien Duna Ficção Científica Fantasia Mistério",
    description: "Mundos imaginários, enigmas literários e narrativas envolventes."
  },
  {
    id: "tecnologia-ciencia",
    label: "Ciência & Saberes",
    query: "Carl Sagan Ciência História Psicologia Computação",
    description: "A evolução do pensamento científico e humano."
  }
];

export const CURATED_BOOKS: Book[] = [
  {
    id: "clarice-hora-da-estrela",
    title: "A Hora da Estrela",
    subtitle: "Edição Comemorativa",
    authors: ["Clarice Lispector"],
    description:
      "Publicado pouco antes do falecimento de Clarice Lispector em 1977, 'A Hora da Estrela' narra a história de Macabéa, uma jovem alagoana órfã e datilógrafa que vive no Rio de Janeiro. Através do narrador Rodrigo S.M., Clarice constrói uma obra-prima sobre a invisibilidade social, a delicadeza da existência e a busca por sentido no silêncio das pequenas vidas.",
    publishedDate: "1977",
    publisher: "Editora Rocco",
    pageCount: 88,
    categories: ["Literatura Brasileira", "Romance Filosófico", "Clássicos"],
    averageRating: 4.9,
    ratingsCount: 3420,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication116/v4/e3/1d/73/e31d7335-1aa5-4c18-8fb6-59762edd8813/1032456103.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788532530561",
    isPublicDomain: false,
    featuredQuote: "Tudo no mundo começou com um sim. Uma molécula disse sim a outra molécula e nasceu a vida.",
    curatedBadge: "Patrona da Biblioteca"
  },
  {
    id: "machado-dom-casmurro",
    title: "Dom Casmurro",
    subtitle: "Texto Integral de Domínio Público",
    authors: ["Machado de Assis"],
    description:
      "Um dos maiores romances da língua portuguesa. Bento Santiago, o Bentinho, já na velhice e apelidado de Dom Casmurro, decide atar as duas pontas da vida reconstruindo sua juventude ao lado de Capitu — a jovem dos 'olhos de ressaca' — e de seu melhor amigo Escobar. Uma investigação genial sobre o ciúme, a memória e a natureza pouco confiável de quem narra a própria história.",
    publishedDate: "1899",
    publisher: "Garnier / Domínio Público",
    pageCount: 256,
    categories: ["Literatura Brasileira", "Realismo", "Domínio Público"],
    averageRating: 4.9,
    ratingsCount: 5180,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication/v4/b8/a3/4f/b8a34fb3-cbd1-0b1f-6f08-ee18b755c604/Dom_Casmurro.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788563560933",
    isPublicDomain: true,
    pdfUrl: "http://www.dominiopublico.gov.br/download/texto/bv000180.pdf",
    featuredQuote: "Olhos de ressaca? Vá, de ressaca. É o que me dá ideia daquela feição nova. Traziam não sei que fluido misterioso e enérgico, uma força que arrastava para dentro.",
    curatedBadge: "Patrono • PDF Gratuito"
  },
  {
    id: "machado-memorias-postumas",
    title: "Memórias Póstumas de Brás Cubas",
    subtitle: "Romance narrado por um defunto autor",
    authors: ["Machado de Assis"],
    description:
      "Dedicado 'ao verme que primeiro roeu as frias carnes do meu cadáver', este livro revolucionou a literatura em 1881. Já depois de morto, Brás Cubas decide narrar sua vida sem as amarras da hipocrisia social, entregando ironia fina, pessimismo bem-humorado e capítulos antológicos sobre a sociedade carioca do século XIX.",
    publishedDate: "1881",
    publisher: "Tipografia Nacional / Domínio Público",
    pageCount: 240,
    categories: ["Literatura Brasileira", "Realismo", "Filosofia"],
    averageRating: 4.8,
    ratingsCount: 4210,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication113/v4/d3/64/5d/d3645d81-a71f-2395-2ee4-d44411e9b899/cover-8.png/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788572328319",
    isPublicDomain: true,
    pdfUrl: "http://www.dominiopublico.gov.br/download/texto/bv000215.pdf",
    featuredQuote: "Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.",
    curatedBadge: "Patrono • PDF Gratuito"
  },
  {
    id: "clarice-paixao-segundo-gh",
    title: "A Paixão Segundo G.H.",
    subtitle: "Romance Epifânico",
    authors: ["Clarice Lispector"],
    description:
      "G.H., uma escultora da elite carioca, resolve arrumar o quarto de sua ex-empregada e ali vive um encontro inesperado que desmonta todas as suas certezas sobre identidade, linguagem e condição humana. Um mergulho hipnótico e filosófico sem paralelos na literatura mundial.",
    publishedDate: "1964",
    publisher: "Editora Rocco",
    pageCount: 180,
    categories: ["Literatura Brasileira", "Filosofia", "Introspecção"],
    averageRating: 4.8,
    ratingsCount: 2150,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication124/v4/ea/ef/19/eaef1910-c0c8-9f52-a25e-ac472917dd88/1032205328.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788532524591",
    isPublicDomain: false,
    featuredQuote: "Perder-se também é caminho.",
    curatedBadge: "Patrona da Biblioteca"
  },
  {
    id: "kafka-metamorfose",
    title: "A Metamorfose",
    subtitle: "Tradução Clássica",
    authors: ["Franz Kafka"],
    description:
      "Certa manhã, Gregor Samsa desperta de sonhos intranquilos e encontra-se na sua cama metamorfoseado num inseto monstruoso. Uma alegoria atemporal sobre o isolamento familiar, o peso do trabalho e a fragilidade do afeto humano.",
    publishedDate: "1915",
    publisher: "Clássicos Universais",
    pageCount: 104,
    categories: ["Clássicos Universais", "Ficção", "Existencialismo"],
    averageRating: 4.7,
    ratingsCount: 6890,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication114/v4/99/04/3d/99043d1e-557c-071a-be81-71d8e0ab8c3b/1032457242.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788535902778",
    isPublicDomain: true,
    pdfUrl: "https://www.gutenberg.org/ebooks/5200",
    featuredQuote: "Quando certa manhã Gregor Samsa acordou de sonhos intranquilos, encontrou-se em sua cama metamorfoseado num inseto monstruoso.",
    curatedBadge: "Clássico Universal"
  },
  {
    id: "dostoievski-noites-brancas",
    title: "Noites Brancas",
    subtitle: "Romance sentimental (Das recordações de um sonhador)",
    authors: ["Fiódor Dostoiévski"],
    description:
      "Durante quatro noites claras de verão em São Petersburgo, um jovem solitário e sonhador conhece Nástenka às margens de um canal. Entre confidências, promessas e esperanças de amor, Dostoiévski tece uma das novelas mais líricas e emocionantes de todos os tempos.",
    publishedDate: "1848",
    publisher: "Clássicos Russos",
    pageCount: 96,
    categories: ["Clássicos Universais", "Romance", "Literatura Russa"],
    averageRating: 4.8,
    ratingsCount: 3890,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication113/v4/2d/e3/0e/2de30e96-1fcb-44de-6f73-a3e7b40a923c/1031666439.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788573263244",
    isPublicDomain: true,
    featuredQuote: "Meu Deus! Um minuto inteiro de felicidade plena! Será isso, porventura, pouco para a vida toda de um homem?",
    curatedBadge: "Favorito dos Leitores"
  },
  {
    id: "machado-alienista",
    title: "O Alienista",
    subtitle: "De Papéis Avulsos",
    authors: ["Machado de Assis"],
    description:
      "O Dr. Simão Bacamarte, médico respeitado de Itaguaí, funda a Casa Verde para estudar e tratar todas as doenças da alma. À medida que suas teorias científicas avançam, a fronteira entre a razão e a loucura na cidade vira de cabeça para baixo.",
    publishedDate: "1882",
    publisher: "Domínio Público",
    pageCount: 92,
    categories: ["Literatura Brasileira", "Conto", "Sátira"],
    averageRating: 4.8,
    ratingsCount: 2940,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication/v4/c9/5a/de/c95ade49-f5a3-3088-31f4-5e06a57de8c4/The_Alienista.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788525406569",
    isPublicDomain: true,
    pdfUrl: "http://www.dominiopublico.gov.br/download/texto/bv000231.pdf",
    featuredQuote: "A ciência é o meu emprego único; Itaguaí é o meu universo.",
    curatedBadge: "Patrono • PDF Gratuito"
  },
  {
    id: "clarice-lacos-familia",
    title: "Laços de Família",
    subtitle: "Coletânea de Contos",
    authors: ["Clarice Lispector"],
    description:
      "Reunindo treze contos magistrais como 'Amor', 'Feliz Aniversário' e 'A Imitação da Rosa', Clarice captura o instante exato em que a rotina cotidiana de seus personagens se rompe em epifanias silenciosas e avassaladoras.",
    publishedDate: "1960",
    publisher: "Editora Rocco",
    pageCount: 136,
    categories: ["Literatura Brasileira", "Contos", "Clássicos"],
    averageRating: 4.9,
    ratingsCount: 1980,
    thumbnail: "https://is1-ssl.mzstatic.com/image/thumb/Publication113/v4/0c/91/37/0c9137ff-1def-9807-1c6f-5c821bd9ba06/1031543117.jpg/600x600bb.jpg",
    language: "pt-BR",
    isbn: "9788532524614",
    isPublicDomain: false,
    featuredQuote: "Mas já que se há de escrever, que ao menos não se esmaguem com palavras as entrelinhas.",
    curatedBadge: "Patrona da Biblioteca"
  }
];
