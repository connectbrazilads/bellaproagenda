import React, { useEffect, useState } from 'react';
import { appendAuditTrail, getAuditTrail, getInternalTeam, saveInternalTeam } from './superAdminData';

const EMPTY_MEMBER = { nome: '', email: '', role: 'Suporte', status: 'Ativo' };

function generateMemberId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `team_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function SuperAdminSeguranca() {
  const [team, setTeam] = useState([]);
  const [audit, setAudit] = useState([]);
  const [member, setMember] = useState(EMPTY_MEMBER);

  useEffect(() => {
    setTeam(getInternalTeam());
    setAudit(getAuditTrail());
  }, []);

  function addMember(event) {
    event.preventDefault();
    const next = [{ id: generateMemberId(), ...member }, ...team];
    setTeam(next);
    saveInternalTeam(next);
    const updatedAudit = appendAuditTrail({
      type: 'team_member_created',
      actor: localStorage.getItem('sa_nome') || 'Super Admin',
      target: member.email,
      detail: `Novo membro interno criado com perfil ${member.role}.`,
    });
    setAudit(updatedAudit);
    setMember(EMPTY_MEMBER);
  }

  function toggleMemberStatus(id) {
    const next = team.map((item) => item.id === id ? { ...item, status: item.status === 'Ativo' ? 'Suspenso' : 'Ativo' } : item);
    setTeam(next);
    saveInternalTeam(next);
    const changed = next.find((item) => item.id === id);
    const updatedAudit = appendAuditTrail({
      type: 'team_member_updated',
      actor: localStorage.getItem('sa_nome') || 'Super Admin',
      target: changed.email,
      detail: `Status alterado para ${changed.status}.`,
    });
    setAudit(updatedAudit);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Segurança e operação</p>
        <h1 className="mt-3 font-brand-display text-5xl leading-none text-white">Equipe interna, auditoria e governança do superadmin</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
          Estruture quem pode operar o SaaS, registre ações sensíveis e mantenha mais controle sobre o uso do painel administrativo global.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Panel title="Adicionar membro interno">
            <form onSubmit={addMember} className="space-y-4">
              <Field label="Nome" value={member.nome} onChange={(value) => setMember((prev) => ({ ...prev, nome: value }))} />
              <Field label="E-mail" value={member.email} onChange={(value) => setMember((prev) => ({ ...prev, email: value }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Perfil"
                  value={member.role}
                  onChange={(value) => setMember((prev) => ({ ...prev, role: value }))}
                  options={['Owner', 'Financeiro', 'Suporte', 'Implantação', 'Comercial']}
                />
                <Select
                  label="Status"
                  value={member.status}
                  onChange={(value) => setMember((prev) => ({ ...prev, status: value }))}
                  options={['Ativo', 'Suspenso']}
                />
              </div>
              <button type="submit" className="brand-button-primary rounded-[1.2rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em]">
                Adicionar membro
              </button>
            </form>
          </Panel>

          <Panel title="Equipe interna">
            <div className="space-y-3">
              {team.map((item) => (
                <div key={item.id} className="rounded-[1.3rem] border border-white/6 bg-black/16 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.nome}</p>
                      <p className="mt-1 text-xs text-white/42">{item.email} · {item.role}</p>
                    </div>
                    <button
                      onClick={() => toggleMemberStatus(item.id)}
                      className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${item.status === 'Ativo' ? 'bg-emerald-500/12 text-emerald-200' : 'bg-red-500/12 text-red-200'}`}
                    >
                      {item.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Auditoria local do cockpit">
          <div className="space-y-3">
            {audit.length === 0 && <EmptyCopy text="Ainda não há eventos de auditoria registrados neste navegador." />}
            {audit.map((item) => (
              <div key={item.id} className="rounded-[1.3rem] border border-white/6 bg-black/16 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-white">{item.type}</p>
                  <p className="text-xs text-white/40">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <p className="mt-2 text-sm text-white/54">{item.detail}</p>
                <p className="mt-2 text-xs text-white/38">Ator: {item.actor} · Alvo: {item.target}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
        required
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
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyCopy({ text }) {
  return <div className="rounded-[1.3rem] border border-white/6 bg-black/16 px-4 py-6 text-sm text-white/48">{text}</div>;
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-[2rem] border px-6 py-16 text-center ${error ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-white/6 bg-[#231b22] text-white/54'}`}>
      {message}
    </div>
  );
}
