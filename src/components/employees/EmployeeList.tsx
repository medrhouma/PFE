"use client";

import { useState, useEffect } from "react";
import { FiUser, FiMail, FiPhone, FiBriefcase, FiX, FiFileText, FiMapPin, FiCalendar } from "react-icons/fi";

interface Employee {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  birthday: string | null;
  sexe: string | null;
  rib: string | null;
  adresse: string | null;
  telephone: string | null;
  dateEmbauche: string | null;
  photo: string | null;
  cv: string | null;
  typeContrat: string | null;
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
    roleEnum: string;
    isActive: boolean;
    createdAt: string;
  };
}

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      setError("Erreur lors du chargement des employés");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FiBriefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Liste des Employés
              </h2>
              <p className="text-violet-100 text-sm mt-1">
                {employees.length} employé{employees.length > 1 ? 's' : ''} enregistré{employees.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white/20 rounded-lg">
            <span className="text-2xl font-bold text-white">{employees.length}</span>
          </div>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 px-8 text-gray-500 dark:text-gray-400">
          <FiUser className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg">Aucun employé trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto p-6">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Nom & Prénom
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type Contrat
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Date Embauche
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {employee.photo ? (
                      <img
                        src={employee.photo}
                        alt={`${employee.nom} ${employee.prenom}`}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {employee.nom?.[0]}{employee.prenom?.[0]}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {employee.nom} {employee.prenom}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {employee.email || employee.user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {employee.telephone || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.typeContrat === "CDI"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : employee.typeContrat === "CDD"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : employee.typeContrat === "Stage"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}>
                      {employee.typeContrat || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(employee.dateEmbauche)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.user.roleEnum === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        : employee.user.roleEnum === "RH"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}>
                      {employee.user.roleEnum}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                    >
                      <FiUser className="w-4 h-4" />
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header with gradient */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6 flex justify-between items-start sticky top-0">
              <div className="flex items-center gap-4">
                {selectedEmployee.photo ? (
                  <img
                    src={selectedEmployee.photo}
                    alt={`${selectedEmployee.nom} ${selectedEmployee.prenom}`}
                    className="h-16 w-16 rounded-full object-cover border-4 border-white/30"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                    <FiUser className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {selectedEmployee.nom} {selectedEmployee.prenom}
                  </h3>
                  <p className="text-violet-100 text-sm mt-1">Profil Employé Complet</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiX className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                    <FiUser className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informations Personnelles
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</span>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.nom || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prénom</span>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.prenom || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date de naissance</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{formatDate(selectedEmployee.birthday)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sexe</span>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.sexe || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiPhone className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Téléphone</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.telephone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-start gap-2">
                    <FiMapPin className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-1" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Adresse</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.adresse || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                    <FiBriefcase className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informations Professionnelles
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type de contrat</span>
                    <p className="mt-2">
                      <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                        selectedEmployee.typeContrat === "CDI"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : selectedEmployee.typeContrat === "CDD"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : selectedEmployee.typeContrat === "Stage"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {selectedEmployee.typeContrat || "N/A"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date d'embauche</span>
                      <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{formatDate(selectedEmployee.dateEmbauche)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rôle</span>
                    <p className="mt-2">
                      <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                        selectedEmployee.user.roleEnum === "SUPER_ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : selectedEmployee.user.roleEnum === "RH"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {selectedEmployee.user.roleEnum}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</span>
                    <p className="mt-2">
                      <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                        selectedEmployee.user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {selectedEmployee.user.isActive ? "Actif" : "Inactif"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                    <FiFileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informations Bancaires
                  </h4>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">RIB</span>
                  <p className="text-base font-mono font-medium text-gray-900 dark:text-white mt-1">{selectedEmployee.rib || "N/A"}</p>
                </div>
              </div>

              {/* Documents */}
              {selectedEmployee.cv && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                      <FiFileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Documents
                    </h4>
                  </div>
                  <a
                    href={selectedEmployee.cv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <FiFileText className="w-4 h-4" />
                    Télécharger CV
                  </a>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 px-8 py-4 flex justify-end border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
