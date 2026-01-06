const User = require('../models/user-model');
const Cost = require('../models/cost-model');

// Helper function for error responses
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ id: statusCode, message });
};

// GET /api/users/:id
// Requirement: Get specific user details + total costs
const getUserDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findOne({ id });
    if (!user) return sendError(res, 404, 'User not found');

    // Calculate total costs for this user
    const costs = await Cost.find({ userid: id });
    const total = costs.reduce((acc, curr) => acc + curr.sum, 0);

    res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      id: user.id,
      total
    });
  } catch (error) {
    sendError(res, 500, 'Server Error');
  }
};

// GET /api/users
// Requirement: List of Users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    sendError(res, 500, 'Server Error');
  }
};

// POST /api/adduser
// Requirement: Add a new user
const createUser = async (req, res) => {
  const { id, first_name, last_name, birthday } = req.body;
  if (!id || !first_name || !last_name || !birthday) {
    return sendError(res, 400, 'Missing fields');
  }
  try {
    const exists = await User.findOne({ id });
    if (exists) return sendError(res, 400, 'User already exists');

    const user = await User.create({ id, first_name, last_name, birthday });
    res.status(201).json(user);
  } catch (error) {
    sendError(res, 500, error.message);
  }
};

// DELETE /api/removeuser
// Requirement: Needed for the Python Test Script cleanup
const removeUser = async (req, res) => {
  try {
    const { id } = req.body;
    await User.deleteOne({ id });
    res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    sendError(res, 500, 'Server Error');
  }
};

// GET /api/about
// Requirement: Developers Team
const getDevelopers = (req, res) => {
  res.json([
    { first_name: 'Elad', last_name: 'Asaf' },
    { first_name: 'Lidar', last_name: 'Baruch' }
  ]);
};

module.exports = { getUserDetails, getUsers, createUser, removeUser, getDevelopers };