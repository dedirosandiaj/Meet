import { User, Meeting, UserRole, Participant } from '../types';
import { supabase } from './supabaseClient';

const SESSION_KEY = 'zoomclone_session';

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
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return data as User;
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

  // --- MEETINGS OPERATIONS ---

  getMeetings: async (): Promise<Meeting[]> => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error("Error fetching meetings:", error);
      return [];
    }
    return (data as Meeting[]) || [];
  },

  createMeeting: async (meeting: Meeting): Promise<Meeting[]> => {
    const { error } = await supabase
      .from('meetings')
      .insert([meeting]);

    if (error) console.error("Error creating meeting:", error);
    return storageService.getMeetings();
  },

  updateMeeting: async (updatedMeeting: Meeting): Promise<Meeting[]> => {
    const { error } = await supabase
      .from('meetings')
      .update({
        title: updatedMeeting.title,
        date: updatedMeeting.date,
        time: updatedMeeting.time
      })
      .eq('id', updatedMeeting.id);

    if (error) console.error("Error updating meeting:", error);
    return storageService.getMeetings();
  },

  deleteMeeting: async (id: string): Promise<Meeting[]> => {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) console.error("Error deleting meeting:", error);
    return storageService.getMeetings();
  },

  // --- REALTIME PARTICIPANTS OPERATIONS ---

  // User enters the room
  joinMeetingRoom: async (meetingId: string, user: User) => {
    // Check if already in to prevent duplicates
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('user_id', user.id);
    
    if (data && data.length > 0) return;

    await supabase.from('participants').insert([{
      meeting_id: meetingId,
      user_id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role
    }]);
  },

  // User leaves the room
  leaveMeetingRoom: async (meetingId: string, userId: string) => {
    await supabase
      .from('participants')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);
  },

  // Get current list
  getParticipants: async (meetingId: string): Promise<Participant[]> => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('meeting_id', meetingId);
    return (data as Participant[]) || [];
  },

  // Subscribe to changes
  subscribeToParticipants: (meetingId: string, callback: (participants: Participant[]) => void) => {
    // Initial fetch
    storageService.getParticipants(meetingId).then(callback);

    // Subscribe
    const channel = supabase
      .channel('public:participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `meeting_id=eq.${meetingId}` },
        async () => {
          // Simplest way: re-fetch all on any change to ensure sync
          const updated = await storageService.getParticipants(meetingId);
          callback(updated);
        }
      )
      .subscribe();

    return channel;
  },

  // --- USERS OPERATIONS ---

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return [];
    return (data as User[]) || [];
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    return data || undefined;
  },

  getUserByToken: async (token: string): Promise<User | undefined> => {
    const { data } = await supabase.from('users').select('*').eq('token', token).single();
    return data || undefined;
  },

  generateUserToken: async (userId: string): Promise<string | null> => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase.from('users').update({ token: newToken }).eq('id', userId);
    if (error) return null;
    return newToken;
  },

  addUser: async (name: string, email: string, role: UserRole): Promise<User | null> => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: 'pending',
      password: '',
      token: Math.random().toString(36).substring(2, 15)
    };

    const { error } = await supabase.from('users').insert([newUser]);
    if (error) return null;
    return newUser;
  },

  setUserPassword: async (id: string, newPassword: string): Promise<User | null> => {
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword, status: 'active', token: null })
      .eq('id', id);

    if (error) return null;

    const updatedUser = await storageService.getUserById(id);
    if (updatedUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  }
};