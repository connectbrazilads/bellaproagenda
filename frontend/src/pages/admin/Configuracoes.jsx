import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Globe,
  Image as ImageIcon,
  Key,
  Lock,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Store,
  User,
  Users,
  Zap,
  MessageSquare,
} from 'lucide-react';
import {
  connectWhatsapp,
  createUsuario,
  deleteUsuario,
  disconnectWhatsapp,
  exportBackup,
  getAdminSalao,
  getAuditoria,
  getProfissionais,
  getUsuarios,
  getWhatsappConfig,
  getWhatsappStatus,
  updateAdminSalao,
  updateSenha,
  updateWhatsappConfig,
} from '../../services/api';
import ImageUpload from '../../components/ImageUpload';
import SnippetsConfig from '../../components/SnippetsConfig';
import { cn } from '../../lib/utils';
import {
  ACTION_PERMISSION_LABELS,
  DEFAULT_ROLE_ACTION_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
} from '../../lib/permissions';

const TABS = [
  { id: 'salao', label: 'Unidade', icon: Store },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'whatsapp', label: 'WhatsApp e IA', icon: Smartphone },
  { id: 'inbox', label: 'Inbox (Respostas Rápidas)', icon: MessageSquare },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
];

const AVAILABLE_PERMISSIONS = [
  'dashboard',
  'agenda',
  'inbox',
  'clientes',
  'profissionais',
  'servicos',
  'pacotes',
  'produtos',
  'base_conhecimento',
  'fidelidade',
  'agendamentos',
  'financeiro',
  'remuneracao',
  'relatorio',
  'bloqueios',
  'notificacoes',
  'migracao',
  'configuracoes',
];

const AVAILABLE_ACTIONS = [
  'agenda.criar',
  'agenda.editar',
  'agenda.excluir',
  'agenda.pagamento',
  'profissionais.criar',
  'profissionais.editar',
  'profissionais.excluir',
  'financeiro.caixa.abrir',
  'financeiro.caixa.movimentar',
  'financeiro.caixa.fechar',
  'configuracoes.usuarios.criar',
  'configuracoes.usuarios.editar',
  'configuracoes.usuarios.excluir',
  'configuracoes.auditoria.ver',
  'relatorio.fechamento_diario.ver',
  'seguranca.backup.exportar',
];

const MASKED_SECRET = '••••••••';

const INITIAL_SALAO = {
  nome: '',
  telefone: '',
  endereco: '',
  whatsapp: '',
  whatsappAgendamentos: '',
  logoUrl: '',
  bannerUrl: '',
  bannerTexto: '',
  corPrimaria: '#e29ba8',
  corSecundaria: '#3b2a35',
  tema: 'dark',
};

const INITIAL_WHATSAPP = {
  evolutionUrl: '',
  evolutionInstance: '',
  evolutionKey: '',
  geminiKey: '',
};

const INITIAL_USER = {
  nome: '',
  email: '',
  senha: '',
  role: 'profissional',
  profissionalId: '',
  permissions: [...DEFAULT_ROLE_PERMISSIONS.profissional],
  actionPermissions: [...DEFAULT_ROLE_ACTION_PERMISSIONS.profissional],
};

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('salao');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-10 pb-20"
    >
      <header className="flex flex-col gap-5 border-b border-gray-200 dark:border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#e29ba8]" />
          <p className="brand-kicker">Centro de comando</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white leading-none">
              Configurações <span className="brand-text-gradient">BellaPro</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/62">
              Ajuste a operação da unidade, os acessos da equipe e a camada de automação com uma linguagem visual mais consistente.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:p-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[1.8rem] border px-5 py-4 text-left transition-all',
                  active
                    ? 'border-[#e29ba8]/40 bg-[#2f242d] text-white shadow-[0_22px_50px_-28px_rgba(226,155,168,0.55)]'
                    : 'border-gray-200 dark:border-white/5 bg-white/[0.03] text-white/68 hover:border-[#e29ba8]/20 hover:bg-white/[0.045]'
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl',
                      active ? 'bg-[#e29ba8] text-[#1a1a1f]' : 'bg-white/[0.06] text-[#efbcc4]'
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.24em]">{tab.label}</span>
                </div>
                <ChevronRight size={16} className={active ? 'text-[#efb9c2]' : 'text-gray-400 dark:text-white/24'} />
              </button>
            );
          })}
        </aside>

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {activeTab === 'salao' && <SecaoSalao />}
              {activeTab === 'branding' && <SecaoBranding />}
              {activeTab === 'whatsapp' && <SecaoWhatsapp />}
              {activeTab === 'inbox' && <SnippetsConfig />}
              {activeTab === 'usuarios' && <SecaoUsuarios />}
              {activeTab === 'auditoria' && <SecaoAuditoria />}
              {activeTab === 'seguranca' && <SecaoSeguranca />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}

