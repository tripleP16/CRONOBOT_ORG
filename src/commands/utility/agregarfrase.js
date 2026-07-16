const { SlashCommandBuilder } = require('discord.js');
const { addQuote } = require('../../utils/quoteManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('agregar-frase')
		.setDescription('Añade una frase célebre a la base de datos del servidor para reproducirla con voz de IA.')
		.addStringOption(option =>
			option.setName('texto')
				.setDescription('La frase legendaria a guardar (máximo 200 caracteres).')
				.setRequired(true)
				.setMaxLength(200))
		.addStringOption(option =>
			option.setName('autor')
				.setDescription('La persona que dijo la frase (ej: CRONOXT, TriplePinga).')
				.setRequired(true)
				.setMaxLength(100)),
	async execute(interaction) {
		const text = interaction.options.getString('texto').trim();
		const author = interaction.options.getString('autor').trim();
		const guildId = interaction.guild.id;
		const addedBy = interaction.user.username;

		// 1. Limpiamos las comillas exteriores redundantes si el usuario las incluyó
		const cleanText = text.replace(/^["'«“]+|["'»”]+$/g, '').trim();

		// 2. Guardamos la frase en PostgreSQL
		const success = await addQuote(guildId, cleanText, author, addedBy);

		if (success) {
			return interaction.reply({
				content: `✅ **¡Frase Añadida a PostgreSQL!**\n> *"${cleanText}"*\n> — **By ${author}**\n\nAhora cualquiera puede escucharla usando el comando \`/frase-del-dia\`.`,
				ephemeral: false
			});
		} else {
			return interaction.reply({
				content: '❌ Hubo un error al intentar guardar la frase en la base de datos de PostgreSQL.',
				ephemeral: true
			});
		}
	},
};
