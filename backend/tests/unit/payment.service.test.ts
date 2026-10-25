import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claimPaymentConfirmation: vi.fn(),
  failPayment: vi.fn(),
  finalizePayment: vi.fn(),
  insertPendingPayment: vi.fn(),
  taskFetch: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({ env: { TOSS_CLIENT_KEY: 'test_gck_demo', TOSS_SECRET_KEY: 'test_gsk_demo' } }));
vi.mock('../../src/utils/task-context.js', () => ({ taskFetch: mocks.taskFetch }));
vi.mock('../../src/repositories/payment.repository.js', () => ({
  claimPaymentConfirmation: mocks.claimPaymentConfirmation,
  failPayment: mocks.failPayment,
  finalizePayment: mocks.finalizePayment,
  insertPendingPayment: mocks.insertPendingPayment,
}));

const { confirmPayment, createOrder } = await import('../../src/services/payment.service.js');
const { AppError } = await import('../../src/errors/app-error.js');
const input = { paymentKey: 'pay_test_1', orderId: 'order_test_1', amount: 9900 };
const approved = { paymentKey: input.paymentKey, orderId: input.orderId, totalAmount: input.amount, status: 'DONE', method: '카드' };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => vi.clearAllMocks());

describe('TossPayments test checkout', () => {
  it('persists a server-priced order before returning it', async () => {
    mocks.insertPendingPayment.mockResolvedValue({});
    const order = await createOrder('user-1', 'creator');
    expect(order).toMatchObject({ amount: 9900, orderName: '크리에이터 멤버십' });
    expect(order.orderId).toMatch(/^order_/);
    expect(mocks.insertPendingPayment).toHaveBeenCalledWith({ orderId: order.orderId, userId: 'user-1', planId: 'creator', amount: 9900 });
  });

  it('does not call Toss when the order is missing, owned by another user, or has a changed amount', async () => {
    mocks.claimPaymentConfirmation.mockRejectedValue(new AppError('PAYMENT_ORDER_NOT_FOUND'));
    await expect(confirmPayment('attacker', input)).rejects.toMatchObject({ code: 'PAYMENT_ORDER_NOT_FOUND' });
    expect(mocks.taskFetch).not.toHaveBeenCalled();

    mocks.claimPaymentConfirmation.mockRejectedValue(new AppError('PAYMENT_AMOUNT_MISMATCH'));
    await expect(confirmPayment('user-1', input)).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' });
    expect(mocks.taskFetch).not.toHaveBeenCalled();
  });

  it('rejects a simultaneous confirmation while another request holds the order claim', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('processing');
    await expect(confirmPayment('user-1', input)).rejects.toMatchObject({ code: 'PAYMENT_CONFIRM_IN_PROGRESS' });
    expect(mocks.taskFetch).not.toHaveBeenCalled();
  });

  it('confirms with Toss and finalizes payment plus membership together', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('claimed');
    mocks.taskFetch.mockResolvedValue(response(approved));
    await confirmPayment('user-1', input);
    expect(mocks.taskFetch).toHaveBeenCalledWith('https://api.tosspayments.com/v1/payments/confirm', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
    }));
    expect(mocks.finalizePayment).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', orderId: input.orderId, tossPaymentKey: input.paymentKey, method: '카드' }));
  });

  it('recovers a Toss-approved payment after the previous response was lost', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('recover');
    mocks.taskFetch.mockResolvedValue(response(approved));
    await confirmPayment('user-1', input);
    expect(mocks.taskFetch).toHaveBeenCalledTimes(1);
    expect(mocks.taskFetch.mock.calls[0][0]).toBe(`https://api.tosspayments.com/v1/payments/${input.paymentKey}`);
    expect(mocks.finalizePayment).toHaveBeenCalledTimes(1);
  });

  it('does not finalize if the Toss response does not match the saved order', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('claimed');
    mocks.taskFetch.mockResolvedValue(response({ ...approved, totalAmount: 1 }));
    await expect(confirmPayment('user-1', input)).rejects.toMatchObject({ code: 'PAYMENT_CONFIRM_FAILED' });
    expect(mocks.finalizePayment).not.toHaveBeenCalled();
  });

  it('returns success for an already completed request using the same payment key', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('done');
    await expect(confirmPayment('user-1', input)).resolves.toBeUndefined();
    expect(mocks.taskFetch).not.toHaveBeenCalled();
    expect(mocks.finalizePayment).not.toHaveBeenCalled();
  });

  it('marks a definite Toss rejection failed without activating membership', async () => {
    mocks.claimPaymentConfirmation.mockResolvedValue('claimed');
    mocks.taskFetch.mockResolvedValue(response({ code: 'REJECT_CARD_COMPANY', message: 'declined' }, 400));
    await expect(confirmPayment('user-1', input)).rejects.toMatchObject({ code: 'PAYMENT_CONFIRM_FAILED' });
    expect(mocks.failPayment).toHaveBeenCalledWith(input.orderId, input.paymentKey, expect.objectContaining({ code: 'REJECT_CARD_COMPANY' }));
    expect(mocks.finalizePayment).not.toHaveBeenCalled();
  });
});
