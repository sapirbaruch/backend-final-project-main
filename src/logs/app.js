const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const Log = require('../models/log_model');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

// Log every request
app.use(logMiddleware);

// Retrieve all logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find({}).select('-__v');
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ id: 500, message: err.message });
  }
});

const PORT = process.env.PORT || process.env.PORT_LOGS || 3003;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));
});
