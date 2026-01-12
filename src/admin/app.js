const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connectDb');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

//++c: Log every HTTP request (required)
app.use(logMiddleware);

//++c: Route - Developers team (must NOT be stored in DB)
app.get('/api/about', (req, res) => {
  const team = [
    { first_name: 'mosh', last_name: 'israeli' }
  ];
  res.json(team);
});

//++c: Deployment compatibility - prefer process.env.PORT
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
});

module.exports = app;