function SecaoSalao() {
  const [salao, setSalao] = useState(INITIAL_SALAO);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAdminSalao().then((response) => {
      if (response.data) {
        setSalao((prev) => ({ ...prev, ...response.data }));
      }
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateAdminSalao(salao);
      setMessage('Dados da unidade atualizados com sucesso.');
    } catch {
      setMessage('Não foi possível salvar os dados da unidade.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setDownloading(true);
    setMessage('');
    try {
      const response = await exportBackup();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-bellapro-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup exportado com sucesso.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao exportar backup.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <SectionCard title="Informações da unidade" icon={<Store size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-4 sm:p-6 md:grid-cols-2">
          <Field
            label="Nome do salão"
            value={salao.nome}
            onChange={(value) => setSalao((prev) => ({ ...prev, nome: value }))}
            icon={<Store size={15} />}
          />
          <Field
            label="Telefone de contato"
            value={salao.telefone}
            onChange={(value) => setSalao((prev) => ({ ...prev, telefone: value }))}
            icon={<Smartphone size={15} />}
          />
        </div>

        <Field
          label="Endereço completo"
          value={salao.endereco}
          onChange={(value) => setSalao((prev) => ({ ...prev, endereco: value }))}
          icon={<Globe size={15} />}
        />

        <Field
          label="WhatsApp Business"
          value={salao.whatsapp}
          onChange={(value) => setSalao((prev) => ({ ...prev, whatsapp: value }))}
          placeholder="Ex: 5511999999999"
          icon={<Zap size={15} />}
        />

        <Field
          label="WhatsApp para alertas de agendamento"
          value={salao.whatsappAgendamentos}
          onChange={(value) => setSalao((prev) => ({ ...prev, whatsappAgendamentos: value }))}
          placeholder="Ex: 5511999999999"
          helper="Se ficar vazio, o sistema usa o WhatsApp Business principal."
          icon={<MessageSquare size={15} />}
        />

        <div className="rounded-[2rem] border border-dashed border-[#e29ba8]/16 bg-black/15 p-4 sm:p-6">
          <ImageUpload
            label="Logotipo da unidade"
            value={salao.logoUrl}
            onChange={(value) => setSalao((prev) => ({ ...prev, logoUrl: value }))}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-white/5 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <InlineMessage text={message} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBackup}
              disabled={downloading}
              className="rounded-[1.3rem] border border-[#e29ba8]/20 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/78 transition hover:border-[#e29ba8]/32 hover:text-gray-900 dark:text-white disabled:opacity-50"
            >
              {downloading ? 'Gerando backup...' : 'Exportar backup'}
            </button>
            <PrimaryButton type="submit" loading={saving} label="Salvar unidade" />
          </div>
        </div>
      </form>
    </SectionCard>
  );
}

function SecaoBranding() {
  const [salao, setSalao] = useState(INITIAL_SALAO);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getAdminSalao().then((response) => {
      if (response.data) {
        setSalao((prev) => ({ ...prev, ...response.data }));
      }
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateAdminSalao(salao);
      setMessage('Branding atualizado com sucesso.');
    } catch {
      setMessage('Não foi possível atualizar o branding.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Branding e atmosfera" icon={<Palette size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-4 sm:p-6 md:grid-cols-2">
          <ColorField
            label="Cor principal"
            value={salao.corPrimaria || '#e29ba8'}
            onChange={(value) => setSalao((prev) => ({ ...prev, corPrimaria: value }))}
          />
          <ColorField
            label="Cor de suporte"
            value={salao.corSecundaria || '#3b2a35'}
            onChange={(value) => setSalao((prev) => ({ ...prev, corSecundaria: value }))}
          />
        </div>

        <Field
          label="Headline do banner"
          value={salao.bannerTexto}
          onChange={(value) => setSalao((prev) => ({ ...prev, bannerTexto: value }))}
          icon={<ImageIcon size={15} />}
          placeholder="Ex: Gestão premium para salões de beleza"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {['dark', 'light'].map((theme) => {
            const active = salao.tema === theme;
            return (
              <button
                key={theme}
                type="button"
                onClick={() => setSalao((prev) => ({ ...prev, tema: theme }))}
                className={cn(
                  'rounded-[2rem] border p-4 sm:p-6 text-left transition-all',
                  active
                    ? 'border-[#e29ba8]/36 bg-[#2f242d] shadow-[0_20px_50px_-32px_rgba(226,155,168,0.55)]'
                    : 'border-gray-200 dark:border-white/5 bg-white/[0.03] hover:border-[#e29ba8]/20'
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#efbac2]">
                  {theme === 'dark' ? 'Tema noturno' : 'Tema claro'}
                </p>
                <p className="mt-3 text-sm text-gray-600 dark:text-white/70">
                  {theme === 'dark'
                    ? 'Foco em contraste elegante, fundo profundo e atmosfera premium.'
                    : 'Leitura mais leve com superfícies claras e acabamento editorial.'}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[2rem] border border-dashed border-[#e29ba8]/16 bg-black/15 p-4 sm:p-6">
          <ImageUpload
            label="Imagem de hero"
            value={salao.bannerUrl}
            onChange={(value) => setSalao((prev) => ({ ...prev, bannerUrl: value }))}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-white/5 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <InlineMessage text={message} />
          <PrimaryButton type="submit" loading={saving} label="Salvar branding" />
        </div>
      </form>
    </SectionCard>
  );
}

function SecaoWhatsapp() {
  const [config, setConfig] = useState(INITIAL_WHATSAPP);
  const [status, setStatus] = useState('not_configured');
  const [hasSecrets, setHasSecrets] = useState({ evolutionKey: false, geminiKey: false });
  const [resolvedConfig, setResolvedConfig] = useState({
    effectiveEvolutionUrl: '',
    effectiveEvolutionInstance: '',
    usingGlobalApiUrl: false,
    usingGlobalApiKey: false,
    usingGlobalInstance: false,
    hasGlobalEvolutionKey: false,
    webhookUrl: '',
  });
  const [qr, setQr] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const [salao, setSalao] = useState(null);

  useEffect(() => {
    loadData();
    return () => clearPolling();
  }, []);

  async function loadData() {
    try {
      const [salaoRes, configRes] = await Promise.all([getAdminSalao(), getWhatsappConfig()]);
      setSalao(salaoRes.data);
      if (configRes.data) {
        setConfig((prev) => ({
          ...prev,
          evolutionUrl: configRes.data.evolutionUrl || '',
          evolutionInstance: configRes.data.evolutionInstance || '',
        }));
        setHasSecrets({
          evolutionKey: !!configRes.data.hasEvolutionKey,
          geminiKey: !!configRes.data.hasGeminiKey,
        });
        setResolvedConfig({
          effectiveEvolutionUrl: configRes.data.effectiveEvolutionUrl || '',
          effectiveEvolutionInstance: configRes.data.effectiveEvolutionInstance || '',
          usingGlobalApiUrl: !!configRes.data.usingGlobalApiUrl,
          usingGlobalApiKey: !!configRes.data.usingGlobalApiKey,
          usingGlobalInstance: !!configRes.data.usingGlobalInstance,
          hasGlobalEvolutionKey: !!configRes.data.hasGlobalEvolutionKey,
          webhookUrl: configRes.data.webhookUrl || '',
        });
      }
      if (salaoRes.data?.moduloWhatsapp) {
        await loadStatus();
      }
    } catch {}
  }

  async function loadStatus() {
    try {
      const response = await getWhatsappStatus();
      setStatus(response.data.status);
    } catch {}
  }

  useEffect(() => {
    if (status === 'connecting') {
      timerRef.current = setInterval(loadStatus, 3000);
    } else {
      clearPolling();
      if (status !== 'open') setQr('');
    }

    return () => clearPolling();
  }, [status]);

  function clearPolling() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setMessage('');
    setQr('');
    try {
      const response = await connectWhatsapp();
      const base64 = response.data?.base64 || response.data?.qrcode?.base64 || response.data?.qr?.base64 || '';
      if (base64) {
        setQr(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
        setStatus('connecting');
      } else {
        setMessage('Instância localizada, mas sem QR Code disponível no momento.');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao conectar WhatsApp.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setMessage('');
    try {
      await disconnectWhatsapp();
      setStatus('close');
      setQr('');
      setMessage('WhatsApp desconectado.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao desconectar WhatsApp.');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveConfig(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateWhatsappConfig(config);
      setMessage('Configuracao da Evolution atualizada.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Nao foi possivel salvar a configuracao da Evolution.');
    } finally {
      setSaving(false);
    }
  }

  const statusBadge = useMemo(() => {
    const map = {
      not_configured: { label: 'Não configurado', className: 'bg-white/6 text-gray-600 dark:text-white/60' },
      not_created: { label: 'Instancia pendente', className: 'bg-amber-500/18 text-amber-200' },
      open: { label: 'Conectado', className: 'bg-emerald-500/16 text-emerald-300' },
      connecting: { label: 'Aguardando leitura', className: 'bg-amber-500/18 text-amber-200' },
      close: { label: 'Desconectado', className: 'bg-red-500/14 text-red-200' },
      error: { label: 'Falha de conexão', className: 'bg-red-500/14 text-red-200' },
    };
    return map[status] || map.not_configured;
  }, [status]);

  return (
    <SectionCard title="Integração WhatsApp e IA" icon={<Bot size={18} />}>
      {(!salao?.moduloWhatsapp || !salao?.moduloIA) && (
        <div className="mb-8 rounded-[2rem] border border-[#e29ba8]/20 bg-[#2f242d] p-8 text-center shadow-[0_20px_50px_-32px_rgba(226,155,168,0.55)]">
          <Bot size={40} className="mx-auto text-[#efbac2] mb-4" />
          <h3 className="text-xl font-brand-display text-white mb-2">Módulo Inteligente Bloqueado</h3>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            A automação de WhatsApp e a Inteligência Artificial não estão ativas no seu plano atual. 
            Entre em contato com o nosso suporte para realizar um upgrade e liberar o assistente virtual 24/7.
          </p>
        </div>
      )}

      {salao?.moduloWhatsapp && (
        <>
          <form onSubmit={handleSaveConfig} className="mb-8 space-y-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white/[0.03] p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="URL da Evolution"
                value={config.evolutionUrl}
                onChange={(value) => setConfig((prev) => ({ ...prev, evolutionUrl: value }))}
                placeholder={resolvedConfig.effectiveEvolutionUrl || 'https://sua-evolution.com'}
                icon={<Globe size={15} />}
                helper={resolvedConfig.usingGlobalApiUrl ? 'Vazio = usa a URL global do servidor.' : ''}
              />
              <Field
                label="Nome da instancia"
                value={config.evolutionInstance}
                onChange={(value) => setConfig((prev) => ({ ...prev, evolutionInstance: value }))}
                placeholder={resolvedConfig.effectiveEvolutionInstance || 'slug-do-salao'}
                icon={<Smartphone size={15} />}
                helper={resolvedConfig.usingGlobalInstance ? 'Vazio = usa o slug do salao ou a instancia global.' : ''}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Chave da Evolution"
                value={config.evolutionKey}
                onChange={(value) => setConfig((prev) => ({ ...prev, evolutionKey: value }))}
                placeholder={hasSecrets.evolutionKey ? MASKED_SECRET : resolvedConfig.hasGlobalEvolutionKey ? 'Usando chave global do servidor' : 'Cole a chave da Evolution'}
                icon={<Key size={15} />}
                helper={resolvedConfig.usingGlobalApiKey ? 'Vazio = usa a chave global do servidor.' : ''}
              />
              <Field
                label="Webhook do inbox"
                value={resolvedConfig.webhookUrl}
                onChange={() => {}}
                placeholder="Webhook do inbox"
                icon={<MessageSquare size={15} />}
                helper="Esse webhook recebe as mensagens da Evolution e alimenta o inbox."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton type="submit" loading={saving} label="Salvar Evolution" />
              <button
                type="button"
                onClick={() => resolvedConfig.webhookUrl && navigator.clipboard?.writeText(resolvedConfig.webhookUrl)}
                className="rounded-[1.3rem] border border-[#e29ba8]/20 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/78 transition hover:border-[#e29ba8]/32"
              >
                Copiar webhook
              </button>
            </div>
          </form>

          <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white/[0.03] p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#efbac2]">Estado da conexão</p>
              <div className={cn('mt-3 inline-flex rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]', statusBadge.className)}>
                {statusBadge.label}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {status === 'open' ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-[1.3rem] border border-red-300/20 bg-red-400/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-red-200 transition hover:bg-red-400/14 disabled:opacity-50"
                >
                  {disconnecting ? 'Desconectando...' : 'Desconectar'}
                </button>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={handleConnect}
                  loading={connecting}
                  label="Conectar WhatsApp"
                />
              )}
            </div>
          </div>

          {status === 'connecting' && qr && (
            <div className="mb-8 rounded-[2rem] border border-[#e29ba8]/14 bg-black/24 p-4 md:p-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#efbac2]">Leia o QR Code no aparelho</p>
              <img src={qr} alt="QR Code do WhatsApp" className="mx-auto mt-5 w-56 rounded-[1.6rem] bg-white p-4" />
            </div>
          )}
          
          <InlineMessage text={message} />
        </>
      )}
    </SectionCard>
  );
}

function SecaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(INITIAL_USER);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usuariosResponse, profissionaisResponse] = await Promise.all([getUsuarios(), getProfissionais()]);
      setUsuarios(usuariosResponse.data || []);
      setProfissionais(profissionaisResponse.data || []);
    } catch {}
  }

  function handleRoleChange(role) {
    setForm((prev) => ({
      ...prev,
      role,
      profissionalId: role === 'profissional' ? prev.profissionalId : '',
      permissions: [...(DEFAULT_ROLE_PERMISSIONS[role] || [])],
      actionPermissions: [...(DEFAULT_ROLE_ACTION_PERMISSIONS[role] || [])],
    }));
  }

  function togglePermission(permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  }

  function toggleAction(permission) {
    setForm((prev) => ({
      ...prev,
      actionPermissions: prev.actionPermissions.includes(permission)
        ? prev.actionPermissions.filter((item) => item !== permission)
        : [...prev.actionPermissions, permission],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await createUsuario(form);
      setMessage('Acesso criado com sucesso.');
      setForm(INITIAL_USER);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Não foi possível criar o acesso.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deseja remover este acesso?')) return;
    try {
      await deleteUsuario(id);
      await loadData();
    } catch {
      setMessage('Não foi possível remover o acesso.');
    }
  }

  return (
    <div className="space-y-8">
      <SectionCard title="Gestão de acessos" icon={<Users size={18} />}>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-4 sm:p-6 md:grid-cols-2">
            <Field
              label="Nome completo"
              value={form.nome}
              onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))}
              icon={<User size={15} />}
            />
            <Field
              label="E-mail de login"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              icon={<Globe size={15} />}
            />
          </div>

          <div className="grid gap-4 sm:p-6 md:grid-cols-3">
            <Field
              label="Senha inicial"
              value={form.senha}
              onChange={(value) => setForm((prev) => ({ ...prev, senha: value }))}
              type="password"
              icon={<Lock size={15} />}
            />

            <SelectField
              label="Perfil"
              value={form.role}
              onChange={handleRoleChange}
              options={[
                { value: 'gestor', label: 'Gestor' },
                { value: 'recepcao', label: 'Recepção' },
                { value: 'profissional', label: 'Profissional' },
              ]}
            />

            <SelectField
              label="Profissional vinculado"
              value={form.profissionalId}
              onChange={(value) => setForm((prev) => ({ ...prev, profissionalId: value }))}
              options={[
                { value: '', label: 'Nenhum vínculo' },
                ...profissionais.map((profissional) => ({ value: profissional.id, label: profissional.nome })),
              ]}
            />
          </div>

          <PermissionGrid
            title="Abas liberadas"
            items={AVAILABLE_PERMISSIONS}
            activeItems={form.permissions}
            getLabel={(permission) => PERMISSION_LABELS[permission] || permission}
            onToggle={togglePermission}
            activeClassName="border-[#e29ba8]/36 bg-[#e29ba8]/10 text-[#f6c6cd]"
          />

          <PermissionGrid
            title="Ações liberadas"
            items={AVAILABLE_ACTIONS}
            activeItems={form.actionPermissions}
            getLabel={(permission) => ACTION_PERMISSION_LABELS[permission] || permission}
            onToggle={toggleAction}
            activeClassName="border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          />

          <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-white/5 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <InlineMessage text={message} />
            <PrimaryButton type="submit" loading={saving} label="Criar acesso" />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Usuários ativos" icon={<Users size={18} />}>
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/5">
          <table className="w-full text-left">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Usuário</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Perfil</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Escopo</th>
                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 bg-black/12">
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{usuario.nome}</p>
                    <p className="mt-1 text-xs text-gray-200 dark:text-white/54">{usuario.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-white/6 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#efbac2]">
                      {usuario.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-200 dark:text-white/54">
                    {usuario.permissions?.length || 0} abas · {usuario.actionPermissions?.length || 0} ações
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(usuario.id)}
                      className="rounded-xl border border-red-300/16 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-400/14"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-white/46">
                    Nenhum acesso cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function SecaoAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await getAuditoria({ limit: 80 });
        setLogs(response.data || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <SectionCard title="Auditoria operacional" icon={<ShieldCheck size={18} />}>
      <div className="space-y-4">
        {loading && <p className="text-sm text-white/48">Carregando registros...</p>}
        {!loading && logs.length === 0 && <p className="text-sm text-white/48">Nenhum evento auditado até aqui.</p>}
        {logs.map((log) => (
          <div key={log.id} className="rounded-[1.8rem] border border-gray-200 dark:border-white/5 bg-black/16 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#efbac2]">{log.acao}</p>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{log.mensagem || log.entidade}</p>
                <p className="mt-2 text-xs text-white/48">
                  {log.usuario?.nome || log.usuario?.email || 'Sistema'} · {new Date(log.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]',
                  log.status === 'failed' || log.severity === 'error'
                    ? 'bg-red-400/12 text-red-200'
                    : log.severity === 'warning'
                      ? 'bg-amber-400/12 text-amber-100'
                      : 'bg-emerald-400/12 text-emerald-200'
                )}
              >
                {log.status || 'ok'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SecaoSeguranca() {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.novaSenha !== form.confirmar) {
      setMessage('A nova senha não confere com a confirmação.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateSenha({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha });
      setForm({ senhaAtual: '', novaSenha: '', confirmar: '' });
      setMessage('Senha atualizada com sucesso.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Não foi possível atualizar a senha.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setDownloading(true);
    setMessage('');
    try {
      const response = await exportBackup();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-bellapro-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup exportado com sucesso.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao exportar backup.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <SectionCard title="Segurança da conta" icon={<Lock size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <Field
          label="Senha atual"
          value={form.senhaAtual}
          onChange={(value) => setForm((prev) => ({ ...prev, senhaAtual: value }))}
          type="password"
          icon={<Lock size={15} />}
        />

        <div className="grid gap-4 sm:p-6 md:grid-cols-2">
          <Field
            label="Nova senha"
            value={form.novaSenha}
            onChange={(value) => setForm((prev) => ({ ...prev, novaSenha: value }))}
            type="password"
            icon={<ShieldCheck size={15} />}
          />
          <Field
            label="Confirmar nova senha"
            value={form.confirmar}
            onChange={(value) => setForm((prev) => ({ ...prev, confirmar: value }))}
            type="password"
            icon={<Check size={15} />}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-white/5 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <InlineMessage text={message} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBackup}
              disabled={downloading}
              className="rounded-[1.3rem] border border-[#e29ba8]/20 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/78 transition hover:border-[#e29ba8]/32 hover:text-gray-900 dark:text-white disabled:opacity-50"
            >
              {downloading ? 'Gerando backup...' : 'Exportar backup'}
            </button>
            <PrimaryButton type="submit" loading={saving} label="Atualizar senha" />
          </div>
        </div>
      </form>
    </SectionCard>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="rounded-[2.6rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 md:p-8 shadow-[0_34px_80px_-40px_rgba(0,0,0,0.85)] md:p-10">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white dark:bg-[#1a171f] text-[#efbac2]">
          {icon}
        </div>
        <h2 className="text-3xl font-brand-display text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, icon, helper }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/44">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30">{icon}</span>}
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-[1.35rem] border border-gray-200 dark:border-white/5 bg-[#3a2c35] px-5 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#e29ba8]/32 focus:bg-[#3f303a]',
            icon && 'pl-14'
          )}
        />
      </div>
      {helper ? <p className="text-xs text-white/42">{helper}</p> : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/44">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.35rem] border border-gray-200 dark:border-white/5 bg-[#3a2c35] px-5 py-4 text-sm font-semibold text-white outline-none transition focus:border-[#e29ba8]/32"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/44">{label}</label>
      <div className="flex items-center gap-4 rounded-[1.35rem] border border-gray-200 dark:border-white/5 bg-[#3a2c35] px-4 py-3">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-14 rounded-xl bg-transparent" />
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-gray-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

function PermissionGrid({ title, items, activeItems, onToggle, getLabel, activeClassName }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/44">{title}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const active = activeItems.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={cn(
                'rounded-[1.25rem] border px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.16em] transition',
                active
                  ? activeClassName
                  : 'border-white/7 bg-white/[0.035] text-gray-200 dark:text-white/54 hover:border-[#e29ba8]/20 hover:text-white/72'
              )}
            >
              {getLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineMessage({ text }) {
  if (!text) return null;
  const success = /(sucesso|salva|salvo|atualizad|conectado|exportado)/i.test(text);
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-[1.2rem] border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
        success
          ? 'border-emerald-300/22 bg-emerald-400/10 text-emerald-200'
          : 'border-red-300/18 bg-red-400/10 text-red-200'
      )}
    >
      {success ? <Check size={14} /> : <AlertCircle size={14} />}
      {text}
    </div>
  );
}

function PrimaryButton({ loading, label, type = 'button', onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-[0_24px_60px_-28px_rgba(222,151,165,0.95)] transition hover:brightness-105 disabled:opacity-55"
    >
      {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
      {loading ? 'Processando...' : label}
    </button>
  );
}
