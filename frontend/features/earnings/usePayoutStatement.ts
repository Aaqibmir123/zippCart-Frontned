import { useState } from 'react';
import { localDate, useEarnings } from './earnings-api';
import { SettlementFilter } from './settlement-model';

export type StatementTab = 'Balances' | 'Orders' | 'History';
export function usePayoutStatement(admin: boolean) {
  const [period, setPeriod] = useState<'month' | 'week'>('week');
  const [date, setDate] = useState(localDate());
  const [storeId, setStoreId] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<StatementTab>('Balances');
  const [filter, setFilter] = useState<SettlementFilter>('all');
  const query = useEarnings(admin, period, date, storeId, page, filter);
  const selectStore = (id: string) => { setStoreId(id); setPage(1); };
  const selectPeriod = (value: 'month' | 'week') => { setPeriod(value); setPage(1); };
  const selectTab = (value: StatementTab) => { setTab(value); setPage(1); };
  function shift(direction: number) {
    const next = new Date(`${date.slice(0, 7)}-${period === 'month' ? '01' : date.slice(8)}T00:00:00Z`);
    if (period === 'month') next.setUTCMonth(next.getUTCMonth() + direction);
    else next.setUTCDate(next.getUTCDate() + direction * 7);
    setDate(next.toISOString().slice(0, 10)); setPage(1);
  }
  return { period, storeId, page, tab, filter, query, selectStore, selectPeriod, selectTab, setPage, shift,
    selectFilter: (value: SettlementFilter) => { setFilter(value); setPage(1); },
    resetDate: () => { setDate(localDate()); setPage(1); } };
}
