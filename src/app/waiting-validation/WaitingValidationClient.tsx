"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Clock,
  CheckCircle,
  Mail,
  RefreshCw,
  BookOpen,
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

// HR Tips
const hrTips = {
  fr: [
    "💡 Astuce : Gardez toujours vos informations de contact à jour pour recevoir les notifications importantes.",
    "📅 Planifiez vos congés à l'avance pour faciliter l'organisation de votre équipe.",
    "🔐 Utilisez un mot de passe fort et unique pour protéger votre compte.",
    "📱 Activez les notifications push pour ne manquer aucune information importante.",
    "⏰ Pointez régulièrement pour un suivi précis de vos heures de travail.",
    "📄 Signez vos contrats numériquement dès leur réception pour éviter les retards.",
    "🎯 Consultez régulièrement vos objectifs et évaluations dans votre espace personnel.",
    "🤝 Utilisez le chatbot pour des réponses rapides à vos questions RH courantes.",
  ],
  en: [
    "💡 Tip: Always keep your contact information up to date to receive important notifications.",
    "📅 Plan your leave in advance to help your team organize better.",
    "🔐 Use a strong and unique password to protect your account.",
    "📱 Enable push notifications to never miss important information.",
    "⏰ Clock in regularly for accurate tracking of your work hours.",
    "📄 Sign your contracts digitally upon receipt to avoid delays.",
    "🎯 Regularly check your goals and evaluations in your personal space.",
    "🤝 Use the chatbot for quick answers to common HR questions.",
  ],
  ar: [
    "💡 نصيحة: احتفظ دائمًا بمعلومات الاتصال الخاصة بك محدثة لتلقي الإشعارات المهمة.",
    "📅 خطط لإجازاتك مسبقًا لمساعدة فريقك على التنظيم بشكل أفضل.",
    "🔐 استخدم كلمة مرور قوية وفريدة لحماية حسابك.",
    "📱 فعّل الإشعارات الفورية حتى لا تفوتك أي معلومات مهمة.",
    "⏰ سجل حضورك بانتظام لتتبع دقيق لساعات عملك.",
    "📄 وقّع عقودك رقميًا فور استلامها لتجنب التأخير.",
    "🎯 راجع أهدافك وتقييماتك بانتظام في مساحتك الشخصية.",
    "🤝 استخدم روبوت الدردشة للحصول على إجابات سريعة لأسئلة الموارد البشرية الشائعة.",
  ],
};

// Articles
const articles = {
  fr: [
    {
      title: "Bienvenue chez SANTEC",
      content: "Découvrez notre culture d'entreprise axée sur l'innovation, le respect et la collaboration. Chez SANTEC, chaque collaborateur est valorisé et contribue à notre succès collectif.",
      readTime: "3 min",
    },
    {
      title: "Guide du nouvel employé",
      content: "Ce guide vous accompagnera dans vos premiers pas au sein de l'entreprise. Vous y trouverez les informations essentielles sur nos processus, nos outils et notre organisation.",
      readTime: "5 min",
    },
    {
      title: "Nos valeurs fondamentales",
      content: "L'intégrité, l'excellence et l'esprit d'équipe sont au cœur de notre identité. Ces valeurs guident nos décisions quotidiennes et façonnent notre avenir commun.",
      readTime: "4 min",
    },
  ],
  en: [
    {
      title: "Welcome to SANTEC",
      content: "Discover our company culture focused on innovation, respect, and collaboration. At SANTEC, every employee is valued and contributes to our collective success.",
      readTime: "3 min",
    },
    {
      title: "New Employee Guide",
      content: "This guide will help you through your first steps in the company. You'll find essential information about our processes, tools, and organization.",
      readTime: "5 min",
    },
    {
      title: "Our Core Values",
      content: "Integrity, excellence, and teamwork are at the heart of our identity. These values guide our daily decisions and shape our shared future.",
      readTime: "4 min",
    },
  ],
  ar: [
    {
      title: "مرحبًا بك في SANTEC",
      content: "اكتشف ثقافة شركتنا التي تركز على الابتكار والاحترام والتعاون. في SANTEC، كل موظف مُقدَّر ويساهم في نجاحنا الجماعي.",
      readTime: "3 دقائق",
    },
    {
      title: "دليل الموظف الجديد",
      content: "سيساعدك هذا الدليل خلال خطواتك الأولى في الشركة. ستجد معلومات أساسية حول عملياتنا وأدواتنا ومؤسستنا.",
      readTime: "5 دقائق",
    },
    {
      title: "قيمنا الأساسية",
      content: "النزاهة والتميز وروح الفريق هي جوهر هويتنا. هذه القيم توجه قراراتنا اليومية وتشكل مستقبلنا المشترك.",
      readTime: "4 دقائق",
    },
  ],
};

