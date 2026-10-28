import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { PaymentRow } from '../types/payment.js';
import { AppError } from '../errors/app-error.js';

interface InsertPendingPaymentInput {
  orderId: string;
  userId: string;
  planId: string;
  amount: number;
}

export async function insertPendingPayment(input: InsertPendingPaymentInput): Promise<PaymentRow> {
  const result = await supabase
    .from('payments')
    .insert({ order_id: input.orderId, user_id: input.userId, plan_id: input.planId, amount: input.amount })
    .select()
    .single();
  return unwrapRow<PaymentRow>(result, '주문 생성에 실패했습니다.');
}

interface FinalizePaymentInput {
  userId: string;
  orderId: string;
  method: string;
  tossPaymentKey: string;
  rawResponse: unknown;
  expiresAt: Date;
}

export async function claimPaymentConfirmation(input: { orderId: string; userId: string; amount: number; paymentKey: string }): Promise<'claimed' | 'recover' | 'done' | 'processing'> {
  const result = await supabase.rpc('claim_payment_confirmation', {
    p_order_id: input.orderId, p_user_id: input.userId, p_amount: input.amount, p_payment_key: input.paymentKey,
  });
  if (result.error) {
    const message = result.error.message;
    if (result.error.code === '23505') throw new AppError('PAYMENT_ALREADY_PROCESSED');
    if (message.includes('PAYMENT_ORDER_NOT_FOUND')) throw new AppError('PAYMENT_ORDER_NOT_FOUND');
    if (message.includes('PAYMENT_AMOUNT_MISMATCH')) throw new AppError('PAYMENT_AMOUNT_MISMATCH');
    if (message.includes('PAYMENT_ALREADY_PROCESSED')) throw new AppError('PAYMENT_ALREADY_PROCESSED');
    if (message.includes('PAYMENT_CONFIRM_IN_PROGRESS')) throw new AppError('PAYMENT_CONFIRM_IN_PROGRESS');
    throw new AppError('INTERNAL_ERROR', { cause: message }, '결제 확인을 시작하지 못했습니다.');
  }
  return result.data as 'claimed' | 'recover' | 'done' | 'processing';
}

export async function finalizePayment(input: FinalizePaymentInput): Promise<void> {
  const result = await supabase.rpc('finalize_payment_and_membership', {
    p_order_id: input.orderId, p_user_id: input.userId, p_payment_key: input.tossPaymentKey,
    p_method: input.method, p_raw_response: input.rawResponse, p_membership_expires_at: input.expiresAt.toISOString(),
  });
  if (result.error) {
    if (result.error.message.includes('PAYMENT_ALREADY_PROCESSED')) throw new AppError('PAYMENT_ALREADY_PROCESSED');
    throw new AppError('INTERNAL_ERROR', { cause: result.error.message }, '결제 및 멤버십 반영에 실패했습니다. 다시 확인해주세요.');
  }
}

export async function failPayment(orderId: string, paymentKey: string, rawResponse: unknown): Promise<void> {
  const result = await supabase.rpc('fail_payment_confirmation', {
    p_order_id: orderId, p_payment_key: paymentKey, p_raw_response: rawResponse,
  });
  unwrapVoid(result, '결제 실패 상태를 저장하지 못했습니다.');
}

/** 시작만 하고 끝내지 않은 주문(pending)은 내역으로 보여주지 않는다. */
export type PaymentListRow = Omit<PaymentRow, 'toss_payment_key' | 'raw_response'>;

export async function listPaymentsByUser(userId: string, limit: number): Promise<PaymentListRow[]> {
  const result = await supabase
    .from('payments')
    .select('id, order_id, user_id, plan_id, amount, status, method, approved_at, created_at, updated_at')
    .eq('user_id', userId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);
  return unwrapList<PaymentListRow>(result, '결제 내역을 불러오지 못했습니다.');
}
