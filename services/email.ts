
import { AppSettings } from '../types';
import emailjs from '@emailjs/browser';

// --- KONFIGURASI EMAILJS ---
// Dapatkan credential ini dari: https://dashboard.emailjs.com/
// 1. Buat Service Baru (pilih Gmail) -> Copy Service ID
// 2. Buat Template Baru -> Copy Template ID
// 3. Masuk ke Account > General -> Copy Public Key

const EMAILJS_SERVICE_ID = 'service_e1y1i0m';    // Ganti dengan Service ID Anda
const EMAILJS_TEMPLATE_ID = 'template_s9v9uq3';  // Ganti dengan Template ID Anda
const EMAILJS_PUBLIC_KEY = '7ELueXyK3jAvOi0BO';  // Ganti dengan Public Key Anda

// Helper to trigger toast
const triggerToast = (type: 'success' | 'error', title: string, message: string) => {
    const event = new CustomEvent('zoomclone-toast', {
        detail: { type, title, message }
    });
    window.dispatchEvent(event);
};

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
        triggerToast('error', 'Configuration Missing', "Konfigurasi EmailJS belum diset. Membuka aplikasi email default.");
        emailService.openMailClient(to, subject, bodyText);
        return;
    }

    try {
      // --- PENTING: SETTING EMAILJS DASHBOARD ---
      // Agar email sampai ke user, pastikan setting di https://dashboard.emailjs.com/admin/templates/:
      // 1. Field "To Email" HARUS diisi: {{to_email}} 
      // 2. Field "From Name" bisa diisi: {{from_name}}
      // 3. Field "Subject" HARUS diisi: {{subject}} (Supaya subjek yang kita set disini muncul)
      // 4. Isi pesan (Content) harus mengandung: {{message}}
      
      const templateParams = {
        to_email: to,               // Variabel ini wajib dipasang di field "To Email" pada Template EmailJS
        to_name: to.split('@')[0],  // Nama penerima
        from_name: appSettings.title, // Nama pengirim
        subject: subject,             // Subjek dinamis
        message: bodyText,            // Plain Text Body
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
        
        // --- NEW POPUP NOTIFICATION ---
        triggerToast('success', 'Email Sent Successfully', `Email has been sent to ${to}.\n\nSubject: "${subject}"`);
        
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`);
      }
      
    } catch (err) {
      console.error('EmailJS FAILED...', err);
      console.warn("Falling back to Mailto.");
      
      triggerToast('error', 'Email Delivery Failed', "Could not send email automatically. Opening your default mail app instead.");
      
      // Fallback: Buka aplikasi email user
      emailService.openMailClient(to, subject, bodyText);
    }
  },

  sendInvite: (email: string, name: string, inviteLink: string, appSettings: AppSettings) => {
    const subject = `Welcome to ${appSettings.title} - Activate Your Account`;
    
    // PLAIN TEXT TEMPLATE
    const body = `Welcome to ${appSettings.title}

Hi ${name},

You have been invited to join the ${appSettings.title} workspace.

Please click the link below to set your password and activate your account:
${inviteLink}

If you did not expect this invitation, please ignore this email.

${appSettings.title} Team`;

    emailService.sendEmail(email, subject, body, appSettings);
  },

  sendPasswordReset: (email: string, name: string, resetLink: string, appSettings: AppSettings) => {
    const subject = `Reset Password Request - ${appSettings.title}`;
    
    // PLAIN TEXT TEMPLATE
    const body = `Reset Your Password

Hi ${name},

A password reset was requested for your account at ${appSettings.title}.

Please click the link below to create a new password:
${resetLink}

This link is valid for one-time use.

${appSettings.title} Team`;

    emailService.sendEmail(email, subject, body, appSettings);
  },

  openMailClient: (to: string, subject: string, body: string) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }
};
