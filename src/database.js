const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	console.error('[CRITICAL] No se encontró la variable DATABASE_URL en el archivo .env o en el entorno.');
	process.exit(1);
}

// Por defecto en servidores locales o contenedores internos de Coolify no se usa SSL.
// Solo habilitamos SSL si la cadena de conexión lo requiere explícitamente.
const hasSSLParams = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true');

const pool = new Pool({
	connectionString,
	ssl: hasSSLParams ? { rejectUnauthorized: false } : false
});

// Helper para ejecutar consultas rápidas
function query(text, params) {
	return pool.query(text, params);
}

// Inicialización de la base de datos (creación de tablas si no existen)
async function initDatabase() {
	try {
		console.log('[INFO] Conectando a PostgreSQL e inicializando tablas...');
		
		// 1. Tabla de Logs de Comandos
		await query(`
			CREATE TABLE IF NOT EXISTS command_logs (
				id SERIAL PRIMARY KEY,
				user_id VARCHAR(50) NOT NULL,
				username VARCHAR(100) NOT NULL,
				command_name VARCHAR(50) NOT NULL,
				guild_id VARCHAR(50),
				guild_name VARCHAR(100),
				timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`);
		console.log('[INFO] Tabla "command_logs" verificada/creada.');

		// Añadir columna 'details' para registrar opciones adicionales de comandos (como la voz TTS usada)
		await query(`ALTER TABLE command_logs ADD COLUMN IF NOT EXISTS details VARCHAR(100)`);

		// Crear índices para optimizar las consultas de estadísticas del Dashboard
		await query(`CREATE INDEX IF NOT EXISTS idx_command_logs_command_name ON command_logs(command_name)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_command_logs_username ON command_logs(username)`);
		await query(`CREATE INDEX IF NOT EXISTS idx_command_logs_timestamp ON command_logs(timestamp DESC)`);
		console.log('[INFO] Índices para "command_logs" verificados/creados.');

		// 2. Tabla de Silencios de Voz Activos (Mutes)
		await query(`
			CREATE TABLE IF NOT EXISTS voice_mutes (
				id SERIAL PRIMARY KEY,
				user_id VARCHAR(50) NOT NULL,
				guild_id VARCHAR(50) NOT NULL,
				ends_at BIGINT NOT NULL,
				notification_channel_id VARCHAR(50),
				CONSTRAINT unique_user_guild_mute UNIQUE (user_id, guild_id)
			)
		`);
		console.log('[INFO] Tabla "voice_mutes" verificada/creada.');

		// 3. Tabla de Bloqueos de Canales de Voz Activos (Blocks)
		await query(`
			CREATE TABLE IF NOT EXISTS voice_blocks (
				id SERIAL PRIMARY KEY,
				user_id VARCHAR(50) NOT NULL,
				guild_id VARCHAR(50) NOT NULL,
				channel_id VARCHAR(50) NOT NULL,
				ends_at BIGINT NOT NULL,
				notification_channel_id VARCHAR(50),
				CONSTRAINT unique_user_guild_channel_block UNIQUE (user_id, guild_id, channel_id)
			)
		`);
		console.log('[INFO] Tabla "voice_blocks" verificada/creada.');
		
		// 4. Tabla de Configuraciones del Servidor
		await query(`
			CREATE TABLE IF NOT EXISTS guild_configs (
				guild_id VARCHAR(50) PRIMARY KEY,
				frases_channel_id VARCHAR(50)
			)
		`);
		console.log('[INFO] Tabla "guild_configs" verificada/creada.');
		
		// 5. Tabla de Frases Célebres (Quotes)
		await query(`
			CREATE TABLE IF NOT EXISTS guild_quotes (
				id SERIAL PRIMARY KEY,
				guild_id VARCHAR(50) NOT NULL,
				quote_text TEXT NOT NULL,
				quote_author VARCHAR(100) NOT NULL,
				added_by VARCHAR(100) NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
			)
		`);
		await query(`CREATE INDEX IF NOT EXISTS idx_guild_quotes_guild_id ON guild_quotes(guild_id)`);
		console.log('[INFO] Tabla "guild_quotes" e índice verificados/creados.');
		
		console.log('[EXITO] Base de datos de PostgreSQL inicializada correctamente.');
	} catch (error) {
		console.error('[ERROR] Error crítico al inicializar la base de datos de PostgreSQL:', error);
		throw error;
	}
}

module.exports = {
	query,
	initDatabase,
	pool,
};
