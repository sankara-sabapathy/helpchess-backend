require('app-module-path').addPath(require('path').resolve(__dirname));
require('dotenv-safe').config({ allowEmptyValues: true });
require('models/db');

const gracefulShutdown = require('http-graceful-shutdown');

const logger = require('utils/logger');
const winstonLogger = require('utils/winstonLogger');
const { createApp } = require('app');

const app = createApp();

const server = app.listen(app.get('port'), () =>
  logger.info(
    `Server started. Listening on port ${app.get('port')} in ${process.env.NODE_ENV} environment.`
  )
);

const shutdownCleanup = async (signal) => {
  logger.info(`Received ${signal}, shutting down...`);
  // eslint-disable-next-line no-promise-executor-return
  const loggerDone = new Promise((resolve) => winstonLogger.on('finish', resolve));
  winstonLogger.end();

  return loggerDone;
};

gracefulShutdown(server, { onShutdown: shutdownCleanup, timeout: 5000 });

process.on('unhandledRejection', (err) => {
  logger.error(err);
  process.exit(1);
});
