"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle, Book, Mail, Phone,
  ChevronDown, ChevronUp, Search,
  Clock, Users, Shield, Settings,
  FileText, Calendar, ArrowLeft, MessageCircle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FAQ {
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
  category: string;
  categoryEn: string;
}

const faqs: FAQ[] = [
  {
    category: "Pointage", categoryEn: "Attendance",
    question: "Comment fonctionne le pointage biométrique ?",
    questionEn: "How does biometric attendance work?",
    answer: "Le pointage biométrique utilise la reconnaissance faciale pour vérifier votre identité. Cliquez sur 'Démarrer la caméra', positionnez votre visage dans le cadre, puis capturez votre photo. Le système vérifie automatiquement votre identité avant d'enregistrer le pointage.",
    answerEn: "Biometric attendance uses facial recognition to verify your identity. Click 'Start camera', position your face in the frame, then capture your photo. The system automatically verifies your identity before recording attendance."
  },
  {
    category: "Pointage", categoryEn: "Attendance",
    question: "Que faire si la caméra ne fonctionne pas ?",
    questionEn: "What if the camera doesn't work?",
    answer: "Si la caméra ne fonctionne pas, assurez-vous d'utiliser HTTPS ou localhost. Vérifiez que vous avez autorisé l'accès à la caméra dans les paramètres de votre navigateur. Vous pouvez également utiliser l'option 'Télécharger une photo' comme alternative.",
    answerEn: "If the camera doesn't work, make sure you're using HTTPS or localhost. Check that you've allowed camera access in your browser settings. You can also use the 'Upload a photo' option as an alternative."
  },
  {
    category: "Pointage", categoryEn: "Attendance",
    question: "Puis-je pointer sans photo ?",
    questionEn: "Can I clock in without a photo?",
    answer: "Oui, vous pouvez utiliser l'option 'Pointer sans photo' mais cela sera enregistré avec un niveau de confiance réduit. Cette option est disponible en cas de problème technique avec la caméra.",
    answerEn: "Yes, you can use the 'Clock in without photo' option but it will be recorded with a reduced confidence level. This option is available in case of technical issues with the camera."
  },
  {
    category: "Congés", categoryEn: "Leave",
    question: "Comment demander un congé ?",
    questionEn: "How do I request leave?",
    answer: "Accédez à la section 'Congés' depuis le menu principal. Cliquez sur 'Nouvelle demande', sélectionnez le type de congé, les dates de début et fin, puis soumettez votre demande. Votre responsable RH recevra une notification.",
    answerEn: "Go to the 'Leave' section from the main menu. Click 'New request', select the leave type, start and end dates, then submit your request. Your HR manager will receive a notification."
  },
  {
    category: "Congés", categoryEn: "Leave",
    question: "Combien de temps pour obtenir une réponse ?",
    questionEn: "How long to get a response?",
    answer: "Les demandes de congés sont généralement traitées dans les 48 heures ouvrées. Vous recevrez une notification dès que votre demande sera validée ou refusée.",
    answerEn: "Leave requests are generally processed within 48 business hours. You will receive a notification as soon as your request is approved or rejected."
  },
  {
    category: "Sécurité", categoryEn: "Security",
    question: "Comment changer mon mot de passe ?",
    questionEn: "How do I change my password?",
    answer: "Allez dans Paramètres > Sécurité > Changer le mot de passe. Entrez votre mot de passe actuel, puis votre nouveau mot de passe (minimum 8 caractères). Confirmez le nouveau mot de passe et cliquez sur 'Modifier'.",
    answerEn: "Go to Settings > Security > Change password. Enter your current password, then your new password (minimum 8 characters). Confirm the new password and click 'Change'."
  },
  {
    category: "Sécurité", categoryEn: "Security",
    question: "Qu'est-ce qu'un appareil de confiance ?",
    questionEn: "What is a trusted device?",
    answer: "Un appareil de confiance est un appareil que vous avez utilisé pour vous connecter et qui a été vérifié avec succès. Ces appareils sont reconnus et peuvent accéder à votre compte avec des contrôles de sécurité simplifiés.",
    answerEn: "A trusted device is a device you've used to log in and that has been successfully verified. These devices are recognized and can access your account with simplified security checks."
  },
  {
    category: "Profil", categoryEn: "Profile",
    question: "Comment modifier ma photo de profil ?",
    questionEn: "How do I change my profile picture?",
    answer: "Cliquez sur votre avatar en haut à droite, puis sur 'Mon Profil'. Cliquez ensuite sur 'Modifier photo' pour télécharger une nouvelle image ou prendre une photo avec votre caméra.",
    answerEn: "Click your avatar in the top right, then 'My Profile'. Click 'Change photo' to upload a new image or take a photo with your camera."
  },
];

