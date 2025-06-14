# Q2 Chat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Q2 Chat is a unified platform that gives you access to multiple AI models through a single, convenient interface. Whether you need creative writing, technical analysis, coding help, or general conversation, you can experiment with different AI models to find the one that works best for your specific task.

## ✨ Features

- **Multi-Model Access**: Connect to various Large Language Models (LLMs) through [OpenRouter.ai](https://openrouter.ai/).
- **Cross-Platform**: Seamless chat experience on both **Web** and **Mobile** (iOS/Android).
- **Persistent Conversations**: Chat history is saved, allowing you to revisit and continue past conversations.
- **Real-time Streaming**: Get AI responses streamed back to you in real-time.
- **User Authentication**: Secure sign-up and login functionality.
- **Guest Mode**: Try the app without creating an account.
- **Automatic Titling**: New chats are automatically given a concise title based on the initial prompt.

## 🏗️ Architecture

The project is a monorepo consisting of a backend service and two frontend clients (web and mobile).

- **Supabase**: Hosts our Postgres database, handles user authentication, and provides real-time updates for chat messages.
- **Backend (FastAPI)**: A Python-based API that serves the frontend clients, handles business logic, and communicates with the LLM provider.
- **Frontend (Web & Mobile)**: The user interfaces for interacting with the chat application.
- **OpenRouter.ai**: A service that provides access to a wide range of AI models from different providers.

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### 1. Prerequisites

- [Docker](https://www.docker.com/get-started/) and Docker Compose
- [Node.js](https://nodejs.org/en) (v20 or later)
- [Python](https://www.python.org/downloads/) (v3.9 or later)

### 2. Supabase Setup

The project uses a local Supabase instance managed by Docker.

1.  **Start Supabase services:**
    ```bash
    docker compose up -d
    ```
    This will start the Supabase containers in the background. You can check the status with `docker compose ps`.

2.  **Get Supabase Credentials:**
    After the services start, the necessary `SUPABASE_URL` and `SUPABASE_ANON_KEY` will be printed to the console. You will need these for the next steps. You can also get them by running:
    ```bash
    docker compose logs | grep "API URL"
    docker compose logs | grep "anon key"
    ```

### 3. Environment Variables

You need to set up environment variables for the backend and frontend applications.

1.  **Backend (`backend/.env`):**
    Create a file named `.env` in the `backend/` directory with the following content:

    ```env
    OPEN_ROUTER_KEY="your_open_router_api_key"
    SUPABASE_URL="your_supabase_url_from_previous_step"
    SUPABASE_KEY="your_supabase_anon_key_from_previous_step"
    ```
    - Get your `OPEN_ROUTER_KEY` from [OpenRouter.ai](https://openrouter.ai/keys).

2.  **Frontend (Web & Mobile):**
    Both frontends need to know the backend API URL. Create a file named `.env.local` in `frontend/web/` and `.env` in `frontend/mobile/` with this content:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```
    *(Assuming the backend runs on port 8000).*

### 4. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend/app
    ```
2.  **Create a virtual environment and install dependencies:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    pip install -r requirements.txt
    ```
3.  **Run the backend server:**
    From the `backend/` directory:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend should now be running on `http://localhost:8000`.

### 5. Frontend Setup

You can run either the web or the mobile client.

**For the Web Client:**

1.  **Navigate to the web directory and install dependencies:**
    ```bash
    cd frontend/web
    npm install
    ```
2.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The web app will be available at `http://localhost:3000`.

**For the Mobile Client:**

1.  **Navigate to the mobile directory and install dependencies:**
    ```bash
    cd frontend/mobile
    npm install
    ```
2.  **Start the Expo development server:**
    ```bash
    expo start
    ```
    Scan the QR code with the Expo Go app on your phone, or run on an emulator.

## ⚖️ License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.