const translations = {
  fr: {
    greeting: "Bonjour",
    waitingTitle: "En attente de validation",
    waitingDesc: "Votre profil a été soumis avec succès. Il est actuellement en cours de révision par l'équipe RH.",
    emailNotice: "Vous recevrez une notification par email dès que votre profil sera validé.",
    profileSubmitted: "Profil soumis",
    awaitingReview: "En attente de révision",
    emailComingSoon: "Notification par email à venir",
    refresh: "Actualiser le statut",
    onboarding: "Votre parcours d'intégration",
    tips: "Conseils RH",
    articles: "À découvrir",
    readMore: "Lire la suite",
    playGame: "Mini-jeu",
    memoryGame: "Jeu de mémoire",
    moves: "Coups",
    bestScore: "Meilleur score",
    youWon: "Bravo ! Vous avez gagné !",
    playAgain: "Rejouer",
    nextTip: "Conseil suivant",
    prevTip: "Conseil précédent",
  },
  en: {
    greeting: "Hello",
    waitingTitle: "Awaiting Validation",
    waitingDesc: "Your profile has been successfully submitted. It is currently under review by the HR team.",
    emailNotice: "You will receive an email notification once your profile is validated.",
    profileSubmitted: "Profile submitted",
    awaitingReview: "Awaiting review",
    emailComingSoon: "Email notification coming soon",
    refresh: "Refresh status",
    onboarding: "Your onboarding journey",
    tips: "HR Tips",
    articles: "Discover",
    readMore: "Read more",
    playGame: "Mini-game",
    memoryGame: "Memory Game",
    moves: "Moves",
    bestScore: "Best score",
    youWon: "Congratulations! You won!",
    playAgain: "Play again",
    nextTip: "Next tip",
    prevTip: "Previous tip",
  },
  ar: {
    greeting: "مرحبًا",
    waitingTitle: "في انتظار التحقق",
    waitingDesc: "تم إرسال ملفك الشخصي بنجاح. يتم مراجعته حاليًا من قبل فريق الموارد البشرية.",
    emailNotice: "ستتلقى إشعارًا عبر البريد الإلكتروني بمجرد التحقق من ملفك الشخصي.",
    profileSubmitted: "تم إرسال الملف الشخصي",
    awaitingReview: "في انتظار المراجعة",
    emailComingSoon: "إشعار البريد الإلكتروني قادم قريبًا",
    refresh: "تحديث الحالة",
    onboarding: "رحلة التأهيل الخاصة بك",
    tips: "نصائح الموارد البشرية",
    articles: "اكتشف",
    readMore: "اقرأ المزيد",
    playGame: "لعبة صغيرة",
    memoryGame: "لعبة الذاكرة",
    moves: "الحركات",
    bestScore: "أفضل نتيجة",
    youWon: "مبروك! لقد فزت!",
    playAgain: "العب مرة أخرى",
    nextTip: "النصيحة التالية",
    prevTip: "النصيحة السابقة",
  },
};

// Memory game emojis (pairs)
const gameEmojis = ["🏢", "📊", "💼", "🎯", "🚀", "⭐"];

