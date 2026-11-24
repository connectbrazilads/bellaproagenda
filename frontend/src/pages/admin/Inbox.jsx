import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Bot, 
  User, 
  Archive, 
  Send, 
  ChevronLeft,
  Zap,
  Clock,
  CheckCheck,
  Sparkles,
  Calendar,
  Plus,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Film,
  Download,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  API_BASE_URL,
  getConversas,
  getMensagens,
  atualizarConversa,
  responderConversa,
  responderConversaMidia,
  getRespostasRapidas,
  uploadImage,
  iniciarConversa,
  getClientes,
} from '../../services/api';
import { cn } from '../../lib/utils';
import useElementWidth from '../../hooks/useElementWidth';

const FILTROS = [
  { label: 'Chats', icon: <MessageSquare size={14} />, params: { status: 'aberta' } },
  { label: 'IA', icon: <Bot size={14} />, params: { atendimento: 'ia', status: 'aberta' } },
  { label: 'Humano', icon: <User size={14} />, params: { atendimento: 'humano', status: 'aberta' } },
  { label: 'Arquivados', icon: <Archive size={14} />, params: { status: 'fechada' } },
];

function formatarHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getMensagemMediaSrc(mensagem) {
  const base64 = String(mensagem?.mediaBase64 || '').trim();
  if (base64) {
    return base64.startsWith('data:')
      ? base64
      : `data:${mensagem?.mimeType || 'application/octet-stream'};base64,${base64}`;
  }

  return String(mensagem?.mediaUrl || '').trim();
}

function normalizeMensagem(mensagem, index = 0) {
  if (!mensagem || typeof mensagem !== 'object') {
    return {
      id: `mensagem-invalida-${index}`,
      conteudo: '',
      direcao: 'entrada',
      origem: 'sistema',
      tipo: 'texto',
      createdAt: new Date().toISOString(),
    };
  }

  return {
    ...mensagem,
    id: mensagem.id || `mensagem-sem-id-${index}`,
    conteudo: mensagem.conteudo ?? '',
    direcao: mensagem.direcao || 'entrada',
    origem: mensagem.origem || 'sistema',
    tipo: mensagem.tipo || 'texto',
    createdAt: mensagem.createdAt || new Date().toISOString(),
  };
}

function getMensagemResumo(mensagem) {
  if (!mensagem) return 'Iniciando conversa...';

  if (mensagem.tipo === 'imagem') return mensagem.conteudo || 'Imagem recebida';
  if (mensagem.tipo === 'audio') return mensagem.conteudo || 'Áudio recebido';
  if (mensagem.tipo === 'anexo') return mensagem.conteudo || `Anexo${mensagem.nomeArquivo ? `: ${mensagem.nomeArquivo}` : ' recebido'}`;
  if (mensagem.tipo === 'video') return mensagem.conteudo || 'Vídeo recebido';

  return mensagem.conteudo || 'Iniciando conversa...';
}

function isDescricaoGenericaDeMidia(mensagem) {
  if (!mensagem?.tipo || mensagem.tipo === 'texto') return false;

  const conteudo = String(mensagem.conteudo || '').trim().toLowerCase();
  return ['imagem recebida', 'audio recebido', 'video recebido', 'anexo recebido', 'áudio recebido', 'vídeo recebido'].includes(conteudo);
}

function buildInboxStreamUrl() {
  const token = String(localStorage.getItem('salao_admin_token') || '').trim();
  if (!token) return `${API_BASE_URL}/admin/inbox/stream`;
  return `${API_BASE_URL}/admin/inbox/stream?token=${encodeURIComponent(token)}`;
}

function getConversaTitulo(conversa) {
  return conversa?.nomeCliente || conversa?.telefone || 'Contato';
}

function getConversaSubtitulo(conversa) {
  if (!conversa) return '';
  if (conversa?.nomeCliente && conversa?.telefone) return conversa.telefone;
  return conversa?.nomeCliente ? 'Contato salvo' : 'Contato novo';
}

