
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
  // --- AUTHENTICATION & SESSION ---
  
  login: async (email: string, passwordAttempt: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', passwordAttempt)
        .single();
      
      if (error || !data) {
        console.error("Login Error:", error);
        return null;
      }

      if (data.status === 'active') {
        const user = data as User;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch (e) {
      console.error("Login Exception", e);
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // --- APP SETTINGS (Global Config) ---

  getAppSettings: async (): Promise<AppSettings> => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

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
    } catch (err) {
      console.warn("Could not fetch settings from Supabase, using fallback.", err);
    }

    const local = localStorage.getItem(SETTINGS_KEY);
    if (local) return JSON.parse(local);

    return DEFAULT_SETTINGS;
  },

  updateAppSettings: async (settings: AppSettings): Promise<AppSettings> => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    // Upsert to Supabase
    await supabase.from('app_settings').upsert({
        id: 1,
        title: settings.title,
        icon_url: settings.iconUrl,
        google_drive_client_id: settings.googleDriveClientId,
        google_drive_api_key: settings.googleDriveApiKey
    });

    return settings;
  },

  // --- MEETINGS OPERATIONS ---

  getMeetings: async (): Promise<Meeting[]> => {
    const currentUser = storageService.getSession();
    if (!currentUser) return [];

    try {
        if (currentUser.role === UserRole.ADMIN) {
            // Admin sees all
            const { data } = await supabase
                .from('meetings')
                .select('*')
                .order('date', { ascending: true })
                .order('time', { ascending: true });
            return (data || []) as Meeting[];
        } else {
            // Member sees: 
            // 1. Meetings they Host
            const { data: hostedMeetings } = await supabase
                .from('meetings')
                .select('*')
                .eq('host', currentUser.name);

            // 2. Meetings they are invited to
            const { data: invites } = await supabase
                .from('meeting_invites')
                .select('meeting_id')
                .eq('user_id', currentUser.id);
            
            let invitedMeetings: Meeting[] = [];
            if (invites && invites.length > 0) {
                const meetingIds = invites.map(i => i.meeting_id);
                const { data: invitedData } = await supabase
                    .from('meetings')
                    .select('*')
                    .in('id', meetingIds);
                invitedMeetings = (invitedData || []) as Meeting[];
            }

            // Merge and deduplicate
            const hosted = (hostedMeetings || []) as Meeting[];
            const combined = [...hosted, ...invitedMeetings];
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            
            // Sort
            return unique.sort((a, b) => {
                const dateA = a.date === 'Today' ? new Date().toISOString() : a.date;
                const dateB = b.date === 'Today' ? new Date().toISOString() : b.date;
                return dateA.localeCompare(dateB);
            });
        }
    } catch (e) {
        console.error("Get Meetings Error", e);
        return [];
    }
  },

  createMeeting: async (meeting: Meeting, invitedUserIds: string[] = []): Promise<Meeting[]> => {
    // 1. Create Meeting
    await supabase.from('meetings').insert({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        host: meeting.host,
        "participantsCount": meeting.participantsCount, // Quoted to match case-sensitive column
        status: meeting.status
    });
    
    // 2. Create Invites
    if (invitedUserIds.length > 0) {
        const invites = invitedUserIds.map(uid => ({
            meeting_id: meeting.id,
            user_id: uid
        }));
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
    // Cascade delete is handled by Database Foreign Keys usually, 
    // but explicit delete is safer if FK isn't set up perfectly.
    await supabase.from('meeting_invites').delete().eq('meeting_id', id);
    await supabase.from('meetings').delete().eq('id', id);
    return storageService.getMeetings();
  },

  // --- REALTIME PARTICIPANTS & SIGNALING ---

  joinMeetingRoom: async (meetingId: string, user: User) => {
    // 1. Check if entry already exists
    const { data: existing } = await supabase
        .from('participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .maybeSingle();

    // 2. Fetch Meeting Info to verify Host
    // This ensures that if the User is the Host, they are NEVER put in waiting room,
    // regardless of their Role (e.g. creating Instant Meeting)
    const { data: meeting } = await supabase
        .from('meetings')
        .select('host')
        .eq('id', meetingId)
        .maybeSingle();

    const isHost = meeting && meeting.host === user.name;
    const isStaff = user.role === UserRole.ADMIN || user.role === UserRole.MEMBER;

    // Logic: If Host OR Staff -> Admitted. If Client -> Waiting (unless Host).
    const initialStatus = (isHost || isStaff) ? 'admitted' : 'waiting';

    if (!existing) {
        await supabase.from('participants').insert({
            meeting_id: meetingId,
            user_id: user.id,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            status: initialStatus
        });
    } else {
        // Fix for legacy data or re-joins:
        // Update status if it's missing OR if we need to enforce logic on re-entry
        if (!existing.status) {
             await supabase.from('participants').update({ status: initialStatus }).eq('id', existing.id);
        } else if (existing.status === 'waiting' && (isHost || isStaff)) {
             // Auto-fix: If a Staff member was accidentally stuck in waiting, admit them on re-join
             await supabase.from('participants').update({ status: 'admitted' }).eq('id', existing.id);
        }
    }
  },

  admitParticipant: async (meetingId: string, userId: string) => {
      await supabase
        .from('participants')
        .update({ status: 'admitted' })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId);
  },

  leaveMeetingRoom: async (meetingId: string, userId: string) => {
    await supabase.from('participants').delete().eq('meeting_id', meetingId).eq('user_id', userId);
  },

  getParticipants: async (meetingId: string): Promise<Participant[]> => {
    const { data } = await supabase.from('participants').select('*').eq('meeting_id', meetingId);
    return (data || []) as Participant[];
  },

  subscribeToMeeting: (
    meetingId: string, 
    onParticipantsUpdate: (participants: Participant[]) => void,
    onSignal: (payload: any) => void
  ): RealtimeChannel => {
    
    // Initial fetch
    storageService.getParticipants(meetingId).then(onParticipantsUpdate);

    // Subscribe to DB changes for participants list
    const channel = supabase.channel(`meeting-${meetingId}`, {
        config: {
            presence: { key: meetingId },
            broadcast: { self: true } // Receive own signals? Usually no, but for multi-tab debugging yes.
        }
    });

    channel
        // Listen for DB changes on participants table (INSERT, UPDATE, DELETE)
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'participants', filter: `meeting_id=${meetingId}` }, 
            async (payload) => {
                // Fetch fresh list on any change
                const updated = await storageService.getParticipants(meetingId);
                onParticipantsUpdate(updated);
            }
        )
        // Listen for WebRTC Signals via Broadcast
        .on('broadcast', { event: 'signal' }, (payload) => {
             onSignal(payload.payload);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                 console.log("Connected to Realtime Channel");
            }
        });

    return channel;
  },

  sendSignal: async (channel: any, signal: any) => {
    if (channel) {
        await channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: signal
        });
    }
  },

  // --- USERS OPERATIONS ---

  getUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('users').select('*').order('name');
    return (data || []) as User[];
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data ? (data as User) : undefined;
  },

  getUserByToken: async (token: string): Promise<User | undefined> => {
    const { data } = await supabase.from('users').select('*').eq('token', token).single();
    return data ? (data as User) : undefined;
  },

  generateUserToken: async (userId: string): Promise<string | null> => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await supabase.from('users').update({ token: newToken }).eq('id', userId);
    return newToken;
  },

  addUser: async (name: string, email: string, role: UserRole): Promise<User | null> => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'pending',
      password: '',
      token: Math.random().toString(36).substring(2, 15)
    };
    
    const { error } = await supabase.from('users').insert(newUser);
    if (error) {
        console.error("Add User Error", error);
        return null;
    }
    return newUser;
  },

  updateUser: async (user: User): Promise<User[]> => {
    await supabase.from('users').update({
        name: user.name,
        email: user.email,
        role: user.role
    }).eq('id', user.id);
    return storageService.getUsers();
  },

  deleteUser: async (id: string): Promise<User[]> => {
    await supabase.from('users').delete().eq('id', id);
    return storageService.getUsers();
  },

  setUserPassword: async (id: string, newPassword: string): Promise<User | null> => {
    await supabase.from('users').update({
        password: newPassword,
        status: 'active',
        token: null
    }).eq('id', id);
    
    const updatedUser = await storageService.getUserById(id);
    if (updatedUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  }
};
