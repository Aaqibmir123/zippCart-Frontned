import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { addressApi } from '../api/address-api';

export function useAddresses() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['addresses', user?.id], queryFn: addressApi.list, enabled: !!user, staleTime: 30_000 });
}
export function useSaveAddress() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ mutationFn: addressApi.save, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['addresses', user?.id] }); await client.invalidateQueries({ queryKey: ['checkout', user?.id] }); } });
}
export function useRemoveAddress() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({ mutationFn: addressApi.remove, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['addresses', user?.id] }); await client.invalidateQueries({ queryKey: ['checkout', user?.id] }); } });
}
