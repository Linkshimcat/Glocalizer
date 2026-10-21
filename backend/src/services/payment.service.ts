import { randomUUID } from 'node:crypto';
import { taskFetch } from '../utils/task-context.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { findPaymentByOrderId, insertPendingPayment, markPaymentDone, markPaymentFailed } from '../repositories/payment.repository.js';
import { activateMembership } from '../repositories/user.repository.js';

/** 결제 금액의 유일한 소스. 클라이언트가 보낸 금액은 절대 신뢰하지 않고, 여기서 고정한 값만
 *  주문 생성·Toss 승인 호출에 쓴다. */
const PLANS = {
  creator: { amount: 9900, name: '크리에이터 멤버십' },
} as const;

type PlanId = keyof typeof PLANS;

const MEMBERSHIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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
  [key: string]: unknown;
}

export async function confirmPayment(userId: string, input: ConfirmInput): Promise<void> {
  if (!env.TOSS_SECRET_KEY) throw new AppError('PAYMENT_NOT_CONFIGURED');

  const payment = await findPaymentByOrderId(input.orderId);
  if (!payment || payment.user_id !== userId) throw new AppError('PAYMENT_ORDER_NOT_FOUND');
  if (payment.status !== 'pending') throw new AppError('PAYMENT_ALREADY_PROCESSED');
  if (payment.amount !== input.amount) throw new AppError('PAYMENT_AMOUNT_MISMATCH');

  const auth = Buffer.from(`${env.TOSS_SECRET_KEY}:`).toString('base64');
  const response = await taskFetch(`${env.TOSS_API_BASE_URL}/v1/payments/confirm`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.amount }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();

  if (!response.ok) {
    await markPaymentFailed(input.orderId, body);
    throw new AppError('PAYMENT_CONFIRM_FAILED', { tossError: body });
  }

  const confirmed = body as TossConfirmResponse;
  const done = await markPaymentDone(input.orderId, { method: confirmed.method, tossPaymentKey: confirmed.paymentKey, rawResponse: confirmed });
  if (!done) throw new AppError('PAYMENT_ALREADY_PROCESSED');

  await activateMembership(userId, payment.plan_id, new Date(Date.now() + MEMBERSHIP_DURATION_MS));
}
