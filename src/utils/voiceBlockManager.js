const { query } = require('../database');

const activeTimers = new Map();
const activeBlocksCache = new Set(); // Caché en memoria para validaciones de voz síncronas rápidas

function getCacheKey(guildId, userId, channelId) {
	return `${guildId}-${userId}-${channelId}`;
}

/**
 * Registra un bloqueo de canal de voz en PostgreSQL e inicia el temporizador local
 */
async function addVoiceBlock(client, userId, guildId, channelId, notificationChannelId, durationMs) {
	const endsAt = Date.now() + durationMs;
	
	try {
		// Guardamos o actualizamos en la base de datos
		await query(`
			INSERT INTO voice_blocks (user_id, guild_id, channel_id, ends_at, notification_channel_id)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (user_id, guild_id, channel_id)
			DO UPDATE SET ends_at = EXCLUDED.ends_at, notification_channel_id = EXCLUDED.notification_channel_id
		`, [userId, guildId, channelId, endsAt, notificationChannelId]);

		// Actualizamos caché en memoria y temporizadores locales
		activeBlocksCache.add(getCacheKey(guildId, userId, channelId));
		clearTimer(userId, guildId, channelId);
		setupUnblockTimer(client, userId, guildId, channelId, durationMs);
		
		console.log(`[INFO] Bloqueo de canal de voz guardado en Postgres para ${userId} en canal ${channelId} por ${durationMs}ms.`);
	} catch (error) {
		console.error('[ERROR] Error al registrar bloqueo de canal de voz en Postgres:', error);
	}
}

/**
 * Remueve la sanción de bloqueo, actualiza Postgres y notifica en el canal de texto
 */
async function removeVoiceBlock(client, userId, guildId, channelId) {
	activeBlocksCache.delete(getCacheKey(guildId, userId, channelId));
	clearTimer(userId, guildId, channelId);

	let block = null;
	try {
		// Buscamos el log antes de borrarlo para saber a qué canal notificar
		const res = await query('SELECT notification_channel_id FROM voice_blocks WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3', [userId, guildId, channelId]);
		if (res.rows.length > 0) {
			block = res.rows[0];
		}
		
		// Borramos el registro de la base de datos
		await query('DELETE FROM voice_blocks WHERE user_id = $1 AND guild_id = $2 AND channel_id = $3', [userId, guildId, channelId]);
	} catch (error) {
		console.error('[ERROR] Error al borrar bloqueo de canal de voz en Postgres:', error);
	}

	try {
		// Enviamos la notificación al canal de texto
		if (block && block.notification_channel_id) {
			const textChannel = await client.channels.fetch(block.notification_channel_id).catch(() => null);
			if (textChannel) {
				await textChannel.send(`🔊 **[Bloqueo de Canal Finalizado]** El bloqueo de <@${userId}> para acceder al canal de voz <#${channelId}> ha terminado. Ya puede volver a ingresar.`).catch(err => console.warn('[WARN] No se pudo enviar mensaje de fin de bloqueo:', err.message));
			}
		}
	} catch (error) {
		console.error(`[ERROR] Ocurrió un error al enviar la notificación de fin de bloqueo para ${userId}:`, error);
	}
}

/**
 * Configura el temporizador setTimeout local para ejecutar el desbloqueo automático
 */
function setupUnblockTimer(client, userId, guildId, channelId, delayMs) {
	const timerKey = `${guildId}-${userId}-${channelId}`;
	const timer = setTimeout(async () => {
		console.log(`[INFO] Tiempo de bloqueo cumplido para el usuario ${userId} en canal ${channelId}. Removiendo restricciones...`);
		await removeVoiceBlock(client, userId, guildId, channelId);
	}, delayMs);

	activeTimers.set(timerKey, timer);
}

/**
 * Limpia el temporizador de la memoria
 */
function clearTimer(userId, guildId, channelId) {
	const timerKey = `${guildId}-${userId}-${channelId}`;
	if (activeTimers.has(timerKey)) {
		clearTimeout(activeTimers.get(timerKey));
		activeTimers.delete(timerKey);
	}
}

/**
 * Carga todos los bloqueos guardados en PostgreSQL al iniciar el bot
 */
async function loadActiveBlocks(client) {
	console.log('[INFO] Cargando bloqueos de canal de voz guardados desde PostgreSQL...');
	try {
		const res = await query('SELECT user_id as "userId", guild_id as "guildId", channel_id as "channelId", ends_at as "endsAt", notification_channel_id as "notificationChannelId" FROM voice_blocks');
		const blocks = res.rows;
		const now = Date.now();
		
		console.log(`[INFO] Se encontraron ${blocks.length} bloqueos guardados.`);

		for (const block of blocks) {
			const timeLeft = block.endsAt - now;
			activeBlocksCache.add(getCacheKey(block.guildId, block.userId, block.channelId));
			
			if (timeLeft <= 0) {
				console.log(`[INFO] El bloqueo de ${block.userId} en canal ${block.channelId} ya expiró. Removiendo sanción...`);
				await removeVoiceBlock(client, block.userId, block.guildId, block.channelId);
			} else {
				setupUnblockTimer(client, block.userId, block.guildId, block.channelId, timeLeft);
			}
		}
	} catch (error) {
		console.error('[ERROR] Error al cargar bloqueos de canal de voz desde PostgreSQL:', error);
	}
}

/**
 * Obtiene todos los bloqueos activos directamente de PostgreSQL
 */
async function getActiveBlocksFromDB() {
	try {
		const res = await query('SELECT user_id as "userId", guild_id as "guildId", channel_id as "channelId", ends_at as "endsAt" FROM voice_blocks');
		return res.rows;
	} catch (error) {
		console.error('[ERROR] Error al consultar bloqueos activos de la BD:', error);
		return [];
	}
}

/**
 * Consulta de forma síncrona si un canal está bloqueado para un usuario en un servidor
 */
function isUserVoiceBlocked(userId, guildId, channelId) {
	return activeBlocksCache.has(getCacheKey(guildId, userId, channelId));
}

module.exports = {
	addVoiceBlock,
	removeVoiceBlock,
	loadActiveBlocks,
	isUserVoiceBlocked,
	getActiveBlocksFromDB,
};
