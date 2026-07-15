const { Events } = require('discord.js');
const { initDatabase } = require('../database');
const { loadActiveMutes } = require('../utils/voiceMuteManager');
const { loadActiveBlocks } = require('../utils/voiceBlockManager');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`[EXITO] ¡Conectado correctamente! El bot está en línea como ${client.user.tag}`);
		
		try {
			// 1. Inicializamos la base de datos de PostgreSQL (creación de tablas si no existen)
			await initDatabase();
			
			// 2. Cargamos silencios de voz activos desde PostgreSQL
			await loadActiveMutes(client);
			
			// 3. Cargamos bloqueos de canales activos desde PostgreSQL
			await loadActiveBlocks(client);
		} catch (error) {
			console.error('[ERROR] Error al inicializar base de datos y cargador en ready event:', error);
		}
	},
};
