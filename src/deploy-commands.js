const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

// Ruta de la carpeta de comandos
const foldersPath = path.join(__dirname, 'commands');

if (!fs.existsSync(foldersPath)) {
	console.error('[ERROR] La carpeta de comandos (src/commands) no existe. Crea comandos antes de registrarlos.');
	process.exit(1);
}

const commandFolders = fs.readdirSync(foldersPath);

// Leemos todos los comandos y convertimos la información de SlashCommandBuilder a JSON
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.warn(`[ADVERTENCIA] El comando en ${filePath} no tiene las propiedades requeridas "data" y "execute".`);
		}
	}
}

// Validamos las variables de entorno necesarias
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
	console.error('[ERROR] Falta DISCORD_TOKEN o CLIENT_ID en las variables de entorno (.env).');
	process.exit(1);
}

// Inicializamos el cliente REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Función autoejecutable para registrar los comandos
(async () => {
	try {
		console.log(`[INFO] Iniciando el registro de ${commands.length} comandos de barra (/).`);

		let data;
		if (process.env.GUILD_ID) {
			// Si configuramos un Guild ID, se registran en ese servidor específico (instantáneo, ideal para pruebas)
			console.log(`[INFO] Registrando comandos localmente en el servidor ID: ${process.env.GUILD_ID}`);
			data = await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
				{ body: commands },
			);
		} else {
			// De lo contrario, se registran de manera global (tarda de 1 a 60 minutos en actualizarse)
			console.log('[INFO] Registrando comandos de manera global (puede tardar en propagarse).');
			data = await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: commands },
			);
		}

		console.log(`[EXITO] Se registraron correctamente ${data.length} comandos de barra (/).`);
	} catch (error) {
		console.error('[ERROR] Ocurrió un error al registrar los comandos:', error);
	}
})();
