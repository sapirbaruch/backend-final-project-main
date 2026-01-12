const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');

dotenv.config();

const app = express();
app.use(express.json());

//Log every HTTP request (required)
app.use(logMiddleware);

//Route - Developers team (must NOT be stored in DB)
app.get('/api/about', (req, res) => {
  const team = [
    { first_name: 'mosh', last_name: 'israeli' }
  ];
  res.json(team);
});

//Deployment compatibility - prefer process.env.PORT
const PORT = process.env.PORT || process.env.PORT_ADMIN || 3004;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
});

module.exports = app;
