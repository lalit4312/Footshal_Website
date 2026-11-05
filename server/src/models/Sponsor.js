const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  logoUrl: { type: String, trim: true },
  websiteUrl: { type: String, trim: true },
  tier: { type: String, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 1000 },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Sponsor', sponsorSchema);
