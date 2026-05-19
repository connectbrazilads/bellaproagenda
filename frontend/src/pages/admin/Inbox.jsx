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
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getConversas,
  getMensagens,
  atualizarConversa,
  responderConversa,
  responderConversaMidia,
  getRespostasRapidas,
  uploadImage,
} from '../../services/api';
import { cn } from '../../lib/utils';
import useElementWidth from '../../hooks/useElementWidth';

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api';

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

function getMensagemResumo(mensagem) {
  if (!mensagem) return 'Iniciando conversa...';

  if (mensagem.tipo === 'imagem') return mensagem.conteudo || 'Imagem recebida';
  if (mensagem.tipo === 'audio') return mensagem.conteudo || 'Audio recebido';
  if (mensagem.tipo === 'anexo') return mensagem.conteudo || `Anexo${mensagem.nomeArquivo ? `: ${mensagem.nomeArquivo}` : ' recebido'}`;
  if (mensagem.tipo === 'video') return mensagem.conteudo || 'Video recebido';

  return mensagem.conteudo || 'Iniciando conversa...';
}

function isDescricaoGenericaDeMidia(mensagem) {
  if (!mensagem?.tipo || mensagem.tipo === 'texto') return false;

  const conteudo = String(mensagem.conteudo || '').trim().toLowerCase();
  return ['imagem recebida', 'audio recebido', 'video recebido', 'anexo recebido'].includes(conteudo);
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
      <div className={cn('flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-[#d48997] shadow-inner dark:bg-gray-950 dark:text-[#efbac2]', fallbackClassName)}>
        {conversa?.avatarUrl ? (
          <img src={conversa.avatarUrl} alt={getConversaTitulo(conversa)} className="h-full w-full object-cover" />
        ) : (
          <span className="font-black uppercase">{fallback}</span>
        )}
      </div>
      {showBadge ? (
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white text-[8px] shadow-lg dark:border-gray-900',
            conversa?.atendimento === 'humano' ? 'bg-emerald-500 text-white' : 'bg-[#d48997] text-white'
          )}
        >
          {conversa?.atendimento === 'humano' ? <User size={10} /> : <Bot size={10} />}
        </div>
      ) : null}
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
      setConversas(r.data);
    } catch {
      setErro('Nao foi possivel carregar as conversas agora.');
    } finally {
      if (!silent) setLoadingConversas(false);
    }
  }, [filtro]);

  const carregarMensagens = useCallback(async ({ silent = false } = {}) => {
    if (!selecionada) return;
    if (!silent) setLoadingMensagens(true);
    try {
      const r = await getMensagens(selecionada.id);
      setMensagens(r.data);
    } catch {
      setErro('Nao foi possivel carregar as mensagens desta conversa.');
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

  const totalAbertas = conversas.filter((c) => c.status !== 'fechada').length;
  const totalIa = conversas.filter((c) => c.atendimento === 'ia').length;
  const totalHumano = conversas.filter((c) => c.atendimento === 'humano').length;
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
      setErro(error?.response?.data?.error || 'Nao foi possivel enviar a mensagem agora.');
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
        throw new Error('Nao foi possivel gerar a URL do arquivo.');
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
      setErro(error?.response?.data?.error || error?.message || 'Nao foi possivel enviar o arquivo agora.');
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
      setErro('Seu navegador nao suporta gravacao de audio nesta tela.');
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
      setErro('Nao foi possivel acessar o microfone agora.');
      encerrarCapturaAudio();
      setGravandoAudio(false);
    }
  }

  const filteredConversas = conversas.filter(c => 
    (c.nomeCliente || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.telefone || '').includes(search)
  );
  const inicioConversa = mensagens[0]?.createdAt || selecionada?.updatedAt || null;
  const isCompactPanel = panelWidth < 1380;
  const isTightPanel = panelWidth < 1180;
  const isUltraTightPanel = panelWidth < 980;
  const showContextSidebar = Boolean(selecionada && panelWidth >= 1520);
  const showInlineContext = Boolean(selecionada && !showContextSidebar);
  const actionLabel = selecionada?.atendimento === 'ia'
    ? (isTightPanel ? 'ASSUMIR' : 'ASSUMIR ATENDIMENTO')
    : (isTightPanel ? 'VOLTAR IA' : 'RETORNAR PARA IA');

  return (
    <motion.div 
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[70vh] overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[#fffaf9] dark:bg-[#17151b] shadow-[0_18px_48px_-30px_rgba(0,0,0,0.3)] lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-7rem)] lg:rounded-[2.5rem]"
    >
      
      {/* ── Sidebar: Lista de Conversas ── */}
      <aside className={cn(
        "w-full min-h-0 flex flex-col border-r border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#1d1a22]",
        isCompactPanel ? "lg:w-[19rem] xl:w-[20rem]" : "lg:w-80 xl:w-96",
        mobileChat ? "hidden lg:flex" : "flex"
      )}>
        <div className="flex-shrink-0 space-y-5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black tracking-tight text-[#2f2430] dark:text-white">Inbox</h1>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#d48997]/10 text-[#d48997] shadow-inner">
              <span className="text-xs font-black">{conversas.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <QuickMetric label="Abertas" value={totalAbertas} />
            <QuickMetric label="IA" value={totalIa} />
            <QuickMetric label="Humano" value={totalHumano} />
          </div>
          
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#d48997] transition-colors" />
            <input 
              type="text" 
              placeholder="Escreva para buscar nome ou telefone"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-4 pl-14 text-sm font-bold text-[#3b2a35] outline-none transition-all shadow-sm placeholder:text-[#9f848d] focus:ring-4 focus:ring-[#E29BA8]/5 dark:border-white/10 dark:bg-gray-950/50 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FILTROS.map((f, i) => (
              <button
                key={i}
                onClick={() => { setFiltro(i); setSelecionada(null); setErro(''); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  filtro === i 
                  ? "bg-[#d48997] text-white shadow-xl shadow-[#E29BA8]/20 border-[#E29BA8]" 
                  : "bg-white dark:bg-gray-950/50 text-gray-400 border-gray-100 dark:border-white/10 hover:border-[#E29BA8]/20 dark:hover:border-[#8c4a57]/30"
                )}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-8 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredConversas.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center space-y-4 opacity-40"
              >
                <Archive size={48} className="mx-auto text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nenhuma conversa por aqui</p>
              </motion.div>
            ) : (
              filteredConversas.map(c => (
                <motion.button
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={c.id}
                  onClick={() => { setSelecionada(c); setMobileChat(true); setMensagens([]); setErro(''); }}
                  className={cn(
                    "group flex w-full gap-3 rounded-[1.5rem] border p-3.5 text-left transition-all",
                    selecionada?.id === c.id 
                    ? "bg-white dark:bg-[#25212b] shadow-lg border-[#E29BA8]/30" 
                    : "bg-transparent border-transparent hover:bg-white/70 dark:hover:bg-white/5"
                  )}
                >
                  <ContatoAvatar conversa={c} className="h-14 w-14" fallbackClassName="text-xl transition-transform group-hover:scale-105" showBadge />
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-gray-900 dark:text-white truncate tracking-tight text-sm">
                        {getConversaTitulo(c)}
                      </h4>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatarHora(c.updatedAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-relaxed font-bold">
                      {getMensagemResumo(c.ultimaMensagem)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="w-1 h-1 rounded-full bg-emerald-500" />
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{c.atendimento === 'humano' ? 'Em atendimento' : 'IA ativa'}</span>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ── Main: Chat Hub ── */}
      <main className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#fcf7f5] dark:bg-[#151319]",
        !mobileChat && !selecionada ? "hidden md:flex" : "flex"
      )}>
        {!selecionada ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 md:p-8 space-y-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#211d24] text-[#d48997] shadow-sm">
              <MessageSquare size={40} />
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Selecione uma conversa</h3>
              <p className="mx-auto mt-3 max-w-sm leading-relaxed text-gray-500 dark:text-gray-400">As mensagens novas aparecem aqui assim que entrarem no inbox.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="z-10 flex min-h-20 flex-shrink-0 flex-col gap-4 border-b border-gray-200 dark:border-white/5 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-2xl dark:bg-[#1a1720] md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex items-center gap-4 md:gap-5 min-w-0">
                <button onClick={() => setMobileChat(false)} className="md:hidden p-3 bg-gray-50 rounded-xl">
                  <ChevronLeft size={20} />
                </button>
                <ContatoAvatar conversa={selecionada} className="h-14 w-14" fallbackClassName="text-xl" />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black tracking-tight text-gray-900 dark:text-white">{getConversaTitulo(selecionada)}</h3>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-500 dark:text-gray-400">{getConversaSubtitulo(selecionada)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Ativo
                    </span>
                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {selecionada.atendimento === 'humano' ? 'Em atendimento humano' : 'IA ativa'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={cn("flex items-center gap-3 self-stretch md:self-auto", isTightPanel && "flex-col items-stretch md:flex-row")}>
                {showInlineContext ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/agenda?novoAgendamento=1&telefone=${selecionada.telefone}&nome=${encodeURIComponent(selecionada.nomeCliente || '')}`)}
                    className="flex h-14 items-center justify-center rounded-[1.5rem] border border-gray-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-[#6f5561] transition-all hover:border-[#d48997]/30 hover:text-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                  >
                    Agendar
                  </button>
                ) : null}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={selecionada.atendimento === 'ia' ? assumir : soltarIA}
                  className={cn(
                    "flex-1 md:flex-none px-4 md:px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-3",
                    selecionada.atendimento === 'ia' 
                    ? "bg-[#d48997] text-white" 
                    : "bg-emerald-600 text-white"
                  )}
                >
                  {selecionada.atendimento === 'ia' ? <Zap size={14} className="text-yellow-400 fill-yellow-400" /> : <Bot size={14} />}
                  {actionLabel}
                </motion.button>
                <div className="hidden md:block w-px h-10 bg-gray-100 dark:bg-white/5" />
                <button 
                  onClick={fechar}
                  className="w-14 h-14 shrink-0 flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-red-500 hover:text-gray-900 dark:text-white transition-all text-gray-400 shadow-sm"
                >
                  <Archive size={20} />
                </button>
              </div>
            </header>

            {showInlineContext ? (
              <section className="border-b border-gray-100 bg-white/78 px-4 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.03] md:px-6">
                <div className={cn("grid gap-2", isUltraTightPanel ? "grid-cols-2" : "grid-cols-4")}>
                  <SideInfo icon={<Calendar />} label="Criada em" value={inicioConversa ? new Date(inicioConversa).toLocaleDateString('pt-BR') : '--/--/----'} />
                  <SideInfo icon={<Clock />} label="Ultima acao" value={formatarHora(selecionada.updatedAt) || '--:--'} />
                  <SideInfo icon={<Bot />} label="Modo" value={selecionada.atendimento === 'humano' ? 'Humano' : 'IA'} />
                  <SideInfo icon={<Archive />} label="Status" value={selecionada.status === 'fechada' ? 'Arquivada' : 'Aberta'} />
                </div>
              </section>
            ) : null}

            {/* Messages Canvas */}
            <div 
              ref={chatRef}
              className="relative flex-1 min-h-0 overflow-y-auto bg-[linear-gradient(180deg,_rgba(255,255,255,0.86),_rgba(249,243,240,0.96))] px-4 py-6 space-y-8 custom-scrollbar dark:bg-[linear-gradient(180deg,_rgba(25,23,30,0.96),_rgba(20,18,24,0.98))] md:px-10 md:py-10"
            >
              <div className="flex justify-center mb-12">
                <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-2 rounded-full text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] border border-gray-100 dark:border-white/5 shadow-sm">
                  Conversa iniciada em {inicioConversa ? new Date(inicioConversa).toLocaleDateString('pt-BR') : 'agora'}
                </div>
              </div>
              {erro ? (
                <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  {erro}
                </div>
              ) : null}

              <AnimatePresence mode="popLayout">
                {mensagens.map((m) => (
                  <MensagemBolha key={m.id} m={m} />
                ))}
              </AnimatePresence>
            </div>

            {/* Smart Input Bar */}
            <footer className="border-t border-gray-100 bg-white/85 p-4 backdrop-blur-3xl dark:border-white/5 dark:bg-gray-900/80 md:p-5">
              <form 
                onSubmit={enviar}
                className="group flex items-end gap-2 rounded-[1.75rem] border border-gray-100 bg-gray-50 p-2 shadow-inner transition-all focus-within:ring-4 focus-within:ring-[#E29BA8]/5 dark:border-white/10 dark:bg-gray-950/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                  onChange={selecionarArquivo}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={enviandoAlgo}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-white text-[#7d6470] transition-all hover:border-[#d48997]/20 hover:text-[#d48997] disabled:opacity-50 dark:bg-white/5 dark:text-gray-300"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  onClick={alternarGravacaoAudio}
                  disabled={enviandoMidia}
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all disabled:opacity-50',
                    gravandoAudio
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'border border-transparent bg-white text-[#7d6470] hover:border-[#d48997]/20 hover:text-[#d48997] dark:bg-white/5 dark:text-gray-300'
                  )}
                >
                  <Mic size={18} />
                </button>
                <div className="relative flex-1 rounded-[1.3rem] bg-white px-4 py-3 dark:bg-black/20">
                  {showSnippets && snippets.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-0 w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                      <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100 dark:border-white/5">
                        Respostas rapidas
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
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors"
                          >
                            <div className="text-xs font-black text-[#d48997]">/{snippet.atalho}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate mt-0.5">{snippet.texto}</div>
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
                      e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
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
                    placeholder="Escreva uma mensagem..."
                    className="w-full bg-transparent border-none outline-none py-3 text-sm font-bold text-gray-700 dark:text-gray-200 resize-none max-h-48 placeholder:text-[#9f848d] dark:placeholder:text-gray-500"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                    <span>
                      {gravandoAudio ? `Gravando ${formatarDuracaoCurta(duracaoGravacao)}` : (isUltraTightPanel ? 'Digite /' : 'Digite / para resposta rapida')}
                    </span>
                    {enviandoMidia ? <span>Enviando arquivo...</span> : null}
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!texto.trim() || enviandoAlgo || gravandoAudio}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d48997] text-white transition-all hover:bg-[#b96a79] disabled:bg-gray-200 dark:disabled:bg-white/5"
                >
                  {enviandoAlgo ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={18} />}
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
            animate={{ width: isCompactPanel ? 208 : 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex flex-col gap-4 overflow-hidden border-l border-gray-100 bg-gray-50/40 p-4 backdrop-blur-xl dark:border-white/5 dark:bg-white/5"
          >
             <div className="flex items-center gap-3">
               <ContatoAvatar conversa={selecionada} className="h-14 w-14" fallbackClassName="text-xl" />
               <div className="min-w-0">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Contexto</p>
               <h4 className="mt-1 truncate text-base font-black tracking-tight text-gray-900 dark:text-white">{getConversaTitulo(selecionada)}</h4>
               <p className="mt-1 break-all text-sm text-gray-500">{selecionada.telefone || 'Telefone nao informado'}</p>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
               <SideInfo icon={<Calendar />} label="Criada em" value={inicioConversa ? new Date(inicioConversa).toLocaleDateString('pt-BR') : '--/--/----'} />
               <SideInfo icon={<Clock />} label="Ultima acao" value={formatarHora(selecionada.updatedAt) || '--:--'} />
               <SideInfo icon={<Bot />} label="Modo" value={selecionada.atendimento === 'humano' ? 'Humano' : 'IA'} />
               <SideInfo icon={<Archive />} label="Status" value={selecionada.status === 'fechada' ? 'Arquivada' : 'Aberta'} />
             </div>
             <div className="space-y-2">
               <ActionButton onClick={() => navigate(`/admin/agenda?novoAgendamento=1&telefone=${selecionada.telefone}&nome=${encodeURIComponent(selecionada.nomeCliente || '')}`)} icon={<Plus size={16} />} tone="soft">
                 Agendar Agora
               </ActionButton>
               <ActionButton onClick={selecionada.atendimento === 'ia' ? assumir : soltarIA} icon={selecionada.atendimento === 'ia' ? <Zap size={16} /> : <Bot size={16} />} tone="primary">
                 {selecionada.atendimento === 'ia' ? 'Assumir atendimento' : 'Devolver para IA'}
               </ActionButton>
               <ActionButton onClick={fechar} icon={<Archive size={16} />} tone="danger">
                 Arquivar conversa
               </ActionButton>
             </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QuickMetric({ label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-gray-100 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/5">
      <p className="text-lg font-black text-gray-900 dark:text-white">{value}</p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
  );
}

function SideInfo({ icon, label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-gray-100 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4">
      <div className="flex items-center gap-2 text-gray-400">
        {React.cloneElement(icon, { size: 14 })}
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-black text-gray-900 dark:text-white break-words">{value}</p>
    </div>
  );
}

function ActionButton({ children, icon, onClick, tone }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center gap-2 rounded-[1.5rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
        tone === 'danger'
          ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-gray-900 dark:text-white"
          : tone === 'soft'
            ? "border border-gray-200 bg-white text-[#6f5561] hover:border-[#d48997]/30 hover:text-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
            : "bg-[#d48997] text-white hover:bg-[#b96a79]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function MensagemMidia({ m, isClient }) {
  const mediaSrc = getMensagemMediaSrc(m);
  if (!mediaSrc && !m?.nomeArquivo) return null;

  const mediaCardClass = cn(
    "rounded-[1.25rem] border p-3 mb-3",
    isClient
      ? "bg-gray-50 border-gray-100 text-gray-700"
      : "bg-white/10 border-white/20 text-white"
  );

  if (m.tipo === 'imagem') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-[0.2em] opacity-80">
          <ImageIcon size={14} />
          Imagem
        </div>
        <img
          src={mediaSrc}
          alt={m.nomeArquivo || 'Imagem recebida'}
          className="w-full max-h-80 object-cover rounded-[1rem]"
        />
      </div>
    );
  }

  if (m.tipo === 'audio') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-[0.2em] opacity-80">
          <Mic size={14} />
          Audio
          {m.duracaoSeg ? <span>{Math.round(m.duracaoSeg)}s</span> : null}
        </div>
        {mediaSrc ? (
          <audio controls src={mediaSrc} className="w-full" preload="metadata" />
        ) : (
          <p className="text-sm font-bold">Audio recebido sem preview disponivel.</p>
        )}
      </div>
    );
  }

  if (m.tipo === 'video') {
    return (
      <div className={mediaCardClass}>
        <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-[0.2em] opacity-80">
          <Film size={14} />
          Video
        </div>
        {mediaSrc ? (
          <video controls src={mediaSrc} className="w-full max-h-80 rounded-[1rem]" preload="metadata" />
        ) : (
          <p className="text-sm font-bold">Video recebido sem preview disponivel.</p>
        )}
      </div>
    );
  }

  return (
    <div className={mediaCardClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              isClient ? "bg-white text-[#d48997]" : "bg-white/15 text-white"
            )}
          >
            <Paperclip size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Anexo</p>
            <p className="text-sm font-bold truncate">{m.nomeArquivo || 'Arquivo recebido'}</p>
          </div>
        </div>
        {mediaSrc ? (
          <a
            href={mediaSrc}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
              isClient ? "bg-white text-[#d48997]" : "bg-white text-[#b96a79]"
            )}
          >
            <Download size={14} />
            Abrir
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MensagemBolha({ m }) {
  const isClient = m.direcao === 'entrada';
  const isIA = m.origem === 'ia';
  const exibirTexto = Boolean(m.conteudo) && (!isDescricaoGenericaDeMidia(m) || !getMensagemMediaSrc(m));
  
  if (isIA && m.conteudo.startsWith('[RESUMO]')) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <div className="max-w-[80%] bg-[#d48997]/5 dark:bg-[#8c4a57]/10 border border-[#E29BA8]/10 dark:border-purple-800/30 rounded-[2rem] p-4 md:p-8 space-y-4 relative overflow-hidden group hover:border-[#E29BA8] transition-all">
          <div className="flex items-center gap-3 text-[#d48997]">
            <Sparkles className="animate-pulse" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Resumo da IA</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-bold italic">
            "{m.conteudo.replace('[RESUMO]', '').trim()}"
          </p>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#d48997]/5 rounded-full blur-2xl group-hover:bg-[#d48997]/10 transition-colors" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex flex-col group",
        isClient ? "items-start" : "items-end"
      )}
    >
      <div className={cn(
        "flex items-center gap-3 mb-2 px-2",
        isClient ? "flex-row" : "flex-row-reverse"
      )}>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          {isClient ? 'Cliente' : isIA ? 'IA' : 'Atendente'}
        </span>
        <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-white/10" />
        <span className="text-[9px] text-gray-400 font-black tracking-tighter">{formatarHora(m.createdAt)}</span>
      </div>
      
      <div className={cn(
        "px-6 py-4 rounded-[1.8rem] shadow-sm border relative max-w-[80%] transition-all hover:scale-[1.01]",
        isClient 
        ? "bg-white dark:bg-gray-900 border-gray-100 dark:border-white/5 rounded-tl-sm text-gray-800 dark:text-gray-100" 
        : "bg-[#dcf8e8] dark:bg-[#2c5a44] border-[#c7e9d6] dark:border-[#376a51] rounded-tr-sm text-[#123524] dark:text-white"
      )}>
        {m.tipo && m.tipo !== 'texto' ? <MensagemMidia m={m} isClient={isClient} /> : null}
        {exibirTexto ? (
          <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed break-words">{m.conteudo}</p>
        ) : null}
        <div className={cn(
          "flex items-center gap-1 mt-2 opacity-40",
          isClient ? "justify-start" : "justify-end"
        )}>
          {!isClient && <CheckCheck size={12} className="text-[#0f5132] dark:text-white" />}
        </div>
        
        {/* Tail decoration */}
        <div className={cn(
          "absolute top-0 w-4 h-4 overflow-hidden",
          isClient ? "-left-4" : "-right-4"
        )}>
           <div className={cn(
             "w-4 h-4 rotate-45 transform origin-top shadow-sm",
             isClient ? "bg-white dark:bg-gray-900 -translate-x-2" : "bg-[#dcf8e8] dark:bg-[#2c5a44] translate-x-2"
           )} />
        </div>
      </div>
    </motion.div>
  );
}
