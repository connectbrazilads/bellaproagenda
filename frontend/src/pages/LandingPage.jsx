import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Gift,
  Globe,
  Lock,
  Menu,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import LandingBrandLogo from '../components/LandingBrandLogo';
import { cn } from '../lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const navLinks = [
  { label: 'Módulos', id: 'modulos' },
  { label: 'Comparativo', id: 'comparativo' },
  { label: 'Como funciona', id: 'fluxo' },
  { label: 'Planos e Preços', id: 'planos' },
  { label: 'Dúvidas', id: 'duvidas' },
];

const niches = [
  'Salões de Beleza',
  'Estúdios de Cabelo & Cor',
  'Esmalterias & Nail Designers',
  'Clínicas de Estética',
  'Barbearias Premium',
  'Spas & Design de Sobrancelhas',
];

const kpiHighlights = [
  {
    value: 'Até 70%',
    label: 'menos faltas na agenda',
    detail: 'Com confirmações e lembretes automáticos via WhatsApp.',
  },
  {
    value: '1 clique',
    label: 'comanda única multi-profissional',
    detail: 'Vários serviços de profissionais diferentes em um único checkout.',
  },
  {
    value: 'R$ 0,00',
    label: 'de furo no fechamento',
    detail: 'Caixa por turno com abertura, sangrias e conferência auditável.',
  },
  {
    value: '24 horas',
    label: 'agendamento online na bio',
    detail: 'Seus clientes reservam sozinhos pelo link exclusivo do salão.',
  },
];

const oldWayItems = [
  'Agenda espalhada em caderno, planilha e conversas perdidas no WhatsApp',
  'Clientes esquecem o horário e deixam cadeiras vazias sem aviso prévio',
  'Troca de turno com divergência no caixa e sem histórico de sangrias',
  'Cálculo manual de comissões gerando retrabalho e atrito com a equipe',
  'Todos os funcionários enxergando o faturamento completo do salão',
];

const bellaProWayItems = [
  'Agenda multi-profissional integrada ao link de agendamento 24h na bio',
  'Lembretes automáticos e atendente com IA respondendo clientes no WhatsApp',
  'Caixa blindado por turno com conferência de Pix, Cartão, Dinheiro e auditoria',
  'Comissões por serviço, metas mensais e bônus calculados automaticamente',
  'Permissões granulares: cada perfil acessa exatamente o que precisa',
];

