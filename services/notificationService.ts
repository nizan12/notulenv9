
export const FONNTE_API_URL = "https://api.fonnte.com/send";
export const FONNTE_API_KEY = "tUi9xzDBiwqgnCFsRhZN";

interface MeetingDetails {
  title: string;
  date: string;
  location: string;
  unitName?: string;
}

/**
 * Format phone number to standard Indonesian format (62...)
 * Replaces leading '0' with '62'.
 * Handles +62, 62, 08, or just 8...
 */
const formatPhoneNumber = (phone: string): string | null => {
  // 1. Remove all non-numeric characters (spaces, dashes, +, etc)
  let cleanPhone = phone.replace(/\D/g, '');

  // 2. Logic conversion
  if (cleanPhone.startsWith('0')) {
    // Case: 0812... -> 62812...
    cleanPhone = '62' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('62')) {
    // Case: 62812... -> Keep as is
  } else {
    // Case: 812... (Missing prefix) -> 62812...
    cleanPhone = '62' + cleanPhone;
  }
  
  // Basic validation length (Indonesian numbers are min 10 digits including country code)
  if (cleanPhone.length < 10) return null;
  
  return cleanPhone;
};

export const sendWhatsAppInvitation = async (
  targetPhone: string, 
  userName: string,
  details: MeetingDetails
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(targetPhone);
  
  if (!formattedPhone) {
    console.warn(`Invalid phone number for ${userName}: ${targetPhone}`);
    return false;
  }

  const message = `Halo Bapak/Ibu *${userName}*,

Anda telah diundang sebagai peserta dalam rapat berikut:

*Judul*: ${details.title}
*Tanggal*: ${details.date}
*Lokasi*: ${details.location}
${details.unitName ? `*Unit*: ${details.unitName}` : ''}

Mohon kehadirannya tepat waktu.
Terima kasih.

_Notifikasi otomatis dari Rapat - Notulen_`;

  const formData = new FormData();
  formData.append('target', formattedPhone);
  formData.append('message', message);
  formData.append('countryCode', '62'); // Optional fallback for Fonnte

  try {
    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_API_KEY,
        // Content-Type is handled automatically by FormData
      },
      body: formData,
    });

    const result = await response.json();
    console.log(`WhatsApp sent to ${userName} (${formattedPhone}):`, result);
    return result.status === true; // Fonnte returns { status: true/false, ... }
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${userName}:`, error);
    return false;
  }
};
