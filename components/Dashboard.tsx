
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
  Briefcase,
  Download,
  Smartphone,
  ExternalLink
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
  const [showInstantModal, setShowInstantModal] = useState(false); // NEW: Instant Meeting Setup
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
  const [calendarLinks, setCalendarLinks] = useState<{google: string, outlook: string} | null>(null);

  // Invite/Reset Link Copied State
  const [inviteCopiedId, setInviteCopiedId] = useState<string | null>(null);
  
  // Loading state for sending emails
  const [sendingResetId, setSendingResetId] = useState<string | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false); // New loading state for adding user
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false); // New loading state for creating/sending emails

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
  // Listen for popstate (Browser Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      // Access control check
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

  // Initial access check
  useEffect(() => {
    const tab = getTabFromUrl();
    if (!isAdmin && (tab === 'users' || tab === 'settings')) {
       navigate('meetings', true);
    }
  }, [isAdmin]);

  // When createdMeeting updates, generate links
  useEffect(() => {
      if (createdMeeting) {
          setCalendarLinks(emailService.getCalendarLinks(createdMeeting));
      }
  }, [createdMeeting]);

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
      
      // Always fetch users now to populate the invite lists in modals
      const userData = await storageService.getUsers();
      setAllUsers(userData);
      
      setIsLoading(false);
    };

    fetchData();
  }, [isAdmin, activeTab]);

  // Sync settings form with prop changes
  useEffect(() => {
    setSettingsForm({
        title: appSettings.title,
        iconUrl: appSettings.iconUrl
    });
  }, [appSettings]);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // --- ACTIONS ---

  // Settings Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
        const newSettings = await storageService.updateAppSettings({
            ...appSettings, // Preserve existing settings like keys
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

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Please select an image under 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Resize image to max 192x192 for performance
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
            
            // Convert to Base64
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

  // Meeting Actions
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

  // User Actions
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addUserForm.name && addUserForm.email) {
      setIsAddingUser(true);
      try {
        // 1. Save to Database
        const newUser = await storageService.addUser(addUserForm.name, addUserForm.email, addUserForm.role);
        
        if (newUser && newUser.token) {
            // 2. Automatically Send Activation Email
            const baseUrl = window.location.origin;
            const inviteUrl = `${baseUrl}/setup/${newUser.token}`;
            await emailService.sendInvite(newUser.email, newUser.name, inviteUrl, appSettings);
        }

        // 3. Update UI
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
    if (targetUser.id === user.id) return; // Prevent self-delete
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
        const updatedList = await storageService.deleteUser(userToDelete.id);
        setAllUsers(updatedList);
        setUserToDelete(null);
    }
  };

  // --- TOKEN GENERATOR HELPER ---
  const ensureUserToken = async (targetUser: User): Promise<string> => {
      let token = targetUser.token;
      if (!token) {
        token = await storageService.generateUserToken(targetUser.id) || '';
      }
      return token;
  };

  const handleCopyInviteLink = async (targetUser: User) => {
    const token = await ensureUserToken(targetUser);
    if (!token) return;

    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/setup/${token}`;
    const message = `👋 Hello ${targetUser.name},\n\nYou have been invited to join the ${appSettings.title} workspace.\n\nPlease click the link below to set your password and activate your account:\n\n🔗 ${inviteUrl}`;

    navigator.clipboard.writeText(message);
    setInviteCopiedId(targetUser.id);
    setTimeout(() => setInviteCopiedId(null), 2000);
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
        
        // Wait for email service
        const success = await emailService.sendInvite(targetUser.email, targetUser.name, inviteUrl, appSettings);
        
        // Only show success alert if true (Error alert handled by service)
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

  const handleCopyResetLink = async (targetUser: User) => {
    const newToken = await storageService.generateUserToken(targetUser.id);
    if (!newToken) return;

    const baseUrl = window.location.origin;
    const resetUrl = `${baseUrl}/reset/${newToken}`;
    const message = `🔐 Hi ${targetUser.name},\n\nA password reset was requested for your account.\n\nPlease click the link below to create a new password:\n\n🔗 ${resetUrl}\n\nThis link is valid for one-time use.`;

    navigator.clipboard.writeText(message);
    setInviteCopiedId(targetUser.id);
    setTimeout(() => setInviteCopiedId(null), 2000);
    
    const updatedUsers = await storageService.getUsers();
    setAllUsers(updatedUsers);
  };

  const handleSendResetEmail = async (targetUser: User) => {
    setSendingResetId(targetUser.id); // Set loading state for specific user
    try {
        const newToken = await storageService.generateUserToken(targetUser.id);
        if (!newToken) return;

        const baseUrl = window.location.origin;
        const resetUrl = `${baseUrl}/reset/${newToken}`;
        
        // Wait for email service result
        const success = await emailService.sendPasswordReset(targetUser.email, targetUser.name, resetUrl, appSettings);
        
        // Show success notification if sent successfully
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
        
        // Refresh to show updated token state if needed
        const updatedUsers = await storageService.getUsers();
        setAllUsers(updatedUsers);
    } catch (e) {
        console.error(e);
    } finally {
        setSendingResetId(null); // Clear loading state
    }
  };

  const handleDownloadICS = (meeting: Meeting) => {
     emailService.downloadICSFile(meeting);
  };

  // Misc Helpers
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
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleInstantMeetingClick = () => {
    // Open a simple modal to select participants before starting
    setSelectedParticipants(new Set()); // Reset selection
    setShowInstantModal(true);
  };

  // Helper to send emails to participants
  const sendMeetingEmails = async (meeting: Meeting, participantIds: string[]) => {
    if (participantIds.length === 0) return;
    
    // Find full user objects from IDs
    const usersToEmail = allUsers.filter(u => participantIds.includes(u.id));
    
    // Send emails sequentially or in parallel
    // Using parallel here for speed, though EmailJS has rate limits (be careful with large lists)
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
      
      const participantIds = Array.from(selectedParticipants);
      
      // 1. Create in DB
      const updated = await storageService.createMeeting(newMeeting, participantIds);
      
      // 2. Send Emails to invited
      await sendMeetingEmails(newMeeting, participantIds);
      
      setMeetings(updated);
      setCreatedMeeting(newMeeting);
      setShowInstantModal(false);
    } catch (err) {
      console.error("Failed to create instant meeting", err);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinMeeting(joinId);
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
      
      const participantIds = Array.from(selectedParticipants);
      
      // 1. Create in DB
      const updated = await storageService.createMeeting(newMeeting, participantIds);
      
      // 2. Send Emails
      await sendMeetingEmails(newMeeting, participantIds);

      setMeetings(updated);
      setShowScheduleModal(false);
      setScheduleForm({ title: '', date: '', time: '' });
      setSelectedParticipants(new Set()); // Reset
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

  // Helper for rendering user list
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

  // Filter users based on active management tab
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
      
      {/* ... [DELETE MODALS, USER MODALS REMAIN UNCHANGED] ... */}
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

      {/* MEETING CREATED SUCCESS MODAL (UPDATED) */}
      {createdMeeting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transform scale-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center border-b border-slate-800">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20"><Check className="w-6 h-6 text-green-500" /></div>
              <h3 className="text-xl font-bold text-white mb-1">Meeting Created!</h3>
              <p className="text-slate-400 text-sm">Add to your calendar or share the invite.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting ID</label><div className="flex items-center gap-2"><div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 font-mono text-xl md:text-2xl tracking-widest text-center">{createdMeeting.id}</div><button onClick={(e) => handleCopyId(createdMeeting.id, e)} className={`p-3 rounded-lg transition-all border ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}>{copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}</button><button onClick={(e) => handleShareMeeting(createdMeeting, e)} className={`p-3 rounded-lg transition-all border ${sharedId === createdMeeting.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}><Share2 className="w-6 h-6" /></button></div></div>
              </div>

              {/* CALENDAR OPTIONS */}
              <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add to Calendar</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* 1. System Calendar (ICS) - Direct Open */}
                      <button 
                          onClick={() => handleDownloadICS(createdMeeting)}
                          className="md:col-span-2 py-3 px-4 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-colors group"
                      >
                          <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-white" />
                          <div className="text-left">
                              <div className="text-sm font-bold">System Calendar</div>
                              <div className="text-[10px] text-slate-400 group-hover:text-blue-200">Apple Calendar, Outlook App, Mobile</div>
                          </div>
                      </button>

                      {/* 2. Google Calendar Web */}
                      {calendarLinks && (
                          <a 
                              href={calendarLinks.google} 
                              target="_blank" 
                              rel="noreferrer"
                              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                              <ExternalLink className="w-4 h-4" />
                              Google Web
                          </a>
                      )}

                      {/* 3. Outlook Web */}
                      {calendarLinks && (
                          <a 
                              href={calendarLinks.outlook} 
                              target="_blank" 
                              rel="noreferrer"
                              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                              <ExternalLink className="w-4 h-4" />
                              Outlook Web
                          </a>
                      )}
                  </div>
              </div>
            </div>
            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3"><button onClick={() => handleCloseCreatedModal(false)} className="flex-1 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition-colors">Close</button><button onClick={() => handleCloseCreatedModal(true)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95">Join Now</button></div>
          </div>
        </div>
      )}

      {/* ... [OTHER MODALS & MAIN CONTENT UNCHANGED] ... */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Join Meeting</h3><button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleJoinSubmit} className="p-6 space-y-4"><div><label className="block text-sm text-slate-400 mb-1">Meeting ID</label><div className="relative"><LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" /><input type="text" placeholder="Enter ID" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none uppercase" value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} maxLength={5} autoFocus /></div></div><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowJoinModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button><button type="submit" disabled={!joinId.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50">Join</button></div></form>
          </div>
        </div>
      )}

      {showInstantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Instant Meeting</h3><button onClick={() => setShowInstantModal(false)}><X className="w-5 h-5 text-slate-400"/></button></div>
             <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <p className="text-sm text-slate-400">Select participants to invite (optional):</p>
                {renderUserSelectionList()}
             </div>
             <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowInstantModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button onClick={handleConfirmInstantMeeting} disabled={isCreatingMeeting} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                    {isCreatingMeeting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Start Meeting
                </button>
             </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Schedule Meeting</h3><button onClick={() => setShowScheduleModal(false)}><X className="w-5 h-5 text-slate-400"/></button></div>
             <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Topic</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} required/></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-slate-400 mb-1">Date</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={scheduleForm.date} onChange={e => setScheduleForm({...scheduleForm, date: e.target.value})} required/></div><div><label className="block text-sm text-slate-400 mb-1">Time</label><input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={scheduleForm.time} onChange={e => setScheduleForm({...scheduleForm, time: e.target.value})} required/></div></div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Invite Participants</label>
                    {renderUserSelectionList()}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                    <button type="submit" disabled={isCreatingMeeting} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                        {isCreatingMeeting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save & Invite
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
      
      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
           <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="text-white font-semibold">Edit Meeting</h3><button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button></div>
             <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Topic</label><input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required/></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm text-slate-400 mb-1">Date</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} required/></div><div><label className="block text-sm text-slate-400 mb-1">Time</label><input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} required/></div></div>
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Update</button></div>
             </form>
           </div>
        </div>
      )}

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <img src={appSettings.iconUrl} alt="Logo" className="w-8 h-8 object-contain" onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"}} />
           <span className="font-bold text-white text-lg tracking-tight">{appSettings.title}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}/>}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 md:flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 items-center gap-3 hidden md:flex">
             <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 p-1.5">
                <img src={appSettings.iconUrl} alt="Logo" className="w-full h-full object-contain" onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"}} />
             </div>
             <span className="text-lg font-bold text-white tracking-tight truncate">{appSettings.title}</span>
        </div>
        <div className="p-4 flex items-center justify-between md:hidden border-b border-slate-800"><span className="text-lg font-bold text-white">Menu</span><button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400"/></button></div>

        <div className="px-4 py-2 mt-2 md:mt-0">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-3 mb-6">
            <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-600" />
            <div className="overflow-hidden"><p className="text-sm font-medium text-white truncate">{user.name}</p><p className="text-xs text-blue-400 font-medium uppercase tracking-wider">{user.role}</p></div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => navigate('meetings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'meetings' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Calendar className="w-5 h-5" />Meetings</button>
          {isAdmin && <button onClick={() => navigate('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Users className="w-5 h-5" />Manage Users</button>}
          {isAdmin && <button onClick={() => navigate('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Settings className="w-5 h-5" />Settings</button>}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"><LogOut className="w-5 h-5" />Sign Out</button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-auto bg-slate-950 p-4 pt-20 md:p-8 md:pt-8 custom-scrollbar">
        {isLoading && (
          <div className="w-full h-full flex items-center justify-center">
             <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 text-sm">Syncing...</p>
             </div>
          </div>
        )}

        {!isLoading && activeTab === 'meetings' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div><h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1><p className="text-slate-400 text-sm md:text-base">Manage your upcoming video conferences</p></div>
              {!isClient && (
                <button onClick={() => { setShowScheduleModal(true); setSelectedParticipants(new Set()); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full md:w-auto"><Plus className="w-5 h-5" />Schedule Meeting</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {!isClient && (
                 <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white shadow-xl shadow-orange-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform" onClick={handleInstantMeetingClick}><div className="p-3 bg-white/20 rounded-xl w-fit mb-4"><Video className="w-6 h-6" /></div><h3 className="text-lg font-bold mb-1">New Meeting</h3><p className="text-white/70 text-sm">Start an instant meeting</p></div>
              )}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform" onClick={() => setShowJoinModal(true)}><div className="p-3 bg-white/20 rounded-xl w-fit mb-4"><Plus className="w-6 h-6" /></div><h3 className="text-lg font-bold mb-1">Join Meeting</h3><p className="text-white/70 text-sm">Join via ID or link</p></div>
              {!isClient && (
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform" onClick={() => { setShowScheduleModal(true); setSelectedParticipants(new Set()); }}><div className="p-3 bg-white/20 rounded-xl w-fit mb-4"><Calendar className="w-6 h-6" /></div><h3 className="text-lg font-bold mb-1">Schedule</h3><p className="text-white/70 text-sm">Plan for later</p></div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Upcoming Meetings</h2><span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full font-medium">{meetings.length} Total</span></div>
              <div className="divide-y divide-slate-800">
                {meetings.map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  const isHost = meeting.host === user.name;
                  const canManage = isAdmin || isHost;
                  return (
                    <div key={meeting.id} className="p-4 md:p-6 hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative shrink-0">
                           <div className={`absolute top-0 w-full h-1.5 ${status === 'waiting' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                           <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase mt-1">{formatDateDisplay(meeting.date).split(' ')[0]}</span>
                           <span className="text-base md:text-lg font-bold text-white leading-none">{getDateDay(meeting.date)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                             <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors truncate">{meeting.title}</h3>
                             {status === 'waiting' && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20 font-medium flex items-center gap-1 shrink-0"><Hourglass className="w-3 h-3" /> Waiting</span>}
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-xs md:text-sm text-slate-400">
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 md:w-4 md:h-4" /> {meeting.time}</span>
                            <span className="flex items-center gap-1.5 truncate"><Users className="w-3 h-3 md:w-4 md:h-4" /> Host: {meeting.host}</span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-1">ID: {meeting.id}</div>
                        </div>
                      </div>
                      
                      {/* Responsive Action Buttons - Stack on mobile, Row on Desktop */}
                      <div className="flex flex-row md:items-center gap-2 md:gap-3 self-stretch md:self-auto w-full md:w-auto mt-2 md:mt-0">
                        <button onClick={() => onJoinMeeting(meeting.id)} className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors border text-center ${status === 'waiting' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-800 hover:bg-blue-600 text-white border-slate-700 hover:border-blue-500'}`}>Join</button>
                        <div className="flex gap-2">
                           <button onClick={(e) => handleCopyId(meeting.id, e)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-slate-800 hover:border-slate-600 flex-1 md:flex-none justify-center flex" title="Copy ID"><Copy className="w-5 h-5" /></button>
                           <button onClick={(e) => handleShareMeeting(meeting, e)} className={`p-2 rounded-lg transition-colors border ${sharedId === meeting.id ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-500 hover:text-white hover:bg-slate-700 border-slate-800 hover:border-slate-600'} flex-1 md:flex-none justify-center flex`} title="Share Meeting"><Share2 className="w-5 h-5" /></button>
                           {canManage && (
                             <><button onClick={(e) => handleEditClick(meeting, e)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 border border-slate-800 rounded-lg transition-colors flex-1 md:flex-none justify-center flex"><Pencil className="w-5 h-5" /></button><button onClick={(e) => handleDeleteClick(meeting, e)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 border border-slate-800 rounded-lg transition-colors flex-1 md:flex-none justify-center flex"><Trash2 className="w-5 h-5" /></button></>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {meetings.length === 0 && <div className="p-12 text-center text-slate-500"><LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>No upcoming meetings found</p></div>}
              </div>
            </div>
          </div>
        )}

        {/* ... [REMAINING CONTENT IS UNCHANGED] ... */}
        {!isLoading && activeTab === 'users' && isAdmin && (
          <div className="max-w-4xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-white mb-1">User Management</h1><p className="text-slate-400 text-sm md:text-base">Manage team members and roles</p></div><button onClick={() => setShowAddUserModal(true)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full md:w-auto"><UserPlus className="w-5 h-5" />Add User</button></div>
             
             {/* User Category Tabs */}
             <div className="flex gap-2 mb-6 border-b border-slate-800">
                <button 
                  onClick={() => setUserManageTab('internal')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${userManageTab === 'internal' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <Users className="w-4 h-4" /> Team Members
                </button>
                <button 
                  onClick={() => setUserManageTab('client')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${userManageTab === 'client' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    <Briefcase className="w-4 h-4" /> Clients
                </button>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                 <div className="min-w-[600px]">
                   <div className="grid grid-cols-4 p-4 border-b border-slate-800 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider"><div className="col-span-2">User</div><div>Role</div><div className="text-right">Actions</div></div>
                   {filteredUsers.length === 0 && (
                       <div className="p-8 text-center text-slate-500">
                           <p>No {userManageTab === 'client' ? 'clients' : 'team members'} found.</p>
                       </div>
                   )}
                   {filteredUsers.map((u, i) => (
                     <div key={u.id} className="grid grid-cols-4 p-4 border-b border-slate-800 items-center hover:bg-slate-800/30 transition-colors group">
                       <div className="col-span-2 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">{u.avatar.includes('http') ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0)}</div><div className="overflow-hidden"><p className="text-sm font-medium text-white truncate">{u.name}</p><p className="text-xs text-slate-500 truncate">{u.email}</p></div></div>
                       <div><span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : (u.role === 'CLIENT' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-700 text-slate-300')}`}>{u.role}</span></div>
                       <div className="text-right flex items-center justify-end gap-2">
                         {u.status === 'active' ? (
                           <div className="flex items-center gap-1 mr-2"><span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Active</span></div>
                         ) : (
                           <div className="flex items-center gap-1 mr-2">
                             <button onClick={() => handleSendInviteEmail(u)} disabled={sendingInviteId === u.id} className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all disabled:opacity-50" title="Resend Invitation Email">
                                {sendingInviteId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                             </button>
                             {/* Copy Link Button Removed as requested */}
                           </div>
                         )}
                         <div className="flex gap-1">
                             {/* SIMPLIFIED RESET PASSWORD BUTTON (1 BUTTON ONLY WITH LOADING) */}
                             {u.status === 'active' && (
                                <button 
                                    onClick={() => handleSendResetEmail(u)} 
                                    disabled={sendingResetId === u.id}
                                    className="p-1.5 text-slate-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors border border-transparent hover:border-slate-700 group disabled:opacity-50 disabled:cursor-not-allowed" 
                                    title="Reset Password (Sends Email)"
                                >
                                    {sendingResetId === u.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                                    ) : (
                                        <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                                    )}
                                </button>
                             )}
                             <button onClick={() => handleEditUserClick(u)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors border border-transparent hover:border-slate-700"><Pencil className="w-4 h-4" /></button>
                             {u.id !== user.id && <button onClick={() => handleDeleteUserClick(u)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-slate-700"><Trash2 className="w-4 h-4" /></button>}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        )}

        {!isLoading && activeTab === 'settings' && isAdmin && (
            <div className="max-w-3xl mx-auto animate-[fadeIn_0.2s_ease-out]">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-1">Application Settings</h1>
                    <p className="text-slate-400 text-sm md:text-base">Customize the workspace branding</p>
                </div>

                <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6 md:p-8 space-y-8">
                        {/* Title Section */}
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                                <Globe className="w-4 h-4" /> Application Title
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={settingsForm.title}
                                    onChange={(e) => setSettingsForm({...settingsForm, title: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                    placeholder="ZoomClone AI"
                                    required
                                />
                                <p className="mt-2 text-xs text-slate-500">This will appear in the browser tab and dashboard header.</p>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800" />

                        {/* Icon Section */}
                        <div className="space-y-4">
                             <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                                <ImageIcon className="w-4 h-4" /> Icon (Favicon & Logo)
                            </label>
                            
                            <div className="flex flex-col gap-4">
                                {/* Hidden File Input */}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageUpload} 
                                    accept="image/*" 
                                    className="hidden" 
                                />

                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="url" 
                                                    value={settingsForm.iconUrl}
                                                    onChange={(e) => setSettingsForm({...settingsForm, iconUrl: e.target.value})}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all pr-12"
                                                    placeholder="https://example.com/logo.png"
                                                />
                                                <div className="absolute right-3 top-3.5 text-slate-500 pointer-events-none">
                                                    <LinkIcon className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={handleTriggerUpload}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 rounded-xl transition-colors flex items-center gap-2 font-medium"
                                            >
                                                <Upload className="w-5 h-5" />
                                                <span className="hidden sm:inline">Upload</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Paste a URL or upload an image. Uploaded images are compressed and stored securely.
                                        </p>
                                    </div>

                                    {/* Preview Box */}
                                    <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl w-32 h-32 relative group">
                                         {settingsForm.iconUrl ? (
                                             <img 
                                                src={settingsForm.iconUrl} 
                                                alt="Preview" 
                                                className="w-16 h-16 object-contain mb-2" 
                                                onError={(e) => {e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4406/4406234.png"}}
                                             />
                                         ) : (
                                             <ImageIcon className="w-12 h-12 text-slate-700 mb-2" />
                                         )}
                                         <span className="text-[10px] text-slate-500">Preview</span>
                                         
                                         {/* Overlay for re-uploading via click */}
                                         <div 
                                            onClick={handleTriggerUpload}
                                            className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer rounded-xl"
                                         >
                                             <RefreshCw className="w-6 h-6 text-white mb-1" />
                                             <span className="text-[10px] text-white font-medium">Change</span>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-6 border-t border-slate-800 flex items-center justify-end gap-4">
                        {settingsSavedSuccess && <span className="text-sm text-green-500 font-medium flex items-center gap-1 animate-pulse"><Check className="w-4 h-4" /> Saved Successfully</span>}
                        <button 
                            type="submit" 
                            disabled={isSavingSettings}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
