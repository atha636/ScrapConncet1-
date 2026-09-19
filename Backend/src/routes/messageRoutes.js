const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");
const { sendMessageSchema } = require("../validators/messageValidator");
const { getMessages, sendMessage, markMessagesRead } = require("../controllers/messageController");

// Mounted at /api/pickup/:id/messages — nested under pickup since a
// conversation only exists in the context of one pickup.
router.get("/:id/messages", auth, getMessages);

// Multer runs first and simply calls next() untouched for a plain JSON
// request (no "image" field) — same conditional pattern
// pickupController's own photo-upload route uses, so a text-only send
// behaves exactly as before.
router.post("/:id/messages", auth, upload.single("image"), validate(sendMessageSchema), sendMessage);

router.patch("/:id/messages/read", auth, markMessagesRead);

module.exports = router;