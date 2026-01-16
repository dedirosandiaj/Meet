import React, { useEffect, useRef, useState } from 'react';
import { User, ChatMessage, Meeting } from '../types';
import { MOCK_CHAT, formatTime } from '../services/mock';
import { storageService } from '../services/storage';
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
  MonitorUp
} from 'lucide-react';

interface MeetingRoomProps {
  user: User;
  meetingId: string;
  onEndCall: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ user, meetingId, onEndCall }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // Meeting Data & Status
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isWaiting, setIsWaiting] = useState(true); // Default to true until checked
  const [loading, setLoading] = useState(true);

  // Streams
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  
  // UI States
  const [showSidebar, setShowSidebar] = useState<'chat' | 'participants' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [newMessage, setNewMessage] = useState('');
  
  // Participants State
  const [activeParticipants, setActiveParticipants] = useState<User[]>([]);

  // --- LOGIC: Check Meeting Status ---
  useEffect(() => {
    const checkMeetingStatus = async () => {
      const meetings = await storageService.getMeetings();
      const found = meetings.find(m => m.id === meetingId);
      
      if (found) {
        setMeeting(found);
        
        // Instant meetings (status='live') or no date parsing needed
        if (found.status === 'live') {
           setIsWaiting(false);
           setLoading(false);
           return;
        }

        try {
          let targetDate = new Date();
          // Handle "Today"/"Tomorrow" or standard date string
          if (found.date === 'Today') {
             // targetDate is already now
          } else if (found.date === 'Tomorrow') {
            targetDate.setDate(targetDate.getDate() + 1);
          } else {
            const parsedDate = new Date(found.date);
            if (!isNaN(parsedDate.getTime())) {
              targetDate = parsedDate;
            }
          }

          const [hours, minutes] = found.time.split(':').map(Number);
          targetDate.setHours(hours || 0, minutes || 0, 0, 0);

          const now = new Date();
          const diffMinutes = (targetDate.getTime() - now.getTime()) / 1000 / 60;

          // If more than 5 minutes early, show waiting
          if (diffMinutes > 5) {
            setIsWaiting(true);
          } else {
            setIsWaiting(false);
          }
        } catch (e) {
          console.error("Date parse error", e);
          setIsWaiting(false); // Fallback to live
        }
      } else {
        // Meeting not found? 
      }
      setLoading(false);
    };

    checkMeetingStatus();
  }, [meetingId]);

  // --- CAMERA LOGIC ---
  useEffect(() => {
    // Only start camera if NOT waiting and NOT loading
    if (!isWaiting && !loading) {
      startWebcam();
    } else {
      // If waiting, ensure stream is stopped
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }
    }
  }, [isWaiting, loading]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setWebcamStream(stream);
      if (localVideoRef.current && !isScreenSharing) {
        localVideoRef.current.srcObject = stream;
      }
      setPermissionError(false);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setPermissionError(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // --- HANDLERS ---

  const toggleMute = () => {
    if (webcamStream) {
      webcamStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (webcamStream) {
      webcamStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop sharing
      stopScreenShare();
    } else {
      // Start sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = stream;
        
        // Replace video src
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Listen for browser "Stop Sharing" floating button click
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error starting screen share:", err);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Revert to webcam
    if (localVideoRef.current && webcamStream) {
      localVideoRef.current.srcObject = webcamStream;
    }

    setIsScreenSharing(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: user.name,
      text: newMessage,
      time: formatTime(),
      isSelf: true
    };
    setChatMessages([...chatMessages, msg]);
    setNewMessage('');
  };

  // --- RENDER: WAITING ROOM ---
  if (loading) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (isWaiting) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-lg">
             <Hourglass className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Waiting for Meeting to Start</h1>
          <p className="text-slate-400 mb-8">The host has not started this meeting yet.</p>

          <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800 mb-8 text-left space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic</label>
                <div className="text-lg font-semibold text-white">{meeting?.title || 'Unknown Meeting'}</div>
             </div>
             <div className="flex justify-between">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                   <div className="text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {meeting?.date}
                   </div>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time</label>
                   <div className="text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      {meeting?.time}
                   </div>
                </div>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Host</label>
                <div className="text-white flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">
                      {meeting?.host.charAt(0)}
                   </div>
                   {meeting?.host}
                </div>
             </div>
          </div>

          <button 
            onClick={onEndCall}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: MEETING ROOM ---
  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Header (Floating) */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md p-2 md:p-3 rounded-xl border border-slate-800 pointer-events-auto shadow-lg max-w-[60%] md:max-w-none">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-bold text-white text-xs md:text-sm leading-tight truncate">{meeting?.title || 'Meeting Room'}</h1>
                  <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                    {formatTime()} • ID: {meetingId}
                  </p>
                </div>
             </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-auto">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                REC
             </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 pt-24 pb-28 md:pb-24 overflow-y-auto">
           {permissionError && (
             <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/90">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <VideoOff className="w-8 h-8" />
                  </div>
                  <h3 className="text-white text-xl font-bold">Camera Access Blocked</h3>
                  <p className="text-slate-400 mt-2">Please allow camera and microphone access to join.</p>
                </div>
             </div>
           )}

           <div className={`grid gap-4 h-full content-center ${activeParticipants.length === 0 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
              
              {/* Local User */}
              <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group ring-2 ring-blue-500/50">
                 <video 
                   ref={localVideoRef}
                   autoPlay 
                   muted 
                   playsInline 
                   // Mirror effect only for webcam, not screen share
                   className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''} ${isVideoOff && !isScreenSharing ? 'hidden' : 'block'}`}
                 />
                 {isVideoOff && !isScreenSharing && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                        {user.name.charAt(0)}
                      </div>
                   </div>
                 )}
                 <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
                   {user.name} (You)
                   {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                   {isScreenSharing && <MonitorUp className="w-3 h-3 text-green-400" />}
                 </div>
              </div>

              {/* Mock Participants */}
              {activeParticipants.map((p) => (
                 <div key={p.id} className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                       {p.name}
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 w-[95%] max-w-fit">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-2 md:px-6 md:py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 md:gap-3">
             <button 
               onClick={toggleMute}
               className={`p-3 md:p-3.5 rounded-xl transition-all ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
               title={isMuted ? "Unmute" : "Mute"}
             >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
             </button>
             
             <button 
               onClick={toggleVideo}
               className={`p-3 md:p-3.5 rounded-xl transition-all ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
               title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
             >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
             </button>

             <button 
               onClick={toggleScreenShare}
               className={`p-3 md:p-3.5 rounded-xl transition-all hidden sm:block ${isScreenSharing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
               title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
             >
                <MonitorUp className="w-5 h-5" />
             </button>

             <div className="w-px h-8 bg-slate-700 mx-1 hidden sm:block"></div>

             <button 
               onClick={() => setShowSidebar(showSidebar === 'participants' ? null : 'participants')}
               className={`p-3 md:p-3.5 rounded-xl transition-all relative ${showSidebar === 'participants' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
             >
                <Users className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-slate-700 text-xs w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                  {activeParticipants.length + 1}
                </span>
             </button>

             <button 
               onClick={() => setShowSidebar(showSidebar === 'chat' ? null : 'chat')}
               className={`p-3 md:p-3.5 rounded-xl transition-all ${showSidebar === 'chat' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
             >
                <MessageSquare className="w-5 h-5" />
             </button>

             <div className="w-px h-8 bg-slate-700 mx-1"></div>

             <button 
               onClick={onEndCall}
               className="px-4 py-3 md:px-6 md:py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 whitespace-nowrap text-sm md:text-base"
             >
                End
             </button>
          </div>
        </div>
      </div>

      {/* Sidebar (Responsive Overlay) */}
      {showSidebar && (
        <div className="fixed inset-y-0 right-0 z-30 w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full animate-[slideLeft_0.2s_ease-out]">
           <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h2 className="font-semibold text-white">
                {showSidebar === 'chat' ? 'In-Call Messages' : 'Participants'}
              </h2>
              <button onClick={() => setShowSidebar(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
           </div>

           {/* Chat View */}
           {showSidebar === 'chat' && (
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
                 {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">{msg.sender}</span>
                          <span className="text-[10px] text-slate-600">{msg.time}</span>
                       </div>
                       <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${msg.isSelf ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                         {msg.text}
                       </div>
                    </div>
                 ))}
               </div>
               <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900 pb-8 md:pb-4">
                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-3 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="absolute right-2 top-2 text-blue-500 hover:text-blue-400">
                       <Send className="w-5 h-5" />
                    </button>
                 </div>
               </form>
             </>
           )}

           {/* Participants View */}
           {showSidebar === 'participants' && (
              <div className="flex-1 overflow-y-auto bg-slate-900">
                 <div className="p-2">
                    {/* Self */}
                    <div className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer">
                       <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                          {user.name.charAt(0)}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-medium text-white">{user.name} <span className="text-slate-500">(You)</span></p>
                          <p className="text-xs text-blue-400">Host</p>
                       </div>
                       <div className="flex gap-2 text-slate-400">
                          {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
                          {isVideoOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4" />}
                       </div>
                    </div>

                    {/* Others - List will be empty now */}
                    {activeParticipants.map((p) => (
                       <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer">
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full" />
                          <div className="flex-1">
                             <p className="text-sm font-medium text-white">{p.name}</p>
                             <p className="text-xs text-slate-500">{p.role}</p>
                          </div>
                          <div className="flex gap-2 text-slate-400">
                             <Mic className="w-4 h-4" />
                             <Video className="w-4 h-4" />
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