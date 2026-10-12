const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const s = require("../validators/teamValidator");
const c = require("../controllers/teamController");

router.use(auth, role("collector"));

router.get("/mine", c.getMine);
router.post("/", validate(s.createTeamSchema), c.createTeam);

// owner
router.post("/members", validate(s.inviteSchema), c.invite);
router.delete("/members/:userId", c.removeMember);
router.patch("/members/:userId/vehicle", validate(s.memberVehicleSchema), c.setMemberVehicle);
router.post("/vehicles", validate(s.vehicleSchema), c.addVehicle);
router.delete("/vehicles/:id", c.removeVehicle);
router.get("/jobs", c.getTeamJobs);
router.post("/assign", validate(s.assignSchema), c.assign);
router.get("/stats", c.getStats);

// member
router.post("/invites/:teamId/accept", c.acceptInvite);
router.post("/invites/:teamId/decline", c.declineInvite);
router.post("/leave", c.leave);

module.exports = router;