function formatarDuracaoCurta(totalSegundos = 0) {
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function ContatoAvatar({ conversa, className = '', fallbackClassName = '', showBadge = false }) {
  const fallback = conversa?.nomeCliente ? conversa.nomeCliente.trim().charAt(0).toUpperCase() : 'C';

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50 dark:bg-zinc-800 text-[#d48997] border border-black/[0.04] dark:border-white/[0.04]', fallbackClassName)}>
        {conversa?.avatarUrl ? (
          <img src={conversa.avatarUrl} alt={getConversaTitulo(conversa)} className="h-full w-full object-cover" />
        ) : (
          <span className="font-semibold text-sm uppercase">{fallback}</span>
        )}
      </div>
      {showBadge ? (
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 text-[8px] shadow-sm',
            conversa?.atendimento === 'humano' ? 'bg-emerald-500 text-white' : 'bg-[#d48997] text-white'
          )}
        >
          {conversa?.atendimento === 'humano' ? <User size={10} /> : <Bot size={10} />}
        </div>
      ) : null}
    </div>
  );
}

function ModalNovaConversa({ onClose, onStart }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getClientes()
      .then((r) => setClientes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clientesFiltrados = (Array.isArray(clientes) ? clientes : []).filter((c) =>
    (c.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  );

  async function handleStart(tel, nomeCli) {
    if (!tel) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onStart(tel, nomeCli);
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Erro ao iniciar conversa');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18181b] p-6 shadow-2xl border border-black/[0.04] dark:border-white/10"
      >
        <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/10 pb-4 mb-4">
          <h3 className="text-lg font-serif font-normal text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-[#d48997]" /> Nova Conversa
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-300 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Selecionar Cliente Cadastrado
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/10 bg-gray-50 dark:bg-[#111113] pl-9 pr-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997]"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {loading ? (
                <p className="text-xs text-gray-400 py-2 text-center">Carregando clientes...</p>
              ) : clientesFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">Nenhum cliente encontrado</p>
              ) : (
                clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleStart(c.telefone, c.nome)}
                    disabled={submitting}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[#d48997]/20 hover:bg-[#d48997]/5 transition text-left text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white block">{c.nome}</span>
                      <span className="text-[10px] text-gray-400">{c.telefone}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#d48997] uppercase tracking-wider">Chamar</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] dark:border-white/10 pt-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Ou Digite um Novo Número
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nome do cliente (opcional)"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/10 bg-gray-50 dark:bg-[#111113] px-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997]"
              />
              <input
                type="text"
                placeholder="Telefone (ex: 11999999999)"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/10 bg-gray-50 dark:bg-[#111113] px-3 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997]"
              />
              <button
                onClick={() => handleStart(telefone, nome)}
                disabled={submitting || !telefone.trim()}
                className="w-full h-10 rounded-xl bg-[#b84c6b] hover:bg-[#9c3b57] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Iniciando...' : 'Iniciar Conversa'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Inbox() {
  const [filtro, setFiltro] = useState(0);
  const [conversas, setConversas] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [erro, setErro] = useState('');
  const [snippets, setSnippets] = useState([]);
  const [showSnippets, setShowSnippets] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [duracaoGravacao, setDuracaoGravacao] = useState(0);
  const [modalNovaConversa, setModalNovaConversa] = useState(false);
  
  const navigate = useNavigate();
  
  const chatRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const panelWidth = useElementWidth(panelRef, 1280);

  const carregarConversas = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingConversas(true);
    setErro('');
    try {
      const r = await getConversas(FILTROS[filtro].params);
      setConversas(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Não foi possível carregar as conversas agora.';
      setErro(msg);
      setConversas([]);
    } finally {
      if (!silent) setLoadingConversas(false);
    }
  }, [filtro]);

  const carregarMensagens = useCallback(async ({ silent = false } = {}) => {
    if (!selecionada) return;
    if (!silent) setLoadingMensagens(true);
    try {
      const r = await getMensagens(selecionada.id);
      const nextMensagens = Array.isArray(r.data) ? r.data.map(normalizeMensagem) : [];
      setMensagens(nextMensagens);
    } catch {
      setErro('Não foi possível carregar as mensagens desta conversa.');
    } finally {
      if (!silent) setLoadingMensagens(false);
    }
  }, [selecionada]);

  const refreshInbox = useCallback(async () => {
    await carregarConversas({ silent: true });
    if (selecionada) {
      await carregarMensagens({ silent: true });
    }
  }, [carregarConversas, carregarMensagens, selecionada]);

  useEffect(() => {
    carregarConversas();
    getRespostasRapidas().then(r => setSnippets(r.data || [])).catch(() => {});
  }, [carregarConversas]);

  useEffect(() => {
    const evtSource = new EventSource(buildInboxStreamUrl(), { withCredentials: true });

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          refreshInbox();
        }
      } catch {
        // Ignore ping payloads.
      }
    };

    evtSource.onerror = () => {
      refreshInbox();
    };

    return () => evtSource.close();
  }, [refreshInbox]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshInbox();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [refreshInbox]);

  useEffect(() => {
    if (!selecionada) return;
    carregarMensagens();
  }, [selecionada?.id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagens]);

  useEffect(() => {
    if (!selecionada) return;
    const atualizada = conversas.find((c) => c.id === selecionada.id);
    if (atualizada) setSelecionada(atualizada);
  }, [conversas, selecionada?.id]);

  useEffect(() => {
    if (!gravandoAudio) {
      setDuracaoGravacao(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setDuracaoGravacao((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [gravandoAudio]);

  useEffect(() => () => {
    try {
      mediaRecorderRef.current?.stop?.();
    } catch {
      // ignora se o recorder ja tiver sido finalizado
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  async function assumir() {
    await atualizarConversa(selecionada.id, { atendimento: 'humano' });
    setSelecionada(prev => ({ ...prev, atendimento: 'humano' }));
    carregarConversas();
  }

  async function soltarIA() {
    await atualizarConversa(selecionada.id, { atendimento: 'ia' });
    setSelecionada(prev => ({ ...prev, atendimento: 'ia' }));
    carregarConversas();
  }

  async function fechar() {
    await atualizarConversa(selecionada.id, { status: 'fechada' });
    setSelecionada(null);
    setMobileChat(false);
    carregarConversas();
  }

  const safeConversas = Array.isArray(conversas) ? conversas : [];
  const totalAbertas = safeConversas.filter((c) => c && c.status !== 'fechada').length;
  const totalIa = safeConversas.filter((c) => c && c.atendimento === 'ia').length;
  const totalHumano = safeConversas.filter((c) => c && c.atendimento === 'humano').length;
  const enviandoAlgo = enviando || enviandoMidia;

  function encerrarCapturaAudio() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }

  async function enviar(e) {
    e?.preventDefault();
    if (!texto.trim() || !selecionada || enviandoAlgo) return;
    setEnviando(true);
    try {
      await responderConversa(selecionada.id, texto.trim());
      setErro('');
      setTexto('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      await refreshInbox();
    } catch (error) {
      setErro(error?.response?.data?.error || 'Não foi possível enviar a mensagem agora.');
    } finally {
      setEnviando(false);
    }
  }

  async function enviarArquivo(file, { forceAudio = false } = {}) {
    if (!file || !selecionada || enviandoAlgo) return;

    setEnviandoMidia(true);
    setErro('');

    try {
      const uploadResponse = await uploadImage(file);
      const mediaUrl = uploadResponse.data?.url;

      if (!mediaUrl) {
        throw new Error('Não foi possível gerar a URL do arquivo.');
      }

      await responderConversaMidia(selecionada.id, {
        mediaUrl,
        mimeType: file.type || 'application/octet-stream',
        nomeArquivo: file.name || 'arquivo',
        legenda: forceAudio ? '' : texto.trim(),
      });

      if (!forceAudio) {
        setTexto('');
      }

      await refreshInbox();
    } catch (error) {
      setErro(error?.response?.data?.error || error?.message || 'Não foi possível enviar o arquivo agora.');
    } finally {
      setEnviandoMidia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function selecionarArquivo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await enviarArquivo(file, { forceAudio: String(file.type || '').startsWith('audio/') });
  }

  async function alternarGravacaoAudio() {
    if (gravandoAudio) {
      mediaRecorderRef.current?.stop?.();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErro('Seu navegador não suporta gravação de áudio nesta tela.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const mimeType = mimeCandidates.find((candidate) => (
        typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(candidate)
      ));

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = [...audioChunksRef.current];
        const mime = recorder.mimeType || 'audio/webm';
        encerrarCapturaAudio();
        setGravandoAudio(false);

        if (!chunks.length) return;

        const blob = new Blob(chunks, { type: mime });
        const extensao = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `audio-${Date.now()}.${extensao}`, { type: mime });
        await enviarArquivo(file, { forceAudio: true });
      };

      recorder.start();
      setGravandoAudio(true);
      setDuracaoGravacao(0);
      setErro('');
    } catch {
      setErro('Não foi possível acessar o microfone agora.');
      encerrarCapturaAudio();
      setGravandoAudio(false);
    }
  }

  const filteredConversas = safeConversas.filter(c => 
    c && ((c.nomeCliente || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.telefone || '').includes(search))
  );
  
  const inicioConversa = mensagens[0]?.createdAt || selecionada?.updatedAt || null;
  const isCompactPanel = panelWidth < 1380;
  const isTightPanel = panelWidth < 1180;
  
  const showContextSidebar = Boolean(selecionada && panelWidth >= 1520);
  const actionLabel = selecionada?.atendimento === 'ia'
    ? (isTightPanel ? 'Assumir' : 'Assumir Atendimento')
    : (isTightPanel ? 'Voltar IA' : 'Devolver para IA');

  async function handleIniciarNovaConversa(tel, nomeCli) {
    const res = await iniciarConversa({ telefone: tel, nomeCliente: nomeCli });
    const novaConversa = res.data;
    await carregarConversas({ silent: true });
    if (novaConversa?.id) {
      setSelecionada(novaConversa);
      setMobileChat(true);
    }
  }

  return (
    <>
      <AnimatePresence>
        {modalNovaConversa && (
          <ModalNovaConversa
            onClose={() => setModalNovaConversa(false)}
            onStart={handleIniciarNovaConversa}
          />
        )}
      </AnimatePresence>

    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[70dvh] overflow-hidden rounded-2xl border border-[#eae1e4] bg-white shadow-sm dark:border-[#28212f] dark:bg-[#18131d] lg:h-[calc(100dvh-7rem)] lg:max-h-[calc(100dvh-6rem)]"
    >
      {/* ── Sidebar: Conversas List ── */}
      <aside className={cn(
        "flex min-h-0 w-full flex-col border-r border-[#eae1e4] bg-[#fcfafb] dark:border-[#28212f] dark:bg-[#18131d]",
        isCompactPanel ? "lg:w-[19rem] xl:w-[20rem]" : "lg:w-80 xl:w-96",
        mobileChat ? "hidden lg:flex" : "flex"
      )}>
        <div className="flex-shrink-0 space-y-3.5 border-b border-[#f0e8eb] bg-white p-4 dark:border-[#28212f] dark:bg-[#18131d]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-brand-display text-2xl font-bold leading-tight text-[#23141c] dark:text-white">
              Inbox <span className="italic text-[#b84c6b]">WhatsApp</span>
            </h1>
            <button
              type="button"
              onClick={() => setModalNovaConversa(true)}
              className="editorial-btn-primary flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
              title="Iniciar conversa com cliente"
            >
              <Plus size={14} /> Novo Chat
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-semibold text-[#6b5761] hide-scrollbar">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#eae1e4] bg-[#faf7f5] px-2.5 py-1 dark:border-[#28212f] dark:bg-white/5">
              Abertas: <strong className="text-[#23141c] dark:text-white">{totalAbertas}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#eccbd4] bg-[#fdf2f5] px-2.5 py-1 text-[#b84c6b] dark:border-[#c65d7b]/30 dark:bg-[#c65d7b]/15 dark:text-[#f0aab8]">
              IA: <strong>{totalIa}</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300">
              Humano: <strong>{totalHumano}</strong>
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c727e]" />
            <input
              type="text"
              placeholder="Buscar cliente ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] pl-10 pr-4 text-xs text-[#23141c] outline-none placeholder:text-[#8c727e] focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
            />
          </div>

          {/* Filters tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            {FILTROS.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setFiltro(i); setSelecionada(null); setErro(''); }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors",
                  filtro === i
                    ? "border-[#23141c] bg-[#23141c] text-white dark:border-[#c65d7b] dark:bg-[#c65d7b]"
                    : "border-[#eae1e4] bg-white text-[#5b4852] hover:border-[#c65d7b]/40 hover:text-[#23141c] dark:border-[#28212f] dark:bg-white/5 dark:text-white/65"
                )}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2.5 custom-scrollbar">
          {filteredConversas.length === 0 ? (
            <div className="space-y-2.5 py-12 text-center">
              <Archive size={28} className="mx-auto text-[#c9b4be] dark:text-white/25" />
              <p className="text-xs font-medium text-[#745e69] dark:text-white/50">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversas.map((c) => (
              <button
                type="button"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '68px' }}
                key={c.id}
                onClick={() => { setSelecionada(c); setMobileChat(true); setMensagens([]); setErro(''); }}
                className={cn(
                  "flex w-full gap-3 rounded-xl border p-3 text-left transition-colors",
                  selecionada?.id === c.id
                    ? "border-[#eccbd4] bg-[#fdf2f5] dark:border-[#c65d7b]/35 dark:bg-[#c65d7b]/15"
                    : "border-transparent bg-transparent hover:bg-white dark:hover:bg-white/5"
                )}
              >
                <ContatoAvatar conversa={c} className="h-10 w-10" showBadge />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="mb-0.5 flex items-start justify-between gap-2">
                    <h4 className="truncate text-xs font-bold text-[#23141c] dark:text-white">
                      {getConversaTitulo(c)}
                    </h4>
                    <span className="shrink-0 text-[10px] font-semibold text-[#8c727e]">{formatarHora(c.updatedAt)}</span>
                  </div>
                  <p className="truncate text-[11px] leading-relaxed text-[#6b5761] dark:text-white/55">
                    {getMensagemResumo(c.ultimaMensagem)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full", c.atendimento === 'humano' ? "bg-emerald-500" : "bg-[#b84c6b]")} />
                    <span className="text-[10px] font-semibold text-[#745e69] dark:text-white/50">
                      {c.atendimento === 'humano' ? 'Suporte Humano' : 'Respostas IA'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main: Chat Hub ── */}
      <main className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-[#121214]",
        !mobileChat && !selecionada ? "hidden lg:flex" : "flex"
      )}>
        {!selecionada ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/[0.04] dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] text-[#d48997] shadow-sm">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-normal text-gray-900 dark:text-white">Selecione um Cliente</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                Escolha uma conversa na barra lateral para ler o histórico e responder às mensagens.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="z-10 flex min-h-16 flex-shrink-0 flex-col gap-3 border-b border-[#eae1e4] bg-white px-4 py-3 dark:border-[#28212f] dark:bg-[#18131d] md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setMobileChat(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg border border-black/[0.04] dark:border-white/10 bg-white/50 dark:bg-zinc-800">
                  <ChevronLeft size={16} />
                </button>
                <ContatoAvatar conversa={selecionada} className="h-10 w-10" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white leading-tight">{getConversaTitulo(selecionada)}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                     <p className="truncate">{getConversaSubtitulo(selecionada)}</p>
                     <div className="w-1 h-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-700" />
                     <span className="flex items-center gap-1 text-emerald-500 shrink-0 font-medium">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Online
                     </span>
                     <div className="w-1 h-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-700" />
                     <span className="flex items-center gap-1 shrink-0 font-medium">
                       {selecionada.atendimento === 'humano' ? 'Humano' : 'IA Ativa'}
                     </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/agenda?novoAgendamento=1&telefone=${selecionada.telefone}&nome=${encodeURIComponent(selecionada.nomeCliente || '')}`)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 transition hover:border-[#d48997] hover:text-[#d48997]"
                >
                  <Calendar size={13} /> Agendar
                </button>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={selecionada.atendimento === 'ia' ? assumir : soltarIA}
                  className={cn(
                    "h-9 px-4 rounded-xl text-xs font-semibold text-white transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                    selecionada.atendimento === 'ia' 
                    ? "bg-[#b84c6b] hover:bg-[#9c3b57]" 
                    : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {selecionada.atendimento === 'ia' ? <Zap size={13} /> : <Bot size={13} />}
                  <span>{actionLabel}</span>
                </motion.button>
                
                <div className="w-px h-5 bg-black/[0.06] dark:bg-white/10 mx-1 shrink-0" />
                
                <button 
                  onClick={fechar}
                  title="Arquivar conversa"
                  className="w-9 h-9 shrink-0 flex items-center justify-center bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/10 rounded-xl hover:text-red-500 transition-colors text-gray-400"
                >
                  <Archive size={14} />
                </button>
              </div>
            </header>

            {/* Messages Canvas */}
            <div 
              ref={chatRef}
              className="relative flex-1 min-h-0 overflow-y-auto bg-gray-50/50 dark:bg-white/[0.01] px-4 py-6 space-y-6 custom-scrollbar md:px-6"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-full text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border border-black/[0.03] dark:border-white/5 shadow-sm">
                  Início em {inicioConversa ? new Date(inicioConversa).toLocaleDateString('pt-BR') : 'hoje'}
                </div>
              </div>
              {erro ? (
                <div className="mx-auto max-w-xl rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-200 font-medium">
                  {erro}
                </div>
              ) : null}

              <div className="space-y-4 max-w-3xl mx-auto">
                <AnimatePresence mode="popLayout">
                  {mensagens.map((m, index) => (
                    <MensagemBolha key={m.id || `mensagem-${index}`} m={m} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Smart Input Bar */}
            <footer className="border-t border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b] p-3 md:p-4 shrink-0">
              <form 
                onSubmit={enviar}
                className="group relative flex items-end gap-2 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-2 focus-within:border-[#d48997] focus-within:ring-2 focus-within:ring-[#d48997]/10 transition-all max-w-3xl mx-auto"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={selecionarArquivo}
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviandoAlgo}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-[#d48997] hover:bg-[#d48997]/5 transition-all disabled:opacity-50 dark:hover:bg-zinc-800"
                    title="Anexar arquivo"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={alternarGravacaoAudio}
                    disabled={enviandoMidia}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-50',
                      gravandoAudio
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-[#d48997] hover:bg-[#d48997]/5 dark:hover:bg-zinc-800'
                    )}
                    title="Gravar áudio"
                  >
                    <Mic size={16} />
                  </button>
                </div>
                
                <div className="relative flex-1 flex flex-col justify-center min-w-0">
                  {showSnippets && snippets.length > 0 && (
                    <div className="absolute bottom-full mb-3 left-0 w-full max-w-xs bg-white dark:bg-[#18181b] border border-black/[0.08] dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-[100]">
                      <div className="bg-gray-50 dark:bg-white/[0.01] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400 border-b border-black/[0.04] dark:border-white/5">
                        Respostas Rápidas
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {snippets.filter(s => s.atalho.toLowerCase().includes(texto.substring(1).toLowerCase())).map(snippet => (
                          <button
                            key={snippet.id}
                            type="button"
                            onClick={() => {
                              setTexto(snippet.texto);
                              setShowSnippets(false);
                              if (inputRef.current) inputRef.current.focus();
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#d48997]/5 border-b border-black/[0.03] dark:border-white/5 last:border-0 transition-colors"
                          >
                            <div className="text-[10px] font-semibold text-[#d48997]">/{snippet.atalho}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{snippet.texto}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={texto}
                    onChange={e => {
                      const val = e.target.value;
                      setTexto(val);
                      if (val.startsWith('/')) {
                        setShowSnippets(true);
                      } else {
                        setShowSnippets(false);
                      }
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (showSnippets) {
                          const filtrados = snippets.filter(s => s.atalho.toLowerCase().includes(texto.substring(1).toLowerCase()));
                          if (filtrados.length > 0) {
                            setTexto(filtrados[0].texto);
                            setShowSnippets(false);
                            return;
                          }
                        }
                        enviar();
                      }
                    }}
                    placeholder={gravandoAudio ? `Gravando áudio ${formatarDuracaoCurta(duracaoGravacao)}...` : "Escreva uma mensagem... (Use / para respostas rápidas)"}
                    className="w-full bg-transparent border-none outline-none py-2 px-1 text-xs text-gray-800 dark:text-gray-200 resize-none max-h-32 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                  {enviandoMidia && (
                    <div className="absolute top-0 right-0 h-full flex items-center pr-2">
                       <span className="text-[9px] font-semibold uppercase text-[#d48997] animate-pulse">Enviando arquivo...</span>
                    </div>
                  )}
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!texto.trim() || enviandoAlgo || gravandoAudio}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#d48997] text-white transition-all hover:bg-[#c97b8a] disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 dark:disabled:text-gray-600 shadow-sm"
                >
                  {enviandoAlgo ? <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" /> : <Send size={13} />}
                </motion.button>
              </form>
            </footer>
          </>
        )}
      </main>

      {/* ── Context Sidebar ── */}
      <AnimatePresence>
        {showContextSidebar && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isCompactPanel ? 210 : 230, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex flex-col gap-4 overflow-hidden border-l border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-[#18181b]/50 p-4"
          >
             <div className="flex flex-col items-center text-center pb-4 border-b border-black/[0.04] dark:border-white/5">
               <ContatoAvatar conversa={selecionada} className="h-16 w-16 mb-3" fallbackClassName="text-2xl" />
               <h4 className="font-serif text-base font-normal text-gray-900 dark:text-white truncate w-full">{getConversaTitulo(selecionada)}</h4>
               <p className="text-xs text-gray-400 mt-0.5">{selecionada.telefone || 'Sem telefone'}</p>
             </div>
             
             <div className="space-y-4">
               <div>
                 <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Status da Fila</span>
                 <Badge active={selecionada.atendimento !== 'humano'}>
                   {selecionada.atendimento === 'humano' ? 'Suporte Humano' : 'Respostas por IA'}
                 </Badge>
               </div>

               <div className="grid grid-cols-2 gap-3 pt-2">
                 <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b] p-3">
                   <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Registrado</span>
                   <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mt-1">
                     {inicioConversa ? new Date(inicioConversa).toLocaleDateString('pt-BR') : '--/--'}
                   </span>
                 </div>
                 <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b] p-3">
                   <span className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Última Ação</span>
                   <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mt-1">
                     {formatarHora(selecionada.updatedAt) || '--:--'}
                   </span>
                 </div>
               </div>
             </div>

             <div className="flex-1 flex flex-col justify-end gap-2.5">
               <button
                 onClick={() => navigate(`/admin/agenda?novoAgendamento=1&telefone=${selecionada.telefone}&nome=${encodeURIComponent(selecionada.nomeCliente || '')}`)}
                 className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
               >
                 <Plus size={14} /> Novo Agendamento
               </button>
               <button
                 onClick={selecionada.atendimento === 'ia' ? assumir : soltarIA}
                 className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#b84c6b] hover:bg-[#9c3b57] text-xs font-semibold text-white transition shadow-sm"
               >
                 {selecionada.atendimento === 'ia' ? <Zap size={14} /> : <Bot size={14} />}
                 {selecionada.atendimento === 'ia' ? 'Assumir Chat' : 'Devolver para IA'}
               </button>
               <button
                 onClick={fechar}
                 className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-transparent bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition text-xs font-semibold"
               >
                 <Archive size={14} /> Arquivar Conversa
               </button>
             </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
}

function MensagemMidia({ m, isClient }) {
  const mediaSrc = getMensagemMediaSrc(m);
  if (!mediaSrc && !m?.nomeArquivo) return null;

  const mediaCardClass = cn(
    "rounded-xl border p-2.5 mb-2.5",
    isClient
      ? "bg-gray-50 dark:bg-zinc-800 border-black/[0.04] dark:border-white/5 text-gray-700 dark:text-gray-300"
      : "bg-white/10 border-white/20 text-white"
  );

  if (m.tipo === 'imagem') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
          <ImageIcon size={12} />
          Imagem
        </div>
        <img
          src={mediaSrc}
          alt={m.nomeArquivo || 'Imagem recebida'}
          className="w-full max-h-72 object-cover rounded-lg"
        />
      </div>
    );
  }

  if (m.tipo === 'audio') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
          <Mic size={12} />
          Áudio
          {m.duracaoSeg ? <span>({Math.round(m.duracaoSeg)}s)</span> : null}
        </div>
        {mediaSrc ? (
          <audio controls src={mediaSrc} className="w-full h-8" preload="metadata" />
        ) : (
          <p className="text-xs italic">Áudio recebido sem pré-visualização.</p>
        )}
      </div>
    );
  }

  if (m.tipo === 'video') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider opacity-80">
          <Film size={12} />
          Vídeo
        </div>
        {mediaSrc ? (
          <video controls src={mediaSrc} className="w-full max-h-72 rounded-lg" preload="metadata" />
        ) : (
          <p className="text-xs italic">Vídeo recebido sem pré-visualização.</p>
        )}
      </div>
    );
  }

  return (
    <div className={mediaCardClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              isClient ? "bg-white dark:bg-zinc-700 text-[#d48997]" : "bg-white/15 text-white"
            )}
          >
            <Paperclip size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Anexo</p>
            <p className="text-xs font-medium truncate">{m.nomeArquivo || 'Arquivo recebido'}</p>
          </div>
        </div>
        {mediaSrc ? (
          <a
            href={mediaSrc}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
              isClient ? "bg-[#d48997] text-white" : "bg-white text-[#d48997]"
            )}
          >
            <Download size={11} />
            Baixar
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MensagemBolha({ m }) {
  const mensagem = normalizeMensagem(m);
  const isClient = mensagem.direcao === 'entrada';
  const isIA = mensagem.origem === 'ia';
  const conteudo = String(mensagem.conteudo || '');
  const exibirTexto = Boolean(conteudo) && (!isDescricaoGenericaDeMidia(mensagem) || !getMensagemMediaSrc(mensagem));
  
  if (isIA && conteudo.startsWith('[RESUMO]')) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ contentVisibility: 'auto', containIntrinsicSize: '120px' }}
        className="flex justify-center"
      >
        <div className="max-w-[85%] bg-[#d48997]/5 dark:bg-[#d48997]/5 border border-[#d48997]/15 rounded-2xl p-5 relative overflow-hidden group hover:border-[#d48997]/30 transition-all">
          <div className="flex items-center gap-2 text-[#d48997] mb-2">
            <Sparkles className="animate-pulse" size={15} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Resumo de Atendimento por IA</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
            "{conteudo.replace('[RESUMO]', '').trim()}"
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '80px' }}
      className={cn(
        "flex flex-col group",
        isClient ? "items-start" : "items-end"
      )}
    >
      <div className={cn(
        "flex items-center gap-2 mb-1 px-1.5 text-[9px] text-gray-400 dark:text-gray-500",
        isClient ? "flex-row" : "flex-row-reverse"
      )}>
        <span className="font-semibold uppercase tracking-wider">
          {isClient ? 'Cliente' : isIA ? 'Assistente IA' : 'Atendente'}
        </span>
        <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-800" />
        <span>{formatarHora(mensagem.createdAt)}</span>
      </div>
      
      <div className={cn(
        "relative max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm",
        isClient
          ? "rounded-tl-sm border-[#eae1e4] bg-white text-[#23141c] dark:border-[#28212f] dark:bg-[#1c1721] dark:text-white"
          : "rounded-tr-sm border-[#eccbd4] bg-[#fdf2f5] text-[#23141c] dark:border-[#c65d7b]/30 dark:bg-[#c65d7b]/20 dark:text-white"
      )}>
        {mensagem.tipo && mensagem.tipo !== 'texto' ? <MensagemMidia m={mensagem} isClient={isClient} /> : null}
        {exibirTexto ? (
          <p className="text-xs whitespace-pre-wrap leading-relaxed break-words font-normal">{conteudo}</p>
        ) : null}
        <div className={cn(
          "flex items-center gap-1 mt-1.5 opacity-60",
          isClient ? "justify-start text-gray-400" : "justify-end text-[#d48997]"
        )}>
          {!isClient && <CheckCheck size={11} />}
        </div>
      </div>
    </motion.div>
  );
}
