const { z } = require("zod");

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Message can't be empty").max(1000),
});

module.exports = { sendMessageSchema };