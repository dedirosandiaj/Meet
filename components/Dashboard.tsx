import React, { useState, useEffect } from 'react';
import { User, UserRole, Meeting } from '../types';
import { storageService } from '../services/storage';
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
  RotateCcw
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onJoinMeeting: (meetingId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onJoinMeeting }) => {
  const [activeTab, setActiveTab] = useState<'meetings' | 'users'>('meetings');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Modal States
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  // Delete Modal State
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  
  // New Meeting Created Modal State
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);

  // Invite/Reset Link Copied State
  const [inviteCopiedId, setInviteCopiedId] = useState<string | null>(null);

  // Form States
  const [joinId, setJoinId] = useState('');
  
  // Create/Schedule Form
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    date: '',
    time: ''
  });

  // Edit Form State
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

  const isAdmin = user.role === UserRole.ADMIN;

  // Load Data
  useEffect(() => {
    setMeetings(storageService.getMeetings());
    if (isAdmin) {
      setAllUsers(storageService.getUsers());
    }
  }, [isAdmin, activeTab]); // Refresh when tab changes

  // --- ACTIONS ---

  const handleDeleteClick = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering row click or other events
    setMeetingToDelete(meeting);
  };

  const confirmDelete = () => {
    if (meetingToDelete) {
      const updated = storageService.deleteMeeting(meetingToDelete.id);
      setMeetings(updated);
      setMeetingToDelete(null);
    }
  };

  const handleEditClick = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    // Convert "Today"/"Tomorrow" to YYYY-MM-DD for the input
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editForm.title || !editForm.date || !editForm.time) return;

    const updatedMeeting: Meeting = {
      ...editingMeeting,
      title: editForm.title,
      date: editForm.date,
      time: editForm.time,
    };

    const updatedList = storageService.updateMeeting(updatedMeeting);
    setMeetings(updatedList);
    setShowEditModal(false);
    setEditingMeeting(null);
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareMeeting = (meeting: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Construct clean slug URL: domain.com/join/ABC12
    const baseUrl = window.location.origin;
    const joinUrl = `${baseUrl}/join/${meeting.id}`;
    
    const shareText = `📅 Meeting Invite\n\nTopic: ${meeting.title}\nDate: ${meeting.date}\nTime: ${meeting.time}\n\n🔗 Join Link:\n${joinUrl}\n\n🔑 Meeting ID: ${meeting.id}`;

    navigator.clipboard.writeText(shareText);
    
    // Show visual feedback
    setSharedId(meeting.id);
    setTimeout(() => setSharedId(null), 2000);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addUserForm.name && addUserForm.email) {
      storageService.addUser(addUserForm.name, addUserForm.email, addUserForm.role);
      setAllUsers(storageService.getUsers());
      setShowAddUserModal(false);
      setAddUserForm({ name: '', email: '', role: UserRole.MEMBER });
    }
  };

  const handleCopyInviteLink = (targetUser: User) => {
    if (!targetUser.token) {
        // Fallback or generate one if missing (shouldn't happen for new users)
        const newToken = storageService.generateUserToken(targetUser.id);
        if (newToken) targetUser.token = newToken;
        else return;
    }

    const baseUrl = window.location.origin;
    // Use TOKEN in URL, not ID
    const inviteUrl = `${baseUrl}/setup/${targetUser.token}`;
    
    const message = `👋 Hello ${targetUser.name},\n\nYou have been invited to join the ZoomClone workspace.\n\nPlease click the link below to set your password and activate your account:\n\n🔗 ${inviteUrl}`;

    navigator.clipboard.writeText(message);
    setInviteCopiedId(targetUser.id);
    setTimeout(() => setInviteCopiedId(null), 2000);
  };

  const handleCopyResetLink = (targetUser: User) => {
    // Generate a NEW secure token for this reset request
    const newToken = storageService.generateUserToken(targetUser.id);
    
    if (!newToken) return;

    const baseUrl = window.location.origin;
    // Use TOKEN in URL, not ID
    const resetUrl = `${baseUrl}/reset/${newToken}`;
    
    const message = `🔐 Hi ${targetUser.name},\n\nA password reset was requested for your account.\n\nPlease click the link below to create a new password:\n\n🔗 ${resetUrl}\n\nThis link is valid for one-time use.`;

    navigator.clipboard.writeText(message);
    setInviteCopiedId(targetUser.id);
    setTimeout(() => setInviteCopiedId(null), 2000);
    
    // Refresh user list to reflect potential token updates
    setAllUsers(storageService.getUsers());
  };

  // Helper: Generate 5-character alphanumeric ID
  const generateMeetingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 1. Instant Meeting Logic
  const handleInstantMeeting = () => {
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
    
    const updated = storageService.createMeeting(newMeeting);
    setMeetings(updated);
    setCreatedMeeting(newMeeting);
  };

  // 2. Join Meeting Logic
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinMeeting(joinId);
      setShowJoinModal(false);
      setJoinId('');
    }
  };

  // 3. Schedule Meeting Logic
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.date || !scheduleForm.time) return;

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

    const updated = storageService.createMeeting(newMeeting);
    setMeetings(updated);
    
    setShowScheduleModal(false);
    setScheduleForm({ title: '', date: '', time: '' });
    setCreatedMeeting(newMeeting);
  };

  const handleCloseCreatedModal = (shouldJoin: boolean) => {
    if (shouldJoin && createdMeeting) {
      onJoinMeeting(createdMeeting.id);
    }
    setCreatedMeeting(null);
    setCopied(false);
  };

  // --- HELPERS ---

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

  // Logic to determine status (Waiting vs Live) based on Time
  const getMeetingStatus = (meeting: Meeting): 'waiting' | 'live' | 'ended' => {
    if (meeting.status === 'live') return 'live'; 

    try {
      let targetDate = new Date();
      
      if (meeting.date === 'Today') {
        // keep today
      } else if (meeting.date === 'Tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        const parsedDate = new Date(meeting.date);
        if (!isNaN(parsedDate.getTime())) {
          targetDate = parsedDate;
        }
      }

      const [hours, minutes] = meeting.time.split(':').map(Number);
      targetDate.setHours(hours || 0, minutes || 0, 0, 0);

      const now = new Date();
      const diffMinutes = (targetDate.getTime() - now.getTime()) / 1000 / 60;

      if (diffMinutes > 5) {
        return 'waiting';
      } else {
        return 'live';
      }
    } catch (e) {
      return 'live'; 
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden relative">
      
      {/* --- MODALS --- */}

      {/* DELETE CONFIRMATION MODAL */}
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
               <button 
                  onClick={() => setMeetingToDelete(null)}
                  className="flex-1 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
               >
                 Cancel
               </button>
               <div className="w-px bg-slate-800"></div>
               <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-bold"
               >
                 Delete
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({...addUserForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="john@example.com" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({...addUserForm, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Role</label>
                <select 
                   className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
                   value={addUserForm.role}
                   onChange={(e) => setAddUserForm({...addUserForm, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.MEMBER}>Member</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-400">
                <p>New users will receive a pending status. You can generate an invite link for them to set their password.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEETING CREATED SUCCESS MODAL */}
      {createdMeeting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="p-6 text-center border-b border-slate-800">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Meeting Created!</h3>
              <p className="text-slate-400 text-sm">Share the ID below to invite others.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting Title</label>
                <div className="text-white font-medium text-lg truncate">{createdMeeting.title}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting ID</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 font-mono text-2xl tracking-widest text-center">
                    {createdMeeting.id}
                  </div>
                  <button 
                    onClick={(e) => handleCopyId(createdMeeting.id, e)}
                    className={`p-3 rounded-lg transition-all border ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                    title="Copy ID"
                  >
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={(e) => handleShareMeeting(createdMeeting, e)}
                    className={`p-3 rounded-lg transition-all border ${sharedId === createdMeeting.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                    title="Share Meeting"
                  >
                     <Share2 className="w-6 h-6" />
                  </button>
                </div>
                {copied && <p className="text-green-500 text-xs mt-2 text-right">Copied to clipboard!</p>}
                {sharedId === createdMeeting.id && <p className="text-indigo-400 text-xs mt-2 text-right">Details & Link copied!</p>}
              </div>
            </div>

            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3">
              <button 
                onClick={() => handleCloseCreatedModal(false)}
                className="flex-1 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => handleCloseCreatedModal(true)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN MEETING MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Join Meeting</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meeting ID</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Enter ID (e.g. A1B2C)" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    maxLength={5}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowJoinModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" disabled={!joinId.trim()} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MEETING MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Schedule Meeting</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Topic</label>
                <input 
                  type="text" 
                  placeholder="e.g. Q4 Strategy Review" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none color-scheme-dark"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none color-scheme-dark"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEETING MODAL */}
      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-semibold">Edit Meeting</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Topic</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none color-scheme-dark"
                      value={editForm.date}
                      onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-600 outline-none color-scheme-dark"
                    value={editForm.time}
                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ZoomClone</span>
        </div>

        <div className="px-4 py-2">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center gap-3 mb-6">
            <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-600" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button 
            onClick={() => setActiveTab('meetings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'meetings' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <Calendar className="w-5 h-5" />
            Meetings
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Users className="w-5 h-5" />
              Manage Users
            </button>
          )}

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-auto bg-slate-950 p-8">
        {activeTab === 'meetings' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
                <p className="text-slate-400">Manage your upcoming video conferences</p>
              </div>
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Schedule Meeting
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Quick Action Cards */}
              <div 
                className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white shadow-xl shadow-orange-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform" 
                onClick={handleInstantMeeting}
              >
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-1">New Meeting</h3>
                <p className="text-white/70 text-sm">Start an instant meeting</p>
              </div>
              
              <div 
                className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform"
                onClick={() => setShowJoinModal(true)}
              >
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-1">Join Meeting</h3>
                <p className="text-white/70 text-sm">Join via ID or link</p>
              </div>

              <div 
                className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-500/10 cursor-pointer transform hover:scale-[1.02] transition-transform"
                onClick={() => setShowScheduleModal(true)}
              >
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-1">Schedule</h3>
                <p className="text-white/70 text-sm">Plan for later</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Upcoming Meetings</h2>
                <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full font-medium">{meetings.length} Total</span>
              </div>
              
              <div className="divide-y divide-slate-800">
                {meetings.map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  const isHost = meeting.host === user.name;
                  const canManage = isAdmin || isHost;

                  return (
                    <div key={meeting.id} className="p-6 hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative">
                           {/* Visual date block */}
                           <div className={`absolute top-0 w-full h-1.5 ${status === 'waiting' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                           <span className="text-xs text-slate-400 font-bold uppercase mt-1">
                              {formatDateDisplay(meeting.date).split(' ')[0]}
                           </span>
                           <span className="text-lg font-bold text-white leading-none">
                              {getDateDay(meeting.date)}
                           </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{meeting.title}</h3>
                             {status === 'waiting' && (
                               <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20 font-medium flex items-center gap-1">
                                 <Hourglass className="w-3 h-3" /> Waiting
                               </span>
                             )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {meeting.time}</span>
                            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Host: {meeting.host}</span>
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-1">ID: {meeting.id}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => onJoinMeeting(meeting.id)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${status === 'waiting' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-800 hover:bg-blue-600 text-white border-slate-700 hover:border-blue-500'}`}
                        >
                          Join
                        </button>
                        
                        <button 
                          onClick={(e) => handleCopyId(meeting.id, e)}
                          className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy ID"
                        >
                           <Copy className="w-5 h-5" />
                        </button>

                        <button 
                          onClick={(e) => handleShareMeeting(meeting, e)}
                          className={`p-2 rounded-lg transition-colors ${sharedId === meeting.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}
                          title="Share Meeting"
                        >
                           <Share2 className="w-5 h-5" />
                        </button>

                        {canManage && (
                          <>
                            <button 
                              onClick={(e) => handleEditClick(meeting, e)}
                              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit Meeting"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteClick(meeting, e)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete Meeting"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {meetings.length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No upcoming meetings found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="max-w-4xl mx-auto">
             <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">User Management</h1>
                <p className="text-slate-400">Manage team members and roles</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                Add User
              </button>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
               <div className="grid grid-cols-4 p-4 border-b border-slate-800 bg-slate-800/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                 <div className="col-span-2">User</div>
                 <div>Role</div>
                 <div className="text-right">Status</div>
               </div>
               {allUsers.map((u, i) => (
                 <div key={u.id} className="grid grid-cols-4 p-4 border-b border-slate-800 items-center hover:bg-slate-800/30 transition-colors">
                   <div className="col-span-2 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                        {u.avatar.includes('http') ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                     </div>
                     <div>
                       <p className="text-sm font-medium text-white">{u.name}</p>
                       <p className="text-xs text-slate-500">{u.email}</p>
                     </div>
                   </div>
                   <div>
                     <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-700 text-slate-300'}`}>
                       {u.role}
                     </span>
                   </div>
                   <div className="text-right">
                     {u.status === 'active' ? (
                       <div className="flex items-center justify-end gap-2">
                           <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Active
                           </span>
                           <button 
                                onClick={() => handleCopyResetLink(u)}
                                className={`p-1.5 rounded-lg transition-all border border-transparent ${inviteCopiedId === u.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:bg-slate-700 hover:text-orange-400 hover:border-slate-600'}`}
                                title="Reset Password Link"
                           >
                                {inviteCopiedId === u.id ? <Check className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                           </button>
                       </div>
                     ) : (
                       <button 
                         onClick={() => handleCopyInviteLink(u)}
                         className={`text-xs flex items-center justify-end gap-1 ml-auto px-3 py-1.5 rounded-lg transition-all ${inviteCopiedId === u.id ? 'bg-green-600 text-white' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
                       >
                          {inviteCopiedId === u.id ? (
                            <>Copied! <Check className="w-3 h-3" /></>
                          ) : (
                            <>Pending <LinkIcon className="w-3 h-3" /></>
                          )}
                       </button>
                     )}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;