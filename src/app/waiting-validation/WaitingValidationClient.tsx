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
  Lightbulb,
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  Trophy,
  RotateCcw,
  User,
  FileText,
  Shield,
  Calendar,
  Building2,
  Zap,
  Target,
  Star,
  Heart,
  Sparkles,
  Timer,
  Award,
  TrendingUp,
  Coffee,
  Music,
  Palette,
  Puzzle,
} from "lucide-react";

interface WaitingValidationClientProps {
  userName: string;
}

// Onboarding steps data
const onboardingSteps = [
  { icon: User, titleFr: "Créer votre compte", titleEn: "Create account", titleAr: "إنشاء حساب", done: true },
  { icon: FileText, titleFr: "Compléter votre profil", titleEn: "Complete profile", titleAr: "إكمال الملف الشخصي", done: true },
  { icon: Clock, titleFr: "Validation RH en cours", titleEn: "HR validation in progress", titleAr: "التحقق من الموارد البشرية", done: false, current: true },
  { icon: Shield, titleFr: "Accès à la plateforme", titleEn: "Platform access", titleAr: "الوصول إلى المنصة", done: false },
  { icon: Calendar, titleFr: "Premier pointage", titleEn: "First check-in", titleAr: "أول تسجيل حضور", done: false },
];

// Fun Facts
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