export default function WaitingValidationClient({ userName }: WaitingValidationClientProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.fr;
  const tips = hrTips[language as keyof typeof hrTips] || hrTips.fr;
  const articlesList = articles[language as keyof typeof articles] || articles.fr;

  // State
  const [activeTab, setActiveTab] = useState<"tips" | "articles" | "game">("tips");
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  
  // Memory Game State
  const [cards, setCards] = useState<{ id: number; emoji: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Initialize game
  const initializeGame = useCallback(() => {
    const shuffledEmojis = [...gameEmojis, ...gameEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setIsWon(false);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    initializeGame();
    // Load best score from localStorage
    const saved = localStorage.getItem("santec_memory_best");
    if (saved) setBestScore(parseInt(saved));
  }, [initializeGame]);

  // Handle card click
  const handleCardClick = (id: number) => {
    if (isChecking || isWon) return;
    if (flippedCards.length === 2) return;
    if (cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsChecking(true);

      setTimeout(() => {
        const [first, second] = newFlipped;
        if (cards[first].emoji === cards[second].emoji) {
          // Match found
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);

          // Check if won
          if (matchedCards.every((c) => c.isMatched)) {
            setIsWon(true);
            const newMoves = moves + 1;
            if (!bestScore || newMoves < bestScore) {
              setBestScore(newMoves);
              localStorage.setItem("santec_memory_best", newMoves.toString());
            }
          }
        } else {
          // No match
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
        }
        setFlippedCards([]);
        setIsChecking(false);
      }, 800);
    }
  };

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.greeting}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{userName}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-violet-500/5 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.waitingTitle}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t.waitingDesc}</p>
              </div>
            </div>

            {/* Email Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-200">{t.emailNotice}</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-300">{t.profileSubmitted}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-gray-600 dark:text-gray-300">{t.awaitingReview}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{t.emailComingSoon}</span>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/30"
            >
              <RefreshCw className="w-4 h-4" />
              {t.refresh}
            </button>
          </div>

          {/* Onboarding Steps */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t.onboarding}</h3>
            <div className="flex flex-wrap gap-2">
              {onboardingSteps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    step.done
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : step.current
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <step.icon className="w-4 h-4" />
                  <span>
                    {language === "fr" ? step.titleFr : language === "ar" ? step.titleAr : step.titleEn}
                  </span>
                  {step.done && <CheckCircle className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Content Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-violet-500/5 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("tips")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === "tips"
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-b-2 border-violet-600"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              {t.tips}
            </button>
            <button
              onClick={() => setActiveTab("articles")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === "articles"
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-b-2 border-violet-600"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {t.articles}
            </button>
            <button
              onClick={() => setActiveTab("game")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === "game"
                  ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-b-2 border-violet-600"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              {t.playGame}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Tips Tab */}
            {activeTab === "tips" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-violet-100 dark:border-violet-800">
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                    {tips[currentTipIndex]}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {tips.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTipIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentTipIndex
                            ? "bg-violet-600"
                            : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length)}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                      title={t.prevTip}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentTipIndex((prev) => (prev + 1) % tips.length)}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                      title={t.nextTip}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Articles Tab */}
            {activeTab === "articles" && (
              <div className="space-y-4">
                {articlesList.map((article, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedArticle(expandedArticle === index ? null : index)}
                    >
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{article.title}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{article.readTime}</span>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedArticle === index ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                    {expandedArticle === index && (
                      <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed animate-fadeIn">
                        {article.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Memory Game Tab */}
            {activeTab === "game" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-violet-600" />
                    {t.memoryGame}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t.moves}: <strong className="text-violet-600">{moves}</strong>
                    </span>
                    {bestScore && (
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        {t.bestScore}: <strong className="text-amber-600">{bestScore}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {isWon ? (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-8 text-center border border-green-200 dark:border-green-800">
                    <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">{t.youWon}</h3>
                    <p className="text-green-600 dark:text-green-300 mb-4">
                      {t.moves}: {moves}
                    </p>
                    <button
                      onClick={initializeGame}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors mx-auto"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t.playAgain}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
                    {cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => handleCardClick(card.id)}
                        disabled={card.isFlipped || card.isMatched || isChecking}
                        className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 transform ${
                          card.isFlipped || card.isMatched
                            ? "bg-violet-100 dark:bg-violet-900/50 rotate-0 scale-100"
                            : "bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-105 cursor-pointer"
                        } ${card.isMatched ? "ring-2 ring-green-500 bg-green-100 dark:bg-green-900/50" : ""}`}
                      >
                        {card.isFlipped || card.isMatched ? card.emoji : "?"}
                      </button>
                    ))}
                  </div>
                )}

                {!isWon && (
                  <div className="text-center">
                    <button
                      onClick={initializeGame}
                      className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 inline mr-1" />
                      {t.playAgain}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
