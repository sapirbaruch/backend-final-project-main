const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userid: { type: Number, required: true }, 
  year: { type: Number, required: true },
  month: { type: Number, required: true }, 
  costs: { type: Array, required: true } // Array of objects grouped by category 
});

module.exports = mongoose.model('Report', reportSchema); 