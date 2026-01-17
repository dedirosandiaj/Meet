
import { User, Meeting, UserRole, Participant, AppSettings } from '../types';
import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

const SESSION_KEY = 'zoomclone_session';
const SETTINGS_KEY = 'zoomclone_settings';

const DEFAULT_SETTINGS: AppSettings = {
  title: 'ZoomClone AI',
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/4406/4406234.png'
};

export const storageService = {
  // --- AUTH & SESSION ---
  login: async (email: string, passwordAttempt: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', passwordAttempt).single();
      if (error || !data) return null;
      if (data.status === 'active') {
        const user = data as User;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch (e) { return null; }
  },

  logout: () => localStorage.removeItem(SESSION_KEY),
  getSession: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // --- APP SETTINGS ---
  getAppSettings: async (): Promise<AppSettings> => {
    try {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        const settings: AppSettings = { 
            title: data.title, 
            iconUrl: data.icon_url,
            googleDriveClientId: data.google_drive_client_id,
            googleDriveApiKey: data.google_drive_api_key
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
    } catch (err) {}
    const local = localStorage.getItem(SETTINGS_KEY);
    return local ? JSON.parse(local) : DEFAULT_SETTINGS;
  },

  updateAppSettings: async (settings: AppSettings): Promise<AppSettings> => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    await supabase.from('app_settings').upsert({
        id: 1,
        title: settings.title,
        icon_url: settings.iconUrl,
        google_drive_client_id: settings.googleDriveClientId,
        google_drive_api_key: settings.googleDriveApiKey
    });
    return settings;
  },

  // --- MEETINGS ---
  getMeetings: async (): Promise<Meeting[]> => {
    const currentUser = storageService.getSession();
    if (!currentUser) return [];
    try {
        const { data } = await supabase.from('meetings').select('*').order('date', { ascending: true });
        const meetings = (data || []) as Meeting[];
        if (currentUser.role === UserRole.ADMIN) return meetings;
        const { data: invites } = await supabase.from('meeting_invites').select('meeting_id').eq('user_id', currentUser.id);
        const invitedIds = invites?.map(i => i.meeting_id) || [];
        return meetings.filter(m => m.host === currentUser.name || invitedIds.includes(m.id));
    } catch (e) { return []; }
  },

  createMeeting: async (meeting: Meeting, invitedUserIds: string[] = []): Promise<Meeting[]> => {
    await supabase.from('meetings').insert({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        host: meeting.host,
        participantsCount: meeting.participantsCount,
        status: meeting.status
    });
    if (invitedUserIds.length > 0) {
        const invites = invitedUserIds.map(uid => ({ meeting_id: meeting.id, user_id: uid }));
        await supabase.from('meeting_invites').insert(invites);
    }
    return storageService.getMeetings();
  },

  updateMeeting: async (updatedMeeting: Meeting): Promise<Meeting[]> => {
    await supabase.from('meetings').update({
        title: updatedMeeting.title,
        date: updatedMeeting.date,
        time: updatedMeeting.time
    }).eq('id', updatedMeeting.id);
    return storageService.getMeetings();
  },

  deleteMeeting: async (id: string): Promise<Meeting[]> => {
    await supabase.from('meeting_invites').delete().eq('meeting_id', id);
    await supabase.from('meetings').delete().eq('id', id);
    return storageService.getMeetings();
  },

  // --- REAL-TIME PARTICIPANTS & LOBBY ---
  joinMeetingRoom: async (meetingId: string, user: User): Promise<'admitted' | 'waiting'> => {
    try {
      const { data: meeting } = await supabase.from('meetings').select('host').eq('id', meetingId).maybeSingle();
      const isHost = meeting && meeting.host.trim().toLowerCase() === user.name.trim().toLowerCase();
      const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.MEMBER;
      const initialStatus = (isHost || isStaff) ? 'admitted' : 'waiting';

      await supabase.from('participants').upsert({
          meeting_id: meetingId,
          user_id: user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          status: initialStatus
      }, { onConflict: 'meeting_id, user_id' });

      return initialStatus;
    } catch (err) {
      return 'waiting';
    }
  },

  admitParticipant: async (channel: RealtimeChannel | null, meetingId: string, userId: string) => {
    // 1. Update Database (Persistence)
    await supabase.from('participants').update({ status: 'admitted' }).eq('meeting_id', meetingId).eq('user_id', userId);
    
    // 2. Broadcast Admission (Instant UI trigger for the client)
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'admit-action',
        payload: { userId, meetingId }
      });
    }
  },

  leaveMeetingRoom: async (meetingId: string, userId: string) => {
    await supabase.from('participants').delete().eq('meeting_id', meetingId).eq('user_id', userId);
  },

  getParticipants: async (meetingId: string): Promise<Participant[]> => {
    const { data } = await supabase.from('participants').select('*').eq('meeting_id', meetingId);
    return (data || []) as Participant[];
  },

  // Improved subscription using Presence
  subscribeToMeeting: (
    meetingId: string,
    user: User,
    onParticipantsUpdate: (participants: Participant[]) => void,
    onSignal: (payload: any) => void,
    onAdmitted: () => void
  ): RealtimeChannel => {
    
    const channel = supabase.channel(`meeting_room_${meetingId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        // When presence list changes, re-fetch from DB to get latest statuses
        storageService.getParticipants(meetingId).then(onParticipantsUpdate);
      })
      .on('broadcast', { event: 'signal' }, (payload) => onSignal(payload.payload))
      .on('broadcast', { event: 'admit-action' }, (payload) => {
          if (payload.payload.userId === user.id) {
              onAdmitted();
          }
          // Refresh list for everyone when someone is admitted
          storageService.getParticipants(meetingId).then(onParticipantsUpdate);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `meeting_id=eq.${meetingId}` }, () => {
          storageService.getParticipants(meetingId).then(onParticipantsUpdate);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: user.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return channel;
  },

  sendSignal: async (channel: RealtimeChannel | null, signal: any) => {
    if (channel) {
      await channel.send({ type: 'broadcast', event: 'signal', payload: signal });
    }
  },

  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('users').select('*').order('name');
    return (data || []) as User[];
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data as User;
  },

  // Add getUserByToken to fix the error in SetPassword.tsx
  getUserByToken: async (token: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('users').select('*').eq('token', token).maybeSingle();
    if (error || !data) return undefined;
    return data as User;
  },

  generateUserToken: async (userId: string): Promise<string | null> => {
    const newToken = Math.random().toString(36).substring(2);
    await supabase.from('users').update({ token: newToken }).eq('id', userId);
    return newToken;
  },

  addUser: async (name: string, email: string, role: UserRole): Promise<User | null> => {
    const newUser: User = {
      id: crypto.randomUUID(), name, email, role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'pending', token: Math.random().toString(36).substring(2)
    };
    const { error } = await supabase.from('users').insert(newUser);
    return error ? null : newUser;
  },

  updateUser: async (user: User): Promise<User[]> => {
    await supabase.from('users').update({ name: user.name, email: user.email, role: user.role }).eq('id', user.id);
    return storageService.getUsers();
  },

  deleteUser: async (id: string): Promise<User[]> => {
    await supabase.from('users').delete().eq('id', id);
    return storageService.getUsers();
  },

  setUserPassword: async (id: string, newPassword: string): Promise<User | null> => {
    await supabase.from('users').update({ password: newPassword, status: 'active', token: null }).eq('id', id);
    const updated = await storageService.getUserById(id);
    if (updated) localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated || null;
  }
};
