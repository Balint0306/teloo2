import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Search, Library, Play, Pause, SkipForward, 
  SkipBack, Repeat, Shuffle, Heart, MoreHorizontal, ArrowLeft, ArrowDownCircle,
  ChevronDown, Search as SearchIcon, ListMusic, Music, Music2,
  ChevronsLeft, ChevronsRight,
  Settings, Clock, Bell, Plus, Pin, Volume2, Maximize2,
  Tv, Monitor, Smartphone, Laptop, Speaker, Share2, Headphones, MoreVertical
} from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { 
  doc, onSnapshot, setDoc, updateDoc, serverTimestamp, 
  getDoc, collection, query, limit 
} from 'firebase/firestore';
import { SPOTIFY_TRACKS, type Track } from './spotifyContent';

import { UserProfile } from '../../types';
import { type User } from 'firebase/auth';

const Marquee = ({ text, className, speed = 0.4 }: { text: string; className?: string; speed?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      setShouldAnimate(textRef.current.offsetWidth > containerRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap relative w-full ${className}`}>
      <motion.div
        animate={{ x: shouldAnimate ? ["0%", "-50%"] : "0%" }}
        transition={shouldAnimate ? {
          duration: text.length * speed,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 2
        } : {}}
        className="inline-block whitespace-nowrap"
      >
        <span ref={textRef} className={`${shouldAnimate ? 'pr-12' : ''} inline-block`}>{text}</span>
        {shouldAnimate && <span className="pr-12 inline-block">{text}</span>}
      </motion.div>
    </div>
  );
};
const SpotifyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.508 17.301c-.216.354-.675.465-1.028.249-2.85-1.743-6.438-2.136-10.662-1.17-.405.093-.81-.159-.903-.564-.093-.405.159-.81.564-.903 4.62-1.056 8.583-.606 11.778 1.347.351.216.462.675.251 1.041zm1.467-3.261c-.273.444-.852.585-1.296.312-3.261-2-8.232-2.583-12.087-1.413-.501.153-1.026-.135-1.179-.636-.153-.501.135-1.026.636-1.179 4.416-1.341 9.9-0.672 13.62 1.62.441.27.585.852.306 1.296zm.138-3.411c-3.909-2.322-10.353-2.535-14.127-1.389-.6.183-1.236-.162-1.419-.762-.183-.6.162-1.236.762-1.419 4.317-1.311 11.451-1.065 16.002 1.638.54.321.717 1.02.396 1.56-.321.54-1.02.717-1.563.396l-.551-.324z"/>
  </svg>
);

const PlayTriangleIcon = () => (
  <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-black" />
);

const PauseBarsIcon = () => (
  <span className="flex items-center gap-1">
    <span className="h-[18px] w-[5px] rounded-sm bg-black" />
    <span className="h-[18px] w-[5px] rounded-sm bg-black" />
  </span>
);

const PreviousTrackIcon = () => (
  <span className="relative block h-7 w-7">
    <span className="absolute left-[4px] top-[6px] h-[15px] w-[3px] rounded-sm bg-current" />
    <span className="absolute left-[9px] top-[5px] h-0 w-0 border-y-[8px] border-r-[13px] border-y-transparent border-r-current" />
  </span>
);

const NextTrackIcon = () => (
  <span className="relative block h-7 w-7">
    <span className="absolute left-[5px] top-[5px] h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-current" />
    <span className="absolute right-[4px] top-[6px] h-[15px] w-[3px] rounded-sm bg-current" />
  </span>
);

type SpotifyDevice = {
  id: string;
  name: string;
  type: 'computer' | 'smartphone';
  lastActive?: { toMillis?: () => number };
};

const SpotifyApp = ({ onClose, user, profile }: { onClose: () => void, user: User, profile: UserProfile | null }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(SPOTIFY_TRACKS[0]);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState(profile?.settings?.displayName?.split(' ')[0] || 'Bálint');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedTracks, setLikedTracks] = useState<number[]>([]);
  const [showLikedSongs, setShowLikedSongs] = useState(false);
  const [playlists, setPlaylists] = useState<{id: string, title: string, description: string, trackIds: number[], pinned?: boolean}[]>([]);
  const [likedSongsSearch, setLikedSongsSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [likedSongsSort, setLikedSongsSort] = useState<'custom' | 'recent' | 'title'>('recent');

  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [showCreatePlaylistNaming, setShowCreatePlaylistNaming] = useState(false);
  const [namingPlaylistTitle, setNamingPlaylistTitle] = useState('');
  const [showPlaylistPicker, setShowPlaylistPicker] = useState<number | null>(null); // Track ID
  const [toast, setToast] = useState<{ message: string, trackId: number } | null>(null);
  const [showSavedHere, setShowSavedHere] = useState<number | null>(null); // Track ID for "Saved here:" screen

  const OperationType = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  } as const;

  type OperationType = (typeof OperationType)[keyof typeof OperationType];

  function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Sync Liked Tracks with Firebase
  useEffect(() => {
    if (!auth.currentUser) return;
    const likedRef = doc(db, `users/${auth.currentUser.uid}/spotify/liked`);
    
    const unsub = onSnapshot(likedRef, (snapshot) => {
      if (snapshot.exists()) {
        setLikedTracks(snapshot.data().trackIds || []);
      } else {
        // Initial starts empty
        const initial: number[] = [];
        setDoc(likedRef, { trackIds: initial });
        setLikedTracks(initial);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/spotify/liked`);
    });

    return unsub;
  }, [auth.currentUser]);

  // Sync Playlists with Firebase
  useEffect(() => {
    if (!auth.currentUser) return;
    const playlistsCol = collection(db, `users/${auth.currentUser.uid}/spotifyPlaylists`);
    
    const unsub = onSnapshot(playlistsCol, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setPlaylists(p);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/spotifyPlaylists`);
    });

    return unsub;
  }, [auth.currentUser]);

  const toggleLike = async (trackId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!auth.currentUser) return;

    const likedRef = doc(db, `users/${auth.currentUser.uid}/spotify/liked`);
    const isLiked = likedTracks.includes(trackId);
    const newLiked = isLiked
      ? likedTracks.filter(id => id !== trackId)
      : [trackId, ...likedTracks];
    
    setLikedTracks(newLiked); // Optimistic
    
    if (!isLiked) {
      setToast({ message: "Hozzáadva ehhez: Kedvelt dalok", trackId });
    } else {
      setToast({ message: "Eltávolítva: Kedvelt dalok", trackId });
    }
    setTimeout(() => setToast(null), 3000);

    try {
      await setDoc(likedRef, { trackIds: newLiked });
    } catch (err) {
      console.error("Error updating liked tracks:", err);
    }
  };

  const confirmCreatePlaylist = async () => {
    if (!auth.currentUser || !namingPlaylistTitle.trim()) return;
    const id = Math.random().toString(36).substring(7);
    const path = `users/${auth.currentUser.uid}/spotifyPlaylists/${id}`;
    const newPlaylist = {
      title: namingPlaylistTitle,
      description: `Műsorlista • ${userName}`,
      trackIds: [],
      createdAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, path), newPlaylist);
      setShowCreatePlaylistNaming(false);
      setNamingPlaylistTitle('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const toggleTrackInPlaylist = async (trackId: number, playlistId: string) => {
    if (!auth.currentUser) return;
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const isAdded = playlist.trackIds.includes(trackId);
    const newTrackIds = isAdded 
      ? playlist.trackIds.filter(id => id !== trackId)
      : [...playlist.trackIds, trackId];
    
    const path = `users/${auth.currentUser.uid}/spotifyPlaylists/${playlistId}`;
    try {
      await updateDoc(doc(db, path), { trackIds: newTrackIds });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };
  const [showDevices, setShowDevices] = useState(false);
  const [isShuffle, setIsShuffle] = useState(true);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(1); // 0: none, 1: all, 2: one
  const [deviceId] = useState(() => {
    const saved = localStorage.getItem('spotify_device_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(7);
    localStorage.setItem('spotify_device_id', newId);
    return newId;
  });
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromFirebase = useRef(false);

  // Sync with Firebase
  useEffect(() => {
    if (!auth.currentUser) return;

    const playbackRef = doc(db, `users/${auth.currentUser.uid}/spotify/playback`);
    const devicesRef = doc(db, `users/${auth.currentUser.uid}/spotifyDevices/${deviceId}`);

    // Heartbeat for this device
    const updateHeartbeat = () => {
      if (!auth.currentUser) return;
      setDoc(devicesRef, {
        id: deviceId,
        name: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? `${userName} telefonja` : `${userName} – WH-CH520`,
        type: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'smartphone' : 'computer',
        lastActive: serverTimestamp()
      });
    };

    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 5000); // 5s heartbeat for "searching" feel

    // Listen for playback changes
    const unsubPlayback = onSnapshot(playbackRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        isUpdatingFromFirebase.current = true;
        const track = SPOTIFY_TRACKS.find(t => t.id === data.trackId);
        if (track) setCurrentTrack(track);
        setIsPlaying(data.isPlaying);
        setIsShuffle(data.isShuffle ?? true);
        setRepeatMode(data.repeatMode ?? 1);
        
        if (data.trackId) setHasStartedPlayback(true);

        const incomingActiveDeviceId = data.activeDeviceId || deviceId;

        // Update local state time for followers
        if (incomingActiveDeviceId !== deviceId) {
          setCurrentTime(data.currentTime);
        }

        // Only sync video ref time if it's far off
        if (videoRef.current && Math.abs(videoRef.current.currentTime - data.currentTime) > 1.5) {
          videoRef.current.currentTime = data.currentTime;
        }

        if (videoRef.current && incomingActiveDeviceId === deviceId && data.isPlaying && videoRef.current.paused) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        }
        
        setActiveDeviceId(incomingActiveDeviceId);
        setTimeout(() => { isUpdatingFromFirebase.current = false; }, 200);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/spotify/playback`);
    });

    // Listen for other devices
    const devicesCol = collection(db, `users/${auth.currentUser.uid}/spotifyDevices`);
    const unsubDevices = onSnapshot(devicesCol, (snapshot) => {
      const now = Date.now();
      const docs = snapshot.docs.map(doc => doc.data() as SpotifyDevice);
      // Filter out stale devices (no heartbeat in 15 seconds for more responsive listing)
      const activeDocs = docs.filter(d => {
        if (!d.lastActive) return true;
        const lastActive = d.lastActive.toMillis ? d.lastActive.toMillis() : Date.now();
        return (now - lastActive) < 15000; 
      });
      setAvailableDevices(activeDocs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}/spotifyDevices`);
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubPlayback();
      unsubDevices();
    };
  }, [deviceId, userName]);

  const activeDevice = availableDevices.find(d => d.id === (activeDeviceId || deviceId));
  const currentDeviceName = activeDevice?.name || `${userName} – WH-CH520`;

  const selectDevice = (targetDeviceId: string) => {
    if (targetDeviceId === (activeDeviceId || deviceId)) {
      setShowDevices(false);
      return;
    }

    setActiveDeviceId(targetDeviceId);
    updateFirebasePlayback({
      activeDeviceId: targetDeviceId,
      currentTime: videoRef.current?.currentTime ?? currentTime,
      isPlaying
    });
    setShowDevices(false);
  };

  const toggleDevices = () => {
    if (!showDevices && auth.currentUser) {
      // Immediate heartbeat on open
      const devicesRef = doc(db, `users/${auth.currentUser.uid}/spotifyDevices/${deviceId}`);
      setDoc(devicesRef, { lastActive: serverTimestamp() }, { merge: true });
    }
    setShowDevices(!showDevices);
  };

  // Google Cast Initialization
  useEffect(() => {
    const onCastApiAvailable = (isAvailable: boolean) => {
      setIsCastAvailable(isAvailable);
      if (isAvailable && (window as any).cast) {
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        castContext.setOptions({
          receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
      }
    };

    (window as any).__onGCastApiAvailable = onCastApiAvailable;
  }, []);

  const handleCastMedia = () => {
    if (!isCastAvailable) return;
    
    const castContext = (window as any).cast.framework.CastContext.getInstance();
    castContext.requestSession().then(() => {
      const session = castContext.getCurrentSession();
      if (session) {
        const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(currentTrack.videoUrl, 'video/mp4');
        mediaInfo.metadata = new (window as any).chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = currentTrack.title;
        mediaInfo.metadata.subtitle = currentTrack.artist;
        mediaInfo.metadata.images = [{ url: currentTrack.cover }];
        
        const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
        session.loadMedia(request).then(
          () => console.log('Cast successful'),
          (err: any) => console.error('Cast error', err)
        );
      }
    }).catch((err: any) => console.error('Session error', err));
  };

  // Update Firebase when local state changes
  const updateFirebasePlayback = async (updates: any) => {
    if (isUpdatingFromFirebase.current || !auth.currentUser) return;
    
    // Safety: Only the active device (the one playing) should update the timestamp/progress
    // unless we are explicitly changing tracks or toggling play/pause from another device
    const isMaster = activeDeviceId === deviceId || activeDeviceId === null;
    const isControlChange = updates.trackId !== undefined || 
                           updates.isPlaying !== undefined || 
                           updates.activeDeviceId !== undefined ||
                           updates.currentTime !== undefined;
    
    if (!isMaster && !isControlChange) return;

    const playbackRef = doc(db, `users/${auth.currentUser.uid}/spotify/playback`);
    try {
      await setDoc(playbackRef, {
        trackId: currentTrack.id,
        isPlaying,
        currentTime: videoRef.current?.currentTime || 0,
        activeDeviceId: activeDeviceId || deviceId,
        isShuffle,
        repeatMode,
        updatedAt: serverTimestamp(),
        ...updates
      }, { merge: true });
    } catch (e) {
      console.error("Error updating playback:", e);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    let g = '';
    if (hour >= 5 && hour < 12) g = 'Jó reggelt';
    else if (hour >= 12 && hour < 18) g = 'Jó napot';
    else if (hour >= 18 && hour < 22) g = 'Jó estét';
    else g = 'Szép estét';
    setGreeting(g);

    if (auth.currentUser?.displayName) {
      setUserName(auth.currentUser.displayName.split(' ')[0]);
    }
  }, []);

  useEffect(() => {
    // Only play audio on this device if it's the active speaker
    const isThisActive = activeDeviceId === deviceId || activeDeviceId === null;

    if (isPlaying && isThisActive) {
      videoRef.current?.play().catch(() => setIsPlaying(false));
    } else {
      videoRef.current?.pause();
    }
    
    // If not active, keep current time synced but don't play
  }, [isPlaying, currentTrack, activeDeviceId, deviceId]);

  const lastSyncTime = useRef<number>(0);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const now = Date.now();
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
      
      // Heartbeat playback progress to Firebase ONLY if this is the active device
      if ((activeDeviceId === deviceId || activeDeviceId === null) && isPlaying && !isUpdatingFromFirebase.current) {
        // Sync progress every second to avoid excessive writes while keeping it snappy
        if (now - lastSyncTime.current > 1000) {
          updateFirebasePlayback({});
          lastSyncTime.current = now;
        }
      }

    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    
    // Update local state for immediate feedback
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    
    // Sync to other devices
    updateFirebasePlayback({ currentTime: time });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (repeatMode === 2) {
      const targetActiveDeviceId = activeDeviceId || deviceId;
      const isThisActiveDevice = targetActiveDeviceId === deviceId;

      if (!activeDeviceId) {
        setActiveDeviceId(deviceId);
      }

      setCurrentTime(0);
      setIsPlaying(true);

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        if (isThisActiveDevice) {
          window.setTimeout(() => {
            videoRef.current?.play().catch(() => setIsPlaying(false));
          }, 0);
        }
      }

      updateFirebasePlayback({
        currentTime: 0,
        isPlaying: true,
        activeDeviceId: targetActiveDeviceId
      });
      return;
    }

    let nextIndex: number;
    const currentIndex = SPOTIFY_TRACKS.findIndex(t => t.id === currentTrack.id);

    if (isShuffle) {
      // Pick a random track that isn't the current one (if possible)
      const otherTracks = SPOTIFY_TRACKS.filter((_, i) => i !== currentIndex);
      const randomTrack = otherTracks[Math.floor(Math.random() * otherTracks.length)];
      nextIndex = SPOTIFY_TRACKS.findIndex(t => t.id === randomTrack.id);
    } else {
      nextIndex = (currentIndex + 1) % SPOTIFY_TRACKS.length;
      // If we reached the end and repeat is off, don't loop
      if (nextIndex === 0 && repeatMode === 0) {
        setIsPlaying(false);
        updateFirebasePlayback({ isPlaying: false });
        return;
      }
    }

    const nextTrack = SPOTIFY_TRACKS[nextIndex];
    
    // Optimistic local state update
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
    setCurrentTime(0);
    
    updateFirebasePlayback({ 
      trackId: nextTrack.id, 
      isPlaying: true, 
      currentTime: 0 
    });
  };

  const handlePrev = () => {
    if (currentTime > 3) {
      if (videoRef.current) videoRef.current.currentTime = 0;
      setCurrentTime(0);
      updateFirebasePlayback({ currentTime: 0 });
      return;
    }

    const currentIndex = SPOTIFY_TRACKS.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + SPOTIFY_TRACKS.length) % SPOTIFY_TRACKS.length;
    const prevTrack = SPOTIFY_TRACKS[prevIndex];
    
    // Optimistic local state update
    setCurrentTrack(prevTrack);
    setIsPlaying(true);
    setCurrentTime(0);
    
    updateFirebasePlayback({ 
      trackId: prevTrack.id, 
      isPlaying: true, 
      currentTime: 0 
    });
  };

  const toggleShuffle = () => {
    const newState = !isShuffle;
    setIsShuffle(newState);
    updateFirebasePlayback({ isShuffle: newState });
  };

  const toggleRepeat = () => {
    const nextMode = ((repeatMode + 1) % 3) as 0 | 1 | 2;
    setRepeatMode(nextMode);
    updateFirebasePlayback({ repeatMode: nextMode });
  };

  const handleShare = () => {
    const shareData = {
      title: currentTrack.title,
      text: `Hallgasd a ${currentTrack.title} dalt a ${currentTrack.artist} előadásában!`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(`Hallgatom: ${currentTrack.title} - ${currentTrack.artist}\n${window.location.href}`);
      // Simple custom toast could be here, but we'll stick to a clean UI
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newState = !isPlaying;
    
    setHasStartedPlayback(true);
    // Optimistic local state update
    setIsPlaying(newState);
    
    updateFirebasePlayback({ 
      isPlaying: newState 
    });
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col bg-black font-sans text-white overflow-hidden relative selection:bg-[#1DB954]/30">
      {/* Hidden Video Engine */}
      <video 
        ref={videoRef}
        src={currentTrack.videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={handleNext}
        loop={repeatMode === 2}
        className="hidden"
        playsInline
      />

      {/* Dynamic Background */}
      <div className="absolute inset-x-0 top-0 h-[300px] w-full z-0 overflow-hidden opacity-30 pointer-events-none">
        <motion.div 
          animate={{ backgroundColor: [currentTrack.color, '#000000'] }}
          transition={{ duration: 1.5 }}
          className="w-full h-full blur-[100px]"
        />
      </div>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {!isPlayerExpanded && activeTab === 'home' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-12 px-6 pb-2 sticky top-0 bg-black/60 backdrop-blur-md z-30 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <SpotifyLogo className="w-8 h-8 text-[#1DB954]" />
              <h1 className="text-[22px] font-[900] tracking-tight">{greeting}</h1>
            </div>
            <div className="flex gap-4 items-center">
              <button className="p-1 hover:text-[#1DB954] transition-colors"><Bell size={24} strokeWidth={2.2} /></button>
              <button className="p-1 hover:text-[#1DB954] transition-colors"><Clock size={24} strokeWidth={2.2} /></button>
              <button className="p-1 hover:text-[#1DB954] transition-colors" onClick={onClose}><Settings size={24} strokeWidth={2.2} /></button>
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar pt-2 pb-44">
          {activeTab === 'library' && showLikedSongs ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-0 pb-44 bg-black min-h-full"
            >
              <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-[#1E3264] to-black opacity-60 pointer-events-none" />

              {/* Header with Back Button and Search - Matched to Screenshot Style */}
              <div className="px-5 pt-12 pb-4 sticky top-0 bg-[#0a1229] z-40">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowLikedSongs(false)} className="text-white hover:opacity-70 transition-opacity p-1 shrink-0">
                    <ArrowLeft size={28} />
                  </button>
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <SearchIcon className="text-white/60" size={18} />
                    </div>
                    <input 
                      placeholder="Keresés a kedvelt dalok között"
                      value={likedSongsSearch}
                      onChange={(e) => setLikedSongsSearch(e.target.value)}
                      className="w-full bg-white/10 h-10 rounded-lg pl-10 pr-4 text-[13px] font-bold outline-none placeholder:text-white/60 truncate"
                    />
                  </div>
                  <button className="px-3 h-10 bg-white/10 rounded-lg text-[13px] font-black active:bg-white/20 transition-colors shrink-0">Rendezés</button>
                </div>
              </div>

              <div className="px-5 relative z-10 pt-6">
                <div className="mb-8">
                   <h1 className="text-[32px] font-black mb-1 tracking-tighter leading-tight">Kedvelt dalok</h1>
                   <p className="text-zinc-400 font-bold text-[13px] tracking-tight">{likedTracks.length} dal</p>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-5">
                    <div className="w-9 h-9 rounded-full border border-zinc-500/30 flex items-center justify-center">
                      <ArrowDownCircle size={22} className="text-[#1DB954]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Shuffle 
                      size={24} 
                      className={isShuffle ? "text-[#1DB954]" : "text-zinc-500"} 
                      onClick={toggleShuffle} 
                    />
                    <button 
                      onClick={() => {
                        const firstLikedId = likedTracks[0];
                        const track = SPOTIFY_TRACKS.find(t => t.id === firstLikedId);
                        if (track) {
                          setCurrentTrack(track);
                          setIsPlaying(true);
                        }
                      }}
                      className="w-[52px] h-[52px] bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                    >
                      <Play size={26} fill="black" strokeWidth={0} className="ml-1" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-4 -mx-1 px-1">
                   {[
                     { id: 'pop', label: 'pop' },
                     { id: 'dream-pop', label: 'dream pop' },
                     { id: 'jatek', label: 'Játék' },
                     { id: 'trap', label: 'trap' },
                     { id: 'gyors', label: 'Gyors' },
                     { id: 'chill', label: 'chill' }
                   ].map(filter => (
                     <button 
                       key={filter.id} 
                       className="px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap bg-zinc-800/80 text-white border border-white/5 active:bg-zinc-700 transition-all shadow-lg"
                     >
                       {filter.label}
                     </button>
                   ))}
                </div>
              </div>

              {/* Liked Tracks List */}
              <div className="px-5 relative z-10">
                <div 
                  className="flex items-center gap-4 mb-6 group cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => setActiveTab('search')}
                >
                  <div className="w-14 h-14 rounded bg-zinc-900/60 flex items-center justify-center border border-dashed border-white/10">
                    <Plus size={32} className="text-white/30" />
                  </div>
                  <p className="font-black text-[16px] tracking-tight text-white/90">Felvétel erre a műsorlistára</p>
                </div>

                <div className="space-y-5">
                  {SPOTIFY_TRACKS
                    .filter(t => likedTracks.includes(t.id))
                    .filter(t => 
                      t.title.toLowerCase().includes(likedSongsSearch.toLowerCase()) || 
                      t.artist.toLowerCase().includes(likedSongsSearch.toLowerCase())
                    )
                    .sort((a, b) => {
                      if (likedSongsSort === 'title') return a.title.localeCompare(b.title);
                      if (likedSongsSort === 'recent') return likedTracks.indexOf(a.id) - likedTracks.indexOf(b.id);
                      return 0;
                    })
                    .map(track => (
                    <div 
                      key={track.id}
                      onClick={() => { setCurrentTrack(track); setIsPlaying(true); }}
                      className="flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <div className="w-14 h-14 rounded overflow-hidden shadow-lg relative shrink-0">
                        <img src={track.cover} className="w-full h-full object-cover" />
                        {currentTrack.id === track.id && isPlaying && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                             <div className="flex items-end gap-0.5 h-3">
                               <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-[#1DB954]" />
                               <motion.div animate={{ height: [8, 4, 12, 8] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-[#1DB954]" />
                               <motion.div animate={{ height: [12, 4, 12] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-[#1DB954]" />
                             </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className={`font-bold text-[16px] tracking-tight truncate ${currentTrack.id === track.id ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</p>
                        <div className="flex items-center gap-1.5 text-[13px] text-zinc-400 font-bold overflow-hidden">
                           {track.id % 3 === 0 && <div className="flex items-center justify-center bg-zinc-500/80 text-[8px] px-1 rounded-sm text-black h-[13px] font-black shrink-0">E</div>}
                           <p className="truncate tracking-tight">{track.artist}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-zinc-500 flex items-center">
                        <MoreVertical size={22} strokeWidth={2.5} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'home' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-5 mb-8">
                <div className="grid grid-cols-2 gap-2">
                  {SPOTIFY_TRACKS.slice(0, 6).map((track, i) => (
                    <motion.div 
                      key={track.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setCurrentTrack(track);
                        setIsPlaying(true);
                      }}
                      className="bg-zinc-900/40 rounded-md overflow-hidden flex items-center gap-3 backdrop-blur-xl group cursor-pointer hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                    >
                      <img src={track.cover} className="w-14 h-14 object-cover shadow-lg" alt={track.title} />
                      <div className="text-[11px] font-bold tracking-tight line-clamp-2 pr-2">{track.title}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <section className="mb-10">
                <h2 className="px-5 text-xl font-black mb-4 tracking-tighter">Legutóbb játszott</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-4">
                  {SPOTIFY_TRACKS.map((track, i) => (
                    <motion.div 
                      key={track.id} 
                      className="min-w-[155px] flex flex-col group cursor-pointer active:scale-95 transition-transform"
                      onClick={() => {
                        setCurrentTrack(track);
                        setIsPlaying(true);
                      }}
                    >
                      <div className="w-[155px] h-[155px] rounded-xl overflow-hidden shadow-2xl mb-3 relative">
                        <img src={track.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={track.title} />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                        
                        {currentTrack.id === track.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="flex gap-1.5 items-end h-8">
                               <motion.div animate={{ height: isPlaying ? [12, 32, 12] : 4 }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1.5 bg-[#1DB954] rounded-full" />
                               <motion.div animate={{ height: isPlaying ? [20, 8, 32, 20] : 6 }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1.5 bg-[#1DB954] rounded-full" />
                               <motion.div animate={{ height: isPlaying ? [32, 12, 32] : 4 }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 bg-[#1DB954] rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[13px] font-bold mb-0.5 truncate tracking-tight">{track.title}</div>
                      <div className="text-[11px] text-zinc-500 font-bold tracking-tight">{track.artist}</div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : activeTab === 'search' ? (
            <div className="px-5 pb-20">
              <h2 className="text-3xl font-black mb-6 tracking-tighter">Keresés</h2>
              <div className="relative mb-8">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  autoFocus
                  placeholder="Művész, dal vagy podcast"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-zinc-900 h-12 rounded-lg pl-12 pr-4 font-bold outline-none ring-0 border-none"
                />
              </div>

              {searchQuery.trim() !== '' && (
                <div className="space-y-4">
                  {SPOTIFY_TRACKS.filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(track => (
                    <div 
                      key={track.id} 
                      onClick={() => { setCurrentTrack(track); setIsPlaying(true); }}
                      className="flex items-center gap-3 p-1 rounded-lg hover:bg-white/5 cursor-pointer group active:scale-[0.98] transition-all"
                    >
                      <img src={track.cover} className="w-12 h-12 rounded object-cover shadow-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{track.title}</div>
                        <div className="text-xs text-zinc-500 font-bold truncate">{track.artist}</div>
                      </div>
                      <Plus 
                        size={22} 
                        className={likedTracks.includes(track.id) ? 'text-[#1DB954]' : 'text-zinc-600'} 
                        onClick={(e) => toggleLike(track.id, e)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.trim() === '' && (
                <div className="grid grid-cols-2 gap-3">
                  {['Pop', 'Rock', 'Hip-Hop', 'Indie', 'Workout', 'Hungarian'].map((cat, i) => (
                    <div key={cat} className={`h-24 rounded-lg p-3 relative overflow-hidden bg-gradient-to-br transition-all cursor-pointer hover:brightness-110 ${
                      i % 3 === 0 ? 'from-purple-600 to-indigo-800' : 
                      i % 3 === 1 ? 'from-emerald-600 to-teal-800' : 'from-rose-600 to-pink-800'
                    }`}>
                      <span className="font-bold text-lg tracking-tight relative z-10">{cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
           ) : activeTab === 'library' && !showLikedSongs ? (
            <div className="px-0 pb-44 bg-[#121212] min-h-full">
               {/* Fixed Header */}
               <div className="px-5 pt-10 pb-4 sticky top-0 bg-[#121212]/90 backdrop-blur-md z-40">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-black text-black text-xs shadow-inner uppercase tracking-wider">
                        {userName[0]}
                      </div>
                      <h2 className="text-[28px] font-black tracking-tighter">Gyűjteményem</h2>
                    </div>
                    <div className="flex items-center gap-6">
                      <button className="text-white/80 hover:text-white transition-colors" onClick={() => setActiveTab('search')}><SearchIcon size={26} strokeWidth={2.5} /></button>
                      <button className="text-white/80 hover:text-white transition-colors" onClick={() => setShowCreatePlaylistNaming(true)}><Plus size={30} strokeWidth={2} /></button>
                    </div>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                   {['Műsorlisták', 'Albumok', 'Művészek', 'Podcastok'].map(chip => (
                     <div key={chip} className="px-4 py-1.5 bg-zinc-800/80 rounded-full text-[13px] font-bold whitespace-nowrap border border-white/5 cursor-pointer hover:bg-zinc-700 transition-colors">
                       {chip}
                     </div>
                   ))}
                 </div>

                 {/* Library Search Bar */}
                 <div className="mt-6 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <SearchIcon className="text-white/30" size={18} />
                    </div>
                    <input 
                      placeholder="Mehet a keresés a Gyűjteményedben"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      className="w-full bg-white/5 h-10 rounded-lg pl-10 pr-4 text-[13px] font-bold outline-none placeholder:text-white/30 border border-white/5 focus:bg-white/10 transition-colors"
                    />
                 </div>
               </div>
               
               <div className="px-5">
                 {/* Sort & Grid Toggle */}
                 <div className="flex items-center justify-between py-4 mb-2">
                   <div className="flex items-center gap-1.5 cursor-pointer group">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-3.5 h-[1.5px] bg-white" />
                        <div className="w-2.5 h-[1.5px] bg-white" />
                        <div className="w-1.5 h-[1.5px] bg-white" />
                      </div>
                      <span className="text-[13px] font-bold tracking-tight">Legutóbbi</span>
                   </div>
                   <button className="p-1"><div className="grid grid-cols-2 gap-0.5"><div className="w-2 h-2 border border-white/40" /><div className="w-2 h-2 border border-white/40" /><div className="w-2 h-2 border border-white/40" /><div className="w-2 h-2 border border-white/40" /></div></button>
                 </div>

                 <div className="space-y-4">
                    {/* Liked Songs Card */}
                    {('kedvelt dalok'.includes(librarySearch.toLowerCase()) || librarySearch === '') && (
                      <div 
                        onClick={() => setShowLikedSongs(true)}
                        className="flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="w-[66px] h-[66px] rounded bg-gradient-to-br from-indigo-700 via-indigo-500 to-indigo-100 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform relative shrink-0">
                          <Heart size={30} fill="white" className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[16px] tracking-tight text-white group-hover:text-[#1DB954] transition-colors truncate">Kedvelt dalok</p>
                          <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[13px]">
                            <Pin size={14} className="text-[#1DB954] rotate-[-45deg]" fill="#1DB954" />
                            <span className="truncate">Műsorlista • {userName} • {likedTracks.length} dal</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Playlists */}
                    {playlists
                      .filter(p => p.title.toLowerCase().includes(librarySearch.toLowerCase()))
                      .map(playlist => (
                      <div 
                        key={playlist.id}
                        className="flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="w-[66px] h-[66px] rounded bg-zinc-800 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                          {playlist.trackIds.length > 0 ? (
                            <img src={SPOTIFY_TRACKS.find(t => t.id === playlist.trackIds[0])?.cover} className="w-full h-full object-cover rounded" />
                          ) : (
                            <Music size={30} className="text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[16px] tracking-tight text-white group-hover:text-[#1DB954] transition-colors truncate">{playlist.title}</p>
                          <p className="text-zinc-400 font-bold text-[13px] truncate">{playlist.description || `Műsorlista • ${userName}`}</p>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          ) : null}
        </div>

        {/* Mini Player */}
        <AnimatePresence>
          {!isPlayerExpanded && hasStartedPlayback && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-[84px] left-2 right-2 z-[60]"
            >
              <div 
                className="bg-[#282828] rounded-xl p-2 px-3 flex items-center gap-3 shadow-2xl relative overflow-hidden backdrop-blur-xl group cursor-pointer"
                onClick={() => setIsPlayerExpanded(true)}
              >
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-lg group-active:scale-95 transition-transform">
                  <img src={currentTrack.cover} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                   <div className="flex flex-col">
                      <Marquee text={currentTrack.title} className="font-bold text-[14px] text-white leading-tight" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDevices();
                        }}
                        className="flex min-w-0 items-center gap-1 rounded-md pr-1 text-left hover:opacity-80 active:scale-[0.98] transition"
                      >
                        <Headphones size={12} className="text-[#1DB954]" />
                        <p className="text-[12px] font-black text-[#1DB954] truncate opacity-90">{currentDeviceName}</p>
                      </button>
                   </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 px-1">
                  <div className="hidden sm:flex items-center gap-4 mr-1">
                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="text-white/60 hover:text-white transition-colors">
                      <SkipBack size={22} fill="currentColor" strokeWidth={0} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="text-white/60 hover:text-white transition-colors">
                      <SkipForward size={22} fill="currentColor" strokeWidth={0} />
                    </button>
                  </div>
                  <button onClick={togglePlay} className="text-white hover:scale-110 active:scale-90 transition-transform flex items-center justify-center w-10 h-10">
                    {isPlaying ? <Pause size={28} fill="white" strokeWidth={0} /> : <Play size={28} fill="white" strokeWidth={0} className="ml-1" />}
                  </button>
                </div>

                {/* Progress Bar at Bottom of Mini Player */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10">
                   <motion.div 
                     className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                     style={{ width: `${progressPercent}%` }}
                   />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Bar */}
        {!isPlayerExpanded && (
          <div className="fixed bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black via-black/95 to-transparent flex items-center justify-between px-6 pb-6 pt-2 z-50">
            {[
              { id: 'home', icon: Home, label: 'Kezdőlap' },
              { id: 'search', icon: SearchIcon, label: 'Keresés' },
              { id: 'library', icon: Library, label: 'Gyűjtemény' },
              { id: 'premium', icon: SpotifyLogo, label: 'Premium' }
            ].map(tab => (
              <div 
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'premium') {
                    setActiveTab(tab.id as any);
                    setShowLikedSongs(false);
                  }
                }}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all flex-1 ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                {tab.id === 'premium' ? (
                  <tab.icon className="w-7 h-7" />
                ) : (
                  <tab.icon size={26} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                )}
                <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">{tab.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.9 }}
              className="fixed bottom-28 inset-x-4 h-14 bg-[#1d8df5] text-white rounded-lg shadow-2xl flex items-center px-4 gap-3 z-[400] pointer-events-auto"
            >
              <div className="w-10 h-10 rounded shrink-0 bg-white/20 flex items-center justify-center">
                <Heart size={20} fill="white" className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight tracking-tight">{toast.message}</p>
              </div>
              {!toast.message.includes('Eltávolítva') && (
                <button 
                  onClick={() => { setToast(null); setShowSavedHere(toast.trackId); }}
                  className="bg-white/10 px-4 py-1.5 rounded-full text-[13px] font-black active:bg-white/30 transition-colors shrink-0"
                >
                  Módosítás
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Here / Playlist Picker Bottom Sheet */}
        <AnimatePresence>
          {showSavedHere !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end"
              onClick={() => setShowSavedHere(null)}
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full bg-[#282828] rounded-t-[28px] p-6 max-h-[85vh] overflow-hidden flex flex-col pt-2"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <h2 className="text-[17px] font-black tracking-tight">Elmentve itt:</h2>
                  <button 
                    onClick={() => {
                      setShowSavedHere(null);
                      setShowCreatePlaylistNaming(true);
                    }}
                    className="text-white/70 font-bold border border-white/10 px-4 py-1.5 rounded-full text-sm active:bg-white/10"
                  >
                    Műsorlista létrehozása
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-8">
                  {/* Kedvelt dalok toggle */}
                  <div 
                    onClick={() => toggleLike(showSavedHere)}
                    className="flex items-center gap-4 p-2 rounded-lg active:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 via-indigo-500 to-indigo-100 flex items-center justify-center shrink-0">
                      <Heart size={24} fill="white" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] tracking-tight">Kedvelt dalok</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${likedTracks.includes(showSavedHere) ? 'bg-[#1DB954] border-[#1DB954]' : 'border-white/20'}`}>
                      {likedTracks.includes(showSavedHere) && <Play size={12} fill="black" strokeWidth={0} className="rotate-90" />}
                    </div>
                  </div>

                  {/* Playlists */}
                  {playlists.map(playlist => {
                    const isAdded = playlist.trackIds.includes(showSavedHere);
                    return (
                      <div 
                        key={playlist.id}
                        onClick={() => toggleTrackInPlaylist(showSavedHere, playlist.id)}
                        className="flex items-center gap-4 p-2 rounded-lg active:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {playlist.trackIds.length > 0 ? (
                            <img src={SPOTIFY_TRACKS.find(t => t.id === playlist.trackIds[0])?.cover} className="w-full h-full object-cover" />
                          ) : (
                            <Music size={24} className="text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] tracking-tight truncate">{playlist.title}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isAdded ? 'bg-[#1DB954] border-[#1DB954]' : 'border-white/20'}`}>
                          {isAdded && <Plus size={16} strokeWidth={4} className="text-black" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 pb-2 shrink-0">
                  <button 
                    onClick={() => setShowSavedHere(null)}
                    className="w-full h-14 bg-white text-black font-black rounded-full flex items-center justify-center text-lg active:scale-95 transition-transform"
                  >
                    Kész
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCreatePlaylistNaming && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[200] bg-gradient-to-b from-zinc-700 to-black flex flex-col p-8"
            >
              <div className="flex-1 flex flex-col items-center justify-center pt-20">
                <h2 className="text-white text-3xl font-black mb-12 tracking-tight">Nevezd el a műsorlistád</h2>
                
                <div className="w-full max-w-sm relative">
                  <input 
                    autoFocus
                    type="text"
                    value={namingPlaylistTitle}
                    onChange={(e) => setNamingPlaylistTitle(e.target.value)}
                    placeholder={`${playlists.length + 1}. műsorlistám`}
                    className="w-full bg-transparent border-b-2 border-zinc-500 focus:border-[#1DB954] py-4 text-3xl font-black text-white text-center outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 pb-12">
                <button 
                  onClick={() => setShowCreatePlaylistNaming(false)}
                  className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-full text-lg active:scale-95 transition-transform"
                >
                  Mégse
                </button>
                <button 
                  onClick={confirmCreatePlaylist}
                  className="flex-1 bg-[#1DB954] text-black font-black py-4 rounded-full text-lg active:scale-95 transition-transform"
                >
                  Létrehozás
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Here Modal */}
        <AnimatePresence>
          {showSavedHere !== null && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[210] bg-[#121212] flex flex-col"
            >
              <div className="px-5 pt-12 pb-6 flex items-center justify-between border-b border-white/5 relative">
                <button onClick={() => setShowSavedHere(null)} className="w-8 h-1 bg-zinc-700 rounded-full mx-auto mb-4 absolute top-4 left-1/2 -translate-x-1/2" />
                <h2 className="text-xl font-black tracking-tight pt-4">Elmentve itt:</h2>
                <button 
                  onClick={() => { setShowSavedHere(null); setShowCreatePlaylistNaming(true); }}
                  className="text-[#1DB954] font-bold text-sm pt-4"
                >
                  Új műsorlista
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-4">
                <div 
                  onClick={() => toggleLike(showSavedHere)}
                  className="px-5 py-3 flex items-center gap-4 active:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 to-indigo-100 flex items-center justify-center">
                    <Heart size={24} fill="white" className="text-white" />
                  </div>
                  <div className="flex-1 font-bold text-lg">Kedvelt dalok</div>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${likedTracks.includes(showSavedHere) ? 'bg-[#1DB954] border-[#1DB954]' : 'border-zinc-700'}`}>
                    {likedTracks.includes(showSavedHere) && <Play size={16} fill="black" className="ml-1" />}
                  </div>
                </div>

                {/* User Playlists */}
                {playlists.map(playlist => (
                  <div 
                    key={playlist.id}
                    onClick={() => toggleTrackInPlaylist(showSavedHere, playlist.id)}
                    className="px-5 py-3 flex items-center gap-4 active:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      <Music size={24} className="text-white/40" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg leading-tight">{playlist.title}</p>
                      <p className="text-zinc-500 font-bold text-sm tracking-tight">{playlist.trackIds.length > 0 ? `${playlist.trackIds.length} dal` : 'Üres'}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${playlist.trackIds.includes(showSavedHere) ? 'bg-[#1DB954] border-[#1DB954]' : 'border-zinc-700'}`}>
                      {playlist.trackIds.includes(showSavedHere) && <Plus size={20} className="text-black rotate-45" />}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-8">
                <button 
                  onClick={() => setShowSavedHere(null)}
                  className="w-full bg-white text-black font-black py-4 rounded-full text-lg uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Kész
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Player */}
        <AnimatePresence>
          {isPlayerExpanded && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 150) setIsPlayerExpanded(false);
              }}
              className="fixed inset-0 z-[200] flex flex-col bg-[#121212] overflow-hidden"
            >
              {/* Refined Background Gradient */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div 
                  animate={{ backgroundColor: currentTrack.color }}
                  className="w-full h-1/2 opacity-30 blur-[120px] scale-150 origin-top"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/80 to-[#121212]" />
              </div>

              <div className="relative z-10 flex-1 bg-transparent text-white overflow-hidden flex flex-col">
                <div className={`px-6 pt-6 flex flex-col flex-1 overflow-y-auto pb-40`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 shrink-0 py-2">
                    <button onClick={() => setIsPlayerExpanded(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <ChevronDown size={28} strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">Lejátszás kereséséből</span>
                      <span className="text-[14px] font-black tracking-tight truncate max-w-[200px]">„bsw” keresése</span>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors mt-0.5">
                      <MoreHorizontal size={24} />
                    </button>
                  </div>

                  {/* Album Art with Swipe Detection */}
                  <div className="flex items-center justify-center py-5 shrink-0 overflow-hidden">
                    <motion.div 
                      layoutId="album-art"
                      animate={{ scale: isPlaying ? [0.98, 1] : 0.94 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragEnd={(e, info) => {
                        const swipeThreshold = 50;
                        const velocityThreshold = 500;
                        if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                          handleNext();
                        } else if (info.offset.x > swipeThreshold || (info.offset.x > 30 && info.velocity.x > velocityThreshold)) {
                          handlePrev();
                        }
                      }}
                      whileDrag={{ scale: 0.92, rotate: info => info.offset.x / 40 }}
                      className="w-full aspect-square max-w-[350px] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative group cursor-grab active:cursor-grabbing"
                    >
                      <img src={currentTrack.cover} className="w-full h-full object-cover" alt={currentTrack.title} />
                    </motion.div>
                  </div>

                  {/* Track Info - 1:1 Match */}
                  <div className="mt-4 mb-4 shrink-0 px-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Marquee 
                          text={currentTrack.title} 
                          speed={0.5}
                          className="text-[17px] font-black tracking-tight text-white mb-0.5 leading-tight" 
                        />
                        <div className="flex items-center gap-2">
                          <span className="bg-white/25 text-[8px] font-black px-1 py-0.5 rounded-[3px] text-black/70 flex items-center justify-center h-[13px] w-[13px]">E</span>
                          <p className="text-[13px] font-bold text-white/55 tracking-tight">{currentTrack.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(currentTrack.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${likedTracks.includes(currentTrack.id) ? 'text-[#1DB954]' : 'text-white/80 hover:text-white border-2 border-white/70'}`}
                        >
                          {likedTracks.includes(currentTrack.id) ? <Play size={20} className="rotate-90" fill="currentColor" strokeWidth={0} /> : <Plus size={20} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar - Ultra Thin & Clean */}
                  <div className="mb-5 shrink-0">
                    <div className="relative h-6 flex items-center group/progress">
                      <input 
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-[3px] bg-white/10 rounded-full appearance-none cursor-pointer accent-white peer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-0 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                        style={{
                          background: `linear-gradient(to right, #fff ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between -mt-2 px-0.5">
                      <span className="text-[11px] font-bold tracking-tight text-white/50">{formatTime(currentTime)}</span>
                      <span className="text-[11px] font-bold tracking-tight text-white/50">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls - Refined 1:1 match to minimal reference */}
                  <div className="flex flex-col mb-10 shrink-0">
                    <div className="mb-7 grid grid-cols-5 items-center px-0">
                      <button 
                        onClick={toggleShuffle} 
                        className={`relative flex h-12 items-center justify-start transition-colors ${isShuffle ? "text-[#1DB954]" : "text-white/35 hover:text-white/80"}`}
                        aria-label="Keverés"
                      >
                        <Shuffle size={25} strokeWidth={2.5} />
                        {isShuffle && <span className="absolute left-[20px] top-[32px] h-1 w-1 rounded-full bg-[#1DB954]" />}
                      </button>

                      <motion.button 
                        whileTap={{ scale: 0.82 }}
                        onClick={handlePrev} 
                        className="flex h-12 items-center justify-center text-white/35 hover:text-white/80 transition-colors"
                      >
                        <PreviousTrackIcon />
                      </motion.button>

                      <motion.button 
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.04 }}
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="mx-auto w-[58px] h-[58px] bg-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all shrink-0"
                      >
                        {isPlaying ? (
                          <PauseBarsIcon />
                        ) : (
                          <PlayTriangleIcon />
                        )}
                      </motion.button>

                      <motion.button 
                        whileTap={{ scale: 0.82 }}
                        onClick={handleNext} 
                        className="flex h-12 items-center justify-center text-white hover:opacity-80 transition-opacity"
                      >
                        <NextTrackIcon />
                      </motion.button>

                      <button 
                        onClick={toggleRepeat} 
                        className={`relative flex h-12 items-center justify-end transition-colors ${repeatMode > 0 ? "text-white" : "text-white/75 hover:text-white"}`}
                        aria-label="Ismétlés"
                      >
                        <Repeat size={25} strokeWidth={2.4} />
                        {repeatMode === 2 && (
                          <span className="absolute right-[-2px] top-[11px] w-3 h-3 bg-[#121212] text-white text-[8px] font-black rounded-full flex items-center justify-center">1</span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                       <button
                        type="button"
                        onClick={toggleDevices}
                        className="flex min-w-0 max-w-[70%] items-center gap-2.5 rounded-lg py-2 pr-3 text-[#1DB954] hover:bg-white/5 active:scale-[0.98] transition group"
                        aria-label="Eszköz váltása"
                      >
                        <motion.div
                          animate={isPlaying ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="shrink-0"
                        >
                          <Headphones size={19} strokeWidth={2.5} />
                        </motion.div>
                        <span className="truncate text-[13px] font-black tracking-tight">{currentDeviceName}</span>
                      </button>
                      <div className="flex items-center gap-7">
                        <Share2 size={24} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
                        <ListMusic size={26} className="text-white/40 hover:text-white transition-colors cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* Lyrics Section */}
                  {currentTrack.lyrics && (
                    <motion.div 
                      className="w-full bg-[#3e3e3e]/30 backdrop-blur-xl rounded-[24px] p-6 mb-20 shrink-0 border border-white/5"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[18px] font-black tracking-tight tracking-[-0.02em]">Dalszöveg</h3>
                        <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                          <Maximize2 size={16} />
                        </button>
                      </div>
                      <div 
                        ref={lyricsContainerRef}
                        className="space-y-5 max-h-[400px] overflow-y-auto no-scrollbar scroll-smooth pb-8"
                      >
                        {currentTrack.lyrics.map((line, idx) => {
                          const activeIndex = currentTrack.lyrics!.reduce((latestIndex, lyric, lyricIndex) => (
                            currentTime >= lyric.time ? lyricIndex : latestIndex
                          ), -1);
                          const focusedIndex = activeIndex === -1 ? 0 : activeIndex;
                          const isActive = idx === focusedIndex;
                          const isPast = idx < focusedIndex;
                          return (
                            <p 
                              key={idx}
                              className={`text-[20px] font-black leading-tight tracking-tight transition-all duration-500 ${
                                isActive
                                  ? 'lyrics-active text-white opacity-100 scale-100 drop-shadow-[0_0_14px_rgba(255,255,255,0.18)]'
                                  : isPast
                                    ? 'text-white/40 opacity-75 scale-[0.98]'
                                    : 'text-white/20 opacity-55 scale-[0.98]'
                              }`}
                            >
                              {line.text}
                            </p>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Credits Section */}
                  <div className="pb-12 opacity-40 px-2 shrink-0">
                    <h4 className="text-xs font-black uppercase tracking-widest mb-4">Közreműködők</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[15px] font-bold text-white">{currentTrack.artist}</p>
                        <p className="text-[13px] font-bold text-white/60">Fő előadó</p>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-white">Spotify-függő AI</p>
                        <p className="text-[13px] font-bold text-white/60">Producer, Szerző</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Device Picker Overlay */}
        <AnimatePresence>
          {showDevices && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-xl flex flex-col justify-end"
              onClick={() => setShowDevices(false)}
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-[#282828] rounded-t-[32px] p-6 pb-12 w-full max-h-[80%] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                <h2 className="text-2xl font-black mb-8 tracking-tighter text-center">Csatlakozás eszközhöz</h2>
                
                <div className="space-y-2">
                  <div className="bg-[#3e3e3e] rounded-xl p-5 flex flex-col gap-4 mb-4">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 flex items-center justify-center text-[#1DB954]">
                        <Speaker size={32} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[17px] text-[#1DB954]">Aktuális eszköz</p>
                        <p className="text-[#1DB954] text-sm font-bold opacity-80">{currentDeviceName}</p>
                      </div>
                      <div className="flex gap-1 items-end h-4 pr-2">
                        <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-[#1DB954]" />
                        <motion.div animate={{ height: [8, 4, 16, 8] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-[#1DB954]" />
                        <motion.div animate={{ height: [16, 4, 16] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-[#1DB954]" />
                      </div>
                    </div>
                  </div>

                  <p className="text-zinc-400 font-black text-xs uppercase tracking-widest pl-2 mb-4">További eszközök</p>

                  <div className="space-y-1">
                    {availableDevices.filter(d => d.id !== (activeDeviceId || deviceId)).map(device => (
                      <button 
                        key={device.id}
                        onClick={() => selectDevice(device.id)}
                        className="w-full p-4 rounded-xl flex items-center gap-5 hover:bg-white/5 active:bg-white/10 transition-colors group"
                      >
                        <div className="w-10 h-10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                          {device.type === 'computer' ? <Laptop size={32} /> : <Smartphone size={32} />}
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-[17px] group-hover:text-[#1DB954] transition-colors">{device.name}</p>
                          <p className="text-zinc-500 text-sm font-bold">Spotify Connect</p>
                        </div>
                      </button>
                    ))}
                    
                    {isCastAvailable && (
                      <button 
                        onClick={handleCastMedia}
                        className="w-full p-4 rounded-xl flex items-center gap-5 hover:bg-white/5 transition-colors group"
                      >
                         <div className="w-10 h-10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                          <Tv size={32} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-[17px]">Google Cast</p>
                          <p className="text-zinc-500 text-sm font-bold">Összes közeli TV</p>
                        </div>
                      </button>
                    )}

                    <div className="p-4 rounded-xl flex items-center gap-5 opacity-40">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <Monitor size={32} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[17px]">AirPlay vagy Bluetooth</p>
                        <p className="text-zinc-500 text-sm font-bold">További beállítások</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-500">
                   <div className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_8px_#1DB954]" />
                   <p className="text-[11px] font-black uppercase tracking-wider">Minden eszköz szinkronizálva</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SpotifyApp;
