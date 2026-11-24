import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  API_BASE_URL,
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
import { setAdminSession } from '../../lib/session';
import { appendAuditTrail } from './superAdminData';

const PLANOS = ['basic', 'pro', 'enterprise'];
const STATUS_PLANO = ['trial', 'ativo', 'inadimplente', 'suspenso'];

const ALERTA_MAP = {
  trial_expirado: { label: 'Trial expirado', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  inadimplente: { label: 'Inadimplente', className: 'border border-rose-200 bg-rose-50 text-rose-700' },
  inativo: { label: 'Inativo', className: 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761]' },
  novo: { label: 'Novo', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
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
    window.open(`${API_BASE_URL}/superadmin/saloes/exportar`, '_blank');
  }

  function copy(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function copyCredentials() {
    if (!credentialsModal) return;
    copy(
      `Salão: ${credentialsModal.nomeSalao}\nEmail: ${credentialsModal.email}\nSenha: ${credentialsModal.senha}\nLogin: ${credentialsModal.loginUrl || `${window.location.origin}/admin/login`}`
    );
  }

  const totalAlerts = saloes.reduce((acc, salao) => acc + (salao.alertas?.length || 0), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Controle de expansão</p>
              <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
                Salões ativos
              </h1>
              <p className="mt-1.5 text-sm text-[#6B5761]">
                {saloes.length} unidades cadastradas {totalAlerts > 0 ? `· ${totalAlerts} alertas em monitoramento` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button onClick={exportCsv} className="rounded-xl border border-[#E2D5DA] bg-white px-4 py-2.5 text-xs font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]">
                Exportar CSV
              </button>
              <button onClick={() => setBroadcastOpen(true)} className="rounded-xl border border-[#E2D5DA] bg-white px-4 py-2.5 text-xs font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]">
                Comunicado
              </button>
              <button onClick={() => setCreateOpen(true)} className="rounded-xl bg-[#B84C6B] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#9E3E5A]">
                Novo salão
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_165px_165px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nome, slug ou e-mail"
              className="rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
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
              className="rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
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
            <div className="rounded-3xl border border-[#EAE1E4] bg-white px-6 py-12 text-center text-sm text-[#6B5761]">
              Nenhum salão encontrado com os filtros atuais.
            </div>
          )}

          {filtered.map((salao) => (
            <button
              key={salao.id}
              onClick={() => openDetail(salao.id)}
              className={`w-full rounded-3xl border p-5 text-left transition ${
                detail?.id === salao.id
                  ? 'border-[#B84C6B] bg-[#FDF7F9] ring-1 ring-[#B84C6B]/15'
                  : 'border-[#EAE1E4] bg-white hover:border-[#D9C6CE]'
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${salao.ativo ? 'bg-emerald-500' : 'bg-[#C9BAC1]'}`} />
                    <p className="truncate text-base font-bold text-[#23141C]">{salao.nome}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#6B5761]">/{salao.slug} · {salao.adminEmail || 'sem administrador'}</p>
                  <p className="mt-2 text-xs text-[#8E7682]">
                    {salao.stats?.profissionais || 0} profissionais · {salao.stats?.clientes || 0} clientes · {salao.stats?.agendamentos || 0} agendamentos
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(salao.alertas || []).map((alerta) => (
                    <span key={alerta} className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${ALERTA_MAP[alerta]?.className || 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761]'}`}>
                      {ALERTA_MAP[alerta]?.label || alerta}
                    </span>
                  ))}
                  <span className="rounded-full border border-[#F0D5DE] bg-[#FDF7F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B84C6B]">{salao.plano}</span>
                  <span className="rounded-full border border-[#EAE1E4] bg-[#FAF7F5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B5761]">{salao.planoStatus}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex gap-1.5">
                  {[
                    salao.onboarding?.conta,
                    salao.onboarding?.whatsapp,
                    salao.onboarding?.profissional,
                    salao.onboarding?.servico,
                    salao.onboarding?.agendamento,
                  ].map((step, index) => (
                    <span key={index} className={`h-1.5 flex-1 rounded-full ${step ? 'bg-[#B84C6B]' : 'bg-[#EFE7EA]'}`} />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-[#8E7682]">{salao.onboardingScore || 0}/5 etapas configuradas</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
        {loadingDetail && <p className="py-10 text-center text-sm text-[#6B5761]">Carregando detalhes...</p>}
        {!loadingDetail && !detail && <p className="py-10 text-center text-sm text-[#8E7682]">Selecione um salão para abrir o painel lateral.</p>}
        {!loadingDetail && detail && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#EFE7EA] pb-4">
              <div className="w-full min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Painel da unidade</p>
                <input
                  type="text"
                  value={detail.nome}
                  onChange={(e) => setDetail((prev) => ({ ...prev, nome: e.target.value }))}
                  onBlur={() => updateField('nome', detail.nome)}
                  className="mt-1 w-full bg-transparent font-brand-display text-2xl font-semibold text-[#23141C] outline-none focus:border-b focus:border-[#B84C6B]"
                />
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-[#8E7682]">/</span>
                  <input
                    type="text"
                    value={detail.slug}
                    onChange={(e) => setDetail((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    onBlur={() => updateField('slug', detail.slug)}
                    className="w-full bg-transparent text-xs text-[#6B5761] outline-none focus:border-b focus:border-[#B84C6B]"
                  />
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-xs font-bold text-[#8E7682] transition hover:text-[#23141C]">Fechar</button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="Profissionais" value={detail._count?.profissionais ?? 0} />
              <StatCard label="Clientes" value={detail._count?.clientes ?? 0} />
              <StatCard label="Agendamentos" value={detail._count?.agendamentos ?? 0} />
              <StatCard label="Serviços" value={detail._count?.servicos ?? 0} />
            </div>

            <div className="rounded-2xl bg-[#23141C] p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Faturamento acumulado</p>
              <p className="mt-1.5 text-2xl font-bold">
                {Number(detail.faturamentoTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            <div className="space-y-2">
              <SwitchRow label="Conta ativa" checked={!!detail.ativo} onToggle={() => updateField('ativo', !detail.ativo)} tone="emerald" />
              <SwitchRow label="Módulo WhatsApp" checked={!!detail.moduloWhatsapp} onToggle={() => updateField('moduloWhatsapp', !detail.moduloWhatsapp)} />
              <SwitchRow label="Módulo IA" checked={!!detail.moduloIA} onToggle={() => updateField('moduloIA', !detail.moduloIA)} />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Limite de Profissionais</p>
              <input
                type="number"
                min="1"
                value={detail.maxProfissionais || 5}
                onChange={(e) => setDetail((prev) => ({ ...prev, maxProfissionais: parseInt(e.target.value, 10) || 1 }))}
                onBlur={() => updateField('maxProfissionais', detail.maxProfissionais)}
                className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none focus:border-[#B84C6B] focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Plano</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANOS.map((plano) => (
                  <button
                    key={plano}
                    onClick={() => updateField('plano', plano)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                      detail.plano === plano ? 'bg-[#23141C] text-white' : 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761] hover:text-[#23141C]'
                    }`}
                  >
                    {plano}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Status do plano</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_PLANO.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateField('planoStatus', status)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                      detail.planoStatus === status ? 'bg-[#B84C6B] text-white' : 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761] hover:text-[#23141C]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Usuários administradores</p>
              <div className="space-y-2">
                {(detail.usuarios || []).map((usuario) => (
                  <div key={usuario.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-3.5">
                    <p className="text-sm font-bold text-[#23141C]">{usuario.nome || usuario.email}</p>
                    <p className="mt-0.5 text-xs text-[#6B5761]">{usuario.email}</p>
                    <button
                      onClick={() => setResetModal({ usuarioId: usuario.id, email: usuario.email, novaSenha: '' })}
                      className="mt-2 text-xs font-bold text-[#B84C6B] hover:underline"
                    >
                      Redefinir senha
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Nota interna</p>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Observações sobre operação, suporte ou risco."
                className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white"
              />
              <button onClick={saveNote} disabled={savingNote} className="w-full rounded-xl border border-[#E2D5DA] bg-white px-4 py-2.5 text-xs font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]">
                {savingNote ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>

            <div className="space-y-1 text-xs text-[#6B5761]">
              {detail.telefone && <p>Telefone: {detail.telefone}</p>}
              {detail.endereco && <p>Endereço: {detail.endereco}</p>}
              <p>Criado em {new Date(detail.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="grid gap-2.5 pt-2">
              <button onClick={handleImpersonate} className="rounded-xl bg-[#23141C] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#3A222E]">
                Entrar como admin
              </button>
              <button onClick={handleDelete} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100">
                Excluir salão
              </button>
            </div>
          </div>
        )}
      </aside>

      {createOpen && (
        <ModalShell onClose={() => { setCreateOpen(false); setFormError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Nova unidade</p>
              <h3 className="mt-1 font-brand-display text-2xl font-semibold text-[#23141C]">Criar salão</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Nome do salão" value={form.salaoNome} onChange={(value) => setForm((prev) => ({ ...prev, salaoNome: value, slug: slugify(value) }))} required />
              <Input label="Slug" value={form.slug} onChange={(value) => setForm((prev) => ({ ...prev, slug: slugify(value) }))} required />
              <Input label="Nome do admin" value={form.nomeAdmin} onChange={(value) => setForm((prev) => ({ ...prev, nomeAdmin: value }))} required />
              <Input label="Telefone" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} />
              <Input label="E-mail do admin" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} required className="md:col-span-2" />
              <div className="md:col-span-2">
                <div className="flex items-end gap-2.5">
                  <Input label="Senha inicial" value={form.senha} onChange={(value) => setForm((prev) => ({ ...prev, senha: value }))} required className="flex-1" />
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, senha: generatePassword() }))} className="rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-xs font-bold text-[#23141C] transition hover:border-[#B84C6B]">
                    Gerar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Plano inicial</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANOS.map((plano) => (
                  <button
                    key={plano}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, plano }))}
                    className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase ${form.plano === plano ? 'bg-[#23141C] text-white' : 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761]'}`}
                  >
                    {plano}
                  </button>
                ))}
              </div>
            </div>

            {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setCreateOpen(false); setFormError(''); }} className="flex-1 rounded-xl border border-[#E2D5DA] bg-white px-4 py-3 text-xs font-bold text-[#23141C]">
                Cancelar
              </button>
              <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-[#B84C6B] px-4 py-3 text-xs font-bold text-white hover:bg-[#9E3E5A]">
                {creating ? 'Criando...' : 'Criar salão'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {credentialsModal && (
        <ModalShell onClose={() => setCredentialsModal(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Acesso inicial</p>
              <h3 className="mt-1 font-brand-display text-2xl font-semibold text-[#23141C]">Credenciais prontas</h3>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-5">
              <CredentialItem label="Salão" value={credentialsModal.nomeSalao} />
              <CredentialItem label="E-mail" value={credentialsModal.email} onCopy={() => copy(credentialsModal.email)} />
              <CredentialItem label="Senha" value={credentialsModal.senha} onCopy={() => copy(credentialsModal.senha)} mono />
              <CredentialItem label="Login" value={credentialsModal.loginUrl || `${window.location.origin}/admin/login`} onCopy={() => copy(credentialsModal.loginUrl || `${window.location.origin}/admin/login`)} />
            </div>

            <div className="flex gap-3">
              <button onClick={copyCredentials} className="flex-1 rounded-xl border border-[#E2D5DA] bg-white px-4 py-3 text-xs font-bold text-[#23141C]">
                Copiar tudo
              </button>
              <button onClick={handleSendCredentials} className="flex-1 rounded-xl bg-[#B84C6B] px-4 py-3 text-xs font-bold text-white hover:bg-[#9E3E5A]">
                Enviar por e-mail
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {resetModal && (
        <ModalShell onClose={() => setResetModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Redefinição</p>
              <h3 className="mt-1 font-brand-display text-2xl font-semibold text-[#23141C]">Atualizar senha</h3>
              <p className="mt-1 text-sm text-[#6B5761]">{resetModal.email}</p>
            </div>

            <Input
              label="Nova senha"
              type="password"
              value={resetModal.novaSenha}
              onChange={(value) => setResetModal((prev) => ({ ...prev, novaSenha: value }))}
              required
            />

            <div className="flex gap-3">
              <button type="button" onClick={() => setResetModal(null)} className="flex-1 rounded-xl border border-[#E2D5DA] bg-white px-4 py-3 text-xs font-bold text-[#23141C]">
                Cancelar
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-[#B84C6B] px-4 py-3 text-xs font-bold text-white hover:bg-[#9E3E5A]">
                Redefinir
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {broadcastOpen && (
        <ModalShell onClose={() => setBroadcastOpen(false)} wide>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Comunicado em massa</p>
              <h3 className="mt-1 font-brand-display text-2xl font-semibold text-[#23141C]">Enviar comunicado</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Mensagem</label>
              <textarea
                rows={5}
                value={broadcast.mensagem}
                onChange={(event) => setBroadcast((prev) => ({ ...prev, mensagem: event.target.value }))}
                className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3 text-sm text-[#23141C] outline-none placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white"
                placeholder="Escreva o comunicado para as unidades filtradas."
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setBroadcastOpen(false)} className="flex-1 rounded-xl border border-[#E2D5DA] bg-white px-4 py-3 text-xs font-bold text-[#23141C]">
                Cancelar
              </button>
              <button type="submit" disabled={sendingBroadcast} className="flex-1 rounded-xl bg-[#B84C6B] px-4 py-3 text-xs font-bold text-white hover:bg-[#9E3E5A]">
                {sendingBroadcast ? 'Enviando...' : 'Enviar comunicado'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function SwitchRow({ label, checked, onToggle, tone = 'rose' }) {
  const activeBg = tone === 'emerald' ? 'bg-emerald-500' : 'bg-[#B84C6B]';
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-4 py-3">
      <span className="text-sm font-semibold text-[#23141C]">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition ${checked ? activeBg : 'bg-[#D5C9CE]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function ModalShell({ children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[#23141C]/50 p-3 sm:p-4">
      <div className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl border border-[#EAE1E4] bg-white shadow-xl ${wide ? 'max-w-2xl' : 'max-w-xl'}`}>
        <div className="flex shrink-0 justify-end border-b border-[#EFE7EA] px-6 py-3.5">
          <button onClick={onClose} className="text-xs font-bold text-[#8E7682] transition hover:text-[#23141C]">Fechar</button>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
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
    <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-3.5 text-center">
      <p className="text-xl font-bold text-[#23141C]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">{label}</p>
    </div>
  );
}

function CredentialItem({ label, value, onCopy, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8E7682]">{label}</p>
        <p className={`mt-0.5 truncate text-sm text-[#23141C] ${mono ? 'font-mono font-bold text-[#B84C6B]' : 'font-semibold'}`}>{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="shrink-0 rounded-lg border border-[#E2D5DA] bg-white px-3 py-1.5 text-[11px] font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]">
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
