const jwt = require("jsonwebtoken");

// Creates a signed JWT containing the user's id as the payload.
// The secret lives only on the server — anyone with it could forge tokens,
// so it must never be committed or exposed to the client.
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
