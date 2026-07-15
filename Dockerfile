FROM node:18-alpine

# Crear el directorio de trabajo de la aplicación
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar solo las dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código de la aplicación al contenedor
COPY . .

# Comando para iniciar el bot
CMD [ "npm", "start" ]
