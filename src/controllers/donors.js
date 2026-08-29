const { isValidObjectId } = require('mongoose');

const { error } = require('utils/logger');
const donorsService = require('services/donors');
const authService = require('services/auth');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parseStrictPositiveInt = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return NaN;
  }
  return Number(value);
};

module.exports = {
  getAll: async (req, res) => {
    try {
      const { q, page, limit } = req.query;

      let parsedPage = DEFAULT_PAGE;
      if (page !== undefined && page !== null) {
        parsedPage = parseStrictPositiveInt(page);
        if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
          return res.invalid({ msg: 'Invalid page' });
        }
      }

      let parsedLimit = DEFAULT_LIMIT;
      if (limit !== undefined && limit !== null) {
        parsedLimit = parseStrictPositiveInt(limit);
        if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > MAX_LIMIT) {
          return res.invalid({ msg: 'Invalid limit' });
        }
      }

      if (q !== undefined && typeof q !== 'string') {
        return res.invalid({ msg: 'Invalid q' });
      }

      const response = await donorsService.search({
        q,
        page: parsedPage,
        limit: parsedLimit
      });
      if (!response.ok || !response.data) {
        return res.failure({ msg: 'Unable to fetch donors!' });
      }
      return res.success({ data: response.data });
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Something went wrong!' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, email, phone, pan, address, notes } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.invalid({ msg: 'Invalid/Missing name' });
      }
      if (!email || typeof email !== 'string' || !authService.isValidEmail(email.trim())) {
        return res.invalid({ msg: 'Invalid/Missing email' });
      }
      if (phone !== undefined && typeof phone !== 'string') {
        return res.invalid({ msg: 'Invalid phone' });
      }
      if (pan !== undefined && typeof pan !== 'string') {
        return res.invalid({ msg: 'Invalid pan' });
      }
      if (address !== undefined && typeof address !== 'string') {
        return res.invalid({ msg: 'Invalid address' });
      }
      if (notes !== undefined && typeof notes !== 'string') {
        return res.invalid({ msg: 'Invalid notes' });
      }

      const response = await donorsService.create({
        donorData: { name, email, phone, pan, address, notes }
      });
      if (!response.ok || !response.data) {
        return res.failure({ msg: response.msg || 'Unable to create donor!' });
      }
      return res.success({ data: response.data });
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Something went wrong!' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !isValidObjectId(id)) {
        return res.invalid({ msg: 'Invalid/Missing donor id' });
      }

      const response = await donorsService.getById({ id });
      if (!response.ok || !response.data) {
        return res.invalid({ msg: response.msg || 'Donor not found' });
      }
      return res.success({ data: response.data });
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Something went wrong!' });
    }
  },

  patch: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, pan, address, notes } = req.body;

      if (!id || !isValidObjectId(id)) {
        return res.invalid({ msg: 'Invalid/Missing donor id' });
      }

      const updateData = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return res.invalid({ msg: 'Invalid name' });
        }
        updateData.name = name;
      }
      if (email !== undefined) {
        if (typeof email !== 'string' || !authService.isValidEmail(email.trim())) {
          return res.invalid({ msg: 'Invalid email' });
        }
        updateData.email = email;
      }
      if (phone !== undefined) {
        if (typeof phone !== 'string') {
          return res.invalid({ msg: 'Invalid phone' });
        }
        updateData.phone = phone;
      }
      if (pan !== undefined) {
        if (typeof pan !== 'string') {
          return res.invalid({ msg: 'Invalid pan' });
        }
        updateData.pan = pan;
      }
      if (address !== undefined) {
        if (typeof address !== 'string') {
          return res.invalid({ msg: 'Invalid address' });
        }
        updateData.address = address;
      }
      if (notes !== undefined) {
        if (typeof notes !== 'string') {
          return res.invalid({ msg: 'Invalid notes' });
        }
        updateData.notes = notes;
      }

      if (Object.keys(updateData).length === 0) {
        return res.invalid({ msg: 'No valid fields to update' });
      }

      const response = await donorsService.patch({ id, updateData });
      if (!response.ok || !response.data) {
        return res.failure({ msg: response.msg || 'Unable to update donor!' });
      }
      return res.success({ data: response.data });
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Something went wrong!' });
    }
  }
};
