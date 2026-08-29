/* eslint-disable no-console, import/no-extraneous-dependencies */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'helpchess'
    }
  });

  console.log(`[MongoMemoryServer] Local MongoDB instance running at: ${mongoServer.getUri()}`);

  const shutdown = async () => {
    console.log('[MongoMemoryServer] Stopping Mongo...');
    await mongoServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[MongoMemoryServer] Failed to start:', err);
  process.exit(1);
});
