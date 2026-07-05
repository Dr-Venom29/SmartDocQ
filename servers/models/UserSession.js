const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  deviceName: {
    type: String,
    default: "Unknown Device"
  },
  ipAddress: {
    type: String,
    default: "Unknown IP"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  csrfHash: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes
userSessionSchema.index({ userId: 1 });
// TTL index: documents will automatically be deleted when expiresAt is reached
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("UserSession", userSessionSchema);
