const { SlashCommandBuilder } = require('discord.js');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');
const { isFishVoiceAvailable } = require('../../utils/ttsService');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decir-ia')
		.setDescription('Conecta al bot a tu canal de voz y habla usando voces clonadas por IA.')
		.addStringOption(option =>
			option.setName('texto')
				.setDescription('El texto que deseas que el bot diga (máximo 200 caracteres).')
				.setRequired(true)
				.setMaxLength(200))
		.addStringOption(option =>
			option.setName('voz')
				.setDescription('La voz de IA con la que hablará el bot (El Xokas por defecto).')
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
					{ name: 'Dalas Review (IA)', value: 'dalas' },
					{ name: 'Hugo Chávez (IA)', value: 'chavez' }
				))
		.addStringOption(option =>
			option.setName('intensidad')
				.setDescription('El tono con el que hablará la voz de IA (Normal por defecto).')
				.setRequired(false)
				.addChoices(
					{ name: 'Normal', value: 'normal' },
					{ name: 'Emocionado', value: 'emocionado' },
					{ name: 'Triste', value: 'triste' },
					{ name: 'Cabreado (gritando)', value: 'cabreado' },
					{ name: 'Cachondo/a (seductor)', value: 'cachondo' }
				)),
	async execute(interaction) {
		const text = interaction.options.getString('texto');
		const voiceOption = interaction.options.getString('voz') || 'xokas';
		const intensity = interaction.options.getString('intensidad') || 'normal';
		const voiceChannel = interaction.member.voice.channel;
		const guildId = interaction.guild.id;

		// 1. Validamos que las voces de IA estén configuradas en el servidor
		if (!isFishVoiceAvailable()) {
			return interaction.reply({
				content: '❌ Las voces de IA no están configuradas (falta `FISH_AUDIO_API_KEY` en el servidor). Usa `/decir` para la voz clásica de Google.',
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

		// Delegamos al gestor de colas de voz con la voz de IA y la intensidad seleccionadas
		await addMessageToQueue(guildId, voiceChannel, text, voiceOption, interaction, intensity);
	},
};
