const { z } = require("zod");

// text alone is optional now (an image-only message is valid) — "at least
// one of text or image" is checked in the controller, where req.file
// (from multer, parsed before this validator ever runs — see
// messageRoutes.js) is actually visible. Zod only ever sees req.body.
const sendMessageSchema = z.object({
  text: z.string().trim().max(1000).optional(),
});

module.exports = { sendMessageSchema };