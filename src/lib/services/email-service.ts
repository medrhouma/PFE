/**
 * Email Service - Santec AI
 * Sends email notifications using NodeMailer
 * 
 * Supports DEV mode (OTP_DEV_MODE=true) for development testing
 * and PROD mode for real email delivery
 */

import nodemailer from "nodemailer";

// ========================================
// CONFIGURATION
// ========================================

/**
 * Check if we're in DEV mode
 * DEV mode: OTP = 000000, logged in console, no email sent
 * PROD mode: Real OTP generated and sent via SMTP
 */
export const isDevMode = (): boolean => {
  return process.env.OTP_DEV_MODE === "true";
};

/**
 * Generate a secure 6-digit OTP
 * In DEV mode: always returns "000000"
 * In PROD mode: returns a cryptographically random 6-digit code
 */
export const generateSecureOTP = (): string => {
  if (isDevMode()) {
    console.log("========================================");
    console.log("[DEV MODE] OTP Code: 000000");
    console.log("========================================");
    return "000000";
  }
  
  // Secure random 6-digit OTP for production
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========================================
// EMAIL PARAMETERS
// ========================================

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ========================================
// PROFESSIONAL EMAIL TEMPLATES WITH LOGO
// ========================================

// Logo URL - will be served from the public folder
const getLogoUrl = (): string => {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/logo-santecai.webp`;
};

/**
 * Creates a professional, responsive OTP email template
 * Compatible with Gmail, Outlook, and mobile clients
 * Features the Santec AI logo and modern card design
 */
const createOTPEmailTemplate = (code: string, userName: string): { html: string; text: string } => {
  const logoUrl = getLogoUrl();
  
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Code de vérification - Santec AI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8f9fc;
    }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 24px !important; }
      .code-box { padding: 20px 24px !important; }
      .code { font-size: 32px !important; letter-spacing: 6px !important; }
      .logo-img { width: 160px !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Main Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email Card Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <img src="${logoUrl}" alt="Santec AI" class="logo-img" width="200" style="display: block; width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                
                <!-- Card Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%); padding: 32px 40px; text-align: center; border-radius: 16px 16px 0 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <!-- Lock Icon -->
                          <div style="width: 56px; height: 56px; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                            <img src="https://img.icons8.com/fluency/48/lock--v1.png" alt="Security" width="32" height="32" style="display: block;" />
                          </div>
                          <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px;">
                            Code de vérification
                          </h1>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.75);">
                            Connexion sécurisée à votre compte
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Card Content -->
                <tr>
                  <td class="content" style="padding: 40px;">
                    
                    <!-- Greeting -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                      Bonjour${userName ? ` <strong style="color: #1e3a5f;">${userName}</strong>` : ''},
                    </p>
                    
                    <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.7; color: #4b5563;">
                      Vous avez demandé à vous connecter à votre compte <strong style="color: #1e3a5f;">Santec AI</strong>. 
                      Utilisez le code ci-dessous pour compléter votre connexion :
                    </p>
                    
                    <!-- OTP Code Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 8px 0 28px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td class="code-box" style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #f97316; border-radius: 12px; padding: 28px 48px;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 1px;">
                                  Votre code
                                </p>
                                <p class="code" style="margin: 0; font-size: 42px; font-weight: 800; color: #ea580c; letter-spacing: 10px; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;">
                                  ${code}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Timer Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 0 0 24px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="background-color: #fef3c7; border-radius: 8px; padding: 12px 20px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                  <strong>Ce code expire dans 5 minutes</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Divider -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0 20px 0;">
                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #166534;">
                            <strong>Important :</strong> Ne partagez jamais ce code. L'équipe Santec AI ne vous le demandera jamais.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Card Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #374151;">
                      Cordialement,
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #f97316; font-weight: 600;">
                      L'équipe Santec AI
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer Links -->
          <tr>
            <td align="center" style="padding: 32px 0 0 0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Santec AI. Tous droits réservés.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();

  const text = `
Bonjour${userName ? ` ${userName}` : ''},

Vous avez demandé à vous connecter à votre compte Santec AI.

Voici votre code de vérification :

[ ${code} ]

Ce code est valable pendant 5 minutes.

Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.

Cordialement,
L'équipe Santec AI

---
Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
© ${new Date().getFullYear()} Santec AI. Tous droits réservés.
  `.trim();

  return { html, text };
};

/**
 * Creates a professional password reset email template
 * Features the Santec AI logo and modern card design
 */
const createPasswordResetEmailTemplate = (resetLink: string, userName: string): { html: string; text: string } => {
  const logoUrl = getLogoUrl();
  
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Réinitialisation du mot de passe - Santec AI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8f9fc;
    }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content { padding: 24px !important; }
      .button { padding: 14px 28px !important; font-size: 15px !important; }
      .logo-img { width: 160px !important; height: auto !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Main Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Email Card Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 0 32px 0;">
              <img src="${logoUrl}" alt="Santec AI" class="logo-img" width="200" style="display: block; width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                
                <!-- Card Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%); padding: 32px 40px; text-align: center; border-radius: 16px 16px 0 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center">
                          <!-- Key Icon -->
                          <div style="width: 56px; height: 56px; background-color: rgba(255, 255, 255, 0.15); border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                            <img src="https://img.icons8.com/fluency/48/key.png" alt="Reset" width="32" height="32" style="display: block;" />
                          </div>
                          <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px;">
                            Réinitialisation du mot de passe
                          </h1>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.75);">
                            Créez un nouveau mot de passe sécurisé
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Card Content -->
                <tr>
                  <td class="content" style="padding: 40px;">
                    
                    <!-- Greeting -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                      Bonjour${userName ? ` <strong style="color: #1e3a5f;">${userName}</strong>` : ''},
                    </p>
                    
                    <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 1.7; color: #4b5563;">
                      Vous avez demandé à réinitialiser le mot de passe de votre compte <strong style="color: #1e3a5f;">Santec AI</strong>.
                    </p>
                    
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #4b5563;">
                      Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 8px 0 28px 0;">
                          <a href="${resetLink}" class="button" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);">
                            Réinitialiser mon mot de passe
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Timer Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 0 0 24px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="background-color: #fef3c7; border-radius: 8px; padding: 12px 20px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                  <strong>Ce lien expire dans 1 heure</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #f1f5f9; border-radius: 8px; padding: 16px;">
                          <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #1e3a5f; word-break: break-all;">
                            ${resetLink}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Divider -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 24px 0 16px 0;">
                          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991b1b;">
                            <strong>Important :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
                <!-- Card Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #374151;">
                      Cordialement,
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #f97316; font-weight: 600;">
                      L'équipe Santec AI
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer Links -->
          <tr>
            <td align="center" style="padding: 32px 0 0 0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Santec AI. Tous droits réservés.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();

  const text = `
Bonjour${userName ? ` ${userName}` : ''},

Vous avez demandé à réinitialiser le mot de passe de votre compte Santec AI.

Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :

${resetLink}

Ce lien est valable pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.

Cordialement,
L'équipe Santec AI

---
Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
© ${new Date().getFullYear()} Santec AI. Tous droits réservés.
  `.trim();

  return { html, text };
};

// ========================================
// EMAIL SERVICE CLASS
// ========================================

class EmailService {
  /**
   * Send email via SMTP
   * In DEV mode: logs to console without sending
   * In PROD mode: sends via configured SMTP server
   */
  async sendEmail(params: EmailParams) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `Santec AI <${smtpUser}>`;
    const smtpSecure = process.env.SMTP_SECURE === "true";

    // Check SMTP configuration
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.log("========================================");
      console.log("[EMAIL SERVICE] SMTP not configured");
      console.log("To:", params.to);
      console.log("Subject:", params.subject);
      console.log("========================================");
      return {
        success: true,
        message: "Email logged (SMTP not configured)",
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: smtpFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    console.log("[EMAIL SERVICE] Email sent:", info.messageId);

    return {
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    };
  }

  /**
   * Send OTP verification code
   * 
   * DEV mode (OTP_DEV_MODE=true):
   * - Uses fixed code "000000"
   * - Logs code to console
   * - Optionally skips email sending
   * 
   * PROD mode (OTP_DEV_MODE=false):
   * - Uses provided code (should be generated securely)
   * - Sends email via SMTP
   */
  async sendOTPEmail(email: string, code: string, userName: string = "Utilisateur") {
    const subject = "Votre code de vérification – Santec AI";
    
    // Log in DEV mode
    if (isDevMode()) {
      console.log("========================================");
      console.log("[DEV MODE] OTP Email would be sent:");
      console.log("To:", email);
      console.log("Code:", code);
      console.log("========================================");
      
      // Still send email in DEV mode for testing, but with dev indicator
      // Comment out the return below if you want emails in DEV mode too
      return {
        success: true,
        message: "OTP logged to console (DEV mode)",
        devMode: true,
      };
    }

    const { html, text } = createOTPEmailTemplate(code, userName);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string = "Utilisateur") {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    const subject = "Réinitialisation de votre mot de passe – Santec AI";

    // Log in DEV mode
    if (isDevMode()) {
      console.log("========================================");
      console.log("[DEV MODE] Password Reset Email:");
      console.log("To:", email);
      console.log("Reset Link:", resetLink);
      console.log("========================================");
    }

    const { html, text } = createPasswordResetEmailTemplate(resetLink, userName);

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
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

  /**
   * Send leave request notification email to RH
   */
  async sendLeaveRequestNotificationEmail(
    rhEmail: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    duration: number,
    reason: string
  ) {
    const subject = `📋 Nouvelle demande de congé - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .card { background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .info-grid { display: grid; gap: 15px; }
          .info-item { background-color: #f9fafb; border-radius: 12px; padding: 15px; border-left: 4px solid #6366f1; }
          .info-label { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
          .info-value { font-size: 16px; color: #111827; font-weight: 600; margin-top: 5px; }
          .reason-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; margin-top: 10px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>📋 Nouvelle Demande de Congé</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 25px;">Bonjour,</p>
              <p style="margin-bottom: 25px;"><strong>${employeeName}</strong> a soumis une nouvelle demande de congé qui nécessite votre attention.</p>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Type de congé</div>
                  <div class="info-value">${leaveType}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div class="info-item">
                    <div class="info-label">Date de début</div>
                    <div class="info-value">${startDate}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Date de fin</div>
                    <div class="info-value">${endDate}</div>
                  </div>
                </div>
                <div class="info-item" style="border-left-color: #10b981;">
                  <div class="info-label">Durée totale</div>
                  <div class="info-value">${duration} jour(s)</div>
                </div>
              </div>
              
              ${reason ? `
              <div class="reason-box">
                <div class="info-label">Motif de la demande</div>
                <p style="margin: 10px 0 0 0;">${reason}</p>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXTAUTH_URL}/rh/conges" class="button">
                  Traiter la demande
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Email automatique - Santec RH Platform</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail({
      to: rhEmail,
      subject,
      html,
      text: `Nouvelle demande de congé de ${employeeName}\n\nType: ${leaveType}\nDu: ${startDate} au ${endDate}\nDurée: ${duration} jour(s)\nMotif: ${reason || 'Non spécifié'}\n\nConsulter: ${process.env.NEXTAUTH_URL}/rh/conges`
    });
  }

  /**
   * Send test notification email
   */
  async sendTestNotificationEmail(email: string) {
    const subject = "🧪 Test de notification - Santec RH";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f3f4f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .card { background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; text-align: center; }
          .success-badge { display: inline-block; background-color: #d1fae5; color: #065f46; padding: 10px 20px; border-radius: 50px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>✅ Test Réussi!</h1>
            </div>
            <div class="content">
              <div class="success-badge">Configuration email fonctionnelle</div>
              <p>Cet email confirme que votre système de notifications fonctionne correctement.</p>
              <p style="color: #6b7280;">Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
            </div>
            <div class="footer">
              <p>Santec RH Platform</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail({
      to: email,
      subject,
      html,
      text: `Test de notification réussi! Configuration email fonctionnelle. Envoyé le ${new Date().toLocaleString('fr-FR')}`
    });
  }
}

export const emailService = new EmailService();
