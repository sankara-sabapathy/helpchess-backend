const { error } = require('utils/logger');
const donorsModel = require('models/donors');
const donationsModel = require('models/donations');
const { sanitizeDonorFields } = require('utils/sanitize');
const authService = require('services/auth');

const resolveEmail = (sanitized) => {
  if (sanitized && authService.isValidEmail(sanitized)) {
    return sanitized;
  }
  return null;
};

module.exports = {
  search: async ({ q, page = 1, limit = 10 } = {}) => {
    try {
      const result = await donorsModel.search({ q, page, limit });
      if (!result) {
        return { ok: false, msg: 'Unable to fetch donors.' };
      }
      return { ok: true, data: result };
    } catch (e) {
      error(e);
      return { ok: false, msg: 'Something went wrong, we are looking into it!' };
    }
  },

  getById: async ({ id }) => {
    try {
      const donor = await donorsModel.getById({ id });
      if (!donor) {
        return { ok: false, msg: 'Donor not found.' };
      }

      const donationSummary = await donationsModel.aggregateByDonorId({ donorId: id });
      return { ok: true, data: { ...donor, donationSummary } };
    } catch (e) {
      error(e);
      return { ok: false, msg: 'Something went wrong, we are looking into it!' };
    }
  },

  create: async ({ donorData }) => {
    try {
      const sanitized = sanitizeDonorFields(donorData);
      if (!sanitized.name) {
        return { ok: false, msg: 'Invalid/Missing name' };
      }

      const email = resolveEmail(sanitized.email);
      if (!email) {
        return { ok: false, msg: 'Invalid/Missing email' };
      }
      sanitized.email = email;

      const donor = await donorsModel.create({ donorData: sanitized });
      if (!donor) {
        return { ok: false, msg: 'Unable to create donor!' };
      }
      return { ok: true, data: donor };
    } catch (e) {
      error(e);
      if (e.name === 'ValidationError') {
        return { ok: false, msg: e.message };
      }
      return { ok: false, msg: 'Something went wrong, we are looking into it!' };
    }
  },

  patch: async ({ id, updateData }) => {
    try {
      const existing = await donorsModel.getById({ id });
      if (!existing) {
        return { ok: false, msg: 'Donor not found.' };
      }

      const sanitized = sanitizeDonorFields(updateData, { allowEmpty: true });
      if (sanitized.name !== undefined && !sanitized.name) {
        return { ok: false, msg: 'Invalid name' };
      }
      if (updateData.email !== undefined) {
        const email = resolveEmail(sanitized.email);
        if (!email) {
          return { ok: false, msg: 'Invalid email' };
        }
        sanitized.email = email;
      }

      const donor = await donorsModel.patch({ id, updateData: sanitized });
      if (!donor) {
        return { ok: false, msg: 'Donor not found or unable to update.' };
      }
      return { ok: true, data: donor };
    } catch (e) {
      error(e);
      if (e.name === 'ValidationError') {
        return { ok: false, msg: e.message };
      }
      return { ok: false, msg: 'Something went wrong, we are looking into it!' };
    }
  }
};
