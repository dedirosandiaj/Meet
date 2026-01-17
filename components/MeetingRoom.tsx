
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
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
        <div className="relative z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-4 border border-blue-500/20 uppercase tracking-widest">Upcoming Meeting</span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{meeting.title}</h1>
            <div className="flex items-center justify-center gap-6 text-slate-400 text-sm mb-8">
                <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-500" /><span>{meeting.date}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-slate-500" /><span>{meeting.time}</span></div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-12">
                {[ {l:'Days',v:timeLeft.days}, {l:'Hrs',v:timeLeft.hours}, {l:'Min',v:timeLeft.minutes}, {l:'Sec',v:timeLeft.seconds} ].map((item, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col items-center shadow-xl">
                        <span className="text-2xl md:text-5xl font-mono font-bold text-white tabular-nums">{String(item.v).padStart(2, '0')}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{item.l}</span>
                    </div>
                ))}
            </div>
            <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>
        </div>
    </div>
  );
};

const WaitingRoomView = ({ meeting, onLeave }: { meeting: Meeting, onLeave: () => void }) => {
    const [refreshing, setRefreshing] = useState(false);
    return (
        <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
             <div className="relative z-10 max-w-lg bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
                 <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-900"><Lock className="w-8 h-8 text-blue-400" /></div>
                 <h1 className="text-2xl font-bold text-white mb-2">Please wait, the host will let you in soon.</h1>
                 <p className="text-slate-400 text-sm mb-8">{meeting.title}</p>
                 <div className="space-y-3">
                     <button onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                         {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refreshing status...
                     </button>
                     <button onClick={onLeave} className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors">Leave</button>
                 </div>
             </div>
        </div>
    );
};

interface ZoomableViewProps { children: React.ReactNode; onTogglePin: () => void; isPinned: boolean; onToggleFit: () => void; isFit: boolean; }
const ZoomableView: React.FC<ZoomableViewProps> = ({ children, onTogglePin, isPinned, onToggleFit, isFit }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const handleZoom = (d: number) => setScale(p => Math.min(Math.max(1, p + d), 6));
  const handleReset = () => { setScale(1); setPosition({x:0,y:0}); };
  const onMouseDown = (e: any) => { if(scale===1) return; setIsDragging(true); const cX = e.touches ? e.touches[0].clientX : e.clientX; const cY = e.touches ? e.touches[0].clientY : e.clientY; dragStartRef.current = { x: cX - position.x, y: cY - position.y }; };
  const onMouseMove = (e: any) => { if(!isDragging) return; const cX = e.touches ? e.touches[0].clientX : e.clientX; const cY = e.touches ? e.touches[0].clientY : e.clientY; setPosition({ x: cX - dragStartRef.current.x, y: cY - dragStartRef.current.y }); };
  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 group" onWheel={(e)=>{if(e.deltaY<0) handleZoom(0.1); else handleZoom(-0.1);}} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={()=>setIsDragging(false)} onMouseLeave={()=>setIsDragging(false)} onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={()=>setIsDragging(false)}>
      <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: isDragging ? 'none' : 'transform 0.1s ease-out', cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }} className="w-full h-full flex items-center justify-center">{children}</div>
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`p-2 backdrop-blur text-white rounded-lg shadow-lg border border-slate-700 ${isPinned ? 'bg-blue-600' : 'bg-slate-800/80'}`}>{isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}</button>
            <button onClick={(e) => { e.stopPropagation(); onToggleFit(); }} className="p-2 bg-slate-800/80 backdrop-blur text-white rounded-lg shadow-lg border border-slate-700"><Scaling className="w-4 h-4" /></button>
            <div className="h-px bg-slate-700"></div>
            <button onClick={(e) => { e.stopPropagation(); handleZoom(0.5); }} className="p-2 bg-slate-800/80 text-white rounded-lg"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); handleReset(); }} className="p-2 bg-slate-800/80 text-white rounded-lg"><RefreshCcw className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

