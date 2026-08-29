const {
  FIELD_LIMITS,
  sanitizeString,
  sanitizeDonorFields,
  sanitizeDonationFields,
  sanitizeEmail
} = require('utils/sanitize');

describe('sanitize', () => {
  it('auto-truncates public-facing fields instead of rejecting them', () => {
    const name = `A${'x'.repeat(FIELD_LIMITS.name + 50)}`;
    const email = `${'long'.repeat(80)}@example.com`;
    const address = 'addr-'.repeat(200);

    const sanitized = sanitizeDonorFields({ name, email, address });

    expect(sanitized.name).toHaveLength(FIELD_LIMITS.name);
    expect(sanitized.email.length).toBeLessThanOrEqual(FIELD_LIMITS.email);
    expect(sanitized.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(sanitized.address.length).toBeLessThanOrEqual(FIELD_LIMITS.address);
  });

  it('truncates a long email without breaking local/domain', () => {
    const email = `${'a'.repeat(300)}@example.com`;
    const truncated = sanitizeEmail(email);

    expect(truncated.length).toBeLessThanOrEqual(FIELD_LIMITS.email);
    expect(truncated.endsWith('@example.com')).toBe(true);
    expect(truncated).toMatch(/^[^\s@]+@example\.com$/);
  });

  it('returns invalid when the domain leaves no room for a local part', () => {
    const email = `a@${'d'.repeat(FIELD_LIMITS.email)}.com`;
    expect(email.length).toBeGreaterThan(FIELD_LIMITS.email);
    expect(sanitizeEmail(email)).toBeUndefined();
    expect(sanitizeEmail(email)).not.toBe(email);
    expect(sanitizeEmail(email)).not.toBe(email.trim());
  });

  it('trims after slicing as specified', () => {
    expect(sanitizeString(`  hello${' '.repeat(10)}`, 7)).toBe('hello');
  });

  it('auto-truncates donorMessage without rejecting it', () => {
    const donorMessage = `hello ${'x'.repeat(FIELD_LIMITS.donorMessage + 80)}`;
    const sanitized = sanitizeDonationFields({
      donorMessage,
      notes: 'admin only'
    });

    expect(sanitized.donorMessage.length).toBeLessThanOrEqual(FIELD_LIMITS.donorMessage);
    expect(sanitized.notes).toBe('admin only');
    expect(sanitized.donorMessage).not.toBe(sanitized.notes);
  });

  it('auto-truncates cause without rejecting unknown values', () => {
    const cause = `School Chess ${'x'.repeat(FIELD_LIMITS.cause + 40)}`;
    const sanitized = sanitizeDonationFields({ cause });

    expect(sanitized.cause.length).toBeLessThanOrEqual(FIELD_LIMITS.cause);
    expect(sanitized.cause.startsWith('School Chess')).toBe(true);
  });

  it('preserves empty strings when allowEmpty is true for patch operations', () => {
    const donorSanitized = sanitizeDonorFields(
      { phone: '', pan: '', address: '', notes: '' },
      { allowEmpty: true }
    );
    expect(donorSanitized.phone).toBe('');
    expect(donorSanitized.pan).toBe('');
    expect(donorSanitized.address).toBe('');
    expect(donorSanitized.notes).toBe('');

    const donationSanitized = sanitizeDonationFields(
      { address: '', notes: '', donorMessage: '', cause: '' },
      { allowEmpty: true }
    );
    expect(donationSanitized.address).toBe('');
    expect(donationSanitized.notes).toBe('');
    expect(donationSanitized.donorMessage).toBe('');
    expect(donationSanitized.cause).toBe('');
  });
});
