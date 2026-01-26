/**
 * Email Service
 * Sends email notifications using NodeMailer or your email service
 */

import nodemailer from "nodemailer";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  /**
   * Send email (placeholder - implement with your email service)
   */
  async sendEmail(params: EmailParams) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    const smtpSecure = process.env.SMTP_SECURE === "true";

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
      console.log("📧 Email (mock):", {
        to: params.to,
        subject: params.subject,
      });
      return {
        success: true,
        message: "Email logged (SMTP not configured)",
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return {
      success: true,
      message: "Email sent successfully",
    };
  }

  /**
   * Send urgent notification email to RH/Super Admin
   */
  async sendUrgentNotificationEmail(
    rhEmail: string,
    title: string,
    message: string
  ) {
    const subject = `URGENT - ${title}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 16px; text-align: center; }
          .content { background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
          .alert { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; }
          .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ Notification Urgente</h2>
          </div>
          <div class="content">
            <p><strong>${title}</strong></p>
            <div class="alert">
              ${message}
            </div>
            <p style="margin-top: 16px;">Veuillez consulter le centre de notifications RH pour plus de détails.</p>
            <p><a href="${process.env.NEXTAUTH_URL}/rh/notifications">Ouvrir le centre RH</a></p>
          </div>
          <div class="footer">Email automatique - ne pas répondre</div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: rhEmail,
      subject,
      html,
      text: `${title}\n\n${message}\n\n${process.env.NEXTAUTH_URL}/rh/notifications`,
    });
  }

  /**
   * Send daily digest to RH/Super Admin
   */
  async sendDailyDigestEmail(
    rhEmail: string,
    summaryHtml: string,
    summaryText: string
  ) {
    const subject = "Digest quotidien - Actions RH en attente";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 16px; text-align: center; }
          .content { background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📊 Digest quotidien</h2>
          </div>
          <div class="content">
            ${summaryHtml}
            <p style="margin-top: 16px;"><a href="${process.env.NEXTAUTH_URL}/rh/notifications">Voir toutes les notifications</a></p>
          </div>
          <div class="footer">Email automatique - ne pas répondre</div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: rhEmail,
      subject,
      html,
      text: summaryText,
    });
  }

  /**
   * Send profile rejection email
   */
  async sendProfileRejectedEmail(
    userEmail: string,
    userName: string,
    reason: string,
    rhName: string
  ) {
    const subject = "Votre profil a été rejeté - Action requise";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .reason-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Profil Rejeté</h1>
          </div>
          <div class="content">
            <p>Bonjour ${userName},</p>
            
            <p>Votre profil employé a été examiné par notre équipe RH et malheureusement, il a été rejeté.</p>
            
            <div class="reason-box">
              <strong>Raison du rejet:</strong><br>
              ${reason}
            </div>
            
            <p><strong>Que faire maintenant?</strong></p>
            <ul>
              <li>Consultez la raison du rejet ci-dessus</li>
              <li>Connectez-vous à votre compte</li>
              <li>Modifiez votre profil en tenant compte des observations</li>
              <li>Soumettez à nouveau votre profil pour validation</li>
            </ul>
            
            <a href="${process.env.NEXTAUTH_URL}/complete-profile" class="button">
              Modifier mon profil
            </a>
            
            <p style="margin-top: 30px;">Si vous avez des questions, n'hésitez pas à contacter le service RH.</p>
            
            <p>Cordialement,<br>
            <strong>${rhName}</strong><br>
            Service des Ressources Humaines</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      Profil Rejeté
      
      Bonjour ${userName},
      
      Votre profil employé a été rejeté.
      
      Raison: ${reason}
      
      Veuillez vous connecter et modifier votre profil: ${process.env.NEXTAUTH_URL}/complete-profile
      
      Cordialement,
      ${rhName}
      Service RH
    `;
    
    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send profile approved email
   */
  async sendProfileApprovedEmail(
    userEmail: string,
    userName: string,
    rhName: string
  ) {
    const subject = "Votre profil a été approuvé!";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .success-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Profil Approuvé!</h1>
          </div>
          <div class="content">
            <p>Bonjour ${userName},</p>
            
            <div class="success-box">
              <strong>Félicitations!</strong><br>
              Votre profil employé a été approuvé par notre équipe RH.
            </div>
            
            <p>Vous avez maintenant accès à toutes les fonctionnalités de la plateforme:</p>
            <ul>
              <li>✓ Système de pointage</li>
              <li>✓ Gestion des congés</li>
              <li>✓ Accès aux documents RH</li>
              <li>✓ Tableau de bord personnalisé</li>
            </ul>
            
            <a href="${process.env.NEXTAUTH_URL}/home" class="button">
              Accéder à mon espace
            </a>
            
            <p style="margin-top: 30px;">Bienvenue dans l'équipe!</p>
            
            <p>Cordialement,<br>
            <strong>${rhName}</strong><br>
            Service des Ressources Humaines</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      Profil Approuvé!
      
      Bonjour ${userName},
      
      Félicitations! Votre profil employé a été approuvé.
      
      Vous pouvez maintenant accéder à toutes les fonctionnalités: ${process.env.NEXTAUTH_URL}/home
      
      Bienvenue dans l'équipe!
      
      Cordialement,
      ${rhName}
      Service RH
    `;
    
    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Notify RH of new pending employee
   */
  async notifyRHNewEmployee(
    rhEmail: string,
    employeeName: string,
    employeeId: string
  ) {
    const subject = "Nouveau profil employé en attente de validation";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Action Requise</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            
            <div class="info-box">
              <strong>Nouveau profil en attente:</strong><br>
              ${employeeName}
            </div>
            
            <p>Un nouvel employé a complété son profil et attend votre validation.</p>
            
            <p><strong>Actions disponibles:</strong></p>
            <ul>
              <li>Consulter le dossier complet</li>
              <li>Vérifier les documents fournis</li>
              <li>Approuver ou rejeter le profil</li>
            </ul>
            
            <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">
              Consulter le profil
            </a>
            
            <p style="margin-top: 30px;">Service RH</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail({
      to: rhEmail,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
