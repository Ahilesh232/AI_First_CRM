# AI-First CRM — HCP Module

This is the AI-First CRM HCP Module, a full-stack application built with React/Vite (frontend) and FastAPI/LangGraph (backend). It features a "Log HCP Interaction" screen that demonstrates a synchronized form and AI assistant chat interface.

## Project Structure

The project is split into two main directories:

- `frontend/`: The React application built with Vite and Tailwind CSS.
  - State management uses Redux Toolkit to synchronize the form and chat panel.
  - `src/App.jsx`: The main layout container.
  - `src/components/InteractionForm.jsx`: The structured form panel for manually entering or reviewing HCP interaction details.
  - `src/components/ChatPanel.jsx`: The AI assistant interface that sends natural language queries to the backend.

- `backend/`: The FastAPI Python backend server.
  - Uses LangGraph and LangChain to parse natural language and update the form state intelligently.
  - `main.py`: The FastAPI application entry point.

## Running the Project

To run this project, you need to start both the frontend and backend servers.

### 1. Start the Backend

1. Navigate to the `backend` directory.
2. Ensure your virtual environment is activated (`venv\Scripts\activate` on Windows).
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Start the Frontend

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the provided `localhost` URL (e.g., `http://localhost:5173`) in your browser.
