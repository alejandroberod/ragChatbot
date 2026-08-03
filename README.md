# ragChatbot

Chatbot con RAG (Retrieval-Augmented Generation) que responde preguntas sobre documentos PDF que el propio usuario sube — con autenticación por usuario, streaming de respuestas y dos estrategias de contexto según el tamaño del documento.

**Demo en vivo:** https://alejandrobetancourth-ragchatbot.vercel.app

<img width="1994" height="1080" alt="Image" src="https://github.com/user-attachments/assets/a4392420-9088-41d6-b34a-da6d76ccecba" />

## Qué hace

1. El usuario inicia sesión y sube un PDF.
2. Según el tamaño/tipo del documento, la app elige una de dos estrategias:
   - **RAG**: el PDF se trocea en chunks, se generan embeddings y se guardan en Postgres (pgvector). En cada pregunta, el modelo decide si necesita buscar en la base de conocimiento antes de responder.
   - **Full context**: el PDF completo se adjunta directamente a la conversación, sin necesidad de búsqueda.
3. El chat responde en streaming, en español o inglés según el idioma de la pregunta, citando el contenido del documento cuando aplica.

## Cómo funciona

```
Upload PDF
   │
   ├─ estrategia "rag"  → chunking → embeddings → Postgres (pgvector, índice HNSW)
   │                                                     │
   └─ estrategia "full" → PDF completo en base64 en DB   │
                                                          │
Chat (streaming) ──── tool call "searchKnowledgeBase" ───┘
   │
   └─ Gemini (Vercel AI SDK) genera la respuesta
```

- La búsqueda es **agéntica**: el modelo decide cuándo llamar a `searchKnowledgeBase` y reformula la pregunta del usuario en una query semánticamente rica antes de buscar.
- El retrieval usa similitud coseno sobre los embeddings, filtrado por usuario, con un índice HNSW para que la búsqueda escale.
- Manejo explícito de rate limits (429) del free tier de Gemini con un mensaje amigable en vez de un error genérico.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Auth:** Clerk
- **Base de datos:** Neon (Postgres serverless) + pgvector, Drizzle ORM
- **IA:** Vercel AI SDK, Google Gemini (`gemini-3.6-flash`)
- **UI:** Tailwind CSS v4, Radix/shadcn
- **Deploy:** Vercel

## Getting started

```bash
git clone https://github.com/alejandroberod/ragChatbot.git
cd ragChatbot
npm install
cp .env.example .env.local
```

Completa `.env.local` con:

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | API key de OpenAI |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key de Google Gemini |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key de Clerk |
| `CLERK_SECRET_KEY` | Secret key de Clerk |
| `NEON_DATABASE_URL` | Connection string de tu base de datos Neon |

Aplica las migraciones de Drizzle (carpeta `migrations/`) y levanta el proyecto:

```bash
npx drizzle-kit migrate
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
app/          rutas de Next.js (chat, upload, API)
components/   componentes de UI
lib/          lógica de chunking, embeddings, búsqueda y acceso a DB
migrations/   migraciones de Drizzle
```

## Posibles mejoras futuras

- Tests automatizados y CI.
- Soporte para más de un documento por usuario.
- Internacionalización (i18n) real en vez de detección de idioma por prompt.

## Licencia

MIT
