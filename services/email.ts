
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
      // 5. PENTING: Di EmailJS, jika Anda mengirim HTML, pastikan template mendukungnya (biasanya {{{message}}} tiga kurung).
      
      const templateParams = {
        to_email: to,               // Variabel ini wajib dipasang di field "To Email" pada Template EmailJS
        to_name: to.split('@')[0],  // Nama penerima
        from_name: appSettings.title, // Nama pengirim
        subject: subject,             // Subjek dinamis
        message: bodyText,            // HTML Body
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
      
      // Fallback: Buka aplikasi email user (stripping HTML tags for mailto)
      const plainBody = bodyText.replace(/<[^>]*>?/gm, '');
      emailService.openMailClient(to, subject, plainBody);
    }
  },

  sendInvite: (email: string, name: string, inviteLink: string, appSettings: AppSettings) => {
    // SUBJEK DIUBAH DISINI (Invitation & Account Activation)
    const subject = `Welcome to ${appSettings.title} - Activate Your Account`;
    
    // HTML TEMPLATE FOR BUTTON
    const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Welcome to ${appSettings.title}</h2>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">You have been invited to join the <strong>${appSettings.title}</strong> workspace.</p>
        <p style="color: #475569; font-size: 16px;">To activate your account and set your password, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Activate Account</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">${inviteLink}</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
        <p style="color: #1e293b; font-weight: bold;">${appSettings.title} Team</p>
    </div>
    `;

    emailService.sendEmail(email, subject, body, appSettings);
  },

  sendPasswordReset: (email: string, name: string, resetLink: string, appSettings: AppSettings) => {
    // SUBJEK DIUBAH DISINI (Password Reset)
    const subject = `Reset Password Request - ${appSettings.title}`;
    
    // HTML TEMPLATE FOR BUTTON
    const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #475569; font-size: 16px;">A password reset was requested for your account at <strong>${appSettings.title}</strong>.</p>
        <p style="color: #475569; font-size: 16px;">Please click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">${resetLink}</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This link is valid for one-time use.</p>
        <p style="color: #1e293b; font-weight: bold;">${appSettings.title} Team</p>
    </div>
    `;

    emailService.sendEmail(email, subject, body, appSettings);
  },

  openMailClient: (to: string, subject: string, body: string) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }
};
