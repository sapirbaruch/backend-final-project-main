const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

/*
 * Database Connection Utility
 *
 * This module is responsible for establishing a connection to MongoDB.
 * The connection string is read from an environment variable (MONGODB_URI)
 * in order to avoid hardcoding sensitive credentials in the source code.
 */

// Read MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

// Fail fast if the connection string is missing
if (!MONGODB_URI) {
  console.error(
    'MONGODB_URI is not set. Please create a .env file or define the environment variable.'
  );
}

/*
 * Connect to MongoDB using Mongoose.
 *
 * - Uses async/await for clean asynchronous flow
 * - Wrapped in try/catch to handle connection errors gracefully
 * - Throws the error so the calling service can fail explicitly
 */
const connectDb = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error('Missing MONGODB_URI');
    }

  await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
});


    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    throw error;
  }
};

module.exports = connectDb;
