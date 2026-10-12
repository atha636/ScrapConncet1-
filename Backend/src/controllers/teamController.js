const mongoose = require("mongoose");
const Team = require("../models/Team");
const User = require("../models/User");
const Pickup = require("../models/Pickup");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const notifyUser = require("../utils/notifyUser");
const { assertCollectorVerified, effectiveStatus } = require("../utils/collectorVerification");

const MAX_MEMBERS = 15;
const MAX_VEHICLES = 15;
const round1 = (n) => Math.round(n * 10) / 10;

const ownerTeam = async (userId) => {
  const team = await Team.findOne({ owner: userId });
  if (!team) throw new ApiError(404, "You don't have a team yet");
  return team;
};

// Which team (if any) lists this user as an ACTIVE member.
const memberTeam = (userId) => Team.findOne({ members: { $elemMatch: { user: userId, status: "active" } } });

const vehicleView = (team, vehicleId) => {
  const v = vehicleId && team.vehicles.id(vehicleId);
  return v ? { id: v._id, label: v.label, plate: v.plate || "", type: v.type } : null;
};

async function teamView(team) {
  await team.populate("members.user", "name phone collectorVerification");
  return {
    id: team._id,
    name: team.name,
    vehicles: team.vehicles.map((v) => ({ id: v._id, label: v.label, plate: v.plate || "", type: v.type })),
    members: team.members
      .filter((m) => m.user)
      .map((m) => ({
        userId: m.user._id,
        name: m.user.name,
        phone: m.user.phone || null,
        status: m.status,
        verification: effectiveStatus(m.user.collectorVerification),
        vehicle: vehicleView(team, m.vehicleId),
        joinedAt: m.joinedAt,
      })),
  };
}

// GET /api/teams/mine  (collector)
exports.getMine = asyncHandler(async (req, res) => {
  const owned = await Team.findOne({ owner: req.user.id });
  if (owned) return res.json({ role: "owner", team: await teamView(owned), invites: [] });

  const member = await memberTeam(req.user.id);
  const invitedTo = await Team.find({ members: { $elemMatch: { user: req.user.id, status: "invited" } } }).populate("owner", "name");
  const invites = invitedTo.map((t) => ({ teamId: t._id, teamName: t.name, ownerName: t.owner?.name || "A collector" }));

  if (member) {
    await member.populate("owner", "name");
    const me = member.members.find((m) => String(m.user) === String(req.user.id));
    return res.json({
      role: "member",
      team: { id: member._id, name: member.name, ownerName: member.owner?.name || "", vehicle: vehicleView(member, me?.vehicleId) },
      invites,
    });
  }
  res.json({ role: null, team: null, invites });
});

// POST /api/teams  (verified collector)
exports.createTeam = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user.id).select("collectorVerification");
  assertCollectorVerified(me);
  if (await Team.exists({ owner: req.user.id })) throw new ApiError(409, "You already have a team");
  if (await memberTeam(req.user.id)) throw new ApiError(409, "Leave your current team before starting your own");
  const team = await Team.create({ owner: req.user.id, name: req.body.name });
  res.status(201).json({ role: "owner", team: await teamView(team), invites: [] });
});

// POST /api/teams/members  (owner) — invite an existing collector by email
exports.invite = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  if (team.members.length >= MAX_MEMBERS) throw new ApiError(400, `A team can have up to ${MAX_MEMBERS} members`);

  const target = await User.findOne({ email: req.body.email, role: "collector", isActive: true });
  if (!target) throw new ApiError(404, "No collector account found with that email. Ask them to sign up as a collector first.");
  if (String(target._id) === String(req.user.id)) throw new ApiError(400, "You're already the owner");
  if (team.members.some((m) => String(m.user) === String(target._id))) throw new ApiError(409, "Already invited or in your team");
  if (await Team.exists({ owner: target._id })) throw new ApiError(409, "That collector runs their own team");
  if (await memberTeam(target._id)) throw new ApiError(409, "That collector is already in another team");

  team.members.push({ user: target._id });
  await team.save();

  await notifyUser(req.io, target._id, {
    type: "team_update",
    text: `You've been invited to join the team "${team.name}". Open the Team tab to accept.`,
  });
  res.status(201).json(await teamView(team));
});

