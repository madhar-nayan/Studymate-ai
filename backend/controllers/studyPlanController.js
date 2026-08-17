const StudyPlan = require("../models/StudyPlan");
const { generateStudyPlan } = require("../services/aiService");

// @route  POST /api/study-plan
// @desc   Generate an AI study schedule and save it
// @body   { subjects: string[], dailyHours: number, examDate: "YYYY-MM-DD" }
exports.createStudyPlan = async (req, res) => {
  try {
    const { subjects, dailyHours, examDate } = req.body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "subjects must be a non-empty array" });
    }
    if (!dailyHours || typeof dailyHours !== "number" || dailyHours <= 0) {
      return res.status(400).json({ message: "dailyHours must be a positive number" });
    }
    if (!examDate) {
      return res.status(400).json({ message: "examDate is required (YYYY-MM-DD)" });
    }

    const schedule = await generateStudyPlan(subjects, dailyHours, examDate);

    const plan = await StudyPlan.create({
      user: req.user.id,
      examDate,
      subjects,
      dailyHours,
      schedule,
    });

    res.status(201).json({ plan });
  } catch (error) {
    res.status(500).json({ message: "Study plan generation failed", error: error.message });
  }
};

// @route  GET /api/study-plan
// @desc   List all study plans belonging to the logged-in user
exports.getStudyPlans = async (req, res) => {
  try {
    const plans = await StudyPlan.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ plans });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch study plans", error: error.message });
  }
};

// @route  GET /api/study-plan/:id
exports.getStudyPlanById = async (req, res) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, user: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: "Study plan not found" });
    }
    res.status(200).json({ plan });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch study plan", error: error.message });
  }
};

// @route  DELETE /api/study-plan/:id
exports.deleteStudyPlan = async (req, res) => {
  try {
    const plan = await StudyPlan.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: "Study plan not found" });
    }
    res.status(200).json({ message: "Study plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete study plan", error: error.message });
  }
};