// Motivational quotes
const quotes = {
  fr: [
    { text: "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès.", author: "Albert Schweitzer" },
    { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
    { text: "L'avenir appartient à ceux qui croient à la beauté de leurs rêves.", author: "Eleanor Roosevelt" },
    { text: "Chaque accomplissement commence par la décision d'essayer.", author: "John F. Kennedy" },
  ],
  en: [
    { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  ],
  ar: [
    { text: "النجاح ليس مفتاح السعادة. السعادة هي مفتاح النجاح.", author: "ألبرت شفايتزر" },
    { text: "الطريقة الوحيدة للقيام بعمل رائع هي أن تحب ما تفعله.", author: "ستيف جوبز" },
    { text: "المستقبل ملك لأولئك الذين يؤمنون بجمال أحلامهم.", author: "إليانور روزفلت" },
    { text: "كل إنجاز يبدأ بقرار المحاولة.", author: "جون ف. كينيدي" },
  ],
};

const translations = {
  fr: {
    greeting: "Bonjour",
    waitingTitle: "Votre profil est en cours de validation",
    waitingDesc: "Notre équipe RH examine votre dossier. Profitez-en pour vous détendre !",
    emailNotice: "Vous recevrez un email dès que votre profil sera validé.",
    profileSubmitted: "Profil soumis",
    awaitingReview: "En révision",
    emailComingSoon: "Email à venir",
    refresh: "Vérifier le statut",
    onboarding: "Votre parcours",
    games: "Mini-jeux",
    discover: "Découvrir",
    inspiration: "Inspiration",
    memoryGame: "Memory",
    clickGame: "Speed Click",
    typingGame: "Dactylographie",
    moves: "Coups",
    bestScore: "Record",
    youWon: "Bravo !",
    playAgain: "Rejouer",
    score: "Score",
    timeLeft: "Temps",
    clickFast: "Cliquez le plus vite possible !",
    gameOver: "Partie terminée !",
    start: "Commencer",
    funFact: "Le saviez-vous ?",
    quote: "Citation du jour",
    nextTip: "Suivant",
    estimatedTime: "Temps estimé : 24-48h",
    relaxMessage: "Détendez-vous, on s'occupe de tout !",
    yourScores: "Vos scores",
    comingSoon: "Bientôt prêt !",
    adventureBegins: "Votre aventure chez SANTEC commence très bientôt...",
    back: "Retour",
    findPairs: "Trouvez les paires cachées",
  },
  en: {
    greeting: "Hello",
    waitingTitle: "Your profile is being validated",
    waitingDesc: "Our HR team is reviewing your application. Take this time to relax!",
    emailNotice: "You will receive an email once your profile is validated.",
    profileSubmitted: "Profile submitted",
    awaitingReview: "Under review",
    emailComingSoon: "Email coming",
    refresh: "Check status",
    onboarding: "Your journey",
    games: "Mini-games",
    discover: "Discover",
    inspiration: "Inspiration",
    memoryGame: "Memory",
    clickGame: "Speed Click",
    typingGame: "Typing",
    moves: "Moves",
    bestScore: "Best",
    youWon: "You won!",
    playAgain: "Play again",
    score: "Score",
    timeLeft: "Time",
    clickFast: "Click as fast as you can!",
    gameOver: "Game over!",
    start: "Start",
    funFact: "Did you know?",
    quote: "Quote of the day",
    nextTip: "Next",
    estimatedTime: "Estimated time: 24-48h",
    relaxMessage: "Relax, we've got this!",
    yourScores: "Your scores",
    comingSoon: "Almost ready!",
    adventureBegins: "Your adventure at SANTEC starts very soon...",
    back: "Back",
    findPairs: "Find the hidden pairs",
  },
  ar: {
    greeting: "مرحبًا",
    waitingTitle: "ملفك الشخصي قيد التحقق",
    waitingDesc: "يقوم فريق الموارد البشرية بمراجعة طلبك. استغل هذا الوقت للاسترخاء!",
    emailNotice: "ستتلقى بريدًا إلكترونيًا بمجرد التحقق من ملفك الشخصي.",
    profileSubmitted: "تم إرسال الملف",
    awaitingReview: "قيد المراجعة",
    emailComingSoon: "البريد قادم",
    refresh: "تحقق من الحالة",
    onboarding: "رحلتك",
    games: "ألعاب مصغرة",
    discover: "اكتشف",
    inspiration: "إلهام",
    memoryGame: "الذاكرة",
    clickGame: "سرعة النقر",
    typingGame: "الكتابة",
    moves: "الحركات",
    bestScore: "الأفضل",
    youWon: "فزت!",
    playAgain: "العب مرة أخرى",
    score: "النتيجة",
    timeLeft: "الوقت",
    clickFast: "انقر بأسرع ما يمكن!",
    gameOver: "انتهت اللعبة!",
    start: "ابدأ",
    funFact: "هل تعلم؟",
    quote: "اقتباس اليوم",
    nextTip: "التالي",
    estimatedTime: "الوقت المقدر: 24-48 ساعة",
    relaxMessage: "استرخِ، نحن نتولى الأمر!",
    yourScores: "نتائجك",
    comingSoon: "جاهز قريبًا!",
    adventureBegins: "مغامرتك في SANTEC تبدأ قريبًا جدًا...",
    back: "رجوع",
    findPairs: "اعثر على الأزواج المخفية",
  },
};

// Memory game emojis
const memoryEmojis = ["🎯", "🚀", "⭐", "🎨", "🎵", "💎"];

// Speed click game target positions
const getRandomPosition = () => ({
  top: Math.random() * 70 + 10,
  left: Math.random() * 70 + 10,
});

export default function WaitingValidationClient({ userName }: WaitingValidationClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const facts = funFacts[language as keyof typeof funFacts] || funFacts.fr;
  const quotesList = quotes[language as keyof typeof quotes] || quotes.fr;

  // State
  const [activeTab, setActiveTab] = useState<"games" | "discover" | "inspiration">("games");
  const [activeGame, setActiveGame] = useState<"memory" | "click" | null>(null);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  
  // Animation states
  const [pulseStatus, setPulseStatus] = useState(true);
  
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

  // Load best scores
  useEffect(() => {
    initMemoryGame();
    const memBest = localStorage.getItem("santec_memory_best");
    const clkBest = localStorage.getItem("santec_click_best");
    if (memBest) setMemoryBest(parseInt(memBest));
    if (clkBest) setClickBest(parseInt(clkBest));
  }, [initMemoryGame]);

  // Rotate facts and quotes
  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % facts.length);
    }, 10000);
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotesList.length);
    }, 15000);
    return () => {
      clearInterval(factInterval);
      clearInterval(quoteInterval);
    };
  }, [facts.length, quotesList.length]);

  // Pulse animation toggle
  useEffect(() => {
    const interval = setInterval(() => setPulseStatus(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

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

  const handleRefresh = () => router.refresh();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-cyan-50/30 dark:from-gray-950 dark:via-violet-950/20 dark:to-cyan-950/20">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-300/20 dark:bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300/20 dark:bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/10 dark:bg-pink-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.greeting} 👋</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{userName}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* Hero Status Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-violet-500/10 border border-gray-200/50 dark:border-gray-800/50">
          {/* Decorative top gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                <div className={`relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 flex items-center justify-center shadow-2xl shadow-orange-500/30 ${pulseStatus ? 'scale-100' : 'scale-95'} transition-transform duration-1000`}>
                  <Clock className="w-12 h-12 text-white" />
                  <div className="absolute inset-0 rounded-3xl bg-white/20 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              {/* Status Text */}
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t.waitingTitle}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t.waitingDesc}</p>
                
                {/* Time estimate badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium">
                  <Timer className="w-4 h-4" />
                  {t.estimatedTime}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-2xl hover:shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] transition-all font-semibold"
              >
                <RefreshCw className="w-5 h-5" />
                {t.refresh}
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
                {onboardingSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                      step.done 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                        : step.current 
                          ? "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400/50" 
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    }`}>
                      <step.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{language === "fr" ? step.titleFr : language === "ar" ? step.titleAr : step.titleEn}</span>
                      {step.done && <CheckCircle className="w-4 h-4" />}
                      {step.current && <Sparkles className="w-4 h-4 animate-pulse" />}
                    </div>
                    {i < onboardingSteps.length - 1 && (
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${step.done ? 'text-emerald-400' : 'text-gray-300 dark:text-gray-600'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Email Notice */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <p className="text-blue-800 dark:text-blue-200 text-sm">{t.emailNotice}</p>
            </div>
          </div>
        </div>

        {/* Interactive Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Games */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-violet-500/5 border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-100 dark:border-gray-800">
              {[
                { id: "games", icon: Gamepad2, label: t.games },
                { id: "discover", icon: Lightbulb, label: t.discover },
                { id: "inspiration", icon: Star, label: t.inspiration },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as "games" | "discover" | "inspiration");
                    setActiveGame(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-900/20 text-violet-700 dark:text-violet-400 border-b-2 border-violet-500"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Games Tab */}
              {activeTab === "games" && (
                <div>
                  {!activeGame ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Memory Game Card */}
                      <button
                        onClick={() => { initMemoryGame(); setActiveGame("memory"); }}
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl border border-violet-200/50 dark:border-violet-700/50 hover:shadow-lg hover:shadow-violet-500/20 hover:scale-[1.02] transition-all text-left"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-300/30 dark:bg-violet-600/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                            <Puzzle className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.memoryGame}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t.findPairs}</p>
                          {memoryBest && (
                            <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                              <Trophy className="w-4 h-4" />
                              {t.bestScore}: {memoryBest}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Speed Click Game Card */}
                      <button
                        onClick={() => setActiveGame("click")}
                        className="group relative overflow-hidden p-6 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-2xl border border-cyan-200/50 dark:border-cyan-700/50 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] transition-all text-left"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-300/30 dark:bg-cyan-600/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30">
                            <Target className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.clickGame}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t.clickFast}</p>
                          {clickBest && (
                            <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                              <Trophy className="w-4 h-4" />
                              {t.bestScore}: {clickBest}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  ) : activeGame === "memory" ? (
                    /* Memory Game */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setActiveGame(null)} className="text-sm text-gray-500 hover:text-violet-600 flex items-center gap-1">
                          <ChevronLeft className="w-4 h-4" /> {t.back}
                        </button>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t.moves}: <strong className="text-violet-600">{memoryMoves}</strong></span>
                          {memoryBest && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Trophy className="w-4 h-4" /> {memoryBest}
                            </span>
                          )}
                        </div>
                      </div>

                      {memoryWon ? (
                        <div className="text-center py-8 px-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg animate-bounce">
                            <Trophy className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">{t.youWon}</h3>
                          <p className="text-emerald-600 dark:text-emerald-300 mb-4">{t.moves}: {memoryMoves}</p>
                          <button onClick={initMemoryGame} className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto">
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
                              className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all duration-300 transform shadow-lg ${
                                card.isFlipped || card.isMatched
                                  ? "bg-white dark:bg-gray-800 scale-100 rotate-0"
                                  : "bg-gradient-to-br from-violet-500 to-purple-600 hover:scale-105 hover:shadow-violet-500/30 cursor-pointer"
                              } ${card.isMatched ? "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" : ""}`}
                            >
                              {card.isFlipped || card.isMatched ? card.emoji : <Sparkles className="w-6 h-6 text-white/60" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Speed Click Game */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => { setActiveGame(null); setClickGameActive(false); setClickScore(0); }} className="text-sm text-gray-500 hover:text-cyan-600 flex items-center gap-1">
                          <ChevronLeft className="w-4 h-4" /> {t.back}
                        </button>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t.score}: <strong className="text-cyan-600">{clickScore}</strong></span>
                          <span className={`font-bold ${clickTimeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`}>
                            {t.timeLeft}: {clickTimeLeft}s
                          </span>
                        </div>
                      </div>

                      <div className="relative h-80 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl overflow-hidden border border-cyan-200/50 dark:border-cyan-700/50">
                        {!clickGameActive && clickTimeLeft === 10 && clickScore === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Target className="w-16 h-16 text-cyan-500 mb-4" />
                            <button
                              onClick={startClickGame}
                              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >
                              {t.start}
                            </button>
                          </div>
                        ) : !clickGameActive && clickTimeLeft === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                            <Award className="w-16 h-16 text-amber-500 mb-4 animate-bounce" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.gameOver}</h3>
                            <p className="text-cyan-600 text-xl mb-4">{t.score}: {clickScore}</p>
                            {clickBest && <p className="text-amber-600 mb-4">{t.bestScore}: {clickBest}</p>}
                            <button
                              onClick={startClickGame}
                              className="px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" /> {t.playAgain}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleTargetClick}
                            style={{ top: `${targetPosition.top}%`, left: `${targetPosition.left}%` }}
                            className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 hover:scale-110 transition-transform flex items-center justify-center animate-pulse"
                          >
                            <Target className="w-8 h-8 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Discover Tab */}
              {activeTab === "discover" && (
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200/50 dark:border-amber-700/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">{t.funFact}</h3>
                        <p className="text-amber-700 dark:text-amber-200 text-lg leading-relaxed">
                          {facts[currentFactIndex]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-700/50">
                      <div className="flex gap-1">
                        {facts.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentFactIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentFactIndex ? "w-6 bg-amber-500" : "bg-amber-300 dark:bg-amber-700 hover:bg-amber-400"}`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentFactIndex((prev) => (prev + 1) % facts.length)}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                      >
                        {t.nextTip} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fun Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-center">
                      <Coffee className="w-8 h-8 mx-auto mb-2 text-violet-600" />
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">☕</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400">Pause café</p>
                    </div>
                    <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-center">
                      <Music className="w-8 h-8 mx-auto mb-2 text-pink-600" />
                      <p className="text-2xl font-bold text-pink-700 dark:text-pink-400">🎵</p>
                      <p className="text-xs text-pink-600 dark:text-pink-400">Musique</p>
                    </div>
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl text-center">
                      <Palette className="w-8 h-8 mx-auto mb-2 text-cyan-600" />
                      <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">🎨</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400">Créativité</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Inspiration Tab */}
              {activeTab === "inspiration" && (
                <div className="space-y-6">
                  <div className="relative p-8 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-fuchsia-900/30 rounded-2xl border border-violet-200/50 dark:border-violet-700/50 overflow-hidden">
                    <div className="absolute top-4 right-4 text-6xl opacity-20">❝</div>
                    <blockquote className="relative">
                      <p className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed mb-4 italic">
                        &ldquo;{quotesList[currentQuoteIndex].text}&rdquo;
                      </p>
                      <footer className="text-violet-600 dark:text-violet-400 font-semibold">
                        — {quotesList[currentQuoteIndex].author}
                      </footer>
                    </blockquote>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-violet-200/50 dark:border-violet-700/50">
                      <div className="flex gap-1">
                        {quotesList.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentQuoteIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentQuoteIndex ? "w-6 bg-violet-500" : "bg-violet-300 dark:bg-violet-700 hover:bg-violet-400"}`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentQuoteIndex((prev) => (prev + 1) % quotesList.length)}
                        className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                      >
                        {t.nextTip} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Relax Card */}
            <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t.relaxMessage}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{t.profileSubmitted}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-100 mt-1">
                <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-sm">{t.awaitingReview}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl shadow-violet-500/5 border border-gray-200/50 dark:border-gray-800/50">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-500" />
                {t.yourScores}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-violet-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Memory</span>
                  </div>
                  <span className="font-bold text-violet-600">{memoryBest || "-"}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Speed Click</span>
                  </div>
                  <span className="font-bold text-cyan-600">{clickBest || "-"}</span>
                </div>
              </div>
            </div>

            {/* Decorative Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-6 text-white">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <Zap className="w-8 h-8 mb-3" />
                <h3 className="font-bold text-lg mb-1">{t.comingSoon}</h3>
                <p className="text-violet-200 text-sm">
                  {t.adventureBegins}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
