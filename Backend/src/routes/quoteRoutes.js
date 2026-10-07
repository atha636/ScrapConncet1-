const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { compareQuotesSchema, rateCardSchema, updateCatalogItemSchema } = require("../validators/quoteValidator");
const {
  getCatalog,
  getCatalogAdmin,
  updateCatalogItem,
  getRateCard,
  saveRateCard,
  compareQuotes,
} = require("../controllers/quoteController");

// Users: the item list and the comparison itself
router.get("/catalog", auth, getCatalog);
router.post("/compare", auth, role("user"), validate(compareQuotesSchema), compareQuotes);

// Collectors: their own per-kg rate card
router.get("/rate-card", auth, role("collector"), getRateCard);
router.put("/rate-card", auth, role("collector"), validate(rateCardSchema), saveRateCard);

// Admin: tune the countable-item catalog
router.get("/catalog/all", auth, role("admin"), getCatalogAdmin);
router.put("/catalog/:key", auth, role("admin"), validate(updateCatalogItemSchema), updateCatalogItem);

module.exports = router;