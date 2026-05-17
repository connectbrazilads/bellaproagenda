const axios = require('axios');

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

async function enviarMensagem(telefone, mensagem, salao = null) {
  if (!salao?.moduloWhatsapp) return;

  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instancia = salao?.slug;

  if (!url || !key || !instancia) return;

  const numero = telefone.replace(/\D/g, '');
  const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;

  try {
    await axios.post(
      `${url}/message/sendText/${instancia}`,
      { number: numeroFormatado, text: mensagem },
      { headers: { apikey: key } }
    );
  } catch (err) {
    console.error('WhatsApp erro:', err.message);
  }
}

function parseTemplate(template, data) {
  if (!template) return '';
  let msg = template;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    msg = msg.replace(regex, value || '');
  });
  return msg;
}

async function notificarClienteAgendamento({ clienteNome, clienteTelefone, servico, profissional, data, hora, salao }) {
  const template = salao?.templateConfirmacao || 
    `✅ *Agendamento confirmado!*\n\nOlá, {{cliente}}! Seu agendamento foi confirmado.\n\n✂️ *Serviço:* {{servico}}\n👤 *Profissional:* {{profissional}}\n📅 *Data:* {{data}} às {{hora}}\n\n{{salao}}`;

  const msg = parseTemplate(template, {
    cliente: clienteNome,
    servico,
    profissional,
    data: formatarData(data),
    hora,
    salao: salao?.nome || '',
    telefone: salao?.telefone || ''
  });

  await enviarMensagem(clienteTelefone, msg, salao);
}

async function notificarSalaoNovoAgendamento({ salao, clienteNome, clienteTelefone, servico, profissional, data, hora }) {
  if (!salao?.whatsapp) return;

  const msg =
    `🗓️ *Novo agendamento!*\n\n` +
    `👤 *Cliente:* ${clienteNome}\n` +
    `📱 *Telefone:* ${clienteTelefone}\n` +
    `✂️ *Serviço:* ${servico}\n` +
    `👩‍💼 *Profissional:* ${profissional}\n` +
    `📅 *Data:* ${formatarData(data)} às ${hora}`;

  await enviarMensagem(salao.whatsapp, msg, salao);
}

async function enviarLembrete({ clienteNome, clienteTelefone, servico, profissional, data, hora, salao }) {
  const template = salao?.templateLembrete ||
    `⏰ *Lembrete de agendamento*\n\nOlá, {{cliente}}! Lembrando que seu agendamento é *amanhã*.\n\n✂️ *Serviço:* {{servico}}\n👤 *Profissional:* {{profissional}}\n🕐 *Horário:* {{hora}}\n\nAté amanhã! 😊`;

  const msg = parseTemplate(template, {
    cliente: clienteNome,
    servico,
    profissional,
    data: formatarData(data),
    hora,
    salao: salao?.nome || ''
  });

  await enviarMensagem(clienteTelefone, msg, salao);
}

module.exports = { enviarMensagem, notificarClienteAgendamento, notificarSalaoNovoAgendamento, enviarLembrete };
