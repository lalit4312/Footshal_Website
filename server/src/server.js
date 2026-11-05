require('dotenv').config();
const mongoose = require('mongoose');
const loadEnv = require('./config/env');
const connectDatabase = require('./config/database');
const createApp = require('./app');

const config = loadEnv();
const app = createApp(config);
let databaseConnection;

function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!databaseConnection) {
    databaseConnection = connectDatabase(config.mongoUri)
      .then(() => {
        mongoose.connection.once('disconnected', () => {
          databaseConnection = null;
        });
      })
      .catch((error) => {
        databaseConnection = null;
        throw error;
      });
  }
  return databaseConnection;
}

async function handler(req, res) {
  if (req.method === 'GET' && new URL(req.url, 'http://localhost').pathname === '/api/health') {
    try {
      await ensureDatabaseConnection();
      return res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
      console.error('API health check database connection failed:', error.message);
      return res.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
  }

  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    console.error('Unable to connect API database:', error.message);
    if (!res.headersSent) {
      res.status(503).json({ error: { message: 'Database unavailable' } });
    }
  }
}

module.exports = handler;

async function start() {
  await ensureDatabaseConnection();
  const server = app.listen(config.port, () => {
    console.log(`Neco Futsal API listening on port ${config.port}`);
  });
  server.on('error', (error) => {
    console.error(`Unable to listen on port ${config.port}:`, error.message);
    mongoose.disconnect().catch((disconnectError) => {
      console.error('Unable to close database connection:', disconnectError.message);
    }).finally(() => {
      process.exitCode = 1;
    });
  });

  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start API:', error.message);
    process.exitCode = 1;
  });
}
