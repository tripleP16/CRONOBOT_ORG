const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, VoiceConnectionStatus } = require('@discordjs/voice');
const { getAudioStream } = require('./ttsService');

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

// Etiquetas visibles de las voces y las intensidades soportadas
const VOICE_LABELS = {
	xokas: 'El Xokas (IA)',
	egirl: 'E-girl (IA)',
	coqueta: 'E-girl Coqueta (IA)',
	tifani: 'E-girl Tifani ASMR (IA)',
	seductora: 'E-girl Seductora (IA)',
	ari: 'AriGameplays (IA)',
	rubius: 'El Rubius (IA)',
	nicki: 'Nicki Nicole (IA)',
	emilia: 'Emilia Mernes (IA)',
	becerra: 'Maria Becerra (IA)',
	aroyitt: 'Aroyitt (IA)',
	cristinini: 'Cristinini (IA)',
	dalas: 'Dalas Review (IA)',
	chavez: 'Hugo Chávez (IA)',
	google: 'Google Translate',
};

const INTENSITY_LABELS = {
	normal: 'Normal',
	emocionado: 'Emocionado 🤩',
	triste: 'Triste 😢',
	cabreado: 'Cabreado 🤬',
	cachondo: 'Cachondo/a 😏',
};

/**
 * Añade un mensaje de voz a la cola del servidor y lo reproduce secuencialmente.
 * @param {string} [intensity='normal'] - Intensidad del tono: 'normal', 'emocionado', 'triste', 'cabreado' o 'cachondo' (solo voces de IA).
 */
async function addMessageToQueue(guildId, voiceChannel, text, voiceOption, interaction, intensity = 'normal') {
	const serverQueue = getOrCreateQueue(guildId);

	// Añadimos el nuevo mensaje a la cola del servidor
	serverQueue.queue.push({
		text,
		voiceChannel,
		interaction,
		voiceOption,
		intensity
	});

	const voiceLabel = VOICE_LABELS[voiceOption] || VOICE_LABELS.google;
	const intensityLabel = intensity !== 'normal' ? ` | Tono: *${INTENSITY_LABELS[intensity] || intensity}*` : '';

	// Si ya está reproduciendo, respondemos con la posición en la cola
	if (serverQueue.isPlaying) {
		const position = serverQueue.queue.length;
		const responsePayload = {
			content: `⏳ **¡Mensaje en cola!** Posición **#${position}** en la lista de espera (Voz: *${voiceLabel}*${intensityLabel}) para leer: *"${text}"*`,
			ephemeral: true
		};
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(responsePayload);
		} else {
			await interaction.reply(responsePayload);
		}
		return;
	}

	// Si está libre, respondemos confirmando el inicio
	const startPayload = {
		content: `🎙️ Conectando al canal para leer con la voz de **${voiceLabel}**${intensityLabel}: *"${text}"*...`,
		ephemeral: true
	};
	if (interaction.replied || interaction.deferred) {
		await interaction.followUp(startPayload);
	} else {
		await interaction.reply(startPayload);
	}

	// Cancelamos cualquier temporizador de desconexión por inactividad pendiente
	if (serverQueue.disconnectTimeout) {
		clearTimeout(serverQueue.disconnectTimeout);
		serverQueue.disconnectTimeout = null;
	}

	// Iniciamos la reproducción
	processQueue(guildId);
}

/**
 * Procesa el siguiente mensaje de la cola de un servidor.
 */
