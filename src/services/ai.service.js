const { OpenAI } = require('openai');
const { redis }  = require('../config/redis');
const { env }    = require('../config/env');
const { hashText } = require('../utils/hashText');
const { normalizeText } = require('../utils/normalizeText');
const { fallbackEngine } = require('./fallback.engine');

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// Prompt
// The prompt is the most important part — it tells GPT exactly what to return.
// We use a strict JSON-only instruction to avoid any extra text in the response.
const buildParsePrompt = (rawText) => `
You are a structured data extractor for a student marketplace in Egypt.
Your job is to extract product/service requirements from a student's request.
The request may be in Arabic, English, or both (Arabizi).

RULES:
- Always respond with valid JSON only. No explanation, no markdown, no extra text.
- If you cannot determine a value, use null.
- Budget values must be numbers in EGP (Egyptian Pounds).
- Keywords should be in both Arabic and English when possible.

Student request (normalized): "${normalizeText(rawText)}"

Return exactly this JSON structure:
{
  "category": "electronics|housing|books|services|transport|food|other",
  "subCategory": "specific type such as laptop, apartment, textbook, or null",
  "specs": { "key": "value" },
  "budget": { "min": null_or_number, "max": null_or_number, "currency": "EGP" },
  "location": "city or area if mentioned, or null",
  "keywords": ["keyword1", "keyword2"]
}
`.trim();

//  Normalized
const getNormalizedKey = (rawText) => {
  const normalized = normalizeText(rawText);
  return `ai:parse:${hashText(normalized)}`;
};

// Cache helpers
const getCachedParse = async (rawText) => {
  const key = getNormalizedKey(rawText);
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

const setCachedParse = async (rawText, parsedData) => {
  const key = getNormalizedKey(rawText);
    // Cache for AI_CACHE_TTL seconds (default 24 hours)
  await redis.setex(key, env.AI_CACHE_TTL, JSON.stringify(parsedData));
};

// Keyword fallback
// Used when OpenAI is unavailable or throws an error.
// Simple keyword detection — not as smart as GPT but keeps the app working.
// const keywordFallback = (rawText) => {
//   const text = rawText.toLowerCase();

//   // CATEGORY DETECTION
//   const categoryMap = {
//     electronics: ['laptop', 'لاب توب', 'موبايل', 'phone', 'computer', 'كمبيوتر', 'tablet'],
//     housing:     ['شقة', 'apartment', 'rent', 'ايجار', 'غرفة', 'room'],
//     books:       ['كتاب', 'book', 'textbook', 'رواية'],
//     services:    ['مدرس', 'tutor', 'تصميم', 'design', 'freelance'],
//     transport:   ['عربية', 'car', 'ride', 'uber'],
//     food:        ['اكل', 'food', 'مطعم', 'restaurant'],
//   };

//   let category = 'other';

//   for (const [cat, keywords] of Object.entries(categoryMap)) {
//     if (keywords.some(k => text.includes(k))) {
//       category = cat;
//       break;
//     }
//   }

//   // SUBCATEGORY LOGIC
//   let subCategory = null;

//   if (category === 'electronics') {
//     if (text.includes('laptop') || text.includes('لاب')) {
//       subCategory = 'laptop';
//     } else if (text.includes('phone') || text.includes('موبايل')) {
//       subCategory = 'smartphone';
//     }
//   }

//   if (category === 'services') {
//     if (text.includes('design')) subCategory = 'design';
//     if (text.includes('tutor') || text.includes('مدرس')) subCategory = 'education';
//   }

//   // SPEC EXTRACTION
//   const specs = {};

//   if (text.includes('برمجة') || text.includes('programming')) {
//     specs.use = 'programming';
//   }

//   if (text.includes('gaming') || text.includes('جيمينج')) {
//     specs.use = 'gaming';
//   }

//   // BUDGET EXTRACTION
//   const budgetMatch = text.match(/(\d[\d,]*)\s*(egp|جنيه|le|pound)/i);

//   const budget = {
//     min: null,
//     max: budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, ''), 10) : null,
//     currency: 'EGP'
//   };

//   // KEYWORDS CLEAN
//   const stopWords = ['عايز','محتاج','اريد','طلب','request','the','for','في','على'];

//   const keywords = rawText
//   .split(/\s+/)
//   .map(w => w.toLowerCase())
//   .filter(w => w.length > 2)
//   .filter(w => /^[a-zA-Z\u0600-\u06FF]+$/.test(w))
//   .filter(w => !stopWords.includes(w))
//   .slice(0, 10);

//   return {
//     category,
//     subCategory,
//     specs,
//     budget,
//     location: null,
//     keywords
//   };
// };

// Main parse function
const parseRequest = async (rawText) => {
  // 1. Check cache first — same request within 24h → no OpenAI call
  const cached = await getCachedParse(rawText);
  if (cached) {
    console.log('[AI] Cache hit for request:', rawText.slice(0, 50));
    return { parsedData: cached, fromCache: true };
  }

  // 2. Call OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model:       env.OPENAI_MODEL,
      messages:    [{ role: 'user', content: buildParsePrompt(rawText) }],
      temperature: 0,          // 0 = deterministic, no creativity needed
      max_tokens:  300,        // JSON response is small, cap to save cost
    });

    const raw         = completion.choices[0].message.content.trim();
    const parsedData  = JSON.parse(raw);

    // 3. Cache the result
    await setCachedParse(rawText, parsedData);

    console.log('[AI] OpenAI parsed:', rawText.slice(0, 50), '→', parsedData.category);
    return { parsedData, fromCache: false };

  } catch (error) {
    // 4. Fallback if OpenAI fails (network error, quota exceeded, etc.)
    console.error('[AI] OpenAI failed, using fallback engine:', error.message);
    const parsedData = fallbackEngine(rawText);

    return {
        parsedData,
        fromCache: false,
        usedFallback: true
    };
  }
};

module.exports = { parseRequest };