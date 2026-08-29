const mongoose = require('mongoose');

const { FIELD_LIMITS } = require('utils/sanitize');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: FIELD_LIMITS.email
    },
    phone: { type: String, trim: true, index: true },
    pan: { type: String, uppercase: true, trim: true, index: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

const DonorsModel = mongoose.model('donors', donorSchema, 'donors');

module.exports = {
  search: async ({ q, page = 1, limit = 10 } = {}) => {
    const skip = (page - 1) * limit;
    const filter = {};
    if (q && typeof q === 'string' && q.trim()) {
      const term = escapeRegex(q.trim());
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      DonorsModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DonorsModel.countDocuments(filter)
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0
    };
  },

  getById: async ({ id }) => DonorsModel.findById(id).lean(),

  create: async ({ donorData }) => new DonorsModel(donorData).save(),

  patch: async ({ id, updateData }) =>
    DonorsModel.findByIdAndUpdate(id, updateData, { new: true }).lean(),

  deleteById: async ({ id }) => DonorsModel.findByIdAndDelete(id)
};
