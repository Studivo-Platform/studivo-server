const { z } = require('zod');

const createOfferSchema = z.object({
  requestId: z
    .string({ required_error: 'Request ID is required' })
    .regex(/^[a-f\d]{24}$/i, 'Invalid request ID format'),

  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than 0'),

  description: z
    .string({ required_error: 'Description is required' })
    .min(20,   'Description must be at least 20 characters')
    .max(1000, 'Description must be at most 1000 characters')
    .trim(),

  deliveryNote: z
    .string()
    .max(200, 'Delivery note must be at most 200 characters')
    .optional(),
  // images come from multipart/form-data via multer — not validated here
});

const updateOfferSchema = z.object({
  price: z
    .number()
    .positive('Price must be greater than 0')
    .optional(),

  description: z
    .string()
    .min(20)
    .max(1000)
    .trim()
    .optional(),

  deliveryNote: z
    .string()
    .max(200)
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided to update' }
);

module.exports = { createOfferSchema, updateOfferSchema };