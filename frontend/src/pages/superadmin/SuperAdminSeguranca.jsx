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
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Segurança e operação</p>
        <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
          Equipe interna, auditoria e governança do superadmin
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
          Estruture quem pode operar o SaaS, registre ações sensíveis e mantenha mais controle sobre o uso do painel administrativo global.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Panel title="Adicionar membro interno">
            <form onSubmit={addMember} className="space-y-4">
              <Field label="Nome" value={member.nome} onChange={(value) => setMember((prev) => ({ ...prev, nome: value }))} />
              <Field label="E-mail" value={member.email} onChange={(value) => setMember((prev) => ({ ...prev, email: value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
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
              <button type="submit" className="rounded-xl bg-[#B84C6B] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#9E3E5A]">
                Adicionar membro
              </button>
            </form>
          </Panel>

          <Panel title="Equipe interna">
            <div className="space-y-2.5">
              {team.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#23141C]">{item.nome}</p>
                      <p className="mt-0.5 text-xs text-[#6B5761]">{item.email} · {item.role}</p>
                    </div>
                    <button
                      onClick={() => toggleMemberStatus(item.id)}
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                        item.status === 'Ativo'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
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
          <div className="space-y-2.5">
            {audit.length === 0 && <EmptyCopy text="Ainda não há eventos de auditoria registrados neste navegador." />}
            {audit.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[#23141C]">{item.type}</p>
                  <p className="text-xs text-[#8E7682]">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4A3842]">{item.detail}</p>
                <p className="mt-1.5 text-[11px] text-[#8E7682]">Ator: {item.actor} · Alvo: {item.target}</p>
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
    <div className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-[#23141C]">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
        required
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
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyCopy({ text }) {
  return <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-4 py-6 text-center text-sm text-[#6B5761]">{text}</div>;
}
