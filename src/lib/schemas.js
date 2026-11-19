import { z } from 'zod';
import { NextResponse } from 'next/server';

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['customer', 'grid_admin']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createOrderSchema = z.object({
  pickup_lat: z.coerce.number().min(12.83).max(13.14),
  pickup_lng: z.coerce.number().min(77.46).max(77.75),
  dropoff_lat: z.coerce.number().min(12.83).max(13.14),
  dropoff_lng: z.coerce.number().min(77.46).max(77.75),
  zone_id: z.coerce.number().int().positive(),
  weight_kg: z.coerce.number().positive().max(20),
  method: z.enum(['UPI', 'Card', 'NetBanking', 'Wallet']),
  force_failure: z.coerce.boolean().optional().default(false),
});

export const telemetryIngestSchema = z.object({
  points: z.array(
    z.object({
      drone_id: z.number().int().positive(),
      zone_id: z.string(),
      location: z.object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
      }),
      battery_pct: z.number().min(0).max(100),
      temperature_c: z.number(),
      signal_strength: z.number(),
      ts: z.string().datetime().optional(),
    })
  ),
});

export const repairDroneSchema = z.object({
  drone_id: z.number().int().positive(),
  battery_pct: z.coerce.number().min(0).max(100).default(100),
});

/**
 * Validate a request body against a Zod schema.
 * @param {object} body
 * @param {import('zod').ZodSchema} schema
 * @returns {{ok: true, data: object} | {ok: false, errors: object}}
 */
export function validate(body, schema) {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error.flatten().fieldErrors };
}

/**
 * Build a consistent JSON success response.
 * @param {object} data
 * @param {number} [status]
 * @returns {NextResponse}
 */
export function jsonOk(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Build a consistent JSON error response.
 * @param {number} status
 * @param {string} message
 * @param {object} [errors]
 * @returns {NextResponse}
 */
export function jsonError(status, message, errors = null) {
  return new NextResponse(
    JSON.stringify({ error: message, ...(errors ? { errors } : {}) }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