const modules = [
  {
    id: 'agenda',
    label: 'Agenda & Link 24h',
    icon: CalendarDays,
    eyebrow: 'Recepção e Autoagendamento',
    title: 'Agenda organizada por profissional e link exclusivo na bio',
    description:
      'Dê autonomia para seus clientes agendarem a qualquer hora em bellaproagenda.com.br/seu-salao, enquanto sua recepção gerencia encaixes, bloqueios e lista de espera sem risco de horário duplicado.',
    bullets: [
      'Visão diária, semanal e mensal filtrada por profissional ou status',
      'Página pública personalizada com serviços, pacotes e horários reais',
      'Lista de espera e alertas instantâneos de novos agendamentos',
      'Bloqueios de agenda e reagendamento em poucos cliques',
    ],
  },
  {
    id: 'caixa',
    label: 'Caixa & Comanda',
    icon: Wallet,
    eyebrow: 'Financeiro Blindado',
    title: 'Caixa por turno sem furos e comanda única multi-profissional',
    description:
      'Se a cliente fez corte com a Ana e manicure com a Júlia no mesmo dia, o BellaPro agrupa tudo em uma única comanda de pagamento e separa as comissões de cada profissional automaticamente.',
    bullets: [
      'Abertura e fechamento de caixa por turno com validação de operador',
      'Registro auditável de sangrias, suprimentos e despesas do dia',
      'Checkout único para serviços, produtos extras e sessões de pacotes',
      'Relatórios de faturamento, fechamento diário e fluxo de caixa',
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp + IA',
    icon: Bot,
    eyebrow: 'Automação & Atendimento',
    title: 'Inbox centralizado com Inteligência Artificial treinada no seu salão',
    description:
      'Pare de perder clientes por demora no WhatsApp. O BellaPro responde dúvidas de preços, horários e políticas automaticamente usando sua Base de Conhecimento e envia lembretes que reduzem faltas.',
    bullets: [
      'Confirmações, lembretes e avisos de cancelamento automáticos',
      'Atendimento inteligente (IA Gemini) conectado ao WhatsApp do salão',
      'Inbox unificado com respostas rápidas diretamente no painel admin',
      'Campanhas de retorno e reativação para clientes inativos',
    ],
  },
  {
    id: 'equipe',
    label: 'Equipe & Permissões',
    icon: ShieldCheck,
    eyebrow: 'Governança & Remuneração',
    title: 'Comissões automáticas e acesso protegido por perfil de login',
    description:
      'Proteja o financeiro do seu salão. Defina exatamente o que recepcionistas, gestores e profissionais podem visualizar ou alterar, com extrato transparente de comissões e metas.',
    bullets: [
      'Perfis dedicados: Administrador, Gestor, Recepção e Profissional',
      'Permissões granulares por módulo e por ação dentro do painel',
      'Comissão personalizada por profissional ou por serviço executado',
      'Metas mensais com bônus, vales e fechamento de repasses pronto',
    ],
  },
  {
    id: 'fidelidade',
    label: 'Fidelidade & Estoque',
    icon: Gift,
    eyebrow: 'Recorrência & Margem',
    title: 'Fidelização por cashback ou pontos, pacotes e estoque integrado',
    description:
      'Aumente o ticket médio e faça suas clientes voltarem todos os meses com programas de fidelidade automáticos, venda de pacotes por sessões e controle de estoque ligado ao PDV.',
    bullets: [
      'Programa de fidelidade configurável em Cashback ou Pontos',
      'Controle automático de sessões restantes em pacotes vendidos',
      'Venda balcão (PDV) e baixa automática de produtos consumidos',
      'Histórico completo de visitas, preferências e gastos de cada cliente',
    ],
  },
];

const onboardingSteps = [
  {
    number: '01',
    title: 'Crie sua conta em 2 minutos',
    description:
      'Defina o nome do salão e já saia com seu link público de agendamento pronto para colocar no Instagram e WhatsApp.',
  },
  {
    number: '02',
    title: 'Configure equipe ou importe sua base',
    description:
      'Cadastre profissionais, serviços e comissões — ou use nossa ferramenta de migração para trazer sua lista de clientes sem começar do zero.',
  },
  {
    number: '03',
    title: 'Lote a agenda e blinde o caixa',
    description:
      'Ative os lembretes no WhatsApp, gerencie comandas em um clique e acompanhe o faturamento real turno a turno.',
  },
];

const plans = [
  {
    id: 'basic',
    name: 'Essencial',
    badge: 'Para começar organizado',
    monthlyPrice: 79,
    annualPrice: 63,
    annualSavings: 192,
    professionals: 'Até 2 profissionais',
    description:
      'Ideal para profissionais autônomos e estúdios enxutos que querem agenda online e gestão sem planilhas.',
    features: [
      'Agenda inteligente (diária, semanal e mensal)',
      'Link público de agendamento 24h na bio',
      'Cadastro completo de clientes e histórico',
      'Serviços, pacotes e checkout rápido',
      'Controle financeiro básico e despesas',
      'Suporte via chat e central de ajuda',
    ],
    cta: 'Testar Essencial grátis',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Profissional',
    badge: 'Mais escolhido',
    monthlyPrice: 149,
    annualPrice: 119,
    annualSavings: 360,
    professionals: 'Até 6 profissionais',
    description:
      'O plano completo para salões com recepção e equipe que precisam de caixa blindado, comissões e menos faltas.',
    features: [
      'Tudo do plano Essencial incluso',
      'Caixa por turno com sangrias e auditoria',
      'Comanda única multi-profissional',
      'Permissões granulares por login e perfil',
      'Comissões automáticas, metas e bônus',
      'Lembretes automáticos via WhatsApp',
      'Estoque, PDV e Fidelidade (Cashback/Pontos)',
      'Suporte prioritário no WhatsApp',
    ],
    cta: 'Começar no Profissional',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Elite IA',
    badge: 'Escala & Automação',
    monthlyPrice: 249,
    annualPrice: 199,
    annualSavings: 600,
    professionals: 'Até 15+ profissionais',
    description:
      'Para salões em forte expansão que querem atendimento automático com Inteligência Artificial e governança máxima.',
    features: [
      'Tudo do plano Profissional incluso',
      'Atendente com IA (Gemini) no WhatsApp 24h',
      'Inbox centralizado de WhatsApp no painel',
      'Base de conhecimento (FAQ, regras e promoções)',
      'Campanhas e IA proativa de retorno de clientes',
      'Trilha completa de auditoria e backup de dados',
      'Importação assistida de base + Onboarding VIP',
    ],
    cta: 'Testar Elite IA grátis',
    featured: false,
  },
];

const testimonials = [
  {
    result: '-65% em faltas',
    quote:
      'Antes nossa recepção passava a manhã inteira confirmando horário no WhatsApp. Com os lembretes automáticos e o link na bio, as faltas despencaram já no primeiro mês.',
    author: 'Mariana Alencar',
    role: 'Fundadora • Studio Alencar Hair',
  },
  {
    result: 'Caixa zerado em 2 min',
    quote:
      'O fechamento de caixa por turno mudou o clima do salão. Cada recepcionista abre e fecha seu turno com conferência de Pix, cartão e dinheiro. Acabou o achismo.',
    author: 'Camila Nogueira',
    role: 'Proprietária • Maison Nogueira Beleza',
  },
  {
    result: 'Comissões sem atrito',
    quote:
      'A comanda única multi-profissional com divisão automática de comissão economizou horas toda segunda-feira. Cada profissional acompanha só o que tem permissão.',
    author: 'Juliana Freitas',
    role: 'Gestora • Espaço Freitas Estética',
  },
];

const faqs = [
  {
    question: 'Preciso cadastrar cartão de crédito para testar por 7 dias?',
    answer:
      'Não. Você cria sua conta em 2 minutos, configura seu salão e testa o BellaPro gratuitamente por 7 dias sem informar cartão de crédito e sem cobrança automática surpresa.',
  },
  {
    question: 'O sistema funciona tanto no computador da recepção quanto no celular?',
    answer:
      'Sim. O BellaPro Agenda é 100% em nuvem e responsivo. Sua recepção pode operar no computador ou tablet enquanto você e os profissionais acompanham a agenda pelo celular.',
  },
  {
    question: 'Consigo limitar o que cada recepcionista ou profissional pode ver?',
    answer:
      'Sim. O controle de permissões é um dos pilares do BellaPro. Você define exatamente quais módulos e ações cada login pode acessar — profissionais veem apenas sua própria agenda e comissões.',
  },
  {
    question: 'Como funcionam os lembretes e a Inteligência Artificial no WhatsApp?',
    answer:
      'Você conecta o número de WhatsApp do salão direto nas configurações do painel. O sistema envia confirmações e lembretes automáticos de horário e, no plano Elite IA, responde dúvidas dos clientes 24h com base nas informações do seu salão.',
  },
  {
    question: 'Posso importar os clientes que já tenho em planilha ou outro sistema?',
    answer:
      'Sim. O painel já conta com um módulo de Migração para importar sua carteira de clientes com rapidez, e nossa equipe acompanha você no onboarding caso precise de ajuda.',
  },
  {
    question: 'Existe taxa de implantação ou multa de fidelidade?',
    answer:
      'Nenhuma taxa escondida. Não cobramos implantação nem exigimos fidelidade no plano mensal — você pode mudar de plano conforme sua equipe cresce ou cancelar quando quiser.',
  },
];

export default function LandingPage() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState('agenda');
  const [billingCycle, setBillingCycle] = useState('anual');
  const [openFaq, setOpenFaq] = useState(0);

  const activeModule = modules.find((item) => item.id === activeModuleId) || modules[0];

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [location.hash]);

  function scrollToSection(id) {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="editorial-light-page overflow-x-hidden selection:bg-[#c65d7b]/20 selection:text-[#23141c]">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#23141c]/10 bg-[#faf7f5]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0" aria-label="BellaPro Agenda - Início">
            <LandingBrandLogo variant="lightBg" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-[#5b4852] transition hover:text-[#23141c]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="editorial-btn-outline inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="editorial-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Testar 7 dias grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <Link
              to="/login"
              className="rounded-full border border-[#23141c]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#23141c]"
            >
              Entrar
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#23141c]/15 bg-white text-[#23141c]"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-[#23141c]/10 bg-[#faf7f5] lg:hidden"
            >
              <div className="space-y-2 px-4 py-5">
                {navLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#23141c] hover:bg-[#f2e6e9]"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="grid gap-2.5 pt-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="editorial-btn-outline flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
                  >
                    Entrar na minha conta
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="editorial-btn-primary flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
                  >
                    Começar 7 dias grátis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8">
        <div className="editorial-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(180deg,black,transparent_85%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c65d7b]/25 bg-white px-4 py-1.5 text-xs font-semibold text-[#9c3b57] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#c65d7b]" />
              Plataforma completa para salões, estúdios e clínicas de estética
            </div>

            <div className="space-y-5">
              <h1 className="font-brand-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-[#23141c] sm:text-5xl xl:text-[3.75rem]">
                A gestão que lota sua agenda.{' '}
                <span className="italic text-[#b84c6b]">
                  A segurança que blinda o seu caixa.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[#5b4852] sm:text-lg">
                Agendamento online 24h na bio, comanda única multi-profissional, fechamento de caixa por turno, comissões automáticas e atendimento com IA no WhatsApp — tudo pronto para o seu salão rodar no controle.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="editorial-btn-primary inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-4 text-sm font-bold"
              >
                Começar 7 dias grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('modulos')}
                className="editorial-btn-outline inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
              >
                Ver funções por dentro
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-1 text-xs font-medium text-[#6f5b65]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Sem cartão de crédito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Sem taxa de adesão
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Configure em 5 minutos
              </span>
            </div>
          </motion.div>

          {/* Realistic Product Showcase Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-[#e29ba8]/30 via-[#f7c1b6]/20 to-transparent blur-2xl" />

            {/* Main App Window */}
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#23141c]/15 bg-white shadow-[0_32px_80px_-28px_rgba(35,20,28,0.28)]">
              {/* Browser Chrome */}
              <div className="flex items-center justify-between border-b border-[#23141c]/10 bg-[#faf6f7] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e58e9e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f1c49f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#9ad1b0]" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#23141c]/10 bg-white px-3 py-1 text-[11px] font-medium text-[#6e5a64]">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  bellaproagenda.com.br/admin
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Turno Aberto
                </span>
              </div>

              {/* App Dashboard Body */}
              <div className="p-4 sm:p-5">
                {/* Summary KPI Row */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="rounded-2xl border border-[#23141c]/10 bg-[#fcf9fa] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c737f]">
                      Faturamento Hoje
                    </p>
                    <p className="mt-1 text-base font-extrabold text-[#23141c] sm:text-lg">
                      R$ 2.840,00
                    </p>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <TrendingUp className="h-3 w-3" /> +18% vs. ontem
                    </span>
                  </div>
                  <div className="rounded-2xl border border-[#23141c]/10 bg-[#fcf9fa] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8c737f]">
                      Agendamentos
                    </p>
                    <p className="mt-1 text-base font-extrabold text-[#23141c] sm:text-lg">
                      24 horários
                    </p>
                    <span className="mt-0.5 inline-block text-[10px] font-semibold text-[#b84c6b]">
                      96% confirmados
                    </span>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80">
                      Caixa do Turno
                    </p>
                    <p className="mt-1 text-base font-extrabold text-emerald-900 sm:text-lg">
                      R$ 0,00
                    </p>
                    <span className="mt-0.5 inline-block text-[10px] font-semibold text-emerald-700">
                      Diferença auditada
                    </span>
                  </div>
                </div>

                {/* Multi-Professional Schedule Preview */}
                <div className="mt-4 rounded-2xl border border-[#23141c]/10 bg-[#faf7f5]/70 p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#b84c6b]" />
                      <span className="text-xs font-bold text-[#23141c]">
                        Agenda da Recepção — Hoje
                      </span>
                    </div>
                    <span className="rounded-full bg-[#23141c] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      3 profissionais online
                    </span>
                  </div>

                  <div className="space-y-2">
                    <HeroScheduleRow
                      time="09:00"
                      client="Beatriz Lima"
                      service="Coloração Premium + Escova"
                      pro="Ana Silva"
                      status="Em atendimento"
                      statusTone="rose"
                    />
                    <HeroScheduleRow
                      time="10:30"
                      client="Fernanda Costa"
                      service="Manicure em Gel + Pedicure"
                      pro="Júlia Costa"
                      status="Comanda #42 • Pago"
                      statusTone="emerald"
                    />
                    <HeroScheduleRow
                      time="11:15"
                      client="Patrícia Souza"
                      service="Corte + Hidratação VIP"
                      pro="Ana Silva"
                      status="WhatsApp Confirmado"
                      statusTone="plum"
                    />
                  </div>
                </div>

                {/* Bottom Live Strip: Checkout + WhatsApp IA */}
                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-[#23141c]/10 bg-[#23141c] p-3 text-white">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c65d7b]/25 text-[#f2b8c6]">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#f2b8c6]">
                        Fechamento rápido
                      </p>
                      <p className="truncate text-xs text-white/85">
                        Pix R$ 1.240 · Cartão R$ 980 · Dinheiro R$ 620
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-[#c65d7b]/20 bg-[#fdf3f6] p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c65d7b] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a64661]">
                        WhatsApp IA • Agora
                      </p>
                      <p className="truncate text-xs font-medium text-[#23141c]">
                        “Horário das 14:30 agendado com Ana!”
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Niches & Impact Metrics Band */}
      <section className="border-y border-[#23141c]/10 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <span className="mr-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8d7280]">
              Feito para:
            </span>
            {niches.map((niche) => (
              <span
                key={niche}
                className="rounded-full border border-[#23141c]/10 bg-[#faf7f5] px-4 py-1.5 text-xs font-semibold text-[#3f2c36]"
              >
                {niche}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {kpiHighlights.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-[#23141c]/10 bg-[#fcf9fa] p-5"
              >
                <p className="font-brand-display text-3xl font-bold text-[#b84c6b]">
                  {kpi.value}
                </p>
                <p className="mt-1.5 text-sm font-bold text-[#23141c]">{kpi.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#6b5761]">{kpi.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Module Showcase */}
      <section id="modulos" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Conheça o sistema por dentro"
            title="Cada módulo pensado para a rotina real de um salão."
            description="Do momento em que a cliente clica no link da bio até o fechamento do caixa e o repasse de comissões — tudo conversa entre si sem retrabalho."
            centered
          />

          {/* Tabs */}
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = mod.id === activeModule.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleId(mod.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[#23141c] text-white shadow-lg shadow-[#23141c]/15'
                      : 'border border-[#23141c]/10 bg-white text-[#5b4852] hover:border-[#c65d7b]/40 hover:text-[#23141c]'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-[#f0aab8]' : 'text-[#b84c6b]')} />
                  {mod.label}
                </button>
              );
            })}
          </div>

          {/* Active Module Stage */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid items-center gap-8 rounded-[2rem] border border-[#23141c]/10 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(35,20,28,0.18)] sm:p-10 lg:grid-cols-[1fr_1.05fr]"
              >
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fdf2f5] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
                    {activeModule.eyebrow}
                  </span>
                  <h3 className="font-brand-display text-3xl font-bold leading-tight text-[#23141c] sm:text-4xl">
                    {activeModule.title}
                  </h3>
                  <p className="text-base leading-relaxed text-[#5b4852]">
                    {activeModule.description}
                  </p>
                  <ul className="space-y-3 pt-1">
                    {activeModule.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 text-sm text-[#35232c]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#b84c6b]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <Link
                      to="/signup"
                      className="editorial-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold"
                    >
                      Testar este módulo grátis
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Tailored Visual Preview per Module */}
                <ModuleVisualPreview moduleId={activeModule.id} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Before vs After Comparison */}
      <section id="comparativo" className="border-y border-[#23141c]/10 bg-[#f4ecee]/60 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="O custo do improviso"
            title="Troque o estresse diário por uma operação previsível."
            description="Quando agenda, WhatsApp, caixa e comissão ficam soltos, o salão perde horas toda semana — e dinheiro sem perceber."
            centered
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.8rem] border border-[#23141c]/10 bg-white/80 p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#23141c]/5 text-[#755f6b]">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d7280]">
                    Jeito antigo
                  </p>
                  <h3 className="font-brand-display text-2xl font-bold text-[#3f2c36]">
                    Caderno, planilhas e achismo
                  </h3>
                </div>
              </div>
              <ul className="mt-6 space-y-4">
                {oldWayItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#6b5761]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      <X className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-[1.8rem] border border-[#c65d7b]/30 bg-[#23141c] p-7 text-white shadow-[0_28px_70px_-30px_rgba(35,20,28,0.5)] sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#c65d7b]/25 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#c65d7b] text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0aab8]">
                    Com BellaPro Agenda
                  </p>
                  <h3 className="font-brand-display text-2xl font-bold text-white">
                    Gestão profissional de ponta a ponta
                  </h3>
                </div>
              </div>
              <ul className="relative mt-6 space-y-4">
                {bellaProWayItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works in 3 Steps */}
      <section id="fluxo" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Implantação sem dor de cabeça"
            title="Seu salão rodando no BellaPro ainda hoje."
            description="Sem semanas de treinamento complexo. Em três passos simples sua recepção e sua equipe já operam no novo fluxo."
            centered
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {onboardingSteps.map((step) => (
              <div key={step.number} className="editorial-card rounded-[1.8rem] p-7">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdf2f5] font-brand-display text-xl font-bold text-[#b84c6b]">
                  {step.number}
                </span>
                <h3 className="mt-5 font-brand-display text-2xl font-bold text-[#23141c]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5b4852]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="border-y border-[#23141c]/10 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Planos e Preços Transparentes"
            title="Preço justo e claro. Sem “sob consulta” e sem taxas escondidas."
            description="Comece grátis por 7 dias e escolha o plano ideal para o tamanho da sua equipe. Evolua ou altere seu plano quando quiser."
            centered
          />

          {/* Billing Cycle Toggle */}
          <div className="mt-9 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-[#23141c]/15 bg-[#faf7f5] p-1.5">
              <button
                type="button"
                onClick={() => setBillingCycle('mensal')}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-semibold transition',
                  billingCycle === 'mensal'
                    ? 'bg-[#23141c] text-white shadow-sm'
                    : 'text-[#5b4852] hover:text-[#23141c]'
                )}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('anual')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition',
                  billingCycle === 'anual'
                    ? 'bg-[#23141c] text-white shadow-sm'
                    : 'text-[#5b4852] hover:text-[#23141c]'
                )}
              >
                Anual
                <span className="rounded-full bg-[#c65d7b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  -20% OFF
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {plans.map((plan) => {
              const displayPrice =
                billingCycle === 'anual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-[2rem] p-7 sm:p-8 transition',
                    plan.featured
                      ? 'border-2 border-[#c65d7b] bg-[#23141c] text-white shadow-[0_32px_80px_-28px_rgba(35,20,28,0.48)] lg:-translate-y-2'
                      : 'border border-[#23141c]/10 bg-[#faf7f5]/70 text-[#23141c] hover:border-[#c65d7b]/35'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs font-bold uppercase tracking-[0.2em]',
                        plan.featured ? 'text-[#f0aab8]' : 'text-[#b84c6b]'
                      )}
                    >
                      Plano {plan.name}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-bold',
                        plan.featured
                          ? 'bg-[#c65d7b] text-white'
                          : 'border border-[#23141c]/10 bg-white text-[#5b4852]'
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        'text-sm font-bold',
                        plan.featured ? 'text-white/70' : 'text-[#6b5761]'
                      )}
                    >
                      R$
                    </span>
                    <span className="font-brand-display text-5xl font-bold tracking-tight">
                      {displayPrice}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        plan.featured ? 'text-white/60' : 'text-[#6b5761]'
                      )}
                    >
                      /mês
                    </span>
                  </div>

                  <div className="mt-2 min-h-[20px]">
                    {billingCycle === 'anual' ? (
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          plan.featured ? 'text-emerald-300' : 'text-emerald-700'
                        )}
                      >
                        Economize R$ {plan.annualSavings}/ano no plano anual
                      </p>
                    ) : (
                      <p
                        className={cn(
                          'text-xs',
                          plan.featured ? 'text-white/55' : 'text-[#7c6771]'
                        )}
                      >
                        Cobrança mensal sem fidelidade
                      </p>
                    )}
                  </div>

                  <div
                    className={cn(
                      'mt-5 inline-flex w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold',
                      plan.featured
                        ? 'bg-white/10 text-white'
                        : 'border border-[#23141c]/10 bg-white text-[#23141c]'
                    )}
                  >
                    <Users className="h-3.5 w-3.5 text-[#c65d7b]" />
                    {plan.professionals}
                  </div>

                  <p
                    className={cn(
                      'mt-4 text-sm leading-relaxed',
                      plan.featured ? 'text-white/75' : 'text-[#5b4852]'
                    )}
                  >
                    {plan.description}
                  </p>

                  <div
                    className={cn(
                      'my-6 h-px',
                      plan.featured ? 'bg-white/10' : 'bg-[#23141c]/10'
                    )}
                  />

                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className={cn(
                            'mt-0.5 h-4 w-4 shrink-0',
                            plan.featured ? 'text-[#f0aab8]' : 'text-[#b84c6b]'
                          )}
                        />
                        <span className={plan.featured ? 'text-white/85' : 'text-[#35232c]'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={`/signup?plano=${plan.id}&ciclo=${billingCycle}`}
                    className={cn(
                      'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold transition',
                      plan.featured
                        ? 'editorial-btn-primary'
                        : 'editorial-btn-dark'
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pricing Guarantees Row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-[#5b4852]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#b84c6b]" />7 dias de teste gratuito
            </span>
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#b84c6b]" />Pagamento simples via PIX
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#b84c6b]" />Sem taxa de implantação
            </span>
            <span className="inline-flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-[#b84c6b]" />Cancele quando quiser
            </span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Quem usa, recomenda"
            title="Resultados reais na recepção e no fechamento do mês."
            description="Salões e estúdios que trocaram controles manuais pelo BellaPro ganham tempo na recepção e tranquilidade no financeiro."
            centered
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.author} className="editorial-card flex flex-col rounded-[1.8rem] p-7">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="rounded-full bg-[#fdf2f5] px-3 py-1 text-[11px] font-bold text-[#b84c6b]">
                    {item.result}
                  </span>
                </div>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-[#3d2b34]">
                  “{item.quote}”
                </p>
                <div className="mt-6 border-t border-[#23141c]/10 pt-4">
                  <p className="text-sm font-bold text-[#23141c]">{item.author}</p>
                  <p className="text-xs text-[#7c6771]">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="duvidas" className="border-t border-[#23141c]/10 bg-[#f4ecee]/50 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            eyebrow="Perguntas Frequentes"
            title="Tudo o que você precisa saber antes de começar."
            description="Transparência total para você testar o BellaPro sem surpresas."
            centered
          />

          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-[#23141c]/10 bg-white transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-sm font-bold text-[#23141c] sm:text-base">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-[#b84c6b] transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-[#23141c]/[0.08] px-6 pb-5 pt-4 text-sm leading-relaxed text-[#5b4852]">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Conversion CTA Banner */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#23141c] px-6 py-14 text-center text-white shadow-[0_36px_90px_-34px_rgba(35,20,28,0.65)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#c65d7b]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#f7c1b6]/20 blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f2b8c6]">
              <Sparkles className="h-3.5 w-3.5" />
              Pronto para profissionalizar seu salão?
            </span>
            <h2 className="mt-5 font-brand-display text-3xl font-bold leading-tight sm:text-5xl">
              Comece hoje com 7 dias grátis e veja a diferença já na primeira semana.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              Crie sua conta, libere seu link de agendamento 24h e assuma o controle total da agenda, equipe e caixa do seu negócio.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                to="/signup"
                className="editorial-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold sm:w-auto"
              >
                Criar minha conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto"
              >
                Já sou cliente • Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#23141c]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-4">
              <LandingBrandLogo variant="lightBg" />
              <p className="max-w-sm text-sm leading-relaxed text-[#6b5761]">
                Sistema de gestão completo para salões de beleza, estúdios, barbearias e clínicas de estética. Agenda 24h, caixa blindado, comissões e WhatsApp com IA.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#23141c]">
                Produto
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-[#5b4852]">
                <li>
                  <button type="button" onClick={() => scrollToSection('modulos')} className="hover:text-[#b84c6b]">
                    Módulos do sistema
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('comparativo')} className="hover:text-[#b84c6b]">
                    Por que BellaPro
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('planos')} className="hover:text-[#b84c6b]">
                    Planos e Preços
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('duvidas')} className="hover:text-[#b84c6b]">
                    Perguntas Frequentes
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#23141c]">
                Acesso
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-[#5b4852]">
                <li>
                  <Link to="/login" className="hover:text-[#b84c6b]">
                    Entrar no painel
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[#b84c6b]">
                    Começar 7 dias grátis
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="hover:text-[#b84c6b]">
                    Acesso da equipe
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#23141c]/10 pt-6 text-xs text-[#7c6771] sm:flex-row">
            <p>© {new Date().getFullYear()} BellaPro Agenda. Todos os direitos reservados.</p>
            <p>Feito para salões que levam gestão a sério.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      className={cn('max-w-3xl', centered && 'mx-auto text-center')}
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b84c6b]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-brand-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[#23141c] sm:text-4xl lg:text-[2.65rem]">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-[#5b4852] sm:text-lg">
        {description}
      </p>
    </motion.div>
  );
}

function HeroScheduleRow({ time, client, service, pro, status, statusTone }) {
  const toneClasses = {
    rose: 'bg-[#fdf2f5] text-[#b84c6b] border-[#c65d7b]/20',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    plum: 'bg-[#f4eef1] text-[#3f2c36] border-[#23141c]/10',
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#23141c]/[0.08] bg-white px-3.5 py-2.5 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="rounded-lg bg-[#faf5f7] px-2 py-1 text-xs font-extrabold text-[#23141c]">
          {time}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#23141c]">
            {client} <span className="font-normal text-[#7c6771]">• {pro}</span>
          </p>
          <p className="truncate text-[11px] text-[#6b5761]">{service}</p>
        </div>
      </div>
      <span
        className={cn(
          'rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
          toneClasses[statusTone] || toneClasses.plum
        )}
      >
        {status}
      </span>
    </div>
  );
}

function ModuleVisualPreview({ moduleId }) {
  if (moduleId === 'agenda') {
    return (
      <div className="rounded-[1.6rem] border border-[#23141c]/10 bg-[#faf7f5] p-5">
        <div className="flex items-center justify-between border-b border-[#23141c]/10 pb-3.5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#b84c6b]" />
            <span className="text-xs font-bold text-[#23141c]">
              bellaproagenda.com.br/studio-bella
            </span>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
            Online 24h
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#23141c]/[0.08]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#b84c6b]">
              1. Escolha o serviço
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#23141c]">Mechas + Tratamento + Escova</p>
                <p className="text-xs text-[#6b5761]">Duração: 150 min • Ana Silva</p>
              </div>
              <span className="text-sm font-extrabold text-[#23141c]">R$ 320,00</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-[#23141c]/[0.08]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#b84c6b]">
              2. Horários livres hoje
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {['09:00', '10:30', '14:00', '15:30', '17:00'].map((slot, idx) => (
                <span
                  key={slot}
                  className={cn(
                    'rounded-xl px-3.5 py-1.5 text-xs font-bold',
                    idx === 2
                      ? 'bg-[#c65d7b] text-white shadow-sm'
                      : 'border border-[#23141c]/10 bg-[#faf7f5] text-[#23141c]'
                  )}
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#23141c] px-4 py-3 text-white">
            <span className="text-xs font-medium text-white/80">
              Lembrete automático no WhatsApp ativo
            </span>
            <Bell className="h-4 w-4 text-[#f0aab8]" />
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'caixa') {
    return (
      <div className="rounded-[1.6rem] border border-[#23141c]/10 bg-[#faf7f5] p-5">
        <div className="flex items-center justify-between border-b border-[#23141c]/10 pb-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#b84c6b]">
              Fechamento de Turno • Recepção
            </p>
            <p className="text-sm font-bold text-[#23141c]">Conferência Auditável</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
            Diferença R$ 0,00
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Saldo Inicial', val: 'R$ 200,00' },
            { label: 'Pix / Transferência', val: 'R$ 1.480,00' },
            { label: 'Cartão Crédito/Débito', val: 'R$ 1.960,00' },
            { label: 'Dinheiro em Gaveta', val: 'R$ 540,00' },
          ].map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-[#23141c]/[0.08] bg-white p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c6771]">
                {tile.label}
              </p>
              <p className="mt-1 text-lg font-extrabold text-[#23141c]">{tile.val}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-[#23141c]/10 bg-white p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#23141c]">Comanda #42 — Fernanda Costa</span>
            <span className="font-extrabold text-emerald-700">R$ 245,00 Pago</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b5761]">
            Corte (Ana Silva) + Manicure em Gel (Júlia Costa) + Óleo Reparador
          </p>
        </div>
      </div>
    );
  }

  if (moduleId === 'whatsapp') {
    return (
      <div className="rounded-[1.6rem] border border-[#23141c]/10 bg-[#faf7f5] p-5">
        <div className="flex items-center justify-between border-b border-[#23141c]/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#23141c]">Inbox WhatsApp + IA BellaPro</p>
              <p className="text-[11px] text-emerald-700">Atendimento automático ativo 24h</p>
            </div>
          </div>
          <Bot className="h-5 w-5 text-[#b84c6b]" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#23141c]/10 bg-white p-3.5 text-xs text-[#23141c] shadow-sm">
            Oi! Vocês têm horário amanhã à tarde para corte e escova com a Ana?
          </div>
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#23141c] p-3.5 text-xs leading-relaxed text-white shadow-sm">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#f0aab8]">
              IA BellaPro • Respondeu em 3s
            </p>
            Olá! Sim, a Ana tem horário livre amanhã às <strong>14:30</strong> e às{' '}
            <strong>16:00</strong>. O Corte + Escova fica R$ 130,00. Posso reservar às 14:30 para você?
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
            <span>Agendamento criado e lembrete agendado automaticamente</span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'equipe') {
    return (
      <div className="rounded-[1.6rem] border border-[#23141c]/10 bg-[#faf7f5] p-5">
        <div className="flex items-center justify-between border-b border-[#23141c]/10 pb-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#b84c6b]" />
            <span className="text-xs font-bold text-[#23141c]">
              Perfis de Acesso & Comissões
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#6b5761]">Permissões ativas</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {[
            { name: 'Ana Silva', role: 'Profissional', access: 'Só própria agenda e extrato', commission: 'R$ 2.180,00 (50%)' },
            { name: 'Júlia Costa', role: 'Profissional', access: 'Só própria agenda e extrato', commission: 'R$ 1.490,00 (45%)' },
            { name: 'Bruna Alves', role: 'Recepção', access: 'Agenda + Caixa do Turno', commission: 'Sem acesso a lucro' },
          ].map((member) => (
            <div
              key={member.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#23141c]/[0.08] bg-white p-3.5"
            >
              <div>
                <p className="text-xs font-bold text-[#23141c]">
                  {member.name}{' '}
                  <span className="ml-1 rounded-full bg-[#fdf2f5] px-2 py-0.5 text-[10px] font-bold text-[#b84c6b]">
                    {member.role}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#6b5761]">{member.access}</p>
              </div>
              <span className="text-xs font-extrabold text-[#23141c]">{member.commission}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-[#23141c]/10 bg-[#faf7f5] p-5">
      <div className="flex items-center justify-between border-b border-[#23141c]/10 pb-3.5">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[#b84c6b]" />
          <span className="text-xs font-bold text-[#23141c]">Fidelidade, Pacotes & PDV</span>
        </div>
        <span className="rounded-full bg-[#fdf2f5] px-2.5 py-0.5 text-[10px] font-bold text-[#b84c6b]">
          Recorrência Ativa
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#23141c]/[0.08] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b84c6b]">
            Cashback da Cliente
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#23141c]">R$ 42,50</p>
          <p className="mt-1 text-[11px] text-[#6b5761]">
            Saldo pronto para abater no próximo atendimento.
          </p>
        </div>
        <div className="rounded-2xl border border-[#23141c]/[0.08] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b84c6b]">
            Pacote Cronograma Capilar
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#23141c]">3 de 4 sessões</p>
          <p className="mt-1 text-[11px] text-[#6b5761]">
            Baixa automática a cada visita finalizada.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#23141c]/10 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Package className="h-4 w-4 text-[#b84c6b]" />
          <span className="text-xs font-bold text-[#23141c]">
            Estoque & Venda Balcão (PDV) integrados
          </span>
        </div>
        <BarChart3 className="h-4 w-4 text-emerald-600" />
      </div>
    </div>
  );
}
