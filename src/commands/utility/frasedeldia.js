const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFrasesChannel } = require('../../utils/configManager');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('frase-del-dia')
		.setDescription('Extrae una frase aleatoria del canal configurado y la reproduce con la voz de El Xokas (IA).'),
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

		// 3. Obtenemos el ID del canal configurado desde PostgreSQL
		const channelId = await getFrasesChannel(guildId);
		if (!channelId) {
			return interaction.reply({
				content: '❌ El canal de frases del día no ha sido configurado en este servidor. Un administrador debe configurarlo usando `/configurar-canal-frases`.',
				ephemeral: true,
			});
		}

		// 4. Obtenemos el canal de texto en el servidor de Discord
		const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
		if (!channel) {
			return interaction.reply({
				content: '❌ El canal de texto configurado para las frases ya no existe en el servidor. Un administrador debe registrar uno nuevo con `/configurar-canal-frases`.',
				ephemeral: true,
			});
		}

		// Deferimos la respuesta ya que la API de Discord al traer mensajes y la síntesis pueden demorar
		await interaction.deferReply();

		try {
			// 5. Obtenemos los últimos 100 mensajes del canal de frases
			const messages = await channel.messages.fetch({ limit: 100 });
			
			if (!messages || messages.size === 0) {
				return interaction.editReply({
					content: '❌ No se encontraron mensajes en el canal de frases o el canal está completamente vacío.',
					ephemeral: true,
				});
			}

			// 6. Filtramos los mensajes válidos
			const filteredMessages = messages.filter(msg => {
				const content = msg.content?.trim();
				return (
					content &&
					content.length > 0 &&
					content.length <= 200 &&         // Límite razonable para lectura de TTS
					!msg.author.bot &&               // Omitimos mensajes de bots
					!content.startsWith('/') &&      // Omitimos comandos de barra (Slash)
					!content.startsWith('!')         // Omitimos comandos clásicos comunes
				);
			});

			if (filteredMessages.size === 0) {
				return interaction.editReply({
					content: '❌ No se encontraron mensajes de texto válidos (que no sean de bots, comandos y de menos de 200 caracteres) en el canal configurado.',
					ephemeral: true,
				});
			}

			// 7. Seleccionamos un mensaje al azar
			const randomMsg = filteredMessages.random();
			const text = randomMsg.content;
			const author = randomMsg.author;

			// 8. Creamos el Embed de Discord estético
			const embed = new EmbedBuilder()
				.setColor('#c084fc') // Morado místico
				.setTitle('🗣️ La Frase del Día')
				.setDescription(`*"${text}"*`)
				.addFields(
					{ name: 'Autor de la frase', value: `👤 **${author.username}**`, inline: true },
					{ name: 'Canal de origen', value: `${channel}`, inline: true }
				)
				.setFooter({ text: 'Diciendo la frase con la voz de El Xokas (IA) 🎙️' })
				.setTimestamp();

			// Enviamos la respuesta con la frase citada en el chat público
			await interaction.editReply({ embeds: [embed] });

			// 9. Encolamos la lectura del texto con la voz de El Xokas
			// El voiceQueueManager detectará que interaction ya está replied y enviará followUps si es necesario.
			await addMessageToQueue(guildId, voiceChannel, text, 'xokas', interaction);

		} catch (error) {
			console.error('[ERROR] Error al procesar la frase del día:', error);
			return interaction.editReply({
				content: '❌ Ocurrió un error inesperado al intentar leer el historial de frases o procesar el audio.',
				ephemeral: true,
			});
		}
	},
};
