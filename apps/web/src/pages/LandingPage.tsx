import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Accordion } from "../components/ui/Accordion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CountUpStat } from "../components/ui/CountUpStat";

const DIFFERENTIALS = [
  {
    icon: "🔍",
    title: "Explainable AI por construção",
    description:
      "Toda classificação de risco, recomendação e execução de regra vem com o motivo, a fonte e o fator exatos — nunca uma caixa-preta. Explicabilidade é parte do dado, não um relatório à parte.",
  },
  {
    icon: "🕒",
    title: "Timeline de versionamento",
    description:
      "Cada evidência nova gera uma versão auditável do dossiê, com diff entre versões — nada se perde, nada é sobrescrito silenciosamente.",
  },
  {
    icon: "🛡️",
    title: "Auditoria nativa e RBAC granular",
    description:
      "Toda ação relevante é um evento de auditoria correlacionável; permissões por operação específica, não papéis genéricos que escondem o que cada pessoa pode de fato fazer.",
  },
  {
    icon: "🧩",
    title: "Motor de regras configurável",
    description:
      "Peso, prioridade, condição e ação — regras de negócio versionadas sem recompilar e sem deploy.",
  },
  {
    icon: "🧪",
    title: "Simulation Lab",
    description:
      "Teste o impacto de uma mudança de regra contra a base real antes de publicá-la — nenhuma alteração de política entra em produção sem simulação prévia.",
  },
  {
    icon: "🌡️",
    title: "Confidence Heatmap",
    description:
      "Cada dado de um dossiê mostra visualmente de qual fonte veio e quão confiável é — divergências entre fontes ficam visíveis, nunca escondidas na média.",
  },
  {
    icon: "📥",
    title: "Importação enterprise",
    description:
      "Preview antes de importar, detecção de duplicados, rollback lógico e histórico completo — nunca uma planilha corrompe a base.",
  },
  {
    icon: "🏢",
    title: "Fundação multi-tenant",
    description: "Isolamento por tenant garantido no banco, não só por convenção de código.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Consulta e resolução de identidade",
    description:
      "Uma consulta por CPF/CNPJ resolve pessoas e empresas relacionadas, cruzando fontes com pontuação de confiança por sinal.",
  },
  {
    step: "2",
    title: "Classificação explicável",
    description:
      "O motor de regras aplica a política de risco vigente e devolve uma classificação com o motivo exato de cada fator considerado.",
  },
  {
    step: "3",
    title: "Recomendação de cobrança",
    description:
      "Canal, tom e prioridade de contato são recomendados com base no histórico e no perfil de risco — nunca um script genérico.",
  },
  {
    step: "4",
    title: "Auditoria e versionamento contínuos",
    description:
      "Toda decisão e toda evidência nova ficam registradas, versionadas e rastreáveis — prontas para qualquer auditoria futura.",
  },
];

const TECH_STACK = [
  "TypeScript",
  "React",
  "Node.js",
  "PostgreSQL",
  "Redis",
  "Prisma",
  "Docker",
  "Prometheus",
];

const FAQ_ITEMS = [
  {
    question: "A plataforma funciona sem integração com bureaus externos?",
    answer:
      "Sim — o motor de identidade, classificação e recomendação opera sobre os dados já importados/cadastrados. Fontes externas são plugáveis via o mesmo padrão de porta/adaptador já usado internamente.",
  },
  {
    question: "Como funciona o controle de acesso?",
    answer:
      "RBAC granular por permissão (não por papel genérico): cada ação sensível declara exatamente qual permissão exige, e cada papel é um conjunto explícito de permissões, auditável e versionado.",
  },
  {
    question: "Os dados de CPF/CNPJ ficam expostos em logs ou relatórios?",
    answer:
      "Não. Documentos sensíveis são mascarados por padrão em todo o pipeline de importação e nos relatórios — LGPD por construção, não por checklist manual.",
  },
  {
    question: "É possível simular o impacto de uma nova regra antes de publicá-la?",
    answer:
      "Sim — o Simulation Lab roda qualquer alteração de regra contra a base real e devolve o diff de classificações antes de qualquer publicação.",
  },
  {
    question: "A plataforma suporta múltiplos clientes na mesma instância?",
    answer:
      "Sim — isolamento multi-tenant é garantido no nível do banco de dados, não apenas por convenção de código na aplicação.",
  },
];

