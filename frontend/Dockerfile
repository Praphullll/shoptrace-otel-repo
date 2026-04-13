# ── Build stage ────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY . .

ARG BACKEND_URL=http://localhost:3000
ENV BACKEND_URL=$BACKEND_URL

RUN npm run build

# ── Production stage ────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config with SPA support
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
