const express = require('express');
const path = require('node:path');
const { getStats } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de API para obtener las estadísticas consolidadas
app.get('/api/stats', async (req, res) => {
	try {
		const stats = await getStats();
		res.json(stats);
	} catch (error) {
		console.error('[ERROR] Error al procesar estadísticas de API:', error);
		res.status(500).json({ error: 'Error interno del servidor' });
	}
});

// Función para iniciar el servidor web
function startWebServer() {
	app.listen(PORT, () => {
		console.log(`[EXITO] Dashboard web iniciado y disponible en el puerto ${PORT}`);
	});
}

module.exports = {
	startWebServer,
};
