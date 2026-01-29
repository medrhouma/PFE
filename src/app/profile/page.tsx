"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit3, FiSave, FiX,
  FiShield, FiCamera, FiCheck, FiAlertCircle, FiClock, FiBriefcase,
  FiCreditCard, FiUsers, FiSettings, FiArrowLeft
} from "react-icons/fi";

interface UserProfile {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  image?: string;
  sexe?: string;
  telephone?: string;
  adresse?: string;
  rib?: string;
  dateEmbauche?: string;
  typeContrat?: string;
  role: { name: string; description?: string };
  roleEnum?: string;
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
  authMethod?: string;
  providers?: string[];
  employee?: any;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: "",
    lastName: "",
    telephone: "",
    adresse: "",
    sexe: ""
  });

  const userRole = session?.user?.role?.toUpperCase() || "USER";
  const isRH = userRole === "RH" || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session) {
      fetchUserProfile();
    }
  }, [session, status, router]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/me`);
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setEditForm({
          name: userData.name || "",
          lastName: userData.lastName || "",
          telephone: userData.telephone || "",
          adresse: userData.adresse || "",
          sexe: userData.sexe || ""
        });
      } else {
        setUser({
          id: session?.user?.id || "",
          name: session?.user?.name || "Utilisateur",
          email: session?.user?.email || "",
          image: session?.user?.image || undefined,
          isActive: true,
          role: { name: session?.user?.role || "USER" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showMessage("error", "Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        showMessage("success", "Profil mis à jour avec succès");
        setIsEditing(false);
        fetchUserProfile();
      } else {
        const data = await response.json();
        showMessage("error", data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      showMessage("error", "Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const response = await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 })
        });

        if (response.ok) {
          showMessage("success", "Photo mise à jour");
          fetchUserProfile();
        } else {
          showMessage("error", "Erreur lors de la mise à jour de la photo");
        }
      } catch (error) {
        showMessage("error", "Erreur de connexion");
      }
    };
    reader.readAsDataURL(file);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "ADMIN":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
      case "RH":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
    }
  };

  const getStatusBadge = (st: string | undefined, isActive: boolean) => {
    if (!isActive) return { color: "bg-red-100 text-red-700", text: "Inactif" };
    switch (st?.toUpperCase()) {
      case "ACTIVE":
        return { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Actif" };
      case "PENDING":
        return { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", text: "En attente" };
      default:
        return { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Actif" };
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-900 border-t-violet-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const statusBadge = getStatusBadge(user?.status, user?.isActive || false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <FiArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon Profil</h1>
              <p className="text-gray-600 dark:text-gray-400">Gérez vos informations personnelles</p>
            </div>
          </div>
          
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors">
              <FiEdit3 className="w-4 h-4" />
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors">
                <FiX className="w-4 h-4" />
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          )}
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"}`}>
            {message.type === "success" ? <FiCheck className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              <div className="relative group">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {user?.image ? (
                  <img src={user.image} alt="Profile" className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 object-cover shadow-lg" />
                ) : (
                  <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <button onClick={handlePhotoClick} className="absolute bottom-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiCamera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="flex-1 pt-16 md:pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name} {user?.lastName}</h2>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRoleBadgeColor(user?.role?.name || "")}`}>{user?.role?.name || "USER"}</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadge.color}`}>{statusBadge.text}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{user?.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Membre depuis le {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiUser className="w-5 h-5 text-violet-500" />
              Informations Personnelles
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                {isEditing ? (
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user?.name || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                {isEditing ? (
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user?.lastName || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><FiMail className="w-4 h-4" />Email</label>
                <p className="text-gray-900 dark:text-white">{user?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><FiPhone className="w-4 h-4" />Téléphone</label>
                {isEditing ? (
                  <input type="tel" value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent" placeholder="+216 XX XXX XXX" />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user?.telephone || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><FiMapPin className="w-4 h-4" />Adresse</label>
                {isEditing ? (
                  <textarea value={editForm.adresse} onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent" placeholder="Votre adresse complète" />
                ) : (
                  <p className="text-gray-900 dark:text-white">{user?.adresse || "-"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexe</label>
                {isEditing ? (
                  <select value={editForm.sexe} onChange={(e) => setEditForm({ ...editForm, sexe: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                    <option value="">Sélectionner</option>
                    <option value="HOMME">Homme</option>
                    <option value="FEMME">Femme</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">{user?.sexe === "HOMME" ? "Homme" : user?.sexe === "FEMME" ? "Femme" : "-"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiBriefcase className="w-5 h-5 text-blue-500" />
              Informations Professionnelles
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRoleBadgeColor(user?.role?.name || "")}`}>{user?.role?.name || "USER"}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de contrat</label>
                <p className="text-gray-900 dark:text-white">{user?.typeContrat || "-"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><FiCalendar className="w-4 h-4" />Date d'embauche</label>
                <p className="text-gray-900 dark:text-white">{user?.dateEmbauche ? new Date(user.dateEmbauche).toLocaleDateString('fr-FR') : "-"}</p>
              </div>

              {isRH && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><FiCreditCard className="w-4 h-4" />RIB</label>
                  <p className="text-gray-900 dark:text-white font-mono">{user?.rib ? `${user.rib.substring(0, 4)} **** **** ${user.rib.substring(user.rib.length - 4)}` : "-"}</p>
                </div>
              )}

              {user?.employee && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dossier Employé</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Position</span><span className="text-sm text-gray-900 dark:text-white">{user.employee.position || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Département</span><span className="text-sm text-gray-900 dark:text-white">{user.employee.department || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Statut dossier</span><span className={`text-xs px-2 py-0.5 rounded-full ${user.employee.status === 'APPROUVE' ? 'bg-green-100 text-green-700' : user.employee.status === 'EN_ATTENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{user.employee.status}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiShield className="w-5 h-5 text-green-500" />
              Sécurité & Compte
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Méthode d'authentification</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Comment vous vous connectez</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                  {user?.authMethod === 'credentials' ? 'Email/Mot de passe' : 'Google'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2"><FiClock className="w-4 h-4 text-gray-400" /><p className="font-medium text-gray-900 dark:text-white">Compte créé le</p></div>
                <span className="text-gray-600 dark:text-gray-400">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : "-"}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2"><FiClock className="w-4 h-4 text-gray-400" /><p className="font-medium text-gray-900 dark:text-white">Dernière modification</p></div>
                <span className="text-gray-600 dark:text-gray-400">{user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('fr-FR') : "-"}</span>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => router.push('/settings?tab=security')} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <FiShield className="w-4 h-4" />Changer mot de passe
                  </button>
                  <button onClick={() => router.push('/settings')} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                    <FiSettings className="w-4 h-4" />Paramètres
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Role-Specific Info */}
          {isRH && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-purple-500" />
                Accès {userRole}
              </h3>
              
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">En tant que {userRole}, vous avez accès aux fonctionnalités suivantes :</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => router.push('/rh')} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <FiUsers className="w-5 h-5 text-blue-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Gestion RH</span>
                  </button>
                  <button onClick={() => router.push('/parametres/users')} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                    <FiSettings className="w-5 h-5 text-purple-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Utilisateurs</span>
                  </button>
                  {userRole === "SUPER_ADMIN" && (
                    <>
                      <button onClick={() => router.push('/parametres/roles')} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                        <FiShield className="w-5 h-5 text-red-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Rôles</span>
                      </button>
                      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left">
                        <FiBriefcase className="w-5 h-5 text-green-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Dashboard</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}