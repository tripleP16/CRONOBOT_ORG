const { SlashCommandBuilder } = require('discord.js');
const { addMessageToQueue } = require('../../utils/voiceQueueManager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('decir-ia')
		.setDescription('Conecta al bot a tu canal de voz actual y habla usando voz clonada por IA (El Xokas).')
		.addStringOption(option =>
			option.setName('texto')
				.setDescription('El texto que deseas que el bot diga (máximo 200 caracteres).')
				.setRequired(true)
				.setMaxLength(200))
		.addStringOption(option =>
			option.setName('voz')
				.setDescription('Elige la voz del bot (El Xokas por defecto si la API Key está configurada).')
				.setRequired(false)
				.addChoices(
					{ name: 'El Xokas (IA Clonada)', value: 'xokas' },
					{ name: 'Google Translate (Clásica)', value: 'google' }
				)),
	async execute(interaction) {
		const text = interaction.options.getString('texto');
		const voiceChannel = interaction.member.voice.channel;
		const guildId = interaction.guild.id;

		// Determinamos la voz solicitada
		const defaultVoice = process.env.FISH_AUDIO_API_KEY ? 'xokas' : 'google';
		const voiceOption = interaction.options.getString('voz') || defaultVoice;

		// 1. Validamos que el usuario esté en un canal de voz
		if (!voiceChannel) {
			return interaction.reply({
				content: '❌ Debes estar conectado a un canal de voz en este servidor para usar este comando.',
				ephemeral: true,
			});
		}

		// 2. Validamos los permisos del bot para entrar y hablar
		const permissions = voiceChannel.permissionsFor(interaction.client.user);
		if (!permissions.has('Connect') || !permissions.has('Speak')) {
			return interaction.reply({
				content: '❌ No tengo permisos para conectarme y hablar en tu canal de voz actual.',
				ephemeral: true,
			});
		}

		// Delegamos al gestor de colas de voz especificando la opción seleccionada
		await addMessageToQueue(guildId, voiceChannel, text, voiceOption, interaction);
	},
};
