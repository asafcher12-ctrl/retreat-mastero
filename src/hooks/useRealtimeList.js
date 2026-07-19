import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// טוען רשימה מטבלה לפי אירוע ומתעדכן אוטומטית דרך Supabase Realtime
export function useRealtimeList(table, eventId, orderBy = 'created_at') {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('event_id', eventId)
      .order(orderBy);
    setRows(data ?? []);
    setLoading(false);
  }, [table, eventId, orderBy]);

  useEffect(() => {
    if (!eventId) return;
    refetch();
    const channel = supabase
      .channel(`${table}:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `event_id=eq.${eventId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, eventId, refetch]);

  return { rows, loading, refetch };
}
