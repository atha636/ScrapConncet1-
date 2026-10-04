const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { saveKycDocument, readKycDocument } = require("../utils/kycStorage");

const ID_TYPES = ["aadhaar", "driving_license", "voter_id", "pan"];

const publicShape = (v = {}) => ({
  status: v.status || "not_submitted",
  idType: v.idType || null,
  idLast4: v.idLast4 || null,
  submittedAt: v.submittedAt || null,
  reviewedAt: v.reviewedAt || null,
  rejectionReason: v.rejectionReason || null,
});

// GET /api/verification/me  (collector)
exports.getMyVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("collectorVerification");
  if (!user) throw new ApiError(404, "User not found");
  res.json(publicShape(user.collectorVerification));
});

// POST /api/verification/submit  (collector) — multipart: idType, idLast4, document
exports.submitVerification = asyncHandler(async (req, res) => {
  const { idType, idLast4 } = req.body;

  if (!ID_TYPES.includes(idType)) throw new ApiError(400, "Choose a valid ID type");
  // Only the last 4 digits are ever accepted — a full ID number is rejected
  // outright rather than silently truncated.
  if (typeof idLast4 !== "string" || !/^\d{4}$/.test(idLast4)) {
    throw new ApiError(400, "Enter only the last 4 digits of your ID number");
  }
  if (!req.file) throw new ApiError(400, "Upload a photo of your ID document");

  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  const current = user.collectorVerification?.status || "not_submitted";
  if (current === "pending") throw new ApiError(409, "Your ID is already under review");
  if (current === "approved") throw new ApiError(409, "Your ID is already verified");

  const saved = await saveKycDocument(req.file.buffer, req.file.mimetype);

  user.collectorVerification = {
    status: "pending",
    idType,
    idLast4,
    documentRef: saved.ref,
    documentStorage: saved.storage,
    documentFormat: saved.format,
    submittedAt: new Date(),
  };
  await user.save();

  res.status(201).json(publicShape(user.collectorVerification));
});

// GET /api/verification/admin?status=pending|approved|rejected  (admin)
exports.listVerifications = asyncHandler(async (req, res) => {
  const allowed = ["pending", "approved", "rejected"];
  const status = allowed.includes(req.query.status) ? req.query.status : "pending";

  const users = await User.find({ role: "collector", "collectorVerification.status": status })
    .select("name email phone createdAt collectorVerification")
    .sort({ "collectorVerification.submittedAt": 1 });

  res.json({
    verifications: users.map((u) => ({
      collectorId: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || null,
      joinedAt: u.createdAt,
      ...publicShape(u.collectorVerification),
    })),
  });
});

// GET /api/verification/admin/:id/document  (admin) — streams the private file
exports.getVerificationDocument = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "collector" }).select(
    "+collectorVerification.documentRef +collectorVerification.documentStorage +collectorVerification.documentFormat"
  );
  const v = user?.collectorVerification;
  if (!v?.documentRef) throw new ApiError(404, "No document on file");

  const { buffer, contentType } = await readKycDocument({
    storage: v.documentStorage,
    ref: v.documentRef,
    format: v.documentFormat,
  });

  res.set({ "Content-Type": contentType, "Cache-Control": "no-store" });
  res.send(buffer);
});

// PATCH /api/verification/admin/:id/review  (admin) — { decision, reason? }
exports.reviewVerification = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body;
  if (!["approve", "reject"].includes(decision)) throw new ApiError(400, "decision must be approve or reject");

  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
  if (decision === "reject" && !cleanReason) throw new ApiError(400, "Give a reason so the collector can fix it");

  const user = await User.findOne({ _id: req.params.id, role: "collector" });
  if (!user) throw new ApiError(404, "Collector not found");
  if (user.collectorVerification?.status !== "pending") {
    throw new ApiError(409, "This submission isn't waiting for review");
  }

  user.collectorVerification.status = decision === "approve" ? "approved" : "rejected";
  user.collectorVerification.reviewedAt = new Date();
  user.collectorVerification.reviewedBy = req.user.id;
  user.collectorVerification.rejectionReason = decision === "reject" ? cleanReason : undefined;
  await user.save();

  await notifyUser(req.io, user._id, {
    type: "verification_update",
    text:
      decision === "approve"
        ? "Your ID is verified — you can now take pickups."
        : `Your ID wasn't approved: ${cleanReason}. Please upload it again.`,
  });

  res.json({ collectorId: user._id, ...publicShape(user.collectorVerification) });
});