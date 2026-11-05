const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  jerseyNumber: { type: Number, min: 0, max: 99 },
  position: { type: String, trim: true, maxlength: 40 },
  photoUrl: { type: String, trim: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
