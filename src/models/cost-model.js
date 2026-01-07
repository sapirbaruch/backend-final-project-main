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

  // When not provided, server uses request time (now)
  createdAt: { type: Date, default: Date.now, index: true },

  // Keep these for fast reporting, but compute them server-side
  year: { type: Number, index: true },
  month: { type: Number, index: true },
  day: { type: Number },

  description: { type: String, required: true },

  category: {
    type: String,
    enum: ['food', 'health', 'housing', 'sports', 'education'],
    required: true
  },

  /*
   * sum is stored as Number in Mongoose, which is persisted as BSON Double in MongoDB.
   * This satisfies the project requirement for Double type.
   */
  sum: {
    type: Number,
    required: true,
    validate: {
      validator: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
      message: 'sum must be a non-negative number'
    }
  }
});

costSchema.pre('save', async function (next) {
  try {
    // Auto-increment id
    if (!this.id) {
      this.id = await getNextSequenceValue('Cost', 'id');
    }

    // Compute year/month/day from createdAt (server-trusted)
    const d = this.createdAt ? new Date(this.createdAt) : new Date();
    this.createdAt = d;

    this.year = d.getFullYear();
    this.month = d.getMonth() + 1; // 1-12
    this.day = d.getDate();        // 1-31

    next();
  } catch (e) {
    next(e);
  }
});

const Cost = mongoose.model('Cost', costSchema);
Cost.createIndexes();

module.exports = Cost;
