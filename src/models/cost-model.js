const mongoose = require('mongoose');
const getNextSequenceValue = require('../utils/auto-increment');

const costSchema = new mongoose.Schema({
  id: { type: Number, unique: true },

  // Requirement: userid must be a Number
  userid: {
    type: Number,
    required: true,
    index: true
  },

  // Server-controlled creation date
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Stored for fast monthly reporting
  year: { type: Number, index: true },
  month: { type: Number, index: true },
  day: { type: Number },

  description: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: ['food', 'health', 'housing', 'sports', 'education'],
    required: true
  },

  /*
   * sum is stored as Number in Mongoose,
   * which is persisted as BSON Double in MongoDB.
   */
  sum: {
    type: Number,
    required: true,
    min: 0
  }
});

// Pre-save hook for auto-increment id and date breakdown
costSchema.pre('save', async function (next) {
  try {
    if (!this.id) {
      this.id = await getNextSequenceValue('Cost', 'id');
    }

    const d = new Date(this.createdAt);
    this.year = d.getFullYear();
    this.month = d.getMonth() + 1;
    this.day = d.getDate();

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Cost', costSchema);
