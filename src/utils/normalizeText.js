const normalizeText = (text) => {
  if (!text) return "";

  return text
    .toLowerCase()
    .trim()

    // remove extra spaces
    .replace(/\s+/g, " ")

    // intent normalization (Arabic + English)
    .replace(/\b(عايز|محتاج|اريد|أريد|ابغى|بدي)\b/g, "request")
    .replace(/\b(need|want|looking for|searching for)\b/g, "request")

    // product normalization
    .replace(/\b(لابتوب|لاب توب|laptop|notebook|pc|computer|كمبيوتر)\b/g, "laptop")

    // phone normalization
    .replace(/\b(موبايل|هاتف|phone|mobile)\b/g, "phone")

    // currency normalization
    .replace(/\b(جنيه|egp|le|pound|pounds)\b/g, "egp")

    // remove commas in numbers
    .replace(/,/g, "")

    // unify arabic variants
    .replace(/أ/g, "ا")
    .replace(/إ/g, "ا")
    .replace(/آ/g, "ا");
};

module.exports = { normalizeText };