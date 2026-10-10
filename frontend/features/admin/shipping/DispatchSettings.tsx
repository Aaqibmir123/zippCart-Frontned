import { AppLoader } from '../../../components/AppLoader';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { adminShippingApi, DispatchSettings as Settings } from './admin-shipping-api';
import { ss as s } from '../../seller/seller.styles';

export function DispatchSettings() {
  const query = useQuery({ queryKey: ['dispatch-settings'], queryFn: adminShippingApi.settings });
  if (query.isPending) return <AppLoader />;
  if (query.isError) return <Pressable onPress={() => void query.refetch()}><Text style={s.danger}>Could not load dispatch settings. Retry</Text></Pressable>;
  return <SettingsForm initial={query.data.settings} />;
}
function SettingsForm({ initial }: { initial: Settings }) {
  const client = useQueryClient();
  const [cutoff, setCutoff] = useState(`${String(Math.floor(initial.cutoffMinutes / 60)).padStart(2, '0')}:${String(initial.cutoffMinutes % 60).padStart(2, '0')}`);
  const [days, setDays] = useState(initial.weeklyOffDays);
  const [holidays, setHolidays] = useState(initial.holidays.join(', '));
  const [sameDay, setSameDay] = useState(initial.sameDayEnabled);
  const [eta, setEta] = useState(String(initial.defaultEtaDays));
  const [threshold, setThreshold] = useState(String(initial.lowStockThreshold));
  const [error, setError] = useState('');
  const save = useMutation({ mutationFn: adminShippingApi.updateSettings, onSuccess: () => client.invalidateQueries({ queryKey: ['dispatch-settings'] }) });
  function submit() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff) || !/^\d+$/.test(eta) || !/^\d+$/.test(threshold)) { setError('Use HH:MM for cutoff and whole numbers for ETA and stock threshold.'); return; }
    const [hour, minute] = cutoff.split(':').map(Number);
    setError(''); save.mutate({ cutoffMinutes: hour * 60 + minute, weeklyOffDays: days,
      holidays: holidays.split(',').map((value) => value.trim()).filter(Boolean), sameDayEnabled: sameDay, defaultEtaDays: Number(eta), lowStockThreshold: Number(threshold) });
  }
  const input = { borderWidth: 1, borderColor: '#D9E4DE', padding: 10, borderRadius: 9, color: '#263E3B' };
  return <View style={s.card}><Text style={s.title}>Dispatch settings</Text><Text style={s.small}>All times use India time (Asia/Kolkata). ETA is calendar days after dispatch.</Text>
    <Text style={s.text}>Cutoff time (24-hour HH:MM)</Text><TextInput accessibilityLabel="Dispatch cutoff" value={cutoff} onChangeText={setCutoff} style={input} />
    <Text style={s.text}>Weekly off days</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, index) => <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked: days.includes(index) }} onPress={() => setDays(days.includes(index) ? days.filter((day) => day !== index) : [...days, index])} style={[s.badge, days.includes(index) && { backgroundColor: '#D3E9DC' }]}><Text style={s.link}>{name}</Text></Pressable>)}</View>
    <Text style={s.text}>Holidays (YYYY-MM-DD, comma-separated)</Text><TextInput accessibilityLabel="Dispatch holidays" value={holidays} onChangeText={setHolidays} style={input} multiline />
    <View style={s.between}><Text style={s.text}>Same-day dispatch</Text><Switch value={sameDay} onValueChange={setSameDay} /></View>
    <Text style={s.text}>Default ETA days</Text><TextInput accessibilityLabel="Default ETA days" value={eta} onChangeText={setEta} keyboardType="number-pad" style={input} />
    <Text style={s.text}>Low-stock threshold</Text><TextInput accessibilityLabel="Low stock threshold" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" style={input} />
    {!!(error || save.error) && <Text style={s.danger}>{error || save.error?.message}</Text>}{save.isSuccess && <Text style={s.link}>Settings saved.</Text>}
    <Pressable disabled={save.isPending} style={s.button} onPress={submit}><Text style={s.buttonText}>{save.isPending ? 'Saving...' : 'Save settings'}</Text></Pressable>
  </View>;
}
