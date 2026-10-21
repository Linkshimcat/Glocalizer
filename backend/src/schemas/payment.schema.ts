import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  planId: z.enum(['creator']),
});

export const confirmPaymentSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});
