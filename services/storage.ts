import { User, Meeting, UserRole } from '../types';
import { supabase } from './supabaseClient';

const SESSION_KEY = 'zoomclone_session';

export const storageService = {
  // --- AUTHENTICATION & SESSION ---
  
  // NOTE: This now returns a Promise
  login: async (email: string, passwordAttempt: string): Promise<User | null> => {
    try {
      // Simple row lookup (Not using Supabase Auth for this demo to keep logic similar to previous version)
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

  // --- MEETINGS OPERATIONS (SUPABASE) ---

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

  // --- USERS OPERATIONS (SUPABASE) ---

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) return [];
    return (data as User[]) || [];
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return data || undefined;
  },

  getUserByToken: async (token: string): Promise<User | undefined> => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('token', token)
      .single();
    
    return data || undefined;
  },

  generateUserToken: async (userId: string): Promise<string | null> => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { error } = await supabase
      .from('users')
      .update({ token: newToken })
      .eq('id', userId);

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

    const { error } = await supabase
      .from('users')
      .insert([newUser]);

    if (error) {
      console.error("Error adding user:", error);
      return null;
    }
    return newUser;
  },

  setUserPassword: async (id: string, newPassword: string): Promise<User | null> => {
    // 1. Update password
    const { error } = await supabase
      .from('users')
      .update({ 
        password: newPassword, 
        status: 'active', 
        token: null 
      })
      .eq('id', id);

    if (error) return null;

    // 2. Fetch updated user
    const updatedUser = await storageService.getUserById(id);
    if (updatedUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  }
};