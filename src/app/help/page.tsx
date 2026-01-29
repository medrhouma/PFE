"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiHelpCircle, FiBook, FiMessageCircle, FiMail, FiPhone,
  FiChevronDown, FiChevronUp, FiSearch, FiExternalLink,
  FiCamera, FiClock, FiUsers, FiShield, FiSettings
} from "react-icons/fi";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: "Pointage",
    question: "Comment fonctionne le pointage biométrique ?",
    answer: "Le pointage biométrique utilise la reconnaissance faciale pour vérifier votre identité. Cliquez sur 'Démarrer la caméra', positionnez votre visage dans le cadre, puis capturez votre photo. Le système vérifie automatiquement votre identité avant d'enregistrer le pointage."
  },
  {
    category: "Pointage",
    question: "Que faire si la caméra ne fonctionne pas ?",
    answer: "Si la caméra ne fonctionne pas, assurez-vous d'utiliser HTTPS ou localhost. Vérifiez que vous avez autorisé l'accès à la caméra dans les paramètres de votre navigateur. Vous pouvez également utiliser l'option 'Télécharger une photo' comme alternative."
  },
  {
    category: "Pointage",
    question: "Puis-je pointer sans photo ?",
    answer: "Oui, vous pouvez utiliser l'option 'Pointer sans photo' mais cela sera enregistré avec un niveau de confiance réduit. Cette option est disponible en cas de problème technique avec la caméra."
  },
  {
    category: "Congés",
    question: "Comment demander un congé ?",
    answer: "Accédez à la section 'Congés' depuis le menu principal. Cliquez sur 'Nouvelle demande', sélectionnez le type de congé, les dates de début et fin, puis soumettez votre demande. Votre responsable RH recevra une notification."
  },
  {
    category: "Congés",
    question: "Combien de temps pour obtenir une réponse ?",
    answer: "Les demandes de congés sont généralement traitées dans les 48 heures ouvrées. Vous recevrez une notification dès que votre demande sera validée ou refusée."
  },
  {
    category: "Sécurité",
    question: "Comment changer mon mot de passe ?",
    answer: "Allez dans Paramètres > Sécurité > Changer le mot de passe. Entrez votre mot de passe actuel, puis votre nouveau mot de passe (minimum 8 caractères). Confirmez le nouveau mot de passe et cliquez sur 'Modifier'."
  },
  {
    category: "Sécurité",
    question: "Qu'est-ce qu'un appareil de confiance ?",
    answer: "Un appareil de confiance est un appareil que vous avez utilisé pour vous connecter et qui a été vérifié avec succès. Ces appareils sont reconnus et peuvent accéder à votre compte avec des contrôles de sécurité simplifiés."
  },
  {
    category: "Profil",
    question: "Comment modifier ma photo de profil ?",
    answer: "Cliquez sur votre avatar en haut à droite, puis sur 'Mon Profil'. Cliquez ensuite sur 'Modifier photo' pour télécharger une nouvelle image ou prendre une photo avec votre caméra."
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(faqs.map(faq => faq.category))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === "" || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Pointage": return <FiClock className="w-4 h-4" />;
      case "Congés": return <FiUsers className="w-4 h-4" />;
      case "Sécurité": return <FiShield className="w-4 h-4" />;
      case "Profil": return <FiSettings className="w-4 h-4" />;
      default: return <FiHelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FiHelpCircle className="w-8 h-8 text-violet-600" />
            Aide & Support
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Trouvez des réponses à vos questions ou contactez notre équipe support
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/pointage"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                <FiCamera className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Guide Pointage</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Comment pointer</p>
              </div>
            </div>
          </Link>
          <Link
            href="/settings"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <FiSettings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Paramètres</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configurer le compte</p>
              </div>
            </div>
          </Link>
          <a
            href="mailto:support@santec-ai.com"
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <FiMail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Contact Support</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Envoyer un email</p>
              </div>
            </div>
          </a>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une question..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-violet-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Tous
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                selectedCategory === category
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {getCategoryIcon(category)}
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiBook className="w-5 h-5 text-violet-600" />
              Questions fréquentes
            </h2>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <FiHelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune question trouvée pour "{searchQuery}"</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="p-4">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {faq.category}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>
                    {expandedFaq === index ? (
                      <FiChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="mt-3 pl-[72px] text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-2">Besoin d'aide supplémentaire ?</h3>
          <p className="opacity-90 mb-4">
            Notre équipe support est disponible pour vous aider du lundi au vendredi, de 9h à 18h.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:support@santec-ai.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <FiMail className="w-4 h-4" />
              support@santec-ai.com
            </a>
            <a
              href="tel:+21612345678"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <FiPhone className="w-4 h-4" />
              +216 12 345 678
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
