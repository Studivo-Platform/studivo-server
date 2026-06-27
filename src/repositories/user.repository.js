const { User } = require('../models/User');

// Find user by email — used in auth
const findByEmail = async (email) => {
  return User.findOne({ email });
};

// Find user by ID
const findById = async (id) => {
  return User.findById(id).lean();
};

// Admin: list all users with optional filters
const findAll = async ({ role, isActive, search, skip, limit }) => {
  const filter = {};

  if (role)     filter.role     = role;
  if (typeof isActive === 'boolean') filter.isActive = isActive;

  // Search by name or email (case-insensitive)
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User
      .find(filter)
      .select('-password -refreshTokens -verificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total };
};

// Deactivate or reactivate a user
const setActive = async (userId, isActive) => {
  return User.findByIdAndUpdate(userId, { isActive }, { new: true })
    .select('-password -refreshTokens -verificationToken');
};

// Update user fields
const update = async (userId, data) => {
  return User.findByIdAndUpdate(userId, data, { new: true })
    .select('-password -refreshTokens -verificationToken');
};

module.exports = { findByEmail, findById, findAll, setActive, update };