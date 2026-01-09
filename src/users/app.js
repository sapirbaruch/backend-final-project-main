const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect-db');
const { logMiddleware, logger } = require('../utils/logger');
const User = require('../models/user-model');
const Cost = require('../models/cost-model');

dotenv.config();
const app = express();

app.use(express.json());
app.use(logMiddleware);

/*
 * POST /api/add
 * Adds a new user.
 */
app.post('/api/add', async (req, res) => {
  logger.info('Endpoint accessed: POST /api/add');

  try {
    const { id, first_name, last_name, birthday } = req.body;

    if (!id || !first_name || !last_name || !birthday) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const userId = Number(id);
    if (isNaN(userId)) {
      return res.status(400).json({ id: 400, message: 'Invalid id' });
    }

    const exists = await User.findOne({ id: userId });
    if (exists) {
      return res.status(400).json({ id: 400, message: 'User already exists' });
    }

    let parsedBirthday = new Date(
      birthday.toString().replace(/(\d+)(st|nd|rd|th)/gi, '$1').replace(/,/g, ' ')
    );

    if (isNaN(parsedBirthday.getTime())) {
      return res.status(400).json({ id: 400, message: 'Invalid birthday format' });
    }

    const newUser = await User.create({
      id: userId,
      first_name,
      last_name,
      birthday: parsedBirthday
    });

    return res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * GET /api/users/:id
 * Returns user details and total costs.
 */
app.get('/api/users/:id', async (req, res) => {
  logger.info('Endpoint accessed: GET /api/users/:id');

  try {
    const userId = Number(req.params.id);
    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ id: 404, message: 'User not found' });
    }

    const costs = await Cost.find({ userid: userId });
    const total = costs.reduce((sum, c) => sum + c.sum, 0);

    return res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * GET /api/users
 * Returns all users.
 */
app.get('/api/users', async (req, res) => {
  logger.info('Endpoint accessed: GET /api/users');

  try {
    const users = await User.find({}).select('-_id -__v');
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 * DELETE /removeuser
 * Required for automated tests cleanup.
 */
app.delete('/removeuser', async (req, res) => {
  logger.info('Endpoint accessed: DELETE /removeuser');

  try {
    await User.deleteMany({ id: Number(req.body.id) });
    return res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

const PORT = process.env.PORT_USERS || 3001;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));
});
