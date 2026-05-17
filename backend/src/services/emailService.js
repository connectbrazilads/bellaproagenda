const nodemailer = require('nodemailer');

function criarTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: { user, pass },
  });
}

async function enviarCredenciaisAcesso({ destinatario, nomeAdmin, nomeSalao, email, senha, loginUrl }) {
  const transporter = criarTransporter();
  if (!transporter) {
    throw new Error('Email não configurado. Defina EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env');
  }

  const from = process.env.EMAIL_FROM || `"Athena SaaS" <${process.env.EMAIL_USER}>`;
  const url = loginUrl || process.env.APP_URL || 'http://localhost:5173';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;letter-spacing:-1px">ATHENA</h1>
      <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px">Plataforma de Gestão</p>
    </div>
    <div style="padding:40px">
      <p style="color:#374151;font-size:16px;margin:0 0 24px">Olá, <strong>${nomeAdmin}</strong>!</p>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px">
        Sua conta no <strong>${nomeSalao}</strong> foi criada com sucesso. Aqui estão suas credenciais de acesso ao painel de gestão:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 28px">
        <div style="margin-bottom:16px">
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Email de acesso</p>
          <p style="color:#111827;font-size:16px;font-weight:600;margin:0;font-family:monospace">${email}</p>
        </div>
        <div>
          <p style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Senha inicial</p>
          <p style="color:#7c3aed;font-size:18px;font-weight:700;margin:0;font-family:monospace">${senha}</p>
        </div>
      </div>
      <a href="${url}/admin/login" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.5px">
        Acessar Painel →
      </a>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;text-align:center">
        Recomendamos alterar sua senha após o primeiro acesso em <strong>Configurações</strong>.
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to: destinatario,
    subject: `Suas credenciais de acesso — ${nomeSalao} | Athena`,
    text: `Olá ${nomeAdmin}!\n\nSua conta foi criada.\n\nEmail: ${email}\nSenha: ${senha}\n\nAcesse: ${url}/admin/login`,
    html,
  });
}

async function enviarComunicado({ destinatarios, assunto, mensagem }) {
  const transporter = criarTransporter();
  if (!transporter) {
    throw new Error('Email não configurado');
  }

  const from = process.env.EMAIL_FROM || `"Athena SaaS" <${process.env.EMAIL_USER}>`;

  const results = { enviados: 0, falhas: 0 };
  for (const dest of destinatarios) {
    try {
      await transporter.sendMail({
        from,
        to: dest,
        subject: assunto,
        text: mensagem,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
          <h2 style="color:#7c3aed">${assunto}</h2>
          <div style="color:#374151;line-height:1.6;white-space:pre-wrap">${mensagem}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
          <p style="color:#9ca3af;font-size:12px">Athena SaaS — Plataforma de Gestão de Salões</p>
        </div>`,
      });
      results.enviados++;
    } catch {
      results.falhas++;
    }
  }
  return results;
}

async function enviarRecuperacaoSenha({ destinatario, nome, resetUrl }) {
  const transporter = criarTransporter();
  if (!transporter) {
    throw new Error('Email não configurado');
  }

  const from = process.env.EMAIL_FROM || `"Athena SaaS" <${process.env.EMAIL_USER}>`;
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;letter-spacing:-1px">ATHENA</h1>
      <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px">Recuperação de senha</p>
    </div>
    <div style="padding:40px">
      <p style="color:#374151;font-size:16px;margin:0 0 24px">Olá, <strong>${nome || 'usuário'}</strong>.</p>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px">
        Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para criar uma nova senha com segurança.
      </p>
      <a href="${resetUrl}" style="display:block;background:#7c3aed;color:#fff;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.5px">
        Redefinir senha
      </a>
      <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;text-align:center">
        Este link expira em 2 horas. Se você não pediu esta alteração, ignore este email.
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to: destinatario,
    subject: 'Redefinição de senha | Athena',
    text: `Olá${nome ? ` ${nome}` : ''}!\n\nAcesse o link para redefinir sua senha:\n${resetUrl}\n\nO link expira em 2 horas.`,
    html,
  });
}

module.exports = { enviarCredenciaisAcesso, enviarComunicado, enviarRecuperacaoSenha };
