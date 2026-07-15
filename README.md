# CRONOBOT - Bot de Discord Modular

CRONOBOT es un bot interactivo de moderación, interacciones de voz y control lúdico de servidores de Discord en Node.js (con la librería `discord.js` v14).

El bot cuenta con un sistema de retos matemáticos rápidos mediante botones que restringe el uso de comandos de moderación y un Dashboard web integrado para monitorear las estadísticas de uso en tiempo real.

---

## 📋 Requisitos Iniciales

1. **Node.js** (Versión 18 o superior).
2. **Token de Bot y Client ID** obtenidos del [Discord Developer Portal](https://discord.com/developers/applications).
3. **Privileged Gateway Intents:** En la pestaña *Bot* del portal, asegúrate de activar **GuildVoiceStates** (y si deseas expandirlo en el futuro: *Presence Intent*, *Server Members Intent* y *Message Content Intent*).

---

## 🛠️ Instalación y Configuración Local

1. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
2. Duplica el archivo `.env.example` y renómbralo como `.env`. Configura las credenciales:
   ```env
   DISCORD_TOKEN=tu_token_aqui
   CLIENT_ID=tu_client_id_aqui
   GUILD_ID=tu_guild_id_de_pruebas_aqui
   PORT=3000
   DATABASE_URL=postgresql://postgres:password@host:5432/cronobot?sslmode=disable
   
   # Opcionales para voz IA (El Xokas)
   FISH_AUDIO_API_KEY=tu_api_key_aqui
   FISH_AUDIO_XOKAS_MODEL_ID=8f23453397d14e4d9a579bad5aab41a8
   FISH_AUDIO_MODEL=s2.1-pro-free
   ```
3. Registra los comandos de barra en la API de Discord:
   ```bash
   npm run deploy
   ```
4. Enciende el bot:
   ```bash
   npm start
   ```

---

## 🤖 Comandos Disponibles (Slash Commands)

*   **`/ping`:** Mide la latencia de respuesta del bot y la API de Discord.
*   **`/mute <usuario> <duracion_segundos> [razon]`:** Silencia y ensordece (Server Mute/Deafen) a un miembro en canales de voz por el tiempo seleccionado (máximo 60s, con reto de 10s).
*   **`/voiceblock <usuario> <canal> <duracion_segundos> [razon]`:** Bloquea temporalmente a un usuario para que no pueda entrar a un canal de voz específico (máximo 60s, con reto de 10s).
*   **`/creador`:** Muestra un embed estético con la información de contacto y tecnología del desarrollador (Diego Cumares / CRONOXT).
*   **`/decir <texto> [voz]`:** Conecta al bot a tu canal de voz actual y lee el texto usando voz de IA en español.
    *   *Opciones de voz:* **El Xokas (IA)** (por defecto si se configura la API Key) y **Google Translate** (clásica).
    *   *Cola de espera:* Si varios usuarios envían textos, el bot los lee en orden de llegada sin cortarse.
    *   *Inactividad:* Si la cola se vacía, se desconecta solo tras 10 segundos de inactividad.
*   **`/clearqueue`:** Vaciá la cola de espera de mensajes de voz y desconecta al bot del canal (restringido a moderadores con permisos de `Mute Members`).

---

## 🖥️ Dashboard Web (Express)

El bot integra un servidor web Express para mostrar estadísticas en tiempo real y logs de auditoría.

*   **Acceso local:** Abre tu navegador e ingresa a `http://localhost:3000`.
*   **Acceso en tu VPS (Contabo/Coolify):** Abre el puerto en tu firewall (`sudo ufw allow 3000/tcp`) e ingresa a `http://IP_DE_TU_VPS:3000`.
*   **Características:**
    *   Total de comandos ejecutados en el servidor.
    *   Uso de comandos representado en un gráfico de dona (Doughnut Chart) interactivo (Chart.js).
    *   Tabla superior con la **moderación de voz en vivo (sanciones activas)** mostrando avatares reales, servidores y cuentas regresivas segundo a segundo.
    *   Historial de auditoría con los últimos 20 comandos.
