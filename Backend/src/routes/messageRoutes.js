const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { sendMessageSchema } = require("../validators/messageValidator");
const { getMessages, sendMessage } = require("../controllers/messageController");

// Mounted at /api/pickup/:id/messages — nested under pickup since a
// conversation only exists in the context of one pickup.
router.get("/:id/messages", auth, getMessages);
router.post("/:id/messages", auth, validate(sendMessageSchema), sendMessage);

module.exports = router;