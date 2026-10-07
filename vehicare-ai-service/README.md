# VehiCare Node.js AI Microservice (`vehicare-ai-service`)

Dedicated AI orchestration microservice for **VehiCare: An Intelligent Multi-Vehicle Diagnostics and Repair Assistance System**.

## Architecture

```text
React Native App  ──►  Laravel 12 Backend  ──►  Node.js AI Service  ──►  Google Gemini API
```

* **Laravel**: Application backend (Auth, Vehicles, Subscriptions, AI Usage Limits, History, MySQL).
* **Node.js Service**: AI processing (Gemini `@google/genai` integration, Zod schema validation, prompts, safety rules, rate limiting, symptom normalization).

## Setup & Running

```bash
cd vehicare-ai-service
npm install
npm run dev
```

The service runs on `http://127.0.0.1:5000`.

## Environment Variables

Configured in `.env`:
* `PORT=5000`
* `NODE_ENV=development`
* `GEMINI_API_KEY=...`
* `GEMINI_MODEL=gemini-3.6-flash`
* `AI_SERVICE_SECRET=vehicare_internal_ai_secret_key_2026`

## Endpoints

* `GET /api/health` — Service health & model configuration.
* `POST /api/diagnosis` — Internal authenticated AI diagnosis endpoint (`Authorization: Bearer <AI_SERVICE_SECRET>`).
