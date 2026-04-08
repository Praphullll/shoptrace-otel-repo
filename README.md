# ShopTrace Simple 🛒

A **single Node.js service** wired up with OpenTelemetry (OTel) to send
**Traces, Metrics, and Logs** to New Relic. Built for learning and documentation.

---

## How it works (plain English)

```
Your request (curl / Postman)
        │
        ▼
  Node.js App (Express)          ← app.js handles your routes
        │
        │  OTel SDK watches everything automatically
        │  (every HTTP request, every DB query becomes a "span")
        │
        ├──► PostgreSQL          ← stores products and orders
        │
        ▼
  OTel Exporter
        │
        │  OTLP over HTTPS
        │
        ▼
  New Relic
    ├── APM (response time, throughput, errors)
    ├── Distributed Tracing (timeline of what happened)
    ├── Logs (linked to traces automatically)
    └── Metrics (custom counters and histograms)
```

---

## Setup (step by step)

### 1. Copy and fill in your environment file

```powershell
cp .env.example .env
```

Open `.env` in Notepad and set your New Relic license key:
```
NEW_RELIC_LICENSE_KEY=your_key_here
```

Get your key from:
**New Relic → (top right) Account → API Keys → INGEST - LICENSE → Copy key**

> **EU account?** Also change the endpoint in `.env`:
> `NEW_RELIC_OTLP_ENDPOINT=https://otlp.eu01.nr-data.net`

---

### 2. Start the stack

```powershell
docker compose up -d --build
```

Two containers start:
- `shoptrace-postgres` — the database
- `shoptrace-app`      — your Node.js app with OTel

---

### 3. Verify it's running

```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","service":"shoptrace-simple","db":"ok"}
```

---

### 4. List products

```powershell
curl http://localhost:3000/products
```

---

### 5. Place an order (this is the main trace to watch in New Relic)

In PowerShell:

```powershell
# Save a product ID
$products = Invoke-WebRequest http://localhost:3000/products | ConvertFrom-Json
$pid = $products[0].id

# Place the order
Invoke-WebRequest -Method POST http://localhost:3000/orders `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (ConvertTo-Json @{
    customer_email = "you@example.com"
    product_id     = $pid
    quantity       = 1
  }) | Select-Object -ExpandProperty Content
```

---

### 6. Trigger test scenarios

```powershell
# Simulate an error (check New Relic → Errors)
curl http://localhost:3000/simulate/error

# Simulate a slow response (check New Relic → traces for latency)
curl "http://localhost:3000/simulate/slow?ms=3000"
```

---

## What to check in New Relic

| What | Where in New Relic |
|---|---|
| Service overview | APM & Services → shoptrace-simple |
| Traces | APM → shoptrace-simple → Distributed Tracing |
| Logs | Logs → search `service.name:"shoptrace-simple"` |
| Custom metrics | Query Your Data → run NRQL from FINDINGS.md |
| Errors | APM → shoptrace-simple → Errors |

---

## Stopping

```powershell
docker compose down          # stop containers, keep DB data
docker compose down -v       # stop + wipe DB (fresh start)
```

---

## File structure

```
shoptrace-simple/
├── docker-compose.yml    ← starts postgres + app
├── Dockerfile            ← builds the Node.js container
├── .env.example          ← copy to .env and add your NR key
├── FINDINGS.md           ← daily log template
├── postgres/
│   └── init.sql          ← creates tables + seed products
└── src/
    ├── tracing.js        ← OTel SDK setup (runs first)
    └── app.js            ← Express routes (runs second)
```
