// src/logs/app.js
const express = require('express');
const dotenv = require('dotenv');

// FIX PATHS: Go up one level (..) to 'src', then into 'utils' or 'models'
const connectDb = require('../utils/connect-db');
const Log = require('../models/log-model');

dotenv.config();
const app = express();
app.use(express.json());
app.use(require('../utils/logger').logMiddleware);

// Route: Get All Logs (Requirement: GET /api/logs)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find({});
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ id: 500, message: err.message });
  }
});

const PORT = process.env.PORT_LOGS || 3003;
connectDb().then(() => {
    app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));
});