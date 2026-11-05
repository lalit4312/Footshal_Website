const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  edition: { type: String, trim: true, maxlength: 40 },
  description: { type: String, trim: true, maxlength: 3000 },
  logoUrl: { type: String, trim: true, maxlength: 2048 },
  bannerUrl: { type: String, trim: true, maxlength: 2048 },
  venue: { type: String, trim: true, maxlength: 200 },
  format: { type: String, enum: ['league', 'knockout', 'group-stage', 'group-knockout'], default: 'league' },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['draft', 'published', 'completed'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);
