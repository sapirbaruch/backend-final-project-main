# Cost Manager RESTful Web Services

This project contains four microservices (Users, Costs, Logs, Admin) implemented with Express.js and MongoDB, plus a single all-in-one entry point.

## Supported run modes

- Single-process (combined) mode — serves all routes on one server (port 3000 by default):
  - Entry point: `src/app.js`
  - Start: `npm start` (or `PORT=3000 npm start`)

- Multi-process (microservices) mode — runs each service separately on its own port (recommended for testing):
  - Users: `src/users/app.js` (default port 3001)
  - Costs: `src/costs/app.js` (default port 3002)
  - Logs:  `src/logs/app.js`  (default port 3003)
  - Admin: `src/admin/app.js` (default port 3004)
  - Start all: `npm run start:all`
  - Start a single service: `npm run start:users` / `npm run start:costs` / `npm run start:logs` / `npm run start:admin`

## Prerequisites

Before running the project, ensure that you have the following prerequisites installed:

- Node.js (v16+ recommended)
- npm
- MongoDB (Atlas or local)
- Python 3 + venv (only for running the provided pytest suite)

## Setup

Follow the steps below to set up the project:

1. Copy the example env and fill values (do not commit your real .env):

    ```bash
    cp .env.example .env
    # Edit .env and set MONGODB_URI to your Atlas or local connection string
    ```

2. Install Node dependencies:

    ```bash
    npm install
    ```

3. (Optional) Prepare Python test environment and install test deps:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r tests/requirements.txt
    ```

## Running

Follow the instructions below to run the project:

- Run combined server (single port 3000):

    ```bash
    npm start
    # then open http://localhost:3000
    ```

- Run all microservices (each in its port):

    ```bash
    npm run start:all
    ```

- Run a single microservice (example: costs):

    ```bash
    npm run start:costs
    ```

## Testing

With the Python venv activated (see Setup step 3):

```bash
pytest tests/test_api_local.py
```

## Notes and tips

- The tests expect the services to be reachable at these ports (when running in microservices mode):
  - Users: http://localhost:3001
  - Costs: http://localhost:3002
  - Logs:  http://localhost:3003
  - Admin: http://localhost:3004

- If you want the app reachable at `http://localhost:3000` use the combined entrypoint (`src/app.js`) with `npm start`.

- Do not commit your real `.env` file. Use `.env.example` in the repository. A `.gitignore` file is included to ignore `.env`, `node_modules`, etc.

- If you encounter `EADDRINUSE` errors, stop other running instances using `lsof -iTCP:<port> -sTCP:LISTEN` and `kill <PID>` or restart your machine.

- For grading: ensure `.env` does not contain secrets, `models/` contains the Mongoose schemas, and the required endpoints exist and follow the documented names (/api/add, /api/report, /api/users, /api/logs, /api/about, /removeuser, /removereport, /removecost).

If you want, I can also:
- Run a quick consistency check across endpoints and update README examples (I already added the most common commands), or
- Produce a short script to start services in the background and wait for Mongo to become available.
