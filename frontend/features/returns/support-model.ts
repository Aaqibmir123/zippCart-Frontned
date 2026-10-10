import { ReturnEvent, ReturnStatus } from './return-types';

export const isChatMessage = (event: ReturnEvent) => ['message', 'reply', 'submitted'].includes(event.action);

export const nextStep: Record<ReturnStatus, string> = {
  under_review: 'Support is reviewing your request. You can ask a question below.',
  information_needed: 'Your reply is needed. Check the latest message from support.',
  pickup_pending: 'Your return is approved. Support will arrange collection.',
  pickup_scheduled: 'Collection is arranged. Open Details for the time and address.',
  pickup_failed: 'Collection needs rescheduling. Contact support below.',
  picked_up: 'Your item has been collected and is on its way for inspection.',
  inspection: 'Your item is being checked. Support will share the result here.',
  inspection_disputed: 'Support needs your help with an inspection issue. Please reply below.',
  refund_pending: 'Your refund is being processed. Details shows the selected payment method.',
  exchange_pending: 'Your replacement is being prepared.',
  replacement_dispatched: 'Your replacement is on its way. Tracking is available in Details.',
  rejected: 'Your request was declined. The reason is in the conversation.',
  cancelled: 'Your request was cancelled. You can still view this conversation.',
  refund_completed: 'Your refund is complete. The payment reference is in Details.',
  exchange_completed: 'Your exchange is complete. You can still view this conversation.',
};

export const eventLabels: Record<string, string> = {
  submitted: 'Request submitted', ask_information: 'More information requested',
  approve: 'Return approved', reject: 'Request declined', schedule: 'Collection arranged',
  pickup_failed: 'Collection unsuccessful', picked_up: 'Item collected', received: 'Item received',
  inspection_pass: 'Inspection completed', inspection_dispute: 'Inspection issue raised',
  refund_complete: 'Refund completed', dispatch_exchange: 'Replacement dispatched',
  complete_exchange: 'Exchange completed', payout: 'Refund details updated',
  address: 'Address change requested', reschedule: 'Rescheduling requested',
  cancel: 'Request cancelled', switch_refund: 'Changed to refund',
};
