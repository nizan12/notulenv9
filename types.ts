
// Enum mapping from SQL 'role'
export enum UserRole {
  ADMIN = 'admin',
  NOTULIS = 'notulis',
  PESERTA = 'peserta'
}

// Enum mapping from SQL 'status'
export enum MinuteStatus {
  DRAFT = 'draft',
  FINAL = 'final'
}

// Enum mapping from SQL 'kehadiran'
export enum AttendanceStatus {
  HADIR = 'hadir',
  TIDAK_HADIR = 'tidak_hadir'
}

// Collection: 'units'
export interface Unit {
  id?: string;
  name: string; // nama_unit
  abbreviation?: string; // NEW: singkatan
  createdAt: any;
}

// Collection: 'users'
export interface User {
  id?: string; // firebase auth uid or auto-id
  nik: string;
  name: string;
  email: string;
  role: UserRole;
  unitId?: string; // Foreign Key to Unit (optional for Admin)
  phone?: string; // no_hp
  password?: string; // storing plain text for demo/requirement "password is NIK"
  photoBase64?: string; // Use standard naming internally if preferred, or photo_user mapping
  photo_user?: string; // Requirement requested photo_user
  createdAt: any;
}

// Sub-structure for Minutes (replacing 'notulen_peserta' table)
export interface Participant {
  userId: string;
  name: string; // Cached name for display
  unitName?: string; // Cached Unit Name for PDF
  attendance: AttendanceStatus;
  signature?: string; // Base64 Data URL of the signature
}

// Sub-structure for Minutes (replacing 'lampiran' table)
export interface Attachment {
  fileName: string; // nama_file
  filePath: string; // file_path (url or storage path)
  uploadedAt: string; // ISO string
}

// New Structure for Structured Minute Items
export interface MinuteItem {
  topic: string;     // Pokok Bahasan
  decision: string;  // Keputusan
  action: string;    // Tindakan
  pic: string;       // PIC (Pelaksana untuk item ini)
  monitoring: string;// Monitoring
}

// Collection: 'minutes' (replacing 'notulen' table)
export interface Minute {
  id?: string;
  title: string; // judul_rapat
  date: string; // tanggal (ISO Date string YYYY-MM-DD)
  time: string; // NEW: Jam Rapat (HH:mm)
  location: string; // lokasi
  
  // NEW: Structural changes
  picId: string; // ID of the User responsible for the meeting (PIC Rapat)
  picName: string; // Cached name of the PIC
  picSignature?: string; // Signature of the PIC Rapat
  
  items: MinuteItem[]; // List of structured items (replacing content & conclusion)
  
  status: MinuteStatus;
  authorId: string; // user_id (The Notulis)
  unitId: string; // unit_id (The Unit holding the meeting)
  participants: Participant[]; // Embedded array instead of 'notulen_peserta' table
  attachments: Attachment[]; // Embedded array instead of 'lampiran' table
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

// Collection: 'settings' (Doc ID: 'global')
export interface GlobalSettings {
  logoBase64?: string; // Organization logo for PDF Header
  sidebarLogoBase64?: string; // Application UI Logo (Sidebar/Header)
}