const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('creador')
		.setDescription('Muestra información de contacto del desarrollador y detalles del bot.'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle('💻 Información del Desarrollador')
			.setDescription('Detalles sobre el creador de este bot y las tecnologías utilizadas.')
			.setThumbnail(interaction.client.user.displayAvatarURL())
			.addFields(
				{ name: '👤 Creador', value: 'Diego Cumares (CRONOXT)', inline: true },
				{ name: '🌐 GitHub', value: '[diegocumares / CRONOXT](https://github.com/CRONOXT)', inline: true },
				{ name: '✉️ Contacto', value: '`diegocumares@gmail.com`', inline: false },
				{ name: '🤖 Acerca de CRONOBOT', value: 'Un bot modular diseñado para la gestión interactiva de canales y moderación de voz basada en retos matemáticos rápidos.', inline: false },
				{ name: '🛠️ Tecnologías', value: '• **Node.js** (v24)\n• **Discord.js** (v14)\n• **Persistencia:** Archivos locales JSON', inline: false }
			)
			.setFooter({ text: 'Desarrollado con ❤️ para WACHIMANGOS' })
			.setTimestamp();

		return interaction.reply({ embeds: [embed] });
	},
};
