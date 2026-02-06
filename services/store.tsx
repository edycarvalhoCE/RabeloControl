import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Bus, Booking, Part, Transaction, TimeOff, UserRole, DriverDocument, MaintenanceRecord, PurchaseRequest, MaintenanceReport, CharterContract, TravelPackage, PackagePassenger, PackagePayment, Client, FuelRecord, FuelSupply, DriverLiability, PackageLead, SystemSettings, Quote, PriceRoute, DriverFee, ScheduleConfirmation } from '../types';
import { db, auth, isConfigured } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  query, 
  where, 
  writeBatch, 
  getDocs, 
  getDoc 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail, 
  updatePassword 
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
  dieselStockLevel: number;
  arlaStockLevel: number;
  driverLiabilities: DriverLiability[];
  driverFees: DriverFee[];
  quotes: Quote[];
  priceRoutes: PriceRoute[];
  scheduleConfirmations: ScheduleConfirmation[];
  
  login: (email: string, password: string) => Promise<{success: boolean, message?: string}>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{success: boolean, message?: string}>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<{success: boolean, message?: string}>;
  updateMyPassword: (newPassword: string) => Promise<{success: boolean, message?: string}>;
  updateSettings: (data: Partial<SystemSettings>) => Promise<void>;
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'status'>, driverFeeTotal?: number, driver2FeeTotal?: number) => Promise<{ success: boolean; message: string }>;
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
  registerPackageSale: (clientData: Omit<Client, 'id'>, saleData: any) => Promise<void>;
  updatePackagePassenger: (id: string, data: Partial<PackagePassenger>) => Promise<void>;
  deletePackagePassenger: (id: string) => Promise<void>;
  addPackagePayment: (payment: Omit<PackagePayment, 'id'>) => void;
  addPackagePayment_only: (payment: Omit<PackagePayment, 'id'>) => Promise<void>;
  addPackagePayment_only: (payment: Omit<PackagePayment, 'id'>) => Promise<void>;
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
  const [settings, setSettings] = useState<SystemSettings>({ id: 'general', companyName: 'Rabelo Tour', logoUrl: '', paymentRates: { maquininha: { debit: 1.47, creditCash: 3.24, creditInstallment2to6: 2.86, creditInstallment7to12: 3.93 }, ecommerce: { debit: 0, creditCash: 3.99, creditInstallment2to6: 4.5, creditInstallment7to12: 5.5 }, site: { debit: 0, creditCash: 3.99, creditInstallment2to6: 4.5, creditInstallment7to12: 5.5 } } });
  
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
  
  const [dieselStockLevel, setDieselStockLevel] = useState(0);
  const [arlaStockLevel, setArlaStockLevel] = useState(0);

  useEffect(() => {
    if (!isConfigured) return;
    
    const unsubAuth = onAuthStateChanged(auth, u => setIsAuthenticated(!!u));
    
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), d => {
        if (d.exists()) setSettings({ id: 'general', ...d.data() } as any);
    });
    
    const collectionsToSync: { n: string; s: (data: any[]) => void }[] = [
        { n: 'users', s: setUsers }, { n: 'buses', s: setBuses }, { n: 'bookings', s: setBookings }, { n: 'parts', s: setParts },
        { n: 'transactions', s: setTransactions }, { n: 'timeOffs', s: setTimeOffs }, { n: 'documents', s: setDocuments },
        { n: 'maintenanceRecords', s: setMaintenanceRecords }, { n: 'purchaseRequests', s: setPurchaseRequests },
        { n: 'maintenanceReports', s: setMaintenanceReports }, { n: 'charterContracts', s: setCharterContracts },
        { n: 'travelPackages', s: setTravelPackages }, { n: 'packagePassengers', s: setPackagePassengers },
        { n: 'packagePayments', s: setPackagePayments }, { n: 'packageLeads', s: setPackageLeads }, { n: 'clients', s: setClients },
        { n: 'fuelRecords', s: setFuelRecords }, { n: 'fuelSupplies', s: setFuelSupplies }, { n: 'driverLiabilities', s: setDriverLiabilities },
        { n: 'driverFees', s: setDriverFees }, { n: 'quotes', s: setQuotes }, { n: 'priceRoutes', s: setPriceRoutes }, { n: 'scheduleConfirmations', s: setScheduleConfirmations }
    ];
    
    const unsubs = collectionsToSync.map(c => onSnapshot(collection(db, c.n), s => c.s(s.docs.map(d => ({ id: d.id, ...d.data() } as any)))));
    
    return () => { 
        unsubAuth(); 
        unsubSettings(); 
        unsubs.forEach(u => u()); 
    };
  }, []);

  useEffect(() => {
    const dieselIn = fuelSupplies.filter(s => s.type === 'DIESEL').reduce((acc, curr) => acc + curr.liters, 0);
    const arlaIn = fuelSupplies.filter(s => s.type === 'ARLA').reduce((acc, curr) => acc + curr.liters, 0);
    
    const dieselOut = fuelRecords.filter(r => r.location === 'GARAGE').reduce((acc, curr) => acc + curr.dieselLiters, 0);
    const arlaOut = fuelRecords.filter(r => r.location === 'GARAGE').reduce((acc, curr) => acc + (curr.arlaLiters || 0), 0);
    
    setDieselStockLevel(Math.max(0, dieselIn - dieselOut));
    setArlaStockLevel(Math.max(0, arlaIn - arlaOut));
  }, [fuelSupplies, fuelRecords]);

  useEffect(() => {
      if (auth.currentUser && users.length > 0) {
          const dbUser = users.find(u => u.email === auth.currentUser?.email);
          if (dbUser) setCurrentUser({ ...dbUser, status: dbUser.status || 'APPROVED' });
      }
  }, [users, isAuthenticated]);

  const login = async (e: string, p: string) => { try { await signInWithEmailAndPassword(auth, e, p); return { success: true }; } catch (err: any) { return { success: false, message: err.message }; } };
  
  const register = async (e: string, p: string, n: string, r: UserRole) => { 
      try { 
          const res = await createUserWithEmailAndPassword(auth, e, p); 
          if(res.user) { 
              await updateProfile(res.user, { displayName: n }); 
              await setDoc(doc(db, 'users', res.user.uid), { id: res.user.uid, name: n, email: e, role: r, avatar: `https://ui-avatars.com/api/?name=${n}&background=random`, status: 'PENDING' }); 
          } 
          return { success: true }; 
      } catch (err: any) { return { success: false, message: err.message }; } 
  };
  
  const logout = async () => await signOut(auth);
  
  const sendPasswordReset = async (e: string) => { try { await sendPasswordResetEmail(auth, e); return { success: true }; } catch (err: any) { return { success: false, message: err.message }; } };
  
  const updateMyPassword = async (p: string) => { try { if(auth.currentUser) { await updatePassword(auth.currentUser, p); return { success: true }; } return { success: false }; } catch (err: any) { return { success: false, message: err.message }; } };
  
  const updateSettings = async (d: any) => await setDoc(doc(db, 'settings', 'general'), { ...settings, ...d }, { merge: true });
  
  const switchUser = (id: string) => { const u = users.find(x => x.id === id); if(u) setCurrentUser(u); };
  
  const addUser = async (d: any) => await addDoc(collection(db, 'users'), { ...d, status: 'APPROVED', avatar: `https://ui-avatars.com/api/?name=${d.name}&background=random` });
  
  const updateUser = async (id: string, d: any) => await updateDoc(doc(db, 'users', id), d);
  
  const deleteUser = async (id: string) => await deleteDoc(doc(db, 'users', id));
  
  const addBooking = async (d: any, f1: number, f2: number) => {
      try {
          const res = await addDoc(collection(db, 'bookings'), { ...d, status: 'CONFIRMED' });
          if (d.value > 0 && d.paymentStatus !== 'PENDING') {
              await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: d.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING', category: 'Locação', amount: d.value, date: d.paymentDate || new Date().toISOString(), description: `Locação: ${d.clientName}`, relatedBookingId: res.id });
          }
          if (f1 > 0) await addDoc(collection(db, 'driverFees'), { driverId: d.driverId, freelanceDriverName: d.freelanceDriverName, amount: f1, date: d.startTime.split('T')[0], description: `Diária: ${d.destination}`, relatedBookingId: res.id, status: 'PENDING' });
          if (f2 > 0) await addDoc(collection(db, 'driverFees'), { driverId: d.driver2Id, freelanceDriverName: d.freelanceDriver2Name, amount: f2, date: d.startTime.split('T')[0], description: `Diária 2: ${d.destination}`, relatedBookingId: res.id, status: 'PENDING' });
          return { success: true, message: 'Sucesso!' };
      } catch (err: any) { return { success: false, message: err.message }; }
  };
  
  const updateBooking = async (id: string, d: any) => { try { await updateDoc(doc(db, 'bookings', id), d); return { success: true, message: 'Atualizado!' }; } catch (err: any) { return { success: false, message: err.message }; } };
  
  const updateBookingStatus = async (id: string, s: any) => await updateDoc(doc(db, 'bookings', id), { status: s });
  
  const addPart = async (d: any) => await addDoc(collection(db, 'parts'), d);
  
  const updateStock = async (id: string, delta: number) => { 
      const p = parts.find(x => x.id === id); 
      if(p) await updateDoc(doc(db, 'parts', id), { quantity: Math.max(0, p.quantity + delta) }); 
  };
  
  const restockPart = async (id: string, q: number, c: number, s: string, n: string) => { 
      const p = parts.find(x => x.id === id); 
      if(p) { 
          await updateDoc(doc(db, 'parts', id), { quantity: p.quantity + q, price: c, lastSupplier: s, lastNfe: n }); 
          await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Compra Peças', amount: q * c, date: new Date().toISOString().split('T')[0], description: `Compra: ${p.name}`, nfe: n }); 
      } 
  };
  
  const addTransaction = async (d: any) => await addDoc(collection(db, 'transactions'), d);
  
  const addTimeOff = async (d: any) => await addDoc(collection(db, 'timeOffs'), { ...d, status: (currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.DEVELOPER) ? 'APPROVED' : 'PENDING' });
  
  const updateTimeOffStatus = async (id: string, s: any) => await updateDoc(doc(db, 'timeOffs', id), { status: s });
  
  const deleteTimeOff = async (id: string) => await deleteDoc(doc(db, 'timeOffs', id));
  
  const addDocument = async (d: any) => await addDoc(collection(db, 'documents'), { ...d, uploadDate: new Date().toISOString() });
  
  const deleteDocument = async (id: string) => await deleteDoc(doc(db, 'documents', id));
  
  const addMaintenanceRecord = async (d: any) => { 
      await addDoc(collection(db, 'maintenanceRecords'), d); 
      await updateStock(d.partId, -d.quantityUsed); 
  };
  
  const addPurchaseRequest = async (d: any) => await addDoc(collection(db, 'purchaseRequests'), { ...d, status: 'PENDING', requestDate: new Date().toISOString() });
  
  const updatePurchaseRequestStatus = async (id: string, s: any) => await updateDoc(doc(db, 'purchaseRequests', id), { status: s });
  
  const addMaintenanceReport = async (d: any) => await addDoc(collection(db, 'maintenanceReports'), { ...d, status: 'PENDING' });
  
  const updateMaintenanceReportStatus = async (id: string, s: any) => await updateDoc(doc(db, 'maintenanceReports', id), { status: s });
  
  const addBus = async (d: any) => await addDoc(collection(db, 'buses'), { ...d, status: 'AVAILABLE' });
  
  const updateBusStatus = async (id: string, s: any) => await updateDoc(doc(db, 'buses', id), { status: s });
  
  const deleteBus = async (id: string) => await deleteDoc(doc(db, 'buses', id));
  
  const addCharterContract = async (d: any) => await addDoc(collection(db, 'charterContracts'), { ...d, status: 'ACTIVE' });
  
  const updateCharterContract = async (id: string, d: any) => await updateDoc(doc(db, 'charterContracts', id), d);
  
  const deleteCharterContract = async (id: string) => await deleteDoc(doc(db, 'charterContracts', id));
  
  const addTravelPackage = async (d: any) => await addDoc(collection(db, 'travelPackages'), { ...d, status: 'OPEN' });
  
  const registerPackageSale = async (c: any, s: any) => {
      let cid = ''; 
      const found = clients.find(x => x.cpf === c.cpf);
      if (found) { cid = found.id; await updateDoc(doc(db, 'clients', cid), c); }
      else { const ref = await addDoc(collection(db, 'clients'), { ...c, type: 'PF' }); cid = ref.id; }
      await addDoc(collection(db, 'packagePassengers'), { ...s, clientId: cid, titularName: c.name, titularCpf: c.cpf, paidAmount: 0, status: 'PENDING', sellerId: auth.currentUser?.uid || currentUser?.id || null });
  };
  
  const updatePackagePassenger = async (id: string, d: any) => await updateDoc(doc(db, 'packagePassengers', id), d);
  
  const deletePackagePassenger = async (id: string) => await deleteDoc(doc(db, 'packagePassengers', id));
  
  const addPackagePayment = async (d: any) => {
      await addDoc(collection(db, 'packagePayments'), d);
      const pax = packagePassengers.find(x => x.id === d.passengerId);
      if(pax) { 
          const total = pax.paidAmount + d.amount; 
          await updateDoc(doc(db, 'packagePassengers', pax.id), { paidAmount: total, status: total >= pax.agreedPrice ? 'PAID' : 'PARTIAL' }); 
          await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: 'COMPLETED', category: 'Pacotes', amount: d.amount, date: d.date, description: `Pagto: ${pax.titularName}` }); 
      }
  };

  const addPackagePayment_only = async (d: any) => {
      await addDoc(collection(db, 'packagePayments'), d);
  };
  
  const addPackageLead = async (d: any) => await addDoc(collection(db, 'packageLeads'), { ...d, status: 'PENDING', createdAt: new Date().toISOString() });
  
  const updatePackageLead = async (id: string, d: any) => await updateDoc(doc(db, 'packageLeads', id), d);
  
  const deletePackageLead = async (id: string) => await deleteDoc(doc(db, 'packageLeads', id));
  
  const addFuelRecord = async (d: any) => { 
      await addDoc(collection(db, 'fuelRecords'), d); 
      if(d.location === 'STREET' && d.cost > 0) {
          await addDoc(collection(db, 'transactions'), { 
              type: 'EXPENSE', 
              status: 'COMPLETED', 
              category: 'Combustível Externo', 
              amount: d.cost, 
              date: d.date, 
              description: `Abast. Externo: ${d.busId}` 
          }); 
      }
  };
  
  const updateFuelRecord = async (id: string, d: any) => await updateDoc(doc(db, 'fuelRecords', id), d);
  
  const deleteFuelRecord = async (id: string) => await deleteDoc(doc(db, 'fuelRecords', id));
  
  const addFuelSupply = async (d: any) => { 
      await addDoc(collection(db, 'fuelSupplies'), d); 
      if(d.registeredInFinance && d.cost > 0) {
          await addDoc(collection(db, 'transactions'), { 
              type: 'EXPENSE', 
              status: 'COMPLETED', 
              category: `Compra ${d.type}`, 
              amount: d.cost, 
              date: d.date, 
              description: `Abast. Tanque Garagem: ${d.type} - NFe: ${d.nfe}`,
              nfe: d.nfe
          }); 
      }
  };

  const addDriverLiability = async (d: any, e: boolean) => { 
      await addDoc(collection(db, 'driverLiabilities'), { ...d, paidAmount: 0, status: 'OPEN' }); 
      if(e) await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Avaria/Multa', amount: d.totalAmount, date: d.date, description: `Multa/Avaria: ${d.description}` }); 
  };
  
  const payDriverLiability = async (id: string, a: number) => { 
      const l = driverLiabilities.find(x => x.id === id); 
      if(l) { 
          const total = l.paidAmount + a; 
          await updateDoc(doc(db, 'driverLiabilities', id), { paidAmount: total, status: total >= l.totalAmount ? 'PAID' : 'OPEN' }); 
          await addDoc(collection(db, 'transactions'), { type: 'INCOME', status: 'COMPLETED', category: 'Reembolso', amount: a, date: new Date().toISOString().split('T')[0], description: `Abatimento Mot: ${l.type}` }); 
      } 
  };
  
  const addDriverFee = async (d: any) => await addDoc(collection(db, 'driverFees'), { ...d, status: 'PENDING' });
  
  const payDriverFee = async (id: string) => { 
      const f = driverFees.find(x => x.id === id); 
      if(f) { 
          const dt = new Date().toISOString().split('T')[0]; 
          await updateDoc(doc(db, 'driverFees', id), { status: 'PAID', paymentDate: dt }); 
          await addDoc(collection(db, 'transactions'), { type: 'EXPENSE', status: 'COMPLETED', category: 'Diária', amount: f.amount, date: dt, description: `Pagto Diária: ${f.description}` }); 
      } 
  };
  
  const deleteDriverFee = async (id: string) => await deleteDoc(doc(db, 'driverFees', id));
  
  const addQuote = async (d: any) => await addDoc(collection(db, 'quotes'), { ...d, status: 'NEW', createdAt: new Date().toISOString() });
  
  const updateQuote = async (id: string, d: any) => await updateDoc(doc(db, 'quotes', id), d);
  
  const convertQuoteToBooking = async (qid: string, bid: string) => { 
      const q = quotes.find(x => x.id === qid); 
      if(!q) return { success: false, message: 'Erro' }; 
      const res = await addDoc(collection(db, 'bookings'), { busId: bid, clientName: q.clientName, clientPhone: q.clientPhone, destination: q.destination, startTime: q.startTime, endTime: q.endTime, value: q.price || 0, status: 'CONFIRMED', paymentStatus: 'PENDING' }); 
      await updateDoc(doc(db, 'quotes', qid), { status: 'APPROVED', convertedBookingId: res.id }); 
      return { success: true, message: 'Convertido!' }; 
  };
  
  const deleteQuote = async (id: string) => await deleteDoc(doc(db, 'quotes', id));
  
  const addPriceRoute = async (d: any) => await addDoc(collection(db, 'priceRoutes'), d);
  
  const updatePriceRoute = async (id: string, d: any) => await updateDoc(doc(db, 'priceRoutes', id), d);
  
  const deletePriceRoute = async (id: string) => await deleteDoc(doc(db, 'priceRoutes', id));
  
  const clearPriceTable = async () => { 
      const s = await getDocs(collection(db, 'priceRoutes')); 
      const b = writeBatch(db); 
      s.docs.forEach(x => b.delete(x.ref)); 
      await b.commit(); 
      return { success: true, message: 'Limpo!' }; 
  };
  
  const addClient = async (d: any) => await addDoc(collection(db, 'clients'), d);
  
  const updateClient = async (id: string, d: any) => await updateDoc(doc(db, 'clients', id), d);
  
  const deleteClient = async (id: string) => await deleteDoc(doc(db, 'clients', id));
  
  const importClients = async (l: any[]) => { 
      try { 
          const b = writeBatch(db); 
          l.forEach(x => b.set(doc(collection(db, 'clients')), x)); 
          await b.commit(); 
          return { success: true, count: l.length, message: 'Importado!' }; 
      } catch (err: any) { return { success: false, count: 0, message: err.message }; } 
  };
  
  const resetSystemData = async () => ({ success: true, message: 'Resetado!' });
  const seedDatabase = async () => {};
  
  const confirmTrip = async (type: any, ref: string, date: string) => await addDoc(collection(db, 'scheduleConfirmations'), { driverId: currentUser?.id, type, referenceId: ref, date, status: 'CONFIRMED', confirmedAt: new Date().toISOString() });

  return (
    <StoreContext.Provider value={{
      currentUser: currentUser!, isAuthenticated, settings, users, buses, bookings, parts, transactions, timeOffs, documents, maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts, travelPackages, packagePassengers, packagePayments, clients, packageLeads, fuelRecords, fuelSupplies, dieselStockLevel, arlaStockLevel, driverLiabilities, quotes, priceRoutes, driverFees, scheduleConfirmations,
      switchUser, addUser, updateUser, deleteUser, addBooking, updateBooking, updateBookingStatus, addPart, updateStock, addTransaction, addTimeOff, updateTimeOffStatus, deleteTimeOff, addDocument, deleteDocument, addMaintenanceRecord, addPurchaseRequest, updatePurchaseRequestStatus, addMaintenanceReport, updateMaintenanceReportStatus, addBus, updateBusStatus, deleteBus, 
      addCharterContract, updateCharterContract, deleteCharterContract,
      addTravelPackage, registerPackageSale, updatePackagePassenger, deletePackagePassenger, addPackagePayment, addPackagePayment_only, addPackageLead, updatePackageLead, deletePackageLead, addFuelRecord, updateFuelRecord, deleteFuelRecord, addFuelSupply, addDriverLiability, payDriverLiability,
      login, logout, register, sendPasswordReset, updateMyPassword, updateSettings, seedDatabase, 
      addQuote, updateQuote, convertQuoteToBooking, deleteQuote,
      addPriceRoute, updatePriceRoute, deletePriceRoute, importDefaultPrices: async () => ({ success: true, message: '' }), clearPriceTable,
      addDriverFee, payDriverFee, deleteDriverFee, restockPart,
      addClient, updateClient, deleteClient, importClients,
      resetSystemData, confirmTrip, restoreDatabase: async () => ({ success: true, message: '' })
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