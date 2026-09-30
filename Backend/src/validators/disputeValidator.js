const { z } = require("zod");
const { REASONS } = require("../models/Dispute");

const createDisputeSchema = z.object({
  reason: z.enum(REASONS),
  description: z.string().trim().max(1000).optional(),
});

const resolveDisputeSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolutionNotes: z.string().trim().max(1000).optional(),
  // Only used when the dispute is about a held weight settlement.
  finalPrice: z.number().min(1).max(1000000).optional(),
});

module.exports = { createDisputeSchema, resolveDisputeSchema };