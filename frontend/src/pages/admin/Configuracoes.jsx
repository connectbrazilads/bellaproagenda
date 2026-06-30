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
  X,
  Plus,
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
  getWhatsappStatus,
  updateAdminSalao,
  updateUsuario,
  updateSenha,
} from '../../services/api';
import ImageUpload from '../../components/ImageUpload';
import SnippetsConfig from '../../components/SnippetsConfig';
import { cn } from '../../lib/utils';
import useElementWidth from '../../hooks/useElementWidth';
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
  'agenda.ver_colegas',
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
  const pageRef = useRef(null);
  const [activeTab, setActiveTab] = useState('salao');
  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const showRail = pageWidth >= 1320;

  return (
    <motion.div
      ref={pageRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Store className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Configurações Gerais</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Painel de <span className="text-[#d48997]">Configurações</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Ajuste a identidade visual da sua marca, as permissões da equipe de colaboradores e controle os logs do sistema.
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <div className={cn('grid gap-8', showRail ? 'lg:grid-cols-[260px,1fr]' : 'grid-cols-1')}>
        {/* Navigation Tabs */}
        <aside className={cn(showRail ? 'space-y-2.5' : 'flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1')}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
                  showRail ? 'w-full justify-between' : 'whitespace-nowrap',
                  active
                    ? 'border-[#d48997] bg-[#d48997]/5 text-[#d48997] shadow-sm'
                    : 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md text-gray-600 dark:text-gray-400 hover:border-black/[0.08] dark:hover:border-white/[0.08]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', active ? 'bg-[#d48997]/10 text-[#d48997]' : 'bg-black/[0.04] dark:bg-white/5')}>
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-semibold">{tab.label}</span>
                </div>
                {showRail && (
                  <ChevronRight
                    size={14}
                    className={cn(
                      'text-gray-400 dark:text-gray-600 transition-transform',
                      active && 'text-[#d48997] translate-x-0.5'
                    )}
                  />
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
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
    <SectionCard title="Informações da Unidade" icon={<Store size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Nome do Salão"
            value={salao.nome}
            onChange={(value) => setSalao((prev) => ({ ...prev, nome: value }))}
            icon={<Store size={14} />}
          />
          <Field
            label="Telefone de Contato"
            value={salao.telefone}
            onChange={(value) => setSalao((prev) => ({ ...prev, telefone: value }))}
            icon={<Smartphone size={14} />}
          />
        </div>

        <Field
          label="Endereço Completo"
          value={salao.endereco}
          onChange={(value) => setSalao((prev) => ({ ...prev, endereco: value }))}
          icon={<Globe size={14} />}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="WhatsApp Business"
            value={salao.whatsapp}
            onChange={(value) => setSalao((prev) => ({ ...prev, whatsapp: value }))}
            placeholder="Ex: 5511999999999"
            icon={<Zap size={14} />}
          />

          <Field
            label="WhatsApp para Alertas de Agendamento"
            value={salao.whatsappAgendamentos}
            onChange={(value) => setSalao((prev) => ({ ...prev, whatsappAgendamentos: value }))}
            placeholder="Ex: 5511999999999"
            helper="Se mantido em branco, o sistema utilizará o número principal."
            icon={<MessageSquare size={14} />}
          />
        </div>

        <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] p-4 bg-gray-50/50 dark:bg-white/[0.01]">
          <ImageUpload
            label="Logotipo da Unidade"
            value={salao.logoUrl}
            onChange={(value) => setSalao((prev) => ({ ...prev, logoUrl: value }))}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-black/[0.03] dark:border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <InlineMessage text={message} />
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleBackup}
              disabled={downloading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition disabled:opacity-55"
            >
              {downloading ? 'Gerando backup...' : 'Exportar Backup'}
            </button>
            <PrimaryButton type="submit" loading={saving} label="Salvar Dados" />
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
    <SectionCard title="Branding & Atmosfera" icon={<Palette size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <ColorField
            label="Cor Principal (Accent)"
            value={salao.corPrimaria || '#e29ba8'}
            onChange={(value) => setSalao((prev) => ({ ...prev, corPrimaria: value }))}
          />
          <ColorField
            label="Cor de Suporte"
            value={salao.corSecundaria || '#3b2a35'}
            onChange={(value) => setSalao((prev) => ({ ...prev, corSecundaria: value }))}
          />
        </div>

        <Field
          label="Headline do Banner da Agenda"
          value={salao.bannerTexto}
          onChange={(value) => setSalao((prev) => ({ ...prev, bannerTexto: value }))}
          icon={<ImageIcon size={14} />}
          placeholder="Ex: Agende seu momento de cuidado e sofisticação."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {['dark', 'light'].map((theme) => {
            const active = salao.tema === theme;
            return (
              <button
                key={theme}
                type="button"
                onClick={() => setSalao((prev) => ({ ...prev, tema: theme }))}
                className={cn(
                  'rounded-xl border p-5 text-left transition-all',
                  active
                    ? 'border-[#d48997] bg-[#d48997]/5 shadow-sm'
                    : 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] hover:border-black/[0.08] dark:hover:border-white/[0.08]'
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d48997]">
                  {theme === 'dark' ? 'Tema Escuro (Premium)' : 'Tema Claro (Editorial)'}
                </span>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  {theme === 'dark'
                    ? 'Superfícies profundas e escuras com contrastes suaves de alto requinte.'
                    : 'Superfícies limpas e brancas que evocam bem-estar e sofisticação natural.'}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] p-4 bg-gray-50/50 dark:bg-white/[0.01]">
          <ImageUpload
            label="Banner Hero (Imagem Principal)"
            value={salao.bannerUrl}
            onChange={(value) => setSalao((prev) => ({ ...prev, bannerUrl: value }))}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-black/[0.03] dark:border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <InlineMessage text={message} />
          <PrimaryButton type="submit" loading={saving} label="Salvar Branding" />
        </div>
      </form>
    </SectionCard>
  );
}

function SecaoWhatsapp() {
  const [status, setStatus] = useState('not_configured');
  const [qr, setQr] = useState('');
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
      const salaoRes = await getAdminSalao();
      setSalao(salaoRes.data);
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

  const statusBadge = useMemo(() => {
    const map = {
      not_configured: { label: 'Aguardando Ativação', className: 'bg-black/[0.04] dark:bg-white/[0.04] text-gray-500' },
      not_created: { label: 'Pronto para Conectar', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      open: { label: 'WhatsApp Conectado', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
      connecting: { label: 'Aguardando Leitura QR Code', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
      close: { label: 'WhatsApp Desconectado', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
      error: { label: 'Falha de Conexão', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
    };
    return map[status] || map.not_configured;
  }, [status]);

  return (
    <SectionCard title="Integração WhatsApp & IA" icon={<Bot size={18} />}>
      {(!salao?.moduloWhatsapp || !salao?.moduloIA) && (
        <div className="mb-6 rounded-2xl border border-[#d48997]/25 bg-gradient-to-br from-[#d48997]/5 to-transparent p-6 text-center shadow-sm">
          <Bot size={32} className="mx-auto text-[#d48997] mb-3" />
          <h3 className="font-serif text-base font-semibold text-gray-900 dark:text-white mb-1">Módulo Automação Bloqueado</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            As notificações por WhatsApp e respostas com Inteligência Artificial estão inativas no seu plano. Entre em contato para assinar o módulo BellaPro Automação.
          </p>
        </div>
      )}

      {salao?.moduloWhatsapp && (
        <div className="space-y-6">
          <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">Ativação Simples</span>
            <h4 className="mt-1 font-semibold text-sm text-gray-900 dark:text-white">Conexão em poucos segundos</h4>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Clique no botão de conexão e faça a leitura do QR Code com o aplicativo WhatsApp de sua empresa (ou aparelhos adicionais). A inteligência do sistema assume o disparo de confirmações imediatamente.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status do Serviço</span>
              <div className={cn('mt-1.5 inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', statusBadge.className)}>
                {statusBadge.label}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {status === 'open' ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-4 text-xs font-semibold transition disabled:opacity-50"
                >
                  {disconnecting ? 'Desconectando...' : 'Desconectar Dispositivo'}
                </button>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={handleConnect}
                  loading={connecting}
                  label="Conectar Celular"
                />
              )}
            </div>
          </div>

          {status === 'connecting' && qr && (
            <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#111113] p-6 text-center space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d48997]">Abra o WhatsApp &gt; Dispositivos Conectados</span>
              <img src={qr} alt="QR Code WhatsApp" className="mx-auto w-48 rounded-xl bg-white p-3 border border-black/10" />
            </div>
          )}
          
          <InlineMessage text={message} />
        </div>
      )}
    </SectionCard>
  );
}

function SecaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(INITIAL_USER);
  const [editingUserId, setEditingUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

  function handleStartCreate() {
    setEditingUserId(null);
    setMessage('');
    setForm(INITIAL_USER);
    setModalOpen(true);
  }

  function handleStartEdit(usuario) {
    setEditingUserId(usuario.id);
    setMessage('');
    setForm({
      nome: usuario.nome || '',
      email: usuario.email || '',
      senha: '',
      role: usuario.role || 'profissional',
      profissionalId: usuario.profissionalId || '',
      permissions: [...(usuario.permissions || DEFAULT_ROLE_PERMISSIONS[usuario.role] || [])],
      actionPermissions: [...(usuario.actionPermissions || DEFAULT_ROLE_ACTION_PERMISSIONS[usuario.role] || [])],
    });
    setModalOpen(true);
  }

  function handleCancelEdit() {
    setEditingUserId(null);
    setMessage('');
    setForm(INITIAL_USER);
    setModalOpen(false);
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
      if (editingUserId) {
        await updateUsuario(editingUserId, form);
        setMessage('Acesso atualizado com sucesso.');
      } else {
        await createUsuario(form);
        setMessage('Acesso criado com sucesso.');
      }
      setEditingUserId(null);
      setForm(INITIAL_USER);
      setModalOpen(false);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.error || (editingUserId ? 'Não foi possível atualizar o acesso.' : 'Não foi possível criar o acesso.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deseja remover este acesso de login?')) return;
    try {
      await deleteUsuario(id);
      if (editingUserId === id) {
        handleCancelEdit();
      }
      await loadData();
    } catch {
      setMessage('Não foi possível remover o acesso.');
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Usuários com Acesso à Unidade"
        icon={<Users size={18} />}
        action={
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            <Plus className="h-4 w-4" /> Novo Login
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-black/[0.04] dark:border-white/5 custom-scrollbar text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr className="text-gray-400 dark:text-gray-500">
                <th className="px-5 py-3.5 font-semibold">Nome / Login</th>
                <th className="px-5 py-3.5 font-semibold">Perfil</th>
                <th className="px-5 py-3.5 font-semibold">Escopo de Acesso</th>
                <th className="px-5 py-3.5 text-right font-semibold">Operações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/5">
              {usuarios.map((u) => (
                <tr key={u.id} className="text-gray-700 dark:text-gray-300 hover:bg-black/[0.005]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{u.nome}</p>
                    <p className="text-xs text-gray-450 dark:text-gray-500 mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-lg bg-black/[0.04] dark:bg-white/5 px-2.5 py-1 font-semibold text-[10px] uppercase text-[#d48997]">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {u.permissions?.length || 0} abas · {u.actionPermissions?.length || 0} ações
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/10 px-3 font-semibold hover:text-[#d48997] hover:border-[#d48997] transition"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-3 font-semibold transition"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    Nenhum acesso de login cadastrado nesta unidade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Modal Cadastro/Edição de Usuários */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelEdit}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#18181b] shadow-xl"
            >
              <form onSubmit={handleSubmit} className="flex flex-col max-h-[85dvh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">
                        Acesso de Login
                      </span>
                      <h2 className="mt-0.5 font-serif text-lg font-normal text-gray-900 dark:text-white">
                        {editingUserId ? 'Editar Acesso de Login' : 'Cadastrar Novo Login'}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto px-6 py-6 space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Nome Completo"
                      value={form.nome}
                      onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))}
                      icon={<User size={14} />}
                    />
                    <Field
                      label="E-mail de Login"
                      value={form.email}
                      onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                      icon={<Globe size={14} />}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <Field
                      label={editingUserId ? 'Nova Senha (Opcional)' : 'Senha de Login'}
                      value={form.senha}
                      onChange={(value) => setForm((prev) => ({ ...prev, senha: value }))}
                      type="password"
                      icon={<Lock size={14} />}
                      helper={editingUserId ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'}
                    />

                    <SelectField
                      label="Perfil de Usuário"
                      value={form.role}
                      onChange={handleRoleChange}
                      options={[
                        { value: 'gestor', label: 'Gestor (Acesso Amplo)' },
                        { value: 'recepcao', label: 'Recepção' },
                        { value: 'profissional', label: 'Profissional da Equipe' },
                      ]}
                    />

                    <SelectField
                      label="Profissional Vinculado"
                      value={form.profissionalId}
                      onChange={(value) => setForm((prev) => ({ ...prev, profissionalId: value }))}
                      options={[
                        { value: '', label: 'Sem vínculo (Uso geral)' },
                        ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
                      ]}
                    />
                  </div>

                  <PermissionGrid
                    title="Abas e Módulos do Sistema Habilitados"
                    items={AVAILABLE_PERMISSIONS}
                    activeItems={form.permissions}
                    getLabel={(permission) => PERMISSION_LABELS[permission] || permission}
                    onToggle={togglePermission}
                    activeClassName="border-[#d48997] bg-[#d48997]/5 text-[#d48997]"
                  />

                  {form.permissions.includes('agenda.ver_colegas') && (
                    <div className="rounded-xl border border-[#d48997]/20 bg-[#d48997]/5 p-3.5 text-xs text-[#d48997] font-medium">
                      Nota: Para que o colaborador marque na agenda de colegas, garanta que a ação <strong>Criar agendamentos</strong> também esteja habilitada abaixo.
                    </div>
                  )}

                  <PermissionGrid
                    title="Ações e Operações Autorizadas"
                    items={AVAILABLE_ACTIONS}
                    activeItems={form.actionPermissions}
                    getLabel={(permission) => ACTION_PERMISSION_LABELS[permission] || permission}
                    onToggle={toggleAction}
                    activeClassName="border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] px-6 py-4">
                  <div className="max-w-[50%]">
                    <InlineMessage text={message} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="h-10 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                      Cancelar
                    </button>
                    <PrimaryButton type="submit" loading={saving} label={editingUserId ? 'Salvar Acesso' : 'Criar Acesso'} />
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <SectionCard title="Auditoria de Ações" icon={<ShieldCheck size={18} />}>
      <div className="space-y-3.5">
        {loading && <p className="text-xs text-gray-400">Carregando logs de auditoria...</p>}
        {!loading && logs.length === 0 && <p className="text-xs text-gray-400">Nenhum evento auditado até o momento.</p>}
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 text-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-semibold uppercase text-[#d48997] tracking-wide">{log.acao}</span>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{log.mensagem || log.entidade}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {log.usuario?.nome || log.usuario?.email || 'Sistema'} · {new Date(log.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex rounded-lg px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider self-start',
                  log.status === 'failed' || log.severity === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : log.severity === 'warning'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
    <SectionCard title="Segurança da Conta" icon={<Lock size={18} />}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Field
          label="Senha Atual"
          value={form.senhaAtual}
          onChange={(value) => setForm((prev) => ({ ...prev, senhaAtual: value }))}
          type="password"
          icon={<Lock size={14} />}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Nova Senha"
            value={form.novaSenha}
            onChange={(value) => setForm((prev) => ({ ...prev, novaSenha: value }))}
            type="password"
            icon={<ShieldCheck size={14} />}
          />
          <Field
            label="Confirmar Nova Senha"
            value={form.confirmar}
            onChange={(value) => setForm((prev) => ({ ...prev, confirmar: value }))}
            type="password"
            icon={<Check size={14} />}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-black/[0.03] dark:border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <InlineMessage text={message} />
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleBackup}
              disabled={downloading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition disabled:opacity-55"
            >
              {downloading ? 'Gerando backup...' : 'Exportar Backup'}
            </button>
            <PrimaryButton type="submit" loading={saving} label="Atualizar Senha" />
          </div>
        </div>
      </form>
    </SectionCard>
  );
}

function SectionCard({ title, icon, children, action }) {
  return (
    <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between border-b border-black/[0.03] dark:border-white/5 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
            {icon}
          </div>
          <h2 className="font-serif text-lg font-normal text-gray-900 dark:text-white leading-none">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, icon, helper }) {
  return (
    <div className="space-y-1.5 w-full">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type={type}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full h-11 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-450',
            icon && 'pl-10'
          )}
        />
      </div>
      {helper && <p className="text-[10px] text-gray-400">{helper}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5 w-full">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white dark:bg-[#18181b]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5 w-full">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 py-1.5 h-11">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-12 rounded-lg bg-transparent border-0 cursor-pointer" />
        <span className="font-mono text-xs font-semibold uppercase text-gray-800 dark:text-zinc-200">{value}</span>
      </div>
    </div>
  );
}

function PermissionGrid({ title, items, activeItems, onToggle, getLabel, activeClassName }) {
  return (
    <div className="space-y-2.5">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{title}</span>
      <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item) => {
          const active = activeItems.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={cn(
                'rounded-xl border p-3.5 text-left text-[10px] font-semibold transition-all',
                active
                  ? activeClassName
                  : 'border-black/[0.06] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] text-gray-500 dark:text-gray-400 hover:border-black/[0.12] dark:hover:border-white/[0.12]'
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
        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-semibold',
        success
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/20 bg-red-500/5 text-red-500'
      )}
    >
      {success ? <Check size={13} /> : <AlertCircle size={13} />}
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
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 text-xs font-semibold shadow-sm transition disabled:opacity-55"
    >
      {loading ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
      {loading ? 'Salvando...' : label}
    </button>
  );
}
