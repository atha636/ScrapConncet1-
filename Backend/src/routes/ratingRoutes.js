const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { submitRatingSchema } = require("../validators/ratingValidator");
const { getRatings, submitRating } = require("../controllers/ratingController");

router.get("/:id/rating", auth, getRatings);
router.post("/:id/rating", auth, validate(submitRatingSchema), submitRating);

module.exports = router;