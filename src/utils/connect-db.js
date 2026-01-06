const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Read MongoDB connection string from environment for security
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Create a .env file or set the environment variable MONGODB_URI');
}

// connect to the database
const connectDb = async () => {
  try {
    if (!MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas', error);
    throw error;
  }
};

module.exports = connectDb;
