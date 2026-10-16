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
* `GEMINI_MODEL=gemini-3.8-flash`
* `GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite`
* `AI_SERVICE_SECRET=your_internal_ai_service_secret_here`

### Multimodal processing and timeouts

Copy `.env.example` to `.env` and configure the model and timeout variables there. Text, image, audio, and video generation have separate timeouts. Images are attached as image data; audio and video are uploaded through Gemini's Files API, polled until ready, and deleted after the request. Generation does not start while an uploaded file is still processing.

History is normalized to recent user/assistant text messages before it is used. Gemini failures and invalid responses are returned as structured errors rather than fabricated diagnostic results. Transient model failures may use the configured fallback model; invalid input and media processing failures do not.

The Laravel backend allows up to 360 seconds for multipart diagnostic requests, and the mobile client waits 370 seconds so Laravel has time to return its response. This does not alter guest, free, or premium consultation and media limits.

Run the offline service checks with:

```bash
npm test
```

## Endpoints

* `GET /api/health` — Service health & model configuration.
* `POST /api/diagnosis` — Internal authenticated AI diagnosis endpoint (`Authorization: Bearer <AI_SERVICE_SECRET>`).
