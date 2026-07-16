const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomQuote } = require('../../utils/quoteManager');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('frase-del-dia')
		.setDescription('Elige una frase célebre aleatoria de la base de datos y la reproduce con la voz de El Xokas.'),
	async execute(interaction) {
		const voiceChannel = interaction.member.voice.channel;
		const guildId = interaction.guild.id;

		// 1. Validamos que el usuario esté en un canal de voz
		if (!voiceChannel) {
			return interaction.reply({
				content: '❌ Debes estar conectado a un canal de voz en este servidor para escuchar la frase del día.',
				ephemeral: true,
			});
		}

		// 2. Validamos los permisos del bot para entrar y hablar
		const permissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!permissions.has('Connect') || !permissions.has('Speak')) {
			return interaction.reply({
				content: '❌ No tengo permisos para conectarme y hablar en tu canal de voz actual.',
				ephemeral: true,
			});
		}

		// Deferimos la respuesta ya que la consulta en la base de datos y la síntesis pueden demorar
		await interaction.deferReply();

		try {
			// 3. Obtenemos una frase aleatoria desde PostgreSQL
			const quote = await getRandomQuote(guildId);

			if (!quote) {
				return interaction.editReply({
					content: '❌ **No hay frases célebres registradas en la base de datos de este servidor.**\n\nUsa el comando \`/agregar-frase\` para añadir la primera frase legendaria (ej: `/agregar-frase texto:Francia no gana la copa del mundo 2026 autor:CRONOXT`).',
					ephemeral: false,
				});
			}

			// 4. Creamos el Embed de Discord estético citando la frase
			const embed = new EmbedBuilder()
				.setColor('#c084fc') // Morado místico
				.setTitle('🗣️ La Frase del Día')
				.setDescription(`**"${quote.text}"**`)
				.addFields(
					{ name: 'Dicho por', value: `👤 **${quote.author}**`, inline: true },
					{ name: 'Registrado por', value: `👤 **@${quote.addedBy}**`, inline: true }
				)
				.setFooter({ text: 'Diciendo la frase con la voz de El Xokas (IA) 🎙️' })
				.setTimestamp();

			// Enviamos el Embed público al chat de Discord
			await interaction.editReply({ embeds: [embed] });

			// 5. Encolamos la lectura del texto con la voz de El Xokas
			await addMessageToQueue(guildId, voiceChannel, quote.text, 'xokas', interaction);

		} catch (error) {
			console.error('[ERROR] Error al procesar la frase del día desde base de datos:', error);
			return interaction.editReply({
				content: '❌ Ocurrió un error inesperado al intentar consultar la base de datos o procesar el audio.',
				ephemeral: true,
			});
		}
	},
};
