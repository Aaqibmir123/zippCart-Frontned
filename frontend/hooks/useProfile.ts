import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/api/profile-api';
export function useProfile() {
  const { user, setUser } = useAuth();
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;
  useEffect(() => () => { activeUserId.current = undefined; }, []);
  const client = useQueryClient();
  const key = ['profile', user?.id];
  const query = useQuery({ queryKey: key, queryFn: profileApi.get, enabled: !!user, staleTime: 30000 });
  const mutation = useMutation({ mutationFn: profileApi.update, onSuccess: (data) => {
    if (activeUserId.current !== data.user.id) return;
    setUser(data.user);
    client.setQueryData(key, data);
  } });
  return { query, mutation };
}
