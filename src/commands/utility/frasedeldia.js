const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFrasesChannel } = require('../../utils/configManager');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('frase-del-dia')
		.setDescription('Extrae una frase que contenga "By [Autor]" del canal configurado y la lee con la voz de El Xokas.'),
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

		// Deferimos la respuesta ya que buscar mensajes en la API y sintetizar el audio puede demorar
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

			// 6. Filtramos los mensajes que cumplan con la firma "by [Autor]" o "By [Autor]"
			const filteredMessages = messages.filter(msg => {
				const content = msg.content?.trim();
				if (!content || msg.author.bot || content.startsWith('/') || content.startsWith('!')) {
					return false;
				}
				
				// Verificamos que contenga la palabra "by" o "By" de forma aislada
				return /\b(by|By|BY)\b/i.test(content);
			});

			if (filteredMessages.size === 0) {
				return interaction.editReply({
					content: '❌ No se encontraron citas válidas que contengan la firma **"By [Autor]"** (por ejemplo: *"Frase" By Autor*) en el canal configurado.',
					ephemeral: true,
				});
			}

			// 7. Seleccionamos un mensaje al azar
			const randomMsg = filteredMessages.random();
			const content = randomMsg.content.trim();
			
			// Procesamos la frase y el autor de la cita dividiendo en el "by"
			const parts = content.split(/\bby\b/i);
			let frase = parts[0].trim();
			let autorCitado = parts[1]?.trim() || 'Desconocido';

			// Limpiamos las comillas exteriores que suelen envolver la frase
			frase = frase.replace(/^["'«“]+|["'»”]+$/g, '').trim();

			// Si por alguna razón la frase quedó vacía (ej: mensaje mal escrito)
			if (!frase) {
				return interaction.editReply({
					content: '❌ El mensaje seleccionado no tenía un formato de frase válido.',
					ephemeral: true,
				});
			}

			// Límite de caracteres para la API de voz
			let fraseParaLeer = frase;
			if (fraseParaLeer.length > 200) {
				fraseParaLeer = fraseParaLeer.substring(0, 197) + '...';
			}

			// 8. Creamos el Embed de Discord estético
			const embed = new EmbedBuilder()
				.setColor('#c084fc') // Morado místico
				.setTitle('🗣️ La Frase del Día')
				.setDescription(`**"${frase}"**`)
				.addFields(
					{ name: 'Dicho por', value: `👤 **${autorCitado}**`, inline: true },
					{ name: 'Registrado por', value: `${randomMsg.author}`, inline: true }
				)
				.setFooter({ text: 'Diciendo la frase con la voz de El Xokas (IA) 🎙️' })
				.setTimestamp();

			// Enviamos el Embed público al chat de Discord
			await interaction.editReply({ embeds: [embed] });

			// 9. Encolamos la lectura de la frase limpia de voz
			await addMessageToQueue(guildId, voiceChannel, fraseParaLeer, 'xokas', interaction);

		} catch (error) {
			console.error('[ERROR] Error al procesar la frase del día:', error);
			return interaction.editReply({
				content: '❌ Ocurrió un error inesperado al intentar leer el historial de frases o reproducir el audio.',
				ephemeral: true,
			});
		}
	},
};
