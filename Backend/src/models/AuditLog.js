const mongoose = require("mongoose");

// Append-only record of what admins (and the system, for scheduled jobs)
// did. Actor name/email are copied in at write time so the log still reads
// correctly if that account is later renamed or deleted.
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // null = system
  actorName: { type: String, default: "System" },
  actorEmail: { type: String, default: null },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: null },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetLabel: { type: String, default: null }, // human-readable, e.g. a collector's name
  details: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);