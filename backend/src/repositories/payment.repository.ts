import { supabase } from '../config/supabase.js';
import { unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { PaymentRow } from '../types/payment.js';

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

export async function findPaymentByOrderId(orderId: string): Promise<PaymentRow | null> {
  const result = await supabase.from('payments').select().eq('order_id', orderId).maybeSingle();
  return unwrapNullableRow<PaymentRow>(result, '주문 조회에 실패했습니다.');
}

interface MarkPaymentDoneInput {
  method: string;
  tossPaymentKey: string;
  rawResponse: unknown;
}

/** status='pending'인 주문만 done으로 전환한다(동시 confirm 요청에 대한 방어). */
export async function markPaymentDone(orderId: string, input: MarkPaymentDoneInput): Promise<PaymentRow | null> {
  const result = await supabase
    .from('payments')
    .update({
      status: 'done',
      method: input.method,
      toss_payment_key: input.tossPaymentKey,
      raw_response: input.rawResponse,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  return unwrapNullableRow<PaymentRow>(result, '결제 완료 처리에 실패했습니다.');
}

export async function markPaymentFailed(orderId: string, rawResponse: unknown): Promise<void> {
  const result = await supabase
    .from('payments')
    .update({ status: 'failed', raw_response: rawResponse, updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('status', 'pending');
  unwrapVoid(result, '결제 실패 처리에 실패했습니다.');
}
