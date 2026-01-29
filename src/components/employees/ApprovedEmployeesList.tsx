'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { getSafeImageSrc } from '@/lib/utils';

interface ApprovedEmployee {
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  birthday: string | null;
  sexe: 'HOMME' | 'FEMME' | null;
  rib: string | null;
  adresse: string | null;
  telephone: string | null;
  dateEmbauche: string | null;
  photo: string | null;
  cv: string | null;
  typeContrat: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | null;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  autres_documents?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ApprovedEmployeesList() {
  const [employees, setEmployees] = useState<ApprovedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<ApprovedEmployee | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadApprovedEmployees();
  }, []);

  const loadApprovedEmployees = async () => {
    try {
      const response = await fetch('/api/employees/approved');
      if (!response.ok) {
        throw new Error('Failed to fetch approved employees');
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading approved employees:', error);
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les profils approuvés'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">Aucun profil approuvé</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-green-600 to-emerald-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Téléphone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Type de contrat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {employee.prenom} {employee.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{employee.telephone || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {employee.typeContrat || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium shadow-sm flex items-center gap-1"
                    title="Voir détails complets du profil"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal for Approved Employees */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white flex-shrink-0">
              <h2 className="text-2xl font-bold">
                {selectedEmployee.prenom} {selectedEmployee.nom}
              </h2>
              <p className="text-green-100">{selectedEmployee.email}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Sexe</label>
                  <p className="text-gray-900">{selectedEmployee.sexe || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date de naissance</label>
                  <p className="text-gray-900">
                    {selectedEmployee.birthday ? new Date(selectedEmployee.birthday).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Téléphone</label>
                  <p className="text-gray-900">{selectedEmployee.telephone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">RIB</label>
                  <p className="text-gray-900">{selectedEmployee.rib || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Adresse</label>
                  <p className="text-gray-900">{selectedEmployee.adresse || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date d'embauche</label>
                  <p className="text-gray-900">
                    {selectedEmployee.dateEmbauche ? new Date(selectedEmployee.dateEmbauche).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type de contrat</label>
                  <p className="text-gray-900">{selectedEmployee.typeContrat || 'N/A'}</p>
                </div>
              </div>

              {/* Photo */}
              {getSafeImageSrc(selectedEmployee.photo) && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Photo</label>
                  <img 
                    src={getSafeImageSrc(selectedEmployee.photo)!} 
                    alt="Photo employé" 
                    className="w-32 h-32 object-cover rounded-lg"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* CV */}
              {selectedEmployee.cv && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">CV</label>
                  <a 
                    href={selectedEmployee.cv} 
                    download={`CV_${selectedEmployee.nom}_${selectedEmployee.prenom}.pdf`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Télécharger le CV
                  </a>
                </div>
              )}

              {/* Additional Documents */}
              {(() => {
                let allDocs: any[] = [];
                
                try {
                  if (selectedEmployee.autres_documents) {
                    allDocs = JSON.parse(selectedEmployee.autres_documents);
                  }
                } catch (e) {}

                const formationDocs = allDocs.filter(d => d.type === 'formation');
                const experienceDocs = allDocs.filter(d => d.type === 'experience');
                const diplomeDocs = allDocs.filter(d => d.type === 'diplome');
                const autresDocs = allDocs.filter(d => !d.type || d.type === 'autre');

                const downloadDoc = (doc: any) => {
                  const link = document.createElement('a');
                  link.href = doc.data;
                  link.download = doc.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };

                return (
                  <>
                    {formationDocs.length > 0 && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-500 block mb-3">Formation ({formationDocs.length})</label>
                        <div className="grid grid-cols-1 gap-2">
                          {formationDocs.map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => downloadDoc(doc)}
                              className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                              </div>
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {experienceDocs.length > 0 && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-500 block mb-3">Expérience professionnelle ({experienceDocs.length})</label>
                        <div className="grid grid-cols-1 gap-2">
                          {experienceDocs.map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => downloadDoc(doc)}
                              className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                              </div>
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {diplomeDocs.length > 0 && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-500 block mb-3">Diplômes & Certifications ({diplomeDocs.length})</label>
                        <div className="grid grid-cols-1 gap-2">
                          {diplomeDocs.map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => downloadDoc(doc)}
                              className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                              </div>
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {autresDocs.length > 0 && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-500 block mb-3">Autres documents ({autresDocs.length})</label>
                        <div className="grid grid-cols-1 gap-2">
                          {autresDocs.map((doc, idx) => (
                            <button
                              key={idx}
                              onClick={() => downloadDoc(doc)}
                              className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                              </div>
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Close Button - Fixed at bottom */}
              <div className="sticky bottom-0 bg-white pt-6 border-t mt-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}