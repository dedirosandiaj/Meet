
import { AppSettings, Meeting } from '../types';
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

// --- CALENDAR LINK GENERATOR ---
const formatForCalendarUrl = (dateStr: string, timeStr: string) => {
    // Convert meeting date/time to ISO string without punctuation for URLs (YYYYMMDDTHHMMSS)
    // Assume Duration is 1 Hour for simplicity
    
    let targetDate = new Date();
    const now = new Date();

    // Parse Date
    if (dateStr === 'Today') {
        targetDate = now;
    } else if (dateStr === 'Tomorrow') {
        targetDate.setDate(now.getDate() + 1);
    } else {
        // Expect YYYY-MM-DD from HTML input
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) targetDate = parsed;
    }

    // Parse Time (HH:MM)
    const [hours, minutes] = timeStr.split(':').map(Number);
    targetDate.setHours(hours || 0, minutes || 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(targetDate.getHours() + 1); // Add 1 hour duration

    const toISO = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    return {
        start: toISO(targetDate),
        end: toISO(endDate),
        rawStart: targetDate,
        rawEnd: endDate
    };
};

const generateCalendarLinksInternal = (meeting: Meeting, joinUrl: string) => {
    const { start, end } = formatForCalendarUrl(meeting.date, meeting.time);
    const title = encodeURIComponent(meeting.title);
    const details = encodeURIComponent(`Join Meeting: ${joinUrl}\n\nMeeting ID: ${meeting.id}`);
    const location = encodeURIComponent("Online Meeting");

    // Google Calendar Link
    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

    // Outlook Web Link
    const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${title}&body=${details}&location=${location}`;

    return { google, outlook };
};

export const emailService = {
  /**
   * Mengirim email menggunakan EmailJS.
   * Jika konfigurasi belum diisi atau gagal, akan fallback ke mailto.
   * Returns true if successful, false otherwise.
   */
  sendEmail: async (to: string, subject: string, bodyText: string, appSettings: AppSettings): Promise<boolean> => {
    console.log(`Attempting to send email to ${to} via EmailJS...`);

    // Cek apakah user sudah mengganti placeholder
    if (EMAILJS_SERVICE_ID.includes('YOUR_') || EMAILJS_PUBLIC_KEY.includes('YOUR_')) {
        console.warn("EmailJS credentials not configured in services/email.ts");
        triggerToast('error', 'Configuration Missing', "Konfigurasi EmailJS belum diset. Membuka aplikasi email default.");
        emailService.openMailClient(to, subject, bodyText);
        return false;
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
        return true;
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`);
      }
      
    } catch (err) {
      console.error('EmailJS FAILED...', err);
      console.warn("Falling back to Mailto.");
      
      triggerToast('error', 'Email Delivery Failed', "Could not send email automatically. Opening your default mail app instead.");
      
      // Fallback: Buka aplikasi email user
      emailService.openMailClient(to, subject, bodyText);
      return false;
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

    return emailService.sendEmail(email, subject, body, appSettings);
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

    return emailService.sendEmail(email, subject, body, appSettings);
  },

  sendMeetingInvite: (email: string, name: string, meeting: Meeting, appSettings: AppSettings) => {
    const subject = `Meeting Invitation: ${meeting.title}`;
    const baseUrl = window.location.origin;
    const joinUrl = `${baseUrl}/join/${meeting.id}`;
    
    // Generate Calendar Links
    const { google, outlook } = generateCalendarLinksInternal(meeting, joinUrl);

    // PLAIN TEXT TEMPLATE FOR MEETING
    const body = `Meeting Invitation

Hi ${name},

You have been invited to join a meeting on ${appSettings.title}.

Topic: ${meeting.title}
Date: ${meeting.date}
Time: ${meeting.time}
Meeting ID: ${meeting.id}

Join Link:
${joinUrl}

---
ADD TO CALENDAR:

Google Calendar:
${google}

Outlook Calendar:
${outlook}
---

Please join at the scheduled time.

${appSettings.title} Team`;

    return emailService.sendEmail(email, subject, body, appSettings);
  },

  // --- PUBLIC HELPER: Get Web Links ---
  getCalendarLinks: (meeting: Meeting) => {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join/${meeting.id}`;
      return generateCalendarLinksInternal(meeting, joinUrl);
  },

  // --- NEW: GENERATE & DOWNLOAD ICS FILE ---
  downloadICSFile: (meeting: Meeting) => {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join/${meeting.id}`;
      const { start, end, rawStart } = formatForCalendarUrl(meeting.date, meeting.time);
      
      // Format Date for ICS (YYYYMMDDTHHMMSSZ)
      const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const now = formatDate(new Date());
      const dtStart = formatDate(rawStart);
      const dtEnd = formatDate(new Date(rawStart.getTime() + 60 * 60 * 1000)); // +1 Hour

      const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//ZoomClone AI//Meeting//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${meeting.id}@zoomclone.ai`,
          `DTSTAMP:${now}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `SUMMARY:${meeting.title}`,
          `DESCRIPTION:Join Meeting: ${joinUrl}\\n\\nMeeting ID: ${meeting.id}`,
          'LOCATION:Online Meeting',
          'STATUS:CONFIRMED',
          'END:VEVENT',
          'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `meeting-${meeting.id}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  },

  openMailClient: (to: string, subject: string, body: string) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }
};
