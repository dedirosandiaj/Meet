import { User, UserRole, Meeting, ChatMessage } from '../types';

// Mock Users
export const USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    avatar: 'https://picsum.photos/100/100?random=1',
    status: 'active',
    password: 'password123'
  },
  {
    id: '2',
    name: 'Member User',
    email: 'member@test.com',
    role: UserRole.MEMBER,
    avatar: 'https://picsum.photos/100/100?random=2',
    status: 'active',
    password: 'password123'
  },
  {
    id: '3',
    name: 'Sarah Connor',
    email: 'sarah@test.com',
    role: UserRole.MEMBER,
    avatar: 'https://picsum.photos/100/100?random=3',
    status: 'active',
    password: 'password123'
  },
  {
    id: '4',
    name: 'John Doe',
    email: 'john@test.com',
    role: UserRole.MEMBER,
    avatar: 'https://picsum.photos/100/100?random=4',
    status: 'active',
    password: 'password123'
  }
];

// Mock Meetings
export const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'm-1',
    title: 'Weekly Standup',
    date: 'Today',
    time: '10:00 AM',
    host: 'Admin User',
    participantsCount: 5,
    status: 'live'
  },
  {
    id: 'm-2',
    title: 'Product Design Review',
    date: 'Tomorrow',
    time: '2:00 PM',
    host: 'Sarah Connor',
    participantsCount: 8,
    status: 'upcoming'
  },
  {
    id: 'm-3',
    title: 'Q4 Marketing Strategy',
    date: 'Nov 12',
    time: '11:00 AM',
    host: 'Admin User',
    participantsCount: 12,
    status: 'upcoming'
  }
];

// Mock Chat Messages
export const MOCK_CHAT: ChatMessage[] = [
  { id: 'c1', sender: 'Sarah Connor', text: 'Can everyone hear me?', time: '10:02', isSelf: false },
  { id: 'c2', sender: 'John Doe', text: 'Yes, loud and clear!', time: '10:03', isSelf: false },
  { id: 'c3', sender: 'Admin User', text: 'Lets get started then.', time: '10:03', isSelf: true },
];

export const formatTime = () => {
  const now = new Date();
  return now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
};