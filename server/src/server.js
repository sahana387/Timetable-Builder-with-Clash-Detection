require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Attempt database connection
    if (process.env.MONGODB_URI) {
      await connectDB(process.env.MONGODB_URI);
    } else {
      console.log('[Server] MONGODB_URI not specified. Attempting default local connection...');
      await connectDB();
    }
  } catch (err) {
    console.warn(`[Server] Starting HTTP server without active MongoDB connection: ${err.message}`);
  }

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`[Server] Timetable Builder API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[Server] Gracefully shutting down...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
