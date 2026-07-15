const { query } = require('../database');

const activeTimers = new Map();
const activeMutesCache = new Set(); // Caché en memoria para validaciones de voz síncronas rápidas

function getCacheKey(guildId, userId) {
	return `${guildId}-${userId}`;
}

/**
 * Registra un silencio de voz en PostgreSQL e inicia el temporizador local
 */
async function addVoiceMute(client, userId, guildId, notificationChannelId, durationMs) {
	const endsAt = Date.now() + durationMs;
	
	try {
		// Guardamos o actualizamos en la base de datos
		await query(`
			INSERT INTO voice_mutes (user_id, guild_id, ends_at, notification_channel_id)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_id, guild_id)
			DO UPDATE SET ends_at = EXCLUDED.ends_at, notification_channel_id = EXCLUDED.notification_channel_id
		`, [userId, guildId, endsAt, notificationChannelId]);

		// Actualizamos caché en memoria y temporizadores locales
		activeMutesCache.add(getCacheKey(guildId, userId));
		clearTimer(userId, guildId);
		setupUnmuteTimer(client, userId, guildId, durationMs);
		
		console.log(`[INFO] Silencio de voz guardado en Postgres para ${userId} por ${durationMs}ms.`);
	} catch (error) {
		console.error('[ERROR] Error al registrar silencio de voz en Postgres:', error);
	}
}

/**
 * Remueve la sanción de silencio, actualiza Postgres y quita restricciones de Discord
 */
async function removeVoiceMute(client, userId, guildId) {
	activeMutesCache.delete(getCacheKey(guildId, userId));
	clearTimer(userId, guildId);

	let mute = null;
	try {
		// Buscamos el log antes de borrarlo para saber a qué canal notificar
		const res = await query('SELECT notification_channel_id FROM voice_mutes WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);
		if (res.rows.length > 0) {
			mute = res.rows[0];
		}
		
		// Borramos el registro de la base de datos
		await query('DELETE FROM voice_mutes WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);
	} catch (error) {
		console.error('[ERROR] Error al borrar silencio de voz en Postgres:', error);
	}

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

		// Enviamos la notificación al canal de texto
		if (mute && mute.notification_channel_id) {
			const textChannel = await client.channels.fetch(mute.notification_channel_id).catch(() => null);
			if (textChannel) {
				await textChannel.send(`🔊 **[Silencio Finalizado]** El silencio de voz de <@${userId}> ha terminado. Ya puede volver a hablar en los canales de voz.`).catch(err => console.warn('[WARN] No se pudo enviar mensaje de fin de silencio:', err.message));
			}
		}
	} catch (error) {
		console.error(`[ERROR] Ocurrió un error al intentar remover restricciones de voz de ${userId}:`, error);
	}
}

/**
 * Configura el temporizador setTimeout local para ejecutar el desmuteo automático
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
 * Limpia el temporizador de la memoria
 */
function clearTimer(userId, guildId) {
	const timerKey = `${guildId}-${userId}`;
	if (activeTimers.has(timerKey)) {
		clearTimeout(activeTimers.get(timerKey));
		activeTimers.delete(timerKey);
	}
}

/**
 * Carga todos los silencios guardados en PostgreSQL al iniciar el bot
 */
async function loadActiveMutes(client) {
	console.log('[INFO] Cargando silencios de voz guardados desde PostgreSQL...');
	try {
		const res = await query('SELECT user_id as "userId", guild_id as "guildId", ends_at as "endsAt", notification_channel_id as "notificationChannelId" FROM voice_mutes');
		const mutes = res.rows;
		const now = Date.now();
		
		console.log(`[INFO] Se encontraron ${mutes.length} silencios guardados.`);

		for (const mute of mutes) {
			const timeLeft = mute.endsAt - now;
			activeMutesCache.add(getCacheKey(mute.guildId, mute.userId));
			
			if (timeLeft <= 0) {
				console.log(`[INFO] El silencio de ${mute.userId} ya expiró. Removiendo sanción...`);
				await removeVoiceMute(client, mute.userId, mute.guildId);
			} else {
				setupUnmuteTimer(client, mute.userId, mute.guildId, timeLeft);
			}
		}
	} catch (error) {
		console.error('[ERROR] Error al cargar silencios de voz activos desde PostgreSQL:', error);
	}
}

/**
 * Obtiene todos los silencios activos directamente de PostgreSQL
 */
async function getActiveMutesFromDB() {
	try {
		const res = await query('SELECT user_id as "userId", guild_id as "guildId", ends_at as "endsAt" FROM voice_mutes');
		return res.rows;
	} catch (error) {
		console.error('[ERROR] Error al consultar silencios activos de la BD:', error);
		return [];
	}
}

/**
 * Consulta de forma síncrona si un usuario está silenciado en un servidor
 */
function isUserVoiceMuted(userId, guildId) {
	return activeMutesCache.has(getCacheKey(guildId, userId));
}

module.exports = {
	addVoiceMute,
	removeVoiceMute,
	loadActiveMutes,
	isUserVoiceMuted,
	getActiveMutesFromDB,
};
