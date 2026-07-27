const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { getSummary, getTransactions } = require("../controllers/walletController");

router.get("/summary", auth, role("collector"), getSummary);
router.get("/transactions", auth, role("collector"), getTransactions);

module.exports = router;