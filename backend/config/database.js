const mongoose = require("mongoose");

// Connects to MongoDB Atlas using the URI stored in .env
// Mongoose manages a connection pool internally, so this only needs to run once at startup
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not defined in environment variables. Please set MONGO_URI in your environment settings."
      );
    }
    if (process.env.NODE_ENV === "production" && process.env.MONGO_URI.includes("localhost")) {
      throw new Error(
        "MONGO_URI is pointing to localhost (127.0.0.1) in production. Please provide a valid MongoDB Atlas connection string (mongodb+srv://...)."
      );
    }
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
