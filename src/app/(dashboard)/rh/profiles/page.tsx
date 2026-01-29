'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { User, Calendar, Mail, Phone, MapPin, FileText, CheckCircle, XCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { getSafeImageSrc } from '@/lib/utils';

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

export default function ProfilesValidationPage() {
  const [employees, setEmployees] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<PendingEmployee | null>(null);
  const [processing, setProcessing] = useState(false);
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
      setProcessing(true);
      let rejectionReason = null;
      
      // Si c'est un rejet, demander la raison
      if (action === 'REJETE') {
        rejectionReason = prompt('Raison du rejet (optionnel):');
        // Si l'utilisateur annule, ne pas continuer
        if (rejectionReason === null) {
          setProcessing(false);
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
        message: action === 'APPROUVE' ? 'Profil approuvé avec succès' : 'Profil rejeté'
      });

      // Reload the list
      await loadPendingEmployees();
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error updating employee status:', error);
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de mettre à jour le statut'
      });
    } finally {
      setProcessing(false);
    }
  };

  const parseDocuments = (docsString: string | undefined): DocumentFile[] => {
    if (!docsString) return [];
    try {
      return JSON.parse(docsString);
    } catch (e) {
      return [];
    }
  };

  const getDocumentIcon = (type?: string) => {
    return <FileText className="w-4 h-4" />;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Non spécifié';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Validation des Profils</h1>
        <p className="text-orange-100">
          Approuver ou rejeter les profils en attente de validation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{employees.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profils en attente de validation
          </h2>
        </div>

        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun profil en attente de validation</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Photo */}
                      <div className="relative">
                        {getSafeImageSrc(employee.photo) ? (
                          <img
                            src={getSafeImageSrc(employee.photo)!}
                            alt={`${employee.prenom} ${employee.nom}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl border-2 border-gray-200 dark:border-gray-600 ${getSafeImageSrc(employee.photo) ? 'hidden' : ''}`}>
                          {employee.prenom?.charAt(0)}{employee.nom?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {employee.prenom} {employee.nom}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {employee.email}
                          </div>
                          
                          {employee.telephone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {employee.telephone}
                            </div>
                          )}
                          
                          {employee.birthday && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(employee.birthday)}
                            </div>
                          )}
                          
                          {employee.adresse && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {employee.adresse}
                            </div>
                          )}
                        </div>

                        {/* Additional Info */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {employee.typeContrat && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded">
                              {employee.typeContrat}
                            </span>
                          )}
                          
                          {employee.sexe && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs rounded">
                              {employee.sexe}
                            </span>
                          )}
                          
                          {employee.dateEmbauche && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded">
                              Embauche: {formatDate(employee.dateEmbauche)}
                            </span>
                          )}
                          
                          {employee.cv && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              CV disponible
                            </span>
                          )}
                        </div>

                        {/* Documents */}
                        {employee.autres_documents && parseDocuments(employee.autres_documents).length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Documents ({parseDocuments(employee.autres_documents).length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {parseDocuments(employee.autres_documents).map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={doc.data}
                                  download={doc.name}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                  {getDocumentIcon(doc.type)}
                                  {doc.name}
                                  <Download className="w-3 h-3 ml-1" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleAction(employee.id, 'APPROUVE')}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approuver
                      </button>
                      
                      <button
                        onClick={() => handleAction(employee.id, 'REJETE')}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Détails du profil
              </h3>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Photo et nom */}
              <div className="flex items-center gap-4">
                {getSafeImageSrc(selectedEmployee.photo) ? (
                  <img
                    src={getSafeImageSrc(selectedEmployee.photo)!}
                    alt={`${selectedEmployee.prenom} ${selectedEmployee.nom}`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-gray-200 dark:border-gray-600 ${getSafeImageSrc(selectedEmployee.photo) ? 'hidden' : ''}`}>
                  {selectedEmployee.prenom?.charAt(0)}{selectedEmployee.nom?.charAt(0)}
                </div>
                
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedEmployee.prenom} {selectedEmployee.nom}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedEmployee.email}</p>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.telephone || 'Non spécifié'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date de naissance</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(selectedEmployee.birthday)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sexe</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.sexe || 'Non spécifié'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type de contrat</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.typeContrat || 'Non spécifié'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date d'embauche</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(selectedEmployee.dateEmbauche)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">RIB</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.rib || 'Non spécifié'}</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adresse</label>
                  <p className="text-gray-900 dark:text-white">{selectedEmployee.adresse || 'Non spécifié'}</p>
                </div>
              </div>

              {/* CV */}
              {selectedEmployee.cv && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">CV</label>
                  <a
                    href={selectedEmployee.cv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le CV
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    handleAction(selectedEmployee.id, 'APPROUVE');
                  }}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approuver ce profil
                </button>
                
                <button
                  onClick={() => {
                    handleAction(selectedEmployee.id, 'REJETE');
                  }}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-5 h-5" />
                  Rejeter ce profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

