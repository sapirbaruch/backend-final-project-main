// src/logs/app.js
const express = require('express');
const dotenv = require('dotenv');

const connectDb = require('../utils/connect-db');
const { logMiddleware } = require('../utils/logger');
const Log = require('../models/log-model');

dotenv.config();

const app = express();
app.use(express.json());

// Requirement: log every HTTP request (including this service itself)
app.use(logMiddleware);

/*
 * GET /api/logs
 * Returns all log documents from the logs collection.
 */
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find({});
    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ id: 500, message: err.message });
  }
});

const PORT = process.env.PORT_LOGS || 3003;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));
});
