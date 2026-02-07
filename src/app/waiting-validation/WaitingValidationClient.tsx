"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Clock,
  CheckCircle,
  Mail,
  RefreshCw,
  Gamepad2,
  Trophy,
  RotateCcw,
  User,
  FileText,
  Shield,
  Calendar,
  Building2,
  Target,
  Timer,
  Award,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  Puzzle,
  Zap,
  Circle,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Sun,
  Moon,
  Video,
  X,
  Maximize2,
  Minimize2,
  Plus,
  ExternalLink,
  Headphones,
} from "lucide-react";

interface WaitingValidationClientProps {
  userName: string;
}

// Progress steps for the tracker
const progressSteps = [
  { id: 1, titleFr: "Compte créé", titleEn: "Account created", titleAr: "تم إنشاء الحساب", done: true },
  { id: 2, titleFr: "Profil complété", titleEn: "Profile completed", titleAr: "اكتمل الملف", done: true },
  { id: 3, titleFr: "Validation RH", titleEn: "HR Validation", titleAr: "تحقق الموارد البشرية", done: false, current: true },
  { id: 4, titleFr: "Accès plateforme", titleEn: "Platform access", titleAr: "الوصول للمنصة", done: false },
  { id: 5, titleFr: "Premier pointage", titleEn: "First check-in", titleAr: "أول تسجيل", done: false },
];

