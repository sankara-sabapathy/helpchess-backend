const { isValidObjectId } = require('mongoose');

const { error } = require('utils/logger');
const donationsService = require('services/donations');
const authService = require('services/auth');
const { parseCurrencyCode } = require('utils/sanitize');

const isValidDate = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!ymd) {
    return true;
  }

  const year = Number(ymd[1]);
  const month = Number(ymd[2]);
  const day = Number(ymd[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  return (
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day
  );
};

const parseFiniteAmount = (amount) => {
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    return NaN;
  }
  return Number(amount);
};

module.exports = {
  createManual: async (req, res) => {
    try {
      const {
        donorId,
        donor,
        amount,
        currency,
        utrNumber,
        donationDate,
        address,
        notes,
        cause,
        anonymous,
        donorMessage
      } = req.body;

      if (donorId !== undefined && donorId !== null && donorId !== '') {
        if (typeof donorId !== 'string' || !isValidObjectId(donorId)) {
          return res.invalid({ msg: 'Invalid donorId' });
        }
      } else if (!donor || typeof donor !== 'object' || Array.isArray(donor)) {
        return res.invalid({ msg: 'Either donorId or donor is required' });
      } else {
        if (!donor.name || typeof donor.name !== 'string' || donor.name.trim().length === 0) {
          return res.invalid({ msg: 'Invalid/Missing donor.name' });
        }
        if (
          !donor.email ||
          typeof donor.email !== 'string' ||
          !authService.isValidEmail(donor.email.trim())
        ) {
          return res.invalid({ msg: 'Invalid/Missing donor.email' });
        }
      }

      const parsedAmount = parseFiniteAmount(amount);
      if (
        amount === undefined ||
        amount === null ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount < 1
      ) {
        return res.invalid({ msg: 'Invalid/Missing amount' });
      }
      if (!utrNumber || typeof utrNumber !== 'string' || utrNumber.trim().length === 0) {
        return res.invalid({ msg: 'Invalid/Missing utrNumber' });
      }
      const parsedCurrency = parseCurrencyCode(currency);
      if (parsedCurrency === null) {
        return res.invalid({ msg: 'Invalid currency' });
      }
      if (donationDate !== undefined && !isValidDate(donationDate)) {
        return res.invalid({ msg: 'Invalid donationDate' });
      }
      if (address !== undefined && typeof address !== 'string') {
        return res.invalid({ msg: 'Invalid address' });
      }
      if (notes !== undefined && typeof notes !== 'string') {
        return res.invalid({ msg: 'Invalid notes' });
      }
      if (cause !== undefined && typeof cause !== 'string') {
        return res.invalid({ msg: 'Invalid cause' });
      }
      if (anonymous !== undefined && typeof anonymous !== 'boolean') {
        return res.invalid({ msg: 'Invalid anonymous' });
      }
      if (donorMessage !== undefined && typeof donorMessage !== 'string') {
        return res.invalid({ msg: 'Invalid donorMessage' });
      }

      const response = await donationsService.createManual({
        donationInput: {
          donorId: donorId || undefined,
          donor,
          amount: parsedAmount,
          currency: parsedCurrency,
          utrNumber,
          donationDate,
          address,
          notes,
          cause,
          anonymous,
          donorMessage
        },
        createdBy: req.userId
      });
      if (!response.ok || !response.data) {
        if (response.duplicate || response.invalid) {
          return res.invalid({ msg: response.msg });
        }
        return res.failure({ msg: response.msg || 'Unable to create donation!' });
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
        return res.invalid({ msg: 'Invalid/Missing donation id' });
      }

      const response = await donationsService.getById({ id });
      if (!response.ok || !response.data) {
        return res.invalid({ msg: response.msg || 'Donation not found' });
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
      const { utrNumber, donationDate, address, notes, currency, cause, anonymous, donorMessage } =
        req.body;

      if (!id || !isValidObjectId(id)) {
        return res.invalid({ msg: 'Invalid/Missing donation id' });
      }

      const parsedCurrency = parseCurrencyCode(currency);
      if (parsedCurrency === null) {
        return res.invalid({ msg: 'Invalid currency' });
      }

      const updateData = {};
      if (parsedCurrency) {
        updateData.currency = parsedCurrency;
      }
      if (utrNumber !== undefined) {
        if (typeof utrNumber !== 'string' || utrNumber.trim().length === 0) {
          return res.invalid({ msg: 'Invalid utrNumber' });
        }
        updateData.utrNumber = utrNumber;
      }
      if (donationDate !== undefined) {
        if (!isValidDate(donationDate)) {
          return res.invalid({ msg: 'Invalid donationDate' });
        }
        updateData.donationDate = donationDate;
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
      if (cause !== undefined) {
        if (typeof cause !== 'string') {
          return res.invalid({ msg: 'Invalid cause' });
        }
        updateData.cause = cause;
      }
      if (anonymous !== undefined) {
        if (typeof anonymous !== 'boolean') {
          return res.invalid({ msg: 'Invalid anonymous' });
        }
        updateData.anonymous = anonymous;
      }
      if (donorMessage !== undefined) {
        if (typeof donorMessage !== 'string') {
          return res.invalid({ msg: 'Invalid donorMessage' });
        }
        updateData.donorMessage = donorMessage;
      }

      if (Object.keys(updateData).length === 0) {
        return res.invalid({ msg: 'No valid fields to update' });
      }

      const response = await donationsService.patch({ id, updateData });
      if (!response.ok || !response.data) {
        if (response.duplicate || response.invalid) {
          return res.invalid({ msg: response.msg });
        }
        return res.failure({ msg: response.msg || 'Unable to update donation!' });
      }
      return res.success({ data: response.data });
    } catch (e) {
      error(e);
      return res.failure({ msg: 'Something went wrong!' });
    }
  }
};
