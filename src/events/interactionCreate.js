const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// Validamos si la interacción es un comando de chat (Slash Command)
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`[ERROR] No se encontró el comando ${interaction.commandName}.`);
			return;
		}

		try {
			await command.execute(interaction);
			// Registramos la ejecución exitosa del comando en los logs
			const { logCommand } = require('../utils/logger');
			
			let details = null;
			if (interaction.commandName === 'decir') {
				details = 'Google Translate';
			} else if (interaction.commandName === 'decir-ia') {
				const defaultVoice = process.env.FISH_AUDIO_API_KEY ? 'xokas' : 'google';
				const voiceOption = interaction.options.getString('voz') || defaultVoice;
				details = voiceOption === 'xokas' ? 'El Xokas (IA)' : 'Google Translate';
			}

			logCommand(
				interaction.user.id,
				interaction.user.tag,
				interaction.commandName,
				interaction.guildId,
				interaction.guild?.name || 'Mensaje Privado',
				details
			);
		} catch (error) {
			console.error(`[ERROR] Error ejecutando /${interaction.commandName}:`, error);
			
			const errorMessage = { content: 'Hubo un error al ejecutar este comando.', ephemeral: true };
			
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorMessage);
			} else {
				await interaction.reply(errorMessage);
			}
		}
	},
};
