
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  status: 'active' | 'pending';
  password?: string;
  token?: string;
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

export interface Participant {
  id: string; // Database Row ID
  meeting_id: string;
  user_id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface AppSettings {
  title: string;
  iconUrl: string;
  googleDriveClientId?: string;
  googleDriveApiKey?: string;
}

export type AppView = 'LOGIN' | 'DASHBOARD' | 'MEETING' | 'SET_PASSWORD';
