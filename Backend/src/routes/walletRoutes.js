const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validate = require("../middleware/validate");
const { requestPayoutSchema } = require("../validators/payoutValidator");
const {
  getSummary,
  getTransactions,
  getEarningsTrend,
  requestPayout,
  getMyPayouts,
} = require("../controllers/walletController");

router.get("/summary", auth, role("collector"), getSummary);
router.get("/trend", auth, role("collector"), getEarningsTrend);
router.get("/transactions", auth, role("collector"), getTransactions);
router.post("/payout", auth, role("collector"), validate(requestPayoutSchema), requestPayout);
router.get("/payouts", auth, role("collector"), getMyPayouts);

module.exports = router;