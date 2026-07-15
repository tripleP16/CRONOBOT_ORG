const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'data', 'voice_mutes.json');

// Mapa para almacenar los temporizadores activos en memoria
const activeTimers = new Map();

// Helper para leer las sanciones de voz del archivo JSON
function readMutes() {
	try {
		if (!fs.existsSync(filePath)) {
			const dirPath = path.dirname(filePath);
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}
			fs.writeFileSync(filePath, JSON.stringify([]));
			return [];
		}
		const data = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(data || '[]');
	} catch (error) {
		console.error('[ERROR] Error leyendo voice_mutes.json:', error);
		return [];
	}
}

// Helper para escribir las sanciones de voz al archivo JSON
function writeMutes(mutes) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(mutes, null, 2));
	} catch (error) {
		console.error('[ERROR] Error escribiendo voice_mutes.json:', error);
	}
}

/**
 * Registra una sanción de silencio de voz
 */
function addVoiceMute(client, userId, guildId, notificationChannelId, durationMs) {
	const endsAt = Date.now() + durationMs;
	const mutes = readMutes();

	// Si el usuario ya estaba silenciado, limpiamos su temporizador anterior
	const existingMuteIndex = mutes.findIndex(m => m.userId === userId && m.guildId === guildId);
	if (existingMuteIndex !== -1) {
		mutes.splice(existingMuteIndex, 1);
		clearTimer(userId, guildId);
	}

	mutes.push({ userId, guildId, endsAt, notificationChannelId });
	writeMutes(mutes);

	// Programamos el desmuteo automático
	setupUnmuteTimer(client, userId, guildId, durationMs);
	console.log(`[INFO] Sanción de voz registrada para usuario ${userId} en servidor ${guildId} por ${durationMs}ms.`);
}

/**
 * Remueve la sanción y restaura la voz del usuario
 */
async function removeVoiceMute(client, userId, guildId) {
	const mutes = readMutes();
	const mute = mutes.find(m => m.userId === userId && m.guildId === guildId);
	
	const filteredMutes = mutes.filter(m => !(m.userId === userId && m.guildId === guildId));
	writeMutes(filteredMutes);

	clearTimer(userId, guildId);

	try {
		const guild = await client.guilds.fetch(guildId).catch(() => null);
		if (!guild) return;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member) return;

		// Si el miembro está conectado a un canal de voz, le retiramos el silencio y el ensordecimiento
		if (member.voice.channelId) {
			await member.voice.setMute(false, 'Expiración del silencio de voz').catch(err => console.warn(`[WARN] No se pudo desmutear de voz a ${userId}: ${err.message}`));
			await member.voice.setDeaf(false, 'Expiración del silencio de voz').catch(err => console.warn(`[WARN] No se pudo desensordecer de voz a ${userId}: ${err.message}`));
			console.log(`[EXITO] Desmuteado de voz aplicado en canal de voz al usuario ${member.user.tag}`);
		}

		// Enviamos la notificación al canal de texto donde se ejecutó el comando
		if (mute && mute.notificationChannelId) {
			const textChannel = await client.channels.fetch(mute.notificationChannelId).catch(() => null);
			if (textChannel) {
				await textChannel.send(`🔊 **[Silencio Finalizado]** El silencio de voz de <@${userId}> ha terminado. Ya puede volver a hablar en los canales de voz.`).catch(err => console.warn('[WARN] No se pudo enviar mensaje de fin de silencio:', err.message));
			}
		}
	} catch (error) {
		console.error(`[ERROR] Ocurrió un error al intentar remover restricciones de voz de ${userId}:`, error);
	}
}

/**
 * Configura un temporizador para desmutear al usuario
 */
function setupUnmuteTimer(client, userId, guildId, delayMs) {
	const timerKey = `${guildId}-${userId}`;
	const timer = setTimeout(async () => {
		console.log(`[INFO] Tiempo de silencio cumplido para el usuario ${userId}. Removiendo restricciones...`);
		await removeVoiceMute(client, userId, guildId);
	}, delayMs);

	activeTimers.set(timerKey, timer);
}

/**
 * Cancela un temporizador en memoria
 */
function clearTimer(userId, guildId) {
	const timerKey = `${guildId}-${userId}`;
	if (activeTimers.has(timerKey)) {
		clearTimeout(activeTimers.get(timerKey));
		activeTimers.delete(timerKey);
	}
}

/**
 * Carga e inicializa todos los silencios activos (para usar en el ready.js)
 */
function loadActiveMutes(client) {
	const mutes = readMutes();
	const now = Date.now();
	
	console.log(`[INFO] Cargando ${mutes.length} silencios de voz guardados...`);

	for (const mute of mutes) {
		const timeLeft = mute.endsAt - now;
		
		if (timeLeft <= 0) {
			console.log(`[INFO] El silencio de ${mute.userId} ya expiró. Removiendo sanción...`);
			removeVoiceMute(client, mute.userId, mute.guildId);
		} else {
			setupUnmuteTimer(client, mute.userId, mute.guildId, timeLeft);
		}
	}
}

/**
 * Comprueba si un usuario tiene una sanción de voz activa
 */
function isUserVoiceMuted(userId, guildId) {
	const mutes = readMutes();
	return mutes.some(m => m.userId === userId && m.guildId === guildId);
}

module.exports = {
	addVoiceMute,
	removeVoiceMute,
	loadActiveMutes,
	isUserVoiceMuted,
};
