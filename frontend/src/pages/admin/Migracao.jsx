import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Sparkles,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { importarClientes } from '../../services/api';
import { cn } from '../../lib/utils';

function detectSeparator(text) {
  const lines = text.split('\n').slice(0, 5);
  let semicolons = 0;
  let commas = 0;

  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
  }

  return semicolons > commas ? ';' : ',';
}

function idx(header, ...keywords) {
  return header.findIndex((item) => keywords.some((keyword) => item.includes(keyword)));
}

function val(values, index) {
  if (index < 0 || !values[index]) return '';
  return values[index].trim().replace(/^["']|["']$/g, '').trim();
}

function parseDateBR(value) {
  if (!value) return '';
  const match = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const separator = detectSeparator(text);
  const regex = new RegExp(`${separator}(?=(?:(?:[^\"]*\"){2})*[^\"]*$)`);
  const header = lines[0]
    .split(separator)
    .map((item) => item.trim().toLowerCase().replace(/['"]/g, ''));

  const columns = {
    nome: idx(header, 'nome'),
    apelido: idx(header, 'apelido', 'nick', 'alias'),
    telefones: header
      .map((item, index) =>
        item.includes('tel') || item.includes('celular') || item.includes('fone') || item.includes('contato')
          ? index
          : -1
      )
      .filter((index) => index >= 0),
    email: idx(header, 'email', 'e-mail'),
    instagram: idx(header, 'instagram', 'insta'),
    dataNascimento: idx(header, 'nasc', 'nascimento', 'aniversario', 'aniv'),
    endereco: idx(header, 'endere', 'rua', 'logradouro'),
    numero: idx(header, 'numero', 'número', 'nro', 'num'),
    complemento: idx(header, 'compl'),
    bairro: idx(header, 'bairro'),
    cep: idx(header, 'cep'),
    cidade: idx(header, 'cidade'),
    estado: idx(header, 'estado', 'uf'),
    rg: idx(header, 'rg'),
    cpf: idx(header, 'cpf'),
    sexo: idx(header, 'sexo', 'genero', 'gênero'),
  };

  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(regex).map((item) => item.trim().replace(/^["']|["']$/g, ''));
      if (values.length < 2) return null;

      let telefone = '';
      for (const index of columns.telefones) {
        const normalized = (values[index] || '').replace(/\D/g, '');
        if (normalized.length >= 8) {
          telefone = normalized;
          break;
        }
      }

      const nomeBruto = val(values, columns.nome);
      const nome = nomeBruto.split(';')[0].trim();
      if (!nome && !telefone) return null;

      return {
        nome: nome || 'Cliente importado',
        apelido: val(values, columns.apelido) || undefined,
        telefone,
        email: val(values, columns.email) || undefined,
        instagram: val(values, columns.instagram) || undefined,
        cpf: val(values, columns.cpf) || undefined,
        rg: val(values, columns.rg) || undefined,
        sexo: val(values, columns.sexo) || undefined,
        dataNascimento: parseDateBR(val(values, columns.dataNascimento)) || undefined,
        endereco: val(values, columns.endereco) || undefined,
        numero: val(values, columns.numero) || undefined,
        complemento: val(values, columns.complemento) || undefined,
        bairro: val(values, columns.bairro) || undefined,
        cep: val(values, columns.cep) || undefined,
        cidade: val(values, columns.cidade) || undefined,
        estado: val(values, columns.estado) || undefined,
      };
    })
    .filter(Boolean);
}

function StepCard({ num, title, active, done, icon }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition',
        active
          ? 'border-[#b84c6b] bg-white dark:border-[#c65d7b] dark:bg-[#1c1721]'
          : 'border-[#eae1e4] bg-white/80 opacity-75 dark:border-[#28212f] dark:bg-[#18131d]'
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          done
            ? 'bg-emerald-600 text-white'
            : active
              ? 'bg-[#23141c] text-[#f0aab8] dark:bg-[#c65d7b] dark:text-white'
              : 'bg-[#f4eef1] text-[#8c727e] dark:bg-white/10 dark:text-white/50'
        )}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#745e69] dark:text-white/50">
          Passo {num}
        </p>
        <p className="mt-0.5 font-brand-display text-xl font-bold text-[#23141c] dark:text-white">
          {title}
        </p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-xs leading-relaxed text-white/80">{text}</p>
    </div>
  );
}

export default function Migracao() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fileName, setFileName] = useState('');
  const [step, setStep] = useState(1);

  function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResultado(null);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const parsed = parseCSV(loadEvent.target?.result || '');
      setDados(parsed);
      if (parsed.length > 0) setStep(2);
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function processar() {
    setLoading(true);
    try {
      const response = await importarClientes(dados);
      setResultado(response?.data || null);
      setDados([]);
      setFileName('');
      setStep(3);
    } catch {
      window.alert('Erro na importação. Verifique se o arquivo está no formato correto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-16">
      <header className="space-y-2 border-b border-[#eae1e4] pb-5 dark:border-[#28212f]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
          <Database className="h-4 w-4" />
          <span>Migração de base</span>
        </div>
        <h1 className="font-brand-display text-3xl font-bold leading-tight text-[#23141c] dark:text-white sm:text-4xl">
          Importação de <span className="italic text-[#b84c6b]">Clientes</span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#6b5761] dark:text-white/60">
          Traga sua base antiga para a BellaPro com leitura automática de colunas e validação prévia antes de gravar os dados.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard num={1} title="Upload" active={step === 1} done={step > 1} icon={<Upload className="h-5 w-5" />} />
        <StepCard num={2} title="Validação" active={step === 2} done={step > 2} icon={<FileText className="h-5 w-5" />} />
        <StepCard num={3} title="Conclusão" active={step === 3} done={false} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] sm:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#fdf2f5] text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                Subir arquivo CSV
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6b5761] dark:text-white/60">
                Exporte sua planilha em formato CSV. O sistema identifica automaticamente campos como nome, telefone, CPF e endereço.
              </p>

              <label className="mt-6 block cursor-pointer">
                <div className="rounded-2xl border-2 border-dashed border-[#dcc9d0] bg-[#faf7f5] px-8 py-14 text-center transition hover:border-[#b84c6b] hover:bg-[#fdf5f7] dark:border-[#352b3e] dark:bg-[#151119] dark:hover:border-[#c65d7b]">
                  <Upload className="mx-auto h-10 w-10 text-[#b84c6b]" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#23141c] dark:text-white">
                    {fileName || 'Clique para selecionar o arquivo (.csv ou .txt)'}
                  </p>
                </div>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] sm:p-8"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {dados.length} clientes detectados
                </span>
              </div>

              <h2 className="font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                Validar prévia
              </h2>
              <p className="mt-2 text-sm text-[#6b5761] dark:text-white/60">
                Revise uma amostra antes de importar. Se algo parecer fora do esperado, volte e ajuste o CSV.
              </p>

              <div className="mt-6 overflow-x-auto rounded-xl border border-[#eae1e4] dark:border-[#28212f]">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-[#faf7f5] text-[#745e69] dark:bg-white/[0.03] dark:text-white/55">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Telefone</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e8eb] bg-white text-[#23141c] dark:divide-[#28212f] dark:bg-[#1c1721] dark:text-white">
                    {dados.slice(0, 6).map((cliente, index) => (
                      <tr key={`${cliente.telefone}-${index}`}>
                        <td className="px-4 py-3 font-semibold">{cliente.nome}</td>
                        <td className="px-4 py-3 text-[#6b5761] dark:text-white/65">{cliente.telefone || '-'}</td>
                        <td className="px-4 py-3 text-[#6b5761] dark:text-white/65">{cliente.cidade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#e2d5da] bg-[#faf7f5] px-5 text-xs font-bold text-[#5b4852] transition hover:bg-[#f1e7ea] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/75"
                >
                  Mudar arquivo
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={processar}
                  className="editorial-btn-primary inline-flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold disabled:opacity-60"
                >
                  {loading ? 'Processando...' : <>Executar migração <ChevronRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-500/30 dark:bg-[#1c1721] sm:p-8"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-5 font-brand-display text-3xl font-bold text-[#23141c] dark:text-white">
                Importação concluída
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[#6b5761] dark:text-white/60">
                Sua base foi atualizada com sucesso. Agora você já pode acompanhar clientes, histórico e campanhas na BellaPro.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/25 dark:bg-emerald-500/15">
                  <p className="text-3xl font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
                    {resultado?.importados || 0}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                    Novos clientes
                  </p>
                </div>
                <div className="rounded-2xl border border-[#eae1e4] bg-[#faf7f5] p-5 dark:border-[#28212f] dark:bg-white/[0.03]">
                  <p className="text-3xl font-extrabold text-[#23141c] tabular-nums dark:text-white">
                    {resultado?.duplicados || 0}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#745e69] dark:text-white/55">
                    Duplicados ignorados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[#e2d5da] bg-[#faf7f5] px-6 text-xs font-bold text-[#23141c] transition hover:bg-[#f1e7ea] dark:border-[#352b3e] dark:bg-white/5 dark:text-white"
              >
                Nova importação
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#23141c] p-6 text-white shadow-md">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#f0aab8]">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-brand-display text-2xl font-bold text-white">Motor de importação</h3>
            <div className="mt-5 space-y-3.5">
              <FeatureItem
                icon={<Users className="h-4 w-4 text-[#f0aab8]" />}
                text="Leitura automática de nome, apelido, telefone e campos de cadastro mais comuns."
              />
              <FeatureItem
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                text="Normalização de telefone antes do envio para reduzir divergências de formato."
              />
              <FeatureItem
                icon={<AlertCircle className="h-4 w-4 text-amber-300" />}
                text="Registros sem contato suficiente são descartados para manter a base limpa."
              />
              <FeatureItem
                icon={<Database className="h-4 w-4 text-sky-300" />}
                text="Clientes já existentes por telefone são ignorados sem duplicar cadastros."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
              Status do serviço
            </p>
            <div className="mt-2.5 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold">Módulo de migração online</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
