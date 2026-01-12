const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connectDb');
const { logMiddleware } = require('../utils/logger');
const User = require('../models/userModel');
const Cost = require('../models/costModel');

dotenv.config();

const app = express();
app.use(express.json());

//++c: Log every HTTP request (required)
app.use(logMiddleware);

//++c: Route - Add User
app.post('/api/add', async (req, res) => {
  try {
    const { id, first_name, last_name, birthday } = req.body;

    //++c: Validate required fields
    if (!id || !first_name || !last_name || !birthday) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    const userId = Number(id);
    //++c: Validate id is numeric
    if (isNaN(userId)) return res.status(400).json({ id: 400, message: 'Invalid id' });

    //++c: Prevent duplicate users by id
    const exists = await User.findOne({ id: userId });
    if (exists) return res.status(400).json({ id: 400, message: 'User already exists' });

    //++c: Parse birthday into Date (supports different string formats)
    let parsedBirthday;
    if (birthday instanceof Date) {
      parsedBirthday = birthday;
    } else if (typeof birthday === 'string') {
      let cleaned = birthday.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
      cleaned = cleaned.replace(/,/g, ' ');
      parsedBirthday = new Date(cleaned);
      if (isNaN(parsedBirthday.getTime())) {
        parsedBirthday = new Date(birthday.replace(/,/g, ''));
      }
    } else {
      parsedBirthday = new Date(birthday);
    }

    if (!parsedBirthday || isNaN(parsedBirthday.getTime())) {
      return res.status(400).json({ id: 400, message: 'Invalid birthday format' });
    }

    //++c: Create new user document
    const newUser = await User.create({ id: userId, first_name, last_name, birthday: parsedBirthday });
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Route - Get User Details (first_name,last_name,id,total)
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const user = await User.findOne({ id: userId });
    //++c: If user id does not exist, return error JSON (id+message)
    if (!user) return res.status(404).json({ id: 404, message: 'User not found' });

    //++c: Compute total costs of the user
    const costs = await Cost.find({ userid: userId });
    let total = 0;
    costs.forEach((c) => { total += c.sum; });

    res.json({ first_name: user.first_name, last_name: user.last_name, id: user.id, total });
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Route - List all users (GET /api/users)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-__v -_id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Route - Delete user (used by unit tests cleanup)
app.delete('/removeuser', async (req, res) => {
  try {
    await User.deleteMany({ id: Number(req.body.id) });
    res.json({ status: 'success' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ id: 400, message: err.message });
  }
});

//++c: Deployment compatibility - prefer process.env.PORT
const PORT = process.env.PORT || process.env.PORT_USERS || 3001;

connectDb().then(() => {
  app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));
});
