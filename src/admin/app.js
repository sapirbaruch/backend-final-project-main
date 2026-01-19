const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

// Log every request (required)
app.use(logMiddleware);

// Shared handler for both /api/about and /api/about/
const aboutHandler = (req, res) => {
  const raw = (process.env.TEAM_MEMBERS || '').trim();

  // Requirement: names should not be stored in DB.
  // They should be provided via .env or be hardcoded in code.
  // In production, prefer TEAM_MEMBERS in env.
  if (!raw) {
    return res.status(500).json({
      id: 500,
      message: 'TEAM_MEMBERS is not configured in the environment (.env / Render env vars)'
    });
  }

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
    .filter((m) => m.first_name && m.last_name);

  if (team.length === 0) {
    return res.status(500).json({
      id: 500,
      message: 'TEAM_MEMBERS is configured but could not be parsed. Expected format: "First Last;First Last"'
    });
  }

  return res.status(200).json(team);
};

// Support both variants for compatibility with external testers
app.get('/api/about', aboutHandler);
app.get('/api/about/', aboutHandler);

const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;

// Connect to MongoDB so logMiddleware can persist logs
connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Admin Service failed to start (DB connection error):', err.message);
    process.exit(1);
  });
