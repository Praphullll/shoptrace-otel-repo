# ShopTrace Frontend

A production-ready e-commerce frontend for the ShopTrace gadgets marketplace, built with vanilla JavaScript + Webpack.

## Features

- 🛍️ **Product Catalogue** – browse, filter by category, and search gadgets
- 🛒 **Shopping Cart** – persistent cart with quantity management (localStorage)
- 💳 **Checkout** – email validation, multi-item order placement via the backend API
- 📦 **Order History** – view locally stored orders with status badges
- 📡 **Service Monitor** – real-time backend health and activity feed
- 🎨 **Dark Theme** – glassmorphism UI with smooth animations
- ♿ **Accessible** – WCAG 2.1 AA compliant (ARIA roles, keyboard nav, focus management)
- 📱 **Responsive** – mobile-first grid layout

## Quick Start (Development)

```bash
cd frontend
cp .env.example .env      # set BACKEND_URL if needed
npm install
npm start                 # webpack-dev-server on http://localhost:8080
```

## Production Build

```bash
npm run build             # outputs to dist/
```

## Docker

### Frontend only
```bash
docker build -t shoptrace-frontend \
  --build-arg BACKEND_URL=http://localhost:3000 .

docker run -p 8080:80 shoptrace-frontend
```

### Full stack (frontend + backend + postgres + otel)
From the **repository root**:
```bash
docker compose up --build
```
The root `docker-compose.yml` includes the frontend service at port **8080**.

### Frontend only (with existing backend network)
```bash
cd frontend
docker compose up --build
```

## Environment Variables

| Variable      | Default                   | Description              |
|---------------|---------------------------|--------------------------|
| `BACKEND_URL` | `http://localhost:3000`   | ShopTrace backend URL    |

## API Endpoints Used

| Method | Path              | Description           |
|--------|-------------------|-----------------------|
| GET    | `/health`         | Backend health check  |
| GET    | `/products`       | List all products     |
| POST   | `/orders`         | Place a new order     |
| GET    | `/orders/:id`     | Fetch a single order  |

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── Cart.js          # Cart slide-in drawer
│   │   ├── Checkout.js      # Checkout form
│   │   ├── Header.js        # Sticky navigation header
│   │   ├── Footer.js        # Site footer
│   │   └── ProductCard.js   # Product card component
│   ├── pages/
│   │   ├── Home.js          # Landing page
│   │   ├── Products.js      # Product catalogue
│   │   ├── Orders.js        # Order history
│   │   └── Monitor.js       # Service health monitor
│   ├── services/
│   │   ├── api.js           # Backend API calls (with retry)
│   │   └── storage.js       # localStorage (cart + orders)
│   ├── utils/
│   │   ├── categories.js    # Product category helpers
│   │   └── toast.js         # Toast notifications
│   ├── styles/
│   │   └── app.css          # Global dark-theme styles
│   └── index.js             # App entry point + router
├── webpack.config.js
├── nginx.conf               # Nginx SPA config (production)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
