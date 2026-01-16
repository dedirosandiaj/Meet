import React, { useEffect, useRef, useState } from 'react';
import { User, ChatMessage, Meeting, Participant } from '../types';
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
  Clock,
  ArrowLeft,
  Hourglass,
  Calendar,
  MonitorUp,
  PhoneOff
} from 'lucide-react';

interface MeetingRoomProps {
  user: User;
  meetingId: string;
  onEndCall: () => void;
}

// Google STUN Servers (Free)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

// --- HELPER COMPONENT: LOCAL VIDEO ---
const LocalVideoPlayer = ({ stream, isMuted, isVideoOff, isScreenSharing, user }: { stream: MediaStream | null, isMuted: boolean, isVideoOff: boolean, isScreenSharing: boolean, user: User }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Always mute local
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group ring-2 ring-blue-500/50">
        <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transition-transform duration-300 ${!isScreenSharing ? 'transform scale-x-[-1]' : ''} ${isVideoOff && !isScreenSharing ? 'hidden' : 'block'}`} 
        />
        
        {isVideoOff && !isScreenSharing && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                    {user.name.charAt(0)}
                </div>
            </div>
        )}

        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 z-10">
            {user.name} (You)
            {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
            {isScreenSharing && <MonitorUp className="w-3 h-3 text-green-400" />}
        </div>
    </div>
  );
};

// --- HELPER COMPONENT: REMOTE VIDEO ---
const RemoteVideoPlayer = ({ stream, participant }: { stream: MediaStream | undefined, participant: Participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
     <div className="relative w-full h-full">
       {stream ? (
          <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
              // Do NOT mute remote videos
          />
       ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-600 border-t-blue-500 animate-spin"></div>
                  <span className="text-xs text-slate-500">Connecting...</span>
              </div>
          </div>
       )}
       <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium z-10">
          {participant.name}
       </div>
     </div>
  );
};

const MeetingRoom: React.FC<MeetingRoomProps> = ({ user, meetingId, onEndCall }) => {
  // Meeting Data
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [loading, setLoading] = useState(true);

  // Streams & WebRTC
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  // Refs for cleanup (closure safe)
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  const [activeParticipants, setActiveParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  
  // UI States
  const [showSidebar, setShowSidebar] = useState<'chat' | 'participants' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [newMessage, setNewMessage] = useState('');

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const initMeeting = async () => {
      const meetings = await storageService.getMeetings();
      const found = meetings.find(m => m.id === meetingId);
      
      if (found) {
        setMeeting(found);
        
        let shouldWait = false;
        if (found.status !== 'live') {
           if (found.date !== 'Today' && found.date !== 'Tomorrow') {
             const parsed = new Date(found.date);
             if (!isNaN(parsed.getTime()) && parsed > new Date()) shouldWait = true;
           }
        }
        setIsWaiting(shouldWait);
        
        if (!shouldWait) {
          startWebcam();
        }
      } else {
        setLoading(false);
      }
    };

    initMeeting();

    return () => {
      handleCleanup();
    };
  }, [meetingId]);

  // --- 2. WEBRTC SETUP ---
  useEffect(() => {
    if (isWaiting || !webcamStream) return;

    const setupRealtime = async () => {
      await storageService.joinMeetingRoom(meetingId, user);

      const channel = storageService.subscribeToMeeting(
        meetingId,
        (participants) => {
          const others = participants.filter(p => p.user_id !== user.id);
          setActiveParticipants(others);
          
          const currentIds = others.map(p => p.user_id);
          peerConnections.current.forEach((_, id) => {
            if (!currentIds.includes(id)) {
              closePeerConnection(id);
            }
          });
        },
        (signal) => handleSignal(signal)
      );
      
      channelRef.current = channel;
      setLoading(false);

      setTimeout(() => {
        storageService.sendSignal(channel, { type: 'ready', from: user.id });
      }, 1000);
    };

    setupRealtime();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [isWaiting, webcamStream]); 

  // --- WEBRTC CORE ---
  const createPeerConnection = (targetUserId: string) => {
    if (peerConnections.current.has(targetUserId)) {
        return peerConnections.current.get(targetUserId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Use REF here to ensure we get current stream tracks
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, webcamStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        storageService.sendSignal(channelRef.current, {
          type: 'candidate',
          candidate: event.candidate,
          from: user.id,
          to: targetUserId
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev).set(targetUserId, remoteStream));
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  };

  const closePeerConnection = (targetUserId: string) => {
    const pc = peerConnections.current.get(targetUserId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetUserId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(targetUserId);
      return newMap;
    });
  };

  const handleSignal = async (signal: any) => {
    if (signal.from === user.id) return; 
    if (signal.to && signal.to !== user.id) return;

    const { type, from, candidate, sdp } = signal;
    const channel = channelRef.current;
    if (!channel) return;

    try {
        switch (type) {
        case 'ready':
            {
            const pc = createPeerConnection(from)!;
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            storageService.sendSignal(channel, { type: 'offer', sdp: offer, from: user.id, to: from });
            }
            break;
        case 'offer':
            {
            const pc = createPeerConnection(from)!;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            storageService.sendSignal(channel, { type: 'answer', sdp: answer, from: user.id, to: from });
            }
            break;
        case 'answer':
            {
            const pc = peerConnections.current.get(from);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            }
            break;
        case 'candidate':
            {
            const pc = peerConnections.current.get(from);
            if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            break;
        }
    } catch (err) {
        console.error("Signaling Error:", err);
    }
  };

  // --- MEDIA ---
  const startWebcam = async () => {
    try {
      if (webcamStreamRef.current) {
         webcamStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      
      webcamStreamRef.current = stream; // Update ref for cleanup
      setWebcamStream(stream); // Update state for UI
      setPermissionError(false);
      setLoading(false);
    } catch (err) {
      console.error("Error accessing media:", err);
      setPermissionError(true);
      setLoading(false);
    }
  };

  const toggleMute = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
       // Stop Share
       screenStreamRef.current?.getTracks().forEach(t => t.stop());
       screenStreamRef.current = null;
       setIsScreenSharing(false);
       // Re-enable webcam tracks in peer connections? 
       // For simplicity in this mock, we just switch local view back to webcam
    } else {
       try {
         const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
         screenStreamRef.current = stream;
         setIsScreenSharing(true);
         // Note: Real implementation would replace tracks in RTCPeerConnection here
         stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            screenStreamRef.current = null;
         };
       } catch (e) { console.error(e); }
    }
  };

  const handleCleanup = async () => {
    // Use refs to ensure we clean up what is currently active
    webcamStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    channelRef.current?.unsubscribe();

    // Perform DB cleanup
    try {
      await storageService.leaveMeetingRoom(meetingId, user.id);
    } catch (e) { console.error("Error leaving room:", e); }
  };

  const handleLeave = async () => {
    // 1. Stop media immediately for visual feedback
    webcamStreamRef.current?.getTracks().forEach(track => track.stop());
    
    // 2. Trigger UI change immediately
    onEndCall();
    
    // 3. Cleanup DB in background (best effort)
    await handleCleanup();
  };

  // --- RENDER ---
  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono text-sm">Joining Room...</p>
    </div>
  );

  if (isWaiting) {
     return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Waiting for Host</h1>
        <p className="text-slate-400 mb-6">The meeting has not started yet.</p>
        <button onClick={onEndCall} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">Return to Dashboard</button>
      </div>
     )
  }

  // Determine which stream to show locally
  const localStreamDisplay = isScreenSharing ? screenStreamRef.current : webcamStream;

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md p-2 md:p-3 rounded-xl border border-slate-800 pointer-events-auto shadow-lg max-w-[60%]">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center"><Video className="w-4 h-4 text-blue-500" /></div>
                <div className="overflow-hidden">
                  <h1 className="font-bold text-white text-sm truncate">{meeting?.title || 'Meeting Room'}</h1>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{formatTime()} • ID: {meetingId}</p>
                </div>
             </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-auto">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-300"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>REC</div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 pt-24 pb-28 md:pb-24 overflow-y-auto custom-scrollbar">
           {permissionError && (
             <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/90 backdrop-blur-sm">
                <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><VideoOff className="w-8 h-8" /></div>
                  <h3 className="text-white text-xl font-bold">Camera Blocked</h3>
                  <p className="text-slate-400 mt-2 text-sm mb-4">Please allow camera access.</p>
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg w-full">Try Again</button>
                </div>
             </div>
           )}

           <div className={`grid gap-4 h-full content-center transition-all duration-300 ${
              activeParticipants.length === 0 ? 'grid-cols-1 max-w-4xl mx-auto' : 
              activeParticipants.length === 1 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
           }`}>
              
              {/* Local User */}
              <LocalVideoPlayer 
                 stream={localStreamDisplay}
                 isMuted={isMuted}
                 isVideoOff={isVideoOff}
                 isScreenSharing={isScreenSharing}
                 user={user}
              />

              {/* Remote Participants */}
              {activeParticipants.map((p) => (
                 <div key={p.user_id} className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
                    <RemoteVideoPlayer 
                        stream={remoteStreams.get(p.user_id)} 
                        participant={p}
                    />
                 </div>
              ))}
           </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-[95%] max-w-fit">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 md:px-6 md:py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 md:gap-4 transition-all">
             
             <button onClick={toggleMute} className={`p-3.5 rounded-xl transition-all duration-200 ${isMuted ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
             </button>
             
             <button onClick={toggleVideo} className={`p-3.5 rounded-xl transition-all duration-200 ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
             </button>

             <button onClick={toggleScreenShare} className={`p-3.5 rounded-xl transition-all duration-200 hidden sm:block ${isScreenSharing ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                <MonitorUp className="w-5 h-5" />
             </button>

             <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block"></div>

             <button onClick={() => setShowSidebar(showSidebar === 'participants' ? null : 'participants')} className={`p-3.5 rounded-xl transition-all relative ${showSidebar === 'participants' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                <Users className="w-5 h-5" />
                {activeParticipants.length > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 font-bold">{activeParticipants.length + 1}</span>}
             </button>

             <button onClick={() => setShowSidebar(showSidebar === 'chat' ? null : 'chat')} className={`p-3.5 rounded-xl transition-all ${showSidebar === 'chat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                <MessageSquare className="w-5 h-5" />
             </button>

             <div className="w-px h-8 bg-slate-700 mx-1"></div>

             <button onClick={handleLeave} className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center gap-2">
                <PhoneOff className="w-5 h-5" />
                <span className="hidden md:inline">End Call</span>
             </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-y-0 right-0 z-30 w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full animate-[slideLeft_0.2s_ease-out] shadow-2xl">
           <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
             <h2 className="font-semibold text-white">{showSidebar === 'chat' ? 'In-Call Messages' : 'Participants'}</h2>
             <button onClick={() => setShowSidebar(null)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
           </div>
           
           {showSidebar === 'chat' && (
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900 custom-scrollbar">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400">{msg.sender}</span>
                            <span className="text-[10px] text-slate-600">{msg.time}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${msg.isSelf ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                  ))}
               </div>
               <form onSubmit={(e) => { e.preventDefault(); if(!newMessage.trim()) return; setChatMessages([...chatMessages, {id: Date.now().toString(), sender: user.name, text: newMessage, time: formatTime(), isSelf: true}]); setNewMessage(''); }} className="p-4 border-t border-slate-800 bg-slate-900 pb-8 md:pb-4">
                  <div className="relative">
                    <input type="text" placeholder="Type a message..." className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                    <button type="submit" className="absolute right-2 top-2 p-1 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Send className="w-5 h-5" /></button>
                  </div>
               </form>
             </>
           )}
           
           {showSidebar === 'participants' && (
              <div className="flex-1 overflow-y-auto bg-slate-900 custom-scrollbar">
                 <div className="p-2 space-y-1">
                    <div className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition-colors">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-600/20">{user.name.charAt(0)}</div>
                       <div className="flex-1"><p className="text-sm font-medium text-white">{user.name} <span className="text-slate-500">(You)</span></p><p className="text-xs text-blue-400">Host</p></div>
                       <div className="flex gap-2">
                           {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-slate-500" />}
                           {isVideoOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-slate-500" />}
                       </div>
                    </div>
                    {activeParticipants.map((p) => (
                       <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-xl transition-colors">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white font-bold">{p.name.charAt(0)}</div>
                          <div className="flex-1"><p className="text-sm font-medium text-white">{p.name}</p><p className="text-xs text-slate-500">Participant</p></div>
                          <div className="flex gap-2 text-slate-400">
                             {remoteStreams.has(p.user_id) ? <Video className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-white animate-spin"></div>}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;