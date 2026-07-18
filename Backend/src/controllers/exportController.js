const Pickup = require("../models/Pickup");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const toCsv = require("../utils/toCsv");

function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

const PICKUP_COLUMNS = [
  { key: "id", label: "Pickup ID" },
  { key: "scrapType", label: "Scrap Type" },
  { key: "estimatedWeightKg", label: "Weight (kg)" },
  { key: "price", label: "Price (INR)" },
  { key: "status", label: "Status" },
  { key: "address", label: "Address" },
  { key: "createdAt", label: "Requested On" },
];

// GET /api/pickup/my-requests/export  (requester only, their own data)
exports.exportMyRequests = asyncHandler(async (req, res) => {
  const pickups = await Pickup.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate("collector", "name");

  const rows = pickups.map((p) => ({
    id: p._id.toString(),
    scrapType: p.scrapType,
    estimatedWeightKg: p.estimatedWeightKg ?? "",
    price: p.price,
    status: p.status,
    collector: p.collector?.name || "",
    address: p.location?.address || `${p.location.lat}, ${p.location.lng}`,
    createdAt: p.createdAt.toISOString().slice(0, 10),
  }));

  const csv = toCsv(rows, [
    ...PICKUP_COLUMNS.slice(0, 5),
    { key: "collector", label: "Collector" },
    ...PICKUP_COLUMNS.slice(5),
  ]);

  sendCsv(res, `my-pickups-${Date.now()}.csv`, csv);
});

// GET /api/admin/users/export  (admin only)
exports.exportUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  const rows = users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    rating: u.ratingCount > 0 ? u.rating.toFixed(1) : "",
    isActive: u.isActive ? "Active" : "Deactivated",
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }));

  const csv = toCsv(rows, [
    { key: "id", label: "User ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "rating", label: "Rating" },
    { key: "isActive", label: "Status" },
    { key: "createdAt", label: "Joined" },
  ]);

  sendCsv(res, `scrapconnect-users-${Date.now()}.csv`, csv);
});

// GET /api/admin/pickups/export  (admin only, full platform data)
exports.exportAdminPickups = asyncHandler(async (req, res) => {
  const pickups = await Pickup.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("collector", "name email");

  const rows = pickups.map((p) => ({
    id: p._id.toString(),
    scrapType: p.scrapType,
    estimatedWeightKg: p.estimatedWeightKg ?? "",
    price: p.price,
    status: p.status,
    requesterName: p.user?.name || "",
    requesterEmail: p.user?.email || "",
    collectorName: p.collector?.name || "",
    collectorEmail: p.collector?.email || "",
    address: p.location?.address || `${p.location.lat}, ${p.location.lng}`,
    createdAt: p.createdAt.toISOString().slice(0, 10),
  }));

  const csv = toCsv(rows, [
    { key: "id", label: "Pickup ID" },
    { key: "scrapType", label: "Scrap Type" },
    { key: "estimatedWeightKg", label: "Weight (kg)" },
    { key: "price", label: "Price (INR)" },
    { key: "status", label: "Status" },
    { key: "requesterName", label: "Requester" },
    { key: "requesterEmail", label: "Requester Email" },
    { key: "collectorName", label: "Collector" },
    { key: "collectorEmail", label: "Collector Email" },
    { key: "address", label: "Address" },
    { key: "createdAt", label: "Requested On" },
  ]);

  sendCsv(res, `scrapconnect-pickups-${Date.now()}.csv`, csv);
});