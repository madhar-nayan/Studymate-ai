require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 6001;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`StudyMate AI server running on port ${PORT}`);
  });
};

start();
