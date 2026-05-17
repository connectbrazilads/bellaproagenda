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
        'flex items-center gap-5 rounded-[26px] border p-4 sm:p-6 transition',
        active
          ? 'border-[rgba(233,155,168,0.28)] bg-white dark:bg-[#1a171f]/95 shadow-[0_24px_60px_rgba(0,0,0,0.22)]'
          : 'border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.74)] opacity-80'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          done
            ? 'bg-[#2d6f56] text-white'
            : active
              ? 'bg-[rgba(233,155,168,0.16)] text-[#f7c1b6]'
              : 'bg-[rgba(255,255,255,0.05)] text-[#8f7880]'
        )}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9f848d]">Passo {num}</p>
        <p className="mt-2 font-['Playfair_Display'] text-2xl text-[#faf7f6]">{title}</p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1">{icon}</div>
      <p className="text-sm leading-7 text-[#c7adb4]">{text}</p>
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
      window.alert('Erro na importacao. Verifique se o arquivo esta no formato correto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 md:p-8 pb-16">
      <section className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <Database className="h-4 w-4" />
            Migracao de base
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Importacao de <span className="text-[#E29BA8]">Clientes</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Traga sua base antiga para a BellaPro com leitura automatica de colunas e uma validacao simples antes de gravar os dados.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StepCard num={1} title="Upload" active={step === 1} done={step > 1} icon={<Upload className="h-5 w-5" />} />
        <StepCard num={2} title="Validacao" active={step === 2} done={step > 2} icon={<FileText className="h-5 w-5" />} />
        <StepCard num={3} title="Conclusao" active={step === 3} done={false} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:p-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                <Upload className="h-7 w-7" />
              </div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Subir arquivo</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7adb4]">
                Exporte os dados em formato CSV. O sistema tenta localizar automaticamente campos como nome, telefone, CPF e endereco.
              </p>

              <label className="mt-8 block cursor-pointer">
                <div className="rounded-[2rem] border-2 border-dashed border-[rgba(233,155,168,0.18)] bg-[rgba(20,16,22,0.48)] px-8 py-16 text-center transition hover:border-[rgba(233,155,168,0.34)] hover:bg-[rgba(33,26,31,0.68)]">
                  <Upload className="mx-auto h-12 w-12 text-[#806871]" />
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">
                    {fileName || 'Clique para selecionar o arquivo'}
                  </p>
                </div>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(45,111,86,0.18)] text-[#7dd8ac]">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="rounded-full border border-[rgba(45,111,86,0.28)] bg-[rgba(45,111,86,0.14)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9be0bb]">
                  {dados.length} clientes detectados
                </div>
              </div>

              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Validar previa</h2>
              <p className="mt-4 text-sm leading-7 text-[#c7adb4]">
                Revise uma amostra antes de importar. Se algo parecer fora do esperado, volte e ajuste o CSV.
              </p>

              <div className="mt-8 overflow-hidden rounded-[24px] border border-gray-200 dark:border-white/5">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[rgba(20,16,22,0.72)] text-[#9f848d]">
                    <tr>
                      <th className="px-5 py-4 font-semibold uppercase tracking-[0.2em]">Nome</th>
                      <th className="px-5 py-4 font-semibold uppercase tracking-[0.2em]">Telefone</th>
                      <th className="px-5 py-4 font-semibold uppercase tracking-[0.2em]">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 bg-[rgba(255,255,255,0.02)] text-[#faf7f6]">
                    {dados.slice(0, 6).map((cliente, index) => (
                      <tr key={`${cliente.telefone}-${index}`}>
                        <td className="px-5 py-4">{cliente.nome}</td>
                        <td className="px-5 py-4 text-[#c7adb4]">{cliente.telefone || '-'}</td>
                        <td className="px-5 py-4 text-[#c7adb4]">{cliente.cidade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                >
                  Mudar arquivo
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={processar}
                  className="inline-flex min-h-[52px] flex-[1.4] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Processando...' : <>Executar migracao <ChevronRight className="h-4 w-4" /></>}
                </button>
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[2rem] border border-[rgba(45,111,86,0.22)] bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[rgba(45,111,86,0.18)] text-[#9be0bb]">
                <Sparkles className="h-10 w-10" />
              </div>
              <h2 className="mt-6 font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">Importacao concluida</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#c7adb4]">
                Sua base foi atualizada com sucesso. Agora voce ja pode revisar clientes, historico e oportunidades dentro da BellaPro.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[rgba(45,111,86,0.24)] bg-[rgba(45,111,86,0.12)] p-4 sm:p-6">
                  <p className="text-2xl sm:text-4xl font-semibold text-[#9be0bb]">{resultado?.importados || 0}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9be0bb]">
                    Novos clientes
                  </p>
                </div>
                <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-4 sm:p-6">
                  <p className="text-2xl sm:text-4xl font-semibold text-[#faf7f6]">{resultado?.duplicados || 0}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c7adb4]">
                    Duplicados ignorados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
              >
                Nova importacao
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(233,155,168,0.18)] bg-[linear-gradient(180deg,rgba(59,42,53,0.96),rgba(24,20,27,0.96))] p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(233,155,168,0.14)] text-[#f7c1b6]">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Motor de importacao</h3>
            <div className="mt-6 space-y-4">
              <FeatureItem
                icon={<Users className="h-4 w-4 text-[#f7c1b6]" />}
                text="Leitura automatica de nome, apelido, telefone e campos de cadastro mais comuns."
              />
              <FeatureItem
                icon={<CheckCircle2 className="h-4 w-4 text-[#9be0bb]" />}
                text="Normalizacao de telefone antes do envio para reduzir divergencias de formato."
              />
              <FeatureItem
                icon={<AlertCircle className="h-4 w-4 text-[#f0c179]" />}
                text="Registros sem contato suficiente sao descartados para evitar sujeira na base."
              />
              <FeatureItem
                icon={<Database className="h-4 w-4 text-[#8fc0ff]" />}
                text="Clientes ja existentes por telefone sao ignorados no processo de importacao."
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.88)] p-4 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E29BA8]">
              Status do servidor
            </p>
            <div className="mt-4 flex items-center gap-3 text-[#9be0bb]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9be0bb] animate-pulse" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Modulo de migracao online
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
