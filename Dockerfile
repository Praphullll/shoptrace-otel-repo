FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

# tracing.js starts first, which then loads app.js
CMD ["node", "src/tracing.js"]
