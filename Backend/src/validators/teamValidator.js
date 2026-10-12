const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const createTeamSchema = z.object({ name: z.string().trim().min(2, "Team name is required").max(60) });
const inviteSchema = z.object({ email: z.string().trim().toLowerCase().email() });
const vehicleSchema = z.object({
  label: z.string().trim().min(2, "Give the vehicle a name").max(40),
  plate: z.string().trim().max(15).optional(),
  type: z.enum(["bike", "auto", "van", "truck"]).optional(),
});
const memberVehicleSchema = z.object({ vehicleId: objectId.nullable() });
const assignSchema = z.object({ pickupId: objectId, memberId: objectId.nullable() });

module.exports = { createTeamSchema, inviteSchema, vehicleSchema, memberVehicleSchema, assignSchema };