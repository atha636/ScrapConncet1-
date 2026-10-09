const mongoose = require("mongoose");

// A facility that actually receives scrap for recycling — the last stop in
// the chain. Admin-managed. `accepts` empty means "takes everything".
const recyclingPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    address: { type: String, trim: true, maxlength: 200, default: "" },
    accepts: {
      type: [{ type: String, enum: ["metal", "plastic", "paper", "e-waste", "glass", "other"] }],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecyclingPartner", recyclingPartnerSchema);