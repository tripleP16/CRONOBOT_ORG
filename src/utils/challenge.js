/**
 * Módulo para generar desafíos matemáticos interactivos rápidos.
 */

// Genera un número aleatorio entre min y max (inclusive)
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Mezcla un array de forma aleatoria (Algoritmo Fisher-Yates)
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Genera un ejercicio matemático aleatorio de dificultad media-baja.
 * @returns {Object} { question: String, correctAnswer: Number, options: Array<Number> }
 */
function generateMathChallenge() {
	const x = getRandomInt(2, 9);
	const y = getRandomInt(2, 9);
	const z = getRandomInt(1, 15);
	
	const types = ['mul_add', 'mul_sub', 'add_mul', 'sub_mul'];
	const selectedType = types[getRandomInt(0, types.length - 1)];

	let questionText = '';
	let correctAnswer = 0;

	switch (selectedType) {
		case 'mul_add': // (X * Y) + Z
			questionText = `¿Cuánto es: **${x} × ${y} + ${z}**?`;
			correctAnswer = (x * y) + z;
			break;
		case 'mul_sub': // (X * Y) - Z
			questionText = `¿Cuánto es: **${x} × ${y} - ${z}**?`;
			correctAnswer = (x * y) - z;
			break;
		case 'add_mul': // Z + (X * Y)
			questionText = `¿Cuánto es: **${z} + ${x} × ${y}**?`;
			correctAnswer = z + (x * y);
			break;
		case 'sub_mul': // (X * y) - Z (alternativo para no dar negativo fácil)
			const largeZ = getRandomInt(x * y + 1, x * y + 15);
			questionText = `¿Cuánto es: **${largeZ} - ${x} × ${y}**?`;
			correctAnswer = largeZ - (x * y);
			break;
	}

	// Generamos respuestas incorrectas creíbles (cercanas al resultado real)
	const incorrectOptions = new Set();
	while (incorrectOptions.size < 2) {
		// Variación aleatoria entre -5 y +5 (excluyendo 0)
		const variance = getRandomInt(-5, 5);
		if (variance !== 0) {
			const fakeAnswer = correctAnswer + variance;
			incorrectOptions.add(fakeAnswer);
		}
	}

	// Mezclamos las opciones
	const options = shuffle([correctAnswer, ...incorrectOptions]);

	return {
		question: questionText,
		correctAnswer: correctAnswer,
		options: options,
	};
}

module.exports = {
	generateMathChallenge,
};
