# 🤖 CRONOBOT - Bot de Discord Modular

CRONOBOT es una solución integral y premium para la automatización, moderación de voz, interacciones mediante síntesis de voz (TTS) con IA y monitoreo analítico en servidores de Discord. Desarrollado en **Node.js** utilizando la librería oficial `discord.js` v14 y persistencia robusta sobre **PostgreSQL**.

El bot destaca por incorporar un **Dashboard Web en tiempo real** (Express) que visualiza estadísticas con gráficos interactivos y gestiona sanciones activas, además de un comando de voz con IA clonada y un sistema de moderación protegido por minijuegos de habilidad matemática.

---

## 📋 Características Principales

*   **Moderación Gamificada:** Comandos de moderación (`/mute` y `/voiceblock`) condicionados a resolver un reto matemático de habilidad rápida (10 segundos) antes de aplicarse.
*   **Audio TTS con Cola & Robustez:** Comandos de síntesis de voz en tiempo real con sistema de colas secuenciales por servidor, control inteligente contra expulsiones forzadas y desconexión por inactividad (10 segundos).
*   **Voces de IA Clonadas:** Integración con la API de **Fish Audio** para reproducir las voces de **El Xokas**, **AriGameplays**, **El Rubius**, **Dalas Review**, **Hugo Chávez** y cuatro **E-girls** (Clásica, Coqueta, Tifani ASMR y Seductora), con intensidades de tono (Normal/Emocionado/Triste/Cabreado a gritos/Cachondo susurrante) y fallback automático a Google Translate en caso de desconexión o falta de créditos.
*   **Dashboard Web Premium (SaaS Layout):**
    *   **Dashboard interactivo** con selector de tema claro/oscuro persistente (guardado en `localStorage`).
    *   **Moderación en Vivo:** Visualización de sanciones activas de voz con nombres de usuario resueltos por la API de Discord, fotos de perfil (avatares) y temporizadores dinámicos de cuenta regresiva en segundos reales.
    *   **Analíticas:** Gráfico de dona interactivo (Chart.js) que representa el volumen y popularidad de comandos ejecutados.
    *   **Auditoría:** Historial reciente de los últimos 20 comandos almacenados de forma permanente en PostgreSQL.

---

## 🛠️ Arquitectura y Tecnologías

*   **Motor Principal:** Node.js (v18+) & Discord.js v14.
*   **Base de Datos:** PostgreSQL (almacenamiento persistente de logs de comandos y estados de sanciones activas).
*   **API Web & Frontend:** Express.js, Vanilla CSS con Mesh Gradients, JavaScript nativo y Chart.js para las visualizaciones.
*   **Servicio de Audio:** `@discordjs/voice`, `libsodium-wrappers`, `@discordjs/opus` y `prism-media` apoyados en **FFmpeg**.

---

## 🚀 Guía de Instalación y Despliegue Local

### 1. Requisitos Previos
*   Instalar **Node.js** (v18 o superior) en tu sistema.
*   Instalar **FFmpeg** en tu sistema (requerido para procesar flujos de audio).
    *   *macOS (Homebrew):* `brew install ffmpeg`
    *   *Linux (Ubuntu/Debian):* `sudo apt install ffmpeg`
