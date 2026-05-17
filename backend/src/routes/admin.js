const router = require('express').Router();
const { authenticate } = require('../controllers/authController');
const ctrl = require('../controllers/adminController');
const inbox = require('../controllers/inboxController');
const ops = require('../controllers/operationsController');
const { requirePermission, requireAnyPermission, requireActionPermission } = require('../lib/permissions');

router.use(authenticate);

router.get('/salao', requirePermission('configuracoes'), ctrl.getSalao);
router.put('/salao', requirePermission('configuracoes'), ctrl.updateSalao);

router.get('/whatsapp/config', requirePermission('configuracoes'), ctrl.getWhatsappConfig);
router.put('/whatsapp/config', requirePermission('configuracoes'), ctrl.updateWhatsappConfig);
router.get('/whatsapp/status', requirePermission('configuracoes'), ctrl.getWhatsappStatus);
router.post('/whatsapp/connect', requirePermission('configuracoes'), ctrl.connectWhatsapp);
router.post('/whatsapp/disconnect', requirePermission('configuracoes'), ctrl.disconnectWhatsapp);

router.get('/profissionais', requireAnyPermission(['profissionais', 'agenda', 'dashboard', 'remuneracao', 'configuracoes', 'bloqueios']), ctrl.getProfissionais);
router.get('/profissionais-categorias', requireAnyPermission(['profissionais', 'agenda', 'dashboard', 'configuracoes']), ctrl.getCategoriasProfissionais);
router.post('/profissionais-categorias', requirePermission('profissionais'), requireActionPermission('profissionais.editar'), ctrl.createCategoriaProfissional);
router.delete('/profissionais-categorias/:id', requirePermission('profissionais'), requireActionPermission('profissionais.editar'), ctrl.deleteCategoriaProfissional);
router.post('/profissionais', requirePermission('profissionais'), requireActionPermission('profissionais.criar'), ctrl.createProfissional);
router.put('/profissionais/:id', requirePermission('profissionais'), requireActionPermission('profissionais.editar'), ctrl.updateProfissional);
router.delete('/profissionais/:id', requirePermission('profissionais'), requireActionPermission('profissionais.excluir'), ctrl.deleteProfissional);
router.put('/profissionais/:id/horarios', requirePermission('profissionais'), ctrl.setHorarios);

router.get('/servicos', requireAnyPermission(['servicos', 'agenda', 'pacotes']), ctrl.getServicos);
router.post('/servicos', requirePermission('servicos'), ctrl.createServico);
router.put('/servicos/:id', requirePermission('servicos'), ctrl.updateServico);
router.delete('/servicos/:id', requirePermission('servicos'), ctrl.deleteServico);

router.get('/pacotes', requireAnyPermission(['pacotes', 'agenda']), ctrl.getPacotes);
router.post('/pacotes', requirePermission('pacotes'), ctrl.createPacote);
router.put('/pacotes/:id', requirePermission('pacotes'), ctrl.updatePacote);
router.delete('/pacotes/:id', requirePermission('pacotes'), ctrl.deletePacote);

router.get('/bloqueios', requirePermission('bloqueios'), ctrl.getBloqueios);
router.post('/bloqueios', requirePermission('bloqueios'), ctrl.createBloqueio);
router.delete('/bloqueios/:id', requirePermission('bloqueios'), ctrl.deleteBloqueio);

router.get('/agendamentos', requireAnyPermission(['agenda', 'dashboard', 'agendamentos']), ctrl.getAgendamentos);
router.post('/agendamentos', requirePermission('agenda'), requireActionPermission('agenda.criar'), ctrl.criarAgendamentoAdmin);
router.put('/agendamentos/:id/status', requirePermission('agenda'), requireActionPermission('agenda.editar'), ctrl.updateStatusAgendamento);
router.post('/agendamentos/:id/reagendar', requirePermission('agenda'), requireActionPermission('agenda.editar'), ctrl.reagendarAgendamento);
router.put('/agendamentos/:id/pagamento', requirePermission('agenda'), requireActionPermission('agenda.pagamento'), ctrl.updatePagamentoAgendamento);
router.post('/agendamentos/:id/itens', requirePermission('agenda'), ctrl.addItemAgendamento);
router.delete('/agendamentos/:id/itens/:itemId', requirePermission('agenda'), ctrl.removeItemAgendamento);
router.delete('/agendamentos/:id', requirePermission('agenda'), requireActionPermission('agenda.excluir'), ctrl.deleteAgendamento);
router.get('/lista-espera', requirePermission('agenda'), ctrl.getListaEspera);
router.post('/lista-espera', requirePermission('agenda'), requireActionPermission('agenda.criar'), ctrl.createListaEspera);
router.put('/lista-espera/:id', requirePermission('agenda'), requireActionPermission('agenda.editar'), ctrl.updateListaEspera);
router.delete('/lista-espera/:id', requirePermission('agenda'), requireActionPermission('agenda.excluir'), ctrl.deleteListaEspera);

router.get('/clientes', requireAnyPermission(['clientes', 'dashboard']), ctrl.getClientes);
router.post('/clientes', requirePermission('clientes'), ctrl.createCliente);
router.get('/clientes/buscar', requireAnyPermission(['clientes', 'agenda']), ctrl.buscarClientes);
router.get('/clientes/historico', requirePermission('clientes'), ctrl.getHistoricoCliente);

