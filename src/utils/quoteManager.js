const { query } = require('../database');

/**
 * Guarda una nueva frase célebre en la base de datos de PostgreSQL.
 */
async function addQuote(guildId, quoteText, quoteAuthor, addedBy) {
	try {
		await query(
			`INSERT INTO guild_quotes (guild_id, quote_text, quote_author, added_by) 
			 VALUES ($1, $2, $3, $4)`,
			[guildId, quoteText, quoteAuthor, addedBy]
		);
		console.log(`[QUOTE] Nueva frase registrada en PostgreSQL (Servidor: ${guildId}): "${quoteText}" de ${quoteAuthor}`);
		return true;
	} catch (error) {
		console.error(`[ERROR] Error al insertar frase en el servidor ${guildId}:`, error);
		return false;
	}
}

/**
 * Obtiene una frase célebre aleatoria de la base de datos para el servidor actual.
 */
async function getRandomQuote(guildId) {
	try {
		const result = await query(
			`SELECT quote_text as "text", quote_author as "author", added_by as "addedBy" 
			 FROM guild_quotes 
			 WHERE guild_id = $1 
			 ORDER BY RANDOM() 
			 LIMIT 1`,
			[guildId]
		);

		if (result.rows.length > 0) {
			return result.rows[0];
		}
		return null;
	} catch (error) {
		console.error(`[ERROR] Error al buscar frase aleatoria en el servidor ${guildId}:`, error);
		return null;
	}
}

module.exports = {
	addQuote,
	getRandomQuote,
};
