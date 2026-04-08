# ShopTrace Simple — Daily Observability Findings Log

**Project:** OTel → New Relic evaluation (single Node.js service)
**Stack:** Node.js · Express · PostgreSQL · Docker · OpenTelemetry SDK · New Relic
**Objective:** Validate that Logs, Metrics, and Traces all flow correctly from a Node.js app through OTel to New Relic

---

## How to fill this log

After each test session, copy the Day Template below and answer each question.
You don't need to write paragraphs — short answers, YES/NO, and numbers are enough.
The goal is to build a clear picture over multiple days of what works, what doesn't, and how NR compares to SigNoz later.

---

## Day Template (copy this for each day)

```
═══════════════════════════════════════════════════════
DATE:
SESSION DURATION:
═══════════════════════════════════════════════════════

─── WHAT I TESTED TODAY ───────────────────────────────
(tick what you did)

 [ ] Started the stack fresh (docker compose up)
 [ ] Hit GET /health
 [ ] Hit GET /products
 [ ] Placed an order (POST /orders)
 [ ] Triggered a simulated error (GET /simulate/error)
 [ ] Triggered a slow response (GET /simulate/slow)
 [ ] Ran multiple requests back to back


─── TRACES ────────────────────────────────────────────
Where to look: New Relic → APM & Services → shoptrace-simple
               → Distributed Tracing

Did traces appear in New Relic?               YES / NO
How long after starting the app?              ___ minutes

For POST /orders trace:
  Total duration of the request:              ___ ms
  Could you see the DB query as a child span? YES / NO
  What was the slowest span?                  ___________
  Were custom attributes visible?             YES / NO
    (customer.email, order.id, order.total)

For GET /simulate/error:
  Did the error appear in the trace?          YES / NO
  Was the span marked as ERROR (red)?         YES / NO

Screenshot / trace link:
  (paste here or write "see attached")


─── LOGS ──────────────────────────────────────────────
Where to look: New Relic → Logs
               Also: APM → shoptrace-simple → Logs

Did logs appear in New Relic?                 YES / NO
How long after the request?                   ___ seconds

Log format correct (JSON with traceId)?       YES / NO

Logs in Context — could you:
  Open a trace → click "See logs"?            YES / NO
  See log lines from inside that trace?       YES / NO
  Jump from a log → back to the trace?        YES / NO

Any logs missing or delayed?                  YES / NO
  Notes: ________________________________________________


─── METRICS ───────────────────────────────────────────
Where to look: New Relic → APM → shoptrace-simple → Summary

Did the service appear in APM?                YES / NO

Standard metrics visible:
  Response time (ms):                         ___
  Throughput (requests/min):                  ___
  Error rate (%):                             ___
  Apdex score:                                ___

Custom metrics visible:
  orders.created counter:                     YES / NO
  order.value histogram:                      YES / NO
  app.errors counter:                         YES / NO

Where to look for custom metrics:
  New Relic → Query Your Data (NRQL)
  Run: SELECT sum(orders.created) FROM Metric SINCE 1 hour ago
  Result: _______________________________________________


─── ERRORS ────────────────────────────────────────────
Where to look: New Relic → APM → shoptrace-simple → Errors

Any unexpected errors today?                  YES / NO
  Error message: ________________________________________
  Which route caused it: ________________________________

Simulated error (/simulate/error):
  Appeared in Errors Inbox?                   YES / NO
  Stack trace visible?                        YES / NO
  Error fingerprinted / grouped correctly?    YES / NO


─── OBSERVATIONS ──────────────────────────────────────
(write freely — what surprised you, what was confusing,
what worked better or worse than expected)

1.
2.
3.


─── ISSUES / BLOCKERS ─────────────────────────────────
(anything that didn't work, with error message if any)

1.
2.


─── TOMORROW ──────────────────────────────────────────
What I plan to test next:

1.
2.
═══════════════════════════════════════════════════════
```

---

## Summary Table (fill one row per day)

| Day | Date | Traces ✓ | Logs ✓ | Metrics ✓ | Logs-in-Context ✓ | Key Finding |
|-----|------|----------|--------|-----------|-------------------|-------------|
| 1   |      |          |        |           |                   |             |
| 2   |      |          |        |           |                   |             |
| 3   |      |          |        |           |                   |             |
| 4   |      |          |        |           |                   |             |
| 5   |      |          |        |           |                   |             |

---

## NRQL Queries — Useful for your daily checks

Paste these into **New Relic → Query Your Data**:

```sql
-- All traces from today
SELECT * FROM Span WHERE service.name = 'shoptrace-simple' SINCE 1 hour ago

-- Average response time per route
SELECT average(duration.ms) FROM Span
WHERE service.name = 'shoptrace-simple'
FACET http.route SINCE 1 hour ago

-- Error rate
SELECT percentage(count(*), WHERE otel.status_code = 'ERROR') FROM Span
WHERE service.name = 'shoptrace-simple' SINCE 1 hour ago

-- Total orders placed
SELECT sum(orders.created) FROM Metric
WHERE service.name = 'shoptrace-simple' SINCE 1 hour ago

-- Order value distribution
SELECT histogram(order.value, 10, 20) FROM Metric
WHERE service.name = 'shoptrace-simple' SINCE 1 hour ago

-- Log count per level
SELECT count(*) FROM Log
WHERE service.name = 'shoptrace-simple'
FACET level SINCE 1 hour ago
```

---

## Final Report Checklist (end of evaluation)

- [ ] Traces confirmed flowing from Node.js → OTel → New Relic
- [ ] Logs linked to traces (logs-in-context working)
- [ ] Custom metrics visible in New Relic dashboards
- [ ] Error tracking and grouping validated
- [ ] Slow query / latency detection confirmed
- [ ] Comparison notes between New Relic and SigNoz started
