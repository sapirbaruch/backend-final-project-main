const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connectDb');
const Log = require('../models/logModel');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

//++c: Log every HTTP request (required)
app.use(logMiddleware);

//++c: Route - Get all logs (GET /api/logs)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find({});
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ id: 500, message: err.message });
  }
});

//++c: Deployment compatibility - prefer process.env.PORT
const PORT = process.env.PORT || process.env.PORT_LOGS || 3003;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Logs Service running on port ${PORT}`));
});
