const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { clearQueue, getQueueState } = require('../../utils/voiceQueueManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clearqueue')
		.setDescription('Limpia la cola de mensajes de voz y desconecta al bot del canal si se queda colgado.')
		.setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers), // Limitado a miembros que puedan silenciar para evitar abusos
	async execute(interaction) {
		const guildId = interaction.guild.id;
		const serverQueue = getQueueState(guildId);

		// Si no existe la cola o el bot no está activo de ninguna forma en la voz
		if (!serverQueue || (!serverQueue.isPlaying && !serverQueue.connection && serverQueue.queue.length === 0)) {
			return interaction.reply({
				content: '🧹 **La cola de reproducción de voz ya está vacía** y el bot no está conectado a ningún canal.',
				ephemeral: true,
			});
		}

		try {
			// Forzamos la limpieza y desconexión mediante el voiceQueueManager
			clearQueue(guildId);

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
