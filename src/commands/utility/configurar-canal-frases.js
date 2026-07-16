const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setFrasesChannel } = require('../../utils/configManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('configurar-canal-frases')
		.setDescription('Configura el canal de texto donde se registrarán y anunciarán las frases célebres.')
		.addChannelOption(option =>
			option.setName('canal')
				.setDescription('El canal de texto para las frases.')
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const channel = interaction.options.getChannel('canal');
		const guildId = interaction.guild.id;

		// Validamos que sea un canal de texto
		if (!channel.isTextBased()) {
			return interaction.reply({
				content: '❌ El canal seleccionado debe ser un canal de texto.',
				ephemeral: true
			});
		}

		const success = await setFrasesChannel(guildId, channel.id);

		if (success) {
			return interaction.reply({
				content: `✅ ¡Canal de frases configurado con éxito! Las frases se registrarán en <#${channel.id}>.`,
				ephemeral: false
			});
		} else {
			return interaction.reply({
				content: '❌ Hubo un error al intentar guardar la configuración en la base de datos.',
				ephemeral: true
			});
		}
	},
};
