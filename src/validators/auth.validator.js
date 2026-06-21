const { z } = require('zod');

const registerSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .min(2,  'Name must be at least 2 characters')
        .max(50, 'Name must be at most 50 characters')
        .trim(),

    email: z
        .string({ required_error: 'Email is required' })
        .email('Please provide a valid email address')
        .toLowerCase(),

    password: z
        .string({ required_error: 'Password is required' })
        .min(8, 'Password must be at least 8 characters')
        .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),

    role: z
        .enum(['student', 'seller'], {
        errorMap: () => ({ message: 'Role must be student or seller' }),
        })
        .default('student'),

    university: z.string().trim().optional(),
    phone:      z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please provide a valid email address')
    .toLowerCase(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };