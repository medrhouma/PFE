/**
 * Export Service
 * Professional export functionality for Excel and PDF generation
 * Supports role-based data filtering and session-aware exports
 */

import { query } from "@/lib/mysql-direct";

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  columns?: string[];
  includeHeaders?: boolean;
  fileName?: string;
}

export interface ExportResult {
  success: boolean;
  data?: Buffer | string;
  fileName: string;
  mimeType: string;
  error?: string;
}

interface EmployeeData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  department: string;
  position: string;
  status: string;
  dateEmbauche: string;
  typeContrat: string;
}

interface PointageData {
  id: string;
  employeeName: string;
  type: string;
  timestamp: string;
  status: string;
  faceVerified: boolean;
  anomalyDetected: boolean;
}

interface CongeData {
  id: string;
  employeeName: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  status: string;
  commentaire: string;
}

class ExportService {
  /**
   * Generate Excel-compatible CSV data
   */
  private generateCSV(data: any[], columns: string[], headers: string[]): string {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const headerRow = headers.join(';');
    const dataRows = data.map(row => 
      columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains special characters
        const stringValue = String(value);
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';')
    );
    
    return BOM + [headerRow, ...dataRows].join('\n');
  }

  /**
   * Export employees data
   */
  async exportEmployees(
    userId: string, 
    userRole: string, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Only RH and SUPER_ADMIN can export employee data
      if (!['RH', 'SUPER_ADMIN'].includes(userRole)) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          error: 'Insufficient permissions to export employee data'
        };
      }

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (options.filters?.status) {
        whereClause += ' AND e.status = ?';
        params.push(options.filters.status);
      }

      if (options.filters?.department) {
        whereClause += ' AND e.department = ?';
        params.push(options.filters.department);
      }

      const employees = await query(`
        SELECT 
          e.id,
          e.nom,
          e.prenom,
          e.email,
          e.telephone,
          e.department,
          e.position,
          e.status,
          DATE_FORMAT(e.date_embauche, '%d/%m/%Y') as dateEmbauche,
          e.type_contrat as typeContrat
        FROM Employe e
        ${whereClause}
        ORDER BY e.nom, e.prenom
      `, params) as any[];

      const columns = ['nom', 'prenom', 'email', 'telephone', 'department', 'position', 'status', 'dateEmbauche', 'typeContrat'];
      const headers = ['Nom', 'Prénom', 'Email', 'Téléphone', 'Département', 'Poste', 'Statut', 'Date Embauche', 'Type Contrat'];

      const csvData = this.generateCSV(employees, columns, headers);
      const fileName = `employes_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting employees:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Export attendance/pointage data
   */
  async exportPointages(
    userId: string, 
    userRole: string, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Users can only export their own data
      if (userRole === 'USER') {
        whereClause += ' AND p.user_id = ?';
        params.push(userId);
      }

      // Apply date range filter
      if (options.dateRange?.start) {
        whereClause += ' AND p.timestamp >= ?';
        params.push(options.dateRange.start);
      }
      if (options.dateRange?.end) {
        whereClause += ' AND p.timestamp <= ?';
        params.push(options.dateRange.end);
      }

      // Filter by specific user if provided (for RH/Admin)
      if (options.filters?.userId && ['RH', 'SUPER_ADMIN'].includes(userRole)) {
        whereClause += ' AND p.user_id = ?';
        params.push(options.filters.userId);
      }

      const pointages = await query(`
        SELECT 
          p.id,
          COALESCE(u.name, '') as employeeName,
          p.type,
          DATE_FORMAT(p.timestamp, '%d/%m/%Y %H:%i:%s') as timestamp,
          p.status,
          p.face_verified as faceVerified,
          p.anomaly_detected as anomalyDetected,
          p.anomaly_reason as anomalyReason,
          p.ip_address as ipAddress
        FROM Pointage p
        LEFT JOIN User u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.timestamp DESC
      `, params) as any[];

      const columns = ['employeeName', 'type', 'timestamp', 'status', 'faceVerified', 'anomalyDetected', 'anomalyReason'];
      const headers = ['Employé', 'Type', 'Date/Heure', 'Statut', 'Vérification Faciale', 'Anomalie', 'Raison Anomalie'];

      // Transform boolean values for better readability
      const formattedData = pointages.map(p => ({
        ...p,
        type: p.type === 'IN' ? 'Entrée' : 'Sortie',
        faceVerified: p.faceVerified ? 'Oui' : 'Non',
        anomalyDetected: p.anomalyDetected ? 'Oui' : 'Non'
      }));

      const csvData = this.generateCSV(formattedData, columns, headers);
      const fileName = `pointages_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting pointages:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Export leave requests data
   */
  async exportConges(
    userId: string, 
    userRole: string, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Users can only export their own data
      if (userRole === 'USER') {
        whereClause += ' AND c.userId = ?';
        params.push(userId);
      }

      // Apply date range filter
      if (options.dateRange?.start) {
        whereClause += ' AND c.date_debut >= ?';
        params.push(options.dateRange.start);
      }
      if (options.dateRange?.end) {
        whereClause += ' AND c.date_fin <= ?';
        params.push(options.dateRange.end);
      }

      // Filter by status
      if (options.filters?.status) {
        whereClause += ' AND c.status = ?';
        params.push(options.filters.status);
      }

      const conges = await query(`
        SELECT 
          c.id,
          COALESCE(u.name, '') as employeeName,
          c.type,
          DATE_FORMAT(c.date_debut, '%d/%m/%Y') as dateDebut,
          DATE_FORMAT(c.date_fin, '%d/%m/%Y') as dateFin,
          c.status,
          c.commentaire
        FROM demande_conge c
        LEFT JOIN User u ON c.userId = u.id
        ${whereClause}
        ORDER BY c.date_debut DESC
      `, params) as any[];

      const columns = ['employeeName', 'type', 'dateDebut', 'dateFin', 'status', 'commentaire'];
      const headers = ['Employé', 'Type', 'Date Début', 'Date Fin', 'Statut', 'Commentaire'];

      // Transform status values for better readability
      const statusMap: Record<string, string> = {
        'EN_ATTENTE': 'En attente',
        'VALIDE': 'Validé',
        'REFUSE': 'Refusé'
      };

      const typeMap: Record<string, string> = {
        'PAID': 'Congé payé',
        'UNPAID': 'Congé sans solde',
        'MATERNITE': 'Congé maternité',
        'MALADIE': 'Congé maladie',
        'PREAVIS': 'Préavis'
      };

      const formattedData = conges.map(c => ({
        ...c,
        status: statusMap[c.status] || c.status,
        type: typeMap[c.type] || c.type
      }));

      const csvData = this.generateCSV(formattedData, columns, headers);
      const fileName = `conges_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting conges:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Export audit logs (Admin only)
   */
  async exportAuditLogs(
    userId: string, 
    userRole: string, 
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Only SUPER_ADMIN can export audit logs
      if (userRole !== 'SUPER_ADMIN') {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          error: 'Only administrators can export audit logs'
        };
      }

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (options.dateRange?.start) {
        whereClause += ' AND a.created_at >= ?';
        params.push(options.dateRange.start);
      }
      if (options.dateRange?.end) {
        whereClause += ' AND a.created_at <= ?';
        params.push(options.dateRange.end);
      }

      if (options.filters?.action) {
        whereClause += ' AND a.action = ?';
        params.push(options.filters.action);
      }

      if (options.filters?.severity) {
        whereClause += ' AND a.severity = ?';
        params.push(options.filters.severity);
      }

      const logs = await query(`
        SELECT 
          a.id,
          COALESCE(u.name, 'System') as userName,
          a.action,
          a.entity_type as entityType,
          a.entity_id as entityId,
          a.ip_address as ipAddress,
          a.severity,
          DATE_FORMAT(a.created_at, '%d/%m/%Y %H:%i:%s') as createdAt
        FROM audit_logs a
        LEFT JOIN User u ON a.user_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT 10000
      `, params) as any[];

      const columns = ['createdAt', 'userName', 'action', 'entityType', 'entityId', 'ipAddress', 'severity'];
      const headers = ['Date/Heure', 'Utilisateur', 'Action', 'Type Entité', 'ID Entité', 'Adresse IP', 'Sévérité'];

      const csvData = this.generateCSV(logs, columns, headers);
      const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting audit logs:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Export monthly attendance report
   */
  async exportMonthlyReport(
    userId: string, 
    userRole: string, 
    year: number, 
    month: number
  ): Promise<ExportResult> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      let userFilter = '';
      const params: any[] = [startDate, endDate];

      if (userRole === 'USER') {
        userFilter = 'AND p.user_id = ?';
        params.push(userId);
      }

      // Get aggregated data per employee per day
      const report = await query(`
        SELECT 
          u.id as userId,
          COALESCE(u.name, '') as employeeName,
          DATE(p.timestamp) as date,
          MIN(CASE WHEN p.type = 'IN' THEN TIME(p.timestamp) END) as firstIn,
          MAX(CASE WHEN p.type = 'OUT' THEN TIME(p.timestamp) END) as lastOut,
          COUNT(CASE WHEN p.type = 'IN' THEN 1 END) as checkIns,
          COUNT(CASE WHEN p.type = 'OUT' THEN 1 END) as checkOuts,
          SUM(CASE WHEN p.anomaly_detected = 1 THEN 1 ELSE 0 END) as anomalies
        FROM Pointage p
        LEFT JOIN User u ON p.user_id = u.id
        WHERE DATE(p.timestamp) BETWEEN ? AND ?
        ${userFilter}
        GROUP BY u.id, DATE(p.timestamp)
        ORDER BY employeeName, date
      `, params) as any[];

      const columns = ['employeeName', 'date', 'firstIn', 'lastOut', 'checkIns', 'checkOuts', 'anomalies'];
      const headers = ['Employé', 'Date', 'Première Entrée', 'Dernière Sortie', 'Nb Entrées', 'Nb Sorties', 'Anomalies'];

      const formattedData = report.map(r => ({
        ...r,
        date: r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '',
        firstIn: r.firstIn || '-',
        lastOut: r.lastOut || '-'
      }));

      const csvData = this.generateCSV(formattedData, columns, headers);
      const monthName = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const fileName = `rapport_mensuel_${year}_${month.toString().padStart(2, '0')}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting monthly report:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Export user's personal attendance summary
   */
  async exportPersonalSummary(
    userId: string,
    year: number,
    month: number
  ): Promise<ExportResult> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get user info
      const users = await query(
        `SELECT name, last_name, email FROM User WHERE id = ?`,
        [userId]
      ) as any[];
      const user = users[0];
      const userName = `${user?.name || ''} ${user?.last_name || ''}`.trim();

      // Get daily summary
      const daily = await query(`
        SELECT 
          DATE(timestamp) as date,
          MIN(CASE WHEN type = 'IN' THEN TIME(timestamp) END) as firstIn,
          MAX(CASE WHEN type = 'OUT' THEN TIME(timestamp) END) as lastOut,
          SUM(CASE WHEN anomaly_detected = 1 THEN 1 ELSE 0 END) as anomalies
        FROM pointages
        WHERE user_id = ? AND DATE(timestamp) BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY date
      `, [userId, startDate, endDate]) as any[];

      // Get leave summary
      const leaves = await query(`
        SELECT type, COUNT(*) as count, 
          SUM(DATEDIFF(date_fin, date_debut) + 1) as totalDays
        FROM demande_conge
        WHERE userId = ? AND status = 'VALIDE'
          AND YEAR(date_debut) = ?
        GROUP BY type
      `, [userId, year]) as any[];

      // Calculate statistics
      const totalDaysWorked = daily.length;
      const totalAnomalies = daily.reduce((sum, d) => sum + (d.anomalies || 0), 0);

      const columns = ['date', 'firstIn', 'lastOut', 'duration', 'anomalies'];
      const headers = ['Date', 'Entrée', 'Sortie', 'Durée', 'Anomalies'];

      const formattedData = daily.map(d => {
        const duration = d.firstIn && d.lastOut ? 
          this.calculateDuration(d.firstIn, d.lastOut) : '-';
        return {
          date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
          firstIn: d.firstIn || '-',
          lastOut: d.lastOut || '-',
          duration,
          anomalies: d.anomalies || 0
        };
      });

      // Add summary row
      formattedData.push({
        date: '--- RÉSUMÉ ---',
        firstIn: '',
        lastOut: '',
        duration: `Total jours: ${totalDaysWorked}`,
        anomalies: totalAnomalies
      });

      const csvData = this.generateCSV(formattedData, columns, headers);
      const fileName = `releve_personnel_${year}_${month.toString().padStart(2, '0')}.csv`;

      return {
        success: true,
        data: csvData,
        fileName,
        mimeType: 'text/csv;charset=utf-8'
      };
    } catch (error: any) {
      console.error('❌ Error exporting personal summary:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      };
    }
  }

  /**
   * Calculate duration between two time strings
   */
  private calculateDuration(startTime: string, endTime: string): string {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      
      let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '-';
    }
  }
}

export const exportService = new ExportService();
