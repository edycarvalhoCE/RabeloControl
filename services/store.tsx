import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Bus, Booking, Part, Transaction, TimeOff, UserRole, DriverDocument, MaintenanceRecord, PurchaseRequest, MaintenanceReport, CharterContract } from '../types';
import { MOCK_USERS, MOCK_BUSES, MOCK_PARTS } from '../constants';

interface StoreContextType {
  currentUser: User;
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
  
  // Actions
  switchUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- State (Simulating DB) ---
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [users, setUsers] = useState<User[]>([
      ...MOCK_USERS,
      { id: 'u_mech_1', name: 'Julio (Mecânico)', role: UserRole.MECHANIC, email: 'julio@rabelotour.com', avatar: 'https://ui-avatars.com/api/?name=Julio+Mecanico&background=random' }
  ]);
  const [buses, setBuses] = useState<Bus[]>(MOCK_BUSES);
  const [parts, setParts] = useState<Part[]>(MOCK_PARTS);
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 'bk1', busId: 'b1', driverId: 'u3', clientName: 'Turismo Sol', destination: 'Praia Grande',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 172800000).toISOString(),
      value: 3500, status: 'CONFIRMED',
      paymentStatus: 'PAID', paymentDate: new Date().toISOString(),
      departureLocation: 'Terminal Rodoviário Barra Funda',
      presentationTime: new Date(Date.now() + 82800000).toISOString(), // 1 hour before start
      type: 'TURISMO'
    }
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 't1', type: 'INCOME', status: 'COMPLETED', category: 'Locação', amount: 3500, date: new Date().toISOString(), description: 'Pagamento Turismo Sol' },
    { id: 't2', type: 'EXPENSE', status: 'COMPLETED', category: 'Manutenção', amount: 450, date: new Date().toISOString(), description: 'Troca de óleo Bus 02' }
  ]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>([]);
  const [charterContracts, setCharterContracts] = useState<CharterContract[]>([]);

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const addUser = (userData: Omit<User, 'id' | 'avatar'>) => {
      const newUser: User = {
          ...userData,
          id: Math.random().toString(36).substr(2, 9),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`
      };
      setUsers(prev => [...prev, newUser]);
  };

  // --- Logic ---

  const checkAvailability = (busId: string, start: string, end: string): boolean => {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();

    // Check overlaps
    return !bookings.some(b => {
      if (b.busId !== busId || b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      
      return (startDate < bEnd && endDate > bStart);
    });
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'status'>): Promise<{ success: boolean; message: string }> => {
    if (!checkAvailability(bookingData.busId, bookingData.startTime, bookingData.endTime)) {
      return { success: false, message: 'Conflito: Este ônibus já está alugado neste período!' };
    }

    const bookingId = Math.random().toString(36).substr(2, 9);
    const newBooking: Booking = {
      ...bookingData,
      id: bookingId,
      status: 'CONFIRMED'
    };
    setBookings(prev => [...prev, newBooking]);
    
    if (newBooking.value > 0 && newBooking.paymentStatus !== 'PENDING') {
        let transStatus: 'COMPLETED' | 'PENDING' = newBooking.paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING';
        let transDesc = `Locação: ${newBooking.clientName} - ${newBooking.destination}`;
        if (newBooking.paymentStatus === 'SCHEDULED') transDesc += " (Agendado)";

        addTransaction({
            type: 'INCOME',
            status: transStatus,
            category: 'Locação',
            amount: newBooking.value,
            date: newBooking.paymentDate || new Date().toISOString(),
            description: transDesc,
            relatedBookingId: bookingId
        });
    }

    return { success: true, message: 'Agendamento realizado com sucesso!' };
  };

  const updateBookingStatus = (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const addPart = (part: Omit<Part, 'id'>) => {
    setParts(prev => [...prev, { ...part, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const updateStock = (id: string, quantityDelta: number) => {
    setParts(prev => prev.map(p => {
      if (p.id === id) {
        const newQty = p.quantity + quantityDelta;
        return { ...p, quantity: newQty < 0 ? 0 : newQty };
      }
      return p;
    }));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...transaction, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const addTimeOff = (timeOff: Omit<TimeOff, 'id' | 'status'>) => {
    const isManager = currentUser.role === UserRole.MANAGER;
    setTimeOffs(prev => [...prev, { 
      ...timeOff, 
      id: Math.random().toString(36).substr(2, 9), 
      status: isManager ? 'APPROVED' : 'PENDING' 
    }]);
  };

  const updateTimeOffStatus = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setTimeOffs(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const addDocument = (doc: Omit<DriverDocument, 'id' | 'uploadDate'>) => {
    setDocuments(prev => [...prev, { ...doc, id: Math.random().toString(36).substr(2, 9), uploadDate: new Date().toISOString() }]);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const addMaintenanceRecord = (record: Omit<MaintenanceRecord, 'id'>) => {
      // 1. Create Maintenance Record
      setMaintenanceRecords(prev => [...prev, { ...record, id: Math.random().toString(36).substr(2, 9) }]);
      
      // 2. Decrement Stock
      updateStock(record.partId, -record.quantityUsed);

      // 3. Create Expense Transaction
      const part = parts.find(p => p.id === record.partId);
      const bus = buses.find(b => b.id === record.busId);
      const cost = part ? part.price * record.quantityUsed : 0;
      
      addTransaction({
          type: 'EXPENSE',
          status: 'COMPLETED',
          category: 'Manutenção',
          amount: cost,
          date: record.date,
          description: `Manutenção ${record.type}: ${bus?.plate} - ${part?.name} (x${record.quantityUsed})`
      });
  };

  const addPurchaseRequest = (req: Omit<PurchaseRequest, 'id' | 'status' | 'requestDate'>) => {
      setPurchaseRequests(prev => [...prev, {
          ...req,
          id: Math.random().toString(36).substr(2, 9),
          status: 'PENDING',
          requestDate: new Date().toISOString()
      }]);
  };

  const updatePurchaseRequestStatus = (id: string, status: PurchaseRequest['status']) => {
    setPurchaseRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  };

  const addMaintenanceReport = (report: Omit<MaintenanceReport, 'id' | 'status'>) => {
    setMaintenanceReports(prev => [...prev, {
        ...report,
        id: Math.random().toString(36).substr(2, 9),
        status: 'PENDING'
    }]);
  };

  const updateMaintenanceReportStatus = (id: string, status: MaintenanceReport['status']) => {
    setMaintenanceReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const addBus = (bus: Omit<Bus, 'id' | 'status'>) => {
    setBuses(prev => [...prev, { ...bus, id: Math.random().toString(36).substr(2, 9), status: 'AVAILABLE' }]);
  };

  const updateBusStatus = (id: string, status: Bus['status']) => {
    setBuses(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const addCharterContract = (contract: Omit<CharterContract, 'id' | 'status'>) => {
      // 1. Add contract to state
      const newContract = { ...contract, id: Math.random().toString(36).substr(2, 9), status: 'ACTIVE' as 'ACTIVE' };
      setCharterContracts(prev => [...prev, newContract]);

      // 2. Auto-generate bookings for the duration
      const generatedBookings: Booking[] = [];
      let currentDate = new Date(contract.startDate);
      const end = new Date(contract.endDate);
      const tripDurationMs = 90 * 60 * 1000; // Assume 1.5 hours per leg

      while (currentDate <= end) {
          if (contract.weekDays.includes(currentDate.getDay())) {
              const dateStr = currentDate.toISOString().split('T')[0];
              
              // Morning Leg
              if (contract.morningDeparture) {
                  const startMorning = new Date(`${dateStr}T${contract.morningDeparture}:00`);
                  const endMorning = new Date(startMorning.getTime() + tripDurationMs);
                  
                  generatedBookings.push({
                      id: Math.random().toString(36).substr(2, 9),
                      busId: contract.busId,
                      driverId: contract.driverId,
                      clientName: contract.clientName,
                      destination: `${contract.route} (Manhã)`,
                      startTime: startMorning.toISOString(),
                      endTime: endMorning.toISOString(),
                      value: 0, // Contract usually monthly, per-ride value 0 for now
                      status: 'CONFIRMED',
                      paymentStatus: 'PAID',
                      paymentDate: new Date().toISOString(),
                      departureLocation: 'Garagem/Ponto Inicial',
                      presentationTime: new Date(startMorning.getTime() - 1800000).toISOString(), // 30 min before
                      type: 'FRETAMENTO'
                  });
              }

              // Afternoon Leg
              if (contract.afternoonDeparture) {
                  const startAfternoon = new Date(`${dateStr}T${contract.afternoonDeparture}:00`);
                  const endAfternoon = new Date(startAfternoon.getTime() + tripDurationMs);

                  generatedBookings.push({
                    id: Math.random().toString(36).substr(2, 9),
                    busId: contract.busId,
                    driverId: contract.driverId,
                    clientName: contract.clientName,
                    destination: `${contract.route} (Tarde)`,
                    startTime: startAfternoon.toISOString(),
                    endTime: endAfternoon.toISOString(),
                    value: 0,
                    status: 'CONFIRMED',
                    paymentStatus: 'PAID',
                    paymentDate: new Date().toISOString(),
                    departureLocation: 'Empresa/Fábrica',
                    presentationTime: new Date(startAfternoon.getTime() - 1800000).toISOString(),
                    type: 'FRETAMENTO'
                });
              }
          }
          // Next day
          currentDate.setDate(currentDate.getDate() + 1);
      }

      // Add all generated bookings to state, skipping availability check for simplicity (assuming manager knows what they are doing with contract)
      setBookings(prev => [...prev, ...generatedBookings]);
  };

  return (
    <StoreContext.Provider value={{
      currentUser, users, buses, bookings, parts, transactions, timeOffs, documents, maintenanceRecords, purchaseRequests, maintenanceReports, charterContracts,
      switchUser, addUser, addBooking, updateBookingStatus, addPart, updateStock, addTransaction, addTimeOff, updateTimeOffStatus, addDocument, deleteDocument, addMaintenanceRecord, addPurchaseRequest, updatePurchaseRequestStatus, addMaintenanceReport, updateMaintenanceReportStatus, addBus, updateBusStatus, addCharterContract
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