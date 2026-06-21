require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  // Server
  PORT:       z.string().default('5000'),
  NODE_ENV:   z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url({ message: 'CLIENT_URL must be a valid URL' }),

  // MongoDB
  MONGODB_URI: z.string().min(1, { message: 'MONGODB_URI is required' }),

  // Redis
  REDIS_URL: z.string().min(1, { message: 'REDIS_URL is required' }),

  // JWT
  JWT_SECRET:         z.string().min(32, { message: 'JWT_SECRET must be at least 32 chars' }),
  JWT_REFRESH_SECRET: z.string().min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 chars' }),
  JWT_ACCESS_EXPIRES:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', { message: 'OPENAI_API_KEY must start with sk-' }),
  OPENAI_MODEL:   z.string().default('gpt-4o-mini'),
  AI_CACHE_TTL:   z.string().default('86400').transform(Number),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, { message: 'CLOUDINARY_CLOUD_NAME is required' }),
  CLOUDINARY_API_KEY:    z.string().min(1, { message: 'CLOUDINARY_API_KEY is required' }),
  CLOUDINARY_API_SECRET: z.string().min(1, { message: 'CLOUDINARY_API_SECRET is required' }),

  // SendGrid
  SENDGRID_API_KEY:    z.string().startsWith('SG.', { message: 'SENDGRID_API_KEY must start with SG.' }),
  SENDGRID_FROM_EMAIL: z.string().email({ message: 'SENDGRID_FROM_EMAIL must be a valid email' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX:       z.string().default('100').transform(Number),
  AI_RATE_LIMIT_MAX:    z.string().default('10').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Missing or invalid environment variables:');

  console.error('─────────────────────────────────────────────');
  parsed.error.errors.forEach((err) => {
    console.error(`   • ${err.path[0]}: ${err.message}`);
  });
  console.error('─────────────────────────────────────────────');
  
  console.error('  Check your .env file and add the missing variables.\n');
  process.exit(1);
}

module.exports = { env: parsed.data };