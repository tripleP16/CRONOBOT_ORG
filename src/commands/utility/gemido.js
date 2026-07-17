const { SlashCommandBuilder } = require('discord.js');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');
const { isFishVoiceAvailable } = require('../../utils/ttsService');

// Repertorio de gemidos de dolor predefinidos. Cada gemido lleva emparejada la
// intensidad que mejor lo interpreta: 'cabreado' (grito de dolor) o 'triste' (quejido lastimero).
const GEMIDOS_DOLOR = [
	{ text: '¡Ay, ay, ay! ¡Sigue sigue sigue no pares , que rico!', intensity: 'cachondo' },
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gemido')
		.setDescription('Conecta al bot a tu canal de voz y suelta un gemido de dolor aleatorio con la voz de IA elegida.')
		.addStringOption(option =>
			option.setName('voz')
				.setDescription('La voz de IA que gemirá de dolor (El Xokas por defecto).')
				.setRequired(false)
				.addChoices(
					{ name: 'El Xokas (IA)', value: 'xokas' },
					{ name: 'E-girl (IA)', value: 'egirl' },
					{ name: 'E-girl Coqueta (IA)', value: 'coqueta' },
					{ name: 'E-girl Tifani ASMR (IA)', value: 'tifani' },
					{ name: 'E-girl Seductora (IA)', value: 'seductora' },
					{ name: 'AriGameplays (IA)', value: 'ari' },
					{ name: 'El Rubius (IA)', value: 'rubius' },
					{ name: 'Nicki Nicole (IA)', value: 'nicki' },
					{ name: 'Emilia Mernes (IA)', value: 'emilia' },
					{ name: 'Maria Becerra (IA)', value: 'becerra' },
					{ name: 'Aroyitt (IA)', value: 'aroyitt' },
					{ name: 'Cristinini (IA)', value: 'cristinini' },
					{ name: 'Lionel Messi (IA)', value: 'messi' },
					{ name: 'Cristiano Ronaldo (IA)', value: 'cr7' },
					{ name: 'Dalas Review (IA)', value: 'dalas' },
					{ name: 'Hugo Chávez (IA)', value: 'chavez' }
				)),
	async execute(interaction) {
		const voiceOption = interaction.options.getString('voz') || 'xokas';
		const voiceChannel = interaction.member.voice.channel;
		const guildId = interaction.guild.id;

		// 1. Validamos que las voces de IA estén configuradas en el servidor
		if (!isFishVoiceAvailable()) {
			return interaction.reply({
				content: '❌ Las voces de IA no están configuradas (falta `FISH_AUDIO_API_KEY` en el servidor), así que no puedo gemir de dolor.',
				ephemeral: true,
			});
		}

		// 2. Validamos que el usuario esté en un canal de voz
		if (!voiceChannel) {
			return interaction.reply({
				content: '❌ Debes estar conectado a un canal de voz en este servidor para usar este comando.',
				ephemeral: true,
			});
		}

		// 3. Validamos los permisos del bot para entrar y hablar
		const permissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!permissions.has('Connect') || !permissions.has('Speak')) {
			return interaction.reply({
				content: '❌ No tengo permisos para conectarme y hablar en tu canal de voz actual.',
				ephemeral: true,
			});
		}

		// Elegimos un gemido de dolor aleatorio del repertorio
		const gemido = GEMIDOS_DOLOR[Math.floor(Math.random() * GEMIDOS_DOLOR.length)];

		// Delegamos al gestor de colas de voz con el gemido y su intensidad predefinida
		await addMessageToQueue(guildId, voiceChannel, gemido.text, voiceOption, interaction, gemido.intensity);
	},
};
