const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Responde con Pong y muestra la latencia del bot.'),
	async execute(interaction) {
		const sent = await interaction.reply({ content: 'Calculando latencia...', fetchReply: true, ephemeral: true });
		const latency = sent.createdTimestamp - interaction.createdTimestamp;
		const apiLatency = Math.round(interaction.client.ws.ping);
		
		await interaction.editReply(`🏓 **¡Pong!**\n• Latencia del Bot: \`${latency}ms\`\n• Latencia de la API de Discord: \`${apiLatency}ms\``);
	},
};
