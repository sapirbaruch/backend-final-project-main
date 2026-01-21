// Logs service: exposes stored HTTP request logs for diagnostics and monitoring.
const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const Log = require('../models/log_model');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

// Create Express application and enable JSON body parsing.
const app = express();
app.use(express.json());

// Middleware: log every incoming HTTP request to the logs collection.
app.use(logMiddleware);

// Endpoint: retrieve all stored logs for inspection or debugging purposes.
app.get('/api/logs', async (req, res) => {
  try {
    // Query all log entries and exclude MongoDB internal fields.
    const logs = await Log.find({}).select('-_id -__v');
    res.json(logs);
  } catch (err) {
    // Handle database or query errors and return a server error response.
    console.error(err);
    res.status(500).json({ id: 500, message: err.message });
  }
});

// Select port from environment variables with a fallback for local execution.
const PORT = process.env.PORT || process.env.PORT_LOGS || 3003;

// Connect to MongoDB and start the service only after a successful connection.
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));
});
