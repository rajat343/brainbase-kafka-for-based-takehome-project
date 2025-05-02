# Brainbase-Kafka Based Agent Builder

Kafka enables you to build AI agents using the Based language. You can:

-   Describe the agent and generate a `.based` file
-   Propose updates via diffs and preview them with ✅ / ❌
-   Apply accepted changes to the `.based` file
-   Launch and chat with the agent over WebSocket

---

## ✅ Requirements

-   Used Node.js 20
-   Used Python 3.12
-   OpenAI API key
-   Brainbase credentials:
    -   `BRAINBASE_API_KEY`
    -   `WORKER_ID`
    -   `FLOW_ID`

---

## ⚙️ Backend Setup

```bash
cd backend
npm install

# Python setup
python3 -m venv venv
source venv/bin/activate
pip install brainbase_labs python-dotenv aiohttp

npm run dev
# Server and Websocket would be running on http://localhost:3000
```

```
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

.env files

```
OPENAI_API_KEY=your_openai_key
BRAINBASE_API_KEY=your_brainbase_key
PORT=3000
BASE_URL=http://localhost
WORKER_ID=your_worker_id
FLOW_ID=your_flow_id
```
