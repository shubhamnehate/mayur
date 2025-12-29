import { client } from './client';

export type PaymentMethod = 'razorpay' | 'bank_transfer' | string;

export interface PaymentOrder {
  id: string;
  orderId: string;
  userId?: string;
  courseId?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface PaymentRecord {
  id: string;
  orderId?: string;
  courseId?: string;
  userId?: string;
  amount?: number;
  status?: string;
  providerPaymentId?: string;
}

export interface PaymentVerification {
  order?: PaymentOrder | null;
  payment?: PaymentRecord | null;
  enrollment?: {
    id: string;
    status?: string;
    course_id?: string | number;
    user_id?: string | number;
  } | null;
}

export interface CreateOrderPayload {
  courseId: string;
  userId?: string;
  currency?: string;
  amount?: number;
}

export const createPaymentOrder = async (payload: CreateOrderPayload): Promise<{ order: PaymentOrder; key: string }> => {
  const { data } = await client.post<{
    order?: {
      id?: string | number;
      order_id?: string;
      user_id?: string | number;
      course_id?: string | number;
      amount?: number;
      currency?: string;
      status?: string;
    };
    key?: string;
  }>('/api/payments/create-order', {
    course_id: payload.courseId,
    user_id: payload.userId,
    currency: payload.currency,
    amount: payload.amount,
  });

  const rawOrder = data.order ?? {};
  return {
    order: {
      id: rawOrder.id ? String(rawOrder.id) : '',
      orderId: rawOrder.order_id ?? '',
      userId: rawOrder.user_id ? String(rawOrder.user_id) : undefined,
      courseId: rawOrder.course_id ? String(rawOrder.course_id) : undefined,
      amount: rawOrder.amount,
      currency: rawOrder.currency,
      status: rawOrder.status,
    },
    key: data.key ?? '',
  };
};

export const verifyPayment = async (payload: {
  orderId: string;
  paymentId: string;
  signature: string;
  userId?: string;
}): Promise<PaymentVerification> => {
  const { data } = await client.post<{
    order?: {
      id?: string | number;
      order_id?: string;
      course_id?: string | number;
      user_id?: string | number;
      amount?: number;
      currency?: string;
      status?: string;
    };
    payment?: {
      id?: string | number;
      order_id?: string | number;
      course_id?: string | number;
      user_id?: string | number;
      amount?: number;
      status?: string;
      provider_payment_id?: string | null;
    } | null;
    enrollment?: {
      id?: string | number;
      status?: string;
      course_id?: string | number;
      user_id?: string | number;
    } | null;
  }>('/api/payments/verify', {
    razorpay_order_id: payload.orderId,
    razorpay_payment_id: payload.paymentId,
    razorpay_signature: payload.signature,
    user_id: payload.userId,
  });

  return {
    order: data.order
      ? {
          id: data.order.id ? String(data.order.id) : '',
          orderId: data.order.order_id ?? '',
          courseId: data.order.course_id ? String(data.order.course_id) : undefined,
          userId: data.order.user_id ? String(data.order.user_id) : undefined,
          amount: data.order.amount,
          currency: data.order.currency,
          status: data.order.status,
        }
      : null,
    payment: data.payment
      ? {
          id: data.payment.id ? String(data.payment.id) : '',
          orderId: data.payment.order_id ? String(data.payment.order_id) : undefined,
          courseId: data.payment.course_id ? String(data.payment.course_id) : undefined,
          userId: data.payment.user_id ? String(data.payment.user_id) : undefined,
          amount: data.payment.amount,
          status: data.payment.status,
          providerPaymentId: data.payment.provider_payment_id ?? undefined,
        }
      : null,
    enrollment: data.enrollment
      ? {
          id: data.enrollment.id ? String(data.enrollment.id) : '',
          status: data.enrollment.status,
          course_id: data.enrollment.course_id,
          user_id: data.enrollment.user_id,
        }
      : null,
  };
};
