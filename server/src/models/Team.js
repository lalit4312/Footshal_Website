const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  shortName: { type: String, trim: true, maxlength: 20 },
  logoUrl: { type: String, trim: true },
  coach: { type: String, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1500 },
  groupName: { type: String, trim: true, maxlength: 80 },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
