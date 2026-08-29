require('dotenv-safe').config({ allowEmptyValues: true });
const config = require('config');
const jwt = require('jsonwebtoken');

const { error } = require('utils/logger');
const { parseCookie } = require('utils/commonFunctions');
const { ACCESS_TOKEN_COOKIE } = require('utils/tokens');
const usersModel = require('models/users');

const INTERNAL_JWT_COOKIE = config.get('cookies.internalJwt');

const verifyAccessCookieAuth =
  (isOptional = false) =>
  async (req, res, next) => {
    try {
      const cookieString = req.headers.cookie;

      if (!cookieString) {
        return isOptional ? next() : res.unauthorized({});
      }

      const { [ACCESS_TOKEN_COOKIE]: accessToken } = parseCookie({ cookieString });

      if (!accessToken) {
        return isOptional ? next() : res.unauthorized({});
      }

      try {
        const data = jwt.verify(accessToken, config.get('accessJwtSecret'));

        req.userId = data.userId;
        return next();
      } catch (jwtError) {
        if (isOptional) {
          return next();
        }
        return res.unauthorized({});
      }
    } catch (e) {
      if (isOptional) {
        return next();
      }

      return res.unauthorized({});
    }
  };

// authentication middlewares
module.exports = {
  /**
   * Basic service-to-service auth using a static access token
   * passed in the Authorization header.
   */
  authenticate: async (req, res, next) => {
    const configuredToken = config.get('accessToken');
    const authHeader = req.header('Authorization');
    if (configuredToken && authHeader && authHeader === configuredToken) {
      next();
      return;
    }
    res.unauthorized({});
  },

  /**
   * User auth via an access-token JWT cookie. Sets req.userId.
   */
  authenticateByCookie: verifyAccessCookieAuth(false),

  /**
   * Same as authenticateByCookie, but lets the request through
   * without req.userId when no valid cookie is present.
   */
  authenticateByCookieOptional: verifyAccessCookieAuth(true),

  /**
   * Auth for internal (back-office) users via a separate JWT cookie.
   * Sets req.userId, meant to be paired with authorizeInternalAccess.
   */
  authenticateByCookieInternal: async (req, res, next) => {
    try {
      const cookieString = req.headers.cookie;

      if (!cookieString) {
        return res.unauthorized({});
      }

      const { [INTERNAL_JWT_COOKIE]: internalJwt } = parseCookie({ cookieString });

      if (!internalJwt) {
        return res.unauthorized({});
      }

      const data = jwt.verify(internalJwt, config.get('refreshJwtSecret'));
      req.userId = data.userId;
      return next();
    } catch (e) {
      error(e);
      return res.unauthorized({});
    }
  },

  /**
   * Middleware to authorize internal API access based on roles/permissions.
   * Users with admin role bypass all permission checks.
   * @param {string|string[]} requiredPermissions - Permission or array of permissions required to access the route.
   * @returns {function} Express middleware
   */
  authorizeInternalAccess: (requiredPermissions) => async (req, res, next) => {
    try {
      const { userId } = req;

      if (!userId) {
        return res.unauthorized({ msg: 'User not authenticated' });
      }

      const user = await usersModel.getByIdWithRole({ userId });

      if (!user) {
        return res.unauthorized({ msg: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.unauthorized({ msg: 'Account is not active' });
      }

      const role = user.roleId;
      if (!role) {
        return res.forbidden({ msg: 'Insufficient permissions' });
      }

      const userPermissions = role.permissions || [];
      const isAdmin = role.code === config.get('internalAccess.roles.admin');

      if (isAdmin) {
        req.userPermissions = userPermissions;
        req.isAdmin = true;
        req.userRole = role;
        return next();
      }

      const hasPermissions = Array.isArray(requiredPermissions)
        ? requiredPermissions.some((permission) => userPermissions.includes(permission))
        : userPermissions.includes(requiredPermissions);

      if (!hasPermissions) {
        return res.forbidden({ msg: 'Insufficient permissions' });
      }

      req.userPermissions = userPermissions;
      req.isAdmin = false;
      req.userRole = role;
      return next();
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Failed to check permissions' });
    }
  }
};
