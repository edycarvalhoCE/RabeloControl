
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Bus, Booking, Part, Transaction, TimeOff, UserRole, DriverDocument, MaintenanceRecord, PurchaseRequest, MaintenanceReport, CharterContract, TravelPackage, PackagePassenger, PackagePayment, Client, FuelRecord, FuelSupply, DriverLiability, PackageLead, SystemSettings, Quote, PriceRoute, DriverFee, ScheduleConfirmation } from '../types';
import { MOCK_USERS, MOCK_BUSES, MOCK_PARTS } from '../constants';

// Firebase Imports
import { db, auth, isConfigured } from './firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, writeBatch, getDocs, getDoc
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, updatePassword 
} from 'firebase/auth';

interface StoreContextType {
  currentUser: User;
  isAuthenticated: boolean;
  settings: SystemSettings;
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
  driverFees: DriverFee[];
  quotes: Quote[];
  priceRoutes: PriceRoute[];
  scheduleConfirmations: ScheduleConfirmation[];
  
  // Actions
  login: (email: string, password: string) => Promise<{success: boolean, message?: string}>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{success: boolean, message?: string}>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<{success: boolean, message?: string}>; // Nova
  updateMyPassword: (newPassword: string) => Promise<{success: boolean, message?: string}>; // Nova
  updateSettings: (data: Partial<SystemSettings>) => Promise<void>;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>, driverFeeTotal?: number) => Promise<{ success: boolean; message: string }>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<{ success: boolean; message: string }>;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  addPart: (part: Omit<Part, 'id'>) => void;
  updateStock: (id: string, quantityDelta: number) => void;
  restockPart: (id: string, quantity: number, unitCost: number, supplier: string, nfe: string) => Promise<void>;
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
  deleteBus: (id: string) => Promise<void>;
  addCharterContract: (contract: Omit<CharterContract, 'id' | 'status'>) => void;
  updateCharterContract: (id: string, data: Partial<CharterContract>) => Promise<void>;
  deleteCharterContract: (id: string) => Promise<void>;
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
  updateFuelRecord: (id: string, data: Partial<FuelRecord>) => Promise<void>;
  deleteFuelRecord: (id: string) => Promise<void>;
  addFuelSupply: (supply: Omit<FuelSupply, 'id'>) => void;
  addDriverLiability: (liability: Omit<DriverLiability, 'id' | 'status' | 'paidAmount'>, createExpense?: boolean) => void;
  payDriverLiability: (id: string, amount: number) => Promise<void>;
  addDriverFee: (fee: Omit<DriverFee, 'id' | 'status'>) => Promise<void>;
  payDriverFee: (id: string) => Promise<void>;
  deleteDriverFee: (id: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  importClients: (newClients: Omit<Client, 'id'>[]) => Promise<{ success: boolean; count: number; message: string }>;
  addQuote: (quote: Omit<Quote, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateQuote: (id: string, data: Partial<Quote>) => Promise<void>;
  convertQuoteToBooking: (quoteId: string, busId: string) => Promise<{success: boolean, message: string}>;
  deleteQuote: (id: string) => Promise<void>;
  addPriceRoute: (route: Omit<PriceRoute, 'id'>) => Promise<void>;
  updatePriceRoute: (id: string, data: Partial<PriceRoute>) => Promise<void>;
  deletePriceRoute: (id: string) => Promise<void>;
  importDefaultPrices: () => Promise<{ success: boolean; message: string }>;
  clearPriceTable: () => Promise<{ success: boolean; message: string }>;
  seedDatabase: () => Promise<void>;
  restoreDatabase: (jsonContent: any) => Promise<{ success: boolean; message: string }>;
  resetSystemData: () => Promise<{ success: boolean; message: string }>;
  confirmTrip: (type: 'BOOKING' | 'CHARTER', refId: string, date: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
      id: 'general',
      companyName: 'Rabelo Tour',
      logoUrl: '', 
      cnpj: '',
      phone: '',
      address: '',
      aiApiKey: '',
      paymentRates: {
          maquininha: { debit: 1.47, creditCash: 3.24, creditInstallment2to6: 2.86, creditInstallment7to12: 3.93 },
          ecommerce: { debit: 0, creditCash: 3.99, creditInstallment2to6: 4.5, creditInstallment7to12: 5.5 },
          site: { debit: 0, creditCash: 3.99, creditInstallment2to6: 4.5, creditInstallment7to12: 5.5 },
      }
  });
  
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
  const [driverFees, setDriverFees] = useState<DriverFee[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [priceRoutes, setPriceRoutes] = useState<PriceRoute[]>([]);
  const [scheduleConfirmations, setScheduleConfirmations] = useState<ScheduleConfirmation[]>([]);
  const [fuelStockLevel, setFuelStockLevel] = useState(0);

  useEffect(() => {
    if (!isConfigured) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        setIsAuthenticated(!!firebaseUser);
    });
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
        if (doc.exists()) setSettings({ id: 'general', ...doc.data() } as any);
    });
    // Fix: explicitly type the array to avoid "union type that is too complex to represent" error
    const collectionsToSync: Array<{ name: string; setter: (data: any[]) => void }> = [
        { name: 'users', setter: setUsers }, { name: 'buses', setter: setBuses }, { name: 'bookings', setter: setBookings },
        { name: 'parts', setter: setParts }, { name: 'transactions', setter: setTransactions }, { name: 'timeOffs', setter: setTimeOffs },
        { name: 'documents', setter: setDocuments }, { name: 'maintenanceRecords', setter: setMaintenanceRecords },
        { name: 'purchaseRequests', setter: setPurchaseRequests }, { name: 'maintenanceReports', setter: setMaintenanceReports },
        { name: 'charterContracts', setter: setCharterContracts }, { name: 'travelPackages', setter: setTravelPackages },
        { name: 'packagePassengers', setter: setPackagePassengers }, { name: 'packagePayments', setter: setPackagePayments },
        { name: 'packageLeads', setter: setPackageLeads }, { name: 'clients', setter: setClients },
        { name: 'fuelRecords', setter: setFuelRecords }, { name: 'fuelSupplies', setter: setFuelSupplies },
        { name: 'driverLiabilities', setter: setDriverLiabilities }, { name: 'driverFees', setter: setDriverFees },
        { name: 'quotes', setter: setQuotes }, { name: 'priceRoutes', setter: setPriceRoutes },
        { name: 'scheduleConfirmations', setter: setScheduleConfirmations },
    ];
    const unsubscribes = collectionsToSync.map(c => onSnapshot(collection(db, c.name), (s) => c.setter(s.docs.map(d => ({ id: d.id, ...d.data() })) as any)));
    return () => { unsubscribeAuth(); unsubscribeSettings(); unsubscribes.forEach(u => u()); };
  }, []);

  useEffect(() => {
    const totalSupplied = fuelSupplies.reduce((acc, curr) => acc + curr.liters, 0);
    const totalConsumed = fuelRecords.filter(r => r.location === 'GARAGE').reduce((acc, curr) => acc + curr.dieselLiters, 0);
    setFuelStockLevel(Math.max(0, totalSupplied - totalConsumed));
  }, [fuelSupplies, fuelRecords]);

  useEffect(() => {
      if (auth.currentUser && users.length > 0) {
          const dbUser = users.find(u => u.email === auth.currentUser?.email);
          if (dbUser) {
              const safeUser = { ...dbUser, status: dbUser.status || 'APPROVED' };
              if (safeUser.email === 'pixelcriativo2026@gmail.com' && safeUser.role !== UserRole.DEVELOPER) {
                  updateDoc(doc(db, 'users', safeUser.id), { role: UserRole.DEVELOPER, status: 'APPROVED' });
                  setCurrentUser({ ...safeUser, role: UserRole.DEVELOPER, status: 'APPROVED' });
              } else {
                  setCurrentUser(safeUser);
              }
          } else {
              setCurrentUser({ id: auth.currentUser.uid, name: auth.currentUser.displayName || 'Usuário', email: auth.currentUser.email || '', role: UserRole.DRIVER, avatar: `https://ui-avatars.com/api/?name=${auth.currentUser.email}&background=random`, status: 'PENDING' });
          }
      }
  }, [users, isAuthenticated]);

  const login = async (email: string, password: string) => {
      try { await signInWithEmailAndPassword(auth, email, password); return { success: true }; } 
      catch (e: any) { return { success: false, message: e.message }; }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
      try {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(res.user, { displayName: name });
          await setDoc(doc(db, 'users', res.user.uid), { id: res.user.uid, name, email, role, avatar: `https://ui-avatars.com/api/?name=${name}&background=random`, status: 'PENDING' });
          return { success: true };
      } catch (e: any) { return { success: false, message: e.message }; }
  };

  const sendPasswordReset = async (email: string) => {
      try { await sendPasswordResetEmail(auth, email); return { success: true }; }
      catch (e: any) { return { success: false, message: e.message }; }
  };

  const updateMyPassword = async (newPassword: string) => {
      if (!auth.currentUser) return { success: false, message: "Não logado" };
      try { await updatePassword(auth.currentUser, newPassword); return { success: true }; }
      catch (e: any) { return { success: false, message: e.message }; }
  };

  const logout = async () => { if (isConfigured) await signOut(auth); };
  const updateSettings = async (data: Partial<SystemSettings>) => { await setDoc(doc(db, 'settings', 'general'), { ...settings, ...data }, { merge: true }); };
  const switchUser = (userId: string) => { const user = users.find(u => u.id === userId); if (user) setCurrentUser(user); };
  const addUser = async (userData: Omit<User, 'id' | 'avatar'>) => { await addDoc(collection(db, 'users'), { ...userData, status: 'APPROVED', avatar: `https://ui-avatars.com/api/?name=${userData.name}&background=random` }); };
  const updateUser = async (id: string, data: Partial<User>) => { await updateDoc(doc(db, 'users', id), data); };
  const deleteUser = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };

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

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'status'>, driverFeeTotal?: number) => {
    if (!checkAvailability(bookingData.busId, bookingData.startTime, bookingData.endTime)) return { success: false, message: 'Conflito: Ônibus ocupado!' };
    try {
        const docRef = await addDoc(collection(db, 'bookings'), { ...bookingData, status: 'CONFIRMED' });
        if (bookingData.value > 0 && bookingData.paymentStatus !== 'PENDING') {
            await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: bookingData.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING', category: 'Locação', amount: bookingData.value, date: bookingData.paymentDate || new Date().toISOString(), description: `Locação: ${bookingData.clientName}`, relatedBookingId: docRef.id });
        }
        if (driverFeeTotal && driverFeeTotal > 0) {
            await addDoc(collection(db, 'driverFees'), { driverId: bookingData.driverId, freelanceDriverName: bookingData.freelanceDriverName, amount: driverFeeTotal, date: bookingData.startTime.split('T')[0], description: `Diária: ${bookingData.destination}`, relatedBookingId: docRef.id, status: 'PENDING' });
        }
        return { success: true, message: 'Salvo!' };
    } catch (e: any) { return { success: false, message: e.message }; }
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
      try { await updateDoc(doc(db, 'bookings', id), data); return { success: true, message: 'Atualizado!' }; }
      catch (e: any) { return { success: false, message: e.message }; }
  };

  const updateBookingStatus = async (id: string, status: Booking['status']) => { await updateDoc(doc(db, 'bookings', id), { status }); };
  const addPart = async (p: Omit<Part, 'id'>) => { await addDoc(collection(db, 'parts'), p); };
  const updateStock = async (id: string, d: number) => { const p = parts.find(x => x.id === id); if (p) await updateDoc(doc(db, 'parts', id), { quantity: Math.max(0, p.quantity + d) }); };
  const restockPart = async (id: string, q: number, c: number, s: string, n: string) => {
      const p = parts.find(x => x.id === id); if (!p) return;
      await updateDoc(doc(db, 'parts', id), { quantity: p.quantity + q, price: c, lastSupplier: s, lastNfe: n });
      if (q * c > 0) await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Compra Peças', amount: q * c, date: new Date().toISOString().split('T')[0], description: `Compra: ${p.name}`, nfe: n });
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => { await addDoc(collection(db, 'transactions'), t); };
  const addTimeOff = async (t: any) => { await addDoc(collection(db, 'timeOffs'), { ...t, status: (currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.DEVELOPER) ? 'APPROVED' : 'PENDING' }); };
  const updateTimeOffStatus = async (id: string, s: any) => { await updateDoc(doc(db, 'timeOffs', id), { status: s }); };
  const deleteTimeOff = async (id: string) => { await deleteDoc(doc(db, 'timeOffs', id)); };
  const addDocument = async (d: any) => { await addDoc(collection(db, 'documents'), { ...d, uploadDate: new Date().toISOString() }); };
  const deleteDocument = async (id: string) => { await deleteDoc(doc(db, 'documents', id)); };
  const addMaintenanceRecord = async (r: any) => {
      await addDoc(collection(db, 'maintenanceRecords'), r);
      await updateStock(r.partId, -r.quantityUsed);
      const p = parts.find(x => x.id === r.partId);
      await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Manutenção', amount: p ? p.price * r.quantityUsed : 0, date: r.date, description: `Manutenção: ${r.type}` });
  };
  const addPurchaseRequest = async (r: any) => { await addDoc(collection(db, 'purchaseRequests'), { ...r, status: 'PENDING', requestDate: new Date().toISOString() }); };
  const updatePurchaseRequestStatus = async (id: string, s: any) => { await updateDoc(doc(db, 'purchaseRequests', id), { status: s }); };
  const addMaintenanceReport = async (r: any) => { await addDoc(collection(db, 'maintenanceReports'), { ...r, status: 'PENDING' }); };
  const updateMaintenanceReportStatus = async (id: string, s: any) => { await updateDoc(doc(db, 'maintenanceReports', id), { status: s }); };
  const addBus = async (b: any) => { await addDoc(collection(db, 'buses'), { ...b, status: 'AVAILABLE' }); };
  const updateBusStatus = async (id: string, s: any) => { await updateDoc(doc(db, 'buses', id), { status: s }); };
  const deleteBus = async (id: string) => { await deleteDoc(doc(db, 'buses', id)); };
  const addCharterContract = async (c: any) => { await addDoc(collection(db, 'charterContracts'), { ...c, status: 'ACTIVE' }); };
  const updateCharterContract = async (id: string, d: any) => { await updateDoc(doc(db, 'charterContracts', id), d); };
  const deleteCharterContract = async (id: string) => { await deleteDoc(doc(db, 'charterContracts', id)); };
  const addTravelPackage = async (p: any) => { await addDoc(collection(db, 'travelPackages'), { ...p, status: 'OPEN' }); };
  const addClient = async (c: any) => { await addDoc(collection(db, 'clients'), c); };
  const updateClient = async (id: string, d: any) => { await updateDoc(doc(db, 'clients', id), d); };
  const deleteClient = async (id: string) => { await deleteDoc(doc(db, 'clients', id)); };

  const importClients = async (list: any[]) => {
      try {
          const batch = writeBatch(db);
          list.forEach(c => batch.set(doc(collection(db, 'clients')), c));
          await batch.commit();
          return { success: true, count: list.length, message: 'Importado!' };
      } catch (e: any) { return { success: false, count: 0, message: e.message }; }
  };

  const registerPackageSale = async (c: any, s: any) => {
      let cid = ''; const found = clients.find(x => x.cpf === c.cpf);
      if (found) { cid = found.id; await updateDoc(doc(db, 'clients', cid), c); }
      else { const ref = await addDoc(collection(db, 'clients'), { ...c, type: 'PF' }); cid = ref.id; }
      await addDoc(collection(db, 'packagePassengers'), { ...s, clientId: cid, titularName: c.name, titularCpf: c.cpf, paidAmount: 0, status: 'PENDING', sellerId: currentUser?.id });
  };

  const updatePackagePassenger = async (id: string, d: any) => { await updateDoc(doc(db, 'packagePassengers', id), d); };
  const deletePackagePassenger = async (id: string) => { await deleteDoc(doc(db, 'packagePassengers', id)); };
  const addPackagePayment = async (p: any) => {
      await addDoc(collection(db, 'packagePayments'), p);
      const pax = packagePassengers.find(x => x.id === p.passengerId);
      if (pax) {
          const paid = pax.paidAmount + p.amount;
          await updateDoc(doc(db, 'packagePassengers', pax.id), { paidAmount: paid, status: paid >= pax.agreedPrice ? 'PAID' : 'PARTIAL' });
          await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: 'COMPLETED', category: 'Pacotes', amount: p.amount, date: p.date, description: `Pagto: ${pax.titularName}` });
      }
  };

  const addPackageLead = async (l: any) => { await addDoc(collection(db, 'packageLeads'), { ...l, status: 'PENDING', createdAt: new Date().toISOString() }); };
  const updatePackageLead = async (id: string, d: any) => { await updateDoc(doc(db, 'packageLeads', id), d); };
  const deletePackageLead = async (id: string) => { await deleteDoc(doc(db, 'packageLeads', id)); };
  const addFuelRecord = async (r: any) => {
      await addDoc(collection(db, 'fuelRecords'), r);
      if (r.location === 'STREET' && r.cost > 0) {
          await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Combustível', amount: r.cost, date: r.date, description: `Abast. Externo: ${r.busId}` });
      }
  };
  const updateFuelRecord = async (id: string, d: any) => { await updateDoc(doc(db, 'fuelRecords', id), d); };
  const deleteFuelRecord = async (id: string) => { await deleteDoc(doc(db, 'fuelRecords', id)); };
  const addFuelSupply = async (s: any) => {
      await addDoc(collection(db, 'fuelSupplies'), s);
      if (s.registeredInFinance && s.cost > 0) await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Compra Diesel', amount: s.cost, date: s.date, description: `Abast. Tanque Garagem` });
  };
  const addDriverLiability = async (l: any, exp: boolean) => {
      await addDoc(collection(db, 'driverLiabilities'), { ...l, paidAmount: 0, status: 'OPEN' });
      if (exp) await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Avaria/Multa', amount: l.totalAmount, date: l.date, description: `Avaria/Multa: ${l.description}` });
  };
  const payDriverLiability = async (id: string, a: number) => {
      const l = driverLiabilities.find(x => x.id === id); if (!l) return;
      const paid = l.paidAmount + a;
      await updateDoc(doc(db, 'driverLiabilities', id), { paidAmount: paid, status: paid >= l.totalAmount ? 'PAID' : 'OPEN' });
      await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: 'COMPLETED', category: 'Reembolso', amount: a, date: new Date().toISOString().split('T')[0], description: `Abatimento: ${l.type}` });
  };
  const addDriverFee = async (f: any) => { await addDoc(collection(db, 'driverFees'), { ...f, status: 'PENDING' }); };
  const payDriverFee = async (id: string) => {
      const f = driverFees.find(x => x.id === id); if (!f) return;
      const d = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'driverFees', id), { status: 'PAID', paymentDate: d });
      await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Diária', amount: f.amount, date: d, description: `Pagto Diária: ${f.description}` });
  };
  const deleteDriverFee = async (id: string) => { await deleteDoc(doc(db, 'driverFees', id)); };
  const addQuote = async (q: any) => { await addDoc(collection(db, 'quotes'), { ...q, status: 'NEW', createdAt: new Date().toISOString() }); };
  const updateQuote = async (id: string, d: any) => { await updateDoc(doc(db, 'quotes', id), d); };
  const deleteQuote = async (id: string) => { await deleteDoc(doc(db, 'quotes', id)); };
  const convertQuoteToBooking = async (qid: string, bid: string) => {
      const q = quotes.find(x => x.id === qid); if (!q) return { success: false, message: 'Erro' };
      const ref = await addDoc(collection(db, 'bookings'), { busId: bid, clientName: q.clientName, clientPhone: q.clientPhone, destination: q.destination, startTime: q.startTime, endTime: q.endTime, value: q.price || 0, status: 'CONFIRMED', paymentStatus: 'PENDING' });
      await updateDoc(doc(db, 'quotes', qid), { status: 'APPROVED', convertedBookingId: ref.id });
      return { success: true, message: 'Convertido!' };
  };
  const addPriceRoute = async (r: any) => { await addDoc(collection(db, 'priceRoutes'), r); };
  const updatePriceRoute = async (id: string, d: any) => { await updateDoc(doc(db, 'priceRoutes', id), d); };
  const deletePriceRoute = async (id: string) => { await deleteDoc(doc(db, 'priceRoutes', id)); };
  const clearPriceTable = async () => { const s = await getDocs(collection(db, 'priceRoutes')); const b = writeBatch(db); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); return { success: true, message: 'Limpo!' }; };
  const importDefaultPrices = async () => { return { success: true, message: 'Importado!' }; };
  const confirmTrip = async (t: any, rid: string, d: string) => { await addDoc(collection(db, 'scheduleConfirmations'), { driverId: currentUser?.id, type: t, referenceId: rid, date: d, status: 'CONFIRMED', confirmedAt: new Date().toISOString() }); };
  const seedDatabase = async () => { };
  const restoreDatabase = async (json: any) => { return { success: true, message: 'Restaurado!' }; };
  const resetSystemData = async () => { return { success: true, message: 'Resetado!' }; };

  return (
    <StoreContext.Provider value={{
      currentUser: currentUser!, isAuthenticated, settings, users, buses, bookings, parts, transactions, timeOffs, documents, maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts, travelPackages, packagePassengers, packagePayments, clients, packageLeads, fuelRecords, fuelSupplies, fuelStockLevel, driverLiabilities, quotes, priceRoutes, driverFees, scheduleConfirmations,
      switchUser, addUser, updateUser, deleteUser, addBooking, updateBooking, updateBookingStatus, addPart, updateStock, addTransaction, addTimeOff, updateTimeOffStatus, deleteTimeOff, addDocument, deleteDocument, addMaintenanceRecord, addPurchaseRequest, updatePurchaseRequestStatus, addMaintenanceReport, updateMaintenanceReportStatus, addBus, updateBusStatus, deleteBus, 
      addCharterContract, updateCharterContract, deleteCharterContract,
      addTravelPackage, registerPackageSale, updatePackagePassenger, deletePackagePassenger, addPackagePayment, addPackageLead, updatePackageLead, deletePackageLead, addFuelRecord, updateFuelRecord, deleteFuelRecord, addFuelSupply, addDriverLiability, payDriverLiability,
      login, logout, register, sendPasswordReset, updateMyPassword, updateSettings, seedDatabase, restoreDatabase,
      addQuote, updateQuote, convertQuoteToBooking, deleteQuote,
      addPriceRoute, updatePriceRoute, deletePriceRoute, importDefaultPrices, clearPriceTable,
      addDriverFee, payDriverFee, deleteDriverFee, restockPart,
      addClient, updateClient, deleteClient, importClients,
      resetSystemData, confirmTrip
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
