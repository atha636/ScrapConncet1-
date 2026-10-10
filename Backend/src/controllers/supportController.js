const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { logAudit } = require("../utils/audit");
const { STATUSES } = require("../validators/supportValidator");

// Stops one account from flooding the queue; resolved/closed tickets don't count.
const MAX_ACTIVE_TICKETS = 5;

const paginate = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const ticketNo = (t) => `HELP-${String(t._id).slice(-6).toUpperCase()}`;

const summary = (t) => ({
  id: t._id,
  ticketNo: ticketNo(t),
  category: t.category,
  subject: t.subject,
  status: t.status,
  lastReplyBy: t.lastReplyBy,
  lastActivityAt: t.lastActivityAt,
  createdAt: t.createdAt,
});

const detail = (t) => ({ ...summary(t), messages: t.messages });

const findTicketOr404 = async (id, filter = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Ticket not found");
  const ticket = await SupportTicket.findOne({ _id: id, ...filter });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
};

/* ---------------------------- requester side ---------------------------- */

// POST /api/support/tickets  (user, collector)
exports.createTicket = asyncHandler(async (req, res) => {
  const active = await SupportTicket.countDocuments({
    user: req.user.id,
    status: { $in: ["open", "in_progress"] },
  });
  if (active >= MAX_ACTIVE_TICKETS) {
    throw new ApiError(409, "You already have several open requests. Please wait for a reply or add to an existing one.");
  }

  const me = await User.findById(req.user.id).select("name");
  const { category, subject, message } = req.body;

  const ticket = await SupportTicket.create({
    user: req.user.id,
    category,
    subject,
    messages: [{ sender: "requester", senderName: me?.name || "User", text: message }],
  });

  res.status(201).json(detail(ticket));
});

// GET /api/support/tickets/mine
exports.listMine = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user.id }).sort({ lastActivityAt: -1 }).limit(100);
  res.json({ tickets: tickets.map(summary) });
});

// GET /api/support/tickets/mine/:id
exports.getMine = asyncHandler(async (req, res) => {
  res.json(detail(await findTicketOr404(req.params.id, { user: req.user.id })));
});

// POST /api/support/tickets/mine/:id/reply
exports.replyMine = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req.params.id, { user: req.user.id });
  if (ticket.status === "closed") throw new ApiError(409, "This request is closed. Please start a new one.");

  const me = await User.findById(req.user.id).select("name");
  ticket.messages.push({ sender: "requester", senderName: me?.name || "User", text: req.body.message });
  ticket.lastReplyBy = "requester";
  ticket.lastActivityAt = new Date();
  // A reply on a resolved ticket means it wasn't resolved after all.
  ticket.status = "open";
  await ticket.save();

  res.json(detail(ticket));
});

/* ------------------------------- admin side ------------------------------ */

// GET /api/support/admin/tickets?status=&page=&limit=
exports.adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = STATUSES.includes(req.query.status) ? { status: req.query.status } : {};

  const [tickets, total, grouped] = await Promise.all([
    SupportTicket.find(filter).populate("user", "name role").sort({ lastActivityAt: -1 }).skip(skip).limit(limit),
    SupportTicket.countDocuments(filter),
    SupportTicket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  res.json({
    tickets: tickets.map((t) => ({ ...summary(t), requester: t.user ? { name: t.user.name, role: t.user.role } : null })),
    counts: Object.fromEntries(grouped.map((g) => [g._id, g.n])),
    page,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/support/admin/tickets/:id
exports.adminGet = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req.params.id);
  await ticket.populate("user", "name email phone role");
  res.json({
    ...detail(ticket),
    requester: ticket.user
      ? { name: ticket.user.name, email: ticket.user.email, phone: ticket.user.phone || null, role: ticket.user.role }
      : null,
  });
});

// POST /api/support/admin/tickets/:id/reply
exports.adminReply = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req.params.id);
  if (ticket.status === "closed") throw new ApiError(409, "This ticket is closed. Reopen it to reply.");

  const admin = await User.findById(req.user.id).select("name");
  ticket.messages.push({ sender: "admin", senderName: admin?.name || "Support", text: req.body.message });
  ticket.lastReplyBy = "admin";
  ticket.lastActivityAt = new Date();
  if (ticket.status === "open") ticket.status = "in_progress";
  await ticket.save();

  await notifyUser(req.io, ticket.user, {
    type: "support_update",
    text: `Support replied to "${ticket.subject}".`,
  });
  await logAudit(req, { action: "ticket.reply", targetType: "ticket", targetId: ticket._id, targetLabel: ticketNo(ticket) });

  res.json(detail(ticket));
});

// PATCH /api/support/admin/tickets/:id/status  — { status }
exports.adminSetStatus = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req.params.id);
  const { status } = req.body;
  if (ticket.status === status) return res.json(detail(ticket));

  const from = ticket.status;
  ticket.status = status;
  ticket.lastActivityAt = new Date();
  await ticket.save();

  if (status === "resolved" || status === "closed") {
    await notifyUser(req.io, ticket.user, {
      type: "support_update",
      text: `Your request "${ticket.subject}" was marked ${status}.`,
    });
  }
  await logAudit(req, {
    action: "ticket.status",
    targetType: "ticket",
    targetId: ticket._id,
    targetLabel: ticketNo(ticket),
    details: { from, to: status },
  });

  res.json(detail(ticket));
});