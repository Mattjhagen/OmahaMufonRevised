import React, { useState } from 'react';
import { Video, Copy, CheckCircle2, Users, Plus, ExternalLink, AlertCircle } from 'lucide-react';

export function VideoCallView() {
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const generateRoomCode = () => {
    // Generate a 6-character room code (matching CMAMeet format)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const openMeetingTab = (code: string, name: string) => {
    const meetingUrl = `https://meet.mufonomaha.space/room/${code}?name=${encodeURIComponent(name)}`;
    setGeneratedLink(meetingUrl);

    // Open in new tab
    const newWindow = window.open(meetingUrl, '_blank', 'noopener,noreferrer');

    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup blocked - user can still use the copy link
      console.log('Popup blocked, showing copy link');
    }
  };

  const handleCreateRoom = () => {
    setNameError('');

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setNameError('Please enter your display name');
      return;
    }

    const newCode = generateRoomCode();
    setRoomCode(newCode);
    openMeetingTab(newCode, trimmedName);
  };

  const handleJoinRoom = () => {
    setNameError('');
    setCodeError('');

    const trimmedName = displayName.trim();
    const trimmedCode = roomCode.trim();

    if (!trimmedName) {
      setNameError('Please enter your display name');
      return;
    }

    if (!trimmedCode) {
      setCodeError('Please enter a room code');
      return;
    }

    openMeetingTab(trimmedCode, trimmedName);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-4">
          <Video className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Video Conference</h1>
        <p className="text-slate-400">Connect with fellow club members via secure video call</p>
      </div>

      {/* Display Name Input */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-300 mb-2">
          Your Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setNameError('');
          }}
          placeholder="Enter your name"
          className={`w-full px-4 py-3 bg-slate-950/80 border ${nameError ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
        />
        {nameError && (
          <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{nameError}</span>
          </div>
        )}
      </div>

      {/* Create or Join Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create New Room */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Create New Room</h3>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Start a new video conference and share the room code with others
          </p>
          <button
            onClick={handleCreateRoom}
            disabled={!displayName.trim()}
            className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Create Room
          </button>
        </div>

        {/* Join Existing Room */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Join Room</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Enter a room code to join an existing conference
          </p>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setCodeError('');
            }}
            placeholder="Room Code (e.g., ABC123)"
            className={`w-full px-4 py-3 bg-slate-950/80 border ${codeError ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 font-mono`}
            maxLength={6}
          />
          {codeError && (
            <div className="flex items-center gap-2 mb-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{codeError}</span>
            </div>
          )}
          <button
            onClick={handleJoinRoom}
            disabled={!displayName.trim() || !roomCode.trim()}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Join Room
          </button>
        </div>
      </div>

      {/* Generated Link (shown after creating/joining) */}
      {generatedLink && (
        <div className="mt-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                Meeting Link {roomCode && `(Room: ${roomCode})`}
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                A new tab should have opened with your meeting. If it didn't open (popup blocked), use the link below:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono truncate">
                  {generatedLink}
                </div>
                <button
                  onClick={copyRoomLink}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  {copiedToast ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-8 bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Privacy & Security</h4>
        <ul className="text-sm text-slate-400 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Room-code-only access - no public listing of active rooms</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Peer-to-peer video connections for secure communication</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>No recording by default - your conversation stays private</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Camera, microphone, and screen share controls available in-call</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
