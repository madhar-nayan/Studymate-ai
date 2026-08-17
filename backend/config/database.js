const mongoose = require("mongoose");

// Connects to MongoDB Atlas using the URI stored in .env
// Mongoose manages a connection pool internally, so this only needs to run once at startup
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit the process if the DB fails to connect — the app can't run without it
    process.exit(1);
  }
};

// Log runtime connection issues (network drop, auth expiry, etc.)
mongoose.connection.on("error", (err) => {
  console.error(`MongoDB runtime error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

module.exports = connectDB;
