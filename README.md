# Discord Bot - Proyecto de Ideas

Este es el espacio dedicado a la creación y desarrollo de nuestro Bot de Discord.

## 📋 Requisitos para programar el bot

Para empezar a programar el bot, necesitamos los siguientes elementos:

1. **Cuenta de Discord** y acceso al [Discord Developer Portal](https://discord.com/developers/applications).
2. **Creación de la Aplicación**:
   - Crear una nueva aplicación en el portal.
   - Ir a la pestaña **Bot**, añadir un bot y guardar el **Token** de forma segura (¡no lo compartas!).
   - Habilitar los **Privileged Gateway Intents** (especialmente *Presence Intent*, *Server Members Intent* y *Message Content Intent*) para que el bot pueda leer y reaccionar a los mensajes.
3. **Entorno de desarrollo**:
   - **Node.js** (versión v18 o superior) si programamos en JavaScript/TypeScript usando **discord.js**.
   - **Python** (versión 3.8 o superior) si preferimos Python usando **discord.py**.
4. **Librerías**:
   - Para Node.js: `npm install discord.js dotenv`
   - Para Python: `pip install discord.py python-dotenv`

---

## 🌐 Opciones de Hosting Gratuito (24/7 o casi)

Aquí tienes las mejores opciones actuales para mantener el bot activo de forma gratuita:

| Proveedor | Ventajas | Limitaciones / Requisitos |
| :--- | :--- | :--- |
| **Oracle Cloud (Always Free)** | VPS completo y gratis para siempre, recursos excelentes (ARM, hasta 24GB RAM). | Proceso de registro estricto (pide tarjeta para validar identidad). |
| **Hugging Face Spaces (Docker)** | Hosting de contenedores Docker persistente y gratuito. | Requiere configurar el proyecto en Docker. |
| **Discloud / Square Cloud** | Hosting especializado para bots de Discord con paneles sencillos. | El plan gratuito requiere renovaciones manuales (puntos/votos) o tiene límites de recursos. |
| **Render + UptimeRobot** | Muy fácil de configurar con GitHub. | Se duerme tras 15 min si no recibe tráfico HTTP (se soluciona con pings de UptimeRobot). Además, tiene un límite mensual de 500 horas gratis (no cubre 24/7 todo el mes). |

---

## 🚀 Próximos Pasos
- [ ] Decidir el lenguaje de programación (JavaScript o Python).
- [ ] Crear la aplicación en el Portal de Desarrolladores de Discord.
- [ ] Configurar las variables de entorno (`.env`) localmente.
- [ ] Escribir el código base del bot.
- [ ] Elegir y configurar el hosting.
