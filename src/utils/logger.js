const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', 'data', 'command_logs.json');

// Helper para leer logs de comandos del archivo JSON
function readLogs() {
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
		console.error('[ERROR] Error leyendo command_logs.json:', error);
		return [];
	}
}

// Helper para escribir logs de comandos al archivo JSON
function writeLogs(logs) {
	try {
		fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
	} catch (error) {
		console.error('[ERROR] Error escribiendo command_logs.json:', error);
	}
}

/**
 * Registra el uso de un comando en el archivo JSON
 */
function logCommand(userId, username, commandName, guildId, guildName) {
	const logs = readLogs();
	
	const newLog = {
		userId,
		username,
		commandName,
		guildId,
		guildName,
		timestamp: new Date().toISOString(),
	};

	logs.push(newLog);
	writeLogs(logs);
	console.log(`[LOG] Comando /${commandName} registrado para ${username}.`);
}

/**
 * Procesa los logs y devuelve estadísticas consolidadas
 */
function getStats() {
	const logs = readLogs();

	const totalExecutions = logs.length;
	const commandCount = {};
	const userCount = {};

	// Procesamos los logs
	for (const log of logs) {
		// Frecuencia por comando
		commandCount[log.commandName] = (commandCount[log.commandName] || 0) + 1;
		
		// Frecuencia por usuario
		userCount[log.username] = (userCount[log.username] || 0) + 1;
	}

	// Convertimos el top de usuarios a un array ordenado
	const topUsers = Object.keys(userCount)
		.map(username => ({ username, count: userCount[username] }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5); // Solo los 5 más activos

	// Convertimos la frecuencia por comando en un formato estructurado
	const commandStats = Object.keys(commandCount).map(name => ({
		name,
		count: commandCount[name],
	})).sort((a, b) => b.count - a.count);

	// Obtenemos los últimos 20 comandos ejecutados
	const recentLogs = [...logs].reverse().slice(0, 20);

	return {
		totalExecutions,
		commandStats,
		topUsers,
		recentLogs,
	};
}

module.exports = {
	logCommand,
	getStats,
};
