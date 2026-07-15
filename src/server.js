const express = require('express');
const path = require('node:path');
const { getStats } = require('./utils/logger');
const { getActiveMutesFromDB } = require('./utils/voiceMuteManager');
const { getActiveBlocksFromDB } = require('./utils/voiceBlockManager');

const app = express();
const PORT = process.env.PORT || 3000;
let discordClient = null;

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de API para obtener las estadísticas consolidadas
app.get('/api/stats', async (req, res) => {
	try {
		const stats = await getStats();
		res.json(stats);
	} catch (error) {
		console.error('[ERROR] Error al procesar estadísticas de API:', error);
		res.status(500).json({ error: 'Error interno del servidor' });
	}
});

// Ruta de API para obtener las sanciones de voz y bloqueos activos
app.get('/api/active-sanctions', async (req, res) => {
	try {
		const [mutes, blocks] = await Promise.all([
			getActiveMutesFromDB(),
			getActiveBlocksFromDB()
		]);

		const formattedMutes = await Promise.all(mutes.map(async (mute) => {
			let username = mute.userId;
			let avatar = null;
			if (discordClient) {
				const user = await discordClient.users.fetch(mute.userId).catch(() => null);
				if (user) {
					username = user.tag;
					avatar = user.displayAvatarURL({ size: 64 });
				}
			}
			return {
				userId: mute.userId,
				username,
				avatar,
				guildId: mute.guildId,
				endsAt: mute.endsAt,
				type: 'Silencio de Voz'
			};
		}));

		const formattedBlocks = await Promise.all(blocks.map(async (block) => {
			let username = block.userId;
			let avatar = null;
			let channelName = block.channelId;
			if (discordClient) {
				const user = await discordClient.users.fetch(block.userId).catch(() => null);
				if (user) {
					username = user.tag;
					avatar = user.displayAvatarURL({ size: 64 });
				}
				const channel = await discordClient.channels.fetch(block.channelId).catch(() => null);
				if (channel) {
					channelName = channel.name;
				}
			}
			return {
				userId: block.userId,
				username,
				avatar,
				guildId: block.guildId,
				channelId: block.channelId,
				channelName,
				endsAt: block.endsAt,
				type: `Bloqueo Canal (#${channelName})`
			};
		}));

		// Unificamos y ordenamos por fecha de finalización más lejana
		const allSanctions = [...formattedMutes, ...formattedBlocks].sort((a, b) => b.endsAt - a.endsAt);
		res.json(allSanctions);
	} catch (error) {
		console.error('[ERROR] Error al procesar sanciones activas de API:', error);
		res.status(500).json({ error: 'Error interno del servidor' });
	}
});

// Función para iniciar el servidor web
function startWebServer(client) {
	discordClient = client;
	app.listen(PORT, () => {
		console.log(`[EXITO] Dashboard web iniciado y disponible en el puerto ${PORT}`);
	});
}

module.exports = {
	startWebServer,
};