// DELETE /api/teams/members/:userId  (owner) — remove a member / cancel invite
exports.removeMember = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  const idx = team.members.findIndex((m) => String(m.user) === req.params.userId);
  if (idx === -1) throw new ApiError(404, "That person isn't in your team");
  const wasActive = team.members[idx].status === "active";
  team.members.splice(idx, 1);
  await team.save();

  // Their in-flight jobs go back to the owner rather than being stranded
  await Pickup.updateMany(
    { collector: req.user.id, assignedTo: req.params.userId, status: { $in: ["accepted", "in_progress"] } },
    { $set: { assignedTo: null, assignedAt: null } }
  );
  if (wasActive) {
    await notifyUser(req.io, req.params.userId, { type: "team_update", text: `You were removed from the team "${team.name}".` });
  }
  res.json(await teamView(team));
});

// POST /api/teams/invites/:teamId/accept | decline  (invited collector)
const respond = (accept) =>
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.teamId)) throw new ApiError(404, "Invite not found");
    const team = await Team.findById(req.params.teamId);
    const entry = team?.members.find((m) => String(m.user) === String(req.user.id) && m.status === "invited");
    if (!entry) throw new ApiError(404, "Invite not found");

    if (accept) {
      assertCollectorVerified(await User.findById(req.user.id).select("collectorVerification"));
      if (await Team.exists({ owner: req.user.id })) throw new ApiError(409, "You run your own team");
      if (await memberTeam(req.user.id)) throw new ApiError(409, "You're already in a team");
      entry.status = "active";
      entry.joinedAt = new Date();
    } else {
      team.members.pull(entry._id);
    }
    await team.save();

    const me = await User.findById(req.user.id).select("name");
    await notifyUser(req.io, team.owner, {
      type: "team_update",
      text: `${me?.name || "A collector"} ${accept ? "joined" : "declined to join"} your team "${team.name}".`,
    });
    res.json({ ok: true });
  });
exports.acceptInvite = respond(true);
exports.declineInvite = respond(false);

// POST /api/teams/leave  (active member)
exports.leave = asyncHandler(async (req, res) => {
  const team = await memberTeam(req.user.id);
  if (!team) throw new ApiError(404, "You're not in a team");
  team.members = team.members.filter((m) => String(m.user) !== String(req.user.id));
  await team.save();
  await Pickup.updateMany(
    { collector: team.owner, assignedTo: req.user.id, status: { $in: ["accepted", "in_progress"] } },
    { $set: { assignedTo: null, assignedAt: null } }
  );
  const me = await User.findById(req.user.id).select("name");
  await notifyUser(req.io, team.owner, { type: "team_update", text: `${me?.name || "A member"} left your team "${team.name}".` });
  res.json({ ok: true });
});

// POST /api/teams/vehicles  (owner)
exports.addVehicle = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  if (team.vehicles.length >= MAX_VEHICLES) throw new ApiError(400, `Up to ${MAX_VEHICLES} vehicles`);
  team.vehicles.push(req.body);
  await team.save();
  res.status(201).json(await teamView(team));
});

// DELETE /api/teams/vehicles/:id  (owner)
exports.removeVehicle = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  const v = team.vehicles.id(req.params.id);
  if (!v) throw new ApiError(404, "Vehicle not found");
  v.deleteOne();
  team.members.forEach((m) => {
    if (String(m.vehicleId) === req.params.id) m.vehicleId = null;
  });
  await team.save();
  res.json(await teamView(team));
});

// PATCH /api/teams/members/:userId/vehicle  (owner)
exports.setMemberVehicle = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  const m = team.members.find((x) => String(x.user) === req.params.userId && x.status === "active");
  if (!m) throw new ApiError(404, "That person isn't an active member");
  if (req.body.vehicleId && !team.vehicles.id(req.body.vehicleId)) throw new ApiError(404, "Vehicle not found");
  m.vehicleId = req.body.vehicleId;
  await team.save();
  res.json(await teamView(team));
});

