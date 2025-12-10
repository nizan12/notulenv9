
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp,
  getDoc,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Minute, MinuteStatus, Unit, User, UserRole, AttendanceStatus, GlobalSettings } from "../types";

const MINUTES_COLLECTION = "minutes";
const USERS_COLLECTION = "users";
const UNITS_COLLECTION = "units";
const SETTINGS_COLLECTION = "settings";

// --- Auth ---

export const authenticateUser = async (identifier: string, password: string): Promise<User | null> => {
  try {
    const cleanId = identifier.trim();
    // 1. Try finding by email
    let q = query(collection(db, USERS_COLLECTION), where("email", "==", cleanId));
    let querySnapshot = await getDocs(q);

    // 2. If not found by email, try finding by NIK
    if (querySnapshot.empty) {
       q = query(collection(db, USERS_COLLECTION), where("nik", "==", cleanId));
       querySnapshot = await getDocs(q);
    }

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as User;
      
      // Simple password check (In a real app, use Firebase Auth or bcrypt)
      // Comparison is case-sensitive
      if (userData.password === password) {
        return { id: userDoc.id, ...userData };
      }
    }
    return null;
  } catch (error) {
    console.error("Error authenticating:", error);
    return null;
  }
};

export const getUser = async (id: string): Promise<User | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      console.log("No such user!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// --- Units ---

export const getUnits = async (): Promise<Unit[]> => {
  try {
    // Sorting units by name client-side is safer for small datasets to avoid index issues if we add filters later
    const q = query(collection(db, UNITS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const units = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
    
    // Sort client-side
    units.sort((a, b) => a.name.localeCompare(b.name));
    
    return units;
  } catch (error) {
    console.error("Error getting units:", error);
    return [];
  }
};

export const createUnit = async (data: Partial<Unit>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, UNITS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating unit:", error);
    throw error;
  }
};

export const updateUnit = async (id: string, data: Partial<Unit>) => {
  try {
    const docRef = doc(db, UNITS_COLLECTION, id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating unit:", error);
    throw error;
  }
};

export const deleteUnit = async (id: string) => {
  try {
    const docRef = doc(db, UNITS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting unit:", error);
    throw error;
  }
};

// --- Users ---

export const getUsers = async (roleFilter?: UserRole): Promise<User[]> => {
  try {
    let q = query(collection(db, USERS_COLLECTION));
    
    // Apply filter if needed, but remove orderBy("name") from the query to avoid Index errors
    if (roleFilter) {
      q = query(collection(db, USERS_COLLECTION), where("role", "==", roleFilter));
    }
    
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    // Sort client-side
    users.sort((a, b) => a.name.localeCompare(b.name));
    
    return users;
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
};

export const createUser = async (data: Partial<User>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (id: string, data: Partial<User>) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await updateDoc(docRef, data);

    // CASCADE UPDATE: If name changed, update participants in minutes
    if (data.name) {
       const minutesQ = query(collection(db, MINUTES_COLLECTION)); 
       const snap = await getDocs(minutesQ);
       
       const batch = writeBatch(db);
       let batchCount = 0;

       snap.docs.forEach(minuteDoc => {
         const m = minuteDoc.data() as Minute;
         let changed = false;
         
         // Update Participant Name
         const updatedParticipants = m.participants.map(p => {
           if (p.userId === id) {
             changed = true;
             return { ...p, name: data.name! };
           }
           return p;
         });
         
         // Update PIC Name
         if (m.picId === id) {
            changed = true;
            // logic handled below in batch.update
         }

         if (changed) {
           const updatePayload: any = { participants: updatedParticipants };
           if (m.picId === id) updatePayload.picName = data.name;
           
           batch.update(doc(db, MINUTES_COLLECTION, minuteDoc.id), updatePayload);
           batchCount++;
         }
       });

       if (batchCount > 0) {
         await batch.commit();
         console.log(`Cascade updated ${batchCount} minutes with new user name.`);
       }
    }

  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// --- Minutes ---

export const getMinutes = async (userId?: string, role?: UserRole, unitId?: string): Promise<Minute[]> => {
  try {
    let q;
    const minutesRef = collection(db, MINUTES_COLLECTION);

    if (role === UserRole.ADMIN) {
      // Admin sees all
      q = query(minutesRef); // Remove orderBy date here to rely on client sort
    } else if (role === UserRole.NOTULIS) {
      // Notulis sees minutes created by them OR for their Unit
      if (unitId) {
         q = query(minutesRef, where("unitId", "==", unitId));
      } else {
         q = query(minutesRef, where("authorId", "==", userId));
      }
    } else {
      // Peserta
      q = query(minutesRef); // Remove orderBy date here
    }

    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Minute));

    if (role === UserRole.PESERTA && userId) {
      results = results.filter(m => m.participants.some(p => p.userId === userId));
    }
    
    // Sort client-side
    results.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });

    return results;
  } catch (error) {
    console.error("Error getting minutes:", error);
    return [];
  }
};

export const createMinute = async (data: Partial<Minute>) => {
  try {
    await addDoc(collection(db, MINUTES_COLLECTION), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error creating minute:", error);
    throw error;
  }
};

export const updateMinute = async (id: string, data: Partial<Minute>) => {
  try {
    const docRef = doc(db, MINUTES_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating minute:", error);
    throw error;
  }
};

export const deleteMinute = async (id: string) => {
  try {
    const docRef = doc(db, MINUTES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting minute:", error);
    throw error;
  }
};

// Specialized update for attendance
export const updateParticipantStatus = async (minuteId: string, userId: string, status: AttendanceStatus, signature?: string) => {
  try {
    const minuteRef = doc(db, MINUTES_COLLECTION, minuteId);
    const minuteSnap = await getDoc(minuteRef);
    
    if (minuteSnap.exists()) {
      const minuteData = minuteSnap.data() as Minute;
      const updatedParticipants = minuteData.participants.map(p => {
        if (p.userId === userId) {
          return { 
            ...p, 
            attendance: status,
            signature: signature || p.signature 
          };
        }
        return p;
      });

      await updateDoc(minuteRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error updating participant status:", error);
    throw error;
  }
};

// NEW: Sign minute as PIC and Auto-update PIC's participant status
export const signMinuteAsPIC = async (minuteId: string, signature: string) => {
  try {
    const minuteRef = doc(db, MINUTES_COLLECTION, minuteId);
    const minuteSnap = await getDoc(minuteRef);

    if (minuteSnap.exists()) {
       const minuteData = minuteSnap.data() as Minute;
       const picId = minuteData.picId;

       // Auto-update attendance for the PIC in the participants list
       const updatedParticipants = minuteData.participants.map(p => {
         if (p.userId === picId) {
           return {
             ...p,
             attendance: AttendanceStatus.HADIR,
             signature: signature // Use the same signature
           };
         }
         return p;
       });

       await updateDoc(minuteRef, {
         picSignature: signature,
         participants: updatedParticipants,
         updatedAt: serverTimestamp()
       });
    }
  } catch (error) {
    console.error("Error signing minute as PIC:", error);
    throw error;
  }
};

// --- Settings (Global) ---

export const getGlobalSettings = async (): Promise<GlobalSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GlobalSettings;
    }
    return {};
  } catch (error) {
    console.error("Error getting settings:", error);
    return {};
  }
};

export const saveGlobalSettings = async (data: GlobalSettings) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'global');
    // Using setDoc with merge: true to update or create
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
};
