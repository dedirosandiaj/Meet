import { User, Meeting, UserRole } from '../types';
import { dbQuery, initSqlite } from './db';

const SESSION_KEY = 'zoomclone_session';

// Initialize the Database (Called by App.tsx)
export const initDatabase = async () => {
  await initSqlite();
};

export const storageService = {
  // --- AUTHENTICATION & SESSION ---
  
  login: (email: string, passwordAttempt: string): User | null => {
    try {
      const user = dbQuery.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, passwordAttempt]);
      
      if (user && user.status === 'active') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user as User;
      }
      return null;
    } catch (e) {
      console.error("Login failed", e);
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

  // --- MEETINGS OPERATIONS (SQLITE) ---

  getMeetings: (): Meeting[] => {
    try {
      return dbQuery.select("SELECT * FROM meetings ORDER BY date, time") as Meeting[];
    } catch (e) {
      return [];
    }
  },

  createMeeting: (meeting: Meeting) => {
    dbQuery.run(
      "INSERT INTO meetings (id, title, date, time, host, participantsCount, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [meeting.id, meeting.title, meeting.date, meeting.time, meeting.host, meeting.participantsCount, meeting.status]
    );
    return storageService.getMeetings();
  },

  updateMeeting: (updatedMeeting: Meeting) => {
    dbQuery.run(
      "UPDATE meetings SET title=?, date=?, time=? WHERE id=?",
      [updatedMeeting.title, updatedMeeting.date, updatedMeeting.time, updatedMeeting.id]
    );
    return storageService.getMeetings();
  },

  deleteMeeting: (id: string) => {
    dbQuery.run("DELETE FROM meetings WHERE id=?", [id]);
    return storageService.getMeetings();
  },

  // --- USERS OPERATIONS (SQLITE) ---

  getUsers: (): User[] => {
    try {
      return dbQuery.select("SELECT * FROM users") as User[];
    } catch (e) {
      return [];
    }
  },

  getUserById: (id: string): User | undefined => {
    const u = dbQuery.get("SELECT * FROM users WHERE id=?", [id]);
    return u as User | undefined;
  },

  getUserByToken: (token: string): User | undefined => {
    const u = dbQuery.get("SELECT * FROM users WHERE token=?", [token]);
    return u as User | undefined;
  },

  generateUserToken: (userId: string): string | null => {
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      dbQuery.run("UPDATE users SET token=? WHERE id=?", [newToken, userId]);
      return newToken;
    } catch (e) {
      return null;
    }
  },

  addUser: (name: string, email: string, role: UserRole): User => {
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

    dbQuery.run(
      "INSERT INTO users (id, name, email, role, avatar, status, password, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [newUser.id, newUser.name, newUser.email, newUser.role, newUser.avatar, newUser.status, newUser.password, newUser.token]
    );

    return newUser;
  },

  setUserPassword: (id: string, newPassword: string): User | null => {
    try {
      dbQuery.run(
        "UPDATE users SET password=?, status='active', token=NULL WHERE id=?",
        [newPassword, id]
      );
      
      const updatedUser = storageService.getUserById(id);
      if (updatedUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};