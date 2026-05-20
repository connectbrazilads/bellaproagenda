import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// SUPER ADMIN
export const saLogin = (data) => api.post('/superadmin/login', data);
export const saGetMetricas = () => api.get('/superadmin/metricas');
export const saGetSaloes = () => api.get('/superadmin/saloes');
export const saCriarSalao = (data) => api.post('/superadmin/saloes', data);
export const saGetSalao = (id) => api.get(`/superadmin/saloes/${id}`);
export const saUpdateSalao = (id, data) => api.put(`/superadmin/saloes/${id}`, data);
export const saDeleteSalao = (id) => api.delete(`/superadmin/saloes/${id}`);
export const saImpersonar = (id) => api.post(`/superadmin/saloes/${id}/impersonar`);
export const saEnviarComunicado = (data) => api.post('/superadmin/comunicado', data);
export const saEnviarCredenciais = (data) => api.post('/superadmin/credenciais/enviar', data);
export const saResetSenhaUsuario = (id, data) => api.put(`/superadmin/usuarios/${id}/reset-senha`, data);
export const saGetBillingSettings = () => api.get('/superadmin/billing/settings');
export const saUpdateBillingSettings = (data) => api.put('/superadmin/billing/settings', data);
export const saGerarFaturasAutomaticas = () => api.post('/superadmin/billing/faturas/gerar');
export const saGetFaturas = (params) => api.get('/superadmin/billing/faturas', { params });
export const saCreateFatura = (data) => api.post('/superadmin/billing/faturas', data);
export const saUpdateFatura = (id, data) => api.put(`/superadmin/billing/faturas/${id}`, data);
export const saGetTickets = (params) => api.get('/superadmin/suporte', { params });
export const saUpdateTicket = (id, data) => api.put(`/superadmin/suporte/${id}`, data);
export const saResponderTicket = (id, data) => api.post(`/superadmin/suporte/${id}/mensagens`, data);

// PUBLIC
export const getSalaoPublico = (slug) => api.get(`/public/${slug}/salao`);
export const getServicosPublicos = (slug) => api.get(`/public/${slug}/servicos`);
export const getPacotesPublicos = (slug) => api.get(`/public/${slug}/pacotes`);
export const getProfissionaisPublicos = (slug) => api.get(`/public/${slug}/profissionais`);
export const getProfissionaisPorServico = (slug, servicoId) => api.get(`/public/${slug}/profissionais/${servicoId}`);
export const getProfissionaisPorPacote = (slug, pacoteId) => api.get(`/public/${slug}/profissionais-pacote/${pacoteId}`);
export const getDatasDisponiveis = (slug, params) => api.get(`/public/${slug}/datas-disponiveis`, { params });
export const getHorariosDisponiveis = (slug, params) => api.get(`/public/${slug}/horarios-disponiveis`, { params });
export const criarAgendamentoPublico = (slug, data) => api.post(`/public/${slug}/agendamentos`, data);

