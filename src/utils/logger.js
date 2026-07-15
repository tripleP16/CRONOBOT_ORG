const { query } = require('../database');

/**
 * Registra el uso de un comando en PostgreSQL con detalles opcionales (como voces de voz)
 */
async function logCommand(userId, username, commandName, guildId, guildName, details = null) {
	try {
		await query(
			`INSERT INTO command_logs (user_id, username, command_name, guild_id, guild_name, details) 
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[userId, username, commandName, guildId, guildName, details]
		);
		console.log(`[LOG] Comando /${commandName} registrado en PostgreSQL para ${username} (Detalles: ${details || 'Ninguno'}).`);
	} catch (error) {
		console.error('[ERROR] Error al registrar comando en PostgreSQL:', error);
	}
}

/**
 * Procesa los logs de PostgreSQL y devuelve estadísticas consolidadas incluyendo métricas de voz
 */
async function getStats() {
	try {
		// Ejecutamos consultas en paralelo para máxima eficiencia
		const [totalResult, commandResult, userResult, recentResult, voiceResult] = await Promise.all([
			query('SELECT COUNT(*) FROM command_logs'),
			query('SELECT command_name as name, COUNT(*)::integer as count FROM command_logs GROUP BY command_name ORDER BY count DESC'),
			query('SELECT username, COUNT(*)::integer as count FROM command_logs GROUP BY username ORDER BY count DESC LIMIT 5'),
			query('SELECT user_id as "userId", username, command_name as "commandName", guild_id as "guildId", guild_name as "guildName", timestamp FROM command_logs ORDER BY timestamp DESC LIMIT 20'),
			query("SELECT COALESCE(details, 'Google Translate') as voice, COUNT(*)::integer as count FROM command_logs WHERE command_name IN ('decir', 'decir-ia') GROUP BY details ORDER BY count DESC")
		]);

		const totalExecutions = parseInt(totalResult.rows[0].count) || 0;
		const commandStats = commandResult.rows;
		const topUsers = userResult.rows;
		const recentLogs = recentResult.rows;
		const voiceStats = voiceResult.rows;

		return {
			totalExecutions,
			commandStats,
			topUsers,
			recentLogs,
			voiceStats
		};
	} catch (error) {
		console.error('[ERROR] Error al procesar estadísticas de PostgreSQL:', error);
		return {
			totalExecutions: 0,
			commandStats: [],
			topUsers: [],
			recentLogs: [],
			voiceStats: []
		};
	}
}

module.exports = {
	logCommand,
	getStats,
};
