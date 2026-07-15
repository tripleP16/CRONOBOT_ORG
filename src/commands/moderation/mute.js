const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addVoiceMute } = require('../../utils/voiceMuteManager');
const { generateMathChallenge } = require('../../utils/challenge');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mute')
		.setDescription('Aplica silencio de voz a un miembro (requiere resolver un reto de 10s).')
		.addUserOption(option =>
			option.setName('usuario')
				.setDescription('El usuario al que deseas silenciar de voz.')
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('duracion')
				.setDescription('Duración del silencio en segundos (mínimo 1, máximo 60).')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(60))
		.addStringOption(option =>
			option.setName('razon')
				.setDescription('La razón del silencio de voz.')
				.setRequired(false)), // Removido setDefaultMemberPermissions para que todos lo puedan intentar
	async execute(interaction) {
		const targetUser = interaction.options.getUser('usuario');
		const durationSeconds = interaction.options.getInteger('duracion');
		const reason = interaction.options.getString('razon') || 'Ninguna razón proporcionada';

		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			return interaction.reply({
				content: 'El usuario especificado no se encuentra en este servidor.',
				ephemeral: true,
			});
		}

		// Validamos si el bot tiene permisos para silenciar y ensordecer miembros
		const hasPermissions = interaction.guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers) && 
		                      interaction.guild.members.me.permissions.has(PermissionFlagsBits.DeafenMembers);

		if (!hasPermissions) {
			return interaction.reply({
				content: '❌ No tengo los permisos de voz requeridos en este servidor (Mute/Deafen Members).',
				ephemeral: true,
			});
		}

		// Validamos si el usuario objetivo es moderable (no se puede mutar a dueños)
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply({
				content: '❌ No puedo silenciar al dueño del servidor.',
				ephemeral: true,
			});
		}

		// --- RETO MATEMÁTICO ---
		const challenge = generateMathChallenge();

		// Generamos los botones con las opciones
		const row = new ActionRowBuilder().addComponents(
			challenge.options.map(option => 
				new ButtonBuilder()
					.setCustomId(`mute_ans_${option}_${interaction.id}`)
					.setLabel(option.toString())
					.setStyle(ButtonStyle.Primary)
			)
		);

		// Enviamos la pregunta de forma efímera
		const response = await interaction.reply({
			content: `🧠 **[PRUEBA DE HABILIDAD]** Resuelve el ejercicio en menos de **10 segundos** para silenciar de voz a **${targetUser.tag}**:\n\n${challenge.question}`,
			components: [row],
			ephemeral: true,
		});

		// Filtro para recibir clics solo de quien ejecutó el comando
		const collectorFilter = i => i.user.id === interaction.user.id;

		try {
			// Esperamos la interacción de los botones durante 10 segundos
			const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 10000 });
			
			// Extraemos la opción seleccionada
			const chosenAnswer = parseInt(confirmation.customId.split('_')[2]);

			if (chosenAnswer === challenge.correctAnswer) {
				// Respuesta correcta: procedemos con el silencio
				await confirmation.update({
					content: '✅ ¡Reto resuelto correctamente! Aplicando la sanción...',
					components: [],
				});

				const durationMs = durationSeconds * 1000;
				let currentlyInVoice = false;

				// Si el usuario está en canal de voz, silenciar de inmediato
				if (member.voice.channelId) {
					currentlyInVoice = true;
					try {
						await member.voice.setMute(true, `${reason} | Silenciado por ${interaction.user.tag}`);
					} catch (e) {
						console.warn('[WARN] No se pudo aplicar Server Mute:', e.message);
					}
					try {
						await member.voice.setDeaf(true, `${reason} | Silenciado por ${interaction.user.tag}`);
					} catch (e) {
						console.warn('[WARN] No se pudo aplicar Server Deafen:', e.message);
					}
				}

				// Registramos en persistencia
				addVoiceMute(interaction.client, member.id, interaction.guild.id, interaction.channelId, durationMs);

				// Creamos y enviamos el embed público
				const embed = new EmbedBuilder()
					.setColor('#ff4747')
					.setTitle('🔇 Silencio de Voz Aplicado')
					.setDescription(`Sanción de voz aplicada a **${targetUser.tag}** tras superar la prueba de habilidad.`)
					.addFields(
						{ name: '👤 Usuario', value: `<@${targetUser.id}>`, inline: true },
						{ name: '⏱️ Duración', value: `${durationSeconds} segundo(s)`, inline: true },
						{ name: '🎙️ Estado de Voz', value: currentlyInVoice ? '🟢 Silenciado en el canal actual' : '⏳ Pendiente (se aplicará al conectarse)', inline: false },
						{ name: '📄 Razón', value: reason },
						{ name: '🛡️ Ejecutado por', value: `<@${interaction.user.id}>` }
					)
					.setTimestamp();

				return interaction.followUp({ embeds: [embed] });
			} else {
				// Respuesta incorrecta
				return confirmation.update({
					content: `❌ **¡Respuesta Incorrecta!** El resultado era **${challenge.correctAnswer}**. Sanción cancelada.`,
					components: [],
				});
			}
		} catch (error) {
			// Tiempo agotado o error
			return interaction.editReply({
				content: '⏳ **¡Tiempo Agotado!** No lograste resolver el ejercicio a tiempo. Sanción cancelada.',
				components: [],
			});
		}
	},
};
