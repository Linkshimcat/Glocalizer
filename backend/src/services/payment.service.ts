import { randomUUID } from 'node:crypto';
import { taskFetch } from '../utils/task-context.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { claimPaymentConfirmation, failPayment, finalizePayment, insertPendingPayment } from '../repositories/payment.repository.js';

/** 결제 금액의 유일한 소스. 클라이언트가 보낸 금액은 절대 신뢰하지 않고, 여기서 고정한 값만
 *  주문 생성·Toss 승인 호출에 쓴다. */
const PLANS = {
  creator: { amount: 9900, name: '크리에이터 멤버십' },
} as const;

type PlanId = keyof typeof PLANS;

const MEMBERSHIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const TOSS_API_BASE_URL = 'https://api.tosspayments.com';

interface CreatedOrder {
  orderId: string;
  amount: number;
  orderName: string;
}

export async function createOrder(userId: string, planId: PlanId): Promise<CreatedOrder> {
  if (!env.TOSS_SECRET_KEY || !env.TOSS_CLIENT_KEY) throw new AppError('PAYMENT_NOT_CONFIGURED');
  const plan = PLANS[planId];
  if (!plan) throw new AppError('PAYMENT_INVALID_PLAN');

  const orderId = `order_${randomUUID()}`;
  await insertPendingPayment({ orderId, userId, planId, amount: plan.amount });
  return { orderId, amount: plan.amount, orderName: plan.name };
}

interface ConfirmInput {
  paymentKey: string;
  orderId: string;
  amount: number;
}

interface TossConfirmResponse {
  method: string;
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  [key: string]: unknown;
}

export async function confirmPayment(userId: string, input: ConfirmInput): Promise<void> {
  if (!env.TOSS_SECRET_KEY) throw new AppError('PAYMENT_NOT_CONFIGURED');
  const claim = await claimPaymentConfirmation({ ...input, userId });
  if (claim === 'done') return;
  if (claim === 'processing') throw new AppError('PAYMENT_CONFIRM_IN_PROGRESS');
  const auth = Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };

  if (claim === 'recover') {
    const lookup = await taskFetch(`${TOSS_API_BASE_URL}/v1/payments/${encodeURIComponent(input.paymentKey)}`, {
      headers, signal: AbortSignal.timeout(10_000),
    });
    if (lookup.ok) {
      const existing = await lookup.json() as TossConfirmResponse;
      if (existing.status === 'DONE') {
        await finalizeApprovedPayment(userId, input, existing);
        return;
      }
    } else if (lookup.status !== 404) {
      throw new AppError('PAYMENT_CONFIRM_IN_PROGRESS');
    }
  }

  const response = await taskFetch(`${TOSS_API_BASE_URL}/v1/payments/confirm`, {
    method: 'POST', headers,
    body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json() as TossConfirmResponse & { code?: string };

  if (!response.ok) {
    if (response.status >= 500 || body.code === 'ALREADY_PROCESSED_PAYMENT') throw new AppError('PAYMENT_CONFIRM_IN_PROGRESS');
    await failPayment(input.orderId, input.paymentKey, body);
    throw new AppError('PAYMENT_CONFIRM_FAILED');
  }
  await finalizeApprovedPayment(userId, input, body);
}

async function finalizeApprovedPayment(userId: string, input: ConfirmInput, payment: TossConfirmResponse): Promise<void> {
  if (payment.paymentKey !== input.paymentKey || payment.orderId !== input.orderId || payment.totalAmount !== input.amount || payment.status !== 'DONE') {
    throw new AppError('PAYMENT_CONFIRM_FAILED');
  }
  await finalizePayment({
    userId,
    orderId: input.orderId,
    method: payment.method,
    tossPaymentKey: payment.paymentKey,
    rawResponse: payment,
    expiresAt: new Date(Date.now() + MEMBERSHIP_DURATION_MS),
  });
}
