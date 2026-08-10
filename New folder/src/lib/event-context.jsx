import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const [user, setUser] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(() => localStorage.getItem('selectedEventId') || null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      setAnonymous(false);
      const myMemberships = await base44.entities.EventMember.filter({ user_id: me.id });
      setMemberships(myMemberships);
      const evs = [];
      for (const m of myMemberships) {
        try {
          const ev = await base44.entities.Event.get(m.event_id);
          evs.push(ev);
        } catch (e) { /* event may be deleted */ }
      }
      setEvents(evs);
      const chosen = selectedEventId || localStorage.getItem('selectedEventId');
      const validId = chosen && evs.find(e => e.id === chosen) ? chosen : (evs[0]?.id || null);
      if (validId !== selectedEventId) {
        setSelectedEventId(validId);
        if (validId) localStorage.setItem('selectedEventId', validId);
      }
      if (validId) {
        const members = await base44.entities.EventMember.filter({ event_id: validId });
        setCurrentMembers(members);
      } else {
        setCurrentMembers([]);
      }
    } catch (e) {
      // anonymous viewer — load the event they arrived at via invite link (read-only)
      setUser(null);
      setAnonymous(true);
      setMemberships([]);
      const viewingId = localStorage.getItem('viewingEventId');
      if (viewingId) {
        try {
          const ev = await base44.entities.Event.get(viewingId);
          setEvents([ev]);
          setSelectedEventId(viewingId);
          localStorage.setItem('selectedEventId', viewingId);
          const members = await base44.entities.EventMember.filter({ event_id: viewingId });
          setCurrentMembers(members);
        } catch (err) {
          setEvents([]);
          setCurrentMembers([]);
        }
      } else {
        setEvents([]);
        setCurrentMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { load(); }, []);

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0] || null;
  const currentMembership = memberships.find(m => m.event_id === currentEvent?.id) || null;

  const isSuperAdmin = !!user?.is_super_admin;
  const isEventManager = !anonymous && (isSuperAdmin || !!user?.is_event_manager || currentMembership?.role === 'event_manager');
  const isAnonymousViewer = anonymous && !!currentEvent;
  // any authenticated member can edit; anonymous viewers are read-only
  const canEdit = !anonymous && !!currentMembership && currentMembership?.role !== 'viewer';

  const selectEvent = (id) => {
    setSelectedEventId(id);
    localStorage.setItem('selectedEventId', id);
    load();
  };

  const setViewingEvent = (id) => {
    localStorage.setItem('viewingEventId', id);
    localStorage.setItem('selectedEventId', id);
    setSelectedEventId(id);
    load();
  };

  const value = {
    user,
    anonymous,
    currentEvent,
    currentMembership,
    currentMembers,
    isSuperAdmin,
    isEventManager,
    isAnonymousViewer,
    canEdit,
    events,
    memberships,
    selectedEventId,
    selectEvent,
    setViewingEvent,
    loading,
    reload: load
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
}