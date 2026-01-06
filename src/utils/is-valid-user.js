const User = require('../models/user-model');

// Check if user exists in the mongoDB database
const isValidUser = async (userId, res) => {
  const user = await User.findOne({ id: userId });
  if (!user) {
    // Change 'status' to 'id' to meet requirements
    res.status(400).json({
      id: 400, 
      message: 'User not found'
    });
    return false;
  }
  return true;
};

module.exports = isValidUser;