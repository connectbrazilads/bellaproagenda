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
import LandingBrandLogo from '../components/LandingBrandLogo';
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
    eyebrow: 'Agenda Inteligente',
    title: 'Atendimento, checkout e agenda integrados',
    text: 'Sua recepção ganha velocidade máxima. Agende serviços, adicione produtos extras e receba o faturamento sem alternar de tela.',
  },
  {
    icon: Wallet,
    eyebrow: 'Caixa por Turno',
    title: 'Fechamento blindado e sangria auditável',
    text: 'Acabe com as diferenças inexplicáveis de caixa no final do dia. Cada operador abre e fecha seu turno com validação de saldo.',
  },
  {
    icon: Users,
    eyebrow: 'Controle de Acessos',
    title: 'Logins protegidos com permissões restritas',
    text: 'Proteja seus dados financeiros. Profissionais acessam apenas suas próprias agendas, enquanto você mantém o controle total.',
  },
  {
    icon: MessageSquare,
    eyebrow: 'Fidelização Ativa',
    title: 'Lembretes automáticos anti-esquecimento',
    text: 'Reduza em até 35% o não-comparecimento enviando confirmações de horário inteligentes e lembretes amigáveis de retorno.',
  },
];

const statCards = [
  { label: 'Redução de Custos', value: 'Evite agendamentos perdidos e duplicações de horários' },
  { label: 'Caixa Protegido', value: 'Histórico auditável de todas as movimentações e sangrias por turno' },
  { label: 'Agilidade B2B', value: 'Fluxo integrado que reduz o tempo de recepção de 5 para 1 minuto' },
];

const flowSteps = [
  {
    title: 'Recepção Inicia com Clareza',
    text: 'Abertura rápida do caixa por turno, visualização limpa da agenda de cada profissional e triagem dos atendimentos programados.',
  },
  {
    title: 'Execução e Checkout Fluido',
    text: 'Lançamento de comissões, vendas de produtos e encerramento da conta diretamente no card do agendamento, sem atritos.',
  },
  {
    title: 'Auditoria de Resultados',
    text: 'Relatórios de fechamento automáticos, conciliação de faturamento e extrato de comissões atualizados em tempo real.',
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
    cta: 'Escolher Pro',
  },
];