async function processQueue(guildId) {
	const serverQueue = guildQueues.get(guildId);
	if (!serverQueue) return;

	// Si la cola está vacía, marcamos como libre y programamos la desconexión
	if (serverQueue.queue.length === 0) {
		serverQueue.isPlaying = false;
		
		console.log(`[INFO] Cola de voz vacía en servidor ${guildId}. Programando desconexión en 5 minutos...`);
		serverQueue.disconnectTimeout = setTimeout(() => {
			if (serverQueue.connection) {
				console.log(`[INFO] Desconectando bot de voz por inactividad en servidor ${guildId}.`);
				try {
					serverQueue.connection.destroy();
				} catch (e) {
					// Ignorar si ya fue destruido
				}
				serverQueue.connection = null;
				serverQueue.player = null;
			}
		}, 300000); // 5 minutos de espera por inactividad
		return;
	}

	// Marcamos reproducción en curso y obtenemos el primer elemento
	serverQueue.isPlaying = true;
	const current = serverQueue.queue.shift();

	try {
		// Generamos el audio mediante el servicio TTS
		const { streamOrUrl, voiceUsed } = await getAudioStream(current.text, current.voiceOption, current.intensity);

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

		// Escuchamos desconexiones forzadas del canal
		serverQueue.connection.removeAllListeners(VoiceConnectionStatus.Disconnected);
		serverQueue.connection.on(VoiceConnectionStatus.Disconnected, () => {
			console.log(`[WARN] Conexión de voz desconectada en servidor ${guildId}.`);
			
			setTimeout(() => {
				const status = serverQueue.connection?.state?.status;
				if (serverQueue.isPlaying && (!serverQueue.connection || status === VoiceConnectionStatus.Destroyed || status === VoiceConnectionStatus.Disconnected)) {
					console.log(`[INFO] Detectada expulsión del canal de voz. Limpiando conexión y continuando con la cola.`);
					try { serverQueue.connection?.destroy(); } catch (e) {}
					serverQueue.connection = null;
					serverQueue.player = null;
					processQueue(guildId);
				}
			}, 1000);
		});

		// Creamos el reproductor si no existe
		if (!serverQueue.player) {
			serverQueue.player = createAudioPlayer();
			serverQueue.connection.subscribe(serverQueue.player);
		}

		// Creamos el recurso
		const resource = createAudioResource(streamOrUrl, { inputType: StreamType.Arbitrary });
		serverQueue.player.play(resource);

		console.log(`[EXITO] Reproduciendo audio con voz de: ${voiceUsed} (Servidor: ${guildId})`);

		// Eventos del reproductor
		serverQueue.player.removeAllListeners(AudioPlayerStatus.Idle);
		serverQueue.player.removeAllListeners('error');

		serverQueue.player.on(AudioPlayerStatus.Idle, () => {
			setTimeout(() => {
				processQueue(guildId);
			}, 1000);
		});

		serverQueue.player.on('error', error => {
			console.error(`[ERROR] Error en reproductor de audio TTS (Server ${guildId}):`, error.message);
			setTimeout(() => {
				processQueue(guildId);
			}, 1000);
		});

	} catch (error) {
		console.error(`[ERROR] Error al procesar el TTS en cola (Server ${guildId}):`, error);
		try {
			await current.interaction.followUp({
				content: `❌ Hubo un error al reproducir tu mensaje con voz de IA: *"${current.text}"*`,
				ephemeral: true
			});
		} catch (e) {}
		
		processQueue(guildId);
	}
}

/**
 * Limpia y detiene por completo la cola de voz de un servidor.
 */
function clearQueue(guildId) {
	const serverQueue = guildQueues.get(guildId);
	if (!serverQueue) return false;

	serverQueue.queue = [];
	serverQueue.isPlaying = false;

	if (serverQueue.disconnectTimeout) {
		clearTimeout(serverQueue.disconnectTimeout);
		serverQueue.disconnectTimeout = null;
	}

	if (serverQueue.player) {
		try { serverQueue.player.stop(); } catch (e) {}
		serverQueue.player = null;
	}

	if (serverQueue.connection) {
		try { serverQueue.connection.destroy(); } catch (e) {}
		serverQueue.connection = null;
	}

	return true;
}

/**
 * Devuelve el estado de la cola de voz para diagnóstico.
 */
function getQueueState(guildId) {
	return guildQueues.get(guildId);
}

module.exports = {
	addMessageToQueue,
	clearQueue,
	getQueueState,
};
