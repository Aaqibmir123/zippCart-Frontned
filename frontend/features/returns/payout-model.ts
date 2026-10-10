import { RefundMethod, RefundPayout } from './return-types';

export type PayoutDraft = { method: RefundMethod; upiId: string; accountHolder: string;
  accountNumber: string; confirmAccount: string; ifsc: string };
export const emptyPayout = (method: RefundMethod = 'upi'): PayoutDraft => ({
  method, upiId: '', accountHolder: '', accountNumber: '', confirmAccount: '', ifsc: '',
});
export function buildPayout(value: PayoutDraft): RefundPayout {
  if (value.method === 'cash') return { method: 'cash' };
  if (value.method === 'upi') {
    const upiId = value.upiId.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/.test(upiId)) throw new Error('Enter a valid UPI ID, such as name@bank.');
    return { method: 'upi', upiId };
  }
  const accountHolder = value.accountHolder.trim();
  const accountNumber = value.accountNumber.trim();
  const ifsc = value.ifsc.trim().toUpperCase();
  if (accountHolder.length < 2 || accountHolder.length > 100) throw new Error('Enter the account holder name.');
  if (!/^\d{9,18}$/.test(accountNumber)) throw new Error('Enter a 9–18 digit account number.');
  if (accountNumber !== value.confirmAccount.trim()) throw new Error('Account numbers do not match.');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new Error('Enter an 11-character IFSC, such as SBIN0001234.');
  return { method: 'bank', accountHolder, accountNumber, ifsc };
}
export function maskedPayout(value: PayoutDraft) {
  if (value.method === 'bank') return `Bank account ending ${value.accountNumber.slice(-4)}`;
  if (value.method === 'cash') return 'Cash refund';
  const [name, handle] = value.upiId.trim().split('@');
  return `${name?.slice(0, 2)}***@${handle ?? ''}`;
}
