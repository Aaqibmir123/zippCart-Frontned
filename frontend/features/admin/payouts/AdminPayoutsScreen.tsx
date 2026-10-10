import { useState } from 'react';
import { EarningsScreen } from '../../earnings/EarningsScreen';
import { PaymentTarget, RecordPayment } from './RecordPayment';

export function AdminPayoutsScreen() {
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  return <>
    <EarningsScreen admin onPay={(store) => setTarget({ store })} onCollect={(orderId) => setTarget({ orderId })} />
    {target && <RecordPayment target={target} onClose={() => setTarget(null)} />}
  </>;
}
