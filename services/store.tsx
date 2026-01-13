import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Bus, Booking, Part, Transaction, TimeOff, UserRole, DriverDocument, MaintenanceRecord, PurchaseRequest, MaintenanceReport, CharterContract, TravelPackage, PackagePassenger, PackagePayment, Client } from '../types';
import { MOCK_USERS, MOCK_BUSES, MOCK_PARTS } from '../constants';

// Firebase Imports
import { db, auth, isConfigured } from './firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, writeBatch 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile 
} from 'firebase/auth';

interface StoreContextType {
  currentUser: User;
  isAuthenticated: boolean;
  users: User[];
  buses: Bus[];
  bookings: Booking[];
  parts: Part[];
  transactions: Transaction[];
  timeOffs: TimeOff[];
  documents: DriverDocument[];
  maintenanceRecords: MaintenanceRecord[];
  purchaseRequests: PurchaseRequest[];
  maintenanceReports: MaintenanceReport[];
  charterContracts: CharterContract[];
  travelPackages: TravelPackage[];
  packagePassengers: PackagePassenger[];
  packagePayments: PackagePayment[];
  clients: Client[];
  
  // Actions
  login: (email: string, password: string) => Promise<{success: boolean, message?: string}>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{success: boolean, message?: string}>;
  logout: () => void;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => Promise<{ success: boolean; message: string }>;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  addPart: (part: Omit<Part, 'id'>) => void;
  updateStock: (id: string, quantityDelta: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTimeOff: (timeOff: Omit<TimeOff, 'id' | 'status'>) => void;
  updateTimeOffStatus: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  addDocument: (doc: Omit<DriverDocument, 'id' | 'uploadDate'>) => void;
  deleteDocument: (id: string) => void;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  addPurchaseRequest: (req: Omit<PurchaseRequest, 'id' | 'status' | 'requestDate'>) => void;
  updatePurchaseRequestStatus: (id: string, status: PurchaseRequest['status']) => void;
  addMaintenanceReport: (report: Omit<MaintenanceReport, 'id' | 'status'>) => void;
  updateMaintenanceReportStatus: (id: string, status: MaintenanceReport['status']) => void;
  addBus: (bus: Omit<Bus, 'id' | 'status'>) => void;
  updateBusStatus: (id: string, status: Bus['status']) => void;
  addCharterContract: (contract: Omit<CharterContract, 'id' | 'status'>) => void;
  addTravelPackage: (pkg: Omit<TravelPackage, 'id' | 'status'>) => void;
  registerPackageSale: (
      clientData: Omit<Client, 'id'>, 
      saleData: Omit<PackagePassenger, 'id' | 'clientId' | 'paidAmount' | 'status' | 'titularName' | 'titularCpf'>
  ) => void;
  addPackagePayment: (payment: Omit<PackagePayment, 'id'>) => void;
  seedDatabase: () => Promise<void>; // Setup initial data
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>([]);
  const [charterContracts, setCharterContracts] = useState<CharterContract[]>([]);
  const [travelPackages, setTravelPackages] = useState<TravelPackage[]>([]);
  const [packagePassengers, setPackagePassengers] = useState<PackagePassenger[]>([]);
  const [packagePayments, setPackagePayments] = useState<PackagePayment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // --- FIREBASE LISTENERS (REAL-TIME SYNC) ---
  useEffect(() => {
    // If not configured, don't try to connect to avoid console errors spam
    if (!isConfigured) return;

    // 1. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            setIsAuthenticated(true);
            // We do NOT set currentUser here immediately because we want the full profile from Firestore.
            // App.tsx handles the loading state (isAuthenticated=true && currentUser=null).
        } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
        }
    });

    // 2. Data Listeners
    const collectionsToSync = [
        { name: 'users', setter: setUsers },
        { name: 'buses', setter: setBuses },
        { name: 'bookings', setter: setBookings },
        { name: 'parts', setter: setParts },
        { name: 'transactions', setter: setTransactions },
        { name: 'timeOffs', setter: setTimeOffs },
        { name: 'documents', setter: setDocuments },
        { name: 'maintenanceRecords', setter: setMaintenanceRecords },
        { name: 'purchaseRequests', setter: setPurchaseRequests },
        { name: 'maintenanceReports', setter: setMaintenanceReports },
        { name: 'charterContracts', setter: setCharterContracts },
        { name: 'travelPackages', setter: setTravelPackages },
        { name: 'packagePassengers', setter: setPackagePassengers },
        { name: 'packagePayments', setter: setPackagePayments },
        { name: 'clients', setter: setClients },
    ];

    const unsubscribes = collectionsToSync.map(c => 
        onSnapshot(
            collection(db, c.name), 
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                c.setter(data as any);
            },
            (error) => {
                // Handle permission-denied or other connection errors gracefully
                console.warn(`Firestore sync error on ${c.name}:`, error.message);
            }
        )
    );

    return () => {
        unsubscribeAuth();
        unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Sync CurrentUser with Users list
  useEffect(() => {
      if (auth.currentUser && users.length > 0) {
          const dbUser = users.find(u => u.email === auth.currentUser?.email);
          if (dbUser) {
              setCurrentUser(dbUser);
          } else {
              // Fallback if user is logged in Auth but not in Users collection
              setCurrentUser({
                  id: auth.currentUser.uid,
                  name: auth.currentUser.displayName || 'Usuário',
                  email: auth.currentUser.email || '',
                  role: UserRole.DRIVER, // Default safe role
                  avatar: auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.email}&background=random`
              });
          }
      }
  }, [users, isAuthenticated]);


  // --- AUTH ACTIONS ---

  const login = async (email: string, password: string) => {
      if (!isConfigured) return { success: false, message: "Firebase não configurado." };
      try {
          await signInWithEmailAndPassword(auth, email, password);
          return { success: true };
      } catch (error: any) {
          return { success: false, message: error.message };
      }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
      if (!isConfigured) return { success: false, message: "Firebase não configurado." };
      try {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(res.user, { displayName: name });
          
          // Create User document in Firestore
          await setDoc(doc(db, 'users', res.user.uid), {
              id: res.user.uid,
              name,
              email,
              role,
              avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
          });
          
          return { success: true };
      } catch (error: any) {
          return { success: false, message: error.message };
      }
  };

  const logout = async () => {
      if (isConfigured) await signOut(auth);
  };

  const switchUser = (userId: string) => {
      const user = users.find(u => u.id === userId);
      if (user) setCurrentUser(user);
  };

  // --- DATA ACTIONS (Refactored to Firestore) ---

  const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'users'), {
          ...userData,
          avatar: `https://ui-avatars.com/api/?name=${userData.name}&background=random`
      });
  };

  const updateUser = async (id: string, data: Partial<User>) => {
      if (!isConfigured) return;
      await updateDoc(doc(db, 'users', id), data);
  };

  const deleteUser = async (id: string) => {
      if (!isConfigured) return;
      await deleteDoc(doc(db, 'users', id));
  };

  const checkAvailability = (busId: string, start: string, end: string): boolean => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    return !bookings.some(b => {
      if (b.busId !== busId || b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return (startDate < bEnd && endDate > bStart);
    });
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'status'>): Promise<{ success: boolean; message: string }> => {
    if (!isConfigured) return { success: false, message: "Banco de dados desconectado." };
    
    // 1. Check Bus Availability
    if (!checkAvailability(bookingData.busId, bookingData.startTime, bookingData.endTime)) {
      return { success: false, message: 'Conflito: Este ônibus já está alugado neste período!' };
    }

    // 2. Check Driver Availability (Safety Lock)
    if (bookingData.driverId) {
        const tripStart = new Date(bookingData.startTime).getTime();
        const tripEnd = new Date(bookingData.endTime).getTime();

        const driverConflict = timeOffs.find(t => {
            // Check only approved time offs for this driver
            if (t.driverId !== bookingData.driverId || t.status !== 'APPROVED') return false;
            
            // Time Off Date Range (Assuming full day)
            // Fix: Create dates explicitly from YYYY-MM-DD to avoid timezone shifts
            const [y, m, d] = t.date.split('-').map(Number);
            const offStart = new Date(y, m - 1, d, 0, 0, 0).getTime();
            const offEnd = new Date(y, m - 1, d, 23, 59, 59).getTime();

            // Check if Trip overlaps with Time Off
            return (tripStart <= offEnd && tripEnd >= offStart);
        });

        if (driverConflict) {
            // Helper to format date
            const dateStr = driverConflict.date.split('-').reverse().join('/');
            return { 
                success: false, 
                message: `Motorista Indisponível! Ele está de ${driverConflict.type} no dia ${dateStr}. Cancele a folga primeiro.` 
            };
        }
    }

    const newBooking = { ...bookingData, status: 'CONFIRMED' };
    const docRef = await addDoc(collection(db, 'bookings'), newBooking);
    
    // If paid/scheduled, add transaction
    if (newBooking.value > 0 && newBooking.paymentStatus !== 'PENDING') {
        let transStatus = newBooking.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING';
        let transDesc = `Locação: ${newBooking.clientName} - ${newBooking.destination}`;
        if (newBooking.paymentStatus === 'SCHEDULED') transDesc += " (Agendado)";

        await addDoc(collection(db, 'transactions'), {
            type: 'INCOME',
            status: transStatus,
            category: 'Locação',
            amount: newBooking.value,
            date: newBooking.paymentDate || new Date().toISOString(),
            description: transDesc,
            relatedBookingId: docRef.id
        });
    }

    return { success: true, message: 'Agendamento salvo na nuvem!' };
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    if (!isConfigured) return;
    await updateDoc(doc(db, 'bookings', id), { status });
  };

  const addPart = async (part: Omit<Part, 'id'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'parts'), part);
  };

  const updateStock = async (id: string, quantityDelta: number) => {
    if (!isConfigured) return;
    const part = parts.find(p => p.id === id);
    if (part) {
        const newQty = Math.max(0, part.quantity + quantityDelta);
        await updateDoc(doc(db, 'parts', id), { quantity: newQty });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'transactions'), transaction);
  };

  const addTimeOff = async (timeOff: Omit<TimeOff, 'id' | 'status'>) => {
    if (!isConfigured) return;
    const isManager = currentUser?.role === UserRole.MANAGER;
    await addDoc(collection(db, 'timeOffs'), {
        ...timeOff,
        status: isManager ? 'APPROVED' : 'PENDING'
    });
  };

  const updateTimeOffStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!isConfigured) return;
    await updateDoc(doc(db, 'timeOffs', id), { status });
  };

  const addDocument = async (docData: Omit<DriverDocument, 'id' | 'uploadDate'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'documents'), {
        ...docData,
        uploadDate: new Date().toISOString()
    });
  };

  const deleteDocument = async (id: string) => {
    if (!isConfigured) return;
    await deleteDoc(doc(db, 'documents', id));
  };

  const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id'>) => {
      if (!isConfigured) return;
      // 1. Create Record
      await addDoc(collection(db, 'maintenanceRecords'), record);
      
      // 2. Decrement Stock
      await updateStock(record.partId, -record.quantityUsed);

      // 3. Create Expense
      const part = parts.find(p => p.id === record.partId);
      const bus = buses.find(b => b.id === record.busId);
      const cost = part ? part.price * record.quantityUsed : 0;
      
      await addDoc(collection(db, 'transactions'), {
          type: 'EXPENSE',
          status: 'COMPLETED',
          category: 'Manutenção',
          amount: cost,
          date: record.date,
          description: `Manutenção ${record.type}: ${bus?.plate} - ${part?.name} (x${record.quantityUsed})`
      });
  };

  const addPurchaseRequest = async (req: Omit<PurchaseRequest, 'id' | 'status' | 'requestDate'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'purchaseRequests'), {
          ...req,
          status: 'PENDING',
          requestDate: new Date().toISOString()
      });
  };

  const updatePurchaseRequestStatus = async (id: string, status: PurchaseRequest['status']) => {
    if (!isConfigured) return;
    await updateDoc(doc(db, 'purchaseRequests', id), { status });
  };

  const addMaintenanceReport = async (report: Omit<MaintenanceReport, 'id' | 'status'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'maintenanceReports'), {
        ...report,
        status: 'PENDING'
    });
  };

  const updateMaintenanceReportStatus = async (id: string, status: MaintenanceReport['status']) => {
    if (!isConfigured) return;
    await updateDoc(doc(db, 'maintenanceReports', id), { status });
  };

  const addBus = async (bus: Omit<Bus, 'id' | 'status'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'buses'), { ...bus, status: 'AVAILABLE' });
  };

  const updateBusStatus = async (id: string, status: Bus['status']) => {
    if (!isConfigured) return;
    await updateDoc(doc(db, 'buses', id), { status });
  };

  const addCharterContract = async (contract: Omit<CharterContract, 'id' | 'status'>) => {
      if (!isConfigured) return;
      const contractRef = await addDoc(collection(db, 'charterContracts'), { ...contract, status: 'ACTIVE' });
      
      // Auto-generate bookings
      const batch = writeBatch(db);
      let currentDate = new Date(contract.startDate);
      const end = new Date(contract.endDate);
      const tripDurationMs = 90 * 60 * 1000;

      let count = 0;

      while (currentDate <= end && count < 450) {
          if (contract.weekDays.includes(currentDate.getDay())) {
              const dateStr = currentDate.toISOString().split('T')[0];
              
              if (contract.morningDeparture) {
                  const startMorning = new Date(`${dateStr}T${contract.morningDeparture}:00`);
                  const endMorning = new Date(startMorning.getTime() + tripDurationMs);
                  const ref = doc(collection(db, 'bookings'));
                  batch.set(ref, {
                      busId: contract.busId,
                      driverId: contract.driverId,
                      clientName: contract.clientName,
                      clientPhone: '',
                      destination: `${contract.route} (Manhã)`,
                      startTime: startMorning.toISOString(),
                      endTime: endMorning.toISOString(),
                      value: 0,
                      status: 'CONFIRMED',
                      paymentStatus: 'PAID',
                      paymentDate: new Date().toISOString(),
                      departureLocation: 'Garagem/Ponto Inicial',
                      presentationTime: new Date(startMorning.getTime() - 1800000).toISOString(),
                      type: 'FRETAMENTO',
                      contractId: contractRef.id
                  });
                  count++;
              }

              if (contract.afternoonDeparture) {
                  const startAfternoon = new Date(`${dateStr}T${contract.afternoonDeparture}:00`);
                  const endAfternoon = new Date(startAfternoon.getTime() + tripDurationMs);
                  const ref = doc(collection(db, 'bookings'));
                  batch.set(ref, {
                    busId: contract.busId,
                    driverId: contract.driverId,
                    clientName: contract.clientName,
                    clientPhone: '',
                    destination: `${contract.route} (Tarde)`,
                    startTime: startAfternoon.toISOString(),
                    endTime: endAfternoon.toISOString(),
                    value: 0,
                    status: 'CONFIRMED',
                    paymentStatus: 'PAID',
                    paymentDate: new Date().toISOString(),
                    departureLocation: 'Empresa/Fábrica',
                    presentationTime: new Date(startAfternoon.getTime() - 1800000).toISOString(),
                    type: 'FRETAMENTO',
                    contractId: contractRef.id
                });
                count++;
              }
          }
          currentDate.setDate(currentDate.getDate() + 1);
      }
      await batch.commit();
  };

  const addTravelPackage = async (pkg: Omit<TravelPackage, 'id' | 'status'>) => {
    if (!isConfigured) return;
    await addDoc(collection(db, 'travelPackages'), { ...pkg, status: 'OPEN' });
  };

  const registerPackageSale = async (
      clientData: Omit<Client, 'id'>, 
      saleData: Omit<PackagePassenger, 'id' | 'clientId' | 'paidAmount' | 'status' | 'titularName' | 'titularCpf'>
  ) => {
    if (!isConfigured) return;
    let clientId = '';
    const existingClient = clients.find(c => c.cpf === clientData.cpf);
    
    if (existingClient) {
        clientId = existingClient.id;
        await updateDoc(doc(db, 'clients', clientId), { ...clientData });
    } else {
        const clientRef = await addDoc(collection(db, 'clients'), clientData);
        clientId = clientRef.id;
    }

    await addDoc(collection(db, 'packagePassengers'), {
        ...saleData,
        clientId,
        titularName: clientData.name,
        titularCpf: clientData.cpf,
        paidAmount: 0,
        status: 'PENDING'
    });
  };

  const addPackagePayment = async (payment: Omit<PackagePayment, 'id'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'packagePayments'), payment);
      
      const passenger = packagePassengers.find(p => p.id === payment.passengerId);
      if (passenger) {
          const newPaidAmount = passenger.paidAmount + payment.amount;
          const newStatus = newPaidAmount >= passenger.agreedPrice ? 'PAID' : 'PARTIAL';
          await updateDoc(doc(db, 'packagePassengers', passenger.id), {
              paidAmount: newPaidAmount,
              status: newStatus
          });

          const pkg = travelPackages.find(tp => tp.id === passenger.packageId);
          await addDoc(collection(db, 'transactions'), {
            type: 'INCOME',
            status: 'COMPLETED',
            category: 'Pacotes de Viagem',
            amount: payment.amount,
            date: payment.date,
            description: `Pagamento Pacote: ${pkg?.title} - Passageiro: ${passenger?.titularName} (${payment.method})`
        });
      }
  };

  const seedDatabase = async () => {
      if (!isConfigured) {
          alert("Configure o Firebase primeiro!");
          return;
      }
      // Helper to populate empty DB with mock data
      const batch = writeBatch(db);
      
      if (buses.length === 0) {
          MOCK_BUSES.forEach(b => {
              const ref = doc(collection(db, 'buses')); // Auto ID
              batch.set(ref, { ...b, id: ref.id });
          });
      }
      if (parts.length === 0) {
          MOCK_PARTS.forEach(p => {
              const ref = doc(collection(db, 'parts'));
              batch.set(ref, { ...p, id: ref.id });
          });
      }
      
      await batch.commit();
      alert('Banco de dados populado com dados iniciais!');
  };

  return (
    <StoreContext.Provider value={{
      currentUser: currentUser!, isAuthenticated, users, buses, bookings, parts, transactions, timeOffs, documents, maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts, travelPackages, packagePassengers, packagePayments, clients,
      switchUser, addUser, updateUser, deleteUser, addBooking, updateBookingStatus, addPart, updateStock, addTransaction, addTimeOff, updateTimeOffStatus, addDocument, deleteDocument, addMaintenanceRecord, addPurchaseRequest, updatePurchaseRequestStatus, addMaintenanceReport, updateMaintenanceReportStatus, addBus, updateBusStatus, addCharterContract, addTravelPackage, registerPackageSale, addPackagePayment, 
      login, logout, register, seedDatabase
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};