export function LandingPage() {
  const { brand } = useTheme();

  return (
    <div style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header
        className="no-print sticky top-0 z-20 flex items-center justify-between px-6 py-4 backdrop-blur sm:px-10"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-bg) 85%, transparent)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {brand.productName.charAt(0)}
          </div>
          <span className="text-sm font-semibold">{brand.productName}</span>
        </div>
        <nav
          className="hidden items-center gap-6 text-sm sm:flex"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Seções da página"
        >
          <a href="#como-funciona" className="transition-opacity hover:opacity-80">
            Como funciona
          </a>
          <a href="#diferenciais" className="transition-opacity hover:opacity-80">
            Diferenciais
          </a>
          <a href="#seguranca" className="transition-opacity hover:opacity-80">
            Segurança
          </a>
          <a href="#faq" className="transition-opacity hover:opacity-80">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link to="/cadastro">
            <Button size="sm">Criar conta</Button>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-0 -z-10 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 70%)",
          }}
        />
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <span
              className="mb-5 inline-block rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                color: "var(--color-primary)",
              }}
            >
              Inteligência de crédito & recuperação — enterprise
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Decisões de crédito e cobrança que você consegue{" "}
              <span style={{ color: "var(--color-primary)" }}>explicar</span>
            </h1>
            <p className="mt-5 max-w-xl text-base" style={{ color: "var(--color-text-muted)" }}>
              Consulta, classificação de risco, recomendação de cobrança e gestão do ciclo completo
              de recuperação — com cada decisão rastreável até a fonte, o fator e o motivo, e cada
              dado versionado e auditado desde a origem.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/cadastro">
                <Button>Começar agora</Button>
              </Link>
              <a href="/api/v1/docs" target="_blank" rel="noreferrer">
                <Button variant="secondary">Ver documentação da API</Button>
              </a>
            </div>
          </div>

          <div className="animate-scale-in stagger-1">
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="border-y py-10" style={{ borderColor: "var(--color-border)" }}>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4 sm:px-10">
          <CountUpStat value={21} label="Módulos de negócio" delayMs={0} />
          <CountUpStat value={500} suffix="+" label="Testes automatizados" delayMs={100} />
          <CountUpStat value={80} suffix="+" label="Endpoints documentados" delayMs={200} />
          <CountUpStat value={100} suffix="%" label="Decisões explicáveis" delayMs={300} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
        <p
          className="text-center text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--color-text-subtle)" }}
        >
          Construído sobre uma stack madura e amplamente adotada
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="cursor-default rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <SectionHeading
          eyebrow="Como funciona"
          title="Da consulta à decisão auditável, em quatro etapas"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item, index) => (
            <div
              key={item.step}
              className={`animate-fade-in stagger-${index + 1} relative rounded-[var(--radius-lg)] border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]`}
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-elevated)",
              }}
            >
              <span
                className="text-3xl font-bold"
                style={{ color: "color-mix(in srgb, var(--color-primary) 30%, transparent)" }}
              >
                {item.step}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="diferenciais" className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <SectionHeading
          eyebrow="Diferenciais"
          title="Tudo que uma solução tradicional trata como extra, aqui é nativo"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFERENTIALS.map((item, index) => (
            <Card
              key={item.title}
              interactive
              className={`animate-fade-in stagger-${(index % 4) + 1} p-6`}
            >
              <span className="inline-block text-2xl transition-transform duration-200 group-hover:scale-125">
                {item.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="seguranca"
        className="border-y py-20"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-muted)" }}
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <SectionHeading
            eyebrow="Segurança"
            title="Segurança tratada como arquitetura, não como checklist"
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SecurityItem
              icon="🔐"
              title="Argon2id + rotação de tokens"
              description="Hash de senha memory-hard, refresh token opaco com rotação e detecção de reuso — uma sessão roubada é detectada, não silenciosamente aceita."
            />
            <SecurityItem
              icon="🚦"
              title="Rate limiting em camadas"
              description="Limite por rota e por identificador (e-mail + IP), independente do bloqueio de conta por falhas consecutivas — duas defesas complementares contra força bruta."
            />
            <SecurityItem
              icon="🕵️"
              title="Anti-enumeração"
              description="Login e recuperação de senha respondem sempre com a mesma mensagem genérica, exista ou não a conta — a diferenciação fica só na auditoria interna."
            />
            <SecurityItem
              icon="🍪"
              title="Cookies HttpOnly + SameSite"
              description="Refresh token nunca é acessível via JavaScript; access token vive só em memória no navegador, nunca em localStorage."
            />
            <SecurityItem
              icon="📜"
              title="Auditoria append-only"
              description="Login, cadastro, troca de senha, reset e cada tentativa inválida geram um evento de auditoria imutável, correlacionável por usuário e IP."
            />
            <SecurityItem
              icon="🏷️"
              title="Mascaramento por padrão"
              description="CPF/CNPJ nunca aparecem completos em logs, testes ou respostas de importação — LGPD por construção."
            />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
        <SectionHeading
          eyebrow="Perguntas frequentes"
          title="O que mais perguntam antes de decidir"
        />
        <div className="mt-10">
          <Accordion items={FAQ_ITEMS} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center sm:px-10">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Pronto para decisões que você consegue defender?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--color-text-muted)" }}>
          Crie uma conta corporativa e comece a explorar o dashboard executivo em minutos.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/cadastro">
            <Button>Criar conta</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Já tenho conta</Button>
          </Link>
        </div>
      </section>

      <footer
        className="no-print border-t px-6 py-12 text-sm sm:px-10"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold text-white"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {brand.productName.charAt(0)}
              </div>
              <span className="font-semibold">{brand.productName}</span>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--color-text-subtle)" }}>
              Inteligência de crédito e recuperação com decisões explicáveis, auditadas e
              versionadas desde a origem.
            </p>
          </div>

          <FooterColumn
            title="Produto"
            links={[
              { label: "Como funciona", href: "#como-funciona" },
              { label: "Diferenciais", href: "#diferenciais" },
              { label: "Segurança", href: "#seguranca" },
            ]}
          />
          <FooterColumn
            title="Recursos"
            links={[
              { label: "Documentação da API", href: "/api/v1/docs" },
              { label: "FAQ", href: "#faq" },
            ]}
          />
          <FooterColumn
            title="Conta"
            links={[
              { label: "Entrar", href: "/login" },
              { label: "Criar conta", href: "/cadastro" },
            ]}
          />
        </div>
        <div
          className="mx-auto mt-10 max-w-6xl border-t pt-6 text-xs"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
        >
          © {new Date().getFullYear()} {brand.productName}
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-primary)" }}
      >
        {eyebrow}
      </span>
      <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-bold sm:text-3xl">{title}</h2>
    </div>
  );
}

function SecurityItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="group rounded-[var(--radius-lg)] border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-elevated)" }}
    >
      <span className="inline-block text-xl transition-transform duration-200 group-hover:scale-125">
        {icon}
      </span>
      <h3 className="mt-2.5 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-subtle)" }}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--color-text-muted)" }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mockup ilustrativo do dashboard, feito só com os tokens de design do próprio sistema — nunca uma captura de tela real (que ficaria desatualizada a cada mudança de UI). */
function DashboardMockup() {
  const bars = [42, 68, 55, 80, 62, 90, 74];

  return (
    <div
      className="rounded-[var(--radius-lg)] border shadow-2xl"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-elevated)" }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-4 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "var(--color-danger)" }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "var(--color-warning)" }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "var(--color-success)" }}
        />
        <span className="ml-3 text-xs" style={{ color: "var(--color-text-subtle)" }}>
          Dashboard executivo
        </span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Dossiês", value: "12.480" },
            { label: "Score médio", value: "38.2" },
            { label: "Confiança", value: "94%" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[var(--radius-md)] border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-[10px] uppercase" style={{ color: "var(--color-text-subtle)" }}>
                {kpi.label}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div
          className="mt-4 flex h-28 items-end gap-2 rounded-[var(--radius-md)] border p-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${height}%`,
                backgroundColor:
                  index === bars.length - 2
                    ? "var(--color-primary)"
                    : "color-mix(in srgb, var(--color-primary) 35%, transparent)",
              }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {["Baixo risco", "Médio risco", "Alto risco"].map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-20 text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
                {label}
              </span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--color-bg-muted)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: ["70%", "22%", "8%"][index],
                    backgroundColor: [
                      "var(--color-success)",
                      "var(--color-warning)",
                      "var(--color-danger)",
                    ][index],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
