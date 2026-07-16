const { query } = require('../database');

/**
 * Guarda o actualiza el ID del canal de frases del día para un servidor en PostgreSQL.
 */
async function setFrasesChannel(guildId, channelId) {
	try {
		await query(
			`INSERT INTO guild_configs (guild_id, frases_channel_id) 
			 VALUES ($1, $2)
			 ON CONFLICT (guild_id) 
			 DO UPDATE SET frases_channel_id = EXCLUDED.frases_channel_id`,
			[guildId, channelId]
		);
		console.log(`[CONFIG] Canal de frases configurado en PostgreSQL para el servidor ${guildId}: ${channelId}`);
		return true;
	} catch (error) {
		console.error(`[ERROR] Error al guardar el canal de frases para el servidor ${guildId}:`, error);
		return false;
	}
}

/**
 * Obtiene el ID del canal de frases del día configurado para un servidor en PostgreSQL.
 */
async function getFrasesChannel(guildId) {
	try {
		const result = await query(
			'SELECT frases_channel_id FROM guild_configs WHERE guild_id = $1',
			[guildId]
		);
		
		if (result.rows.length > 0) {
			return result.rows[0].frases_channel_id;
		}
		return null;
	} catch (error) {
		console.error(`[ERROR] Error al obtener el canal de frases para el servidor ${guildId}:`, error);
		return null;
	}
}

module.exports = {
	setFrasesChannel,
	getFrasesChannel,
};
