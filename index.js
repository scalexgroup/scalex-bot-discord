require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`🔥 Bot online como ${client.user.tag}`);
});

client.on('guildMemberAdd', member => {
  const agora = new Date();
  log(`[+] ${member.user.tag} entrou no servidor às ${horaFormatada(agora)}`);
});

client.on('guildMemberRemove', member => {
  const agora = new Date();
  log(`[-] ${member.user.tag} saiu do servidor às ${horaFormatada(agora)}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id;
  const member = newState.member;

  if (!oldState.channelId && newState.channelId) {
    const entrada = new Date();
    await db.set(`entrada_${userId}`, entrada.toISOString());
    log(`🎤 ${member.user.tag} entrou no canal às ${horaFormatada(entrada)}`);
  }

  if (oldState.channelId && !newState.channelId) {
    const saida = new Date();
    const entradaRaw = await db.get(`entrada_${userId}`);
    if (!entradaRaw) return;

    const entrada = new Date(entradaRaw);
    const duracaoMin = Math.floor((saida - entrada) / 60000);
    const pontos = Math.floor(duracaoMin / 5);
    const total = (await db.get(`pontos_${userId}`)) || 0;

    await db.set(`pontos_${userId}`, total + pontos);
    await db.delete(`entrada_${userId}`);

    log(`📤 ${member.user.tag} saiu do canal. Ficou ${duracaoMin}min e ganhou ${pontos} pontos.`);
  }
});

client.on('messageCreate', async message => {
  if (message.content === '!presenca') {
    const pontos = await db.get(`pontos_${message.author.id}`) || 0;
    message.reply(`🎯 Você tem ${pontos} pontos de presença.`);
  }

  if (message.content === '!ranking') {
    const users = await db.all();
    const ranking = users
      .filter(u => u.id.startsWith('pontos_'))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    if (!ranking.length) return message.reply("Ninguém pontuou ainda.");

    const texto = ranking.map((u, i) => {
      const userId = u.id.split('_')[1];
      return `${i + 1}. <@${userId}> – ${u.value} pontos`;
    }).join('\n');

    message.reply(`🏆 **Top 5 Presenças:**\n${texto}`);
  }
});

function log(msg) {
  console.log(msg);
  const canal = process.env.CHANNEL_LOG_ID;
  if (canal) {
    const c = client.channels.cache.get(canal);
    if (c) c.send(msg).catch(() => {});
  }
}

function horaFormatada(data) {
  return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

client.login(process.env.DISCORD_TOKEN);
