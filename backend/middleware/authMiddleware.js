const jwt = require("jsonwebtoken");

// Protects a route by requiring a valid JWT in the Authorization header.
// Expected format: "Authorization: Bearer <token>"
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded payload (contains user id) to the request
    // so downstream controllers know who's calling
    req.user = decoded;
    next();
  } catch (error) {
    // Covers both expired tokens and tampered/invalid signatures
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = protect;
