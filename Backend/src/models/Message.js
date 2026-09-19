const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    pickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // No longer unconditionally required — an image-only message (see
    // image below) is valid with no text at all. "At least one of text or
    // image" is enforced in the controller instead, where req.file (from
    // multer) is actually visible; a schema-level validator here would
    // only ever see this document's own fields, which is enough to
    // enforce the rule just as well, but the controller is where the
    // multipart upload and the text body are both already in hand.
    text: { type: String, trim: true, maxlength: 1000, default: "" },
    // Cloudinary/local-disk URL, same upload pipeline as pickup photos
    // (see middleware/upload.js) — null for a text-only message.
    image: { type: String, default: null },
    // Single timestamp, not a per-recipient array — a pickup's chat only
    // ever has two participants, so "has the other person seen this yet"
    // needs exactly one bit of state, not a read-receipts list built for
    // a group chat this app doesn't have.
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ pickup: 1, createdAt: 1 });
// Powers the unread-badge/mark-as-read query: "every message in this
// pickup not sent by me and not yet read" — indexed on the fields that
// query actually filters on.
messageSchema.index({ pickup: 1, sender: 1, readAt: 1 });

module.exports = mongoose.model("Message", messageSchema);