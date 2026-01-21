// Users service: handles user creation and retrieval, and aggregates total costs per user.
const express = require('express');
const dotenv = require('dotenv');
const connectDb = require('../utils/connect_db');
const { logMiddleware } = require('../utils/logger');
const User = require('../models/user_model');
const Cost = require('../models/cost_model');

dotenv.config();

// Create Express application and enable JSON request body parsing.
const app = express();
app.use(express.json());

// Middleware: log every incoming HTTP request for auditing and debugging.
app.use(logMiddleware);

/*
 Shared handler for adding a new user.
 Supports both /api/add and /api/add/ endpoints.
*/
const addUserHandler = async (req, res) => {
  try {
    // Extract user fields from the request body.
    const { id, first_name, last_name, birthday } = req.body;

    // Validate presence of all required fields.
    if (id === undefined || id === null || !first_name || !last_name || !birthday) {
      return res.status(400).json({ id: 400, message: 'Missing required fields' });
    }

    // Convert user id to a number and ensure it is valid.
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return res.status(400).json({ id: 400, message: 'Invalid id' });
    }

    // Prevent creation of duplicate users with the same logical id.
    const exists = await User.findOne({ id: numericId });
    if (exists) {
      return res.status(400).json({ id: 400, message: 'User already exists' });
    }

    // Parse birthday string into a Date object and validate its format.
    const parsedBirthday = new Date(birthday);
    if (isNaN(parsedBirthday.getTime())) {
      return res.status(400).json({ id: 400, message: 'Invalid birthday format' });
    }

    // Persist the new user in the database.
    const newUser = await User.create({
      id: numericId,
      first_name,
      last_name,
      birthday: parsedBirthday
    });

    // Return the created user while removing MongoDB internal fields.
    return res.status(201).json(
      newUser.toObject({
        versionKey: false,
        transform: function (doc, ret) {
          delete ret._id;
          return ret;
        }
      })
    );
  } catch (err) {
    // Handle validation or database errors.
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
};

// Register add-user endpoint (with and without trailing slash).
app.post('/api/add', addUserHandler);
app.post('/api/add/', addUserHandler);

/*
 Get details of a specific user, including the aggregated total of all their costs.
*/
app.get('/api/users/:id', async (req, res) => {
  try {
    // Parse and validate the user id from the URL path.
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ id: 400, message: 'Invalid user id' });
    }

    // Retrieve the user document from the database.
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ id: 404, message: 'User not found' });
    }

    // Retrieve all cost entries for the user and sum their values.
    const costs = await Cost.find({ userid: userId }).select('sum');
    let total = 0;
    costs.forEach((c) => {
      total += Number(c.sum) || 0;
    });

    // Round the total to two decimal places and return it as a number.
    const totalRounded = Number(total.toFixed(2));

    // Return only the required user fields and the computed total.
    return res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total: totalRounded
    });
  } catch (err) {
    // Handle aggregation or database errors.
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 List all users stored in the system.
*/
app.get('/api/users', async (req, res) => {
  try {
    // Retrieve all users while excluding MongoDB internal fields.
    const users = await User.find({}).select('-_id -__v');
    return res.json(users);
  } catch (err) {
    // Handle query errors.
    console.error(err);
    return res.status(400).json({ id: 400, message: err.message });
  }
});

/*
 Cleanup endpoint used only in automated tests (not part of the production API).
*/
if (process.env.NODE_ENV === 'test') {
  app.delete('/removeuser', async (req, res) => {
    try {
      // Remove test users by logical user id.
      await User.deleteMany({ id: Number(req.body.id) });
      return res.json({ status: 'success' });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ id: 400, message: err.message });
    }
  });
}

// Select port from environment variables with a fallback for local development.
const PORT = process.env.PORT || process.env.PORT_USERS || 3001;

// Connect to MongoDB and start the service after a successful connection.
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));
});
