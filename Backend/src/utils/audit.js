const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

// Every action that can appear in the log, with the label the admin viewer
// shows. Add new entries here — the viewer's filter reads this list.
const AUDIT_ACTIONS = {
  "rate.update": "Scrap rate changed",
  "catalog.update": "Item catalog updated",
  "verification.approve": "ID approved",
  "verification.reject": "ID rejected",
  "verification.revoke": "ID re-verification requested",
  "verification.expire": "ID verification expired",
  "collector.create": "Collector added",
  "collector.reset_password": "Collector password reset",
  "collector.reinstate": "Collector reinstated",
  "user.deactivate": "Account deactivated",
  "user.activate": "Account activated",
  "payout.approve": "Payout approved",
  "payout.reject": "Payout rejected",
  "dispute.resolve": "Dispute resolved",
};

/**
 * Records an admin/system action. Never throws — a failed audit write is
 * logged to the console but must not undo or block the action it describes.
 *
 * @param {object|null} req  Express request (admin actions) or null (system jobs)
 * @param {{action:string,targetType?:string,targetId?:any,targetLabel?:string,details?:object}} entry
 */
async function logAudit(req, entry) {
  try {
    let actor = {};
    if (req?.user?.id) {
      const u = await User.findById(req.user.id).select("name email");
      actor = { actor: req.user.id, actorName: u?.name || "Admin", actorEmail: u?.email || null };
    }
    await AuditLog.create({
      ...actor,
      action: entry.action,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      targetLabel: entry.targetLabel || null,
      details: entry.details || null,
      ip: req?.ip || null,
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { logAudit, AUDIT_ACTIONS };