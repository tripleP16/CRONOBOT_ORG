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
};

// Etiquetas de emoción soportadas por los modelos S2 de Fish Audio (van al inicio del texto)
// y ajuste sutil de velocidad para reforzar el tono.
const INTENSITY_PRESETS = {
	normal: { tag: '', speed: 1.0 },
	emocionado: { tag: '[excited]', speed: 1.1 },
	triste: { tag: '[sad]', speed: 0.9 },
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
 * @param {string} voice - Nombre de la voz ('xokas' o 'egirl').
 * @param {string} [intensity='normal'] - Intensidad: 'normal', 'emocionado' o 'triste'.
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

module.exports = {
	isFishVoiceAvailable,
	isFishVoice,
	createFishStream,
	getGoogleTTSUrl,
};
