const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect-db');
const { logMiddleware, logger } = require('../utils/logger');

dotenv.config();
const app = express();

app.use(express.json());
app.use(logMiddleware);

/*
 * GET /api/about
 * Returns project team members.
 */
app.get('/api/about', (req, res) => {
  logger.info('Endpoint accessed: GET /api/about');

  res.json([
    { first_name: 'mosh', last_name: 'israeli' }
  ]);
});

const PORT = process.env.PORT_ADMIN || 3004;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
});
