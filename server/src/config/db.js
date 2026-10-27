const mongoose = require('mongoose');

/**
 * Connect to MongoDB database.
 * @param {string} [uri] - Optional MongoDB connection URI override.
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable_builder';
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected.');
  } catch (error) {
    console.error(`[MongoDB] Disconnect error: ${error.message}`);
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
