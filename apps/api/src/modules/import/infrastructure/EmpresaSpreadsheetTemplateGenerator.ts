import * as XLSX from "xlsx";

const HEADER = [
  "CNPJ",
  "Razão Social",
  "Nome Fantasia",
  "Telefone",
  "Email",
  "Cidade",
  "UF",
  "Responsável",
] as const;

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Mesmo algoritmo mod-11 de `party/domain/value-objects/CNPJ.ts` — gera um CNPJ fictício, mas com dígitos verificadores válidos (passa `CNPJ.create()`). */
function computeCheckDigit(base: string, weights: number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + weight * Number(base[index] ?? 0),
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function generateFakeCnpj(sequence: number): string {
  const root = String(1_000_0000 + sequence * 137)
    .padStart(8, "0")
    .slice(-8);
  const base12 = `${root}0001`;
  const d1 = computeCheckDigit(base12, CNPJ_WEIGHTS_1);
  const base13 = `${base12}${d1}`;
  const d2 = computeCheckDigit(base13, CNPJ_WEIGHTS_2);
  const digits = `${base13}${d2}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function slugifyForEmail(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

interface DemoEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  areaCode: string;
  responsavel: string;
}

/**
 * 50 empresas fictícias originais (ver ADR 0037) — inspiradas só na
 * *estrutura* de uma carteira real de recuperação de crédito (variedade de
 * setor, porte, estado e — nas últimas 20 — arquétipo de risco: holdings,
 * fomento mercantil e "empresas de fachada" são tipos de negócio
 * propositalmente super-representados nesta faixa, porque são exatamente o
 * perfil que mais aparece numa carteira real de recuperação de crédito).
 * Nomes, CNPJs, telefones e e-mails são inteiramente inventados; qualquer
 * coincidência com uma empresa real é só isso, coincidência de nome
 * genérico.
 */
const DEMO_EMPRESAS: DemoEmpresa[] = [
  {
    razaoSocial: "Aurora Metalúrgica LTDA",
    nomeFantasia: "Aurora Metais",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "Camila Nogueira",
  },
  {
    razaoSocial: "Vértice Comércio de Materiais LTDA",
    nomeFantasia: "Vértice Materiais",
    cidade: "Curitiba",
    uf: "PR",
    areaCode: "41",
    responsavel: "Rodrigo Almeida",
  },
  {
    razaoSocial: "Aroeira Consultoria Empresarial LTDA",
    nomeFantasia: "Aroeira Consultoria",
    cidade: "Belo Horizonte",
    uf: "MG",
    areaCode: "31",
    responsavel: "Fernanda Bittencourt",
  },
  {
    razaoSocial: "NexoTech Soluções Digitais LTDA",
    nomeFantasia: "NexoTech",
    cidade: "Florianópolis",
    uf: "SC",
    areaCode: "48",
    responsavel: "Lucas Meireles",
  },
  {
    razaoSocial: "Vitalis Clínica Médica LTDA",
    nomeFantasia: "Vitalis Saúde",
    cidade: "Porto Alegre",
    uf: "RS",
    areaCode: "51",
    responsavel: "Beatriz Cardoso",
  },
  {
    razaoSocial: "Rota Norte Transportes LTDA",
    nomeFantasia: "Rota Norte Log",
    cidade: "Manaus",
    uf: "AM",
    areaCode: "92",
    responsavel: "Marcelo Tavares",
  },
  {
    razaoSocial: "Saber Educacional LTDA",
    nomeFantasia: "Colégio Saber",
    cidade: "Recife",
    uf: "PE",
    areaCode: "81",
    responsavel: "Juliana Farias",
  },
  {
    razaoSocial: "Cerrado Alimentos LTDA",
    nomeFantasia: "Cerrado Alimentos",
    cidade: "Goiânia",
    uf: "GO",
    areaCode: "62",
    responsavel: "Eduardo Ramalho",
  },
  {
    razaoSocial: "Litoral Distribuidora LTDA",
    nomeFantasia: "Litoral Distrib",
    cidade: "Salvador",
    uf: "BA",
    areaCode: "71",
    responsavel: "Patrícia Souza",
  },
  {
    razaoSocial: "Prisma Auditoria e Assessoria LTDA",
    nomeFantasia: "Prisma Assessoria",
    cidade: "Brasília",
    uf: "DF",
    areaCode: "61",
    responsavel: "Gustavo Lacerda",
  },
  {
    razaoSocial: "ByteForge Sistemas LTDA",
    nomeFantasia: "ByteForge",
    cidade: "Campinas",
    uf: "SP",
    areaCode: "19",
    responsavel: "Renata Ximenes",
  },
  {
    razaoSocial: "Amparo Diagnósticos LTDA",
    nomeFantasia: "Amparo Diagnósticos",
    cidade: "Fortaleza",
    uf: "CE",
    areaCode: "85",
    responsavel: "Diego Cavalcante",
  },
  {
    razaoSocial: "Trilha Logística Integrada LTDA",
    nomeFantasia: "Trilha Log",
    cidade: "Vitória",
    uf: "ES",
    areaCode: "27",
    responsavel: "Larissa Peixoto",
  },
  {
    razaoSocial: "Horizonte Ensino Técnico LTDA",
    nomeFantasia: "Horizonte Técnico",
    cidade: "Cuiabá",
    uf: "MT",
    areaCode: "65",
    responsavel: "Bruno Salgado",
  },
  {
    razaoSocial: "Fibratech Indústria Textil LTDA",
    nomeFantasia: "Fibratech",
    cidade: "Blumenau",
    uf: "SC",
    areaCode: "47",
    responsavel: "Aline Wagner",
  },
  {
    razaoSocial: "Cambará Comércio Agropecuário LTDA",
    nomeFantasia: "Cambará Agro",
    cidade: "Londrina",
    uf: "PR",
    areaCode: "43",
    responsavel: "Vinícius Prado",
  },
  {
    razaoSocial: "Âncora Serviços Jurídicos LTDA",
    nomeFantasia: "Âncora Jurídico",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    areaCode: "21",
    responsavel: "Carolina Esteves",
  },
  {
    razaoSocial: "Codesul Tecnologia LTDA",
    nomeFantasia: "Codesul",
    cidade: "Porto Alegre",
    uf: "RS",
    areaCode: "51",
    responsavel: "Felipe Moraes",
  },
  {
    razaoSocial: "Boa Vista Odontologia LTDA",
    nomeFantasia: "Boa Vista Odonto",
    cidade: "Belém",
    uf: "PA",
    areaCode: "91",
    responsavel: "Tatiane Cunha",
  },
  {
    razaoSocial: "Cargonet Transportes LTDA",
    nomeFantasia: "Cargonet",
    cidade: "Santos",
    uf: "SP",
    areaCode: "13",
    responsavel: "Henrique Dutra",
  },
  {
    razaoSocial: "Alicerce Educação Profissional LTDA",
    nomeFantasia: "Alicerce Educação",
    cidade: "Natal",
    uf: "RN",
    areaCode: "84",
    responsavel: "Simone Barros",
  },
  {
    razaoSocial: "Serrano Metalurgia LTDA",
    nomeFantasia: "Serrano Metais",
    cidade: "Caxias do Sul",
    uf: "RS",
    areaCode: "54",
    responsavel: "André Kuhn",
  },
  {
    razaoSocial: "Ponto Certo Varejo LTDA",
    nomeFantasia: "Ponto Certo",
    cidade: "Uberlândia",
    uf: "MG",
    areaCode: "34",
    responsavel: "Débora Martins",
  },
  {
    razaoSocial: "Lumen Consultoria Financeira LTDA",
    nomeFantasia: "Lumen Financeira",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "Rafael Quintão",
  },
  {
    razaoSocial: "Órbita Software LTDA",
    nomeFantasia: "Órbita Software",
    cidade: "Recife",
    uf: "PE",
    areaCode: "81",
    responsavel: "Mariana Teles",
  },
  {
    razaoSocial: "Cuidar Mais Saúde LTDA",
    nomeFantasia: "Cuidar Mais",
    cidade: "Joinville",
    uf: "SC",
    areaCode: "47",
    responsavel: "Otávio Fagundes",
  },
  {
    razaoSocial: "Trajeto Logística Urbana LTDA",
    nomeFantasia: "Trajeto Log",
    cidade: "Campo Grande",
    uf: "MS",
    areaCode: "67",
    responsavel: "Priscila Andrade",
  },
  {
    razaoSocial: "Novo Saber Idiomas LTDA",
    nomeFantasia: "Novo Saber Idiomas",
    cidade: "João Pessoa",
    uf: "PB",
    areaCode: "83",
    responsavel: "Thiago Rezende",
  },
  {
    razaoSocial: "Granito Construções LTDA",
    nomeFantasia: "Granito Construções",
    cidade: "Ribeirão Preto",
    uf: "SP",
    areaCode: "16",
    responsavel: "Vanessa Corrêa",
  },
  {
    razaoSocial: "Vento Sul Comércio de Máquinas LTDA",
    nomeFantasia: "Vento Sul Máquinas",
    cidade: "Passo Fundo",
    uf: "RS",
    areaCode: "54",
    responsavel: "Cláudio Nascimento",
  },
  {
    razaoSocial: "Holding Brasil Participações S.A.",
    nomeFantasia: "Holding Brasil",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "João Pedro Lima",
  },
  {
    razaoSocial: "Logística Alpha Participações LTDA",
    nomeFantasia: "Logística Alpha",
    cidade: "Guarulhos",
    uf: "SP",
    areaCode: "11",
    responsavel: "Maria Souza",
  },
  {
    razaoSocial: "Zenith Fomento Mercantil LTDA",
    nomeFantasia: "Zenith Fomento",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    areaCode: "21",
    responsavel: "Carlos Mendes",
  },
  {
    razaoSocial: "Mercúrio Participações e Investimentos LTDA",
    nomeFantasia: "Mercúrio Participações",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "Alexandre Torres",
  },
  {
    razaoSocial: "Delta Fomento Comercial LTDA",
    nomeFantasia: "Delta Fomento",
    cidade: "Osasco",
    uf: "SP",
    areaCode: "11",
    responsavel: "Marina Vasconcelos",
  },
  {
    razaoSocial: "Atlas Holding Empresarial S.A.",
    nomeFantasia: "Atlas Holding",
    cidade: "Belo Horizonte",
    uf: "MG",
    areaCode: "31",
    responsavel: "Ricardo Salvador",
  },
  {
    razaoSocial: "Quality Import Comércio Exterior LTDA",
    nomeFantasia: "Quality Import",
    cidade: "Itajaí",
    uf: "SC",
    areaCode: "47",
    responsavel: "Fábio Lourenço",
  },
  {
    razaoSocial: "Prime Trading Distribuidora LTDA",
    nomeFantasia: "Prime Trading",
    cidade: "Paranaguá",
    uf: "PR",
    areaCode: "41",
    responsavel: "Silvana Rocha",
  },
  {
    razaoSocial: "Global Serviços Administrativos LTDA",
    nomeFantasia: "Global Serviços",
    cidade: "Barueri",
    uf: "SP",
    areaCode: "11",
    responsavel: "Anderson Freitas",
  },
  {
    razaoSocial: "Cristal Empreendimentos Imobiliários LTDA",
    nomeFantasia: "Cristal Empreendimentos",
    cidade: "Balneário Camboriú",
    uf: "SC",
    areaCode: "47",
    responsavel: "Elisa Guimarães",
  },
  {
    razaoSocial: "Fênix Consultoria Tributária LTDA",
    nomeFantasia: "Fênix Tributária",
    cidade: "Curitiba",
    uf: "PR",
    areaCode: "41",
    responsavel: "Marcelo Feitosa",
  },
  {
    razaoSocial: "Novaera Participações LTDA",
    nomeFantasia: "Novaera Participações",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "Cíntia Delgado",
  },
  {
    razaoSocial: "Bravo Comércio de Equipamentos LTDA",
    nomeFantasia: "Bravo Equipamentos",
    cidade: "Contagem",
    uf: "MG",
    areaCode: "31",
    responsavel: "Leandro Pacheco",
  },
  {
    razaoSocial: "Zafira Indústria Química LTDA",
    nomeFantasia: "Zafira Química",
    cidade: "Camaçari",
    uf: "BA",
    areaCode: "71",
    responsavel: "Roberta Chaves",
  },
  {
    razaoSocial: "Ipê Roxo Agronegócios LTDA",
    nomeFantasia: "Ipê Roxo Agro",
    cidade: "Rondonópolis",
    uf: "MT",
    areaCode: "66",
    responsavel: "Wagner Siqueira",
  },
  {
    razaoSocial: "Estrela do Sul Cooperativa de Crédito LTDA",
    nomeFantasia: "Estrela do Sul Crédito",
    cidade: "Chapecó",
    uf: "SC",
    areaCode: "49",
    responsavel: "Denise Amaral",
  },
  {
    razaoSocial: "Torres Engenharia e Construções LTDA",
    nomeFantasia: "Torres Engenharia",
    cidade: "Aracaju",
    uf: "SE",
    areaCode: "79",
    responsavel: "Paulo Vieira",
  },
  {
    razaoSocial: "Vanguarda Segurança Patrimonial LTDA",
    nomeFantasia: "Vanguarda Segurança",
    cidade: "São Luís",
    uf: "MA",
    areaCode: "98",
    responsavel: "Cristiane Bezerra",
  },
  {
    razaoSocial: "Kairós Gestão de Ativos LTDA",
    nomeFantasia: "Kairós Ativos",
    cidade: "São Paulo",
    uf: "SP",
    areaCode: "11",
    responsavel: "Fabrício Nunes",
  },
  {
    razaoSocial: "Raiz Forte Comércio Varejista LTDA",
    nomeFantasia: "Raiz Forte Varejo",
    cidade: "Teresina",
    uf: "PI",
    areaCode: "86",
    responsavel: "Sandra Melo",
  },
];

function buildWorkbookBuffer(rows: (string | number)[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([[...HEADER], ...rows]);
  worksheet["!cols"] = HEADER.map(() => ({ wch: 22 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Planilha-modelo para o usuário preencher: cabeçalho + uma linha de exemplo com CNPJ válido (fictício), ver ADR 0037. */
export function generateEmpresasTemplateWorkbook(): Buffer {
  const exemplo: (string | number)[] = [
    generateFakeCnpj(1),
    "Exemplo Comércio e Serviços LTDA",
    "Empresa Exemplo",
    "(11) 4000-0000",
    "contato@empresaexemplo.com.br",
    "São Paulo",
    "SP",
    "Nome do Responsável",
  ];
  return buildWorkbookBuffer([exemplo]);
}

/** Planilha de demonstração com 30 empresas fictícias originais (ver `DEMO_EMPRESAS`, ADR 0037). */
export function generateEmpresasDemoWorkbook(): Buffer {
  const rows = DEMO_EMPRESAS.map((empresa, index) => {
    const emailDomain = `${slugifyForEmail(empresa.nomeFantasia)}.com.br`;
    const telefoneLinha = String(1000 + index * 37).padStart(4, "0");
    return [
      generateFakeCnpj(index + 2),
      empresa.razaoSocial,
      empresa.nomeFantasia,
      `(${empresa.areaCode}) ${telefoneLinha}-${String(2000 + index * 11).padStart(4, "0")}`,
      `contato@${emailDomain}`,
      empresa.cidade,
      empresa.uf,
      empresa.responsavel,
    ];
  });
  return buildWorkbookBuffer(rows);
}
