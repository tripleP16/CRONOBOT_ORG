const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dado')
		.setDescription('Lanza un dado tradicional de 6 caras y muestra el resultado de forma aleatoria.'),
	async execute(interaction) {
		// Generar un número aleatorio entre 1 y 6
		const result = Math.floor(Math.random() * 6) + 1;

		// Emojis de dados tradicionales de Unicode
		const diceEmojis = {
			1: '⚀',
			2: '⚁',
			3: '⚂',
			4: '⚃',
			5: '⚄',
			6: '⚅'
		};

		const emoji = diceEmojis[result];

		// Respuestas divertidas personalizadas según el resultado
		let message = '¡Buena suerte! 🍀';
		if (result === 6) {
			message = '¡Máximo resultado! 🌟 ¡Tienes una suerte increíble!';
		} else if (result === 1) {
			message = 'F... Un resultado desafortunado ☠️';
		}

		// Crear un embed estético
		const embed = new EmbedBuilder()
			.setColor('#38bdf8') // Color celeste de la identidad del bot
			.setTitle('🎲 Lanzamiento de Dado')
			.setDescription(`**${interaction.user.username}** ha lanzado el dado en el canal:`)
			.addFields(
				{ name: 'Resultado', value: `# ${emoji} **${result}**`, inline: true }
			)
			.setFooter({ text: message })
			.setTimestamp();

		return interaction.reply({ embeds: [embed] });
	},
};
