# Chat Bot Agent

A powerful, document-aware chat agent built with Node.js, TypeScript, and LangChain. This agent leverages local LLMs via Ollama and utilizes a vector store (Supabase with pgvector) for RAG (Retrieval-Augmented Generation) capabilities.

## 1. Tech Stack

- **Lanuage/Runtime**: [Node.js](https://nodejs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Express.js](https://expressjs.com/) (Version 5)
- **AI/LLM Framework**: [LangChain](https://js.langchain.com/)
- **LLM Engine**: [Ollama](https://ollama.com/) (Local)
- **Database/Vector Store**: [Supabase](https://supabase.com/) (PostgreSQL with `pgvector`)
- **Embedding Model**: Ollama (e.g., `nomic-embed-text`)
- **Chat Model**: OpenAI (GPT-4o/GPT-3.5) or Local Ollama models
- **Utilities**: `zod` (Validation), `tsx` (TypeScript Execution), `dotenv` (Environment Variables)

## 2. Infrastructure

- **Local Development**:
  - **Ollama**: Runs locally to provide embedding services and/or local chat models.
  - **Express Server**: Runs on `localhost` (default port 3000).
- **Persistence**:
  - **Supabase**: Hosted PostgreSQL instance with `pgvector` enabled.
  - **Vector Table**: `documents` table storing content, metadata, and embeddings.
  - **RPC Function**: Uses `match_documents` for cosine similarity searches.

## 3. Runbook

### Prerequisites
- Install **Node.js** (v18+)
- Install **Ollama** and pull required models:
  ```bash
  ollama pull nomic-embed-text
  ```

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in a `.env` file:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Project
- **Development Mode**:
  ```bash
  npm run dev
  ```
  The server will start at `http://localhost:3000`.

## 4. Next Steps

### Deployment & DevOps
- [ ] **Dockerization**: Create a `Dockerfile` and `docker-compose.yml` to bundle the app and potentially a local ChromaDB/Postgres instance.
- [ ] **Cloud Deployment**: Deploy the Express API to platforms like Vercel, Render, or Railway.

### New Features
- [ ] **User Memory**: Implement persistent chat history using Supabase to give the agent "long-term memory".
- [ ] **Agentic Tools**: Add more tools like Google Search, Slack integration, or Database CRUD tools.
- [ ] **Multi-Model Support**: Allow switching between OpenAI, Anthropic, and Local Ollama models via configuration.

## 5. Testing Plan

### Unit Tests
- **Tool**: [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/).
- **Scope**: Test individual services (`chunker.ts`, `embedder.ts`) and tools (`news_api.ts`) using mocks for external API calls.

### Integration Tests
- **Tool**: `supertest`.
- **Scope**: Test the Express routes and the full flow from document ingestion to vector search.
- **Database**: Use a separate test schema in Supabase or a local Docker-based Postgres for testing.

## 6. Handoff

### Project Structure
- `src/index.ts`: Entry point for the Express server.
- `src/services/`: Core logic for `chunking`, `embedding`, and `vector storage`.
- `src/tools/`: Custom tools for the agent (e.g., `knowledge_base`, `news_api`).
- `src/agents.ts`: Definintion of the LangChain agent and its capabilities.

### Key Knowledge
- The system uses a **Recursive Character Splitting** strategy for ingestion.
- **Supabase RPC** is the bridge between the TypeScript code and the vector search logic in the database.

## 7. Change Log

- **v1.0.0 (Initial Implementation)**
  - Document ingestion from local directories.
  - Recursive chunking logic.
  - Integration with Ollama for local text embeddings.
  - Vector Store implementation using Supabase and `pgvector`.
  - Basic LangChain agent with custom tools.

## 8. API Examples

You can interact with the agent's ingestion API using `curl`.

### Ingest Single Document
```bash
curl -X POST http://localhost:3000/api/v1/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "content": "This is a sample document content about artificial intelligence.",
       "metadata": {
         "source": "manual-input",
         "category": "education"
       }
     }'
```

### Ingest Directory of Documents
```bash
curl -X POST http://localhost:3000/api/v1/ingest/directory \
     -H "Content-Type: application/json"
```

### Chat with Agent
```bash
curl -X POST http://localhost:3000/api/v1/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "What do you know about artificial intelligence?"
     }'
```

---
*Maintained by Diogo Ferraz*
