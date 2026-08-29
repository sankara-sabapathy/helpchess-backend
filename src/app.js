require('express-async-errors');

const config = require('config');
const boolParser = require('express-query-boolean');
const express = require('express');
const cors = require('utils/cors');

const logger = require('utils/logger');
const clsify = require('middlewares/clsify');
const correlationIdBinder = require('middlewares/correlationIdBinder');
const responseHandlers = require('middlewares/response');
const routes = require('routes');

const createApp = () => {
  const app = express();
  const trustedProxyLayers = config.get('trustProxy');

  if (process.env.NODE_ENV === 'development') {
    logger.info('Using CORS for Development.');
    app.use(cors);
  }

  app.set('port', config.get('port'));
  app.disable('x-powered-by');

  if (trustedProxyLayers) {
    app.set('trust proxy', trustedProxyLayers);
  }

  app.use(clsify());
  app.use(correlationIdBinder);
  app.use(responseHandlers);

  app.use(express.text({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(
    express.json({
      limit: '6mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(boolParser());
  app.use(routes);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error(err);
    res.serverError({});
  });

  return app;
};

module.exports = { createApp };
