const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const aiRoutes = require("./routes/aiRoutes");
const quizRoutes = require("./routes/quizRoutes");
const chatRoutes = require("./routes/chatRoutes");
const studyPlanRoutes = require("./routes/studyPlanRoutes");

const app = express();

// Security headers
app.use(helmet());

// Allow requests from the frontend origin only
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse incoming JSON bodies
app.use(express.json());

// HTTP request logging (only in development, to keep production logs clean)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/study-plan", studyPlanRoutes);

// 404 handler — runs if no route matched above
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized error handler — catches errors passed via next(err)
// Handles Multer errors (file too large, wrong type) with clearer messages
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File exceeds the 10MB limit" });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
