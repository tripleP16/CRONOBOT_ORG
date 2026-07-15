const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, VoiceConnectionStatus } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');

// Mapa global para las colas de cada servidor (Key: guildId)
const guildQueues = new Map();

function getOrCreateQueue(guildId) {
	if (!guildQueues.has(guildId)) {
		guildQueues.set(guildId, {
			queue: [],
			isPlaying: false,
			connection: null,
			player: null,
			disconnectTimeout: null
		});
	}
	return guildQueues.get(guildId);
}

module.exports = {
	guildQueues,
	processQueue,
	data: new SlashCommandBuilder()
		.setName('decir')
		.setDescription('Conecta al bot a tu canal de voz actual y habla usando voz de IA (con cola de espera).')
		.addStringOption(option =>
			option.setName('texto')
				.setDescription('El texto que deseas que el bot diga (máximo 200 caracteres).')
				.setRequired(true)
				.setMaxLength(200)),
	async execute(interaction) {
		const text = interaction.options.getString('texto');
		const voiceChannel = interaction.member.voice.channel;
		const guildId = interaction.guild.id;

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

		const serverQueue = getOrCreateQueue(guildId);

		// Añadimos el nuevo mensaje a la cola
		serverQueue.queue.push({
			text,
			voiceChannel,
			interaction
		});

		// Si ya está reproduciendo, respondemos con la posición en la cola
		if (serverQueue.isPlaying) {
			const position = serverQueue.queue.length;
			return interaction.reply({
				content: `⏳ **¡Mensaje en cola!** Posición **#${position}** en la lista de espera para leer: *"${text}"*`,
				ephemeral: true
			});
		}

		// Si está libre, respondemos que iniciará y comenzamos a procesar
		await interaction.reply({
			content: `🎙️ Conectando al canal para leer: *"${text}"*...`,
			ephemeral: true
		});

		// Cancelamos cualquier temporizador de desconexión por inactividad que esté activo
		if (serverQueue.disconnectTimeout) {
			clearTimeout(serverQueue.disconnectTimeout);
			serverQueue.disconnectTimeout = null;
		}

		// Iniciamos el procesamiento de la cola
		processQueue(guildId);
	},
};

async function processQueue(guildId) {
	const serverQueue = guildQueues.get(guildId);
	if (!serverQueue) return;

	// Si la cola está vacía, marcamos como libre y programamos la desconexión
	if (serverQueue.queue.length === 0) {
		serverQueue.isPlaying = false;
		
		console.log(`[INFO] Cola vacía en servidor ${guildId}. Programando desconexión en 10 segundos...`);
		serverQueue.disconnectTimeout = setTimeout(() => {
			if (serverQueue.connection) {
				console.log(`[INFO] Desconectando por inactividad en servidor ${guildId}.`);
				try {
					serverQueue.connection.destroy();
				} catch (e) {
					// Ignorar si ya fue destruido
				}
				serverQueue.connection = null;
				serverQueue.player = null;
			}
		}, 10000); // 10 segundos de espera
		return;
	}

	// Marcamos que está reproduciendo y extraemos el primer elemento
	serverQueue.isPlaying = true;
	const current = serverQueue.queue.shift();

	try {
		// Generamos la URL del audio TTS usando Google Translate
		const url = googleTTS.getAudioUrl(current.text, {
			lang: 'es',
			slow: false,
			host: 'https://translate.google.com',
			timeout: 10000,
		});

		// Conectamos al canal de voz de Discord
		if (!serverQueue.connection || serverQueue.connection.joinConfig.channelId !== current.voiceChannel.id) {
			if (serverQueue.connection) {
				try { serverQueue.connection.destroy(); } catch (e) {}
			}
			
			serverQueue.connection = joinVoiceChannel({
				channelId: current.voiceChannel.id,
				guildId: guildId,
				adapterCreator: current.voiceChannel.guild.voiceAdapterCreator,
			});
		}

		// Escuchamos si la conexión es desconectada a la fuerza
		serverQueue.connection.removeAllListeners(VoiceConnectionStatus.Disconnected);
		serverQueue.connection.on(VoiceConnectionStatus.Disconnected, () => {
			console.log(`[WARN] Conexión de voz desconectada en servidor ${guildId}.`);
			
			// Esperamos 1 segundo para verificar si es una desconexión permanente (ej: expulsión por un usuario)
			setTimeout(() => {
				const status = serverQueue.connection?.state?.status;
				if (serverQueue.isPlaying && (!serverQueue.connection || status === VoiceConnectionStatus.Destroyed || status === VoiceConnectionStatus.Disconnected)) {
					console.log(`[INFO] Detectada expulsión del canal de voz. Limpiando conexión y continuando con el siguiente en cola.`);
					try { serverQueue.connection?.destroy(); } catch (e) {}
					serverQueue.connection = null;
					serverQueue.player = null;
					// Continuamos procesando la cola
					processQueue(guildId);
				}
			}, 1000);
		});

		// Creamos el reproductor si no existe
		if (!serverQueue.player) {
			serverQueue.player = createAudioPlayer();
			serverQueue.connection.subscribe(serverQueue.player);
		}

		const resource = createAudioResource(url, { inputType: StreamType.Arbitrary });
		serverQueue.player.play(resource);

		// Al terminar de reproducir el audio actual, pasamos al siguiente
		serverQueue.player.removeAllListeners(AudioPlayerStatus.Idle);
		serverQueue.player.removeAllListeners('error');

		serverQueue.player.on(AudioPlayerStatus.Idle, () => {
			// Esperamos 1 segundo de silencio natural y procesamos la cola
			setTimeout(() => {
				processQueue(guildId);
			}, 1000);
		});

		// Manejo de errores
		serverQueue.player.on('error', error => {
			console.error(`[ERROR] Error en el reproductor de audio TTS (Server ${guildId}):`, error.message);
			// Pasamos al siguiente mensaje a pesar del error
			setTimeout(() => {
				processQueue(guildId);
			}, 1000);
		});

	} catch (error) {
		console.error(`[ERROR] Error al procesar el TTS en cola (Server ${guildId}):`, error);
		try {
			await current.interaction.followUp({
				content: `❌ Hubo un error al reproducir tu mensaje: *"${current.text}"*`,
				ephemeral: true
			});
		} catch (e) {}
		
		// Pasamos al siguiente mensaje
		processQueue(guildId);
	}
}
