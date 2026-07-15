const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addVoiceBlock } = require('../../utils/voiceBlockManager');
const { generateMathChallenge } = require('../../utils/challenge');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('voiceblock')
		.setDescription('Bloquea a un usuario de un canal de voz (requiere resolver un reto de 10s).')
		.addUserOption(option =>
			option.setName('usuario')
				.setDescription('El usuario que deseas bloquear del canal.')
				.setRequired(true))
		.addChannelOption(option =>
			option.setName('canal')
				.setDescription('El canal de voz al que quieres bloquearle el acceso.')
				.addChannelTypes(ChannelType.GuildVoice)
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('duracion')
				.setDescription('Duración del bloqueo en segundos (mínimo 1, máximo 60).')
				.setRequired(true)
				.setMinValue(1)
				.setMaxValue(60))
		.addStringOption(option =>
			option.setName('razon')
				.setDescription('La razón del bloqueo de canal.')
				.setRequired(false)), // Removido setDefaultMemberPermissions para acceso general
	async execute(interaction) {
		const targetUser = interaction.options.getUser('usuario');
		const targetChannel = interaction.options.getChannel('canal');
		const durationSeconds = interaction.options.getInteger('duracion');
		const reason = interaction.options.getString('razon') || 'Ninguna razón proporcionada';

		const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

		if (!member) {
			return interaction.reply({
				content: 'El usuario especificado no se encuentra en este servidor.',
				ephemeral: true,
			});
		}

		// Validamos si el bot tiene permisos para mover miembros (necesario para desconectarlos)
		if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
			return interaction.reply({
				content: '❌ No tengo el permiso **Move Members (Mover miembros)** requerido para desconectar usuarios.',
				ephemeral: true,
			});
		}

		// Validamos si el usuario objetivo es moderable
		if (member.id === interaction.guild.ownerId) {
			return interaction.reply({
				content: '❌ No puedo aplicar bloqueos al dueño del servidor.',
				ephemeral: true,
			});
		}

		// --- RETO MATEMÁTICO ---
		const challenge = generateMathChallenge();

		// Generamos los botones
		const row = new ActionRowBuilder().addComponents(
			challenge.options.map(option => 
				new ButtonBuilder()
					.setCustomId(`block_ans_${option}_${interaction.id}`)
					.setLabel(option.toString())
					.setStyle(ButtonStyle.Primary)
			)
		);

		// Enviamos la pregunta de forma efímera
		const response = await interaction.reply({
			content: `🧠 **[PRUEBA DE HABILIDAD]** Resuelve el ejercicio en menos de **10 segundos** para bloquear del canal a **${targetUser.tag}**:\n\n${challenge.question}`,
			components: [row],
			ephemeral: true,
		});

		// Filtro para recibir clics solo de quien ejecutó el comando
		const collectorFilter = i => i.user.id === interaction.user.id;

		try {
			// Esperamos la respuesta durante 10 segundos
			const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 10000 });
			
			// Extraemos la respuesta elegida
			const chosenAnswer = parseInt(confirmation.customId.split('_')[2]);

			if (chosenAnswer === challenge.correctAnswer) {
				// Respuesta correcta: procedemos
				await confirmation.update({
					content: '✅ ¡Reto resuelto correctamente! Aplicando el bloqueo...',
					components: [],
				});

				const durationMs = durationSeconds * 1000;
				let disconnectedImmediately = false;

				// Si el usuario está conectado al canal de voz específico que queremos bloquear
				if (member.voice.channelId === targetChannel.id) {
					try {
						await member.voice.disconnect(`${reason} | Bloqueado de canal por ${interaction.user.tag}`);
						disconnectedImmediately = true;
					} catch (error) {
						console.error('[ERROR] Error al desconectar en voiceblock:', error);
						return interaction.followUp({
							content: '❌ Hubo un error al intentar desconectar al usuario. Revisa la jerarquía de roles.',
							ephemeral: true,
						});
					}
				}

				// Registramos el bloqueo
				addVoiceBlock(interaction.client, member.id, interaction.guild.id, targetChannel.id, interaction.channelId, durationMs);

				// Creamos y enviamos el embed público
				const embed = new EmbedBuilder()
					.setColor('#ff9900')
					.setTitle('🚫 Acceso a Canal de Voz Bloqueado')
					.setDescription(`Se ha bloqueado el acceso al canal de voz a **${targetUser.tag}** tras superar la prueba de habilidad.`)
					.addFields(
						{ name: '👤 Usuario', value: `<@${targetUser.id}>`, inline: true },
						{ name: '🔊 Canal de Voz', value: `<#${targetChannel.id}>`, inline: true },
						{ name: '⏱️ Duración', value: `${durationSeconds} segundo(s)`, inline: true },
						{ name: '🎙️ Estado Actual', value: disconnectedImmediately ? '💥 Expulsado inmediatamente del canal' : '⏳ Pendiente (será expulsado si intenta unirse)', inline: false },
						{ name: '📄 Razón', value: reason },
						{ name: '🛡️ Ejecutado por', value: `<@${interaction.user.id}>` }
					)
					.setTimestamp();

				return interaction.followUp({ embeds: [embed] });
			} else {
				// Respuesta incorrecta
				return confirmation.update({
					content: `❌ **¡Respuesta Incorrecta!** El resultado era **${challenge.correctAnswer}**. Acción cancelada.`,
					components: [],
				});
			}
		} catch (error) {
			// Tiempo agotado
			return interaction.editReply({
				content: '⏳ **¡Tiempo Agotado!** No lograste resolver el ejercicio a tiempo. Acción cancelada.',
				components: [],
			});
		}
	},
};
