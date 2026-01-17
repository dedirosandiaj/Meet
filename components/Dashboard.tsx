
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Meeting, AppSettings } from '../types';
import { storageService } from '../services/storage';
import { emailService } from '../services/email';
import { 
  Calendar, 
  Video, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Clock,
  LayoutGrid,
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Pencil,
  Hourglass,
  Share2,
  Mail,
  UserPlus,
  RotateCcw,
  Menu,
  Loader2,
  MoreVertical,
  Save,
  Globe,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Search,
  Send,
  Briefcase
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onJoinMeeting: (meetingId: string) => void;
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onJoinMeeting, appSettings, onUpdateSettings }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const isClient = user.role === UserRole.CLIENT;

  // --- ROUTING HELPER ---
  const getTabFromUrl = (): 'meetings' | 'users' | 'settings' => {
    const path = window.location.pathname;
    if (path.includes('/dashboard/users')) return 'users';
    if (path.includes('/dashboard/settings')) return 'settings';
    return 'meetings'; // Default
  };

  const [activeTab, setActiveTab] = useState<'meetings' | 'users' | 'settings'>(getTabFromUrl());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User Management Tabs
  const [userManageTab, setUserManageTab] = useState<'internal' | 'client'>('internal');

  // Meeting Modal States
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showInstantModal, setShowInstantModal] = useState(false); 
  const [showEditModal, setShowEditModal] = useState(false);
  
  // User Modal States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  
  // Delete Modal States
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // New Meeting Created Modal State
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);

  // Invite/Reset Link Copied State
  const [inviteCopiedId, setInviteCopiedId] = useState<string | null>(null);
  
  // Loading state for sending emails
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false); 
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Form States
  const [joinId, setJoinId] = useState('');
  
  // Create/Schedule Form
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    date: '',
    time: ''
  });
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  // Edit Meeting Form State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    time: ''
  });

  // Add User Form State
  const [addUserForm, setAddUserForm] = useState({
    name: '',
    email: '',
    role: UserRole.MEMBER
  });

  // Edit User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: UserRole.MEMBER
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
      title: appSettings.title,
      iconUrl: appSettings.iconUrl
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ROUTING EFFECT ---
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      if (!isAdmin && (tab === 'users' || tab === 'settings')) {
        setActiveTab('meetings');
        window.history.replaceState({}, '', '/dashboard/meetings');
      } else {
        setActiveTab(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdmin]);

  useEffect(() => {
    const tab = getTabFromUrl();
    if (!isAdmin && (tab === 'users' || tab === 'settings')) {
       navigate('meetings', true);
    }
  }, [isAdmin]);

  const navigate = (tab: 'meetings' | 'users' | 'settings', replace = false) => {
    setActiveTab(tab);
    const url = `/dashboard/${tab}`;
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  };

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const meetingData = await storageService.getMeetings();
      setMeetings(meetingData);
      const userData = await storageService.getUsers();
      setAllUsers(userData);
      setIsLoading(false);
    };

    fetchData();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    setSettingsForm({
        title: appSettings.title,
        iconUrl: appSettings.iconUrl
    });
  }, [appSettings]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // --- ACTIONS ---

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
        const newSettings = await storageService.updateAppSettings({
            ...appSettings,
            title: settingsForm.title,
            iconUrl: settingsForm.iconUrl
        });
        onUpdateSettings(newSettings);
        setSettingsSavedSuccess(true);
        setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
        console.error("Failed to save settings", err);
    } finally {
        setIsSavingSettings(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please select an image under 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 192;
            
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/png', 0.8);
            setSettingsForm(prev => ({ ...prev, iconUrl: dataUrl }));
        };
        if (event.target?.result) {
            img.src = event.target.result as string;
        }
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerUpload = () => {
      fileInputRef.current?.click();
  };

  const handleDeleteClick = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    setMeetingToDelete(meeting);
  };

  const confirmDelete = async () => {
    if (meetingToDelete) {
      const updated = await storageService.deleteMeeting(meetingToDelete.id);
      setMeetings(updated);
      setMeetingToDelete(null);
    }
  };

  const handleEditClick = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    let dateVal = meeting.date;
    const now = new Date();
    if (meeting.date === 'Today') {
      dateVal = now.toISOString().split('T')[0];
    } else if (meeting.date === 'Tomorrow') {
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      dateVal = tmrw.toISOString().split('T')[0];
    }

    setEditingMeeting(meeting);
    setEditForm({
      title: meeting.title,
      date: dateVal,
      time: meeting.time
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editForm.title || !editForm.date || !editForm.time) return;

    const updatedMeeting: Meeting = {
      ...editingMeeting,
      title: editForm.title,
      date: editForm.date,
      time: editForm.time,
    };

    const updatedList = await storageService.updateMeeting(updatedMeeting);
    setMeetings(updatedList);
    setShowEditModal(false);
    setEditingMeeting(null);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addUserForm.name && addUserForm.email) {
      setIsAddingUser(true);
      try {
        const newUser = await storageService.addUser(addUserForm.name, addUserForm.email, addUserForm.role);
        
        if (newUser && newUser.token) {
            const baseUrl = window.location.origin;
            const inviteUrl = `${baseUrl}/setup/${newUser.token}`;
            await emailService.sendInvite(newUser.email, newUser.name, inviteUrl, appSettings);
        }

        const updatedUsers = await storageService.getUsers();
        setAllUsers(updatedUsers);
        setShowAddUserModal(false);
        setAddUserForm({ name: '', email: '', role: UserRole.MEMBER });
      } catch (err) {
        console.error("Error adding user:", err);
      } finally {
        setIsAddingUser(false);
      }
    }
  };

  const handleEditUserClick = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditUserForm({
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
    });
    setShowEditUserModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editUserForm.name && editUserForm.email) {
        const updatedUser: User = {
            ...editingUser,
            name: editUserForm.name,
            email: editUserForm.email,
            role: editUserForm.role
        };
        const updatedList = await storageService.updateUser(updatedUser);
        setAllUsers(updatedList);
        setShowEditUserModal(false);
        setEditingUser(null);
    }
  };

  const handleDeleteUserClick = (targetUser: User) => {
    if (targetUser.id === user.id) return;
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
        const updatedList = await storageService.deleteUser(userToDelete.id);
        setAllUsers(updatedList);
        setUserToDelete(null);
    }
  };

  const ensureUserToken = async (targetUser: User): Promise<string> => {
      let token = targetUser.token;
      if (!token) {
        token = await storageService.generateUserToken(targetUser.id) || '';
      }
      return token;
  };

  const handleSendInviteEmail = async (targetUser: User) => {
    setSendingInviteId(targetUser.id);
    try {
        const token = await ensureUserToken(targetUser);
        if (!token) {
           setSendingInviteId(null);
           return;
        }

        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/setup/${token}`;
        
        const success = await emailService.sendInvite(targetUser.email, targetUser.name, inviteUrl, appSettings);
        
        if (success) {
            const event = new CustomEvent('zoomclone-toast', {
                detail: {
                    type: 'success',
                    title: 'Invitation Sent',
                    message: `Invitation email sent successfully to ${targetUser.email}`
                }
            });
            window.dispatchEvent(event);
        }
    } catch (e) {
        console.error("Invite Email Error:", e);
    } finally {
        setSendingInviteId(null);
    }
  };

  const handleSendResetEmail = async (targetUser: User) => {
    setSendingResetId(targetUser.id);
    try {
        const newToken = await storageService.generateUserToken(targetUser.id);
        if (!newToken) return;

        const baseUrl = window.location.origin;
        const resetUrl = `${baseUrl}/reset/${newToken}`;
        
        const success = await emailService.sendPasswordReset(targetUser.email, targetUser.name, resetUrl, appSettings);
        
        if (success) {
            const event = new CustomEvent('zoomclone-toast', {
                detail: {
                    type: 'success',
                    title: 'Reset Email Sent',
                    message: `Password reset instructions sent to ${targetUser.email}`
                }
            });
            window.dispatchEvent(event);
        }
        
        const updatedUsers = await storageService.getUsers();
        setAllUsers(updatedUsers);
    } catch (e) {
        console.error(e);
    } finally {
        setSendingResetId(null);
    }
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareMeeting = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const baseUrl = window.location.origin;
    const joinUrl = `${baseUrl}/join/${meeting.id}`;
    const shareText = `📅 Meeting Invite\n\nTopic: ${meeting.title}\nDate: ${meeting.date}\nTime: ${meeting.time}\n\n🔗 Join Link:\n${joinUrl}\n\n🔑 Meeting ID: ${meeting.id}`;
    navigator.clipboard.writeText(shareText);
    setSharedId(meeting.id);
    setTimeout(() => setSharedId(null), 2000);
  };

  const generateMeetingId = () => {
    // FIX: Gunakan UUID, bukan string pendek 5 karakter.
    // Database Supabase kemungkinan menggunakan tipe 'uuid' untuk kolom ID.
    return crypto.randomUUID();
  };

  const handleInstantMeetingClick = () => {
    setSelectedParticipants(new Set());
    setShowInstantModal(true);
  };

  const sendMeetingEmails = async (meeting: Meeting, participantIds: string[]) => {
    if (participantIds.length === 0) return;
    
    const usersToEmail = allUsers.filter(u => participantIds.includes(u.id));
    
    const emailPromises = usersToEmail.map(u => 
        emailService.sendMeetingInvite(u.email, u.name, meeting, appSettings)
    );
    
    await Promise.all(emailPromises);
  };

  const handleConfirmInstantMeeting = async () => {
    setIsCreatingMeeting(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const id = generateMeetingId();
      const newMeeting: Meeting = {
        id: id,
        title: 'Instant Meeting',
        date: dateStr, 
        time: today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0'),
        host: user.name,
        participantsCount: 1,
        status: 'live'
      };
      
      const participantIds = Array.from(selectedParticipants) as string[];
      
      const updated = await storageService.createMeeting(newMeeting, participantIds);
      await sendMeetingEmails(newMeeting, participantIds);
      
      setMeetings(updated);
      setCreatedMeeting(newMeeting);
      setShowInstantModal(false);
    } catch (err) {
      console.error("Failed to create instant meeting", err);
      // Trigger toast if needed
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinMeeting(joinId.trim());
      setShowJoinModal(false);
      setJoinId('');
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time) return;
    
    setIsCreatingMeeting(true);
    try {
      const id = generateMeetingId();
      const newMeeting: Meeting = {
        id: id,
        title: scheduleForm.title,
        date: scheduleForm.date, 
        time: scheduleForm.time,
        host: user.name,
        participantsCount: 0,
        status: 'upcoming'
      };
      
      const participantIds = Array.from(selectedParticipants) as string[];
      
      const updated = await storageService.createMeeting(newMeeting, participantIds);
      await sendMeetingEmails(newMeeting, participantIds);

      setMeetings(updated);
      setShowScheduleModal(false);
      setScheduleForm({ title: '', date: '', time: '' });
      setSelectedParticipants(new Set());
      setCreatedMeeting(newMeeting);
    } catch (err) {
      console.error("Failed to schedule meeting", err);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleCloseCreatedModal = (shouldJoin: boolean) => {
    if (shouldJoin && createdMeeting) {
      onJoinMeeting(createdMeeting.id);
    }
    setCreatedMeeting(null);
    setCopied(false);
  };

  const toggleParticipantSelection = (userId: string) => {
      setSelectedParticipants(prev => {
          const newSet = new Set(prev);
          if (newSet.has(userId)) {
              newSet.delete(userId);
          } else {
              newSet.add(userId);
          }
          return newSet;
      });
  };

  const formatDateDisplay = (dateString: string) => {
    if (dateString === 'Today' || dateString === 'Tomorrow') return dateString;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; 
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };
  
  const getDateDay = (dateString: string) => {
    if (dateString === 'Today') return new Date().getDate();
    if (dateString === 'Tomorrow') return new Date().getDate() + 1;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '?';
      return date.getDate();
    } catch {
      return '?';
    }
  };

  const getMeetingStatus = (meeting: Meeting): 'waiting' | 'live' | 'ended' => {
    if (meeting.status === 'live') return 'live'; 
    try {
      let targetDate = new Date();
      if (meeting.date === 'Today') {
      } else if (meeting.date === 'Tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        const parsedDate = new Date(meeting.date);
        if (!isNaN(parsedDate.getTime())) targetDate = parsedDate;
      }
      const [hours, minutes] = meeting.time.split(':').map(Number);
      targetDate.setHours(hours || 0, minutes || 0, 0, 0);

      const now = new Date();
      const diffMinutes = (targetDate.getTime() - now.getTime()) / 1000 / 60;
      return diffMinutes > 5 ? 'waiting' : 'live';
    } catch (e) {
      return 'live'; 
    }
  };

  const renderUserSelectionList = () => (
      <div className="border border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
          {allUsers.filter(u => u.id !== user.id).map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => toggleParticipantSelection(u.id)}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedParticipants.has(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}`}>
                      {selectedParticipants.has(u.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full bg-slate-700" />
                  <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.role === UserRole.CLIENT ? 'Client' : u.role}</p>
                  </div>
              </div>
          ))}
          {allUsers.filter(u => u.id !== user.id).length === 0 && (
              <div className="p-4 text-center text-slate-500 text-sm">No other users found.</div>
          )}
      </div>
  );

  const getFilteredUsers = () => {
      if (userManageTab === 'internal') {
          return allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.MEMBER);
      } else {
          return allUsers.filter(u => u.role === UserRole.CLIENT);
      }
  };
  const filteredUsers = getFilteredUsers();

  return (
    <div className="flex h-[100dvh] w-full bg-slate-950 overflow-hidden relative">
      
      {meetingToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Meeting?</h3>
              <p className="text-slate-400 text-sm mb-1">Are you sure you want to delete</p>
              <p className="text-white font-medium mb-4">"{meetingToDelete.title}"?</p>
              <p className="text-slate-500 text-xs">This action cannot be undone.</p>
            </div>
            <div className="flex border-t border-slate-800 bg-slate-950/50">
               <button onClick={() => setMeetingToDelete(null)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">Cancel</button>
               <div className="w-px bg-slate-800"></div>
               <button onClick={confirmDelete} className="flex-1 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Remove User?</h3>
              <p className="text-slate-400 text-sm mb-1">Are you sure you want to remove</p>
              <p className="text-white font-medium mb-4">"{userToDelete.name}"?</p>
              <p className="text-slate-500 text-xs">They will lose access immediately.</p>
            </div>
            <div className="flex border-t border-slate-800 bg-slate-950/50">
               <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">Cancel</button>
               <div className="w-px bg-slate-800"></div>
               <button onClick={confirmDeleteUser} className="flex-1 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Full Name</label><input type="text" placeholder="John Doe" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={addUserForm.name} onChange={(e) => setAddUserForm({...addUserForm, name: e.target.value})} required /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Email Address</label><input type="email" placeholder="john@example.com" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={addUserForm.email} onChange={(e) => setAddUserForm({...addUserForm, email: e.target.value})} required /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Role</label><select className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none appearance-none" value={addUserForm.role} onChange={(e) => setAddUserForm({...addUserForm, role: e.target.value as UserRole})}><option value={UserRole.MEMBER}>Member (Staff)</option><option value={UserRole.ADMIN}>Admin</option><option value={UserRole.CLIENT}>Client (Guest)</option></select></div>
              <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                  <button type="submit" disabled={isAddingUser} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2">
                      {isAddingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                      Add & Invite
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Edit User</h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Full Name</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={editUserForm.name} onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})} required /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Email Address</label><input type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} required /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Role</label><select className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none appearance-none" value={editUserForm.role} onChange={(e) => setAddUserForm({...addUserForm, role: e.target.value as UserRole})}><option value={UserRole.MEMBER}>Member (Staff)</option><option value={UserRole.ADMIN}>Admin</option><option value={UserRole.CLIENT}>Client (Guest)</option></select></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {createdMeeting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center border-b border-slate-800">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20"><Check className="w-6 h-6 text-green-500" /></div>
              <h3 className="text-xl font-bold text-white mb-1">Meeting Created!</h3>
              <p className="text-slate-400 text-sm">Share the ID or invite others.</p>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting Title</label><div className="text-white font-medium text-lg truncate">{createdMeeting.title}</div></div>
              <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting ID</label><div className="flex items-center gap-2"><div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 font-mono text-sm md:text-base tracking-widest text-center truncate">{createdMeeting.id}</div><button onClick={(e) => handleCopyId(createdMeeting.id, e)} className={`p-3 rounded-lg transition-all border ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}>{copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}</button><button onClick={(e) => handleShareMeeting(createdMeeting, e)} className={`p-3 rounded-lg transition-all border ${sharedId === createdMeeting.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}><Share2 className="w-6 h-6" /></button></div></div>
            </div>
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3"><button onClick={() => handleCloseCreatedModal(false)} className="flex-1 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition-colors">Close</button><button onClick={() => handleCloseCreatedModal(true)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95">Join Now</button></div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Join Meeting</h3><button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meeting ID</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Enter ID" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" 
                    value={joinId} 
                    onChange={(e) => setJoinId(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2"><button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all">Join Meeting</button></div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Schedule Meeting</h3><button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
             <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Topic</label><input type="text" placeholder="Weekly Standup" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={scheduleForm.title} onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-sm text-slate-400 mb-1">Date</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} required /></div>
                   <div><label className="block text-sm text-slate-400 mb-1">Time</label><input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={scheduleForm.time} onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})} required /></div>
                </div>
                <div><label className="block text-sm text-slate-400 mb-2">Invite Participants</label>{renderUserSelectionList()}</div>
                <div className="flex justify-end pt-2"><button type="submit" disabled={isCreatingMeeting} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50">{isCreatingMeeting ? 'Scheduling...' : 'Schedule'}</button></div>
             </form>
          </div>
        </div>
      )}

      {showInstantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Start Instant Meeting</h3><button onClick={() => setShowInstantModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
             <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">The meeting will start immediately. You can invite participants now or share the link later.</p>
                <div><label className="block text-sm text-slate-400 mb-2">Invite Participants (Optional)</label>{renderUserSelectionList()}</div>
                <div className="flex justify-end pt-2"><button onClick={handleConfirmInstantMeeting} disabled={isCreatingMeeting} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50">{isCreatingMeeting ? 'Creating...' : 'Start Meeting'}</button></div>
             </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Edit Meeting</h3><button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
             <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Topic</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-sm text-slate-400 mb-1">Date</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} required /></div>
                   <div><label className="block text-sm text-slate-400 mb-1">Time</label><input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none" value={editForm.time} onChange={(e) => setEditForm({...editForm, time: e.target.value})} required /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">Save Changes</button></div>
             </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
             <img src={appSettings.iconUrl} alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"; e.currentTarget.className="w-6 h-6 invert"}} />
           </div>
           <span className="text-xl font-bold text-white tracking-tight truncate">{appSettings.title}</span>
        </div>
        
        <nav className="mt-6 px-4 space-y-2">
           <button onClick={() => { navigate('meetings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'meetings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
             <Video className="w-5 h-5" /> Meetings
           </button>
           
           {isAdmin && (
             <>
               <button onClick={() => { navigate('users'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                 <Users className="w-5 h-5" /> User Management
               </button>
               <button onClick={() => { navigate('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                 <Settings className="w-5 h-5" /> Settings
               </button>
             </>
           )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900/50">
           <div className="flex items-center gap-3 mb-4 px-2">
              <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600" />
              <div className="overflow-hidden">
                 <p className="text-sm font-medium text-white truncate">{user.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg transition-colors text-sm font-medium group">
              <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" /> Sign Out
           </button>
        </div>
      </div>
      
      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden bg-slate-950">
         {/* HEADER MOBILE */}
         <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-30">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Video className="w-4 h-4 text-white" /></div>
               <span className="font-bold text-white">{appSettings.title}</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:text-white"><Menu className="w-6 h-6" /></button>
         </div>

         {/* LOADING OVERLAY */}
         {isLoading && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
         )}
         
         {/* CONTENT AREA */}
         <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            
            {/* MEETINGS TAB */}
            {activeTab === 'meetings' && (
              <div className="max-w-5xl mx-auto space-y-8 animate-[fadeIn_0.3s_ease-out]">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                       <h1 className="text-3xl font-bold text-white mb-1">Meetings</h1>
                       <p className="text-slate-400">Manage and join your video conferences.</p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => setShowJoinModal(true)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-2">
                          <LinkIcon className="w-4 h-4" /> Join
                       </button>
                       {!isClient && (
                         <>
                           <button onClick={() => setShowScheduleModal(true)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors flex items-center gap-2">
                              <Calendar className="w-4 h-4" /> Schedule
                           </button>
                           <button onClick={handleInstantMeetingClick} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                              <Plus className="w-4 h-4" /> New Meeting
                           </button>
                         </>
                       )}
                    </div>
                 </div>

                 {meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                       <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4"><Calendar className="w-10 h-10 text-slate-600" /></div>
                       <h3 className="text-xl font-semibold text-white mb-2">No meetings found</h3>
                       <p className="text-slate-400 max-w-xs text-center">Get started by scheduling a new meeting or starting an instant one.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {meetings.map(meeting => {
                          const status = getMeetingStatus(meeting);
                          return (
                             <div key={meeting.id} className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:shadow-xl transition-all relative overflow-hidden flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                   <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                      status === 'live' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                      status === 'waiting' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                                      'bg-slate-800 text-slate-400 border border-slate-700'
                                   }`}>
                                      {status === 'live' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                      {status === 'live' ? 'Live Now' : status === 'waiting' ? 'Starting Soon' : 'Upcoming'}
                                   </div>
                                   {!isClient && (
                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={(e) => handleEditClick(meeting, e)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                                       <button onClick={(e) => handleDeleteClick(meeting, e)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                     </div>
                                   )}
                                </div>
                                
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{meeting.title}</h3>
                                <p className="text-slate-500 text-xs mb-6">ID: {meeting.id}</p>
                                
                                <div className="space-y-3 mb-6">
                                   <div className="flex items-center gap-3 text-sm text-slate-300">
                                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Calendar className="w-4 h-4" /></div>
                                      <div className="flex-1">
                                         <p className="text-xs text-slate-500">Date</p>
                                         <p className="font-medium">{formatDateDisplay(meeting.date)}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3 text-sm text-slate-300">
                                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Clock className="w-4 h-4" /></div>
                                      <div className="flex-1">
                                         <p className="text-xs text-slate-500">Time</p>
                                         <p className="font-medium">{meeting.time}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3 text-sm text-slate-300">
                                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Users className="w-4 h-4" /></div>
                                      <div className="flex-1">
                                         <p className="text-xs text-slate-500">Host</p>
                                         <p className="font-medium truncate">{meeting.host}</p>
                                      </div>
                                   </div>
                                </div>

                                <div className="mt-auto flex gap-2">
                                   <button onClick={() => onJoinMeeting(meeting.id)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/10">Join</button>
                                   <button onClick={(e) => handleCopyId(meeting.id, e)} className={`p-2.5 rounded-xl border transition-all ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>{copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}</button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
            )}
            
            {/* USERS TAB */}
            {activeTab === 'users' && isAdmin && (
               <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                     <div>
                        <h1 className="text-3xl font-bold text-white mb-1">User Management</h1>
                        <p className="text-slate-400">Manage internal staff and client access.</p>
                     </div>
                     <button onClick={() => setShowAddUserModal(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Add User
                     </button>
                  </div>

                  {/* SUB TABS */}
                  <div className="flex border-b border-slate-800">
                      <button onClick={() => setUserManageTab('internal')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${userManageTab === 'internal' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                          Internal Users <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded-full text-xs">{allUsers.filter(u => u.role !== UserRole.CLIENT).length}</span>
                      </button>
                      <button onClick={() => setUserManageTab('client')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${userManageTab === 'client' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                          Clients <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded-full text-xs">{allUsers.filter(u => u.role === UserRole.CLIENT).length}</span>
                      </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                           <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-500">
                              <tr>
                                 <th className="px-6 py-4">User</th>
                                 <th className="px-6 py-4">Role</th>
                                 <th className="px-6 py-4">Status</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-800">
                              {filteredUsers.length === 0 ? (
                                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
                              ) : (
                                  filteredUsers.map(u => (
                                     <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                           <div className="flex items-center gap-3">
                                              <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full bg-slate-800" />
                                              <div>
                                                 <div className="font-medium text-white">{u.name}</div>
                                                 <div className="text-xs text-slate-500">{u.email}</div>
                                              </div>
                                           </div>
                                        </td>
                                        <td className="px-6 py-4">
                                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                              u.role === UserRole.ADMIN ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                              u.role === UserRole.MEMBER ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                           }`}>{u.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.status === 'active' ? (
                                                <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium"><Check className="w-3 h-3" /> Active</span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-orange-400 text-xs font-medium"><Hourglass className="w-3 h-3" /> Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                           <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => handleSendResetEmail(u)} disabled={!!sendingResetId} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50" title="Send Password Reset">
                                                 {sendingResetId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                              </button>
                                              
                                              {u.status === 'pending' && (
                                                  <button onClick={() => handleSendInviteEmail(u)} disabled={!!sendingInviteId} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50" title="Resend Invite">
                                                     {sendingInviteId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                                  </button>
                                              )}
                                              
                                              <button onClick={() => handleEditUserClick(u)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Edit">
                                                 <Pencil className="w-4 h-4" />
                                              </button>
                                              <button onClick={() => handleDeleteUserClick(u)} className={`p-2 rounded-lg transition-colors ${u.id === user.id ? 'opacity-20 cursor-not-allowed' : 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'}`} disabled={u.id === user.id} title="Delete">
                                                 <Trash2 className="w-4 h-4" />
                                              </button>
                                           </div>
                                        </td>
                                     </tr>
                                  ))
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && isAdmin && (
                <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.3s_ease-out]">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">App Settings</h1>
                        <p className="text-slate-400">Configure global application preferences.</p>
                    </div>

                    <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                        {/* App Icon Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-4">Application Logo</label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                                    <img src={settingsForm.iconUrl} alt="App Icon" className="w-16 h-16 object-contain z-10" onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"}} />
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer" onClick={handleTriggerUpload}>
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                    />
                                    <button type="button" onClick={handleTriggerUpload} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg border border-slate-700 transition-colors">
                                        Upload New Logo
                                    </button>
                                    <p className="text-xs text-slate-500 mt-2">Recommended: 512x512px PNG</p>
                                </div>
                            </div>
                        </div>

                        {/* App Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Application Name</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-colors"
                                    value={settingsForm.title}
                                    onChange={(e) => setSettingsForm(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">This title will appear on the login screen and browser tab.</p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                            <span className={`text-sm font-medium transition-opacity duration-500 ${settingsSavedSuccess ? 'opacity-100 text-green-500' : 'opacity-0'}`}>
                                Settings saved successfully!
                            </span>
                            <button 
                                type="submit" 
                                disabled={isSavingSettings}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-slate-400" /> Google Drive Integration</h3>
                        <p className="text-slate-400 text-sm mb-4">Connect Google Drive to save meeting recordings automatically. (Coming Soon)</p>
                        <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 font-medium rounded-lg border border-slate-700 cursor-not-allowed">
                            Connect Account
                        </button>
                    </div>
                </div>
            )}

         </div>
      </div>
    </div>
  );
};

export default Dashboard;
