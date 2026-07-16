const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setFrasesChannel } = require('../../utils/configManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('configurar-canal-frases')
		.setDescription('Configura el canal de texto oficial de donde se extraerán las frases del día.')
		.addChannelOption(option =>
			option.setName('canal')
				.setDescription('El canal de texto que contiene las frases.')
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Limitado a moderadores/administradores
	async execute(interaction) {
		const channel = interaction.options.getChannel('canal');
		const guildId = interaction.guild.id;

		// Intentamos guardar en la base de datos
		const success = await setFrasesChannel(guildId, channel.id);

		if (success) {
			return interaction.reply({
				content: `✅ **¡Configuración Guardada!** El canal de frases del día se ha establecido en ${channel}. Ahora el comando \`/frase-del-dia\` extraerá mensajes de este canal de texto.`,
				ephemeral: false
			});
		} else {
			return interaction.reply({
				content: '❌ Ocurrió un error al intentar guardar la configuración en la base de datos de PostgreSQL.',
				ephemeral: true
			});
		}
	},
};
