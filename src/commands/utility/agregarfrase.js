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
			// Enviar la frase al canal de texto configurado si existe
			try {
				const { getFrasesChannel } = require('../../utils/configManager');
				const channelId = await getFrasesChannel(guildId);
				if (channelId) {
					const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
					if (channel && channel.isTextBased()) {
						const { EmbedBuilder } = require('discord.js');
						const announcementEmbed = new EmbedBuilder()
							.setColor('#c084fc') // Morado místico
							.setTitle('📝 Nueva Frase Registrada')
							.setDescription(`**"${cleanText}"**`)
							.addFields(
								{ name: 'Dicho por', value: `👤 **${author}**`, inline: true },
								{ name: 'Añadido por', value: `👤 **@${addedBy}**`, inline: true }
							)
							.setTimestamp();
						await channel.send({ embeds: [announcementEmbed] });
					}
				}
			} catch (err) {
				console.error('[ERROR] No se pudo enviar el anuncio al canal de frases configurado:', err);
			}

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
