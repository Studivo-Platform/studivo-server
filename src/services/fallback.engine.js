const STOP_WORDS = new Set([
  'عايز', 'محتاج', 'اريد', 'أريد', 'طلب', 'the', 'for', 'في', 'على', 'من', 'الى'
]);

// Weighted keywords (core intelligence)
const KEYWORD_WEIGHTS = {
  electronics: {
    laptop: 5,
    'لاب': 5,
    'توب': 5,
    phone: 5,
    موبايل: 5,
    computer: 4,
    كمبيوتر: 4,
    tablet: 4,
  },

  housing: {
    شقة: 5,
    apartment: 5,
    ايجار: 4,
    rent: 4,
    غرفة: 3,
  },

  services: {
    design: 4,
    تصميم: 4,
    tutor: 5,
    مدرس: 5,
    freelance: 4,
  }
};

// Detect category by scoring
const detectCategory = (words) => {
  const scores = {};

  for (const word of words) {
    for (const [category, map] of Object.entries(KEYWORD_WEIGHTS)) {
      if (map[word]) {
        scores[category] = (scores[category] || 0) + map[word];
      }
    }
  }

  let best = 'other';
  let max = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > max) {
      max = score;
      best = cat;
    }
  }

  return best;
};

// Subcategory inference
const detectSubCategory = (text, category) => {
  if (category === 'electronics') {
    if (text.includes('laptop') || text.includes('لاب') || text.includes('توب')) {
      return 'laptop';
    }
    if (text.includes('phone') || text.includes('موبايل')) {
      return 'smartphone';
    }
  }

  if (category === 'services') {
    if (text.includes('design') || text.includes('تصميم')) return 'design';
    if (text.includes('tutor') || text.includes('مدرس')) return 'education';
  }

  return null;
};

// Specs inference
const extractSpecs = (text) => {
  const specs = {};

  if (text.includes('برمجة') || text.includes('programming')) {
    specs.use = 'programming';
  }

  if (text.includes('gaming') || text.includes('جيمينج')) {
    specs.use = 'gaming';
  }

  if (text.includes('student') || text.includes('طالب')) {
    specs.user = 'student';
  }

  return specs;
};

// Budget extraction
const extractBudget = (text) => {
  const match = text.match(/(\d[\d,]*)\s*(egp|جنيه|le|pound)/i);

  return {
    min: null,
    max: match ? parseInt(match[1].replace(/,/g, ''), 10) : null,
    currency: 'EGP'
  };
};

// Main engine
const fallbackEngine = (rawText) => {
  const normalized = rawText.toLowerCase();

  const words = normalized
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));

  const category = detectCategory(words);
  const subCategory = detectSubCategory(normalized, category);
  const specs = extractSpecs(normalized);
  const budget = extractBudget(normalized);

  return {
    category,
    subCategory,
    specs,
    budget,
    location: null,
    keywords: words.slice(0, 10)
  };
};

module.exports = { fallbackEngine };