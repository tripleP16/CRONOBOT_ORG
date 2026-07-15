// ==========================================================================
// CONTROL DE CAMBIO DE TEMA CLARO / OSCURO (THEME SWITCHER)
// ==========================================================================
const themeToggleBtn = document.getElementById('theme-toggle');

// Cargar la preferencia guardada en localStorage
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
	document.body.classList.add('light-theme');
}

// Escuchador de clic para alternar el tema
themeToggleBtn.addEventListener('click', () => {
	document.body.classList.toggle('light-theme');
	
	// Guardar la elección del usuario
	const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
	localStorage.setItem('theme', theme);
});


// ==========================================================================
// CONSUMO DE LA API Y ACTUALIZACIÓN DE DATOS (DASHBOARD REALTIME)
// ==========================================================================

// Realiza la petición de datos periódicamente
async function fetchStats() {
	try {
		const response = await fetch('/api/stats');
		if (!response.ok) throw new Error('Error al obtener estadísticas de la API');
		
		const data = await response.json();
		updateDashboard(data);
	} catch (error) {
		console.error('[DASHBOARD ERROR]', error);
		
		// Indicador de error visual en el sidebar
		const indicator = document.querySelector('.status-indicator');
		const statusText = document.querySelector('.status-text');
		if (indicator && statusText) {
			indicator.style.backgroundColor = '#ef4444';
			indicator.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
			statusText.textContent = 'Error API';
			statusText.style.color = '#ef4444';
		}
	}
}

// Actualiza el contenido HTML con los datos de la API
function updateDashboard(data) {
	// Restaurar estado a Conectado en el sidebar
	const indicator = document.querySelector('.status-indicator');
	const statusText = document.querySelector('.status-text');
	if (indicator && statusText) {
		indicator.style.backgroundColor = '#10b981';
		indicator.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
		statusText.textContent = 'Bot Activo';
		statusText.style.color = '#10b981';
	}

	// 1. Contadores y tarjetas superiores
	document.getElementById('total-commands').textContent = data.totalExecutions;

	// Servidores en caché
	const uniqueGuilds = new Set(data.recentLogs.map(log => log.guildId).filter(id => id && id !== 'Mensaje Privado'));
	document.getElementById('servers-count').textContent = Math.max(1, uniqueGuilds.size);

	// 2. Comandos Más Usados
	const commandsTableBody = document.querySelector('#commands-table tbody');
	commandsTableBody.innerHTML = '';
	
	if (data.commandStats.length === 0) {
		commandsTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">Ningún comando registrado todavía</td></tr>';
	} else {
		// Buscamos el conteo máximo de ejecuciones para calcular proporciones
		const maxCount = Math.max(...data.commandStats.map(s => s.count));

		data.commandStats.forEach(stat => {
			const percentage = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td><span class="cmd-badge ${getCmdBadgeClass(stat.name)}">/${stat.name}</span></td>
				<td>
					<div class="cmd-cell">
						<span style="font-weight: 700; min-width: 20px;">${stat.count}</span>
						<div class="progress-container">
							<div class="progress-bar" style="width: ${percentage}%;"></div>
						</div>
					</div>
				</td>
			`;
			commandsTableBody.appendChild(tr);
		});
	}

	// 3. Top Usuarios Activos
	const usersTableBody = document.querySelector('#users-table tbody');
	usersTableBody.innerHTML = '';

	if (data.topUsers.length === 0) {
		usersTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">Ningún usuario activo todavía</td></tr>';
	} else {
		data.topUsers.forEach(user => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>👤 ${user.username}</td>
				<td style="font-weight: 700; text-align: right;">${user.count}</td>
			`;
			usersTableBody.appendChild(tr);
		});
	}

	// 4. Logs Recientes de Auditoría
	const logsTableBody = document.querySelector('#logs-table tbody');
	logsTableBody.innerHTML = '';

	if (data.recentLogs.length === 0) {
		logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">El historial está vacío</td></tr>';
	} else {
		data.recentLogs.forEach(log => {
			const tr = document.createElement('tr');
			const timeFormatted = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
			tr.innerHTML = `
				<td style="color: var(--text-secondary); font-size: 0.85rem;">${timeFormatted}</td>
				<td style="font-weight: 500;">${log.username}</td>
				<td><span class="cmd-badge ${getCmdBadgeClass(log.commandName)}">/${log.commandName}</span></td>
				<td style="color: var(--text-secondary); font-size: 0.85rem;">🏠 ${log.guildName}</td>
			`;
			logsTableBody.appendChild(tr);
		});
	}
}

// Devuelve la clase del badge para cambiar de color según el comando
function getCmdBadgeClass(commandName) {
	switch (commandName) {
		case 'ping': return 'cmd-ping';
		case 'mute': return 'cmd-mute';
		case 'voiceblock': return 'cmd-voiceblock';
		case 'creador': return 'cmd-creador';
		default: return 'cmd-other';
	}
}

// Carga inicial y auto-refresh cada 3 segundos
fetchStats();
setInterval(fetchStats, 3000);
