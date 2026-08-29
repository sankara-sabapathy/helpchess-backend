const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const { createApp } = require('app');
const { signAccessToken } = require('utils/tokens');
const usersModel = require('models/users');
const rolesModel = require('models/roles');
const donationsModel = require('models/donations');

let mongoServer;
let app;

const startTestApp = async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: 'helpchess-test' });
  await Promise.all([
    donationsModel.Donation.init(),
    donationsModel.ManualBankDonation.init(),
    donationsModel.RazorpayWebhookDonation.init(),
    donationsModel.RazorpaySyncDonation.init()
  ]);
  app = createApp();
  return app;
};

const stopTestApp = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

const createAuthedUser = async ({ permissions = [], roleCode, isAdmin = false } = {}) => {
  const code = isAdmin ? 'admin' : roleCode || `role-${Date.now()}-${Math.random()}`;
  const role = await rolesModel.create({
    roleData: {
      name: isAdmin ? 'Administrator' : 'Staff',
      code,
      permissions,
      status: 'active'
    }
  });
  const user = await usersModel.createUser({
    userData: {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
      email: `user-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: 'not-used',
      roleId: role._id,
      status: 'active'
    }
  });
  const token = signAccessToken({ userId: user._id.toString() });
  return {
    user,
    role,
    cookie: `access_token=${token}`
  };
};

module.exports = {
  startTestApp,
  stopTestApp,
  clearDb,
  createAuthedUser,
  getApp: () => app,
  request: () => request(app)
};
