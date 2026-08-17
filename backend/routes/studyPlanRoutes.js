const express = require("express");
const router = express.Router();
const {
  createStudyPlan,
  getStudyPlans,
  getStudyPlanById,
  deleteStudyPlan,
} = require("../controllers/studyPlanController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", createStudyPlan);
router.get("/", getStudyPlans);
router.get("/:id", getStudyPlanById);
router.delete("/:id", deleteStudyPlan);

module.exports = router;
