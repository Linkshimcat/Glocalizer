export type PaymentStatus = 'pending' | 'processing' | 'done' | 'failed' | 'canceled';

export interface PaymentRow {
  id: string;
  order_id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  toss_payment_key: string | null;
  approved_at: string | null;
  raw_response: unknown;
  created_at: string;
  updated_at: string;
}
