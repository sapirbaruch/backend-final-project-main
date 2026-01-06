const mongoose = require('mongoose');

// Define the schema for users collection 
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // The id property as Number 
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  birthday: { type: Date, required: true } // Must be Date 
});

module.exports = mongoose.model('User', userSchema);