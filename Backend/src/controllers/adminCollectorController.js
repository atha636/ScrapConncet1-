const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { saveKycDocument } = require("../utils/kycStorage");

// POST /api/admin/collectors  (admin) — multipart: name, email, phone,
// password (temporary), idType, idLast4, document
exports.createCollector = asyncHandler(async (req, res) => {
  const { name, email, phone, password, idType, idLast4 } = req.body;
  if (!req.file) throw new ApiError(400, "Upload a photo of the collector's ID document");

  // Checked before the upload so a duplicate email doesn't leave an orphaned
  // ID file in private storage.
  if (await User.exists({ email })) throw new ApiError(409, "Email already registered");

  const saved = await saveKycDocument(req.file.buffer, req.file.mimetype);
  const now = new Date();

  const user = await User.create({
    name,
    email,
    phone,
    password: await bcrypt.hash(password, 12),
    role: "collector",
    // The admin vouches for this person, so the email-verification step is
    // skipped and the ID is approved immediately (reviewedBy records who).
    isVerified: true,
    mustChangePassword: true,
    createdByAdmin: req.user.id,
    collectorVerification: {
      status: "approved",
      idType,
      idLast4,
      documentRef: saved.ref,
      documentStorage: saved.storage,
      documentFormat: saved.format,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: req.user.id,
    },
  });

  res.status(201).json(user);
});

// GET /api/admin/collectors  (admin) — collectors created by an admin
exports.listAdminCreatedCollectors = asyncHandler(async (req, res) => {
  const collectors = await User.find({ role: "collector", createdByAdmin: { $ne: null } })
    .select("name email phone isActive mustChangePassword createdAt collectorVerification")
    .sort({ createdAt: -1 });

  res.json({
    collectors: collectors.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone || null,
      isActive: c.isActive,
      mustChangePassword: c.mustChangePassword,
      createdAt: c.createdAt,
      idType: c.collectorVerification?.idType || null,
      idLast4: c.collectorVerification?.idLast4 || null,
    })),
  });
});

// PATCH /api/admin/collectors/:id/reset-password  (admin) — { password }
// Sets a new temporary password; the collector is prompted to change it again.
exports.resetCollectorPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "collector", createdByAdmin: { $ne: null } });
  if (!user) throw new ApiError(404, "Collector not found");

  user.password = await bcrypt.hash(req.body.password, 12);
  user.mustChangePassword = true;
  // Signs out any session still using the old password (see middleware/auth.js)
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  res.json({ success: true });
});