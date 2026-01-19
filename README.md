# Cost Manager RESTful Web Services
Final Project – Asynchronous Server-Side Development

This project implements a RESTful backend for managing users and cost items.
The system is built using Node.js, Express, MongoDB (Atlas), and Pino.

The project is implemented as **four independent processes**, as required by the course specifications.


## Architecture

The system is implemented as four **separate Node.js processes**,
each running as an independent Express application on a different port:

- Users Service (port 3001)
- Costs Service (port 3002)
- Logs Service (port 3003)
- Admin Service (port 3004)

Each process is started independently and listens on its own port.
This design fulfills the requirement of having four separate processes
and not a single application with multiple routes.


## Environment Variables

The project uses a `.env` file with the following variables:

- `MONGODB_URI` – MongoDB Atlas connection string
- `TEAM_MEMBERS="First Last;First Last"`  
  Used by the Admin service (`/api/about`).  
  Developers’ names are **not stored in the database**, as required.


## API Endpoints

### Users Service (port 3001)
- `POST /api/add` – Add a new user  
  Required parameters: `id`, `first_name`, `last_name`, `birthday`
- `GET /api/users` – List all users
- `GET /api/users/:id` – Get details of a specific user, including total costs
- *(Tests only)* `DELETE /removeuser`  
  Available only when `NODE_ENV=test`

### Costs Service (port 3002)
- `POST /api/add` – Add a cost item  
  Required parameters: `userid`, `description`, `category`, `sum`
- `GET /api/report` – Get monthly cost report
- *(Tests only)* `DELETE /removecost` and `DELETE /removereport`  
  Available only when `NODE_ENV=test`

### Logs Service (port 3003)
- `GET /api/logs` – List all logs

All HTTP requests to all services are logged using **Pino**,
and log entries are persisted in MongoDB, as required.

### Admin Service (port 3004)
- `GET /api/about` – Get developers team details  
  Returns first name and last name only.


## Computed Design Pattern

Monthly reports are computed dynamically from the **costs** collection.
If a report is requested for a month that has already passed,
it is saved in the **reports** collection to avoid recomputation.

Reports for the current or future month are generated on demand,
as required by the project specification.


## Validation and Error Handling

All endpoints validate incoming data.
Invalid input results in a JSON error response that includes
at least the following properties:

```json
{
  "id": <error_code>,
  "message": "<error description>"
}

## Logging

The system uses the Pino logging library.  
A log entry is created and stored in the MongoDB database  
for every HTTP request received by the server,  
as well as for each endpoint access,  
in accordance with the project requirements.


## Testing

The project was tested using automated tests written with **pytest**.  
The tests verify all required endpoints, including validation  
and error scenarios.

To enable the optional cleanup endpoints used by the tests,  
run the services with:

```bash
NODE_ENV=test

 Install dependencies:
```bash
npm install
Create a .env file and define the MONGODB_URI variable.

Run each process separately:

node src/users/app.js
node src/costs/app.js
node src/logs/app.js
node src/admin/app.js