router.get('/produtos', requireAnyPermission(['produtos', 'agenda']), ctrl.getProdutos);
router.post('/produtos', requirePermission('produtos'), ctrl.createProduto);
router.put('/produtos/:id', requirePermission('produtos'), ctrl.updateProduto);
router.delete('/produtos/:id', requirePermission('produtos'), ctrl.deleteProduto);

router.post('/pdv', requirePermission('produtos'), ctrl.criarVendaPDV);

router.post('/agendamentos/:id/produtos', requirePermission('agenda'), ctrl.addProdutoAgendamento);
router.delete('/agendamentos/:id/produtos/:itemId', requirePermission('agenda'), ctrl.removeProdutoAgendamento);


router.get('/relatorio', requirePermission('relatorio'), ctrl.getRelatorio);
router.get('/financeiro', requirePermission('financeiro'), ctrl.getFinanceiro);
router.get('/dashboard-executivo', requirePermission('dashboard'), ctrl.getDashboardExecutivo);
router.get('/fechamento-diario', requirePermission('financeiro'), requireActionPermission('relatorio.fechamento_diario.ver'), ctrl.getFechamentoDiario);
router.get('/caixa/atual', requirePermission('financeiro'), ctrl.getCaixaAtual);
router.get('/caixa/sessoes', requirePermission('financeiro'), ctrl.getCaixaSessoes);
router.get('/caixa/relatorio-diario', requirePermission('financeiro'), ctrl.getCaixaRelatorioDiario);
router.post('/caixa/abrir', requirePermission('financeiro'), requireActionPermission('financeiro.caixa.abrir'), ctrl.abrirCaixa);
router.post('/caixa/:id/fechar', requirePermission('financeiro'), requireActionPermission('financeiro.caixa.fechar'), ctrl.fecharCaixa);
router.post('/caixa/:id/movimentos', requirePermission('financeiro'), requireActionPermission('financeiro.caixa.movimentar'), ctrl.addMovimentoCaixa);
router.put('/fidelidade', requirePermission('fidelidade'), ctrl.updateFidelidadeConfig);
router.post('/campanha', requirePermission('notificacoes'), ctrl.dispararCampanhaMassiva);
router.post('/lembretes', requirePermission('dashboard'), ctrl.dispararLembretes);
router.post('/ia-proativa', requirePermission('dashboard'), ctrl.dispararIAProativa);
router.post('/importar', requirePermission('migracao'), ctrl.importarClientesCSV);

router.get('/despesas', requirePermission('relatorio'), ctrl.getDespesas);
router.post('/despesas', requirePermission('relatorio'), ctrl.createDespesa);
router.delete('/despesas/:id', requirePermission('relatorio'), ctrl.deleteDespesa);

router.get('/faturas', requirePermission('faturas'), ops.listAdminInvoices);
router.get('/faturas/resumo', requirePermission('dashboard'), ops.getAdminInvoiceSummary);
router.put('/faturas/:id/comprovante', requirePermission('faturas'), ops.submitInvoiceProof);

router.get('/suporte', requirePermission('suporte'), ops.listAdminTickets);
router.post('/suporte', requirePermission('suporte'), ops.createAdminTicket);
router.post('/suporte/:id/mensagens', requirePermission('suporte'), ops.addAdminTicketMessage);

router.post('/agendamentos/:id/fotos', requirePermission('agenda'), ctrl.addFotoAgendamento);
router.delete('/agendamentos/:id/fotos/:fotoId', requirePermission('agenda'), ctrl.deleteFotoAgendamento);
router.post('/agendamentos/:id/avaliacao', requirePermission('agenda'), ctrl.submeterAvaliacao);
router.get('/avaliacoes', requirePermission('relatorio'), ctrl.getAvaliacoes);

router.get('/usuarios', requirePermission('configuracoes'), ctrl.getUsuarios);
router.post('/usuarios', requirePermission('configuracoes'), requireActionPermission('configuracoes.usuarios.criar'), ctrl.createUsuario);
router.put('/usuarios/:id', requirePermission('configuracoes'), requireActionPermission('configuracoes.usuarios.editar'), ctrl.updateUsuario);
router.delete('/usuarios/:id', requirePermission('configuracoes'), requireActionPermission('configuracoes.usuarios.excluir'), ctrl.deleteUsuario);
router.get('/auditoria', requirePermission('configuracoes'), requireActionPermission('configuracoes.auditoria.ver'), ctrl.getAuditLogs);
router.get('/backup/export', requirePermission('configuracoes'), requireActionPermission('seguranca.backup.exportar'), ctrl.exportBackup);

router.get('/relatorio/remuneracao', requirePermission('remuneracao'), ctrl.getRelatorioRemuneracao);
router.put('/relatorio/remuneracao/pago', requirePermission('remuneracao'), ctrl.updateComissaoPaga);

router.put('/senha', requirePermission('configuracoes'), ctrl.updateSenha);



router.get('/inbox', requirePermission('inbox'), inbox.getConversas);
router.get('/inbox/stream', requirePermission('inbox'), inbox.streamEvents);
router.get('/inbox/snippets', requirePermission('inbox'), inbox.getRespostasRapidas);
router.post('/inbox/snippets', requirePermission('inbox'), inbox.createRespostaRapida);
router.delete('/inbox/snippets/:id', requirePermission('inbox'), inbox.deleteRespostaRapida);
router.get('/inbox/:id/mensagens', requirePermission('inbox'), inbox.getMensagens);
router.put('/inbox/:id', requirePermission('inbox'), inbox.atualizarConversa);
router.post('/inbox/:id/responder', requirePermission('inbox'), inbox.responderConversa);

module.exports = router;
