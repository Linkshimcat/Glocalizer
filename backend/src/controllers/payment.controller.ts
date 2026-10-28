import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { confirmPayment, createOrder, listPayments } from '../services/payment.service.js';

export async function createPaymentOrderHandler(req: Request, res: Response) {
  const { planId } = req.body as { planId: 'creator' };
  const order = await createOrder(requireAuth(req).sub, planId);
  res.status(201).json(order);
}

export async function confirmPaymentHandler(req: Request, res: Response) {
  const { paymentKey, orderId, amount } = req.body as { paymentKey: string; orderId: string; amount: number };
  await confirmPayment(requireAuth(req).sub, { paymentKey, orderId, amount });
  res.status(204).end();
}

export async function listPaymentsHandler(req: Request, res: Response) {
  res.status(200).json({ payments: await listPayments(requireAuth(req).sub) });
}
