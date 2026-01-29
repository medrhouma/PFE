"use client"

import React from "react";
import { X, User, Mail, Phone, MapPin, Calendar, FileText, Briefcase, Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSafeImageSrc } from "@/lib/utils";

interface UserDossierModalProps {
  user: any;
  onClose: () => void;
}

export default function UserDossierModal({ user, onClose }: UserDossierModalProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  if (!user) return null;

  // Parse autresDocuments if present
  let autresDocuments: any[] = [];
  try {
    if (user.autres_documents) {
      autresDocuments = JSON.parse(user.autres_documents);
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
      close: { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-8">
          <button
            onClick={onClose}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition`}
            aria-label={getLabel('close')}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {getSafeImageSrc(user.photo) ? (
              <img 
                src={getSafeImageSrc(user.photo)!} 
                alt={`${user.nom} ${user.prenom}`}
                className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-xl"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <div className={`w-28 h-28 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold border-4 border-white/30 shadow-xl ${getSafeImageSrc(user.photo) ? 'hidden' : ''}`}>
              {user.nom?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className={`flex-1 text-center md:${isRTL ? 'text-right' : 'text-left'}`}>
              <h2 className="text-3xl font-bold text-white mb-2">
                {user.nom || user.name} {user.prenom || ''}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {user.statut === 'APPROUVE' && (
                  <span className="px-4 py-1.5 bg-green-400/20 text-green-100 rounded-full text-sm font-medium">
                    ✓ {getLabel('validated_profile')}
                  </span>
                )}
                <span className="px-4 py-1.5 bg-white/20 text-white rounded-full text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                {user.role && (
                  <span className="px-4 py-1.5 bg-violet-400/30 text-white rounded-full text-sm font-medium">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Personal Info */}
          <div className="p-8 bg-white dark:bg-gray-800">
            <h3 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white mb-6">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              {getLabel('personal_info')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem 
                icon={<User className="w-4 h-4" />}
                label={getLabel('name')} 
                value={user.nom || user.name || "-"} 
              />
              <InfoItem 
                icon={<User className="w-4 h-4" />}
                label={getLabel('first_name')} 
                value={user.prenom || "-"} 
              />
              <InfoItem 
                icon={<Calendar className="w-4 h-4" />}
                label={getLabel('birthday')} 
                value={formatDate(user.birthday)} 
              />
              <InfoItem 
                icon={<User className="w-4 h-4" />}
                label={getLabel('gender')} 
                value={getGender(user.sexe)} 
              />
              <InfoItem 
                icon={<Phone className="w-4 h-4" />}
                label={getLabel('phone')} 
                value={user.telephone || "-"} 
              />
              <InfoItem 
                icon={<Mail className="w-4 h-4" />}
                label={getLabel('email')} 
                value={user.email || "-"} 
              />
              <div className="md:col-span-2">
                <InfoItem 
                  icon={<MapPin className="w-4 h-4" />}
                  label={getLabel('address')} 
                  value={user.adresse || "-"} 
                />
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="p-8 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <h3 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              {getLabel('professional_info')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoItem 
                icon={<Briefcase className="w-4 h-4" />}
                label={getLabel('contract_type')} 
                value={user.typeContrat || "-"} 
                badge={user.typeContrat === 'CDI' ? 'success' : user.typeContrat === 'CDD' ? 'warning' : undefined}
              />
              <InfoItem 
                icon={<Calendar className="w-4 h-4" />}
                label={getLabel('hire_date')} 
                value={formatDate(user.dateEmbauche)} 
              />
              <InfoItem 
                icon={<User className="w-4 h-4" />}
                label={getLabel('role')} 
                value={user.role || user.user?.roleEnum || "-"} 
              />
              <InfoItem 
                icon={<FileText className="w-4 h-4" />}
                label={getLabel('rib')} 
                value={user.rib || "-"} 
              />
            </div>
          </div>

          {/* Documents */}
          {(user.cv || autresDocuments.length > 0) && (
            <div className="p-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <h3 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white mb-6">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                {getLabel('documents')}
              </h3>

              {user.cv && (
                <a 
                  href={user.cv} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition mb-4"
                >
                  <Download className="w-4 h-4" />
                  {getLabel('view_cv')}
                </a>
              )}

              {/* Training Documents */}
              <DocumentSection 
                title={getLabel('training_docs')}
                documents={autresDocuments.filter(d => d.type === 'formation')}
                color="blue"
              />

              {/* Experience Documents */}
              <DocumentSection 
                title={getLabel('experience_docs')}
                documents={autresDocuments.filter(d => d.type === 'experience')}
                color="purple"
              />

              {/* Diplomas */}
              <DocumentSection 
                title={getLabel('diplomas')}
                documents={autresDocuments.filter(d => d.type === 'diplome')}
                color="emerald"
              />

              {/* Other Documents */}
              <DocumentSection 
                title={getLabel('other_docs')}
                documents={autresDocuments.filter(d => !d.type || d.type === 'autre')}
                color="amber"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition"
          >
            {getLabel('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: 'success' | 'warning' }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 mt-0.5">
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {badge ? (
          <span className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium ${
            badge === 'success' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {value}
          </span>
        ) : (
          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{value}</p>
        )}
      </div>
    </div>
  );
}

function DocumentSection({ title, documents, color }: { title: string; documents: any[]; color: string }) {
  if (documents.length === 0) return null;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  };

  return (
    <div className={`mt-4 p-4 rounded-xl border ${colorClasses[color]}`}>
      <h4 className="font-semibold mb-3">{title}</h4>
      <ul className="space-y-2">
        {documents.map((doc, i) => (
          <li key={i}>
            <a 
              href={doc.data} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:underline"
            >
              <FileText className="w-4 h-4" />
              {doc.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
