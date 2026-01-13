const express = require('express');
const dotenv = require('dotenv');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

// Log every request (required)
app.use(logMiddleware);

// Shared handler for both /api/about and /api/about/
const aboutHandler = (req, res) => {
  const raw = process.env.TEAM_MEMBERS || '';

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

  const fallbackTeam = [
    { first_name: 'mosh', last_name: 'israeli' }
  ];

  res.json(team.length ? team : fallbackTeam);
};

// Support both variants for compatibility with external testers
app.get('/api/about', aboutHandler);
app.get('/api/about/', aboutHandler);

// Admin service does NOT require MongoDB connection
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