// GET /api/teams/jobs  (owner) — active pickups the owner holds, with who
// (if anyone) is assigned
exports.getTeamJobs = asyncHandler(async (req, res) => {
  await ownerTeam(req.user.id);
  const jobs = await Pickup.find({ collector: req.user.id, status: { $in: ["accepted", "in_progress"] } })
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate("assignedTo", "name");
  res.json({
    jobs: jobs.map((p) => ({
      id: p._id,
      status: p.status,
      scrapType: p.scrapType,
      address: p.location?.address || "",
      price: p.price,
      assignedTo: p.assignedTo ? { id: p.assignedTo._id, name: p.assignedTo.name } : null,
    })),
  });
});

// POST /api/teams/assign  (owner) — hand a pickup to a member, or take it back
exports.assign = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  const { pickupId, memberId } = req.body;

  if (memberId) {
    const m = team.members.find((x) => String(x.user) === memberId && x.status === "active");
    if (!m) throw new ApiError(404, "That person isn't an active member of your team");
    assertCollectorVerified(await User.findById(memberId).select("collectorVerification"));
  }

  const pickup = await Pickup.findOneAndUpdate(
    { _id: pickupId, collector: req.user.id, status: { $in: ["accepted", "in_progress"] } },
    { $set: { assignedTo: memberId || null, assignedAt: memberId ? new Date() : null } },
    { new: true }
  );
  if (!pickup) throw new ApiError(404, "That pickup isn't one of your active jobs");

  if (memberId) {
    await notifyUser(req.io, memberId, {
      type: "team_update",
      text: `New job assigned to you for team "${team.name}" — ${pickup.location?.address || "see Active jobs"}.`,
      pickupId: pickup._id,
    });
  }
  req.io.emit("updatePickup", pickup);
  res.json({ ok: true });
});

const FINAL_SETTLEMENT = new Set(["none", "auto_confirmed", "confirmed", "resolved"]);
function kgOf(p) {
  const actual = p.settlement?.actualItems || [];
  if (actual.length) return actual.reduce((s, i) => s + (i.actualWeightKg || 0), 0);
  const items = p.items?.length ? p.items : [{ estimatedWeightKg: p.estimatedWeightKg }];
  return items.reduce((s, i) => s + (i.estimatedWeightKg || 0), 0);
}

// GET /api/teams/stats?days=30  (owner) — per-member output
exports.getStats = asyncHandler(async (req, res) => {
  const team = await ownerTeam(req.user.id);
  const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000);

  const memberIds = team.members.filter((m) => m.status === "active").map((m) => m.user);
  const done = await Pickup.find({
    collector: req.user.id,
    assignedTo: { $in: memberIds },
    status: "completed",
    updatedAt: { $gte: since },
  })
    .select("assignedTo price items scrapType estimatedWeightKg settlement")
    .limit(2000);
  const active = await Pickup.aggregate([
    { $match: { collector: new mongoose.Types.ObjectId(req.user.id), assignedTo: { $in: memberIds }, status: { $in: ["accepted", "in_progress"] } } },
    { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
  ]);
  const activeBy = Object.fromEntries(active.map((a) => [String(a._id), a.n]));

  const users = await User.find({ _id: { $in: memberIds } }).select("name rating");
  const rows = users.map((u) => {
    const mine = done.filter((p) => String(p.assignedTo) === String(u._id) && FINAL_SETTLEMENT.has(p.settlement?.status || "none"));
    return {
      userId: u._id,
      name: u.name,
      completed: mine.length,
      kg: round1(mine.reduce((s, p) => s + kgOf(p), 0)),
      value: mine.reduce((s, p) => s + (p.settlement?.finalPrice ?? p.price), 0),
      activeNow: activeBy[String(u._id)] || 0,
    };
  });
  rows.sort((a, b) => b.completed - a.completed);

  res.json({ days, members: rows });
});