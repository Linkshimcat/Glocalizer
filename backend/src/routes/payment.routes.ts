import { Router } from 'express';
import { confirmPaymentHandler, createPaymentOrderHandler, listPaymentsHandler } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { confirmPaymentSchema, createPaymentOrderSchema } from '../schemas/payment.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const paymentRouter = Router();

paymentRouter.get('/payments', authMiddleware, asyncHandler(listPaymentsHandler));
paymentRouter.post('/payments/orders', authMiddleware, validate(createPaymentOrderSchema), asyncHandler(createPaymentOrderHandler));
paymentRouter.post('/payments/confirm', authMiddleware, validate(confirmPaymentSchema), asyncHandler(confirmPaymentHandler));
