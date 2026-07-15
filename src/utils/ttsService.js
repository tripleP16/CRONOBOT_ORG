const { Readable } = require('node:stream');
const googleTTS = require('google-tts-api');

// Servicio de TTS: Fish Audio (voces clonadas por IA) con Google Translate como respaldo.
const FISH_TTS_ENDPOINT = 'https://api.fish.audio/v1/tts';

// IDs de los modelos comunitarios en la librería pública de Fish Audio (https://fish.audio)
const FISH_VOICE_MODELS = {
	// Voz clonada de El Xokas
	xokas: () => process.env.FISH_AUDIO_XOKAS_MODEL_ID || '8f23453397d14e4d9a579bad5aab41a8',
	// Voz femenina "e-girl" en español (modelo comunitario "Chica Sexy LMO")
	egirl: () => process.env.FISH_AUDIO_EGIRL_MODEL_ID || '03cfefd0ad67452c8d291d0ae4605273',
	// E-girl coqueta y expresiva (modelo comunitario "voz chica sexy")
	coqueta: () => process.env.FISH_AUDIO_COQUETA_MODEL_ID || 'e1f3701f614040539f531c7c1c7ed0fb',
	// E-girl susurrante estilo ASMR (modelo comunitario "tifani sexy")
	tifani: () => process.env.FISH_AUDIO_TIFANI_MODEL_ID || '6e7e70b4befd4df4b2314069b2ee92ec',
	// E-girl de tono suave e íntimo (modelo comunitario "Seductora")
	seductora: () => process.env.FISH_AUDIO_SEDUCTORA_MODEL_ID || '5f7d136576e8467ca911b66f2ae16ac7',
	// Voz clonada de Dalas Review (modelo comunitario "Dalas Review")
	dalas: () => process.env.FISH_AUDIO_DALAS_MODEL_ID || '7b1f244402da4b04889bf7e7830c8af5',
	// Voz clonada de Hugo Chávez (modelo comunitario "Hugo Chavez (ExPresidente de Venezuela)")
	chavez: () => process.env.FISH_AUDIO_CHAVEZ_MODEL_ID || '1ae468b5d7854319a106af33198feed1',
};

// Etiquetas de emoción soportadas por los modelos S2 de Fish Audio (van al inicio del texto)
// y ajuste sutil de velocidad para reforzar el tono.
const INTENSITY_PRESETS = {
	normal: { tag: '', speed: 1.0 },
	emocionado: { tag: '[excited]', speed: 1.1 },
	triste: { tag: '[sad]', speed: 0.9 },
	// Emoción + marcador de entrega combinados: enfadado y a gritos
	cabreado: { tag: '[angry][shouting]', speed: 1.1 },
};

/**
 * Indica si las voces de IA están disponibles (requiere API key de Fish Audio en el .env).
 */
function isFishVoiceAvailable() {
	return Boolean(process.env.FISH_AUDIO_API_KEY);
}

/**
 * Indica si el nombre de voz corresponde a una voz de IA de Fish Audio.
 */
function isFishVoice(voice) {
	return Object.prototype.hasOwnProperty.call(FISH_VOICE_MODELS, voice);
}

/**
 * Genera el audio TTS con una voz de IA usando la API de Fish Audio.
 * @param {string} text - Texto a sintetizar.
 * @param {string} voice - Nombre de la voz (cualquier clave de FISH_VOICE_MODELS).
 * @param {string} [intensity='normal'] - Intensidad: 'normal', 'emocionado', 'triste' o 'cabreado'.
 * Devuelve un stream de audio MP3 listo para pasar a createAudioResource.
 */
async function createFishStream(text, voice, intensity = 'normal') {
	if (!isFishVoice(voice)) {
		throw new Error(`Voz de IA desconocida: ${voice}`);
	}

	const preset = INTENSITY_PRESETS[intensity] || INTENSITY_PRESETS.normal;
	const finalText = preset.tag ? `${preset.tag} ${text}` : text;

	const controller = new AbortController();
	// Abortamos si Fish Audio no empieza a responder en 20 segundos
	const timeout = setTimeout(() => controller.abort(), 20000);

	let response;
	try {
		response = await fetch(FISH_TTS_ENDPOINT, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
				'Content-Type': 'application/json',
				'model': process.env.FISH_AUDIO_MODEL || 's2.1-pro',
			},
			body: JSON.stringify({
				text: finalText,
				reference_id: FISH_VOICE_MODELS[voice](),
				format: 'mp3',
				mp3_bitrate: 128,
				latency: 'balanced',
				prosody: { speed: preset.speed, volume: 0 },
			}),
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok || !response.body) {
		const detail = await response.text().catch(() => '');
		throw new Error(`Fish Audio respondió con estado ${response.status}: ${detail.slice(0, 200)}`);
	}

	return Readable.fromWeb(response.body);
}

/**
 * Genera la URL del audio TTS clásico de Google Translate.
 */
function getGoogleTTSUrl(text) {
	return googleTTS.getAudioUrl(text, {
		lang: 'es',
		slow: false,
		host: 'https://translate.google.com',
		timeout: 10000,
	});
}

/**
 * Punto de entrada único para el gestor de colas de voz: genera el audio para
 * cualquier voz soportada, con respaldo automático a Google Translate si la
 * voz de IA falla o no está configurada.
 * @param {string} text - Texto a sintetizar.
 * @param {string} voiceOption - Voz solicitada (clave de FISH_VOICE_MODELS o 'google').
 * @param {string} [intensity='normal'] - Intensidad: 'normal', 'emocionado', 'triste' o 'cabreado' (solo voces de IA).
 * @returns {Promise<{streamOrUrl: (import('node:stream').Readable|string), voiceUsed: string}>}
 */
async function getAudioStream(text, voiceOption, intensity = 'normal') {
	if (isFishVoice(voiceOption) && isFishVoiceAvailable()) {
		try {
			const stream = await createFishStream(text, voiceOption, intensity);
			return { streamOrUrl: stream, voiceUsed: voiceOption };
		} catch (fishError) {
			console.error('[ERROR] Fish Audio falló, usando voz de Google como respaldo:', fishError.message);
		}
	}
	return { streamOrUrl: getGoogleTTSUrl(text), voiceUsed: 'google' };
}

module.exports = {
	isFishVoiceAvailable,
	isFishVoice,
	createFishStream,
	getGoogleTTSUrl,
	getAudioStream,
};
