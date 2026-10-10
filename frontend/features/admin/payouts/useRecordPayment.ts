import { useMutation, useQueryClient } from '@tanstack/react-query';
import { earningsApi } from './payout-api';

export type PaymentInput = { storeId: string; clientKey: string; reference: string; method: 'bank' | 'upi'; amountPaise: number }
  | { orderId: string; reference: string };
export function useRecordPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => 'storeId' in input
      ? earningsApi.payout(input.storeId, { clientKey: input.clientKey, reference: input.reference,
        method: input.method, amountPaise: input.amountPaise, transferConfirmed: true })
      : earningsApi.collect(input.orderId, input.reference),
    onSuccess: async () => {
      await Promise.all(['earnings', 'admin-analytics', 'admin-shipping-all', 'admin-order']
        .map((name) => client.invalidateQueries({ queryKey: [name] })));
    },
  });
}
