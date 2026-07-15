const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Inicializamos el cliente de Discord con los intents requeridos
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates, // Necesario para detectar conexiones, mutes y bloqueos en canales de voz
	],
});

// Colección para almacenar los comandos cargados
client.commands = new Collection();

// --- CARGA DE COMANDOS ---
const foldersPath = path.join(__dirname, 'commands');
if (fs.existsSync(foldersPath)) {
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			
			// Validamos que el comando tenga la estructura requerida por discord.js v14
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				console.log(`[INFO] Comando cargado con éxito: /${command.data.name}`);
			} else {
				console.warn(`[ADVERTENCIA] El comando en ${filePath} requiere de las propiedades "data" y "execute".`);
			}
		}
	}
} else {
	console.log('[INFO] No se encontró el directorio de comandos, crea uno en src/commands.');
}

// --- CARGA DE EVENTOS ---
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
		console.log(`[INFO] Evento cargado con éxito: ${event.name}`);
	}
} else {
	console.log('[INFO] No se encontró el directorio de eventos, crea uno en src/events.');
}

// Conexión del bot a Discord usando el token de las variables de entorno
if (!process.env.DISCORD_TOKEN) {
	console.error('[ERROR] Falta la variable de entorno DISCORD_TOKEN en el archivo .env');
	process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(err => {
	console.error('[ERROR] Error al iniciar sesión en Discord:', err.message);
});
