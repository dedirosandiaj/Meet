
import React, { useEffect, useRef, useState } from 'react';
import { User, ChatMessage, Meeting, Participant, UserRole } from '../types';
import { MOCK_CHAT, formatTime } from '../services/mock';
import { storageService } from '../services/storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  Users, 
  Send,
  X,
  MonitorUp,
  PhoneOff,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Scaling,
  Pin,
  PinOff,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Home,
  UserCheck,
  Lock,
  RefreshCw
} from 'lucide-react';

interface MeetingRoomProps {
  user: User;
  meetingId: string;
  onEndCall: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

const parseMeetingDateTime = (dateStr: string, timeStr: string): Date => {
  const now = new Date();
  let targetDate = new Date();
  if (dateStr === 'Today') {} 
  else if (dateStr === 'Tomorrow') { targetDate.setDate(now.getDate() + 1); } 
  else {
    const parsed = new Date(dateStr + ` ${now.getFullYear()}`);
    if (!isNaN(parsed.getTime())) targetDate = parsed;
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (!isNaN(hours) && !isNaN(minutes)) targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
};

const CountdownView = ({ targetDate, meeting, onBack, onComplete }: { targetDate: Date, meeting: Meeting, onBack: () => void, onComplete: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) { onComplete(); return; }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (!timeLeft) return <div className="h-full w-full flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-4 border border-blue-500/20 uppercase tracking-widest">Upcoming Meeting</span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{meeting.title}</h1>
            <div className="grid grid-cols-4 gap-4 mb-12">
                {[ {l:'Days',v:timeLeft.days}, {l:'Hrs',v:timeLeft.hours}, {l:'Min',v:timeLeft.minutes}, {l:'Sec',v:timeLeft.seconds} ].map((item, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-2xl font-mono font-bold text-white">{String(item.v).padStart(2, '0')}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{item.l}</span>
                    </div>
                ))}
            </div>
            <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl transition-all border border-slate-700">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
        </div>
    </div>
  );
};

const WaitingRoomView = ({ meeting, onLeave }: { meeting: Meeting, onLeave: () => void }) => {
    return (
        <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
             <div className="relative z-10 max-w-lg bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
                 <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-900"><Lock className="w-8 h-8 text-blue-400" /></div>
                 <h1 className="text-2xl font-bold text-white mb-2">Please wait, the host will let you in soon.</h1>
                 <p className="text-slate-400 text-sm mb-8">{meeting.title}</p>
                 <div className="flex flex-col gap-3">
                     <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-center gap-3 text-slate-400">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                         <span className="text-xs uppercase tracking-widest font-bold">Waiting for host...</span>
                     </div>
                     <button onClick={onLeave} className="w-full py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-medium transition-colors">Leave Meeting</button>
                 </div>
             </div>
        </div>
    );
};

// --- VIDEO PLAYER COMPONENTS ---
const LocalVideoPlayer = ({ stream, isMuted, isVideoOff, user }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) { videoRef.current.srcObject = stream; videoRef.current.muted = true; } }, [stream]);
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'hidden' : 'block'}`} />
        {isVideoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white">{user.name.charAt(0)}</div></div>}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs font-medium z-10 flex items-center gap-2"><span>{user.name} (You)</span>{isMuted && <MicOff className="w-3 h-3 text-red-500" />}</div>
    </div>
  );
};

const RemoteVideoPlayer = ({ stream, participant }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  return (
     <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 transition-all">
       {stream ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 text-xs">Connecting...</div>}
       <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs font-medium z-10"><span>{participant.name}</span></div>
     </div>
  );
};

const MeetingRoom: React.FC<MeetingRoomProps> = ({ user, meetingId, onEndCall }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [activeParticipants, setActiveParticipants] = useState<Participant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSidebar, setShowSidebar] = useState<'chat' | 'participants' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [syncing, setSyncing] = useState(false);

  // STARTUP LOGIC
  useEffect(() => {
    const startup = async () => {
      const meetings = await storageService.getMeetings();
      const found = meetings.find(m => m.id === meetingId);
      if (!found) { setLoading(false); return; }
      setMeeting(found);

      // Register initial state in DB, which determines if we start in waiting room
      const initialStatus = await storageService.joinMeetingRoom(meetingId, user);
      
      // Setup countdown
      const tDate = parseMeetingDateTime(found.date, found.time);
      setTargetDate(tDate);
      const countdownActive = found.status !== 'live' && tDate > new Date();
      setIsWaiting(countdownActive);

      if (!countdownActive) {
          startWebcam(); // Start cam early if not in countdown
          if (initialStatus === 'admitted') {
            setIsAdmitted(true);
          }
      }

      // Subscribe to real-time events
      const channel = storageService.subscribeToMeeting(
        meetingId,
        user,
        (allParticipants) => {
          // This is the single source of truth for participant state
          const me = allParticipants.find(p => p.user_id === user.id);
          setIsAdmitted(me?.status === 'admitted');
          
          setActiveParticipants(allParticipants.filter(p => p.status === 'admitted' && p.user_id !== user.id));
          setWaitingParticipants(allParticipants.filter(p => p.status === 'waiting'));
        },
        (signal) => handleSignal(signal)
      );
      channelRef.current = channel;

      setLoading(false);
    };
    
    startup();
    return () => performCleanup();
  }, [meetingId]);

  // Effect to handle WebRTC signaling once admitted
  useEffect(() => {
      if (isAdmitted && !isWaiting && webcamStream) {
          // Delay to ensure other clients are subscribed
          const timer = setTimeout(() => {
             storageService.sendSignal(channelRef.current, { type: 'signal', from: user.id, payload: { type: 'ready' } });
          }, 1000);
          return () => clearTimeout(timer);
      }
  }, [isAdmitted, isWaiting, webcamStream]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      webcamStreamRef.current = stream; setWebcamStream(stream);
    } catch (err) { console.error("Media access denied"); }
  };

  const createPeerConnection = (targetUserId: string) => {
    if (peerConnections.current.has(targetUserId)) return peerConnections.current.get(targetUserId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => pc.addTrack(t, webcamStreamRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate) storageService.sendSignal(channelRef.current, { type: 'signal', from: user.id, to: targetUserId, payload: { type: 'candidate', candidate: e.candidate } }); };
    pc.ontrack = (e) => setRemoteStreams(prev => new Map(prev).set(targetUserId, e.streams[0]));
    peerConnections.current.set(targetUserId, pc);
    return pc;
  };

  const handleSignal = async (signal: any) => {
    if (signal.from === user.id) return;

    if(signal.type === 'chat') {
        setChatMessages(p => [...p, { id: Date.now().toString(), sender: signal.senderName, text: signal.payload.text, time: formatTime(), isSelf: false }]); 
        return; 
    }
    
    // All other signals (WebRTC) should only be processed if admitted
    if (!isAdmitted) return;

    try {
        const { from, to, payload } = signal;
        if (to && to !== user.id) return;
        
        const { sdp, candidate } = payload;
        
        if (payload.type === 'ready') { 
          const pc = createPeerConnection(from)!; 
          const offer = await pc.createOffer(); 
          await pc.setLocalDescription(offer); 
          storageService.sendSignal(channelRef.current, { type: 'signal', from: user.id, to: from, payload: { type: 'offer', sdp: offer } }); 
        } else if (payload.type === 'offer') { 
          const pc = createPeerConnection(from)!; 
          await pc.setRemoteDescription(new RTCSessionDescription(sdp)); 
          const ans = await pc.createAnswer(); 
          await pc.setLocalDescription(ans); 
          storageService.sendSignal(channelRef.current, { type: 'signal', from: user.id, to: from, payload: { type: 'answer', sdp: ans } }); 
        } else if (payload.type === 'answer') { 
          const pc = peerConnections.current.get(from); 
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp)); 
        } else if (payload.type === 'candidate') { 
          const pc = peerConnections.current.get(from); 
          if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
        }
    } catch (e) {
        console.error("Signal handling error:", e);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault(); if (!newMessage.trim()) return;
    const msg = { id: Date.now().toString(), sender: user.name, text: newMessage, time: formatTime(), isSelf: true };
    setChatMessages(p => [...p, msg]);
    storageService.sendSignal(channelRef.current, { type: 'chat', from: user.id, senderName: user.name, payload: { text: newMessage } });
    setNewMessage('');
  };

  const handleAdmit = async (userId: string) => {
      setSyncing(true);
      await storageService.admitParticipant(meetingId, userId);
      // Broadcast to everyone to refresh their lists
      await storageService.sendSignal(channelRef.current, { type: 'refresh-list' });
      setSyncing(false);
  };

  const performCleanup = () => {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    // Presence will automatically handle leaving when channel is unsubscribed
    if(channelRef.current) {
        channelRef.current.unsubscribe();
    }
    storageService.leaveMeetingRoom(meetingId, user.id);
  };

  if (loading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" /><p className="animate-pulse">Connecting to Room...</p></div>;
  if (isWaiting && meeting && targetDate) return <CountdownView targetDate={targetDate} meeting={meeting} onBack={onEndCall} onComplete={() => { setIsWaiting(false); startWebcam(); }} />;
  if (!isAdmitted && meeting) return <WaitingRoomView meeting={meeting} onLeave={onEndCall} />;

  const isHost = meeting?.host.trim().toLowerCase() === user.name.trim().toLowerCase();
  const canManage = isHost || user.role === UserRole.ADMIN || user.role === UserRole.MEMBER;

  return (
    <div className="flex h-[100dvh] w-full bg-slate-950 overflow-hidden relative">
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-lg">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center"><Video className="w-4 h-4 text-blue-500" /></div>
              <div><h1 className="font-bold text-white text-sm">{meeting?.title}</h1><p className="text-[10px] text-slate-400">ID: {meetingId}</p></div>
           </div>
        </div>

        <div className="flex-1 p-4 pt-20 pb-24 overflow-hidden">
           <div className={`grid gap-4 h-full content-center transition-all ${activeParticipants.length === 0 ? 'grid-cols-1 max-w-4xl mx-auto' : (activeParticipants.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3')}`}>
               <LocalVideoPlayer stream={webcamStream} isMuted={isMuted} isVideoOff={isVideoOff} user={user} />
               {activeParticipants.map(p => <RemoteVideoPlayer key={p.user_id} stream={remoteStreams.get(p.user_id)} participant={p} />)}
           </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex items-center gap-2 p-2">
            <button onClick={() => { if(webcamStreamRef.current){ webcamStreamRef.current.getAudioTracks().forEach(t=>t.enabled=!t.enabled); setIsMuted(!isMuted); } }} className={`p-3.5 rounded-xl transition-colors ${isMuted ? 'bg-red-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Mic className="w-5 h-5 text-white" /></button>
            <button onClick={() => { if(webcamStreamRef.current){ webcamStreamRef.current.getVideoTracks().forEach(t=>t.enabled=!t.enabled); setIsVideoOff(!isVideoOff); } }} className={`p-3.5 rounded-xl transition-colors ${isVideoOff ? 'bg-red-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Video className="w-5 h-5 text-white" /></button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button onClick={() => setShowSidebar(showSidebar === 'participants' ? null : 'participants')} className={`p-3.5 rounded-xl relative transition-colors ${showSidebar === 'participants' ? 'bg-blue-600' : 'bg-slate-800'}`}><Users className="w-5 h-5 text-white" />{(canManage && waitingParticipants.length > 0) && <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 font-bold">{waitingParticipants.length}</span>}</button>
            <button onClick={() => setShowSidebar(showSidebar === 'chat' ? null : 'chat')} className={`p-3.5 rounded-xl transition-colors ${showSidebar === 'chat' ? 'bg-blue-600' : 'bg-slate-800'}`}><MessageSquare className="w-5 h-5 text-white" /></button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button onClick={onEndCall} className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95"><PhoneOff className="w-5 h-5" /><span>{canManage?'End':'Leave'}</span></button>
        </div>
      </div>

      {showSidebar && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-[slideLeft_0.2s_ease-out]">
           <div className="p-4 border-b border-slate-800 flex items-center justify-between">
             <h2 className="font-semibold text-white uppercase tracking-widest text-xs">{showSidebar === 'chat' ? 'In-Call Messages' : 'Participants'}</h2>
             <button onClick={() => setShowSidebar(null)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
           </div>
           
           {showSidebar === 'chat' && (
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {chatMessages.length === 0 && <p className="text-center text-slate-500 text-sm mt-10">No messages yet.</p>}
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-500 mb-1 font-medium">{msg.sender} • {msg.time}</span>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${msg.isSelf ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                    </div>
                  ))}
               </div>
               <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2"><input type="text" placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm outline-none focus:border-blue-500 transition-colors" value={newMessage} onChange={e=>setNewMessage(e.target.value)} /><button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"><Send className="w-4 h-4" /></button></form>
             </>
           )}
           
           {showSidebar === 'participants' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                 {canManage && waitingParticipants.length > 0 && (
                     <div className="mb-4 bg-blue-900/20 rounded-xl border border-blue-500/30 overflow-hidden">
                         <div className="px-3 py-2 bg-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest flex justify-between items-center"><span>Waiting Room ({waitingParticipants.length})</span><Loader2 className={`w-3 h-3 animate-spin ${syncing ? 'opacity-100' : 'opacity-0'}`} /></div>
                         {waitingParticipants.map(p => (
                             <div key={p.user_id} className="p-3 border-b border-blue-500/10 flex items-center justify-between hover:bg-blue-500/5">
                                 <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">{p.name.charAt(0)}</div><span className="text-sm text-white truncate max-w-[100px] font-medium">{p.name}</span></div>
                                 <button onClick={() => handleAdmit(p.user_id)} disabled={syncing} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">Admit</button>
                             </div>
                         ))}
                     </div>
                 )}
                 <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Meeting</div>
                 <div className="p-3 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-600/20">{user.name.charAt(0)}</div>
                    <div className="flex-1"><p className="text-sm font-medium text-white truncate">{user.name} (You)</p><p className="text-[10px] text-blue-400 font-bold uppercase">{isHost ? 'Host' : user.role}</p></div>
                 </div>
                 {activeParticipants.map(p => (
                    <div key={p.user_id} className="p-3 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">{p.name.charAt(0)}</div>
                       <div className="flex-1"><p className="text-sm font-medium text-white truncate">{p.name}</p><p className="text-[10px] text-slate-500 uppercase font-bold">{p.role === UserRole.CLIENT ? 'Participant' : p.role}</p></div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;
