import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  saCriarSalao,
  saDeleteSalao,
  saEnviarComunicado,
  saEnviarCredenciais,
  saGetSalao,
  saGetSaloes,
  saImpersonar,
  saResetSenhaUsuario,
  saUpdateSalao,
} from '../../services/api';
import { formatDateInput } from '../../lib/utils';
import { setAdminSession } from '../../lib/session';
import { appendAuditTrail } from './superAdminData';

const PLANOS = ['basic', 'pro', 'enterprise'];
const STATUS_PLANO = ['trial', 'ativo', 'inadimplente', 'suspenso'];

const ALERTA_MAP = {
  trial_expirado: { label: 'Trial expirado', className: 'bg-amber-400/12 text-amber-100' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-400/12 text-red-200' },
  inativo: { label: 'Inativo', className: 'bg-white/8 text-white/60' },
  novo: { label: 'Novo', className: 'bg-emerald-400/12 text-emerald-200' },
};

const INITIAL_FORM = {
  nomeAdmin: '',
  email: '',
  senha: '',
  salaoNome: '',
  slug: '',
  plano: 'basic',
  telefone: '',
};

export default function SuperAdminSaloes() {
  const [saloes, setSaloes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [broadcast, setBroadcast] = useState({ assunto: '', mensagem: '', filtroPlano: '', filtroStatus: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const loadSaloes = useCallback(() => {
    saGetSaloes().then((response) => setSaloes(response.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    loadSaloes();
  }, [loadSaloes]);

  const filtered = useMemo(() => {
    return saloes.filter((salao) => {
      const matchesSearch =
        !search ||
        salao.nome.toLowerCase().includes(search.toLowerCase()) ||
        salao.slug.toLowerCase().includes(search.toLowerCase()) ||
        salao.adminEmail?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || salao.planoStatus === statusFilter;
      const matchesAlert = !alertFilter || salao.alertas.includes(alertFilter);

      return matchesSearch && matchesStatus && matchesAlert;
    });
  }, [alertFilter, saloes, search, statusFilter]);

  async function openDetail(id) {
    setLoadingDetail(true);
    try {
      const response = await saGetSalao(id);
      setDetail(response.data);
      setNote(response.data.notaInterna || '');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function updateField(field, value) {
    if (!detail) return;
    await saUpdateSalao(detail.id, { [field]: value });
    setDetail((prev) => ({ ...prev, [field]: value }));
    setSaloes((prev) => prev.map((item) => (item.id === detail.id ? { ...item, [field]: value } : item)));
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      await updateField('notaInterna', note);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setFormError('');
    try {
      const response = await saCriarSalao(form);
      const novoSalao = response.data.salao;
      setSaloes((prev) => [
        {
          ...novoSalao,
          adminEmail: response.data.credenciais.email,
          adminNome: form.nomeAdmin,
          stats: { profissionais: 0, clientes: 0, agendamentos: 0, servicos: 0, usuarios: 1 },
          onboarding: { conta: true, whatsapp: false, profissional: false, servico: false, agendamento: false },
          onboardingScore: 1,
          alertas: ['novo'],
        },
        ...prev,
      ]);
      setCredentialsModal({
        nomeSalao: form.salaoNome,
        nomeAdmin: form.nomeAdmin,
        email: response.data.credenciais.email,
        senha: response.data.credenciais.senha,
        loginUrl: response.data.credenciais.loginUrl,
      });
      appendAuditTrail({
        type: 'salon_created',
        actor: localStorage.getItem('sa_nome') || 'Super Admin',
        target: form.salaoNome,
        detail: `Nova unidade criada no plano ${form.plano}.`,
      });
      setForm(INITIAL_FORM);
      setCreateOpen(false);
    } catch (error) {
      setFormError(error.response?.data?.error || 'Não foi possível criar o salão.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    if (!window.confirm(`Excluir "${detail.nome}" permanentemente?`)) return;
    await saDeleteSalao(detail.id);
    appendAuditTrail({
      type: 'salon_deleted',
      actor: localStorage.getItem('sa_nome') || 'Super Admin',
      target: detail.nome,
      detail: 'Unidade excluída permanentemente.',
    });
    setSaloes((prev) => prev.filter((item) => item.id !== detail.id));
    setDetail(null);
  }

  async function handleImpersonate() {
    if (!detail) return;
    await saImpersonar(detail.id);
    appendAuditTrail({
      type: 'impersonation_started',
      actor: localStorage.getItem('sa_nome') || 'Super Admin',
      target: detail.nome,
      detail: 'Acesso por impersonação iniciado para painel do salão.',
    });
    setAdminSession({
      expiresAt: Date.now() + 15 * 60 * 1000,
      role: 'admin',
      profissionalId: '',
      permissions: [],
      actionPermissions: [],
    });
    window.open('/admin', '_blank');
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    await saResetSenhaUsuario(resetModal.usuarioId, { novaSenha: resetModal.novaSenha });
    appendAuditTrail({
      type: 'user_password_reset',
      actor: localStorage.getItem('sa_nome') || 'Super Admin',
      target: resetModal.email,
      detail: 'Senha de usuário administrativo redefinida.',
    });
    setResetModal(null);
    window.alert('Senha redefinida com sucesso.');
  }

  async function handleSendCredentials() {
    try {
      await saEnviarCredenciais(credentialsModal);
      appendAuditTrail({
        type: 'credentials_sent',
        actor: localStorage.getItem('sa_nome') || 'Super Admin',
        target: credentialsModal.email,
        detail: `Credenciais enviadas para ${credentialsModal.nomeSalao}.`,
      });
      window.alert('E-mail enviado com sucesso.');
    } catch (error) {
      window.alert(error.response?.data?.error || 'Erro ao enviar credenciais.');
    }
  }

  async function handleBroadcast(event) {
    event.preventDefault();
    if (!window.confirm('Enviar comunicado para os salões filtrados?')) return;
    setSendingBroadcast(true);
    try {
      const response = await saEnviarComunicado(broadcast);
      appendAuditTrail({
        type: 'campaign_sent',
        actor: localStorage.getItem('sa_nome') || 'Super Admin',
        target: broadcast.filtroPlano || broadcast.filtroStatus || 'base completa',
        detail: `Comunicado "${broadcast.assunto}" enviado em massa.`,
      });
      window.alert(`Comunicado enviado. Total: ${response.data.enviados}. Falhas: ${response.data.falhas}.`);
      setBroadcast({ assunto: '', mensagem: '', filtroPlano: '', filtroStatus: '' });
      setBroadcastOpen(false);
    } catch (error) {
      window.alert(error.response?.data?.error || 'Erro ao enviar comunicado.');
    } finally {
      setSendingBroadcast(false);
    }
  }

  function exportCsv() {
    window.open('/api/superadmin/saloes/exportar', '_blank');
  }

  function copy(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function copyCredentials() {
    if (!credentialsModal) return;
    copy(
      `Salao: ${credentialsModal.nomeSalao}\nEmail: ${credentialsModal.email}\nSenha: ${credentialsModal.senha}\nLogin: ${credentialsModal.loginUrl || `${window.location.origin}/admin/login`}`
    );
  }

  const totalAlerts = saloes.reduce((acc, salao) => acc + (salao.alertas?.length || 0), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="brand-kicker">Controle de expansão</p>
              <h1 className="mt-3 text-5xl font-brand-display text-white leading-none">Salões ativos</h1>
              <p className="mt-3 text-sm text-white/58">
                {saloes.length} unidades cadastradas {totalAlerts > 0 ? `· ${totalAlerts} alertas em monitoramento` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={exportCsv} className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/76">
                Exportar CSV
              </button>
              <button onClick={() => setBroadcastOpen(true)} className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/76">
                Comunicado
              </button>
              <button onClick={() => setCreateOpen(true)} className="rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Novo salão
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nome, slug ou e-mail"
              className="rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
            >
              <option value="">Todos os status</option>
              {STATUS_PLANO.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={alertFilter}
              onChange={(event) => setAlertFilter(event.target.value)}
              className="rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
            >
              <option value="">Todos os alertas</option>
              <option value="trial_expirado">Trial expirado</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="inativo">Inativo</option>
              <option value="novo">Novo</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-[2rem] border border-white/6 bg-[#231b22] px-6 py-12 text-center text-white/46">
              Nenhum salão encontrado com os filtros atuais.
            </div>
          )}

          {filtered.map((salao) => (
            <button
              key={salao.id}
              onClick={() => openDetail(salao.id)}
              className={`w-full rounded-[2rem] border p-5 text-left transition ${
                detail?.id === salao.id
                  ? 'border-[#e29ba8]/34 bg-[#2c222a]'
                  : 'border-white/6 bg-[#231b22] hover:border-[#e29ba8]/18'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${salao.ativo ? 'bg-emerald-400' : 'bg-white/28'}`} />
                    <p className="truncate text-lg font-semibold text-white">{salao.nome}</p>
                  </div>
                  <p className="mt-2 truncate text-sm text-white/48">/{salao.slug} · {salao.adminEmail || 'sem administrador'}</p>
                  <p className="mt-3 text-xs text-white/40">
                    {salao.stats?.profissionais || 0} profissionais · {salao.stats?.clientes || 0} clientes · {salao.stats?.agendamentos || 0} agendamentos
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(salao.alertas || []).map((alerta) => (
                    <span key={alerta} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${ALERTA_MAP[alerta]?.className || 'bg-white/8 text-white/60'}`}>
                      {ALERTA_MAP[alerta]?.label || alerta}
                    </span>
                  ))}
                  <span className="rounded-full bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#efbac2]">{salao.plano}</span>
                  <span className="rounded-full bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/64">{salao.planoStatus}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex gap-1">
                  {[
                    salao.onboarding?.conta,
                    salao.onboarding?.whatsapp,
                    salao.onboarding?.profissional,
                    salao.onboarding?.servico,
                    salao.onboarding?.agendamento,
                  ].map((step, index) => (
                    <span key={index} className={`h-1.5 flex-1 rounded-full ${step ? 'bg-[#de97a5]' : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-white/38">{salao.onboardingScore || 0}/5 etapas configuradas</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6">
        {loadingDetail && <p className="py-10 text-center text-white/50">Carregando detalhes...</p>}
        {!loadingDetail && !detail && <p className="py-10 text-center text-white/42">Selecione um salão para abrir o painel lateral.</p>}
        {!loadingDetail && detail && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full">
                <p className="brand-kicker">Painel da unidade</p>
                <input
                  type="text"
                  value={detail.nome}
                  onChange={(e) => setDetail((prev) => ({ ...prev, nome: e.target.value }))}
                  onBlur={() => updateField('nome', detail.nome)}
                  className="mt-2 w-full bg-transparent text-3xl font-brand-display text-white outline-none focus:border-b focus:border-white/20"
                />
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-white/48">/</span>
                  <input
                    type="text"
                    value={detail.slug}
                    onChange={(e) => setDetail((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    onBlur={() => updateField('slug', detail.slug)}
                    className="w-full bg-transparent text-sm text-white/48 outline-none focus:border-b focus:border-white/20"
                  />
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/38 transition hover:text-white">Fechar</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Profissionais" value={detail._count?.profissionais ?? 0} />
              <StatCard label="Clientes" value={detail._count?.clientes ?? 0} />
              <StatCard label="Agendamentos" value={detail._count?.agendamentos ?? 0} />
              <StatCard label="Serviços" value={detail._count?.servicos ?? 0} />
            </div>

            <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Faturamento acumulado</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {Number(detail.faturamentoTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            <div className="space-y-2">
              <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Conta ativa</span>
                  <button
                    onClick={() => updateField('ativo', !detail.ativo)}
                    className={`relative h-7 w-12 rounded-full transition ${detail.ativo ? 'bg-emerald-400' : 'bg-white/18'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${detail.ativo ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Módulo WhatsApp</span>
                  <button
                    onClick={() => updateField('moduloWhatsapp', !detail.moduloWhatsapp)}
                    className={`relative h-7 w-12 rounded-full transition ${detail.moduloWhatsapp ? 'bg-[#de97a5]' : 'bg-white/18'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${detail.moduloWhatsapp ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Módulo IA</span>
                  <button
                    onClick={() => updateField('moduloIA', !detail.moduloIA)}
                    className={`relative h-7 w-12 rounded-full transition ${detail.moduloIA ? 'bg-[#de97a5]' : 'bg-white/18'}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${detail.moduloIA ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Limite de Profissionais</p>
              <input
                type="number"
                min="1"
                value={detail.maxProfissionais || 5}
                onChange={(e) => setDetail((prev) => ({ ...prev, maxProfissionais: parseInt(e.target.value) || 1 }))}
                onBlur={() => updateField('maxProfissionais', detail.maxProfissionais)}
                className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Plano</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANOS.map((plano) => (
                  <button
                    key={plano}
                    onClick={() => updateField('plano', plano)}
                    className={`rounded-[1rem] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                      detail.plano === plano ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'
                    }`}
                  >
                    {plano}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Status do plano</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_PLANO.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateField('planoStatus', status)}
                    className={`rounded-[1rem] px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${
                      detail.planoStatus === status ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Usuários administradores</p>
              <div className="space-y-2">
                {(detail.usuarios || []).map((usuario) => (
                  <div key={usuario.id} className="rounded-[1.2rem] border border-white/6 bg-black/16 p-4">
                    <p className="text-sm font-semibold text-white">{usuario.nome || usuario.email}</p>
                    <p className="mt-1 text-xs text-white/48">{usuario.email}</p>
                    <button
                      onClick={() => setResetModal({ usuarioId: usuario.id, email: usuario.email, novaSenha: '' })}
                      className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#efbac2]"
                    >
                      Redefinir senha
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Nota interna</p>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Observações sobre operação, suporte ou risco."
                className="w-full rounded-[1.4rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
              />
              <button onClick={saveNote} disabled={savingNote} className="w-full rounded-[1.2rem] bg-white/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                {savingNote ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/52">
              {detail.telefone && <p>Telefone: {detail.telefone}</p>}
              {detail.endereco && <p>Endereço: {detail.endereco}</p>}
              <p>Criado em {new Date(detail.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="grid gap-3">
              <button onClick={handleImpersonate} className="rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Entrar como admin
              </button>
              <button onClick={handleDelete} className="rounded-[1.2rem] border border-red-300/16 bg-red-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-red-200">
                Excluir salão
              </button>
            </div>
          </div>
        )}
      </aside>

      {createOpen && (
        <ModalShell onClose={() => { setCreateOpen(false); setFormError(''); }}>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <p className="brand-kicker">Nova unidade</p>
              <h3 className="mt-2 text-3xl font-brand-display text-white">Criar salão</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nome do salão" value={form.salaoNome} onChange={(value) => setForm((prev) => ({ ...prev, salaoNome: value, slug: slugify(value) }))} required />
              <Input label="Slug" value={form.slug} onChange={(value) => setForm((prev) => ({ ...prev, slug: slugify(value) }))} required />
              <Input label="Nome do admin" value={form.nomeAdmin} onChange={(value) => setForm((prev) => ({ ...prev, nomeAdmin: value }))} required />
              <Input label="Telefone" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} />
              <Input label="E-mail do admin" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} required className="md:col-span-2" />
              <div className="md:col-span-2">
                <div className="flex items-end gap-3">
                  <Input label="Senha inicial" value={form.senha} onChange={(value) => setForm((prev) => ({ ...prev, senha: value }))} required className="flex-1" />
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, senha: generatePassword() }))} className="rounded-[1rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/76">
                    Gerar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Plano inicial</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANOS.map((plano) => (
                  <button
                    key={plano}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, plano }))}
                    className={`rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] ${form.plano === plano ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'}`}
                  >
                    {plano}
                  </button>
                ))}
              </div>
            </div>

            {formError && <div className="rounded-[1rem] border border-red-300/16 bg-red-400/10 px-4 py-3 text-sm text-red-200">{formError}</div>}

            <div className="flex gap-3">
              <button type="button" onClick={() => { setCreateOpen(false); setFormError(''); }} className="flex-1 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/76">
                Cancelar
              </button>
              <button type="submit" disabled={creating} className="flex-1 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {creating ? 'Criando...' : 'Criar salão'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {credentialsModal && (
        <ModalShell onClose={() => setCredentialsModal(null)}>
          <div className="space-y-5">
            <div>
              <p className="brand-kicker">Acesso inicial</p>
              <h3 className="mt-2 text-3xl font-brand-display text-white">Credenciais prontas</h3>
            </div>

            <div className="rounded-[1.8rem] border border-white/6 bg-black/16 p-5 space-y-4">
              <CredentialItem label="Salão" value={credentialsModal.nomeSalao} />
              <CredentialItem label="E-mail" value={credentialsModal.email} onCopy={() => copy(credentialsModal.email)} />
              <CredentialItem label="Senha" value={credentialsModal.senha} onCopy={() => copy(credentialsModal.senha)} mono />
              <CredentialItem label="Login" value={credentialsModal.loginUrl || `${window.location.origin}/admin/login`} onCopy={() => copy(credentialsModal.loginUrl || `${window.location.origin}/admin/login`)} />
            </div>

            <div className="flex gap-3">
              <button onClick={copyCredentials} className="flex-1 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/76">
                Copiar tudo
              </button>
              <button onClick={handleSendCredentials} className="flex-1 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Enviar por e-mail
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {resetModal && (
        <ModalShell onClose={() => setResetModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <p className="brand-kicker">Redefinição</p>
              <h3 className="mt-2 text-3xl font-brand-display text-white">Atualizar senha</h3>
              <p className="mt-2 text-sm text-white/48">{resetModal.email}</p>
            </div>

            <Input
              label="Nova senha"
              type="password"
              value={resetModal.novaSenha}
              onChange={(value) => setResetModal((prev) => ({ ...prev, novaSenha: value }))}
              required
            />

            <div className="flex gap-3">
              <button type="button" onClick={() => setResetModal(null)} className="flex-1 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/76">
                Cancelar
              </button>
              <button type="submit" className="flex-1 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Redefinir
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {broadcastOpen && (
        <ModalShell onClose={() => setBroadcastOpen(false)} wide>
          <form onSubmit={handleBroadcast} className="space-y-5">
            <div>
              <p className="brand-kicker">Comunicado em massa</p>
              <h3 className="mt-2 text-3xl font-brand-display text-white">Enviar comunicado</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Filtrar por plano"
                value={broadcast.filtroPlano}
                onChange={(value) => setBroadcast((prev) => ({ ...prev, filtroPlano: value }))}
                options={[{ value: '', label: 'Todos os planos' }, ...PLANOS.map((plano) => ({ value: plano, label: plano }))]}
              />
              <Select
                label="Filtrar por status"
                value={broadcast.filtroStatus}
                onChange={(value) => setBroadcast((prev) => ({ ...prev, filtroStatus: value }))}
                options={[{ value: '', label: 'Todos os status' }, ...STATUS_PLANO.map((status) => ({ value: status, label: status }))]}
              />
            </div>

            <Input label="Assunto" value={broadcast.assunto} onChange={(value) => setBroadcast((prev) => ({ ...prev, assunto: value }))} required />

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Mensagem</label>
              <textarea
                rows={6}
                value={broadcast.mensagem}
                onChange={(event) => setBroadcast((prev) => ({ ...prev, mensagem: event.target.value }))}
                className="w-full rounded-[1.4rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
                placeholder="Escreva o comunicado para as unidades filtradas."
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setBroadcastOpen(false)} className="flex-1 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/76">
                Cancelar
              </button>
              <button type="submit" disabled={sendingBroadcast} className="flex-1 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                {sendingBroadcast ? 'Enviando...' : 'Enviar comunicado'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({ children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/82 p-3 backdrop-blur-md sm:p-4">
      <div className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-white/8 bg-[#231b22] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] ${wide ? 'max-w-2xl' : 'max-w-xl'}`}>
        <div className="mb-0 flex shrink-0 justify-end border-b border-white/8 px-6 py-4">
          <button onClick={onClose} className="text-sm text-white/46 transition hover:text-white">Fechar</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
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

function StatCard({ label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-white/6 bg-black/16 p-4 text-center">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{label}</p>
    </div>
  );
}

function CredentialItem({ label, value, onCopy, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{label}</p>
        <p className={`mt-1 truncate text-sm text-white ${mono ? 'font-mono text-[#efbac2]' : 'font-semibold'}`}>{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/74">
          Copiar
        </button>
      )}
    </div>
  );
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
