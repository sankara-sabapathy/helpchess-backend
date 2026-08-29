jest.mock('config', () => {
  const actual = jest.requireActual('config');
  return {
    get: jest.fn((key) => actual.get(key)),
    has: jest.fn((key) => actual.has(key)),
    util: actual.util
  };
});

const config = require('config');
const { authenticate } = require('middlewares/auth');

describe('auth middlewares', () => {
  describe('authenticate (service-to-service token)', () => {
    it('calls next when valid static token is supplied', async () => {
      const req = {
        header: jest.fn().mockReturnValue(config.get('accessToken'))
      };
      const res = {
        unauthorized: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.unauthorized).not.toHaveBeenCalled();
    });

    it('returns unauthorized when authorization header is missing or empty', async () => {
      const reqEmpty = {
        header: jest.fn().mockReturnValue('')
      };
      const res = {
        unauthorized: jest.fn()
      };
      const next = jest.fn();

      await authenticate(reqEmpty, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.unauthorized).toHaveBeenCalled();

      const reqMissing = {
        header: jest.fn().mockReturnValue(undefined)
      };
      await authenticate(reqMissing, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.unauthorized).toHaveBeenCalledTimes(2);
    });

    it('returns unauthorized when authorization header does not match', async () => {
      const req = {
        header: jest.fn().mockReturnValue('wrong-token')
      };
      const res = {
        unauthorized: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.unauthorized).toHaveBeenCalled();
    });

    it('rejects unauthenticated requests even if accessToken is empty string in config', async () => {
      config.get.mockImplementation((key) => (key === 'accessToken' ? '' : ''));
      const req = {
        header: jest.fn().mockReturnValue('')
      };
      const res = {
        unauthorized: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.unauthorized).toHaveBeenCalled();
    });
  });
});
