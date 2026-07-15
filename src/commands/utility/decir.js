const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decir')
		.setDescription('Conecta al bot a tu canal de voz actual y habla usando voz de IA.')
		.addStringOption(option =>
			option.setName('texto')
				.setDescription('El texto que deseas que el bot diga (máximo 200 caracteres).')
				.setRequired(true)
				.setMaxLength(200)),
	async execute(interaction) {
		const text = interaction.options.getString('texto');
		const voiceChannel = interaction.member.voice.channel;

		// 1. Validamos que el usuario esté en un canal de voz
		if (!voiceChannel) {
			return interaction.reply({
				content: '❌ Debes estar conectado a un canal de voz en este servidor para usar este comando.',
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

		// Confirmamos la acción al usuario de forma efímera
		await interaction.reply({
			content: `🎙️ Conectando al canal para decir: *"${text}"*...`,
			ephemeral: true,
		});

		try {
			// 3. Generamos la URL del audio TTS usando Google Translate TTS
			const url = googleTTS.getAudioUrl(text, {
				lang: 'es', // Español
				slow: false,
				host: 'https://translate.google.com',
				timeout: 10000,
			});

			// 4. Conectamos al canal de voz de Discord
			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});

			// 5. Creamos el reproductor y el recurso de audio
			const player = createAudioPlayer();
			const resource = createAudioResource(url);

			player.play(resource);
			connection.subscribe(player);

			// 6. Configurar desconexión automática al terminar
			player.on(AudioPlayerStatus.Idle, () => {
				// Esperamos 1.5 segundos de silencio final antes de salir
				setTimeout(() => {
					if (connection) connection.destroy();
				}, 1500);
			});

			// Manejo de errores de reproducción
			player.on('error', error => {
				console.error('[ERROR] Error en el reproductor de audio TTS:', error.message);
				if (connection) connection.destroy();
			});

			// Timeout de seguridad en caso de que se quede colgado en reproducción (ej: 25 segundos)
			setTimeout(() => {
				try {
					if (connection) connection.destroy();
				} catch (e) {
					// Ignorar si ya fue destruido
				}
			}, 25000);

		} catch (error) {
			console.error('[ERROR] Error al procesar o reproducir el TTS:', error);
			return interaction.followUp({
				content: '❌ Hubo un error al intentar generar o reproducir la voz de IA.',
				ephemeral: true,
			});
		}
	},
};
