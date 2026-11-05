const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  homeScore: { type: Number, required: true, min: 0, validate: Number.isInteger },
  awayScore: { type: Number, required: true, min: 0, validate: Number.isInteger },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

resultSchema.index({ tournament: 1, status: 1 });
resultSchema.index({ match: 1 }, { unique: true });
module.exports = mongoose.model('Result', resultSchema);
