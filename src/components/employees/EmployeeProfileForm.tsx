"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useNotification } from "@/contexts/NotificationContext";
import { FiUpload, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiCalendar, FiFileText, FiFile, FiX, FiDownload } from "react-icons/fi";

interface DocumentFile {
  name: string;
  type: 'formation' | 'experience' | 'diplome' | 'autre';
  data: string;
}

interface EmployeeFormData {
  nom: string;
  prenom: string;
  email: string;
  birthday: string;
  sexe: "HOMME" | "FEMME" | "";
  rib: string;
  adresse: string;
  telephone: string;
  dateEmbauche: string;
  photo: string;
  cv: string;
  typeContrat: "CDI" | "CDD" | "Stage" | "Freelance" | "";
  autresDocuments: DocumentFile[];
}

export default function EmployeeProfileForm() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const formationInputRef = useRef<HTMLInputElement>(null);
  const experienceInputRef = useRef<HTMLInputElement>(null);
  const diplomeInputRef = useRef<HTMLInputElement>(null);
  const autresInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [cvFileName, setCvFileName] = useState<string>("");
  const [formData, setFormData] = useState<EmployeeFormData>({
    nom: "",
    prenom: "",
    email: "",
    birthday: "",
    sexe: "",
    rib: "",
    adresse: "",
    telephone: "",
    dateEmbauche: "",
    photo: "",
    cv: "",
    typeContrat: "",
    autresDocuments: [],
  });

  useEffect(() => {
    loadEmployeeProfile();
  }, []);

  const loadEmployeeProfile = async () => {
    try {
      const response = await fetch("/api/employees/me");
      const data = await response.json();

      if (data && data.id) {
        // Parse JSON documents if they exist
        let autresDocuments: DocumentFile[] = [];
        
        try {
          if (data.autres_documents) autresDocuments = JSON.parse(data.autres_documents);
        } catch (e) {}
        
        setFormData({
          nom: data.nom || "",
          prenom: data.prenom || "",
          email: data.email || "",
          birthday: data.birthday ? new Date(data.birthday).toISOString().split("T")[0] : "",
          sexe: data.sexe || "",
          rib: data.rib || "",
          adresse: data.adresse || "",
          telephone: data.telephone || "",
          dateEmbauche: data.dateEmbauche ? new Date(data.dateEmbauche).toISOString().split("T")[0] : "",
          photo: data.photo || "",
          cv: data.cv || "",
          typeContrat: data.typeContrat || "",
          autresDocuments,
        });
        setPhotoPreview(data.photo || "");
        if (data.cv) {
          const fileName = data.cv.split('/').pop() || "CV actuel";
          setCvFileName(fileName);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification({ type: "error", title: "Erreur", message: "Veuillez sélectionner une image (PNG, JPG, SVG)" });
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData((prev) => ({ ...prev, photo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        showNotification({ type: "error", title: "Erreur", message: "Veuillez sélectionner un fichier PDF" });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification({ type: "error", title: "Erreur", message: "Le fichier ne doit pas dépasser 5 MB" });
        return;
      }
      
      setCvFileName(file.name);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData((prev) => ({ ...prev, cv: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'formation' | 'experience' | 'diplome' | 'autre'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 5 * 1024 * 1024; // 5MB per file
    const newDocuments: DocumentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size
      if (file.size > maxSize) {
        showNotification({
          type: "warning",
          title: "Fichier ignoré",
          message: `${file.name} dépasse la limite de 5 MB`
        });
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          newDocuments.push({
            name: file.name,
            type: docType,
            data: result
          });
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    if (newDocuments.length > 0) {
      setFormData((prev) => ({
        ...prev,
        autresDocuments: [...prev.autresDocuments, ...newDocuments]
      }));
      
      showNotification({
        type: "success",
        title: "Fichiers ajoutés",
        message: `${newDocuments.length} document(s) ajouté(s)`
      });
    }
  };

  const removeDocument = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      autresDocuments: prev.autresDocuments.filter((_, i) => i !== index)
    }));
  };

  const downloadDocument = (doc: DocumentFile) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showNotification({ type: "success", title: "Succès", message: "Profil enregistré avec succès!" });
        
        // Rediriger vers la page d'attente après un court délai
        setTimeout(() => {
          window.location.href = "/waiting-validation";
        }, 1500);
      } else {
        const error = await response.json();
        showNotification({ type: "error", title: "Erreur", message: error.error || "Erreur lors de l'enregistrement" });
      }
    } catch (error) {
      showNotification({ type: "error", title: "Erreur", message: "Erreur de connexion" });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <FiUser className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Mon Profil Employé
          </h2>
        </div>
        <p className="text-violet-100 mt-2">
          Complétez vos informations personnelles et professionnelles
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Photo de profil */}
        <div className="flex flex-col items-center gap-4 pb-8 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Photo de profil"
                className="w-32 h-32 rounded-full object-cover border-4 border-violet-100 dark:border-violet-900"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 flex items-center justify-center border-4 border-violet-100 dark:border-violet-900">
                <FiUser className="w-16 h-16 text-violet-400 dark:text-violet-600" />
              </div>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => photoInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <FiUpload className="w-4 h-4" />
            Choisir une photo (PNG, JPG, SVG)
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Formats acceptés: PNG, JPG, SVG
          </p>
        </div>

        {/* Informations personnelles */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <FiUser className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Informations personnelles
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Votre nom"
            />
            <Input
              label="Prénom"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              placeholder="Votre prénom"
            />
            <div className="relative">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
              <FiMail className="absolute right-3 top-11 text-gray-400" />
            </div>
            <Input
              label="Date de naissance"
              name="birthday"
              type="date"
              value={formData.birthday}
              onChange={handleChange}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sexe
              </label>
              <select
                name="sexe"
                value={formData.sexe}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner</option>
                <option value="HOMME">Homme</option>
                <option value="FEMME">Femme</option>
              </select>
            </div>
            <div className="relative">
              <Input
                label="Téléphone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="+216 XX XXX XXX"
              />
              <FiPhone className="absolute right-3 top-11 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <FiMapPin className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Coordonnées
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="RIB (Relevé d'Identité Bancaire)"
              name="rib"
              value={formData.rib}
              onChange={handleChange}
              placeholder="20 chiffres"
              maxLength={24}
            />
            <div className="relative">
              <Input
                label="Adresse complète"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Rue, Ville, Code postal"
              />
              <FiMapPin className="absolute right-3 top-11 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Informations professionnelles */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <FiBriefcase className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Informations professionnelles
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <Input
                label="Date d'embauche"
                name="dateEmbauche"
                type="date"
                value={formData.dateEmbauche}
                onChange={handleChange}
              />
              <FiCalendar className="absolute right-3 top-11 text-gray-400" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type de contrat
              </label>
              <select
                name="typeContrat"
                value={formData.typeContrat}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner</option>
                <option value="CDI">CDI - Contrat à Durée Indéterminée</option>
                <option value="CDD">CDD - Contrat à Durée Déterminée</option>
                <option value="Stage">Stage</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
          </div>
        </div>

        {/* CV Upload */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <FiFileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Curriculum Vitae
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            <input
              ref={cvInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleCvChange}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => cvInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FiUpload className="w-4 h-4" />
                Importer mon CV (PDF)
              </Button>
              {cvFileName && (
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <FiFileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm text-violet-700 dark:text-violet-300">{cvFileName}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Format accepté: PDF uniquement (max 5 MB)
            </p>
          </div>
        </div>

        {/* Documents supplémentaires */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
              <FiFile className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Documents supplémentaires
            </h3>
          </div>

          {/* Formation */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border-2 border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200">Formation</h4>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {formData.autresDocuments.filter(d => d.type === 'formation').length} fichier(s)
              </span>
            </div>
            <input
              ref={formationInputRef}
              type="file"
              multiple
              onChange={(e) => handleMultiFileUpload(e, 'formation')}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => formationInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <FiUpload className="w-4 h-4" />
              Ajouter des documents de formation
            </Button>
            {formData.autresDocuments.filter(d => d.type === 'formation').length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.autresDocuments.map((doc, index) => doc.type === 'formation' && (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FiFile className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expérience */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-xl border-2 border-purple-100 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200">Expérience professionnelle</h4>
              <span className="text-xs text-purple-600 dark:text-purple-400">
                {formData.autresDocuments.filter(d => d.type === 'experience').length} fichier(s)
              </span>
            </div>
            <input
              ref={experienceInputRef}
              type="file"
              multiple
              onChange={(e) => handleMultiFileUpload(e, 'experience')}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => experienceInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            >
              <FiUpload className="w-4 h-4" />
              Ajouter des documents d'expérience
            </Button>
            {formData.autresDocuments.filter(d => d.type === 'experience').length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.autresDocuments.map((doc, index) => doc.type === 'experience' && (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FiFile className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diplômes */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-xl border-2 border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">Diplômes & Certifications</h4>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {formData.autresDocuments.filter(d => d.type === 'diplome').length} fichier(s)
              </span>
            </div>
            <input
              ref={diplomeInputRef}
              type="file"
              multiple
              onChange={(e) => handleMultiFileUpload(e, 'diplome')}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => diplomeInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <FiUpload className="w-4 h-4" />
              Ajouter des diplômes
            </Button>
            {formData.autresDocuments.filter(d => d.type === 'diplome').length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.autresDocuments.map((doc, index) => doc.type === 'diplome' && (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FiFile className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autres documents */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl border-2 border-amber-100 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200">Autres documents</h4>
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {formData.autresDocuments.filter(d => !d.type || d.type === 'autre').length} fichier(s)
              </span>
            </div>
            <input
              ref={autresInputRef}
              type="file"
              multiple
              onChange={(e) => handleMultiFileUpload(e, 'autre')}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => autresInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <FiUpload className="w-4 h-4" />
              Ajouter d'autres documents
            </Button>
            {formData.autresDocuments.filter(d => !d.type || d.type === 'autre').length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.autresDocuments.map((doc, index) => (!doc.type || doc.type === 'autre') && (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FiFile className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadDocument(doc)}
                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Enregistrement...</span>
              </div>
            ) : (
              "Enregistrer le profil"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
