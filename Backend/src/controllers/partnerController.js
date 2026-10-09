const RecyclingPartner = require("../models/RecyclingPartner");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { logAudit } = require("../utils/audit");

// GET /api/partners  (collector, admin) — active partners, for the drop-off form
exports.listPartners = asyncHandler(async (req, res) => {
  const partners = await RecyclingPartner.find({ isActive: true }).sort({ name: 1 });
  res.json({ partners });
});

// GET /api/partners/all  (admin) — everything, for the editor
exports.listAllPartners = asyncHandler(async (req, res) => {
  const partners = await RecyclingPartner.find().sort({ isActive: -1, name: 1 });
  res.json({ partners });
});

// POST /api/partners  (admin)
exports.createPartner = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.create({ ...req.body, createdBy: req.user.id });
  await logAudit(req, {
    action: "partner.create",
    targetType: "partner",
    targetId: partner._id,
    targetLabel: partner.name,
    details: { city: partner.city },
  });
  res.status(201).json(partner);
});

// PUT /api/partners/:id  (admin)
exports.updatePartner = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!partner) throw new ApiError(404, "Partner not found");
  await logAudit(req, {
    action: "partner.update",
    targetType: "partner",
    targetId: partner._id,
    targetLabel: partner.name,
    details: { isActive: partner.isActive },
  });
  res.json(partner);
});