const LocalVideoPlayer = ({ stream, isMuted, isVideoOff, isScreenSharing, user, onPin, isPinned }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFit, setIsFit] = useState(isScreenSharing);
  useEffect(() => { if (videoRef.current && stream) { videoRef.current.srcObject = stream; videoRef.current.muted = true; } }, [stream]);
  return (
    <div className={`relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border shadow-2xl transition-all duration-300 ${isPinned ? 'border-blue-500' : 'border-slate-800'}`}>
        <ZoomableView onTogglePin={onPin} isPinned={isPinned} onToggleFit={() => setIsFit(!isFit)} isFit={isFit}>
          <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full ${!isScreenSharing ? 'scale-x-[-1]' : ''} ${isVideoOff && !isScreenSharing ? 'hidden' : 'block'} ${isFit ? 'object-contain' : 'object-cover'}`} />
        </ZoomableView>
        {isVideoOff && !isScreenSharing && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white">{user.name.charAt(0)}</div></div>}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs font-medium z-10 flex items-center gap-2"><span>{user.name} (You)</span>{isMuted && <MicOff className="w-3 h-3 text-red-500" />}</div>
    </div>
  );
};

const RemoteVideoPlayer = ({ stream, participant, isScreenSharing, onPin, isPinned }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFit, setIsFit] = useState(isScreenSharing);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  return (
     <div className={`relative w-full h-full rounded-2xl overflow-hidden border transition-all duration-300 ${isPinned ? 'border-blue-500' : 'border-slate-800'}`}>
       {stream ? (
          <ZoomableView onTogglePin={onPin} isPinned={isPinned} onToggleFit={() => setIsFit(!isFit)} isFit={isFit}><video ref={videoRef} autoPlay playsInline className={`w-full h-full bg-slate-900 ${isFit ? 'object-contain' : 'object-cover'}`} /></ZoomableView>
       ) : <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 text-xs">Connecting...</div>}
       <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs font-medium z-10"><span>{participant.name}</span></div>
     </div>
  );
};

const MeetingRoom: React.FC<MeetingRoomProps> = ({ user, meetingId, onEndCall }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(true);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
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

  // Helper function to update lists from raw participants data
  const updateParticipantLists = (participants: Participant[]) => {
      const me = participants.find(p => p.user_id === user.id);
      if (me) setIsAdmitted(me.status === 'admitted');
      
      const admitted = participants.filter(p => p.status === 'admitted' && p.user_id !== user.id);
      const waiting = participants.filter(p => p.status === 'waiting');
      
      setActiveParticipants(admitted);
      setWaitingParticipants(waiting);
  };

  // LOGIKA UTAMA: Gabungan Join, Subscribe & Polling Fallback
  useEffect(() => {
    const startup = async () => {
      const meetings = await storageService.getMeetings();
      const found = meetings.find(m => m.id === meetingId);
      if (!found) { setLoading(false); return; }
      setMeeting(found);

      // Register ke DB
      const status = await storageService.joinMeetingRoom(meetingId, user);
      setIsAdmitted(status === 'admitted');

      // Countdown setup
      const tDate = parseMeetingDateTime(found.date, found.time);
      setTargetDate(tDate);
      const shouldWait = found.status !== 'live' && tDate > new Date();
      setIsWaiting(shouldWait);

      // 1. Realtime Subscription
      const channel = storageService.subscribeToMeeting(meetingId, 
        (participants) => updateParticipantLists(participants),
        (signal) => handleSignal(signal)
      );
      channelRef.current = channel;

      // 2. Polling Fallback (Backup jika Realtime gagal)
      const pollingInterval = setInterval(async () => {
          const pts = await storageService.getParticipants(meetingId);
          updateParticipantLists(pts);
      }, 3000);

      if (!shouldWait) startWebcam();
      setLoading(false);
      
      return () => clearInterval(pollingInterval);
    };
    
    startup();
    return () => performCleanup();
  }, [meetingId]);

  // Signal Ready saat Admitted
  useEffect(() => {
      if (isAdmitted && channelRef.current && !isWaiting && webcamStream) {
          setTimeout(() => storageService.sendSignal(channelRef.current, { type: 'ready', from: user.id }), 1000);
      }
  }, [isAdmitted, isWaiting, webcamStream]);

  const handleManualSync = async () => {
      setSyncing(true);
      const pts = await storageService.getParticipants(meetingId);
      updateParticipantLists(pts);
      setTimeout(() => setSyncing(false), 800);
  };

  const handleAdmit = async (participantId: string) => {
      // Optimistic update for UI feel
      setWaitingParticipants(prev => prev.filter(p => p.user_id !== participantId));
      await storageService.admitParticipant(meetingId, participantId);
      // Actual refresh will be handled by polling or realtime
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      webcamStreamRef.current = stream; setWebcamStream(stream);
    } catch (err) { console.error("Camera access denied"); }
  };

  const createPeerConnection = (targetUserId: string) => {
    if (peerConnections.current.has(targetUserId)) return peerConnections.current.get(targetUserId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => pc.addTrack(t, webcamStreamRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate) storageService.sendSignal(channelRef.current, { type: 'candidate', candidate: e.candidate, from: user.id, to: targetUserId }); };
    pc.ontrack = (e) => setRemoteStreams(prev => new Map(prev).set(targetUserId, e.streams[0]));
    peerConnections.current.set(targetUserId, pc);
    return pc;
  };

  const handleSignal = async (signal: any) => {
    if (signal.from === user.id) return;
    if (signal.type === 'chat') { setChatMessages(p => [...p, { id: Date.now().toString(), sender: signal.senderName, text: signal.text, time: formatTime(), isSelf: false }]); return; }
    if (signal.to && signal.to !== user.id) return;
    if (!isAdmitted) return;
    try {
        const { type, from, candidate, sdp } = signal;
        if (type === 'ready') { const pc = createPeerConnection(from)!; const offer = await pc.createOffer(); await pc.setLocalDescription(offer); storageService.sendSignal(channelRef.current, { type: 'offer', sdp: offer, from: user.id, to: from }); }
        else if (type === 'offer') { const pc = createPeerConnection(from)!; await pc.setRemoteDescription(new RTCSessionDescription(sdp)); const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); storageService.sendSignal(channelRef.current, { type: 'answer', sdp: ans, from: user.id, to: from }); }
        else if (type === 'answer') { const pc = peerConnections.current.get(from); if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp)); }
        else if (type === 'candidate') { const pc = peerConnections.current.get(from); if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
    } catch (e) {}
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault(); if (!newMessage.trim()) return;
    setChatMessages(p => [...p, { id: Date.now().toString(), sender: user.name, text: newMessage, time: formatTime(), isSelf: true }]);
    storageService.sendSignal(channelRef.current, { type: 'chat', text: newMessage, senderName: user.name, from: user.id });
    setNewMessage('');
  };

  const performCleanup = () => {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    channelRef.current?.unsubscribe();
    storageService.leaveMeetingRoom(meetingId, user.id);
  };

  if (loading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin mb-4"></div><p>Joining Room...</p></div>;
  if (isWaiting && meeting && targetDate) return <CountdownView targetDate={targetDate} meeting={meeting} onBack={onEndCall} onComplete={() => { setIsWaiting(false); startWebcam(); }} />;
  if (!isAdmitted && meeting) return <WaitingRoomView meeting={meeting} onLeave={onEndCall} />;

  // Precise Host Detection
  const isHost = meeting?.host.trim().toLowerCase() === user.name.trim().toLowerCase() || user.role === UserRole.ADMIN;

  return (
    <div className="flex h-[100dvh] w-full bg-slate-950 overflow-hidden relative">
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-lg">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center"><Video className="w-4 h-4 text-blue-500" /></div>
              <div><h1 className="font-bold text-white text-sm">{meeting?.title}</h1><p className="text-[10px] text-slate-400">ID: {meetingId}</p></div>
           </div>
        </div>

        <div className="flex-1 p-4 pt-20 pb-24 overflow-hidden relative">
           <div className={`grid gap-4 h-full content-center transition-all ${activeParticipants.length === 0 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
               <LocalVideoPlayer stream={webcamStream} isMuted={isMuted} isVideoOff={isVideoOff} user={user} onPin={()=>setPinnedUserId('local')} isPinned={pinnedUserId==='local'} />
               {activeParticipants.map(p => <RemoteVideoPlayer key={p.user_id} stream={remoteStreams.get(p.user_id)} participant={p} onPin={()=>setPinnedUserId(p.user_id)} isPinned={pinnedUserId===p.user_id} />)}
           </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex items-center gap-2 p-2">
            <button onClick={() => { if(webcamStreamRef.current){ webcamStreamRef.current.getAudioTracks().forEach(t=>t.enabled=!t.enabled); setIsMuted(!isMuted); } }} className={`p-3.5 rounded-xl ${isMuted ? 'bg-red-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Mic className="w-5 h-5 text-white" /></button>
            <button onClick={() => { if(webcamStreamRef.current){ webcamStreamRef.current.getVideoTracks().forEach(t=>t.enabled=!t.enabled); setIsVideoOff(!isVideoOff); } }} className={`p-3.5 rounded-xl ${isVideoOff ? 'bg-red-500' : 'bg-slate-800 hover:bg-slate-700'}`}><Video className="w-5 h-5 text-white" /></button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button onClick={() => setShowSidebar(showSidebar === 'participants' ? null : 'participants')} className={`p-3.5 rounded-xl relative ${showSidebar === 'participants' ? 'bg-blue-600' : 'bg-slate-800'}`}><Users className="w-5 h-5 text-white" />{(isHost && waitingParticipants.length > 0) && <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 font-bold">{waitingParticipants.length}</span>}</button>
            <button onClick={() => setShowSidebar(showSidebar === 'chat' ? null : 'chat')} className={`p-3.5 rounded-xl ${showSidebar === 'chat' ? 'bg-blue-600' : 'bg-slate-800'}`}><MessageSquare className="w-5 h-5 text-white" /></button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button onClick={onEndCall} className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center gap-2"><PhoneOff className="w-5 h-5" /><span>{isHost?'End':'Leave'}</span></button>
        </div>
      </div>

      {showSidebar && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-[slideLeft_0.2s_ease-out]">
           <div className="p-4 border-b border-slate-800 flex items-center justify-between">
             <h2 className="font-semibold text-white">{showSidebar === 'chat' ? 'Chat' : 'Participants'}</h2>
             <button onClick={() => setShowSidebar(null)}><X className="w-5 h-5 text-slate-400" /></button>
           </div>
           
           {showSidebar === 'chat' && (
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-500 mb-1">{msg.sender} • {msg.time}</span>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${msg.isSelf ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>{msg.text}</div>
                    </div>
                  ))}
               </div>
               <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2"><input type="text" placeholder="Type..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm outline-none" value={newMessage} onChange={e=>setNewMessage(e.target.value)} /><button type="submit" className="p-2 bg-blue-600 text-white rounded-lg"><Send className="w-4 h-4" /></button></form>
             </>
           )}
           
           {showSidebar === 'participants' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                 <button onClick={handleManualSync} disabled={syncing} className="w-full mb-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-colors">
                     {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync Participants
                 </button>

                 {isHost && waitingParticipants.length > 0 && (
                     <div className="mb-4 bg-blue-900/20 rounded-xl border border-blue-500/30 overflow-hidden">
                         <div className="px-3 py-2 bg-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">Waiting Room ({waitingParticipants.length})</div>
                         {waitingParticipants.map(p => (
                             <div key={p.user_id} className="p-3 border-b border-blue-500/10 flex items-center justify-between">
                                 <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{p.name.charAt(0)}</div><span className="text-sm text-white truncate max-w-[100px] font-medium">{p.name}</span></div>
                                 <button onClick={() => handleAdmit(p.user_id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors">Admit</button>
                             </div>
                         ))}
                     </div>
                 )}
                 <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Meeting</div>
                 <div className="p-3 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">{user.name.charAt(0)}</div>
                    <div className="flex-1"><p className="text-sm font-medium text-white truncate">{user.name} (You)</p><p className="text-[10px] text-blue-400">Host</p></div>
                 </div>
                 {activeParticipants.map(p => (
                    <div key={p.user_id} className="p-3 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{p.name.charAt(0)}</div>
                       <div className="flex-1"><p className="text-sm font-medium text-white truncate">{p.name}</p><p className="text-[10px] text-slate-500">Participant</p></div>
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
