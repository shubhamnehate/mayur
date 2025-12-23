import { client } from './client';

export type PaymentMethod = 'stripe_eur' | 'stripe_inr' | 'bank_transfer' | string;

export interface PaymentResponse {
  redirectUrl?: string;
  redirect_url?: string;
  message?: string;
}

export const initiatePayment = async (payload: { courseId: string; paymentMethod: PaymentMethod }): Promise<PaymentResponse> => {
  const { data } = await client.post<PaymentResponse>('/api/payments/checkout', {
    course_id: payload.courseId,
    payment_method: payload.paymentMethod,
  });

  return {
    redirectUrl: data.redirectUrl ?? data.redirect_url,
    message: data.message,
  };
};
