const { z } = require("zod");

const CATEGORIES = ["pickup", "payment", "collector", "account", "app", "other"];
const STATUSES = ["open", "in_progress", "resolved", "closed"];

const text = z.string().trim().min(1, "Write a message").max(2000, "Keep it under 2000 characters");

const createTicketSchema = z.object({
  category: z.enum(CATEGORIES),
  subject: z.string().trim().min(5, "Give it a short title (at least 5 characters)").max(100),
  message: text.min(10, "Tell us a bit more (at least 10 characters)"),
});

const replySchema = z.object({ message: text });

const setStatusSchema = z.object({ status: z.enum(STATUSES) });

module.exports = { createTicketSchema, replySchema, setStatusSchema, CATEGORIES, STATUSES };