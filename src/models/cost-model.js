const mongoose = require('mongoose');
const getNextSequenceValue = require('../utils/auto-increment');

const costSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  // Requirement: userid must be a Number 
  userid: {
    type: Number,
    required: [true, 'Cost must have a user id'],
    index: true
  },
  year: { type: Number, required: true, index: true },
  month: { type: Number, required: true, index: true },
  day: { type: Number, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['food', 'health', 'housing', 'sports', 'education'],
    required: true
  },
  // Requirement: sum type is Double 
  sum: { type: Double, required: true }
});

costSchema.pre('save', async function (next) {
  if (!this.id) {
    this.id = await getNextSequenceValue('Cost', 'id');
  }
  next();
});

const Cost = mongoose.model('Cost', costSchema);
Cost.createIndexes();

module.exports = Cost;