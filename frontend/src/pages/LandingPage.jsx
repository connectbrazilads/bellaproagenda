import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Lock,
  MessageSquare,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { cn } from '../lib/utils';

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const featureCards = [
  {
    icon: CalendarDays,
    eyebrow: 'Agenda viva',
    title: 'Atendimento, agenda e checkout no mesmo fluxo',
    text: 'Sua recepção ganha velocidade para encaixar, atender e cobrar sem se perder entre telas, papéis e recados.',
  },
  {
    icon: Wallet,
    eyebrow: 'Caixa por turno',
    title: 'Abertura, sangria e fechamento com rastreio real',
    text: 'Você deixa de fechar no achismo e passa a conferir o caixa com mais segurança no fim do dia.',
  },
  {
    icon: Users,
    eyebrow: 'Equipe protegida',
    title: 'Cada login vê apenas o que precisa operar',
    text: 'Menos acesso indevido, menos erro e mais controle sobre o que cada pessoa pode fazer dentro do salão.',
  },
  {
    icon: MessageSquare,
    eyebrow: 'Relacionamento',
    title: 'Mensagens, lembretes e retorno em uma linguagem só',
    text: 'Confirme horários, reduza faltas e puxe o retorno de clientes sem depender de improviso.',
  },
];

const statCards = [
  { label: 'Mais clareza', value: 'Saiba o que entra, o que sai e o que precisa acontecer no dia' },
  { label: 'Mais controle', value: 'Equipe, acessos e caixa funcionando com menos erro operacional' },
  { label: 'Mais resultado', value: 'Menos agenda vazia e mais capacidade para vender melhor' },
];

const flowSteps = [
  {
    title: 'Recepção abre o dia',
    text: 'O turno começa com fundo inicial, agenda organizada e visão objetiva do que precisa acontecer.',
  },
  {
    title: 'Atendimento acontece sem fricção',
    text: 'Serviço, produto extra, observações e pagamento entram no mesmo caminho operacional.',
  },
  {
    title: 'Gestão confere com segurança',
    text: 'Fechamento, diferença e histórico deixam o dia auditável sem depender de memória.',
  },
];

const plans = [
  {
    name: 'Start',
    price: '79,90',
    description: 'Para autônomas e operações enxutas que precisam parar de improvisar sem pesar no caixa.',
    features: ['Agenda online', 'Cadastro de clientes', 'Serviços e pacotes', 'Checkout simples'],
    cta: 'Começar no Start',
  },
  {
    name: 'Equipe',
    price: '149,90',
    featured: true,
    description: 'Para salões com recepção e equipe pequena que precisam de mais controle no dia a dia.',
    features: ['Até 3 profissionais', 'Caixa por turno', 'Permissões por login', 'Relatórios principais'],
    cta: 'Escolher Equipe',
  },
  {
    name: 'Pro',
    price: '249,90',
    description: 'Para operações em crescimento que precisam de auditoria, histórico e gestão mais madura.',
    features: ['Até 10 profissionais', 'Auditoria operacional', 'Backup e histórico', 'Base de conhecimento'],
    cta: 'Ir para o Pro',
  },
];

const objections = [
  {
    question: '“Meu salão ainda é pequeno. Será que já vale contratar?”',
    answer: 'Vale justamente para não crescer no improviso. Quanto antes você organiza agenda, caixa e equipe, menos retrabalho carrega para frente.',
  },
  {
    question: '“Tenho receio de complicar a rotina da recepção.”',
    answer: 'A proposta é o contrário: concentrar o que hoje está espalhado e deixar o atendimento mais rápido, claro e fácil de conferir.',
  },
  {
    question: '“Preciso controlar melhor o que cada profissional acessa.”',
    answer: 'A plataforma já trabalha com perfis, permissões e escopo por profissional, trazendo mais segurança para a operação.',
  },
];

