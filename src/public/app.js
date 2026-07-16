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
	const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
	localStorage.setItem('theme', theme);
	
	// Actualizamos los colores de las fuentes del gráfico si está instanciado
	if (myChart) {
		const isLight = theme === 'light';
		myChart.options.plugins.legend.labels.color = isLight ? '#0f172a' : '#94a3b8';
		myChart.update();
	}
});


// ==========================================================================
// LÓGICA DE GRÁFICOS (CHART.JS)
// ==========================================================================
let myChart = null;

function renderChart(commandStats) {
	const ctx = document.getElementById('commandsChart').getContext('2d');
	
	const labels = commandStats.map(s => `/${s.name}`);
	const dataValues = commandStats.map(s => s.count);
	
	// Paleta de colores premium acorde al tema del bot
	const backgroundColors = commandStats.map(s => {
		switch (s.name) {
			case 'ping': return 'rgba(56, 189, 248, 0.6)';       // Celeste
			case 'mute': return 'rgba(248, 113, 113, 0.6)';       // Rojo
			case 'voiceblock': return 'rgba(251, 146, 60, 0.6)'; // Naranja
			case 'creador': return 'rgba(192, 132, 252, 0.6)';   // Morado
			default: return 'rgba(148, 163, 184, 0.6)';          // Gris
		}
	});

	const borderColors = commandStats.map(s => {
		switch (s.name) {
			case 'ping': return '#38bdf8';
			case 'mute': return '#f87171';
			case 'voiceblock': return '#fb923c';
			case 'creador': return '#c084fc';
			default: return '#94a3b8';
		}
	});

	const isLight = document.body.classList.contains('light-theme');

	if (myChart) {
		// Actualización de datos del gráfico existente sin recrear el objeto (evita parpadeos)
		myChart.data.labels = labels;
		myChart.data.datasets[0].data = dataValues;
		myChart.data.datasets[0].backgroundColor = backgroundColors;
		myChart.data.datasets[0].borderColor = borderColors;
		myChart.options.plugins.legend.labels.color = isLight ? '#0f172a' : '#94a3b8';
		myChart.update();
	} else {
		// Crear el gráfico por primera vez
		myChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: labels,
				datasets: [{
					data: dataValues,
					backgroundColor: backgroundColors,
					borderColor: borderColors,
					borderWidth: 1.5,
					hoverOffset: 15
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'right',
						labels: {
							color: isLight ? '#0f172a' : '#94a3b8',
							font: {
								family: 'Outfit',
								size: 13,
								weight: '500'
							},
							padding: 15
						}
					},
					tooltip: {
						backgroundColor: 'rgba(15, 23, 42, 0.95)',
						titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
						bodyFont: { family: 'Outfit', size: 13 },
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1
					}
				},
				cutout: '65%'
			}
		});
	}
}


// ==========================================================================
// CONSUMO DE LA API Y ACTUALIZACIÓN DE DATOS (DASHBOARD REALTIME)
// ==========================================================================

// Realiza la petición de estadísticas generales
async function fetchStats() {
	try {
		const response = await fetch('/api/stats');
		if (!response.ok) throw new Error('Error al obtener estadísticas de la API');
		
		const data = await response.json();
		updateDashboardStats(data);
	} catch (error) {
		console.error('[DASHBOARD ERROR]', error);
		setOfflineStatus();
	}
}

// Almacén en memoria de las sanciones para poder hacer la cuenta regresiva fluida en local
let activeSanctions = [];

// Realiza la petición de sanciones activas
async function fetchActiveSanctions() {
	try {
		const response = await fetch('/api/active-sanctions');
		if (!response.ok) throw new Error('Error al obtener sanciones de la API');
		
		activeSanctions = await response.json();
		renderActiveSanctions();
	} catch (error) {
		console.error('[SANCTIONS FETCH ERROR]', error);
		setOfflineStatus();
	}
}

// Pone el indicador del sidebar en rojo por desconexión de API
function setOfflineStatus() {
	const indicator = document.querySelector('.status-indicator');
	const statusText = document.querySelector('.status-text');
	if (indicator && statusText) {
		indicator.style.backgroundColor = '#ef4444';
		indicator.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
		statusText.textContent = 'Error API';
		statusText.style.color = '#ef4444';
	}
}

// Restaura el indicador del sidebar a conectado
function setOnlineStatus() {
	const indicator = document.querySelector('.status-indicator');
	const statusText = document.querySelector('.status-text');
	if (indicator && statusText) {
		indicator.style.backgroundColor = '#10b981';
		indicator.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
		statusText.textContent = 'Bot Activo';
		statusText.style.color = '#10b981';
	}
}

