'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';

interface DocumentFile {
  name: string;
  type?: 'formation' | 'experience' | 'diplome' | 'autre';
  data: string;
}

interface PendingEmployee {
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

export default function PendingEmployeesList() {
  const [employees, setEmployees] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<PendingEmployee | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadPendingEmployees();
  }, []);

  const loadPendingEmployees = async () => {
    try {
      const response = await fetch('/api/employees/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch pending employees');
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading pending employees:', error);
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les profils en attente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (employeeId: string, action: 'APPROUVE' | 'REJETE') => {
    try {
      let rejectionReason = null;
      
      // Si c'est un rejet, demander la raison
      if (action === 'REJETE') {
        rejectionReason = prompt('Raison du rejet (optionnel):');
        // Si l'utilisateur annule, ne pas continuer
        if (rejectionReason === null) {
          return;
        }
      }

      const response = await fetch(`/api/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          statut: action,
          rejectionReason: rejectionReason || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update employee status');
      }

      showNotification({
        type: 'success',
        title: 'Succès',
        message: action === 'APPROUVE' ? 'Profil approuvé' : 'Profil rejeté'
      });

      // Reload the list
      loadPendingEmployees();
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error updating employee status:', error);
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de mettre à jour le statut'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">Aucun profil en attente de validation</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-violet-600 to-purple-600">
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
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-violet-100 text-violet-800">
                    {employee.typeContrat || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="text-violet-600 hover:text-violet-900"
                  >
                    Voir détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
              <h2 className="text-2xl font-bold">
                {selectedEmployee.prenom} {selectedEmployee.nom}
              </h2>
              <p className="text-violet-100">{selectedEmployee.email}</p>
            </div>
            
            <div className="p-6 space-y-4">
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
              {selectedEmployee.photo && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">Photo</label>
                  <img 
                    src={selectedEmployee.photo} 
                    alt="Photo employé" 
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* CV */}
              {selectedEmployee.cv && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-2">CV</label>
                  <a 
                    href={selectedEmployee.cv} 
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`CV_${selectedEmployee.nom}_${selectedEmployee.prenom}.pdf`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
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
                let allDocs: DocumentFile[] = [];
                
                try {
                  if (selectedEmployee.autres_documents) {
                    allDocs = JSON.parse(selectedEmployee.autres_documents);
                  }
                } catch (e) {}

                const formationDocs = allDocs.filter(d => d.type === 'formation');
                const experienceDocs = allDocs.filter(d => d.type === 'experience');
                const diplomeDocs = allDocs.filter(d => d.type === 'diplome');
                const autresDocs = allDocs.filter(d => !d.type || d.type === 'autre');

                const downloadDoc = (doc: DocumentFile) => {
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

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-6 border-t">
                <button
                  onClick={() => handleAction(selectedEmployee.id, 'APPROUVE')}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✓ Approuver
                </button>
                <button
                  onClick={() => handleAction(selectedEmployee.id, 'REJETE')}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  ✗ Rejeter
                </button>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
