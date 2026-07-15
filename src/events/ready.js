const { Events } = require('discord.js');
const { loadActiveMutes } = require('../utils/voiceMuteManager');
const { loadActiveVoiceBlocks } = require('../utils/voiceBlockManager');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`[EXITO] ¡Conectado correctamente! El bot está en línea como ${client.user.tag}`);
		// Cargamos las sanciones activas desde el archivo JSON al iniciar
		loadActiveMutes(client);
		// Cargamos los bloqueos de canales activos desde el archivo JSON al iniciar
		loadActiveVoiceBlocks(client);
	},
};
