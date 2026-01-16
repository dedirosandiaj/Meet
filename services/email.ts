
import { AppSettings } from '../types';
import emailjs from '@emailjs/browser';

// --- KONFIGURASI EMAILJS ---
// Dapatkan credential ini dari: https://dashboard.emailjs.com/
// 1. Buat Service Baru (pilih Gmail) -> Copy Service ID
// 2. Buat Template Baru -> Copy Template ID
// 3. Masuk ke Account > General -> Copy Public Key
// 
// Pastikan Template EmailJS Anda memiliki variabel: 
// {{to_email}}, {{to_name}}, {{subject}}, {{message}}

const EMAILJS_SERVICE_ID = 'service_e1y1i0m';    // Ganti dengan Service ID Anda
const EMAILJS_TEMPLATE_ID = 'template_s9v9uq3';  // Ganti dengan Template ID Anda
const EMAILJS_PUBLIC_KEY = '7ELueXyK3jAvOi0BO';    // Ganti dengan Public Key Anda

export const emailService = {
  /**
   * Mengirim email menggunakan EmailJS.
   * Jika konfigurasi belum diisi atau gagal, akan fallback ke mailto.
   */
  sendEmail: async (to: string, subject: string, bodyText: string, appSettings: AppSettings) => {
    console.log(`Attempting to send email to ${to} via EmailJS...`);

    // Cek apakah user sudah mengganti placeholder
    if (EMAILJS_SERVICE_ID.includes('YOUR_') || EMAILJS_PUBLIC_KEY.includes('YOUR_')) {
        console.warn("EmailJS credentials not configured in services/email.ts");
        alert("Konfigurasi EmailJS belum diset di services/email.ts. Membuka aplikasi email default.");
        emailService.openMailClient(to, subject, bodyText);
        return;
    }

    try {
      const templateParams = {
        to_email: to,
        to_name: to, // Bisa disesuaikan jika nama tersedia
        subject: subject,
        message: bodyText,
        app_name: appSettings.title
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        console.log('SUCCESS!', response.status, response.text);
        alert(`Email sent successfully to ${to}`);
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`);
      }
      
    } catch (err) {
      console.error('EmailJS FAILED...', err);
      console.warn("Falling back to Mailto.");
      // Fallback: Buka aplikasi email user
      emailService.openMailClient(to, subject, bodyText);
    }
  },

  sendInvite: (email: string, name: string, inviteLink: string, appSettings: AppSettings) => {
    const subject = `Invitation to join ${appSettings.title}`;
    const body = `Hi ${name},

You have been invited to join the ${appSettings.title} workspace.

To activate your account and set your password, please click the link below:

${inviteLink}

If you did not expect this invitation, please ignore this email.

Best regards,
${appSettings.title} Admin`;

    // Kita passing juga nama penerima untuk template params jika dibutuhkan
    // Namun fungsi sendEmail di atas masih menggunakan signature (to, subject, body, appSettings)
    // Untuk EmailJS, kita kirim isi body yang sudah diformat.
    emailService.sendEmail(email, subject, body, appSettings);
  },

  sendPasswordReset: (email: string, name: string, resetLink: string, appSettings: AppSettings) => {
    const subject = `Reset Password Request - ${appSettings.title}`;
    const body = `Hi ${name},

A password reset was requested for your account at ${appSettings.title}.

Please click the link below to create a new password:

${resetLink}

This link is valid for one-time use.

Best regards,
${appSettings.title} Team`;

    emailService.sendEmail(email, subject, body, appSettings);
  },

  openMailClient: (to: string, subject: string, body: string) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }
};
