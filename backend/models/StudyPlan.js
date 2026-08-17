const mongoose = require("mongoose");

const dayPlanSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // "2026-08-20" format — simple and sortable
    topics: {
      type: [
        {
          subject: String,
          topic: String,
          hours: Number,
          priority: { type: String, enum: ["high", "medium", "low"], lowercase: true, default: "medium" },
        },
      ],
      default: [],
    },
    revision: {
      type: Boolean,
      default: false, // marks a day set aside for revision rather than new topics
    },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examDate: {
      type: String,
      required: true,
    },
    subjects: {
      type: [String],
      required: true,
    },
    dailyHours: {
      type: Number,
      required: true,
    },
    schedule: {
      type: [dayPlanSchema],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyPlan", studyPlanSchema);
