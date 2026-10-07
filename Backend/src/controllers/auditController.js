const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { AUDIT_ACTIONS } = require("../utils/audit");

const paginate = (query, defaultLimit = 25) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// GET /api/admin/audit-logs?action=&from=&to=&page=&limit=
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};

  if (req.query.action && AUDIT_ACTIONS[req.query.action]) filter.action = req.query.action;

  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if ((from && !Number.isNaN(from)) || (to && !Number.isNaN(to))) {
    filter.createdAt = {};
    if (from && !Number.isNaN(from)) filter.createdAt.$gte = from;
    if (to && !Number.isNaN(to)) {
      to.setHours(23, 59, 59, 999); // include the whole end day
      filter.createdAt.$lte = to;
    }
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    actions: Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label })),
  });
});