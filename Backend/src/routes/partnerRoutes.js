const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { partnerSchema } = require("../validators/partnerValidator");
const { listPartners, listAllPartners, createPartner, updatePartner } = require("../controllers/partnerController");

router.get("/", auth, role("collector", "admin"), listPartners);

router.get("/all", auth, role("admin"), listAllPartners);
router.post("/", auth, role("admin"), validate(partnerSchema), createPartner);
router.put("/:id", auth, role("admin"), validate(partnerSchema), updatePartner);

module.exports = router;