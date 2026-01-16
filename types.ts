export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  status: 'active' | 'pending';
  password?: string; // For mock auth simulation
  token?: string; // Security token for setup/reset links
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  host: string;
  participantsCount: number;
  status: 'upcoming' | 'live' | 'ended';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

export type AppView = 'LOGIN' | 'DASHBOARD' | 'MEETING' | 'SET_PASSWORD';