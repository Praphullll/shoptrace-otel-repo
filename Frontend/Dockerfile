FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN VITE_API_URL=http://shoptrace-alb-1102144974.us-east-1.elb.amazonaws.com \
    VITE_SIGNOZ_URL=https://smooth-hen.in2.signoz.cloud \
    VITE_OTEL_ENDPOINT=http://otel-frontend-alb-666146829.us-east-1.elb.amazonaws.com/v1/traces \
    npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8070
CMD ["nginx", "-g", "daemon off;"]
