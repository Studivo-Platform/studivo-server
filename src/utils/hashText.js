const crypto = require("crypto");

// Generates a deterministic SHA256 hash from any string.
// Used as Redis cache key: same rawText → same hash → same cached result.
// Example: hashText('عايز لاب توب') → 'a3f7c2...' (64 char hex string)
const hashText = (text) => {
  return crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase()) // Normalize before hashing
    .digest("hex");
};

module.exports = { hashText };