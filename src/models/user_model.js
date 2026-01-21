const mongoose = require('mongoose');

/*
 * User Model
 *
 * Represents a system user.
 * The user id is a numeric identifier, as required by the project specification.
 * This model stores only basic personal details (no authentication data).
//
 */

const userSchema = new mongoose.Schema({
  // Numeric user identifier (project requirement)
  id: {
    type: Number,
    required: true,
    unique: true,
//
    index: true
  },

  // User first name
  first_name: {
    type: String,
    required: true
  },
//

  // User last name
  last_name: {
    type: String,
    required: true
  },

  // User birth date
//
  birthday: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('User', userSchema);