// Free music tracks with real URLs (royalty-free)
const defaultMusicTracks = [
  { 
    id: 1, 
    title: "Relaxing Piano", 
    artist: "Free Music", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  { 
    id: 2, 
    title: "Electronic Chill", 
    artist: "SoundHelix", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  { 
    id: 3, 
    title: "Ambient Dreams", 
    artist: "SoundHelix", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  { 
    id: 4, 
    title: "Soft Melody", 
    artist: "SoundHelix", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  { 
    id: 5, 
    title: "Peaceful Vibes", 
    artist: "SoundHelix", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },
];

// Fun facts
const funFacts = {
  fr: [
    "☕ Le café a été découvert par des chèvres en Éthiopie !",
    "🎵 La musique peut améliorer la productivité de 15%.",
    "🧠 Votre cerveau génère assez d'électricité pour allumer une ampoule.",
    "🌍 Il y a plus d'étoiles dans l'univers que de grains de sable sur Terre.",
    "😊 Sourire libère des endorphines même si c'est forcé !",
    "🎨 La couleur violette était réservée aux rois dans l'antiquité.",
    "⏰ Un humain passe en moyenne 6 mois de sa vie à attendre aux feux rouges.",
    "🌸 Les abeilles peuvent reconnaître les visages humains.",
  ],
  en: [
    "☕ Coffee was discovered by goats in Ethiopia!",
    "🎵 Music can improve productivity by 15%.",
    "🧠 Your brain generates enough electricity to power a light bulb.",
    "🌍 There are more stars in the universe than grains of sand on Earth.",
    "😊 Smiling releases endorphins even if it's forced!",
    "🎨 Purple was reserved for royalty in ancient times.",
    "⏰ Humans spend an average of 6 months waiting at red lights.",
    "🌸 Bees can recognize human faces.",
  ],
  ar: [
    "☕ اكتشف الماعز القهوة في إثيوبيا!",
    "🎵 يمكن للموسيقى تحسين الإنتاجية بنسبة 15%.",
    "🧠 ينتج دماغك ما يكفي من الكهرباء لإضاءة مصباح.",
    "🌍 هناك نجوم في الكون أكثر من حبات الرمل على الأرض.",
    "😊 الابتسام يطلق الإندورفين حتى لو كان مصطنعًا!",
    "🎨 كان اللون البنفسجي مخصصًا للملوك في العصور القديمة.",
    "⏰ يقضي البشر في المتوسط 6 أشهر في انتظار إشارات المرور.",
    "🌸 يمكن للنحل التعرف على وجوه البشر.",
  ],
};

const translations = {
  fr: {
    greeting: "Bonjour",
    waitingTitle: "Votre profil est en cours de validation",
    waitingDesc: "Notre équipe RH examine votre dossier. Profitez-en pour vous détendre !",
    emailNotice: "Vous recevrez un email dès que votre profil sera validé.",
    refresh: "Vérifier le statut",
    games: "Mini-jeux",
    memoryGame: "Memory",
    clickGame: "Speed Click",
    diceGame: "Lancé de dés",
    tictactoe: "Morpion",
    moves: "Coups",
    bestScore: "Record",
    youWon: "Bravo !",
    youLost: "Perdu !",
    draw: "Égalité !",
    playAgain: "Rejouer",
    score: "Score",
    timeLeft: "Temps",
    clickFast: "Cliquez vite !",
    gameOver: "Partie terminée !",
    start: "Commencer",
    roll: "Lancer",
    yourTurn: "Votre tour",
    cpuTurn: "Tour de l'ordi",
    music: "Musique",
    video: "Vidéo",
    nowPlaying: "En lecture",
    funFact: "Le saviez-vous ?",
    estimatedTime: "Temps estimé : 24-48h",
    back: "Retour",
    findPairs: "Trouvez les paires",
    yourScores: "Vos records",
    progressTracker: "Suivi de votre demande",
    lightMode: "Mode clair",
    darkMode: "Mode sombre",
    addUrl: "Ajouter une URL",
    enterUrl: "Entrez l'URL de la musique ou vidéo",
    add: "Ajouter",
    cancel: "Annuler",
    mediaPlayer: "Lecteur média",
    noMedia: "Aucun média en cours",
    enterVideoUrl: "Entrez une URL vidéo (YouTube, MP4...)",
    watchVideo: "Regarder",
  },
  en: {
    greeting: "Hello",
    waitingTitle: "Your profile is being validated",
    waitingDesc: "Our HR team is reviewing your application. Take this time to relax!",
    emailNotice: "You will receive an email once your profile is validated.",
    refresh: "Check status",
    games: "Mini-games",
    memoryGame: "Memory",
    clickGame: "Speed Click",
    diceGame: "Dice Roll",
    tictactoe: "Tic-Tac-Toe",
    moves: "Moves",
    bestScore: "Best",
    youWon: "You won!",
    youLost: "You lost!",
    draw: "It's a draw!",
    playAgain: "Play again",
    score: "Score",
    timeLeft: "Time",
    clickFast: "Click fast!",
    gameOver: "Game over!",
    start: "Start",
    roll: "Roll",
    yourTurn: "Your turn",
    cpuTurn: "CPU's turn",
    music: "Music",
    video: "Video",
    nowPlaying: "Now playing",
    funFact: "Did you know?",
    estimatedTime: "Estimated time: 24-48h",
    back: "Back",
    findPairs: "Find the pairs",
    yourScores: "Your scores",
    progressTracker: "Request tracking",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    addUrl: "Add URL",
    enterUrl: "Enter music or video URL",
    add: "Add",
    cancel: "Cancel",
    mediaPlayer: "Media Player",
    noMedia: "No media playing",
    enterVideoUrl: "Enter video URL (YouTube, MP4...)",
    watchVideo: "Watch",
  },
  ar: {
    greeting: "مرحبًا",
    waitingTitle: "ملفك الشخصي قيد التحقق",
    waitingDesc: "يقوم فريق الموارد البشرية بمراجعة طلبك. استغل هذا الوقت للاسترخاء!",
    emailNotice: "ستتلقى بريدًا إلكترونيًا بمجرد التحقق من ملفك الشخصي.",
    refresh: "تحقق من الحالة",
    games: "ألعاب مصغرة",
    memoryGame: "الذاكرة",
    clickGame: "سرعة النقر",
    diceGame: "رمي النرد",
    tictactoe: "إكس أو",
    moves: "الحركات",
    bestScore: "الأفضل",
    youWon: "فزت!",
    youLost: "خسرت!",
    draw: "تعادل!",
    playAgain: "العب مرة أخرى",
    score: "النتيجة",
    timeLeft: "الوقت",
    clickFast: "انقر بسرعة!",
    gameOver: "انتهت اللعبة!",
    start: "ابدأ",
    roll: "ارمِ",
    yourTurn: "دورك",
    cpuTurn: "دور الكمبيوتر",
    music: "موسيقى",
    video: "فيديو",
    nowPlaying: "قيد التشغيل",
    funFact: "هل تعلم؟",
    estimatedTime: "الوقت المقدر: 24-48 ساعة",
    back: "رجوع",
    findPairs: "اعثر على الأزواج",
    yourScores: "نتائجك",
    progressTracker: "تتبع الطلب",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    addUrl: "إضافة رابط",
    enterUrl: "أدخل رابط الموسيقى أو الفيديو",
    add: "إضافة",
    cancel: "إلغاء",
    mediaPlayer: "مشغل الوسائط",
    noMedia: "لا توجد وسائط",
    enterVideoUrl: "أدخل رابط فيديو (يوتيوب، MP4...)",
    watchVideo: "مشاهدة",
  },
};

// Memory game emojis
const memoryEmojis = ["🎯", "🚀", "⭐", "🎨", "🎵", "💎"];

// Speed click target position
const getRandomPosition = () => ({
  top: Math.random() * 70 + 10,
  left: Math.random() * 70 + 10,
});

// Dice icons
const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

// Helper to convert YouTube URL to embed
const getYouTubeEmbedUrl = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
  }
  return null;
};

export default function WaitingValidationClient({ userName }: WaitingValidationClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const facts = funFacts[language as keyof typeof funFacts] || funFacts.fr;

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Progress tracker animation
  const [pulseStep, setPulseStep] = useState(true);

  // Active game state
  const [activeGame, setActiveGame] = useState<"memory" | "click" | "tictactoe" | "dice" | null>(null);
  
  // Fun fact rotation
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicTracks, setMusicTracks] = useState(defaultMusicTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  // Video player state
  const [videoUrl, setVideoUrl] = useState("");
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  // Add URL modal
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Media tab
  const [mediaTab, setMediaTab] = useState<"music" | "video">("music");

  // Memory Game State
  const [memoryCards, setMemoryCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryBest, setMemoryBest] = useState<number | null>(null);
  const [memoryWon, setMemoryWon] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Speed Click Game State
  const [clickScore, setClickScore] = useState(0);
  const [clickBest, setClickBest] = useState<number | null>(null);
  const [clickTimeLeft, setClickTimeLeft] = useState(10);
  const [clickGameActive, setClickGameActive] = useState(false);
  const [targetPosition, setTargetPosition] = useState({ top: 50, left: 50 });
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tic-Tac-Toe State
  const [tttBoard, setTttBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tttIsXNext, setTttIsXNext] = useState(true);
  const [tttWinner, setTttWinner] = useState<string | null>(null);
  const [tttWins, setTttWins] = useState(0);

  // Dice Game State
  const [playerDice, setPlayerDice] = useState<number>(1);
  const [cpuDice, setCpuDice] = useState<number>(1);
  const [diceResult, setDiceResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceWins, setDiceWins] = useState(0);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("santec_theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  // Save theme to localStorage
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("santec_theme", newTheme ? "dark" : "light");
  };

  // Initialize memory game
  const initMemoryGame = useCallback(() => {
    const shuffled = [...memoryEmojis, ...memoryEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
    setMemoryCards(shuffled);
    setFlippedCards([]);
    setMemoryMoves(0);
    setMemoryWon(false);
    setIsChecking(false);
  }, []);

  // Initialize Tic-Tac-Toe
  const initTicTacToe = useCallback(() => {
    setTttBoard(Array(9).fill(null));
    setTttIsXNext(true);
    setTttWinner(null);
  }, []);

  // Load best scores
  useEffect(() => {
    initMemoryGame();
    const memBest = localStorage.getItem("santec_memory_best");
    const clkBest = localStorage.getItem("santec_click_best");
    const tWins = localStorage.getItem("santec_ttt_wins");
    const dWins = localStorage.getItem("santec_dice_wins");
    if (memBest) setMemoryBest(parseInt(memBest));
    if (clkBest) setClickBest(parseInt(clkBest));
    if (tWins) setTttWins(parseInt(tWins));
    if (dWins) setDiceWins(parseInt(dWins));
  }, [initMemoryGame]);

  // Progress tracker pulse
  useEffect(() => {
    const interval = setInterval(() => setPulseStep((p) => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % facts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [facts.length]);

  // Audio player setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setMusicProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setMusicDuration(audio.duration);
    };

    const handleEnded = () => {
      nextTrack();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Load track when index changes
  useEffect(() => {
    if (audioRef.current && musicTracks[currentTrackIndex]) {
      audioRef.current.src = musicTracks[currentTrackIndex].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrackIndex, musicTracks]);

  // Play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  // Mute/unmute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setMusicProgress(time);
    }
  };

  // Next/prev track
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % musicTracks.length);
    setMusicProgress(0);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + musicTracks.length) % musicTracks.length);
    setMusicProgress(0);
  };

  // Add custom URL
  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    
    const newTrack = {
      id: musicTracks.length + 1,
      title: newTitle.trim() || `Track ${musicTracks.length + 1}`,
      artist: "Custom",
      url: newUrl.trim(),
    };
    
    setMusicTracks([...musicTracks, newTrack]);
    setNewUrl("");
    setNewTitle("");
    setShowAddUrlModal(false);
  };

  // Watch video
  const handleWatchVideo = () => {
    if (!videoUrl.trim()) return;
    
    const youtubeEmbed = getYouTubeEmbedUrl(videoUrl);
    if (youtubeEmbed) {
      setActiveVideoUrl(youtubeEmbed);
    } else {
      // Direct video URL
      setActiveVideoUrl(videoUrl);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Memory card click
  const handleMemoryClick = (id: number) => {
    if (isChecking || memoryWon) return;
    if (flippedCards.length === 2) return;
    if (memoryCards[id].isFlipped || memoryCards[id].isMatched) return;

    const newCards = [...memoryCards];
    newCards[id].isFlipped = true;
    setMemoryCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      setIsChecking(true);

      setTimeout(() => {
        const [first, second] = newFlipped;
        if (memoryCards[first].emoji === memoryCards[second].emoji) {
          const matched = [...memoryCards];
          matched[first].isMatched = true;
          matched[second].isMatched = true;
          setMemoryCards(matched);

          if (matched.every((c) => c.isMatched)) {
            setMemoryWon(true);
            const newMoves = memoryMoves + 1;
            if (!memoryBest || newMoves < memoryBest) {
              setMemoryBest(newMoves);
              localStorage.setItem("santec_memory_best", newMoves.toString());
            }
          }
        } else {
          const reset = [...memoryCards];
          reset[first].isFlipped = false;
          reset[second].isFlipped = false;
          setMemoryCards(reset);
        }
        setFlippedCards([]);
        setIsChecking(false);
      }, 600);
    }
  };

  // Speed click game
  const startClickGame = () => {
    setClickScore(0);
    setClickTimeLeft(10);
    setClickGameActive(true);
    setTargetPosition(getRandomPosition());

    clickTimerRef.current = setInterval(() => {
      setClickTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(clickTimerRef.current!);
          setClickGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTargetClick = () => {
    if (!clickGameActive) return;
    setClickScore((s) => s + 1);
    setTargetPosition(getRandomPosition());
  };

  useEffect(() => {
    if (!clickGameActive && clickScore > 0) {
      if (!clickBest || clickScore > clickBest) {
        setClickBest(clickScore);
        localStorage.setItem("santec_click_best", clickScore.toString());
      }
    }
  }, [clickGameActive, clickScore, clickBest]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    };
  }, []);

  // Tic-Tac-Toe logic
  const checkTTTWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const handleTTTClick = (index: number) => {
    if (tttBoard[index] || tttWinner || !tttIsXNext) return;
    
    const newBoard = [...tttBoard];
    newBoard[index] = "X";
    setTttBoard(newBoard);
    
    const winner = checkTTTWinner(newBoard);
    if (winner) {
      setTttWinner(winner);
      if (winner === "X") {
        const newWins = tttWins + 1;
        setTttWins(newWins);
        localStorage.setItem("santec_ttt_wins", newWins.toString());
      }
      return;
    }
    
    if (newBoard.every((cell) => cell !== null)) {
      setTttWinner("draw");
      return;
    }
    
    setTttIsXNext(false);
    
    setTimeout(() => {
      const emptyIndices = newBoard.map((cell, i) => (cell === null ? i : -1)).filter((i) => i !== -1);
      if (emptyIndices.length > 0) {
        const cpuMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const cpuBoard = [...newBoard];
        cpuBoard[cpuMove] = "O";
        setTttBoard(cpuBoard);
        
        const cpuWinner = checkTTTWinner(cpuBoard);
        if (cpuWinner) {
          setTttWinner(cpuWinner);
        } else if (cpuBoard.every((cell) => cell !== null)) {
          setTttWinner("draw");
        }
        setTttIsXNext(true);
      }
    }, 500);
  };

  // Dice game
  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setDiceResult(null);
    
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setPlayerDice(Math.floor(Math.random() * 6) + 1);
      setCpuDice(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      
      if (rollCount >= 10) {
        clearInterval(rollInterval);
        const finalPlayer = Math.floor(Math.random() * 6) + 1;
        const finalCpu = Math.floor(Math.random() * 6) + 1;
        setPlayerDice(finalPlayer);
        setCpuDice(finalCpu);
        
        if (finalPlayer > finalCpu) {
          setDiceResult("win");
          const newWins = diceWins + 1;
          setDiceWins(newWins);
          localStorage.setItem("santec_dice_wins", newWins.toString());
        } else if (finalPlayer < finalCpu) {
          setDiceResult("lose");
        } else {
          setDiceResult("draw");
        }
        setIsRolling(false);
      }
    }, 100);
  };

  const handleRefresh = () => router.refresh();

  const PlayerDiceIcon = diceIcons[playerDice - 1];
  const CpuDiceIcon = diceIcons[cpuDice - 1];

  // Theme classes
  const themeClasses = isDarkMode
    ? {
        bg: "bg-slate-900",
        bgCard: "bg-slate-800/80",
        bgCardHover: "hover:bg-slate-700/80",
        border: "border-slate-700",
        text: "text-white",
        textMuted: "text-slate-400",
        textSecondary: "text-slate-300",
        accent: "text-blue-400",
        accentBg: "bg-blue-500",
        inputBg: "bg-slate-700",
      }
    : {
        bg: "bg-gray-50",
        bgCard: "bg-white",
        bgCardHover: "hover:bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-900",
        textMuted: "text-gray-500",
        textSecondary: "text-gray-600",
        accent: "text-blue-600",
        accentBg: "bg-blue-600",
        inputBg: "bg-gray-100",
      };

  return (
    <div className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${themeClasses.bgCard} border-b ${themeClasses.border} sticky top-0 z-50 backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${themeClasses.accentBg} flex items-center justify-center shadow-lg`}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={`text-sm ${themeClasses.textMuted}`}>{t.greeting} 👋</p>
              <p className={`font-bold ${themeClasses.text} text-lg`}>{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl ${themeClasses.bgCard} border ${themeClasses.border} ${themeClasses.bgCardHover} transition-colors`}
              title={isDarkMode ? t.lightMode : t.darkMode}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* Status Card */}
        <div className={`${themeClasses.bgCard} rounded-2xl border ${themeClasses.border} p-6 sm:p-8`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center shadow-xl">
                <Clock className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className={`text-2xl sm:text-3xl font-bold ${themeClasses.text} mb-2`}>{t.waitingTitle}</h1>
              <p className={`${themeClasses.textMuted} mb-3`}>{t.waitingDesc}</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded-full text-sm font-medium`}>
                <Timer className="w-4 h-4" />
                {t.estimatedTime}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-6 py-3 ${themeClasses.accentBg} text-white rounded-xl hover:opacity-90 transition-all font-semibold shadow-lg`}
            >
              <RefreshCw className="w-5 h-5" />
              {t.refresh}
            </button>
          </div>

          {/* Progress Tracker */}
          <div className="mb-6">
            <h3 className={`text-sm font-medium ${themeClasses.textMuted} mb-4`}>{t.progressTracker}</h3>
            <div className="relative">
              {/* Track Line */}
              <div className={`absolute top-6 left-0 right-0 h-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'} rounded-full`} />
              <div 
                className="absolute top-6 left-0 h-1 bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: "40%" }}
              />
              
              {/* Steps */}
              <div className="relative flex justify-between">
                {progressSteps.map((step) => (
                  <div key={step.id} className="flex flex-col items-center" style={{ width: "20%" }}>
                    <div
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        step.done
                          ? "bg-blue-500 text-white shadow-lg"
                          : step.current
                          ? `bg-amber-500 text-white shadow-lg ${pulseStep ? "scale-110 ring-4 ring-amber-500/30" : "scale-100"}`
                          : isDarkMode ? "bg-slate-700 text-slate-500" : "bg-gray-300 text-gray-500"
                      }`}
                    >
                      {step.done ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : step.current ? (
                        <Clock className={`w-6 h-6 ${pulseStep ? "opacity-100" : "opacity-60"}`} />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                      
                      {step.current && (
                        <div className={`absolute inset-0 rounded-full border-2 border-amber-400 ${pulseStep ? "scale-150 opacity-0" : "scale-100 opacity-50"} transition-all duration-1000`} />
                      )}
                    </div>
                    
                    <p className={`mt-3 text-xs sm:text-sm text-center font-medium ${
                      step.done
                        ? themeClasses.accent
                        : step.current
                        ? "text-amber-500"
                        : themeClasses.textMuted
                    }`}>
                      {language === "fr" ? step.titleFr : language === "ar" ? step.titleAr : step.titleEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Email Notice */}
          <div className={`flex items-center gap-4 p-4 ${isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'} rounded-xl border ${isDarkMode ? 'border-slate-600' : 'border-blue-200'}`}>
            <div className={`w-10 h-10 rounded-lg ${themeClasses.accentBg} flex items-center justify-center`}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <p className={themeClasses.textSecondary}>{t.emailNotice}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Games Section */}
          <div className={`lg:col-span-2 ${themeClasses.bgCard} rounded-2xl border ${themeClasses.border} overflow-hidden`}>
            <div className={`flex items-center gap-2 p-4 border-b ${themeClasses.border}`}>
              <Gamepad2 className={themeClasses.accent} />
              <h2 className={`font-semibold ${themeClasses.text}`}>{t.games}</h2>
            </div>

            <div className="p-6">
              {!activeGame ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Memory Game */}
                  <button
                    onClick={() => { initMemoryGame(); setActiveGame("memory"); }}
                    className={`group p-5 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40' : 'bg-blue-50 border-blue-200 hover:border-blue-400'} rounded-xl border transition-all text-left`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-3 shadow-lg">
                      <Puzzle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-bold ${themeClasses.text} mb-1`}>{t.memoryGame}</h3>
                    <p className={`text-sm ${themeClasses.textMuted} mb-2`}>{t.findPairs}</p>
                    {memoryBest && (
                      <div className="flex items-center gap-1 text-sm text-amber-500">
                        <Trophy className="w-4 h-4" /> {t.bestScore}: {memoryBest}
                      </div>
                    )}
                  </button>

                  {/* Speed Click */}
                  <button
                    onClick={() => setActiveGame("click")}
                    className={`group p-5 ${isDarkMode ? 'bg-green-500/10 border-green-500/20 hover:border-green-500/40' : 'bg-green-50 border-green-200 hover:border-green-400'} rounded-xl border transition-all text-left`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mb-3 shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-bold ${themeClasses.text} mb-1`}>{t.clickGame}</h3>
                    <p className={`text-sm ${themeClasses.textMuted} mb-2`}>{t.clickFast}</p>
                    {clickBest && (
                      <div className="flex items-center gap-1 text-sm text-amber-500">
                        <Trophy className="w-4 h-4" /> {t.bestScore}: {clickBest}
                      </div>
                    )}
                  </button>

                  {/* Tic-Tac-Toe */}
                  <button
                    onClick={() => { initTicTacToe(); setActiveGame("tictactoe"); }}
                    className={`group p-5 ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40' : 'bg-purple-50 border-purple-200 hover:border-purple-400'} rounded-xl border transition-all text-left`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center mb-3 shadow-lg text-white font-bold text-lg">
                      X O
                    </div>
                    <h3 className={`font-bold ${themeClasses.text} mb-1`}>{t.tictactoe}</h3>
                    <p className={`text-sm ${themeClasses.textMuted} mb-2`}>VS CPU</p>
                    {tttWins > 0 && (
                      <div className="flex items-center gap-1 text-sm text-amber-500">
                        <Trophy className="w-4 h-4" /> {t.score}: {tttWins}
                      </div>
                    )}
                  </button>

                  {/* Dice Game */}
                  <button
                    onClick={() => { setDiceResult(null); setActiveGame("dice"); }}
                    className={`group p-5 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40' : 'bg-orange-50 border-orange-200 hover:border-orange-400'} rounded-xl border transition-all text-left`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-3 shadow-lg">
                      <Dice6 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={`font-bold ${themeClasses.text} mb-1`}>{t.diceGame}</h3>
                    <p className={`text-sm ${themeClasses.textMuted} mb-2`}>VS CPU</p>
                    {diceWins > 0 && (
                      <div className="flex items-center gap-1 text-sm text-amber-500">
                        <Trophy className="w-4 h-4" /> {t.score}: {diceWins}
                      </div>
                    )}
                  </button>
                </div>
              ) : activeGame === "memory" ? (
                /* Memory Game */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveGame(null)} className={`text-sm ${themeClasses.textMuted} hover:${themeClasses.accent} flex items-center gap-1`}>
                      ← {t.back}
                    </button>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={themeClasses.textMuted}>{t.moves}: <strong className={themeClasses.accent}>{memoryMoves}</strong></span>
                      {memoryBest && <span className="text-amber-500"><Trophy className="w-4 h-4 inline mr-1" />{memoryBest}</span>}
                    </div>
                  </div>

                  {memoryWon ? (
                    <div className={`text-center py-8 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'} rounded-xl border ${isDarkMode ? 'border-green-500/30' : 'border-green-300'}`}>
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500 animate-bounce" />
                      <h3 className="text-2xl font-bold text-green-500 mb-2">{t.youWon}</h3>
                      <p className="text-green-400 mb-4">{t.moves}: {memoryMoves}</p>
                      <button onClick={initMemoryGame} className="px-6 py-3 bg-green-500 text-white rounded-xl flex items-center gap-2 mx-auto">
                        <RotateCcw className="w-4 h-4" /> {t.playAgain}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                      {memoryCards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleMemoryClick(card.id)}
                          disabled={card.isFlipped || card.isMatched || isChecking}
                          className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                            card.isFlipped || card.isMatched
                              ? isDarkMode ? "bg-slate-700" : "bg-gray-200"
                              : "bg-blue-500 hover:scale-105 cursor-pointer"
                          } ${card.isMatched ? "ring-2 ring-green-500" : ""}`}
                        >
                          {card.isFlipped || card.isMatched ? card.emoji : "?"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeGame === "click" ? (
                /* Speed Click */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => { setActiveGame(null); setClickGameActive(false); setClickScore(0); setClickTimeLeft(10); }} className={`text-sm ${themeClasses.textMuted}`}>
                      ← {t.back}
                    </button>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={themeClasses.textMuted}>{t.score}: <strong className="text-green-500">{clickScore}</strong></span>
                      <span className={`font-bold ${clickTimeLeft <= 3 ? "text-red-500 animate-pulse" : themeClasses.textMuted}`}>
                        {t.timeLeft}: {clickTimeLeft}s
                      </span>
                    </div>
                  </div>

                  <div className={`relative h-72 ${isDarkMode ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl overflow-hidden border ${themeClasses.border}`}>
                    {!clickGameActive && clickTimeLeft === 10 && clickScore === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Target className="w-16 h-16 text-green-500 mb-4" />
                        <button onClick={startClickGame} className="px-8 py-4 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-all">
                          {t.start}
                        </button>
                      </div>
                    ) : !clickGameActive && clickTimeLeft === 0 ? (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-900/80' : 'bg-white/90'} backdrop-blur-sm`}>
                        <Award className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
                        <h3 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>{t.gameOver}</h3>
                        <p className="text-green-500 text-xl mb-4">{t.score}: {clickScore}</p>
                        {clickBest && <p className="text-amber-500 mb-4">{t.bestScore}: {clickBest}</p>}
                        <button onClick={startClickGame} className="px-6 py-3 bg-green-500 text-white rounded-xl flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" /> {t.playAgain}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleTargetClick}
                        style={{ top: `${targetPosition.top}%`, left: `${targetPosition.left}%` }}
                        className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500 shadow-lg hover:scale-110 transition-transform flex items-center justify-center animate-pulse"
                      >
                        <Target className="w-7 h-7 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ) : activeGame === "tictactoe" ? (
                /* Tic-Tac-Toe */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveGame(null)} className={`text-sm ${themeClasses.textMuted}`}>
                      ← {t.back}
                    </button>
                    <span className={`text-sm font-medium ${tttIsXNext ? "text-purple-500" : themeClasses.textMuted}`}>
                      {tttIsXNext ? t.yourTurn : t.cpuTurn}
                    </span>
                  </div>

                  {tttWinner ? (
                    <div className={`text-center py-8 ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} rounded-xl border ${isDarkMode ? 'border-purple-500/30' : 'border-purple-300'}`}>
                      <h3 className={`text-2xl font-bold mb-4 ${tttWinner === "X" ? "text-green-500" : tttWinner === "O" ? "text-red-500" : "text-amber-500"}`}>
                        {tttWinner === "X" ? t.youWon : tttWinner === "O" ? t.youLost : t.draw}
                      </h3>
                      <button onClick={initTicTacToe} className="px-6 py-3 bg-purple-500 text-white rounded-xl flex items-center gap-2 mx-auto">
                        <RotateCcw className="w-4 h-4" /> {t.playAgain}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                      {tttBoard.map((cell, index) => (
                        <button
                          key={index}
                          onClick={() => handleTTTClick(index)}
                          disabled={!!cell || !tttIsXNext}
                          className={`aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition-all ${
                            cell
                              ? cell === "X"
                                ? isDarkMode ? "bg-purple-500/30 text-purple-400" : "bg-purple-100 text-purple-600"
                                : isDarkMode ? "bg-slate-600/30 text-slate-400" : "bg-gray-200 text-gray-600"
                              : isDarkMode ? "bg-slate-700/50 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
                          } cursor-pointer`}
                        >
                          {cell}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Dice Game */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveGame(null)} className={`text-sm ${themeClasses.textMuted}`}>
                      ← {t.back}
                    </button>
                    <span className="text-sm text-amber-500"><Trophy className="w-4 h-4 inline mr-1" />{diceWins}</span>
                  </div>

                  <div className="flex items-center justify-center gap-12 py-8">
                    <div className="text-center">
                      <p className={`text-sm ${themeClasses.textMuted} mb-3`}>You</p>
                      <div className={`w-20 h-20 rounded-xl bg-orange-500 flex items-center justify-center shadow-xl ${isRolling ? "animate-bounce" : ""}`}>
                        <PlayerDiceIcon className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    <span className={`text-2xl ${themeClasses.textMuted}`}>VS</span>

                    <div className="text-center">
                      <p className={`text-sm ${themeClasses.textMuted} mb-3`}>CPU</p>
                      <div className={`w-20 h-20 rounded-xl ${isDarkMode ? 'bg-slate-600' : 'bg-gray-400'} flex items-center justify-center shadow-xl ${isRolling ? "animate-bounce" : ""}`}>
                        <CpuDiceIcon className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </div>

                  {diceResult && (
                    <div className={`text-center text-xl font-bold mb-4 ${
                      diceResult === "win" ? "text-green-500" : diceResult === "lose" ? "text-red-500" : "text-amber-500"
                    }`}>
                      {diceResult === "win" ? t.youWon : diceResult === "lose" ? t.youLost : t.draw}
                    </div>
                  )}

                  <button
                    onClick={rollDice}
                    disabled={isRolling}
                    className="mx-auto flex items-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    {t.roll}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Media Player */}
            <div className={`${themeClasses.bgCard} rounded-2xl border ${themeClasses.border} overflow-hidden`}>
              {/* Tabs */}
              <div className={`flex border-b ${themeClasses.border}`}>
                <button
                  onClick={() => setMediaTab("music")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                    mediaTab === "music"
                      ? `${themeClasses.accent} border-b-2 border-blue-500`
                      : themeClasses.textMuted
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  {t.music}
                </button>
                <button
                  onClick={() => setMediaTab("video")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                    mediaTab === "video"
                      ? `${themeClasses.accent} border-b-2 border-blue-500`
                      : themeClasses.textMuted
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {t.video}
                </button>
              </div>

              <div className="p-4">
                {mediaTab === "music" ? (
                  /* Music Player */
                  <div>
                    {/* Now Playing */}
                    <div className={`${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} rounded-xl p-4 mb-4`}>
                      <p className={`text-xs ${themeClasses.accent} mb-1`}>{t.nowPlaying}</p>
                      <p className={`font-semibold ${themeClasses.text} truncate`}>
                        {musicTracks[currentTrackIndex]?.title || t.noMedia}
                      </p>
                      <p className={`text-sm ${themeClasses.textMuted}`}>
                        {musicTracks[currentTrackIndex]?.artist}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <input
                          type="range"
                          min={0}
                          max={musicDuration || 100}
                          value={musicProgress}
                          onChange={handleSeek}
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className={`flex justify-between mt-1 text-xs ${themeClasses.textMuted}`}>
                          <span>{formatTime(musicProgress)}</span>
                          <span>{formatTime(musicDuration)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <button onClick={prevTrack} className={`p-2 ${themeClasses.textMuted} hover:${themeClasses.text}`}>
                        <SkipBack className="w-5 h-5" />
                      </button>
                      <button
                        onClick={togglePlay}
                        className={`w-12 h-12 rounded-full ${themeClasses.accentBg} flex items-center justify-center text-white shadow-lg hover:opacity-90`}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      <button onClick={nextTrack} className={`p-2 ${themeClasses.textMuted} hover:${themeClasses.text}`}>
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={toggleMute} className={themeClasses.textMuted}>
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={handleVolumeChange}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    {/* Track List */}
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {musicTracks.map((track, index) => (
                        <button
                          key={track.id}
                          onClick={() => { setCurrentTrackIndex(index); setMusicProgress(0); }}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                            index === currentTrackIndex
                              ? isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                              : `${themeClasses.bgCardHover} ${themeClasses.textMuted}`
                          }`}
                        >
                          <Music className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{track.title}</span>
                        </button>
                      ))}
                    </div>

                    {/* Add URL Button */}
                    <button
                      onClick={() => setShowAddUrlModal(true)}
                      className={`w-full mt-3 flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed ${themeClasses.border} ${themeClasses.textMuted} hover:${themeClasses.accent}`}
                    >
                      <Plus className="w-4 h-4" />
                      {t.addUrl}
                    </button>
                  </div>
                ) : (
                  /* Video Player */
                  <div>
                    {activeVideoUrl ? (
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm ${themeClasses.textMuted}`}>{t.nowPlaying}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsVideoFullscreen(!isVideoFullscreen)}
                              className={themeClasses.textMuted}
                            >
                              {isVideoFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setActiveVideoUrl(null)} className={themeClasses.textMuted}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {activeVideoUrl.includes("youtube.com") ? (
                          <iframe
                            src={activeVideoUrl}
                            className={`w-full ${isVideoFullscreen ? 'h-96' : 'h-48'} rounded-xl`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={activeVideoUrl}
                            controls
                            autoPlay
                            className={`w-full ${isVideoFullscreen ? 'h-96' : 'h-48'} rounded-xl bg-black`}
                          />
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className={`text-sm ${themeClasses.textMuted} mb-3`}>{t.enterVideoUrl}</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className={`flex-1 px-3 py-2 rounded-lg ${themeClasses.inputBg} ${themeClasses.text} border ${themeClasses.border} text-sm`}
                          />
                          <button
                            onClick={handleWatchVideo}
                            className={`px-4 py-2 ${themeClasses.accentBg} text-white rounded-lg text-sm flex items-center gap-1`}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Sample Videos */}
                        <div className="mt-4">
                          <p className={`text-xs ${themeClasses.textMuted} mb-2`}>Try these:</p>
                          <div className="space-y-2">
                            {[
                              { title: "Lo-Fi Beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
                              { title: "Nature Sounds", url: "https://www.youtube.com/watch?v=eKFTSSKCzWA" },
                            ].map((video, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setVideoUrl(video.url);
                                  const embed = getYouTubeEmbedUrl(video.url);
                                  if (embed) setActiveVideoUrl(embed);
                                }}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg ${themeClasses.bgCardHover} ${themeClasses.textMuted} text-left text-sm`}
                              >
                                <Video className="w-4 h-4" />
                                {video.title}
                                <ExternalLink className="w-3 h-3 ml-auto" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fun Fact */}
            <div className={`${isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} rounded-2xl border p-5`}>
              <h3 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
                💡 {t.funFact}
              </h3>
              <p className={themeClasses.textSecondary}>
                {facts[currentFactIndex]}
              </p>
            </div>

            {/* Scores */}
            <div className={`${themeClasses.bgCard} rounded-2xl border ${themeClasses.border} p-5`}>
              <h3 className={`font-semibold ${themeClasses.text} mb-4 flex items-center gap-2`}>
                <Trophy className="w-5 h-5 text-amber-500" />
                {t.yourScores}
              </h3>
              <div className="space-y-2">
                {[
                  { name: t.memoryGame, score: memoryBest, color: "blue" },
                  { name: t.clickGame, score: clickBest, color: "green" },
                  { name: t.tictactoe, score: tttWins || null, color: "purple" },
                  { name: t.diceGame, score: diceWins || null, color: "orange" },
                ].map((game, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? `bg-${game.color}-500/10` : `bg-${game.color}-50`}`}>
                    <span className={`text-sm ${themeClasses.textSecondary}`}>{game.name}</span>
                    <span className={`font-bold text-${game.color}-500`}>{game.score || "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add URL Modal */}
      {showAddUrlModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.bgCard} rounded-2xl p-6 w-full max-w-md border ${themeClasses.border}`}>
            <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>{t.addUrl}</h3>
            
            <div className="space-y-4">
              <div>
                <label className={`text-sm ${themeClasses.textMuted} mb-1 block`}>Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Track name"
                  className={`w-full px-3 py-2 rounded-lg ${themeClasses.inputBg} ${themeClasses.text} border ${themeClasses.border}`}
                />
              </div>
              <div>
                <label className={`text-sm ${themeClasses.textMuted} mb-1 block`}>URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3 py-2 rounded-lg ${themeClasses.inputBg} ${themeClasses.text} border ${themeClasses.border}`}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUrlModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg border ${themeClasses.border} ${themeClasses.text}`}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddUrl}
                className={`flex-1 px-4 py-2 rounded-lg ${themeClasses.accentBg} text-white`}
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
