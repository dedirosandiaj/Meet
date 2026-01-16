
import { AppSettings } from '../types';

export const emailService = {
  /**
   * Membuka default mail client user dengan template Invitation
   */
  sendInvite: (email: string, name: string, inviteLink: string, appSettings: AppSettings) => {
    const subject = `Invitation to join ${appSettings.title}`;
    const body = `Hi ${name},

You have been invited to join the ${appSettings.title} workspace.

To activate your account and set your password, please click the link below:

${inviteLink}

If you did not expect this invitation, please ignore this email.

Best regards,
${appSettings.title} Admin`;

    emailService.openMailClient(email, subject, body);
  },

  /**
   * Membuka default mail client user dengan template Reset Password
   */
  sendPasswordReset: (email: string, name: string, resetLink: string, appSettings: AppSettings) => {
    const subject = `Reset Password Request - ${appSettings.title}`;
    const body = `Hi ${name},

A password reset was requested for your account at ${appSettings.title}.

Please click the link below to create a new password:

${resetLink}

This link is valid for one-time use.

Best regards,
${appSettings.title} Team`;

    emailService.openMailClient(email, subject, body);
  },

  /**
   * Helper internal untuk membuka window mailto
   */
  openMailClient: (to: string, subject: string, body: string) => {
    // Encode URI components agar karakter khusus (spasi, enter, dll) terbaca benar di URL
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Buka di window baru/tab baru (atau trigger app default)
    window.open(mailtoLink, '_blank');
  }
};
