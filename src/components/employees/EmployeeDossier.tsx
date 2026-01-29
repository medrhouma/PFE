"use client"

import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, FileText, Briefcase, Download } from 'lucide-react';
import { getSafeImageSrc } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmployeeDossierProps {
  profile: any;
}

const EmployeeDossier: React.FC<EmployeeDossierProps> = ({ profile }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  if (!profile) return null;

  // Parse autresDocuments si présent (format JSON)
  let autresDocuments: any[] = [];
  try {
    if (profile.autres_documents) {
      autresDocuments = JSON.parse(profile.autres_documents);
    }
  } catch (e) {}

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(
      language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'fr-FR'
    );
  };

  const getLabel = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      personal_info: { fr: 'Informations Personnelles', en: 'Personal Information', ar: 'المعلومات الشخصية' },
      professional_info: { fr: 'Informations Professionnelles', en: 'Professional Information', ar: 'المعلومات المهنية' },
      name: { fr: 'Nom', en: 'Name', ar: 'الاسم' },
      first_name: { fr: 'Prénom', en: 'First Name', ar: 'الاسم الأول' },
      email: { fr: 'Email', en: 'Email', ar: 'البريد الإلكتروني' },
      phone: { fr: 'Téléphone', en: 'Phone', ar: 'الهاتف' },
      address: { fr: 'Adresse', en: 'Address', ar: 'العنوان' },
      birthday: { fr: 'Date de naissance', en: 'Birthday', ar: 'تاريخ الميلاد' },
      gender: { fr: 'Sexe', en: 'Gender', ar: 'الجنس' },
      contract_type: { fr: 'Type de contrat', en: 'Contract Type', ar: 'نوع العقد' },
      hire_date: { fr: "Date d'embauche", en: 'Hire Date', ar: 'تاريخ التوظيف' },
      role: { fr: 'Rôle', en: 'Role', ar: 'الدور' },
      rib: { fr: 'RIB', en: 'Bank Account', ar: 'الحساب البنكي' },
      documents: { fr: 'Documents', en: 'Documents', ar: 'المستندات' },
      view_cv: { fr: 'Voir le CV', en: 'View CV', ar: 'عرض السيرة الذاتية' },
      training_docs: { fr: 'Documents de formation', en: 'Training Documents', ar: 'وثائق التدريب' },
      experience_docs: { fr: 'Expérience professionnelle', en: 'Professional Experience', ar: 'الخبرة المهنية' },
      diplomas: { fr: 'Diplômes & Certifications', en: 'Diplomas & Certifications', ar: 'الشهادات' },
      other_docs: { fr: 'Autres documents', en: 'Other Documents', ar: 'مستندات أخرى' },
      validated_profile: { fr: 'Profil validé', en: 'Validated Profile', ar: 'ملف تم التحقق منه' },
      male: { fr: 'Homme', en: 'Male', ar: 'ذكر' },
      female: { fr: 'Femme', en: 'Female', ar: 'أنثى' },
    };
    return labels[key]?.[language] || labels[key]?.fr || key;
  };

  const getGender = (sexe: string | null) => {
    if (!sexe) return "-";
    if (sexe === 'HOMME' || sexe.toLowerCase() === 'homme') return getLabel('male');
    if (sexe === 'FEMME' || sexe.toLowerCase() === 'femme') return getLabel('female');
    return sexe;
  };

  return (
    <div className={`bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl p-0 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header visuel */}
      <div className="flex flex-col md:flex-row items-center gap-8 px-10 py-10 bg-gradient-to-r from-violet-600 to-purple-700">
        {getSafeImageSrc(profile.photo) ? (
          <img 
            src={getSafeImageSrc(profile.photo)!} 
            alt={`${profile.nom} ${profile.prenom}`} 
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg ${getSafeImageSrc(profile.photo) ? 'hidden' : ''}`}>
          {profile.nom?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className={`flex-1 text-center md:${isRTL ? 'text-right' : 'text-left'}`}>
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{profile.nom} {profile.prenom}</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-wrap justify-center md:justify-start">
            <span className="inline-block px-4 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold shadow-sm">✓ {getLabel('validated_profile')}</span>
            <span className="inline-block px-4 py-1 bg-white/20 text-white rounded-full text-xs font-semibold shadow-sm">{profile.email}</span>
          </div>
        </div>
      </div>

      {/* Infos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-10 py-8 bg-white dark:bg-gray-800">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('birthday')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{formatDate(profile.birthday)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('gender')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{getGender(profile.sexe)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('phone')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.telephone || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('address')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.adresse || '-'}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('contract_type')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.typeContrat || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('rib')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.rib || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">{getLabel('hire_date')}</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{formatDate(profile.dateEmbauche)}</div>
          </div>
        </div>
      </div>

      {/* CV */}
      {profile.cv && (
        <div className="px-10 py-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 border-t border-b border-violet-100 dark:border-violet-900 flex items-center gap-4">
          <span className="font-semibold text-violet-800 dark:text-violet-300">CV :</span>
          <a href={profile.cv} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition">
            <Download className="w-4 h-4" />
            {getLabel('view_cv')}
          </a>
        </div>
      )}

      {/* Documents Formation */}
      {autresDocuments.filter(d => d.type === 'formation').length > 0 && (
        <div className="px-10 py-6 border-b border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <div className="font-bold text-blue-900 dark:text-blue-200 mb-2 text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> {getLabel('training_docs')}
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'formation').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <a href={doc.data} target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-300 underline font-medium hover:text-blue-900 dark:hover:text-white transition">{doc.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Documents Expérience */}
      {autresDocuments.filter(d => d.type === 'experience').length > 0 && (
        <div className="px-10 py-6 border-b border-purple-100 dark:border-purple-900 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
          <div className="font-bold text-purple-900 dark:text-purple-200 mb-2 text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span> {getLabel('experience_docs')}
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'experience').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <a href={doc.data} target="_blank" rel="noopener noreferrer" className="text-purple-700 dark:text-purple-300 underline font-medium hover:text-purple-900 dark:hover:text-white transition">{doc.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Diplômes & Certifications */}
      {autresDocuments.filter(d => d.type === 'diplome').length > 0 && (
        <div className="px-10 py-6 border-b border-emerald-100 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10">
          <div className="font-bold text-emerald-900 dark:text-emerald-200 mb-2 text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> {getLabel('diplomas')}
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'diplome').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <a href={doc.data} target="_blank" rel="noopener noreferrer" className="text-emerald-700 dark:text-emerald-300 underline font-medium hover:text-emerald-900 dark:hover:text-white transition">{doc.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Autres documents */}
      {autresDocuments.filter(d => !d.type || d.type === 'autre').length > 0 && (
        <div className="px-10 py-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="font-bold text-amber-900 dark:text-amber-200 mb-2 text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span> {getLabel('other_docs')}
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => !d.type || d.type === 'autre').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <a href={doc.data} target="_blank" rel="noopener noreferrer" className="text-amber-700 dark:text-amber-300 underline font-medium hover:text-amber-900 dark:hover:text-white transition">{doc.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmployeeDossier;
