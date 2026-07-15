const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { guildQueues } = require('./decir');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clearqueue')
		.setDescription('Limpia la cola de mensajes de voz y desconecta al bot del canal si se queda colgado.')
		.setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers), // Limitado a miembros que puedan silenciar para evitar abusos
	async execute(interaction) {
		const guildId = interaction.guild.id;
		const serverQueue = guildQueues.get(guildId);

		// Si no existe la cola o el bot no está activo de ninguna forma en la voz
		if (!serverQueue || (!serverQueue.isPlaying && !serverQueue.connection && serverQueue.queue.length === 0)) {
			return interaction.reply({
				content: '🧹 **La cola de reproducción de voz ya está vacía** y el bot no está conectado a ningún canal.',
				ephemeral: true,
			});
		}

		try {
			// 1. Limpiamos la cola de espera en memoria
			serverQueue.queue = [];
			serverQueue.isPlaying = false;

			// 2. Cancelamos cualquier temporizador de desconexión pendiente
			if (serverQueue.disconnectTimeout) {
				clearTimeout(serverQueue.disconnectTimeout);
				serverQueue.disconnectTimeout = null;
			}

			// 3. Detenemos la reproducción de sonido actual
			if (serverQueue.player) {
				try {
					serverQueue.player.stop();
				} catch (e) {
					console.warn('[WARN] No se pudo detener el reproductor de audio:', e.message);
				}
				serverQueue.player = null;
			}

			// 4. Forzamos la desconexión del canal de voz
			if (serverQueue.connection) {
				try {
					serverQueue.connection.destroy();
				} catch (e) {
					console.warn('[WARN] No se pudo destruir la conexión de voz:', e.message);
				}
				serverQueue.connection = null;
			}

			return interaction.reply({
				content: '🧹 **¡Limpieza Exitosa!** La cola de voz ha sido vaciada por completo y el bot se ha desconectado del canal.',
			});

		} catch (error) {
			console.error('[ERROR] Error al limpiar la cola de reproducción:', error);
			return interaction.reply({
				content: '❌ Ocurrió un error inesperado al intentar limpiar la cola de reproducción de voz.',
				ephemeral: true,
			});
		}
	},
};