// Actualiza los contadores de texto y las tablas estáticas
function updateDashboardStats(data) {
	setOnlineStatus();

	// 1. Tarjetas Superiores
	document.getElementById('total-commands').textContent = data.totalExecutions;

	// Total de frases guardadas
	const totalQuotesElement = document.getElementById('total-quotes');
	if (totalQuotesElement) {
		totalQuotesElement.textContent = data.totalQuotes || 0;
	}

	// Servidores en caché
	const uniqueGuilds = new Set(data.recentLogs.map(log => log.guildId).filter(id => id && id !== 'Mensaje Privado'));
	document.getElementById('servers-count').textContent = Math.max(1, uniqueGuilds.size);

	// 2. Desglose de Voces e Indicador Superior
	const voiceContainer = document.getElementById('voice-stats-container');
	if (voiceContainer) {
		voiceContainer.innerHTML = '';
		if (!data.voiceStats || data.voiceStats.length === 0) {
			voiceContainer.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 5px;">No se han ejecutado comandos de voz todavía.</div>';
			document.getElementById('top-voice').textContent = 'Ninguna (0)';
		} else {
			// Seteamos la voz favorita en la tarjeta métrica
			const topVoice = data.voiceStats[0];
			document.getElementById('top-voice').innerHTML = `${topVoice.voice} <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: normal;">(${topVoice.count})</span>`;

			// Calculamos el total de ejecuciones de voz para porcentaje
			const totalVoiceUses = data.voiceStats.reduce((sum, item) => sum + item.count, 0);

			data.voiceStats.forEach(item => {
				const pct = totalVoiceUses > 0 ? Math.round((item.count / totalVoiceUses) * 100) : 0;
				// Color de acento según la voz
				const isXokas = item.voice.includes('Xokas');
				const barColor = isXokas ? 'var(--accent-color)' : 'var(--text-secondary)';
				const icon = isXokas ? '🎙️' : '🗣️';

				const barHtml = `
					<div style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 4px;">
						<div style="display: flex; justify-content: space-between; font-weight: 500;">
							<span>${icon} ${item.voice}</span>
							<span>${item.count} usos (${pct}%)</span>
						</div>
						<div style="background-color: var(--progress-bg); height: 6px; border-radius: 4px; overflow: hidden; width: 100%;">
							<div style="background-color: ${barColor}; width: ${pct}%; height: 100%; border-radius: 4px; transition: width 0.6s ease;"></div>
						</div>
					</div>
				`;
				const wrapper = document.createElement('div');
				wrapper.innerHTML = barHtml;
				voiceContainer.appendChild(wrapper.firstElementChild);
			});
		}
	}

	// 3. Renderizar Gráfico de Donas
	renderChart(data.commandStats);

	// 4. Tabla de Top Usuarios
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

	// 5. Logs Recientes de Auditoría
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

// Dibuja la lista de sanciones activas en pantalla
function renderActiveSanctions() {
	const tableBody = document.querySelector('#sanctions-table tbody');
	tableBody.innerHTML = '';

	// Filtramos solo las que siguen activas
	const now = Date.now();
	const active = activeSanctions.filter(s => s.endsAt > now);

	if (active.length === 0) {
		tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">🕊️ Ninguna sanción de voz activa en este momento. ¡El servidor está en paz!</td></tr>';
		return;
	}

	active.forEach(s => {
		const tr = document.createElement('tr');
		const timeLeftSeconds = Math.max(0, Math.ceil((s.endsAt - now) / 1000));
		
		// Generar celda del usuario (Avatar + Tag)
		let avatarHtml = `<div class="user-default-avatar">${s.username.charAt(0).toUpperCase()}</div>`;
		if (s.avatar) {
			avatarHtml = `<img class="user-avatar" src="${s.avatar}" alt="${s.username}">`;
		}

		tr.innerHTML = `
			<td>
				<div class="user-cell">
					${avatarHtml}
					<span style="font-weight: 600;">${s.username}</span>
				</div>
			</td>
			<td>
				<span class="cmd-badge ${s.type.startsWith('Silencio') ? 'cmd-mute' : 'cmd-voiceblock'}">${s.type}</span>
			</td>
			<td>
				<span class="countdown-badge" data-ends-at="${s.endsAt}">${timeLeftSeconds}s restantes</span>
			</td>
			<td style="color: var(--text-secondary); font-size: 0.85rem;">
				ID: ${s.guildId.substring(0, 8)}...
			</td>
		`;
		tableBody.appendChild(tr);
	});
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

// Bucle secundario rápido para que los cronómetros regresivos bajen fluidamente segundo a segundo (1s)
setInterval(() => {
	const now = Date.now();
	let needsRefresh = false;

	document.querySelectorAll('.countdown-badge').forEach(badge => {
		const endsAt = parseInt(badge.getAttribute('data-ends-at'));
		const timeLeftSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
		
		if (timeLeftSeconds <= 0) {
			needsRefresh = true; // Si una sanción expira en pantalla, forzamos un redibujado
			badge.textContent = 'Expirado';
			badge.style.color = '#10b981';
			badge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
			badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
		} else {
			badge.textContent = `${timeLeftSeconds}s restantes`;
		}
	});

	if (needsRefresh) {
		// Refrescamos de inmediato las sanciones de la base de datos
		fetchActiveSanctions();
	}
}, 1000);

// Cargas iniciales y auto-refresh periódicos
fetchStats();
fetchActiveSanctions();

// Intervalos de consulta a la API
setInterval(fetchStats, 3000);          // Estadísticas generales cada 3s
setInterval(fetchActiveSanctions, 3000); // Sanciones desde Postgres cada 3s
