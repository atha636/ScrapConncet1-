const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { subscribeSchema, unsubscribeSchema } = require("../validators/pushValidator");
const { getVapidPublicKey, subscribe, unsubscribe } = require("../controllers/pushController");

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", auth, validate(subscribeSchema), subscribe);
router.post("/unsubscribe", auth, validate(unsubscribeSchema), unsubscribe);

module.exports = router;