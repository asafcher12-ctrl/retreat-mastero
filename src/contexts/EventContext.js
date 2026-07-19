import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const { user, profile } = useAuth();
  const [event, setEvent] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async (eventId) => {
    if (!eventId) {
      setMembers([]);
      return;
    }
    const { data } = await supabase
      .from('event_members')
      .select('*, profile:profiles(id, display_name, email)')
      .eq('event_id', eventId)
      .order('created_at');
    setMembers(data ?? []);
  }, []);

  const selectEvent = useCallback(
    async (eventId) => {
      if (!user) return;
      const { data: mem } = await supabase
        .from('event_members')
        .select('*, event:events(*)')
        .eq('user_id', user.id)
        .eq('event_id', eventId)
        .maybeSingle();
      if (mem) {
        setMembership(mem);
        setEvent(mem.event);
        await loadMembers(mem.event_id);
      }
    },
    [user, loadMembers]
  );

  // בטעינה: בחירת האירוע האחרון שהמשתמש חבר בו
  const loadInitial = useCallback(async () => {
    if (!user) {
      setEvent(null);
      setMembership(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: mems } = await supabase
      .from('event_members')
      .select('*, event:events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const mem = mems?.[0] ?? null;
    setMembership(mem);
    setEvent(mem?.event ?? null);
    if (mem) await loadMembers(mem.event_id);
    setLoading(false);
  }, [user, loadMembers]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const joinByCode = useCallback(
    async (code) => {
      const { data, error } = await supabase.rpc('join_event', { code: code.trim() });
      if (error) throw error;
      await selectEvent(data);
      return data;
    },
    [selectEvent]
  );

  const createEvent = useCallback(
    async (name, startsAt) => {
      const { data, error } = await supabase.rpc('create_event', {
        event_name: name,
        event_starts_at: startsAt || null,
      });
      if (error) throw error;
      await selectEvent(data);
      return data;
    },
    [selectEvent]
  );

  const updateArrival = useCallback(
    async ({ arrivalAt, nights }) => {
      if (!membership) return;
      const { data, error } = await supabase
        .from('event_members')
        .update({ arrival_at: arrivalAt, nights })
        .eq('id', membership.id)
        .select('*, event:events(*)')
        .single();
      if (error) throw error;
      setMembership(data);
      await loadMembers(data.event_id);
    },
    [membership, loadMembers]
  );

  const refreshMembers = useCallback(() => loadMembers(event?.id), [event?.id, loadMembers]);

  const isManager =
    membership?.role === 'manager' || profile?.is_super_admin === true;

  return (
    <EventContext.Provider
      value={{
        event,
        membership,
        members,
        loading,
        isManager,
        joinByCode,
        createEvent,
        selectEvent,
        updateArrival,
        refreshMembers,
        refresh: loadInitial,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent חייב להיות בתוך EventProvider');
  return ctx;
}
