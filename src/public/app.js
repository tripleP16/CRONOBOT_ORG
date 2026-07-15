// Función para realizar fetch de las estadísticas y actualizar la UI
async function fetchStats() {
	try {
		const response = await fetch('/api/stats');
		if (!response.ok) throw new Error('Error al obtener estadísticas de la API');
		
		const data = await response.json();
		updateDashboard(data);
	} catch (error) {
		console.error('[DASHBOARD ERROR]', error);
		// Actualizar el estado a Desconectado en el header si falla la API
		document.querySelector('.status-indicator').style.backgroundColor = '#ef4444';
		document.querySelector('.status-indicator').style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
		document.querySelector('.status-text').textContent = 'Error de API';
		document.querySelector('.status-text').style.color = '#ef4444';
		document.querySelector('.header-status').style.borderColor = 'rgba(239, 68, 68, 0.2)';
		document.querySelector('.header-status').style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
	}
}

// Función principal para poblar los elementos del DOM con los datos recibidos
function updateDashboard(data) {
	// Restaurar estado a Conectado en el header
	document.querySelector('.status-indicator').style.backgroundColor = '#10b981';
	document.querySelector('.status-indicator').style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
	document.querySelector('.status-text').textContent = 'Bot En Línea';
	document.querySelector('.status-text').style.color = '#10b981';
	document.querySelector('.header-status').style.borderColor = 'rgba(16, 185, 129, 0.2)';
	document.querySelector('.header-status').style.backgroundColor = 'rgba(16, 185, 129, 0.08)';

	// 1. Tarjetas Superiores
	document.getElementById('total-commands').textContent = data.totalExecutions;

	// Obtenemos los servidores únicos de los logs
	const uniqueGuilds = new Set(data.recentLogs.map(log => log.guildId).filter(id => id && id !== 'Mensaje Privado'));
	document.getElementById('servers-count').textContent = Math.max(1, uniqueGuilds.size);

	// 2. Tabla de Comandos Más Usados
	const commandsTableBody = document.querySelector('#commands-table tbody');
	commandsTableBody.innerHTML = '';
	
	if (data.commandStats.length === 0) {
		commandsTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">Ningún comando ejecutado todavía</td></tr>';
	} else {
		data.commandStats.forEach(stat => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td><span class="cmd-badge ${getCmdBadgeClass(stat.name)}">/${stat.name}</span></td>
				<td style="font-weight: 600;">${stat.count}</td>
			`;
			commandsTableBody.appendChild(tr);
		});
	}

	// 3. Tabla de Top Usuarios
	const usersTableBody = document.querySelector('#users-table tbody');
	usersTableBody.innerHTML = '';

	if (data.topUsers.length === 0) {
		usersTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">Ningún usuario activo todavía</td></tr>';
	} else {
		data.topUsers.forEach(user => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>👤 ${user.username}</td>
				<td style="font-weight: 600;">${user.count}</td>
			`;
			usersTableBody.appendChild(tr);
		});
	}

	// 4. Tabla de Logs de Ejecuciones Recientes
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
