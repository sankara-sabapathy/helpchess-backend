const FIELD_LIMITS = {
  name: 200,
  email: 254,
  phone: 30,
  pan: 20,
  address: 500,
  notes: 2000,
  donorMessage: 2000,
  cause: 200,
  utrNumber: 64
};

const sanitizeString = (value, maxLength) => {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  return value.slice(0, maxLength).trim();
};

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
};

const sanitizeEmail = (value) => {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length <= FIELD_LIMITS.email) {
    return trimmed;
  }

  const at = trimmed.lastIndexOf('@');
  if (at <= 0) {
    return trimmed.slice(0, FIELD_LIMITS.email).trim();
  }

  const domain = trimmed.slice(at);
  const local = trimmed.slice(0, at);
  const maxLocal = FIELD_LIMITS.email - domain.length;
  if (maxLocal < 1) {
    return undefined;
  }

  return `${local.slice(0, maxLocal)}${domain}`;
};

const sanitizeDonorFields = (input = {}, { allowEmpty = false } = {}) => {
  const donorData = {};

  if (input.name !== undefined) {
    donorData.name = sanitizeString(input.name, FIELD_LIMITS.name);
  }
  if (input.email !== undefined) {
    donorData.email = sanitizeEmail(input.email);
  }
  if (input.phone !== undefined) {
    const phone = sanitizeString(input.phone, FIELD_LIMITS.phone);
    donorData.phone = allowEmpty ? phone : emptyToUndefined(phone);
  }
  if (input.pan !== undefined) {
    const pan = sanitizeString(input.pan, FIELD_LIMITS.pan);
    donorData.pan = allowEmpty ? pan : emptyToUndefined(pan);
  }
  if (input.address !== undefined) {
    const address = sanitizeString(input.address, FIELD_LIMITS.address);
    donorData.address = allowEmpty ? address : emptyToUndefined(address);
  }
  if (input.notes !== undefined) {
    const notes = sanitizeString(input.notes, FIELD_LIMITS.notes);
    donorData.notes = allowEmpty ? notes : emptyToUndefined(notes);
  }

  return donorData;
};

const sanitizeDonationFields = (input = {}, { allowEmpty = false } = {}) => {
  const donationData = {};

  if (input.utrNumber !== undefined) {
    donationData.utrNumber = sanitizeString(input.utrNumber, FIELD_LIMITS.utrNumber);
  }
  if (input.address !== undefined) {
    const address = sanitizeString(input.address, FIELD_LIMITS.address);
    donationData.address = allowEmpty ? address : emptyToUndefined(address);
  }
  if (input.notes !== undefined) {
    const notes = sanitizeString(input.notes, FIELD_LIMITS.notes);
    donationData.notes = allowEmpty ? notes : emptyToUndefined(notes);
  }
  if (input.donorMessage !== undefined) {
    const donorMessage = sanitizeString(input.donorMessage, FIELD_LIMITS.donorMessage);
    donationData.donorMessage = allowEmpty ? donorMessage : emptyToUndefined(donorMessage);
  }
  if (input.cause !== undefined) {
    const cause = sanitizeString(input.cause, FIELD_LIMITS.cause);
    donationData.cause = allowEmpty ? cause : emptyToUndefined(cause);
  }

  return donationData;
};

const parseCurrencyCode = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (!/^[A-Za-z]{3}$/.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
};

module.exports = {
  FIELD_LIMITS,
  sanitizeString,
  sanitizeEmail,
  emptyToUndefined,
  sanitizeDonorFields,
  sanitizeDonationFields,
  parseCurrencyCode
};
