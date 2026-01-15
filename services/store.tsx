
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Bus, Booking, Part, Transaction, TimeOff, UserRole, DriverDocument, MaintenanceRecord, PurchaseRequest, MaintenanceReport, CharterContract, TravelPackage, PackagePassenger, PackagePayment, Client, FuelRecord, FuelSupply, DriverLiability, PackageLead } from '../types';
import { MOCK_USERS, MOCK_BUSES, MOCK_PARTS } from '../constants';

// Firebase Imports
import { db, auth, isConfigured } from './firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, writeBatch, getDocs
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
  packageLeads: PackageLead[];
  clients: Client[];
  fuelRecords: FuelRecord[];
  fuelSupplies: FuelSupply[];
  fuelStockLevel: number;
  driverLiabilities: DriverLiability[];
  
  // Actions
  login: (email: string, password: string) => Promise<{success: boolean, message?: string}>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{success: boolean, message?: string}>;
  logout: () => void;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>) => Promise<{ success: boolean; message: string }>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<{ success: boolean; message: string }>;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  addPart: (part: Omit<Part, 'id'>) => void;
  updateStock: (id: string, quantityDelta: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTimeOff: (timeOff: Omit<TimeOff, 'id' | 'status'>) => void;
  updateTimeOffStatus: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  deleteTimeOff: (id: string) => Promise<void>;
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
  updatePackagePassenger: (id: string, data: Partial<PackagePassenger>) => Promise<void>;
  deletePackagePassenger: (id: string) => Promise<void>;
  addPackagePayment: (payment: Omit<PackagePayment, 'id'>) => void;
  addPackageLead: (lead: Omit<PackageLead, 'id' | 'status' | 'createdAt'>) => void;
  updatePackageLead: (id: string, data: Partial<PackageLead>) => void;
  deletePackageLead: (id: string) => void;
  addFuelRecord: (record: Omit<FuelRecord, 'id'>) => void;
  addFuelSupply: (supply: Omit<FuelSupply, 'id'>) => void;
  addDriverLiability: (liability: Omit<DriverLiability, 'id' | 'status' | 'paidAmount'>, createExpense?: boolean) => void;
  payDriverLiability: (id: string, amount: number) => Promise<void>;
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
  const [packageLeads, setPackageLeads] = useState<PackageLead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [fuelSupplies, setFuelSupplies] = useState<FuelSupply[]>([]);
  const [driverLiabilities, setDriverLiabilities] = useState<DriverLiability[]>([]);
  
  // Calculated State
  const [fuelStockLevel, setFuelStockLevel] = useState(0);

  // --- FIREBASE LISTENERS (REAL-TIME SYNC) ---
  useEffect(() => {
    if (!isConfigured) return;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
        }
    });

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
        { name: 'packageLeads', setter: setPackageLeads },
        { name: 'clients', setter: setClients },
        { name: 'fuelRecords', setter: setFuelRecords },
        { name: 'fuelSupplies', setter: setFuelSupplies },
        { name: 'driverLiabilities', setter: setDriverLiabilities },
    ];

    const unsubscribes = collectionsToSync.map(c => 
        onSnapshot(collection(db, c.name), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            c.setter(data as any);
        })
    );

    return () => {
        unsubscribeAuth();
        unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Update Fuel Stock Level whenever records change
  useEffect(() => {
    const totalSupplied = fuelSupplies.reduce((acc, curr) => acc + curr.liters, 0);
    // Only subtract if location is GARAGE
    const totalConsumed = fuelRecords
        .filter(r => r.location === 'GARAGE')
        .reduce((acc, curr) => acc + curr.dieselLiters, 0);
    
    setFuelStockLevel(Math.max(0, totalSupplied - totalConsumed));
  }, [fuelSupplies, fuelRecords]);

  // Sync CurrentUser with Users list
  useEffect(() => {
      if (auth.currentUser && users.length > 0) {
          const dbUser = users.find(u => u.email === auth.currentUser?.email);
          if (dbUser) {
              // Ensure legacy users have APPROVED status by default if missing
              const safeUser = {
                  ...dbUser,
                  status: dbUser.status || 'APPROVED'
              };

              if (safeUser.email === 'pixelcriativo2026@gmail.com' && safeUser.role !== UserRole.DEVELOPER) {
                  updateDoc(doc(db, 'users', safeUser.id), { role: UserRole.DEVELOPER, status: 'APPROVED' });
                  setCurrentUser({ ...safeUser, role: UserRole.DEVELOPER, status: 'APPROVED' });
              } else {
                  setCurrentUser(safeUser);
              }
          } else {
              // Fallback for new creation latency
              setCurrentUser({
                  id: auth.currentUser.uid,
                  name: auth.currentUser.displayName || 'Usuário',
                  email: auth.currentUser.email || '',
                  role: UserRole.DRIVER, 
                  avatar: auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.email}&background=random`,
                  status: 'PENDING'
              });
          }
      }
  }, [users, isAuthenticated]);

  // Auth Actions
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
          
          // New users are PENDING by default
          await setDoc(doc(db, 'users', res.user.uid), {
              id: res.user.uid,
              name,
              email,
              role,
              avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
              status: 'PENDING' 
          });
          return { success: true };
      } catch (error: any) {
          return { success: false, message: error.message };
      }
  };

  const logout = async () => { if (isConfigured) await signOut(auth); };
  const switchUser = (userId: string) => { const user = users.find(u => u.id === userId); if (user) setCurrentUser(user); };

  // Data Actions
  const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => { if (!isConfigured) return; await addDoc(collection(db, 'users'), { ...userData, status: 'APPROVED', avatar: `https://ui-avatars.com/api/?name=${userData.name}&background=random` }); };
  const updateUser = async (id: string, data: Partial<User>) => { if (!isConfigured) return; await updateDoc(doc(db, 'users', id), data); };
  const deleteUser = async (id: string) => { if (!isConfigured) return; await deleteDoc(doc(db, 'users', id)); };

  const checkAvailability = (busId: string, start: string, end: string, excludeBookingId?: string): boolean => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    return !bookings.some(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.busId !== busId || b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return (startDate < bEnd && endDate > bStart);
    });
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'status'>) => {
    if (!isConfigured) return { success: false, message: "Banco de dados desconectado." };
    
    if (!checkAvailability(bookingData.busId, bookingData.startTime, bookingData.endTime)) {
      return { success: false, message: 'Conflito: Este ônibus já está alugado neste período!' };
    }

    if (bookingData.driverId) {
        const tripStart = new Date(bookingData.startTime).getTime();
        const tripEnd = new Date(bookingData.endTime).getTime();
        const driverConflict = timeOffs.find(t => {
            if (t.driverId !== bookingData.driverId || t.status !== 'APPROVED') return false;
            // Check ranges for Vacation
            if (t.type === 'FERIAS' && t.endDate) {
                const offStart = new Date(t.date).setHours(0,0,0,0);
                const offEnd = new Date(t.endDate).setHours(23,59,59,999);
                return (tripStart <= offEnd && tripEnd >= offStart);
            }
            // Check single days for Folga/Plantão
            const [y, m, d] = t.date.split('-').map(Number);
            const offStart = new Date(y, m - 1, d, 0, 0, 0).getTime();
            const offEnd = new Date(y, m - 1, d, 23, 59, 59).getTime();
            
            // Allow booking during Plantão? Usually yes, if it matches time, but simplistic check here flags it.
            // Let's flag Plantão as "unavailable" for regular bookings unless specifically assigned (which logic isn't here yet)
            // So essentially, if they are marked as anything, warn.
            return (tripStart <= offEnd && tripEnd >= offStart);
        });
        if (driverConflict) return { success: false, message: `Motorista Indisponível! Ele está de ${driverConflict.type} (${driverConflict.date}).` };
    }

    try {
        const newBooking = { ...bookingData, status: 'CONFIRMED' };
        // Ensure values are clean (no undefined)
        if (newBooking.freelanceDriverName === undefined) delete newBooking.freelanceDriverName;

        const docRef = await addDoc(collection(db, 'bookings'), newBooking);
        
        if (newBooking.value > 0 && newBooking.paymentStatus !== 'PENDING') {
            let transStatus = newBooking.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING';
            let transDesc = `Locação: ${newBooking.clientName} - ${newBooking.destination}`;
            if (newBooking.paymentStatus === 'SCHEDULED') transDesc += " (Agendado)";
            
            await addDoc(collection(db, 'transactions'), {
                type: 'INCOME', status: transStatus, category: 'Locação', amount: newBooking.value,
                date: newBooking.paymentDate || new Date().toISOString(), description: transDesc, relatedBookingId: docRef.id
            });
        }
        return { success: true, message: 'Agendamento salvo com sucesso!' };
    } catch (e: any) {
        console.error("Erro ao salvar locação:", e);
        return { success: false, message: 'Erro ao salvar no banco: ' + (e.message || 'Erro desconhecido') };
    }
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
    if (!isConfigured) return { success: false, message: "Banco de dados desconectado." };
    try {
        const currentBooking = bookings.find(b => b.id === id);
        if (!currentBooking) return { success: false, message: "Viagem não encontrada." };

        const busIdToCheck = data.busId || currentBooking.busId;
        const startToCheck = data.startTime || currentBooking.startTime;
        const endToCheck = data.endTime || currentBooking.endTime;

        if (!checkAvailability(busIdToCheck, startToCheck, endToCheck, id)) {
            return { success: false, message: 'Conflito: Este ônibus já está alugado no novo horário!' };
        }

        await updateDoc(doc(db, 'bookings', id), data);

        if (data.value !== undefined || data.clientName || data.destination || data.paymentStatus || data.paymentDate) {
            const q = query(collection(db, 'transactions'), where('relatedBookingId', '==', id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const transDoc = querySnapshot.docs[0];
                const newValue = data.value !== undefined ? data.value : transDoc.data().amount;
                const newClient = data.clientName || currentBooking.clientName;
                const newDest = data.destination || currentBooking.destination;
                const newStatus = data.paymentStatus || currentBooking.paymentStatus;
                let transStatus = newStatus === 'PAID' ? 'COMPLETED' : 'PENDING';
                let transDesc = `Locação: ${newClient} - ${newDest}`;
                if (newStatus === 'SCHEDULED') transDesc += " (Agendado)";
                await updateDoc(doc(db, 'transactions', transDoc.id), {
                    amount: newValue, description: transDesc, status: transStatus, date: data.paymentDate || transDoc.data().date
                });
            }
        }
        return { success: true, message: 'Viagem atualizada com sucesso!' };
    } catch (e: any) {
         console.error("Erro ao atualizar locação:", e);
         return { success: false, message: 'Erro ao atualizar: ' + (e.message || 'Erro desconhecido') };
    }
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => { if (isConfigured) await updateDoc(doc(db, 'bookings', id), { status }); };
  const addPart = async (part: Omit<Part, 'id'>) => { if (isConfigured) await addDoc(collection(db, 'parts'), part); };
  const updateStock = async (id: string, quantityDelta: number) => { if (isConfigured) { const part = parts.find(p => p.id === id); if (part) await updateDoc(doc(db, 'parts', id), { quantity: Math.max(0, part.quantity + quantityDelta) }); } };
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => { if (isConfigured) await addDoc(collection(db, 'transactions'), transaction); };
  
  const addTimeOff = async (timeOff: Omit<TimeOff, 'id' | 'status'>) => { 
      if (isConfigured) { 
          const isManager = currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.DEVELOPER; 
          // REMOVE UNDEFINED FIELDS
          const cleanPayload = Object.fromEntries(Object.entries(timeOff).filter(([_, v]) => v !== undefined));
          
          await addDoc(collection(db, 'timeOffs'), { 
              ...cleanPayload, 
              status: isManager ? 'APPROVED' : 'PENDING' 
          }); 
      } 
  };
  
  const updateTimeOffStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => { if (isConfigured) await updateDoc(doc(db, 'timeOffs', id), { status }); };
  const deleteTimeOff = async (id: string) => { if (isConfigured) await deleteDoc(doc(db, 'timeOffs', id)); };

  const addDocument = async (docData: Omit<DriverDocument, 'id' | 'uploadDate'>) => { if (isConfigured) await addDoc(collection(db, 'documents'), { ...docData, uploadDate: new Date().toISOString() }); };
  const deleteDocument = async (id: string) => { if (isConfigured) await deleteDoc(doc(db, 'documents', id)); };
  
  const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'maintenanceRecords'), record);
      await updateStock(record.partId, -record.quantityUsed);
      const part = parts.find(p => p.id === record.partId);
      const bus = buses.find(b => b.id === record.busId);
      await addDoc(collection(db, 'transactions'), {
          type: 'EXPENSE', status: 'COMPLETED', category: 'Manutenção', amount: part ? part.price * record.quantityUsed : 0,
          date: record.date, description: `Manutenção ${record.type}: ${bus?.plate} - ${part?.name} (x${record.quantityUsed})`
      });
  };

  const addPurchaseRequest = async (req: Omit<PurchaseRequest, 'id' | 'status' | 'requestDate'>) => { if (isConfigured) await addDoc(collection(db, 'purchaseRequests'), { ...req, status: 'PENDING', requestDate: new Date().toISOString() }); };
  const updatePurchaseRequestStatus = async (id: string, status: PurchaseRequest['status']) => { if (isConfigured) await updateDoc(doc(db, 'purchaseRequests', id), { status }); };
  const addMaintenanceReport = async (report: Omit<MaintenanceReport, 'id' | 'status'>) => { if (isConfigured) await addDoc(collection(db, 'maintenanceReports'), { ...report, status: 'PENDING' }); };
  const updateMaintenanceReportStatus = async (id: string, status: MaintenanceReport['status']) => { if (isConfigured) await updateDoc(doc(db, 'maintenanceReports', id), { status }); };
  const addBus = async (bus: Omit<Bus, 'id' | 'status'>) => { if (isConfigured) await addDoc(collection(db, 'buses'), { ...bus, status: 'AVAILABLE' }); };
  const updateBusStatus = async (id: string, status: Bus['status']) => { if (isConfigured) await updateDoc(doc(db, 'buses', id), { status }); };
  const addCharterContract = async (contract: Omit<CharterContract, 'id' | 'status'>) => { if (!isConfigured) return; await addDoc(collection(db, 'charterContracts'), { ...contract, status: 'ACTIVE' }); }; // Simplified for space
  const addTravelPackage = async (pkg: Omit<TravelPackage, 'id' | 'status'>) => { if (isConfigured) await addDoc(collection(db, 'travelPackages'), { ...pkg, status: 'OPEN' }); };
  
  const registerPackageSale = async (clientData: any, saleData: any) => { 
      if (!isConfigured) return; 
      let clientId = '';
      
      const existingClient = clients.find(c => c.cpf === clientData.cpf);
      if (existingClient) { 
          clientId = existingClient.id; 
          await updateDoc(doc(db, 'clients', clientId), { ...clientData }); 
      } else { 
          const ref = await addDoc(collection(db, 'clients'), clientData); 
          clientId = ref.id; 
      }

      let commissionRate = saleData.saleType === 'AGENCY' ? 0.12 : 0.01;
      let commissionValue = (saleData.agreedPrice || 0) * commissionRate;

      await addDoc(collection(db, 'packagePassengers'), { 
          ...saleData, 
          clientId, 
          titularName: clientData.name, 
          titularCpf: clientData.cpf, 
          paidAmount: 0, 
          status: 'PENDING',
          commissionRate,
          commissionValue,
          sellerId: currentUser.id
      });
  };

  const updatePackagePassenger = async (id: string, data: Partial<PackagePassenger>) => {
      if (!isConfigured) return;
      await updateDoc(doc(db, 'packagePassengers', id), data);
  };

  const deletePackagePassenger = async (id: string) => {
      if (!isConfigured) return;
      await deleteDoc(doc(db, 'packagePassengers', id));
  };

  const addPackagePayment = async (payment: Omit<PackagePayment, 'id'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'packagePayments'), payment);
      const passenger = packagePassengers.find(p => p.id === payment.passengerId);
      if (passenger) {
          const newPaidAmount = passenger.paidAmount + payment.amount;
          await updateDoc(doc(db, 'packagePassengers', passenger.id), { paidAmount: newPaidAmount, status: newPaidAmount >= passenger.agreedPrice ? 'PAID' : 'PARTIAL' });
          const pkg = travelPackages.find(tp => tp.id === passenger.packageId);
          await addDoc(collection(db, 'transactions'), {
            type: 'INCOME', status: 'COMPLETED', category: 'Pacotes de Viagem', amount: payment.amount, date: payment.date,
            description: `Pagamento Pacote: ${pkg?.title} - Passageiro: ${passenger?.titularName}`
        });
      }
  };

  const addPackageLead = async (lead: Omit<PackageLead, 'id' | 'status' | 'createdAt'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'packageLeads'), {
          ...lead,
          status: 'PENDING',
          createdAt: new Date().toISOString()
      });
  };

  const updatePackageLead = async (id: string, data: Partial<PackageLead>) => {
      if (!isConfigured) return;
      await updateDoc(doc(db, 'packageLeads', id), data);
  };

  const deletePackageLead = async (id: string) => {
      if (!isConfigured) return;
      await deleteDoc(doc(db, 'packageLeads', id));
  };
  
  const addFuelRecord = async (record: Omit<FuelRecord, 'id'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'fuelRecords'), record);
      
      // If refueled on STREET, it costs money immediately
      if (record.location === 'STREET' && record.cost && record.cost > 0) {
          const bus = buses.find(b => b.id === record.busId);
          const user = users.find(u => u.id === record.loggedBy);
          await addDoc(collection(db, 'transactions'), {
              type: 'EXPENSE',
              status: 'COMPLETED',
              category: 'Combustível',
              amount: record.cost,
              date: record.date,
              description: `Abastecimento Externo (${user?.name}): ${bus?.plate} - ${record.dieselLiters}L @ ${record.stationName || 'Posto'}`
          });
      }
  };

  const addFuelSupply = async (supply: Omit<FuelSupply, 'id'>) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'fuelSupplies'), supply);

      if (supply.registeredInFinance && supply.cost > 0) {
          await addDoc(collection(db, 'transactions'), {
              type: 'EXPENSE',
              status: 'COMPLETED',
              category: 'Compra Combustível',
              amount: supply.cost,
              date: supply.date,
              description: `Abastecimento Tanque Garagem: ${supply.liters}L (Recebido por: ${supply.receiverName})`
          });
      }
  };

  const addDriverLiability = async (liability: Omit<DriverLiability, 'id' | 'status' | 'paidAmount'>, createExpense = false) => {
      if (!isConfigured) return;
      await addDoc(collection(db, 'driverLiabilities'), { ...liability, paidAmount: 0, status: 'OPEN' });

      // If the company paid for the damage/fine immediately, record it as expense
      if (createExpense) {
          const driver = users.find(u => u.id === liability.driverId);
          await addDoc(collection(db, 'transactions'), {
              type: 'EXPENSE',
              status: 'COMPLETED',
              category: liability.type === 'AVARIA' ? 'Manutenção (Avaria)' : 'Multas',
              amount: liability.totalAmount,
              date: liability.date,
              description: `Pagamento de ${liability.type} - Motorista: ${driver?.name} (${liability.description})`
          });
      }
  };

  const payDriverLiability = async (id: string, amount: number) => {
      if (!isConfigured) return;
      const liability = driverLiabilities.find(l => l.id === id);
      if (!liability) return;

      const newPaid = liability.paidAmount + amount;
      const newStatus = newPaid >= liability.totalAmount ? 'PAID' : 'OPEN';

      await updateDoc(doc(db, 'driverLiabilities', id), {
          paidAmount: newPaid,
          status: newStatus
      });

      // Income record (reimbursement)
      const driver = users.find(u => u.id === liability.driverId);
      await addDoc(collection(db, 'transactions'), {
          type: 'INCOME',
          status: 'COMPLETED',
          category: 'Reembolso Avaria/Multa',
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          description: `Abatimento ${liability.type} - ${driver?.name} (${liability.description})`
      });
  };

  const seedDatabase = async () => { 
      if (!isConfigured) return; 
      const batch = writeBatch(db); 
      
      // Basic Mocks
      MOCK_BUSES.forEach(b => batch.set(doc(collection(db, 'buses')), { ...b, id: doc(collection(db, 'buses')).id })); 
      MOCK_PARTS.forEach(p => batch.set(doc(collection(db, 'parts')), { ...p, id: doc(collection(db, 'parts')).id })); 
      
      // New Travel Packages
      const packages = [
          { title: "Carnaval em Guarapari", date: "2026-02-13", price: 2890 },
          { title: "Encantos de Vassouras", date: "2026-03-01", price: 399 },
          { title: "Hotel Vilarejo Praia All Inclusive", date: "2026-03-13", price: 2990 },
          { title: "Hotel Fazenda Estalagem", date: "2026-04-10", price: 1390 },
          { title: "Hotel Fazenda Raposo", date: "2026-05-01", price: 1590 },
          { title: "Caldas Novas Junho", date: "2026-06-06", price: 2690 },
          { title: "Caldas Novas Férias de Julho", date: "2026-07-18", price: 2990 },
          { title: "Festa Julina em Passa Quatro", date: "2026-07-20", price: 2390 },
          { title: "Caldas Novas Agosto 2026", date: "2026-08-22", price: 2690 },
      ];

      packages.forEach(p => {
          batch.set(doc(collection(db, 'travelPackages')), { 
              title: p.title, 
              date: p.date, 
              adultPrice: p.price,
              childPrice: p.price * 0.7, // Assume 70% for child as example
              seniorPrice: p.price, // Same as adult usually
              status: 'OPEN'
          });
      });

      await batch.commit(); 
  };

  return (
    <StoreContext.Provider value={{
      currentUser: currentUser!, isAuthenticated, users, buses, bookings, parts, transactions, timeOffs, documents, maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts, travelPackages, packagePassengers, packagePayments, clients, packageLeads, fuelRecords, fuelSupplies, fuelStockLevel, driverLiabilities,
      switchUser, addUser, updateUser, deleteUser, addBooking, updateBooking, updateBookingStatus, addPart, updateStock, addTransaction, addTimeOff, updateTimeOffStatus, deleteTimeOff, addDocument, deleteDocument, addMaintenanceRecord, addPurchaseRequest, updatePurchaseRequestStatus, addMaintenanceReport, updateMaintenanceReportStatus, addBus, updateBusStatus, addCharterContract, addTravelPackage, registerPackageSale, updatePackagePassenger, deletePackagePassenger, addPackagePayment, addPackageLead, updatePackageLead, deletePackageLead, addFuelRecord, addFuelSupply, addDriverLiability, payDriverLiability,
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
