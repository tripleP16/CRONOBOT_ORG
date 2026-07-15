const { Readable } = require('node:stream');
const googleTTS = require('google-tts-api');

// Servicio de TTS: Fish Audio (voz clonada de El Xokas) con Google Translate como respaldo.
const FISH_TTS_ENDPOINT = 'https://api.fish.audio/v1/tts';

// ID del modelo comunitario "xokas" en la librería pública de Fish Audio (https://fish.audio)
const DEFAULT_XOKAS_MODEL_ID = '8f23453397d14e4d9a579bad5aab41a8';

/**
 * Indica si la voz del Xokas está disponible (requiere API key de Fish Audio en el .env).
 */
function isXokasVoiceAvailable() {
	return Boolean(process.env.FISH_AUDIO_API_KEY);
}

/**
 * Genera el audio TTS con la voz del Xokas usando la API de Fish Audio.
 * Devuelve un stream de audio MP3 listo para pasar a createAudioResource.
 */
async function createXokasStream(text) {
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
				text,
				reference_id: process.env.FISH_AUDIO_XOKAS_MODEL_ID || DEFAULT_XOKAS_MODEL_ID,
				format: 'mp3',
				mp3_bitrate: 128,
				latency: 'balanced',
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
	isXokasVoiceAvailable,
	createXokasStream,
	getGoogleTTSUrl,
};
