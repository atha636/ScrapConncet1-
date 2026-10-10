const mongoose = require("mongoose");

// A help request or complaint raised by a user or collector, with the
// conversation between them and the admin team kept on the ticket itself.
const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["requester", "admin"], required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["pickup", "payment", "collector", "account", "app", "other"],
      required: true,
    },
    subject: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    messages: { type: [messageSchema], default: [] },
    // Who spoke last, so each side can see at a glance whose turn it is.
    lastReplyBy: { type: String, enum: ["requester", "admin"], default: "requester" },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);