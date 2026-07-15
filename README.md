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

Todos los usuarios pueden ver e intentar ejecutar los comandos, pero para que se apliquen deberán resolver un reto matemático de selección múltiple mediante botones en menos de **10 segundos**:

*   **`/ping`:** Mide la latencia de respuesta del bot y la API de Discord.
*   **`/mute <usuario> <duracion_segundos> [razon]`:** Silencia y ensordece (Server Mute/Deafen) a un miembro en canales de voz por el tiempo seleccionado (máximo 60s). Al expirar, le devuelve la voz de forma automática.
*   **`/voiceblock <usuario> <canal> <duracion_segundos> [razon]`:** Bloquea temporalmente a un usuario para que no pueda entrar a un canal de voz específico (máximo 60s). Si intenta unirse, el bot lo desconectará de inmediato.
*   **`/creador`:** Muestra un embed estético con la información de contacto y tecnología del desarrollador (Diego Cumares / CRONOXT).

---

## 🖥️ Dashboard Web (Express)

El bot integra un servidor web Express para mostrar estadísticas en tiempo real y logs de auditoría.

*   **Acceso local:** Abre tu navegador e ingresa a `http://localhost:3000`.
*   **Acceso en tu VPS (Contabo):** Abre el puerto en tu firewall (`sudo ufw allow 3000/tcp`) e ingresa a `http://IP_DE_TU_VPS:3000`.
*   **Características:**
    *   Total de comandos ejecutados en el servidor.
    *   Frecuencia de uso por comando y top de usuarios activos.
    *   Historial de los últimos 20 logs de comandos (auto-actualizado cada 3 segundos).
