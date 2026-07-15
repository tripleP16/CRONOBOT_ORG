const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'data', 'voice_blocks.json');

// Mapa para almacenar los temporizadores activos de desbloqueo en memoria
const activeTimers = new Map();

// Helper para leer los bloqueos de voz del archivo JSON
function readBlocks() {
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
		console.error('[ERROR] Error leyendo voice_blocks.json:', error);
		return [];
	}
}

// Helper para escribir los bloqueos de voz al archivo JSON
function writeBlocks(blocks) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(blocks, null, 2));
	} catch (error) {
		console.error('[ERROR] Error escribiendo voice_blocks.json:', error);
	}
}

/**
 * Registra un bloqueo de canal de voz
 */
function addVoiceBlock(client, userId, guildId, channelId, notificationChannelId, durationMs) {
	const endsAt = Date.now() + durationMs;
	const blocks = readBlocks();

	// Si el usuario ya tenía un bloqueo para ese canal, limpiamos el temporizador anterior
	const existingBlockIndex = blocks.findIndex(b => b.userId === userId && b.guildId === guildId && b.channelId === channelId);
	if (existingBlockIndex !== -1) {
		blocks.splice(existingBlockIndex, 1);
		clearTimer(userId, guildId, channelId);
	}

	blocks.push({ userId, guildId, channelId, endsAt, notificationChannelId });
	writeBlocks(blocks);

	// Programamos el desbloqueo automático
	setupUnlockTimer(client, userId, guildId, channelId, durationMs);
	console.log(`[INFO] Bloqueo de voz registrado para usuario ${userId} en canal ${channelId} (servidor ${guildId}) por ${durationMs}ms.`);
}

/**
 * Remueve el bloqueo de canal de voz
 */
async function removeVoiceBlock(client, userId, guildId, channelId) {
	const blocks = readBlocks();
	const block = blocks.find(b => b.userId === userId && b.guildId === guildId && b.channelId === channelId);

	const filteredBlocks = blocks.filter(b => !(b.userId === userId && b.guildId === guildId && b.channelId === channelId));
	writeBlocks(filteredBlocks);

	clearTimer(userId, guildId, channelId);

	try {
		// Enviamos la notificación al canal de texto donde se ejecutó el comando
		if (block && block.notificationChannelId) {
			const textChannel = await client.channels.fetch(block.notificationChannelId).catch(() => null);
			if (textChannel) {
				await textChannel.send(`🔊 **[Bloqueo Finalizado]** El bloqueo de canal de voz <#${channelId}> para <@${userId}> ha terminado. Ya puede volver a entrar.`).catch(err => console.warn('[WARN] No se pudo enviar mensaje de fin de bloqueo:', err.message));
			}
		}
	} catch (error) {
		console.error(`[ERROR] Ocurrió un error al enviar la notificación de fin de bloqueo para ${userId}:`, error);
	}
}

/**
 * Configura un temporizador para remover el bloqueo de voz
 */
function setupUnlockTimer(client, userId, guildId, channelId, delayMs) {
	const timerKey = `${guildId}-${channelId}-${userId}`;
	const timer = setTimeout(async () => {
		console.log(`[INFO] Tiempo de bloqueo cumplido para usuario ${userId} en canal ${channelId}. Removiendo bloqueo...`);
		await removeVoiceBlock(client, userId, guildId, channelId);
	}, delayMs);

	activeTimers.set(timerKey, timer);
}

/**
 * Cancela un temporizador en memoria
 */
function clearTimer(userId, guildId, channelId) {
	const timerKey = `${guildId}-${channelId}-${userId}`;
	if (activeTimers.has(timerKey)) {
		clearTimeout(activeTimers.get(timerKey));
		activeTimers.delete(timerKey);
	}
}

/**
 * Carga e inicializa todos los bloqueos activos al arrancar el bot (ready.js)
 */
function loadActiveVoiceBlocks(client) {
	const blocks = readBlocks();
	const now = Date.now();

	console.log(`[INFO] Cargando ${blocks.length} bloqueos de canales de voz...`);

	for (const block of blocks) {
		const timeLeft = block.endsAt - now;

		if (timeLeft <= 0) {
			console.log(`[INFO] El bloqueo de ${block.userId} para el canal ${block.channelId} ya expiró. Removiendo bloqueo...`);
			removeVoiceBlock(client, block.userId, block.guildId, block.channelId);
		} else {
			setupUnlockTimer(client, block.userId, block.guildId, block.channelId, timeLeft);
		}
	}
}

/**
 * Comprueba si un usuario tiene un bloqueo de voz activo en un canal específico
 */
function isUserVoiceBlocked(userId, guildId, channelId) {
	const blocks = readBlocks();
	return blocks.some(b => b.userId === userId && b.guildId === guildId && b.channelId === channelId);
}

module.exports = {
	addVoiceBlock,
	removeVoiceBlock,
	loadActiveVoiceBlocks,
	isUserVoiceBlocked,
};