const socialProof = [
  {
    quote: 'A recepção parou de se perder entre agenda, cobrança e confirmação. O dia ficou muito mais organizado.',
    author: 'Mariana, gestora',
  },
  {
    quote: 'O fechamento de caixa por turno tirou muita insegurança da operação. Hoje a conferência é objetiva.',
    author: 'Camila, proprietária',
  },
  {
    quote: 'O que mais pesou para fechar foi o controle de acessos. Cada profissional vê só o que precisa.',
    author: 'Juliana, administrativa',
  },
];

export default function LandingPage() {
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="brand-page-dark overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-4%] h-[30rem] w-[30rem] rounded-full bg-[#e29ba820] blur-[160px]" />
        <div className="absolute bottom-[-14%] right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#f7c1b61a] blur-[170px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1d1920_0%,#141218_45%,#100f14_100%)]" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#18141bcc]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo compact variant="darkBg" />

          <div className="hidden items-center gap-8 text-[11px] font-black uppercase tracking-[0.24em] text-white/48 lg:flex">
            <button onClick={() => scrollToSection('beneficios')} className="transition hover:text-white">Benefícios</button>
            <button onClick={() => scrollToSection('operacao')} className="transition hover:text-white">Operação</button>
            <button onClick={() => scrollToSection('planos')} className="transition hover:text-white">Planos</button>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="hidden text-[11px] font-black uppercase tracking-[0.24em] text-white/58 transition hover:text-white sm:inline-flex">
              Entrar
            </Link>
            <Link
              to="/signup"
              className="brand-button-primary inline-flex items-center justify-center rounded-[1.35rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em]"
            >
              Criar unidade
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
          <motion.div initial="hidden" animate="visible" variants={reveal} className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e29ba830] bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#efb1bb]">
              <Sparkles className="h-3.5 w-3.5" />
              Sistema para salões que querem crescer com mais controle
            </div>

            <div className="space-y-5">
              <p className="brand-kicker">BellaPro Agenda</p>
              <h1 className="max-w-4xl font-brand-display text-5xl leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl xl:text-7xl">
                Pare de perder dinheiro no improviso.
                <span className="brand-text-gradient block">Organize agenda, caixa e equipe em um só lugar.</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-white/66 sm:text-lg">
                Se seu salão ainda depende de conversa no WhatsApp, anotação solta e conferência manual, a operação fica lenta, falha e cara. A BellaPro Agenda centraliza o que mais pesa na rotina para você vender melhor e controlar mais.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="brand-button-primary inline-flex items-center justify-center gap-3 rounded-[1.7rem] px-8 py-5 text-[11px] font-black uppercase tracking-[0.28em]"
              >
                Testar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => scrollToSection('beneficios')}
                className="inline-flex items-center justify-center rounded-[1.7rem] border border-white/12 bg-white/[0.04] px-8 py-5 text-[11px] font-black uppercase tracking-[0.26em] text-white/82 transition hover:bg-white/[0.08]"
              >
                Ver como funciona
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {statCards.map((item) => (
                <div key={item.label} className="rounded-[1.8rem] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#efb1bb]">{item.label}</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/72">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2.6rem] bg-[radial-gradient(circle_at_top,rgba(226,155,168,0.24),transparent_54%)] blur-2xl" />
            <div className="brand-panel-dark relative overflow-hidden rounded-[2.6rem] p-5 sm:p-6">
              <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
                  <div>
                    <p className="brand-kicker">Preview da experiência</p>
                    <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight tracking-tight text-white sm:text-[2rem]">
                      Recepção mais ágil, caixa mais claro, operação mais forte
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e29ba834] bg-[#e29ba814] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#f3bbc4]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Menos retrabalho ao longo do dia
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <PanelCard eyebrow="Agenda do dia" title="Recepção com leitura rápida">
                    <div className="space-y-3">
                      <SoftRow icon={CalendarDays} label="09:00 - 10:20" value="Coloração + corte" />
                      <SoftRow icon={Bell} label="10:40 - 11:10" value="Confirmação pendente" />
                      <SoftRow icon={Users} label="11:20 - 12:10" value="Retorno de cliente VIP" />
                    </div>
                  </PanelCard>

                  <PanelCard eyebrow="Fechamento" title="Caixa mais confiável">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricTile label="Inicial" value="R$ 150" />
                      <MetricTile label="Esperado" value="R$ 1.280" />
                      <MetricTile label="Dinheiro" value="R$ 620" />
                      <MetricTile label="Diferença" value="R$ 0,00" highlight />
                    </div>
                  </PanelCard>

                  <PanelCard eyebrow="Checkout vivo" title="Serviço e pagamento juntos">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <MiniFeature icon={Star} title="Cliente" text="Histórico e observações sem bagunçar a leitura visual." />
                      <MiniFeature icon={CreditCard} title="Pagamento" text="Checkout direto no fluxo do atendimento." />
                      <MiniFeature icon={Lock} title="Controle" text="Ação protegida por perfil e responsabilidade." />
                    </div>
                  </PanelCard>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="beneficios" className="px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Por que BellaPro"
            title="Quando a operação fica espalhada, o salão perde tempo, dinheiro e controle."
            text="Agenda em um lugar, caixa em outro, confirmação no WhatsApp e equipe sem regra clara. A BellaPro Agenda junta o que realmente importa para você parar de apagar incêndio o dia inteiro."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/8 bg-white/[0.05]">
                  <item.icon className="h-6 w-6 text-[#efb1bb]" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-[#efb1bb]">{item.eyebrow}</p>
                <h3 className="mt-3 font-brand-display text-2xl leading-tight text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/62">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="operacao" className="border-y border-white/8 bg-white/[0.02] px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}>
            <SectionHeader
              eyebrow="Operação real"
              title="Do primeiro atendimento ao fechamento do caixa, tudo fica mais fácil de controlar."
              text="A plataforma entra onde o salão mais sofre: agenda desorganizada, cobrança falha, equipe sem processo e fechamento sem confiança."
            />
          </motion.div>

          <div className="grid gap-4">
            {flowSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[2rem] border border-white/8 bg-[#201a22]/82 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#e29ba816] text-sm font-black text-[#efb1bb]">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/62">{step.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Resultados na prática"
            title="Quem organiza a operação primeiro, cresce com menos desgaste depois."
            text="A decisão de contratar um sistema não é só sobre agenda. É sobre reduzir erro, melhorar atendimento e ganhar fôlego para vender com mais consistência."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {socialProof.map((item, index) => (
              <motion.div
                key={item.author}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-6"
              >
                <p className="text-base leading-relaxed text-white/78">“{item.quote}”</p>
                <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#efb1bb]">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-y border-white/8 bg-white/[0.02] px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Planos"
            title="Comece com o plano certo e evolua conforme seu salão cresce."
            text="Você não precisa contratar estrutura demais para sair do improviso. Entre no plano ideal para o seu momento e aumente o controle conforme a operação avança."
          />

          <div className="mt-12 grid gap-6 xl:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Objeções que travam a decisão"
            title="Se você está avaliando a troca, estas são as dúvidas que mais pesam antes de fechar."
            text="Respondemos o que normalmente impede a contratação de um sistema, para você decidir com mais clareza e menos receio."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {objections.map((item) => (
              <motion.div
                key={item.question}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reveal}
                className="rounded-[1.8rem] border border-white/8 bg-white/[0.04] p-6"
              >
                <h3 className="font-brand-display text-2xl text-white">{item.question}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/62">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl rounded-[2.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(226,155,168,0.18),rgba(247,193,182,0.10),rgba(255,255,255,0.04))] p-8 text-center shadow-[0_40px_120px_-48px_rgba(0,0,0,0.88)] backdrop-blur-2xl sm:p-12">
          <p className="brand-kicker text-[#f0bac0]">BellaPro Agenda</p>
          <h2 className="mt-4 font-brand-display text-4xl leading-tight text-white sm:text-5xl">
            Quanto mais você demora para organizar a operação, mais dinheiro escapa no dia a dia.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/68 sm:text-lg">
            A BellaPro Agenda foi criada para salões que querem parar de improvisar agenda, caixa, equipe e atendimento e começar a operar com mais venda, mais controle e menos desgaste.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="brand-button-primary inline-flex items-center justify-center gap-3 rounded-[1.6rem] px-8 py-5 text-[11px] font-black uppercase tracking-[0.24em]"
            >
              Começar com BellaPro
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-3 rounded-[1.6rem] border border-white/14 bg-white/[0.05] px-8 py-5 text-[11px] font-black uppercase tracking-[0.24em] text-white/88 transition hover:bg-white/[0.1]"
            >
              Agendar demonstração
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal} className="max-w-3xl">
      <p className="brand-kicker text-[#efb1bb]">{eyebrow}</p>
      <h2 className="mt-4 font-brand-display text-4xl leading-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-relaxed text-white/66 sm:text-lg">{text}</p>
    </motion.div>
  );
}

function PanelCard({ eyebrow, title, children, className = '' }) {
  return (
    <div className={cn('rounded-[1.8rem] border border-white/8 bg-[#1a161d]/78 p-5', className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#efb1bb]">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-black tracking-tight text-white">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SoftRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e29ba814]">
        <Icon className="h-4.5 w-4.5 text-[#efb1bb]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{label}</p>
        <p className="mt-1 truncate text-sm text-white/76">{value}</p>
      </div>
    </div>
  );
}

function MetricTile({ label, value, highlight = false }) {
  const [currency, amount] = value.startsWith('R$ ') ? ['R$', value.replace('R$ ', '')] : [null, value];

  return (
    <div
      className={cn(
        'min-w-0 rounded-[1.2rem] border p-4 sm:p-5',
        highlight ? 'border-[#e29ba834] bg-[#e29ba814]' : 'border-white/8 bg-white/[0.04]'
      )}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/40 sm:text-[10px] sm:tracking-[0.24em]">{label}</p>
      <div className={cn('mt-3 font-black leading-none tracking-tight', highlight ? 'text-[#f0bac0]' : 'text-white')}>
        {currency ? <span className="block text-lg sm:text-xl">{currency}</span> : null}
        <span className={cn('block', currency ? 'mt-1 text-[1.75rem] sm:text-[2rem]' : 'text-xl sm:text-[1.75rem]')}>{amount}</span>
      </div>
    </div>
  );
}

function MiniFeature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.04] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Icon className="h-4.5 w-4.5 text-[#efb1bb]" />
      </div>
      <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white/82">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/56">{text}</p>
    </div>
  );
}

function PricingCard({ name, price, description, features, featured = false, cta }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex h-full flex-col rounded-[2.2rem] border p-6 sm:p-8',
        featured
          ? 'border-[#e29ba838] bg-[linear-gradient(180deg,#201a22_0%,#2a2028_100%)] shadow-[0_30px_70px_-36px_rgba(226,155,168,0.4)]'
          : 'border-white/8 bg-white/[0.03]'
      )}
    >
      {featured && (
        <div className="absolute right-6 top-6 rounded-full border border-[#e29ba834] bg-[#e29ba814] px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#f0bac0]">
          Mais pedido
        </div>
      )}

      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#efb1bb]">Plano {name}</p>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-5xl font-black tracking-[-0.06em] text-white">{`R$ ${price}`}</span>
        <span className="pb-2 text-sm font-semibold text-white/38">/mês</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{description}</p>

      <div className="mt-8 flex-1 space-y-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#efb1bb]" />
            <span className="text-sm text-white/78">{feature}</span>
          </div>
        ))}
      </div>

      <Link
        to="/signup"
        className={cn(
          'mt-8 inline-flex items-center justify-center rounded-[1.5rem] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] transition',
          featured ? 'brand-button-primary' : 'border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]'
        )}
      >
        {cta}
      </Link>
    </motion.div>
  );
}
