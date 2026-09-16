# AgriSphere

> **Smart India Hackathon 2026** — PS26132  
> **Team Name:** AgriSphere | **Team ID:** MMSIH056  
> **Core Mission:** *"A single platform that turns scattered mandi prices into one clear answer, and lets farmers and buyers check each other's track record before agreeing to a deal."*

---

## ⚡ Quick Start

### 1. Frontend (React + Vite + Tailwind)
```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run dev
```
Opens at `http://localhost:5173`.

### 2. AI Grading & Mandi Price Agent (Python FastAPI + LangGraph)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API docs open at `http://localhost:8000/docs`.

---

## 🏗️ Repository & Architecture Structure

```
├── src/                            # Frontend (React + Vite + Tailwind)
│   ├── lib/                        # Shared setup — supabaseClient.js, i18n.js
│   ├── locales/                    # Multilingual text (en.json, hi.json, mr.json)
│   └── features/
│       ├── auth/                   # Module 1 & 2 (login, signup, roles, language switcher)
│       ├── price-intel/            # Module 3 & 4 (price dashboard, sell/hold advisor)
│       ├── lot-grading/            # Module 5 (lot creation, AI grading, voice input)
│       ├── buyer-matching/         # Module 6 (buyer discovery, offers, price lock)
│       ├── fpo/                    # Module 7 (FPO pooling, payment split-back)
│       └── reliability/            # Module 8 & 9 (payment tracking, reliability score)
├── supabase/                       # Database migrations and table schemas
│   ├── 01_profiles.sql
│   └── ...
├── app/                            # Module 5: AI Quality Analysis & Grading Microservice
│   ├── main.py                     # FastAPI entry point, CORS, OpenAPI docs
│   ├── core/                       # Settings (Pydantic), config, structured logging
│   ├── schemas/                    # Pydantic schemas (Grade A/B/C, Confidence, Net Realisation)
│   ├── services/                   # Image optimization & data.gov.in Agmarknet client
│   ├── tools/                      # LangGraph @tool (fetch_agmarknet_prices)
│   ├── agents/                     # LangGraph StateGraph, Qwen Multimodal Vision on Groq
│   └── api/v1/                     # REST API endpoints (/grade/upload, /grade/base64, /prices, /health)
├── tests/                          # Automated tests & sample crop images
├── requirements.txt                # Python dependencies
├── package.json                    # Node dependencies
└── .env.example                    # Environment configuration template
```

---

## 🌾 Module 5: AI Crop Quality Analysis & Grading Microservice

### Key Capabilities
1. **Multimodal Vision Inspection (Groq LLM)**: Powered by `qwen/qwen3.8-27b` to analyze harvest photos for color uniformity, ripeness stage, skin texture, and surface defects.
2. **Real-time Mandi Discovery via LangGraph `@tool`**: Autonomously queries the Government of India's **data.gov.in (Agmarknet)** dataset (`9ef84268-d588-465a-a308-a864a43d0070`) for live modal and range prices.
3. **Confidence-Aware AI Grading**: Classifies produce into **Grade A**, **Grade B**, or **Grade C** with an explicit confidence score (e.g. 96.5%).
4. **Net Realisation Breakdown**: Payout computation factoring in local mandi transport costs and APMC cess to give the farmer their true in-hand price.
5. **Sell Now vs. Hold Harvest**: Decision support to prevent distress selling.

---

### API Endpoints
- **`POST /api/v1/grade/upload`**: Multipart file upload (image + crop metadata).
- **`POST /api/v1/grade/base64`**: Base64 JSON payload (for mobile/camera integration).
- **`GET /api/v1/prices`**: Direct Agmarknet mandi price lookup for any commodity.
- **`GET /api/v1/health`**: Service and API key readiness check.

---

## 🎯 Alignment with SIH 2026 AgriSphere Specifications
- **Zone 2 Frontend**: PWA React components with offline tolerance and Marathi/Hindi localization.
- **Zone 3 Backend**: Modular service pattern with API gateway, structured errors, and Supabase auth integration.
- **Zone 4 Intelligence**: LangGraph state machine, Groq vision inference, and official `data.gov.in` tool calling.
- **Social Impact**: Directly targets raising farmer realization from ~33% towards the target **~85%** benchmark.