// AUTH
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);
export const requestPasswordReset = (data) => api.post('/auth/request-password-reset', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const getAdminSession = () => api.get('/auth/session');
export const logoutAdmin = () => api.post('/auth/logout');
export const getSuperAdminSession = () => api.get('/superadmin/session');
export const logoutSuperAdmin = () => api.post('/superadmin/logout');

// ADMIN SALAO
export const getAdminSalao = () => api.get('/admin/salao');
export const updateAdminSalao = (data) => api.put('/admin/salao', data);
export const getFaturasSalao = () => api.get('/admin/faturas');
export const getResumoFaturasSalao = () => api.get('/admin/faturas/resumo');
export const enviarComprovanteFatura = (id, data) => api.put(`/admin/faturas/${id}/comprovante`, data);
export const getTicketsSalao = () => api.get('/admin/suporte');
export const createTicketSalao = (data) => api.post('/admin/suporte', data);
export const responderTicketSalao = (id, data) => api.post(`/admin/suporte/${id}/mensagens`, data);

// ADMIN PROFISSIONAIS
export const getProfissionais = () => api.get('/admin/profissionais');
export const getCategoriasProfissionais = () => api.get('/admin/profissionais-categorias');
export const createCategoriaProfissional = (data) => api.post('/admin/profissionais-categorias', data);
export const deleteCategoriaProfissional = (id) => api.delete(`/admin/profissionais-categorias/${id}`);
export const createProfissional = (data) => api.post('/admin/profissionais', data);
export const reorderProfissionais = (ids) => api.put('/admin/profissionais/ordem', { ids });
export const updateProfissional = (id, data) => api.put(`/admin/profissionais/${id}`, data);
export const deleteProfissional = (id) => api.delete(`/admin/profissionais/${id}`);
export const setHorariosProfissional = (id, horarios) => api.put(`/admin/profissionais/${id}/horarios`, { horarios });

// ADMIN SERVICOS
export const getServicos = () => api.get('/admin/servicos');
export const createServico = (data) => api.post('/admin/servicos', data);
export const updateServico = (id, data) => api.put(`/admin/servicos/${id}`, data);
export const deleteServico = (id) => api.delete(`/admin/servicos/${id}`);

// ADMIN PACOTES
export const getPacotes = () => api.get('/admin/pacotes');
export const createPacote = (data) => api.post('/admin/pacotes', data);
export const updatePacote = (id, data) => api.put(`/admin/pacotes/${id}`, data);
export const deletePacote = (id) => api.delete(`/admin/pacotes/${id}`);

// ADMIN BLOQUEIOS
export const getBloqueios = (params) => api.get('/admin/bloqueios', { params });
export const createBloqueio = (data) => api.post('/admin/bloqueios', data);
export const deleteBloqueio = (id) => api.delete(`/admin/bloqueios/${id}`);

// ADMIN AGENDAMENTOS
export const getAgendamentos = (params) => api.get('/admin/agendamentos', { params });
export const getAlertasAgendamento = (params) => api.get('/admin/alertas-agendamento', { params });
export const markAlertaAgendamentoLido = (id) => api.post(`/admin/alertas-agendamento/${id}/lida`);
export const markTodosAlertasAgendamentoLidos = () => api.post('/admin/alertas-agendamento/lidas');
export const criarAgendamentoAdmin = (data) => api.post('/admin/agendamentos', data);
export const updateStatusAgendamento = (id, status) => api.put(`/admin/agendamentos/${id}/status`, { status });
export const updateObservacaoAgendamento = (id, observacao) => api.put(`/admin/agendamentos/${id}/observacao`, { observacao });
export const reagendarAgendamento = (id, data) => api.post(`/admin/agendamentos/${id}/reagendar`, data);
export const updatePagamentoAgendamento = (id, data) => api.put(`/admin/agendamentos/${id}/pagamento`, data);
export const deleteAgendamento = (id) => api.delete(`/admin/agendamentos/${id}`);
export const addItemAgendamento = (id, servicoId) => api.post(`/admin/agendamentos/${id}/itens`, { servicoId });
export const removeItemAgendamento = (id, itemId) => api.delete(`/admin/agendamentos/${id}/itens/${itemId}`);
export const buscarClientes = (q) => api.get('/admin/clientes/buscar', { params: { q } });
export const getListaEspera = (params) => api.get('/admin/lista-espera', { params });
export const createListaEspera = (data) => api.post('/admin/lista-espera', data);
export const updateListaEspera = (id, data) => api.put(`/admin/lista-espera/${id}`, data);
export const deleteListaEspera = (id) => api.delete(`/admin/lista-espera/${id}`);

// ADMIN CLIENTES
export const getClientes = () => api.get('/admin/clientes');
export const createCliente = (data) => api.post('/admin/clientes', data);
export const getHistoricoCliente = (busca) => api.get('/admin/clientes/historico', { params: { busca } });

// ADMIN PRODUTOS
export const getProdutos = () => api.get('/admin/produtos');
export const createProduto = (data) => api.post('/admin/produtos', data);
export const updateProduto = (id, data) => api.put(`/admin/produtos/${id}`, data);
export const deleteProduto = (id) => api.delete(`/admin/produtos/${id}`);
export const criarVendaPDV = (data) => api.post('/admin/pdv', data);
export const addProdutoAgendamento = (id, produtoId, quantidade) => api.post(`/admin/agendamentos/${id}/produtos`, { produtoId, quantidade });
export const removeProdutoAgendamento = (id, itemId) => api.delete(`/admin/agendamentos/${id}/produtos/${itemId}`);

// ADMIN REPORTS
export const getRelatorio = (params) => api.get('/admin/relatorio', { params });
export const getFinanceiro = (params) => api.get('/admin/financeiro', { params });
export const getDashboardExecutivo = (params) => api.get('/admin/dashboard-executivo', { params });
export const getCaixaStatusPagamento = () => api.get('/admin/caixa/status-pagamento');
export const getCaixaAtual = () => api.get('/admin/caixa/atual');
export const getCaixaSessoes = () => api.get('/admin/caixa/sessoes');
export const getCaixaRelatorioDiario = (params) => api.get('/admin/caixa/relatorio-diario', { params });
export const getFechamentoDiario = (params) => api.get('/admin/fechamento-diario', { params });
export const abrirCaixa = (data) => api.post('/admin/caixa/abrir', data);
export const fecharCaixa = (id, data) => api.post(`/admin/caixa/${id}/fechar`, data);
export const addMovimentoCaixa = (id, data) => api.post(`/admin/caixa/${id}/movimentos`, data);
export const updateFidelidadeConfig = (data) => api.put('/admin/fidelidade', data);
export const dispararIAProativa = () => api.post('/admin/ia-proativa');
export const dispararLembretes = () => api.post('/admin/lembretes');
export const dispararCampanha = (data) => api.post('/admin/campanha', data);
export const getRelatorioRemuneracao = (params) => api.get('/admin/relatorio/remuneracao', { params });
export const createLancamentoRemuneracao = (data) => api.post('/admin/relatorio/remuneracao/lancamentos', data);
export const updateComissaoPaga = (data) => api.put('/admin/relatorio/remuneracao/pago', data);

// ADMIN DESPESAS
export const getDespesas = (params) => api.get('/admin/despesas', { params });
export const createDespesa = (data) => api.post('/admin/despesas', data);
export const deleteDespesa = (id) => api.delete(`/admin/despesas/${id}`);

// ADMIN SETTINGS
export const updateSenha = (data) => api.put('/admin/senha', data);
export const getUsuarios = () => api.get('/admin/usuarios');
export const createUsuario = (data) => api.post('/admin/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/admin/usuarios/${id}`, data);
export const deleteUsuario = (id) => api.delete(`/admin/usuarios/${id}`);
export const getAuditoria = (params) => api.get('/admin/auditoria', { params });
export const exportBackup = () => api.get('/admin/backup/export');

// ADMIN INBOX
export const getConversas = (params) => api.get('/admin/inbox', { params });
export const getMensagens = (id) => api.get(`/admin/inbox/${id}/mensagens`);
export const atualizarConversa = (id, data) => api.put(`/admin/inbox/${id}`, data);
export const responderConversa = (id, texto) => api.post(`/admin/inbox/${id}/responder`, { texto });
export const responderConversaMidia = (id, data) => api.post(`/admin/inbox/${id}/midia`, data);

export const getRespostasRapidas = () => api.get('/admin/inbox/snippets');
export const createRespostaRapida = (data) => api.post('/admin/inbox/snippets', data);
export const deleteRespostaRapida = (id) => api.delete(`/admin/inbox/snippets/${id}`);

// ADMIN WHATSAPP
export const getWhatsappConfig = () => api.get('/admin/whatsapp/config');
export const updateWhatsappConfig = (data) => api.put('/admin/whatsapp/config', data);
export const getWhatsappStatus = () => api.get('/admin/whatsapp/status');
export const connectWhatsapp = () => api.post('/admin/whatsapp/connect');
export const disconnectWhatsapp = () => api.post('/admin/whatsapp/disconnect');

// EXTRAS
export const submeterAvaliacao = (id, data) => api.post(`/admin/agendamentos/${id}/avaliacao`, data);
export const getAvaliacoes = () => api.get('/admin/avaliacoes');
export const importarClientes = (dados) => api.post('/admin/importar', { dados });
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export default api;
