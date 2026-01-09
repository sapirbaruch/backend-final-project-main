# Cost Manager RESTful Web Services
Final Project – Asynchronous Server-Side Development

This project implements a RESTful backend for managing users and cost items.
The system is built using Node.js, Express, MongoDB (Atlas), and Pino.
It is divided into four separate processes: Users, Costs, Logs, and Admin.


## Architecture

The system is implemented as four separate Node.js processes,
each running on a different port:

- Users Service (port 3001)
- Costs Service (port 3002)
- Logs Service (port 3003)
- Admin Service (port 3004)

Each service runs as an independent Express application.

## Environment Variables

The project uses a `.env` file with the following variable:

MONGODB_URI=<MongoDB Atlas connection string>


## API Endpoints

### Users Service (port 3001)
- POST /api/add – Add a new user
- GET /api/users – List all users
- GET /api/users/:id – Get user details
- DELETE /removeuser – Remove user (used for tests)

### Costs Service (port 3002)
- POST /api/add – Add a cost item
- GET /api/report – Get monthly report
- DELETE /removecost – Remove cost (tests)
- DELETE /removereport – Remove report (tests)

### Logs Service (port 3003)
- GET /api/logs – List all logs

### Admin Service (port 3004)
- GET /api/about – Get developers team

## Computed Design Pattern

Monthly reports are computed dynamically from the costs collection.
If a report is requested for a past month, it is stored in the reports
collection to avoid recomputation.
Reports for the current or future month are generated on demand.

## Testing

The project was tested using automated tests written with pytest.
All endpoints were verified locally using the provided test scripts.

## Running the Project Locally

1. Install dependencies:
   npm install

2. Create a .env file with MONGODB_URI

3. Run the services (example):
   node src/users/app.js
   node src/costs/app.js
   node src/logs/app.js
   node src/admin/app.js
