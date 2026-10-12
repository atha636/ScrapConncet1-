const mongoose = require("mongoose");

// A collector business: one owner collector plus staff collectors and a
// small list of vehicles. The owner accepts pickups as usual (earnings go to
// the owner's wallet) and then assigns them to a member, who does the work —
// see Pickup.assignedTo and utils/teamAccess.js.
const teamSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["invited", "active"], default: "invited" },
        invitedAt: { type: Date, default: Date.now },
        joinedAt: { type: Date, default: null },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, default: null },
      },
    ],
    vehicles: [
      {
        label: { type: String, required: true, trim: true, maxlength: 40 },
        plate: { type: String, trim: true, uppercase: true, maxlength: 15 },
        type: { type: String, enum: ["bike", "auto", "van", "truck"], default: "van" },
      },
    ],
  },
  { timestamps: true }
);

teamSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Team", teamSchema);