const objections = [
  {
    question: '“Meu salão ainda é pequeno. Vale a pena contratar?”',
    answer: 'Vale justamente para crescer de forma organizada. Quanto antes você estrutura sua agenda, caixa e equipe, mais fácil fica escalar o negócio sem retrabalho ou falhas de controle.',
  },
  {
    question: '“Tenho receio de complicar a rotina da recepção.”',
    answer: 'Nossa interface foi desenhada focando em extrema usabilidade. Concentramos o que antes ficava espalhado no WhatsApp e no papel em um fluxo direto e de aprendizado imediato.',
  },
  {
    question: '“Consigo restringir o que os profissionais visualizam?”',
    answer: 'Sim, o sistema possui controle fino de permissões. Cada profissional visualiza estritamente suas próprias tarefas e clientes, enquanto o administrador retém a visão gerencial completa.',
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
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0c0a0e]">
        <div className="glow-orb absolute left-[-10%] top-[-4%] h-[40rem] w-[40rem] bg-[#e29ba8]" />
        <div className="glow-orb absolute bottom-[-14%] right-[-8%] h-[35rem] w-[35rem] bg-[#f7c1b6]" style={{ animationDelay: '-7s' }} />
        <div className="glow-orb absolute top-[40%] left-[50%] h-[30rem] w-[30rem] bg-[#c2737f]" style={{ animationDelay: '-14s', opacity: 0.15 }} />
        <div className="grid-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131117]/80 via-[#0c0a0e]/95 to-[#050406]" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#120f16bb]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <LandingBrandLogo />

          <div className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[0.22em] text-white/48 lg:flex">
            <button onClick={() => scrollToSection('beneficios')} className="transition hover:text-white">Benefícios</button>
            <button onClick={() => scrollToSection('operacao')} className="transition hover:text-white">Operação</button>
            <button onClick={() => scrollToSection('planos')} className="transition hover:text-white">Planos</button>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="hidden text-[11px] font-bold uppercase tracking-[0.22em] text-white/58 transition hover:text-white sm:inline-flex">
              Entrar
            </Link>
            <Link
              to="/signup"
              className="premium-btn-primary inline-flex items-center justify-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.22em]"
            >
              Criar unidade
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-10 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
          <motion.div initial="hidden" animate="visible" variants={reveal} className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e29ba822] bg-white/[0.03] px-5 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#efb1bb] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-[#e29ba8]" />
              A plataforma definitiva de gestão para salões
            </div>

            <div className="space-y-5">
              <p className="brand-kicker">BellaPro Agenda</p>
              <h1 className="max-w-4xl font-brand-display text-5xl leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl xl:text-[4.75rem]">A gestão que seu salão merece. <span className="brand-text-gradient block mt-2">A segurança que o seu caixa precisa.</span></h1>
              <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">BellaPro conecta sua recepção, controle de caixa por turno e permissões de equipe em uma interface elegante e à prova de falhas. Pare de perder dinheiro com agendamentos perdidos ou faturamento no achismo.</p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="premium-btn-primary inline-flex items-center justify-center gap-3 px-8 py-5 text-[11px] font-bold uppercase tracking-[0.24em]"
              >
                Começar Grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => scrollToSection('beneficios')}
                className="premium-btn-secondary inline-flex items-center justify-center px-8 py-5 text-[11px] font-bold uppercase tracking-[0.24em]"
              >
                Ver Demonstração
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {statCards.map((item) => (
                <div key={item.label} className="glass-card-premium rounded-[1.8rem] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#efb1bb]">{item.label}</p>
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
            <div className="absolute -inset-4 rounded-[2.6rem] bg-[radial-gradient(circle_at_top,rgba(226,155,168,0.18),transparent_54%)] blur-2xl pointer-events-none" />
            <div className="brand-panel-dark relative overflow-hidden rounded-[2.6rem] p-5 sm:p-6 border border-white/5 shadow-2xl">
              <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <p className="brand-kicker text-[#efb1bb]">Preview do Painel</p>
                    <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
                      Recepção ágil, faturamento seguro
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e29ba81a] bg-[#e29ba80d] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f3bbc4]">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#efb1bb]" />
                    Operação Controlada
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <PanelCard eyebrow="Agenda Consolidada" title="Controle de Horários Rápido">
                    <div className="space-y-3">
                      <SoftRow icon={CalendarDays} label="09:00 - 10:20" value="Coloração Premium + Corte" />
                      <SoftRow icon={Bell} label="10:40 - 11:10" value="Lembrete enviado (WhatsApp)" />
                      <SoftRow icon={Users} label="11:20 - 12:10" value="Avaliação de Retorno VIP" />
                    </div>
                  </PanelCard>

                  <PanelCard eyebrow="Faturamento por Turno" title="Fechamento de Caixa Sem Furos">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricTile label="Inicial" value="R$ 150,00" />
                      <MetricTile label="Total Cartões" value="R$ 1.280,00" />
                      <MetricTile label="Total Dinheiro" value="R$ 620,00" />
                      <MetricTile label="Diferença Auditada" value="R$ 0,00" highlight />
                    </div>
                  </PanelCard>

                  <PanelCard eyebrow="Módulos Integrados" title="Tudo Conectado no Fluxo">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <MiniFeature icon={Star} title="Clientes" text="Histórico de preferência e notas de atendimento." />
                      <MiniFeature icon={CreditCard} title="Checkout" text="Lançamento e divisão de comissão em segundos." />
                      <MiniFeature icon={Lock} title="Segurança" text="Níveis de acesso dedicados para cada login." />
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
            title="Quando a operação fica solta, o salão perde tempo e margem."
            text="Agenda no caderno, caixa em planilhas, confirmação manual e equipe sem regras de acesso. BellaPro Agenda unifica sua recepção e seu controle financeiro para você focar no crescimento."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card-premium rounded-[2rem] p-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/5 bg-white/[0.04]">
                  <item.icon className="h-6 w-6 text-[#efb1bb]" />
                </div>
                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-[#efb1bb]">{item.eyebrow}</p>
                <h3 className="mt-3 font-brand-display text-2xl leading-tight text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="operacao" className="border-y border-white/5 bg-white/[0.01] px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={reveal}>
            <SectionHeader
              eyebrow="Operação Real"
              title="Do agendamento ao fechamento, tudo em fluxo contínuo."
              text="Substitua a desorganização operacional por um processo padronizado que transmite confiança aos clientes e garante controle total do caixa."
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
                className="glass-card-premium rounded-[2rem] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#e29ba816] text-sm font-bold text-[#efb1bb]">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{step.text}</p>
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
            eyebrow="Resultados Reais"
            title="Quem organiza a operação fatura mais e reduz desperdícios."
            text="Veja como a unificação do fluxo de agendamentos traz clareza para a tomada de decisões e reduz drasticamente as falhas administrativas."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {socialProof.map((item, index) => (
              <motion.div
                key={item.author}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card-premium rounded-[2rem] p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 text-white/[0.02] font-serif text-8xl pointer-events-none">“</div>
                <p className="text-base leading-relaxed text-white/80">“{item.quote}”</p>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#efb1bb]">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-y border-white/5 bg-white/[0.01] px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Planos & Preços"
            title="Escolha o plano ideal e evolua conforme o crescimento do salão."
            text="Sem taxas surpresas ou custos de implantação. Comece de forma simples e adicione recursos conforme sua equipe e faturamento expandirem."
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
            eyebrow="Respostas Rápidas"
            title="Dúvidas que costumam surgir ao migrar de sistema."
            text="Fale com a nossa equipe caso sua dúvida não esteja respondida abaixo. Nós ajudamos a migrar sua base de dados atual sem fricção."
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {objections.map((item) => (
              <motion.div
                key={item.question}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={reveal}
                className="glass-card-premium rounded-[1.8rem] p-6"
              >
                <h3 className="font-brand-display text-2xl text-white leading-snug">{item.question}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/60">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl rounded-[2.6rem] border border-white/5 bg-gradient-to-b from-[#201a22]/70 to-[#0f0c13]/90 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-12 relative overflow-hidden">
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#e29ba8] opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#f7c1b6] opacity-10 blur-3xl pointer-events-none" />
          <p className="brand-kicker text-[#efb1bb]">BellaPro Agenda</p>
          <h2 className="mt-4 font-brand-display text-4xl leading-tight text-white sm:text-5xl">
            Pare de perder dinheiro no descontrole operacional.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg">
            A BellaPro Agenda centraliza sua gestão financeira, comissões de profissionais e checkout de recepção em um cockpit sofisticado e simples de usar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="premium-btn-primary inline-flex items-center justify-center gap-3 px-8 py-5 text-[11px] font-bold uppercase tracking-[0.24em]"
            >
              Começar Agora
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/signup"
              className="premium-btn-secondary inline-flex items-center justify-center gap-3 px-8 py-5 text-[11px] font-bold uppercase tracking-[0.24em]"
            >
              Falar com Consultor
              <ArrowRight className="h-4 w-4" />
            </Link>
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
    <div className={cn('rounded-[1.8rem] border border-white/5 bg-[#17131db3] p-5 backdrop-blur-md', className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#efb1bb]">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-white">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SoftRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.2rem] border border-white/5 bg-white/[0.02] px-4 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e29ba814]">
        <Icon className="h-4.5 w-4.5 text-[#efb1bb]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{label}</p>
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
        highlight ? 'border-[#e29ba822] bg-[#e29ba80d]' : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40 sm:text-[10px] sm:tracking-[0.18em]">{label}</p>
      <div className={cn('mt-3 font-bold leading-[0.92] tracking-[-0.04em]', highlight ? 'text-[#f0bac0]' : 'text-white')}>
        {currency ? <span className="block text-base sm:text-lg">{currency}</span> : null}
        <span className={cn('block break-keep', currency ? 'mt-1 text-[1.45rem] sm:text-[1.7rem]' : 'text-lg sm:text-[1.45rem]')}>{amount}</span>
      </div>
    </div>
  );
}

function MiniFeature({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[1.3rem] border border-white/5 bg-white/[0.02] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Icon className="h-4.5 w-4.5 text-[#efb1bb]" />
      </div>
      <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-white/82">{title}</p>
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
        'relative flex h-full flex-col rounded-[2.2rem] p-6 sm:p-8 glass-card-premium border',
        featured
          ? 'pricing-premium-card'
          : 'border-white/5'
      )}
    >
      {featured && (
        <div className="absolute right-6 top-6 rounded-full border border-[#e29ba834] bg-[#e29ba814] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f0bac0]">
          Mais pedido
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#efb1bb]">Plano {name}</p>
      <div className="mt-5 flex items-end gap-2">
        <span className="text-5xl font-bold tracking-[-0.05em] text-white">{`R$ ${price}`}</span>
        <span className="pb-2 text-sm font-semibold text-white/38">/mês</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{description}</p>

      <div className="mt-8 flex-1 space-y-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#efb1bb]" />
            <span className="text-sm text-white/70">{feature}</span>
          </div>
        ))}
      </div>

      <Link
        to="/signup"
        className={cn(
          'mt-8 inline-flex items-center justify-center rounded-[1.5rem] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.22em] transition',
          featured ? 'premium-btn-primary' : 'premium-btn-secondary'
        )}
      >
        {cta}
      </Link>
    </motion.div>
  );
}