const docCards = [
  { icon: <Clock className="w-6 h-6" />, titleFr: "Guide Pointage", titleEn: "Attendance Guide", descFr: "Tout savoir sur le système de pointage", descEn: "Everything about the attendance system", href: "/pointage", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
  { icon: <Calendar className="w-6 h-6" />, titleFr: "Gestion des congés", titleEn: "Leave Management", descFr: "Comment demander et gérer vos congés", descEn: "How to request and manage your leave", href: "/conges", color: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" },
  { icon: <Shield className="w-6 h-6" />, titleFr: "Sécurité du compte", titleEn: "Account Security", descFr: "Protéger et sécuriser votre compte", descEn: "Protect and secure your account", href: "/settings?tab=security", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
  { icon: <Settings className="w-6 h-6" />, titleFr: "Paramètres", titleEn: "Settings", descFr: "Personnaliser votre expérience", descEn: "Customize your experience", href: "/settings", color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const categories = [...new Set(faqs.map(faq => isEn ? faq.categoryEn : faq.category))];

  const filteredFaqs = faqs.filter(faq => {
    const q = isEn ? faq.questionEn : faq.question;
    const a = isEn ? faq.answerEn : faq.answer;
    const cat = isEn ? faq.categoryEn : faq.category;
    const matchesSearch = searchQuery === "" ||
      q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || cat === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const map: Record<string, React.ReactNode> = {
      "Pointage": <Clock className="w-4 h-4" />, "Attendance": <Clock className="w-4 h-4" />,
      "Congés": <Calendar className="w-4 h-4" />, "Leave": <Calendar className="w-4 h-4" />,
      "Sécurité": <Shield className="w-4 h-4" />, "Security": <Shield className="w-4 h-4" />,
      "Profil": <Users className="w-4 h-4" />, "Profile": <Users className="w-4 h-4" />,
    };
    return map[category] || <HelpCircle className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-7 h-7 text-blue-600" />
              {isEn ? "Help & Support" : "Aide & Support"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {isEn ? "Find answers to your questions or contact our support team" : "Trouvez des réponses à vos questions ou contactez notre équipe support"}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search for a question..." : "Rechercher une question..."}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Documentation Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            {isEn ? "Quick Guides" : "Guides rapides"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {docCards.map((card, i) => (
              <Link
                key={i}
                href={card.href}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                  {card.icon}
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isEn ? card.titleEn : card.titleFr}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isEn ? card.descEn : card.descFr}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {t("all")}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                selectedCategory === category
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {getCategoryIcon(category)}
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Book className="w-5 h-5 text-blue-600" />
              {t("faq")}
            </h2>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("no_results")}</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="group">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {isEn ? faq.categoryEn : faq.category}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {isEn ? faq.questionEn : faq.question}
                      </span>
                    </div>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-5 pb-4 ml-[72px] text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {isEn ? faq.answerEn : faq.answer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                {isEn ? "Need more help?" : "Besoin d'aide supplémentaire ?"}
              </h3>
              <p className="text-blue-100 text-sm">
                {isEn
                  ? "Our support team is available to help you Monday to Friday, 9am to 6pm."
                  : "Notre équipe support est disponible pour vous aider du lundi au vendredi, de 9h à 18h."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@santec-rh.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-sm font-medium backdrop-blur-sm"
              >
                <Mail className="w-4 h-4" />
                support@santec-rh.com
              </a>
              <a
                href="tel:+21612345678"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl transition-colors text-sm font-medium backdrop-blur-sm"
              >
                <Phone className="w-4 h-4" />
                +216 12 345 678
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
