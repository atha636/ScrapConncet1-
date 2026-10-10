const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { createTicketSchema, replySchema, setStatusSchema } = require("../validators/supportValidator");
const c = require("../controllers/supportController");

// Users and collectors: raise and follow their own requests
router.post("/tickets", auth, role("user", "collector"), validate(createTicketSchema), c.createTicket);
router.get("/tickets/mine", auth, role("user", "collector"), c.listMine);
router.get("/tickets/mine/:id", auth, role("user", "collector"), c.getMine);
router.post("/tickets/mine/:id/reply", auth, role("user", "collector"), validate(replySchema), c.replyMine);

// Admin: the queue
router.get("/admin/tickets", auth, role("admin"), c.adminList);
router.get("/admin/tickets/:id", auth, role("admin"), c.adminGet);
router.post("/admin/tickets/:id/reply", auth, role("admin"), validate(replySchema), c.adminReply);
router.patch("/admin/tickets/:id/status", auth, role("admin"), validate(setStatusSchema), c.adminSetStatus);

module.exports = router;