require('dotenv').config();
const loadEnv = require('./config/env');
const connectDatabase = require('./config/database');
const createApp = require('./app');

async function start() {
  const config = loadEnv();
  await connectDatabase(config.mongoUri);
  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Neco Futsal API listening on port ${config.port}`);
  });

  const shutdown = () => server.close(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Unable to start API:', error.message);
  process.exitCode = 1;
});
