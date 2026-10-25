import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  initAuth,
  getAccessToken,
} from '../services/googleAuth';
import {
  listSpaces,
  listMessages,
  sendMessage,
  createSpace,
  GoogleChatSpace,
  GoogleChatMessage,
  GoogleChatApiError,
  GOOGLE_CHAT_CONSOLE_CONFIG_URL,
} from '../services/googleChatApi';
import { SightingReport } from '../types';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  Users,
  Compass,
  Radio,
  FileText,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  X,
} from 'lucide-react';

interface GoogleChatViewProps {
  sightings: SightingReport[];
  onOpenReportModal: () => void;
}

export const GoogleChatView: React.FC<GoogleChatViewProps> = ({
  sightings,
  onOpenReportModal,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spaces & Messages state
  const [spaces, setSpaces] = useState<GoogleChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<GoogleChatSpace | null>(null);
  const [messages, setMessages] = useState<GoogleChatMessage[]>([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [chatApiError, setChatApiError] = useState<GoogleChatApiError | null>(null);

  // Message draft & Confirmation Modal state
  const [messageDraft, setMessageDraft] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    type: 'message' | 'sighting_broadcast' | 'create_space';
    title: string;
    details: string;
    targetSpaceName?: string;
    action: () => Promise<void>;
  } | null>(null);

  // New Space Modal state
  const [isNewSpaceModalOpen, setIsNewSpaceModalOpen] = useState<boolean>(false);
  const [newSpaceName, setNewSpaceName] = useState<string>('');

  // Sighting broadcast modal state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [selectedSightingForBroadcast, setSelectedSightingForBroadcast] = useState<number | null>(
    sightings[0]?.id || null
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch spaces once accessToken is available
  useEffect(() => {
    if (accessToken) {
      loadSpaces(accessToken);
    } else {
      setSpaces([]);
      setSelectedSpace(null);
      setMessages([]);
      setChatApiError(null);
    }
  }, [accessToken]);

  // Load messages whenever selectedSpace changes
  useEffect(() => {
    if (accessToken && selectedSpace) {
      loadMessages(accessToken, selectedSpace.name);
    } else {
      setMessages([]);
    }
  }, [accessToken, selectedSpace]);

  // Load Spaces from Google Chat API
  const loadSpaces = async (token: string) => {
    setIsLoadingSpaces(true);
    setChatApiError(null);
    try {
      const spaceList = await listSpaces(token);
      setSpaces(spaceList);
      if (spaceList.length > 0 && !selectedSpace) {
        setSelectedSpace(spaceList[0]);
      }
    } catch (err: any) {
      console.warn('Error listing Google Chat spaces:', err);
      setChatApiError(err);
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Load Messages from Google Chat API
  const loadMessages = async (token: string, spaceName: string) => {
    setIsLoadingMessages(true);
    try {
      const msgList = await listMessages(token, spaceName);
      setMessages(msgList);
    } catch (err: any) {
      console.warn('Error listing Google Chat messages:', err);
      setChatApiError(err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Interactive Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setSpaces([]);
    setSelectedSpace(null);
    setMessages([]);
  };

  // Dispatch message with User Confirmation Dialog (MANDATORY per Workspace guidelines)
  const handleRequestSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageDraft.trim() || !selectedSpace || !accessToken) return;

    const draftText = messageDraft.trim();
    const spaceDisplayName = selectedSpace.displayName || selectedSpace.name;

    setPendingConfirmation({
      type: 'message',
      title: 'Confirm Message Dispatch to Google Chat',
      details: `You are about to transmit a message to Google Chat Space "${spaceDisplayName}".`,
      targetSpaceName: spaceDisplayName,
      action: async () => {
        setIsSending(true);
        try {
          await sendMessage(accessToken, selectedSpace.name, draftText);
          setMessageDraft('');
          await loadMessages(accessToken, selectedSpace.name);
        } catch (err: any) {
          setChatApiError(err);
        } finally {
          setIsSending(false);
        }
      },
    });
  };

  // Broadcast Sighting Report to Google Chat (MANDATORY Confirmation)
  const handleRequestBroadcastSighting = (sightingId: number) => {
    const sighting = sightings.find((s) => s.id === sightingId);
    if (!sighting || !selectedSpace || !accessToken) return;

    const spaceDisplayName = selectedSpace.displayName || selectedSpace.name;
    const formattedBulletin = [
      `🚨 [OMAHA MUFON UAP INVESTIGATION BULLETIN]`,
      `Case ID: #${sighting.id} (${sighting.type})`,
      `Observation Time: ${new Date(sighting.sighting_time).toLocaleString()} UTC`,
      `Location: ${sighting.location_text} (${sighting.lat.toFixed(4)}°N, ${sighting.lon.toFixed(4)}°W)`,
      `Witness: ${sighting.reporter_name} (${sighting.reporter_role || 'Civilian Witness'})`,
      `Angular Bearing: ${sighting.bearing ? `${sighting.bearing}°` : 'Unspecified'} | Elevation: ${sighting.elevation ? `${sighting.elevation}°` : 'Unspecified'}`,
      `ADS-B Correlation Status: ${sighting.correlation_status === 'correlated' ? 'CORRELATED TO KNOWN FLIGHT' : 'NO ADS-B MATCH FOUND (ANOMALOUS)'}`,
      `Narrative: ${sighting.description}`,
    ].join('\n');

    setPendingConfirmation({
      type: 'sighting_broadcast',
      title: 'Confirm Sighting Broadcast to Google Chat Space',
      details: `Transmit full telemetry bulletin for Case #${sighting.id} (${sighting.type}) to Google Chat Space "${spaceDisplayName}".`,
      targetSpaceName: spaceDisplayName,
      action: async () => {
        setIsSending(true);
        try {
          await sendMessage(accessToken, selectedSpace.name, formattedBulletin);
          setIsBroadcastModalOpen(false);
          await loadMessages(accessToken, selectedSpace.name);
        } catch (err: any) {
          setChatApiError(err);
        } finally {
          setIsSending(false);
        }
      },
    });
  };

  // Create Space with Confirmation
  const handleRequestCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || !accessToken) return;

    const nameToCreate = newSpaceName.trim();
    setPendingConfirmation({
      type: 'create_space',
      title: 'Confirm Create Google Chat Space',
      details: `Create a new Google Chat Space titled "${nameToCreate}" in your Workspace domain.`,
      action: async () => {
        try {
          const created = await createSpace(accessToken, nameToCreate);
          setNewSpaceName('');
          setIsNewSpaceModalOpen(false);
          await loadSpaces(accessToken);
          setSelectedSpace(created);
        } catch (err: any) {
          setChatApiError(err);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>GOOGLE WORKSPACE ENTERPRISE COLLABORATION · GOOGLE CHAT API</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Google Chat Field Collaboration
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time multi-agency dispatch channels, Google Workspace team spaces, and live incident broadcasts.
          </p>
        </div>

        {/* User Auth Status / Sign-in Action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-2 pr-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-cyan-500/50 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-700 flex items-center justify-center text-xs font-bold text-cyan-200">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser.displayName || 'Google User'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                  {currentUser.email}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                title="Sign out of Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Official Google Sign-in Button following Workspace specifications */
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs rounded-xl shadow-lg transition-all border border-slate-300 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-3.5 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{authError}</span>
          </div>
          <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Chat API & Enterprise Workspace Prerequisites Notice Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Google Chat API Integration & Workspace Account Requirements
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Calling Google Chat API requires a <strong className="text-slate-200">Business or Enterprise Google Workspace account</strong>.
                Consumer (<code className="text-cyan-400">@gmail.com</code>) accounts cannot access user Chat API endpoints.
                Additionally, Google requires one-time app configuration (App name, Avatar, and Description) in the Google Cloud Console.
              </p>
            </div>
          </div>

          <a
            href={GOOGLE_CHAT_CONSOLE_CONFIG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-cyan-300 border border-slate-700 hover:border-cyan-500 rounded-lg text-xs font-mono transition-colors shrink-0 whitespace-nowrap shadow-sm"
          >
            <span>Cloud Console Chat Config</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {chatApiError && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs space-y-2 mt-2">
            <div className="flex items-start gap-2 text-amber-300 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{chatApiError.message}</span>
            </div>
            {chatApiError.isChatAppNotConfigured && (
              <div className="pl-6 space-y-1.5 text-slate-300 text-[11px]">
                <p>
                  To complete setup in Google Cloud Project <code className="text-cyan-300 font-mono">gen-lang-client-0051306922</code>:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>Open the Google Cloud Console Chat Configuration page using the button above.</li>
                  <li>Provide an App name (e.g. <em>"Omaha MUFON Skywatch"</em>) and an Avatar URL.</li>
                  <li>Click <strong>Save</strong> at the bottom of the configuration page.</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace: Spaces Sidebar + Messages Window */}
      {!currentUser ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Google Workspace Sign-In Required</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Authenticate with your Google Workspace account to connect with investigator team spaces, read live messages, and dispatch telemetry bulletins.
            </p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg"
          >
            <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google Workspace'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Spaces / Rooms Directory (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[580px] overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs text-white uppercase font-mono tracking-wider">
                  Chat Spaces ({spaces.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => accessToken && loadSpaces(accessToken)}
                  disabled={isLoadingSpaces}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Refresh Spaces"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSpaces ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
                <button
                  onClick={() => setIsNewSpaceModalOpen(true)}
                  className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Create New Space"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Spaces list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingSpaces && spaces.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  Loading Google Chat spaces...
                </div>
              ) : spaces.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-slate-400">
                    No active Google Chat spaces found in your account.
                  </p>
                  <button
                    onClick={() => setIsNewSpaceModalOpen(true)}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Sighting Space</span>
                  </button>
                </div>
              ) : (
                spaces.map((space) => {
                  const isSelected = selectedSpace?.name === space.name;
                  const displayName = space.displayName || space.name.replace('spaces/', 'Space #');

                  return (
                    <button
                      key={space.name}
                      onClick={() => setSelectedSpace(space)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-cyan-950/60 border border-cyan-700/60 text-white shadow-sm'
                          : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs truncate group-hover:text-cyan-300 transition-colors">
                          {displayName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                          {space.spaceType || space.type || 'SPACE'} · {space.name}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick action at bottom of spaces column */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
              <button
                onClick={() => setIsBroadcastModalOpen(true)}
                disabled={!selectedSpace}
                className="w-full py-2 px-3 bg-cyan-950/70 border border-cyan-800/80 hover:bg-cyan-900 text-cyan-300 hover:text-white rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Broadcast Sighting Report</span>
              </button>
            </div>
          </div>

          {/* Right Column: Chat Messages Window (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[580px] overflow-hidden">
            {/* Space header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-white truncate">
                    {selectedSpace
                      ? selectedSpace.displayName || selectedSpace.name
                      : 'Select a Chat Space'}
                  </h3>
                  {selectedSpace && (
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Connected to Google Chat API ({selectedSpace.name})
                    </div>
                  )}
                </div>
              </div>

              {selectedSpace && (
                <button
                  onClick={() => accessToken && loadMessages(accessToken, selectedSpace.name)}
                  disabled={isLoadingMessages}
                  className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingMessages ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refresh Feed</span>
                </button>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selectedSpace ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-cyan-400" />
                  <p className="text-xs">Select a space from the left column to view messages.</p>
                </div>
              ) : isLoadingMessages && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  Loading Google Chat message stream...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <p className="text-xs">No messages recorded in this Google Chat space yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Use the composer below to dispatch your first field message or transmit a sighting bulletin.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isCurrentUser =
                    currentUser?.displayName &&
                    msg.sender?.displayName &&
                    msg.sender.displayName.toLowerCase() === currentUser.displayName.toLowerCase();

                  const timeStr = msg.createTime
                    ? new Date(msg.createTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  const isBulletin = msg.text?.includes('[OMAHA MUFON UAP INVESTIGATION BULLETIN]');

                  return (
                    <div
                      key={msg.name || idx}
                      className={`flex flex-col space-y-1 ${
                        isCurrentUser ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender line */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 px-1">
                        <span className="font-semibold text-slate-300">
                          {msg.sender?.displayName || 'Investigator'}
                        </span>
                        <span>·</span>
                        <span>{timeStr}</span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                          isBulletin
                            ? 'bg-slate-950 border border-cyan-600/60 text-slate-200 font-mono whitespace-pre-wrap'
                            : isCurrentUser
                            ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-100 rounded-br-sm'
                            : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer (bottom) */}
            <form
              onSubmit={handleRequestSendMessage}
              className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  selectedSpace
                    ? `Message ${selectedSpace.displayName || selectedSpace.name}...`
                    : 'Select a space first...'
                }
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                disabled={!selectedSpace || isSending}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!selectedSpace || !messageDraft.trim() || isSending}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE/MUTATING WORKSPACE OPERATIONS */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-cyan-500/70 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">
                  {pendingConfirmation.title}
                </h3>
                <span className="text-[10px] font-mono text-cyan-400">
                  Google Workspace Permission & User Confirmation
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingConfirmation.details}
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 space-y-1">
              <div>API: <span className="text-slate-200">chat.googleapis.com (v1)</span></div>
              <div>AUTH: <span className="text-cyan-300">{currentUser?.email}</span></div>
              <div>STATUS: <span className="text-amber-400">Awaiting explicit confirmation</span></div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const act = pendingConfirmation.action;
                  setPendingConfirmation(null);
                  await act();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SPACE MODAL */}
      {isNewSpaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Create Google Chat Space</h3>
              <button
                onClick={() => setIsNewSpaceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Space Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Omaha Skywatch Operations"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSpaceModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSpaceName.trim()}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50"
                >
                  Continue to Confirmation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BROADCAST SIGHTING MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                Broadcast Sighting Bulletin to Google Chat
              </h3>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select an incident report from the Nebraska database to format as a structured investigation bulletin for Space{' '}
              <strong className="text-cyan-300">{selectedSpace?.displayName || selectedSpace?.name}</strong>.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {sightings.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSightingForBroadcast(s.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSightingForBroadcast === s.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="font-bold text-cyan-400">
                      #{s.id} · {s.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(s.sighting_time).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs font-medium">{s.location_text}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {s.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSightingForBroadcast}
                onClick={() =>
                  selectedSightingForBroadcast &&
                  handleRequestBroadcastSighting(selectedSightingForBroadcast)
                }
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50"
              >
                Prepare Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
