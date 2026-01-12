const Counter = require('../models/counter_model');

/*
 * Auto-uncrement Utility
 *
 * MongoDB does not support auto-increment fields natively.
 * This helper implements an auto-increment mechanism using a dedicated
 * "counters" collection, as required by the project specification.
 *
 * The function returns the next numeric value for a given model + field
 * combination in an atomic and safe manner.
 */

const getNextSequenceValue = async (modelName, fieldName) => {
  /*
   * findOneAndUpdate with $inc guarantees atomicity:
   * - The counter is incremented safely even under concurrent requests
   * - If the counter does not exist, it is created (upsert: true)
   */
  const counter = await Counter.findOneAndUpdate(
    { model: modelName, field: fieldName },
    { $inc: { count: 1 } },
    {
      new: true,      // return the updated document
      upsert: true    // create the document if it does not exist
    }
  );

  return counter.count;
};

module.exports = getNextSequenceValue;
