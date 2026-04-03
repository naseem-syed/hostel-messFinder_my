const mongoose = require('mongoose');

const connectDatabase = async () => {
  // Fallback to MongoDB Atlas if .env is missing or MONGO_URI is not set
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://admin:syedta@cluster0.qu5rimu.mongodb.net/hostel-mess-finder?retryWrites=true&w=majority';
  const maxRetries = Number(process.env.MONGO_RETRY_ATTEMPTS || 5);
  const retryDelayMs = Number(process.env.MONGO_RETRY_DELAY_MS || 5000);

  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Please set it in your environment.');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // 10 seconds to select server
        connectTimeoutMS: 10000, // 10 seconds to establish connection
        socketTimeoutMS: 45000, // 45 seconds for socket inactivity
        bufferCommands: false, // Disable buffering
        family: 4 // Force IPv4
      });
      console.log('MongoDB connected successfully');
      return mongoose.connection;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (isLastAttempt) {
        throw new Error('Unable to connect to MongoDB after multiple attempts.');
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

module.exports = connectDatabase;
