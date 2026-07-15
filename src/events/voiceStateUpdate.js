const { Events } = require('discord.js');
const { isUserVoiceMuted } = require('../utils/voiceMuteManager');
const { isUserVoiceBlocked } = require('../utils/voiceBlockManager');

module.exports = {
	name: Events.VoiceStateUpdate,
	once: false,
	async execute(oldState, newState) {
		const member = newState.member;
		if (!member || member.user.bot) return;

		const guildId = newState.guild.id;
		const userId = member.id;

		// Si el usuario se ha conectado a un canal de voz (channelId no es nulo)
		if (newState.channelId) {
			// 1. Verificamos si el canal al que intenta entrar está bloqueado para este usuario
			if (isUserVoiceBlocked(userId, guildId, newState.channelId)) {
				try {
					await newState.disconnect('Acceso a canal de voz bloqueado temporalmente');
					console.log(`[INFO] Usuario ${member.user.tag} expulsado del canal bloqueado ${newState.channelId}.`);
					return; // Detenemos la ejecución aquí ya que fue desconectado
				} catch (error) {
					console.warn(`[WARN] No se pudo desconectar al usuario del canal bloqueado: ${error.message}`);
				}
			}

			// 2. Comprobamos si el usuario tiene una sanción de silencio de voz activa
			if (isUserVoiceMuted(userId, guildId)) {
				
				// Si no está ya silenciado o ensordecido por el servidor, aplicamos la restricción
				if (!newState.serverMute || !newState.serverDeaf) {
					try {
						await newState.setMute(true, 'Silencio de voz activo (reconexión)');
					} catch (error) {
						console.warn(`[WARN] No se pudo silenciar automáticamente a ${member.user.tag}: ${error.message}`);
					}

					try {
						await newState.setDeaf(true, 'Ensordecimiento de voz activo (reconexión)');
					} catch (error) {
						console.warn(`[WARN] No se pudo ensordecer automáticamente a ${member.user.tag}: ${error.message}`);
					}
					
					console.log(`[INFO] Restricciones automáticas de voz procesadas para ${member.user.tag}.`);
				}
			}
		}
	},
};
