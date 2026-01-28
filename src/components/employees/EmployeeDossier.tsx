import React from 'react';

interface EmployeeDossierProps {
  profile: any;
}

const EmployeeDossier: React.FC<EmployeeDossierProps> = ({ profile }) => {
  if (!profile) return null;

  // Parse autresDocuments si présent (format JSON)
  let autresDocuments: any[] = [];
  try {
    if (profile.autres_documents) {
      autresDocuments = JSON.parse(profile.autres_documents);
    }
  } catch (e) {}

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl p-0 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header visuel */}
      <div className="flex flex-col md:flex-row items-center gap-8 px-10 py-10 bg-gradient-to-r from-violet-600 to-purple-700">
        {profile.photo ? (
          <img src={profile.photo} alt="Photo de profil" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
        ) : (
          <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg">
            {profile.nom?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{profile.nom} {profile.prenom}</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <span className="inline-block px-4 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold shadow-sm">Profil validé</span>
            <span className="inline-block px-4 py-1 bg-white/20 text-white rounded-full text-xs font-semibold shadow-sm">{profile.email}</span>
          </div>
        </div>
      </div>

      {/* Infos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-10 py-8 bg-white dark:bg-gray-800">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Date de naissance</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.birthday ? new Date(profile.birthday).toLocaleDateString('fr-FR') : '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Sexe</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.sexe || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Téléphone</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.telephone || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Adresse</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.adresse || '-'}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Type de contrat</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.typeContrat || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">RIB</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.rib || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wider">Date d'embauche</div>
            <div className="text-lg text-gray-900 dark:text-white font-bold">{profile.dateEmbauche ? new Date(profile.dateEmbauche).toLocaleDateString('fr-FR') : '-'}</div>
          </div>
        </div>
      </div>

      {/* CV */}
      {profile.cv && (
        <div className="px-10 py-6 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 border-t border-b border-violet-100 dark:border-violet-900 flex items-center gap-4">
          <span className="font-semibold text-violet-800 dark:text-violet-300">CV :</span>
          <a href={profile.cv} target="_blank" rel="noopener noreferrer" className="text-violet-700 dark:text-violet-300 underline font-medium hover:text-violet-900 dark:hover:text-white transition">Voir le CV</a>
        </div>
      )}

      {/* Documents Formation */}
      {autresDocuments.filter(d => d.type === 'formation').length > 0 && (
        <div className="px-10 py-6 border-b border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <div className="font-bold text-blue-900 dark:text-blue-200 mb-2 text-lg flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> Documents de formation
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'formation').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
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
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span> Expérience professionnelle
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'experience').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-400"></span>
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
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> Diplômes & Certifications
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => d.type === 'diplome').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
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
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span> Autres documents
          </div>
          <ul className="space-y-2">
            {autresDocuments.filter(d => !d.type || d.type === 'autre').map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
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
