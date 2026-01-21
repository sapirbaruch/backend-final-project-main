// Admin service: exposes the /api/about endpoint that returns the team members list.
const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

// Create Express app and enable JSON body parsing for incoming requests.
const app = express();
app.use(express.json());

// Middleware: log every HTTP request (course requirement), typically saved to DB via logger.
app.use(logMiddleware);

// Shared handler used by both /api/about and /api/about/ for compatibility with testers.
const aboutHandler = (req, res) => {
  // Read the team members list from environment variables (not from the database).
  // Expected format example: "First Last;First Last" (semicolon-separated).
  const raw = (process.env.TEAM_MEMBERS || '').trim();

  // If TEAM_MEMBERS is missing, return a clear server error to help debugging deployment config.
  if (!raw) {
    return res.status(500).json({
      id: 500,
      message: 'TEAM_MEMBERS is not configured in the environment (.env / Render env vars)'
    });
  }

  // Parse TEAM_MEMBERS into an array of objects with { first_name, last_name } only.
  // Steps: split by ';', trim, remove empty entries, then split each full name by whitespace.
  const team = raw
    .split(';')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((fullName) => {
      const parts = fullName.split(/\s+/).filter(Boolean);
      return {
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || ''
      };
    })
    // Filter out invalid entries where first/last name could not be extracted.
    .filter((m) => m.first_name && m.last_name);

  // If parsing produced no valid members, return error explaining the expected input format.
  if (team.length === 0) {
    return res.status(500).json({
      id: 500,
      message: 'TEAM_MEMBERS is configured but could not be parsed. Expected format: "First Last;First Last"'
    });
  }

  // Success: return the team list (only first_name and last_name; no extra fields).
  return res.status(200).json(team);
};

// Register routes (both with and without trailing slash) to avoid test mismatches.
app.get('/api/about', aboutHandler);
app.get('/api/about/', aboutHandler);

// Choose a port: prefer a general PORT, otherwise a service-specific PORT_ADMIN, fallback to 3004.
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;

// Connect to MongoDB so logMiddleware can persist logs; start server only after DB is ready.
connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
  })
  .catch((err) => {
    // If DB connection fails, print the error and exit so deployment sees the failure immediately.
    console.error('Admin Service failed to start (DB connection error):', err.message);
    process.exit(1);
  });