*   Una base de datos de **PostgreSQL** activa.
*   Una cuenta de desarrollador en Discord con un bot creado. Activa los siguientes intents en el [Discord Developer Portal](https://discord.com/developers/applications) (Sección Bot -> Privileged Gateway Intents):
    *   `GuildVoiceStates` (Obligatorio para interactuar con canales de voz).

### 2. Configuración del Entorno
Clona el repositorio, instala las dependencias y crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
npm install
```

Configura las variables dentro de tu `.env`:

```env
# Credenciales del Bot de Discord
DISCORD_TOKEN=tu_token_de_discord_aqui
CLIENT_ID=tu_client_id_de_la_aplicacion_aqui
GUILD_ID=tu_servidor_de_pruebas_aqui

# Puerto del Servidor Web Express
PORT=3000

# Cadena de Conexión de PostgreSQL
DATABASE_URL=postgres://usuario:contraseña@host_vps:5432/cronobot?sslmode=disable

# Configuración de Fish Audio (Opcional, activa las voces de IA de /decir-ia)
# Consigue tu API Key en https://fish.audio/
FISH_AUDIO_API_KEY=tu_api_key_de_fish_audio_aqui
FISH_AUDIO_XOKAS_MODEL_ID=8f23453397d14e4d9a579bad5aab41a8
FISH_AUDIO_EGIRL_MODEL_ID=03cfefd0ad67452c8d291d0ae4605273
FISH_AUDIO_COQUETA_MODEL_ID=e1f3701f614040539f531c7c1c7ed0fb
FISH_AUDIO_TIFANI_MODEL_ID=6e7e70b4befd4df4b2314069b2ee92ec
FISH_AUDIO_SEDUCTORA_MODEL_ID=5f7d136576e8467ca911b66f2ae16ac7
FISH_AUDIO_ARI_MODEL_ID=a7a8e99837144ffbb78a4f5072199426
FISH_AUDIO_RUBIUS_MODEL_ID=a43b1ac435f74a84984d083f8adaa0d9
FISH_AUDIO_DALAS_MODEL_ID=7b1f244402da4b04889bf7e7830c8af5
FISH_AUDIO_CHAVEZ_MODEL_ID=1ae468b5d7854319a106af33198feed1
FISH_AUDIO_MODEL=s2.1-pro-free
```

### 3. Registro de Comandos de Barra (Slash Commands)
Antes de encender el bot por primera vez (o cada vez que agregues o modifiques opciones de comandos), regístralos en la API de Discord ejecutando:

```bash
npm run deploy
```

### 4. Arrancar la Aplicación
```bash
npm start
```
El bot iniciará sesión en Discord y el servidor web estará disponible en `http://localhost:3000`.

---

## 🛡️ Lista de Comandos de Barra (Slash Commands)

El bot cuenta con 7 comandos registrados nativamente:

| Comando | Argumentos | Permisos requeridos | Descripción |
| :--- | :--- | :--- | :--- |
| `/ping` | Ninguno | Ninguno | Muestra la latencia del bot y de la API de Discord. |
| `/creador` | Ninguno | Ninguno | Muestra un embed con créditos del desarrollador y tecnologías. |
| `/mute` | `<usuario>` `<segundos>` `[razon]` | `Mute Members` | Silencia y ensordece al usuario en canales de voz tras completar un reto matemático. |
| `/voiceblock` | `<usuario>` `<canal>` `<segundos>` `[razon]` | `Manage Channels` | Bloquea temporalmente al usuario de un canal de voz tras resolver un reto matemático. |
| `/decir` | `<texto>` | Ninguno | Conecta al bot al canal de voz y lee el texto usando la voz clásica de **Google Translate** (Gratuito y rápido). |
| `/decir-ia` | `<texto>` `[voz]` `[intensidad]` | Ninguno | Conecta al bot y lee el texto usando voces clonadas por IA (Fish Audio) con fallback a Google. Voces: **El Xokas** (por defecto), **E-girl** (Clásica, Coqueta, Tifani ASMR y Seductora), **AriGameplays**, **El Rubius**, **Dalas Review** y **Hugo Chávez**. Intensidades: Normal, Emocionado, Triste, Cabreado (gritando) y Cachondo/a (seductor susurrante). |
| `/clearqueue` | Ninguno | `Mute Members` | Limpia la cola de espera de voz, detiene el reproductor y desconecta al bot del canal de voz. |

---

## 🎛️ Funcionamiento Interno del Módulo de Voz

El sistema de audio está desacoplado en el módulo central [voiceQueueManager.js](src/utils/voiceQueueManager.js), el cual garantiza las siguientes políticas:

1.  **Cola Única Compartida:** Si un usuario ejecuta `/decir` y otro ejecuta `/decir-ia`, ambos mensajes entran a la misma cola del servidor y se leen de forma secuencial sin pisarse.
2.  **Seguimiento al Usuario:** Si el usuario se cambia de canal de voz mientras su mensaje está en cola, el bot se desconectará del canal anterior y se unirá al nuevo canal del usuario para reproducir su audio.
3.  **Protección contra Expulsiones (Kicks):** Si un miembro desconecta al bot a la fuerza del canal de voz mientras está reproduciendo, el bot detecta el estado `Disconnected`, limpia los recursos en 1 segundo y reanuda el procesamiento de la cola con el siguiente mensaje.
4.  **Auto-Desconexión por Inactividad:** Cuando la cola se vacía, el bot inicia un temporizador de 10 segundos. Si no llega ningún mensaje nuevo durante ese tiempo, se desconecta para liberar recursos de red en el host.

---

## 🐳 Despliegue en Servidores / VPS (Coolify)

CRONOBOT está optimizado para desplegarse mediante Docker en plataformas como **Coolify** de forma directa.

### Dockerfile Integrado
El bot utiliza un `Dockerfile` basado en `node:18-alpine`. Para asegurar la compatibilidad con reproducción de audio, el contenedor instala automáticamente las herramientas del sistema requeridas (`ffmpeg`) en la fase de construcción de la imagen:

```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Instalar FFmpeg en Alpine Linux
RUN apk add --no-cache ffmpeg
RUN npm ci --only=production
COPY . .
CMD [ "npm", "start" ]
```

### Instrucciones de Despliegue en Coolify:
1. Conecta tu repositorio de GitHub a Coolify.
2. Crea una aplicación usando el `Dockerfile` del repositorio.
3. Agrega las variables de entorno correspondientes (`DATABASE_URL`, `DISCORD_TOKEN`, `CLIENT_ID`, `FISH_AUDIO_API_KEY`).
4. Haz clic en **Deploy (Desplegar)**. Coolify construirá la imagen instalando FFmpeg y conectará de forma segura el bot a tu PostgreSQL centralizado para persistir la información sin pérdida de datos tras reinicios.
