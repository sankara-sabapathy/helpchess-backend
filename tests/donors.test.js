const config = require('config');
const mongoose = require('mongoose');

const donationsModel = require('models/donations');
const donorsModel = require('models/donors');
const { FIELD_LIMITS } = require('utils/sanitize');
const {
  startTestApp,
  stopTestApp,
  clearDb,
  createAuthedUser,
  request,
  getApp
} = require('./helpers');

const PERMISSIONS = config.get('internalAccess.permissions');

describe('donors API', () => {
  let cookie;
  let user;

  beforeAll(async () => {
    await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    await clearDb();
    ({ cookie, user } = await createAuthedUser({
      permissions: [PERMISSIONS.donorsRead, PERMISSIONS.donorsWrite]
    }));
  });

  const createDonor = (body, authCookie = cookie) =>
    request().post('/v1/donors').set('Cookie', authCookie).send(body);

  it('rejects unauthenticated donor search', async () => {
    const res = await request().get('/v1/donors');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('rejects donor search without donors.read', async () => {
    const { cookie: writeOnly } = await createAuthedUser({
      permissions: [PERMISSIONS.donorsWrite],
      roleCode: 'write-only'
    });
    const res = await request().get('/v1/donors').set('Cookie', writeOnly);
    expect(res.status).toBe(403);
  });

  it('creates a donor profile and truncates oversized public fields', async () => {
    const longName = `Viswanathan ${'Anand '.repeat(40)}`;
    const longAddress = 'Chess Colony, Chennai. '.repeat(40);

    const res = await createDonor({
      name: longName,
      email: 'anand@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
      address: longAddress,
      notes: 'Grandmaster donor'
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name.length).toBeLessThanOrEqual(200);
    expect(res.body.data.email).toBe('anand@example.com');
    expect(res.body.data.phone).toBe('9876543210');
    expect(res.body.data.pan).toBe('ABCDE1234F');
    expect(res.body.data.address.length).toBeLessThanOrEqual(500);
    expect(res.body.data.notes).toBe('Grandmaster donor');
    expect(res.body.data).not.toHaveProperty('taxExemptionEligible');
    expect(res.body.data).not.toHaveProperty('totalDonationsCount');
    expect(res.body.data).not.toHaveProperty('totalDonatedAmount');
  });

  it('accepts an oversized email without 400 and stores a valid truncated address', async () => {
    const longEmail = `${'a'.repeat(300)}@example.com`;
    const res = await createDonor({
      name: 'Long Email Donor',
      email: longEmail
    });

    expect(res.body.ok).toBe(true);
    expect(res.body.data.email.length).toBeLessThanOrEqual(254);
    expect(res.body.data.email).toMatch(/^[^\s@]+@example\.com$/);
    expect(res.body.data.email.includes('@')).toBe(true);
  });

  it('rejects an email whose domain leaves no room for a local part', async () => {
    const email = `a@${'d'.repeat(FIELD_LIMITS.email)}.com`;
    const res = await createDonor({
      name: 'Oversized Domain',
      email
    });

    expect(res.body.ok).toBe(false);
    expect(res.body.err).toMatch(/email/i);
    expect(res.body.data).toBeNull();

    expect(mongoose.model('donors').schema.path('email').options.maxlength).toBe(
      FIELD_LIMITS.email
    );

    await expect(
      donorsModel.create({
        donorData: { name: 'Bypass Sanitize', email }
      })
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('requires name and email when creating a donor', async () => {
    const missingName = await createDonor({ email: 'x@example.com' });
    expect(missingName.body.ok).toBe(false);
    expect(missingName.body.err).toMatch(/name/i);

    const missingEmail = await createDonor({ name: 'Someone' });
    expect(missingEmail.body.ok).toBe(false);
    expect(missingEmail.body.err).toMatch(/email/i);
  });

  it('searches donors by name, email, or phone with page and limit', async () => {
    await createDonor({
      name: 'Magnus Carlsen',
      email: 'magnus@example.com',
      phone: '1111111111'
    });
    await createDonor({
      name: 'Hikaru Nakamura',
      email: 'hikaru@example.com',
      phone: '2222222222'
    });
    await createDonor({
      name: 'Praggnanandhaa R',
      email: 'pragg@example.com',
      phone: '3333333333'
    });

    const byName = await request()
      .get('/v1/donors')
      .query({ q: 'magnus', page: 1, limit: 10 })
      .set('Cookie', cookie);
    expect(byName.body.ok).toBe(true);
    expect(byName.body.data.items).toHaveLength(1);
    expect(byName.body.data.items[0].name).toBe('Magnus Carlsen');
    expect(byName.body.data.page).toBe(1);
    expect(byName.body.data.limit).toBe(10);
    expect(byName.body.data.total).toBe(1);

    const byEmail = await request().get('/v1/donors').query({ q: 'hikaru@' }).set('Cookie', cookie);
    expect(byEmail.body.data.items).toHaveLength(1);
    expect(byEmail.body.data.items[0].email).toBe('hikaru@example.com');

    const byPhone = await request().get('/v1/donors').query({ q: '3333' }).set('Cookie', cookie);
    expect(byPhone.body.data.items).toHaveLength(1);
    expect(byPhone.body.data.items[0].name).toBe('Praggnanandhaa R');

    const paged = await request()
      .get('/v1/donors')
      .query({ page: 2, limit: 2 })
      .set('Cookie', cookie);
    expect(paged.body.data.items).toHaveLength(1);
    expect(paged.body.data.total).toBe(3);
    expect(paged.body.data.totalPages).toBe(2);

    const defaults = await request().get('/v1/donors').set('Cookie', cookie);
    expect(defaults.body.data.page).toBe(1);
    expect(defaults.body.data.limit).toBe(10);
  });

  it('rejects non-integer page and limit query params', async () => {
    const fractional = await request()
      .get('/v1/donors')
      .query({ page: '1.5' })
      .set('Cookie', cookie);
    expect(fractional.body.ok).toBe(false);
    expect(fractional.body.err).toMatch(/page/i);

    const leadingZero = await request()
      .get('/v1/donors')
      .query({ page: '01' })
      .set('Cookie', cookie);
    expect(leadingZero.body.ok).toBe(false);
    expect(leadingZero.body.err).toMatch(/page/i);

    const emptyPage = await request().get('/v1/donors?page=').set('Cookie', cookie);
    expect(emptyPage.body.ok).toBe(false);
    expect(emptyPage.body.err).toMatch(/page/i);

    const overLimit = await request()
      .get('/v1/donors')
      .query({ limit: '101' })
      .set('Cookie', cookie);
    expect(overLimit.body.ok).toBe(false);
    expect(overLimit.body.err).toMatch(/limit/i);

    const emptyLimit = await request().get('/v1/donors?limit=').set('Cookie', cookie);
    expect(emptyLimit.body.ok).toBe(false);
    expect(emptyLimit.body.err).toMatch(/limit/i);
  });

  it('returns donor details with on-demand donation summary', async () => {
    const created = await createDonor({
      name: 'Gukesh D',
      email: 'gukesh@example.com',
      address: 'Chennai'
    });
    const donorId = created.body.data._id;

    const { cookie: donationCookie } = await createAuthedUser({
      permissions: [PERMISSIONS.donationsWrite],
      roleCode: 'donations-writer'
    });

    const first = await request().post('/v1/donations/manual').set('Cookie', donationCookie).send({
      donorId,
      amount: 5000,
      utrNumber: 'SBIN111111111',
      address: 'Chennai'
    });
    expect(first.body.ok).toBe(true);
    const second = await request().post('/v1/donations/manual').set('Cookie', donationCookie).send({
      donorId,
      amount: 2500,
      utrNumber: 'SBIN222222222'
    });
    expect(second.body.ok).toBe(true);

    const res = await request().get(`/v1/donors/${donorId}`).set('Cookie', cookie);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Gukesh D');
    expect(res.body.data.donationSummary).toEqual([{ currency: 'INR', amount: 7500, count: 2 }]);
  });

  it('groups captured donation totals by currency without mixing units', async () => {
    const created = await createDonor({
      name: 'Multi Currency',
      email: 'multi-currency@example.com'
    });
    const donorId = created.body.data._id;

    await donationsModel.ManualBankDonation.create({
      donorId,
      amount: 100,
      currency: 'INR',
      utrNumber: 'INRONLY001',
      createdBy: user._id
    });
    await donationsModel.ManualBankDonation.create({
      donorId,
      amount: 50,
      currency: 'USD',
      utrNumber: 'USDNOT001',
      createdBy: user._id
    });
    await donationsModel.ManualBankDonation.create({
      donorId,
      amount: 25,
      currency: 'INR',
      status: 'refunded',
      utrNumber: 'INRREFUND001',
      createdBy: user._id
    });

    const res = await request().get(`/v1/donors/${donorId}`).set('Cookie', cookie);
    expect(res.body.data.donationSummary).toEqual([
      { currency: 'INR', amount: 100, count: 1 },
      { currency: 'USD', amount: 50, count: 1 }
    ]);
    expect(res.body.data.donationSummary).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ amount: 150 })])
    );
  });

  it('updates donor profile fields', async () => {
    const created = await createDonor({
      name: 'Old Name',
      email: 'old@example.com'
    });

    const res = await request()
      .patch(`/v1/donors/${created.body.data._id}`)
      .set('Cookie', cookie)
      .send({ name: 'New Name', address: 'Updated address' });

    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.address).toBe('Updated address');
    expect(res.body.data.email).toBe('old@example.com');
  });

  it('allows clearing optional donor fields with empty strings on patch', async () => {
    const created = await createDonor({
      name: 'Full Profile',
      email: 'full@example.com',
      phone: '9999999999',
      pan: 'ABCDE1234F',
      address: '123 Main St',
      notes: 'Initial notes'
    });
    const donorId = created.body.data._id;

    const res = await request()
      .patch(`/v1/donors/${donorId}`)
      .set('Cookie', cookie)
      .send({ phone: '', pan: '', address: '', notes: '' });

    expect(res.body.ok).toBe(true);
    expect(res.body.data.phone).toBe('');
    expect(res.body.data.pan).toBe('');
    expect(res.body.data.address).toBe('');
    expect(res.body.data.notes).toBe('');

    const fetched = await request().get(`/v1/donors/${donorId}`).set('Cookie', cookie);
    expect(fetched.body.ok).toBe(true);
    expect(fetched.body.data.phone).toBe('');
    expect(fetched.body.data.pan).toBe('');
    expect(fetched.body.data.address).toBe('');
    expect(fetched.body.data.notes).toBe('');
  });

  it('returns invalid for unknown donor ids', async () => {
    const res = await request().get('/v1/donors/64ce172dc4eff7ec4ff20e6e').set('Cookie', cookie);
    expect(res.body.ok).toBe(false);
    expect(res.body.err).toMatch(/not found/i);
  });

  it('exports an express app for tests without listening', () => {
    expect(typeof getApp()).toBe('function');
  });
});
