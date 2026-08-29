/* eslint-disable no-console */
require('dotenv-safe').config({ allowEmptyValues: true });
require('app-module-path').addPath(require('path').resolve(__dirname, '../src'));
require('models/db');

const bcrypt = require('bcryptjs');
const config = require('config');

const rolesModel = require('models/roles');
const usersModel = require('models/users');

const PERMISSIONS = config.get('internalAccess.permissions');
const ADMIN_ROLE_CODE = config.get('internalAccess.roles.admin');

const DEFAULT_ROLES = [
  {
    name: 'Administrator',
    code: ADMIN_ROLE_CODE,
    description: 'Full system access',
    permissions: [
      PERMISSIONS.usersRead,
      PERMISSIONS.usersWrite,
      PERMISSIONS.donorsRead,
      PERMISSIONS.donorsWrite,
      PERMISSIONS.donationsRead,
      PERMISSIONS.donationsWrite
    ],
    status: 'active'
  },
  {
    name: 'User',
    code: 'user',
    description: 'Standard user access',
    permissions: [],
    status: 'active'
  }
];

const seedRoles = async () => {
  await Promise.all(
    DEFAULT_ROLES.map(async (roleData) => {
      const existing = await rolesModel.findOne({ query: { code: roleData.code } });
      if (!existing) {
        await rolesModel.create({ roleData });
        console.log(`Created role: ${roleData.code}`);
      } else {
        const existingPermissions = existing.permissions || [];
        const mergedPermissions = [...new Set([...existingPermissions, ...roleData.permissions])];
        const hasMissing = roleData.permissions.some(
          (permission) => !existingPermissions.includes(permission)
        );
        if (hasMissing) {
          await rolesModel.patch({
            roleId: existing._id,
            updateData: { permissions: mergedPermissions }
          });
          console.log(`Updated role permissions: ${roleData.code}`);
        } else {
          console.log(`Role already exists: ${roleData.code}`);
        }
      }
    })
  );
};

const seedAdminUser = async () => {
  const email = config.get('seedAdminEmail');
  const password = config.get('seedAdminPassword');

  if (!email || !password) {
    console.log('Skipping admin user seed: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
    return;
  }

  const existingUser = await usersModel.findByEmail({ email });
  if (existingUser) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const adminRole = await rolesModel.findOne({ query: { code: ADMIN_ROLE_CODE } });
  if (!adminRole) {
    console.error('Admin role not found. Run role seed first.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await usersModel.createUser({
    userData: {
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      email: email.toLowerCase(),
      passwordHash,
      roleId: adminRole._id,
      status: 'active'
    }
  });
  console.log(`Created admin user: ${email}`);
};

const run = async () => {
  try {
    await seedRoles();
    await seedAdminUser();
    console.log('Seed completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
};

run();
