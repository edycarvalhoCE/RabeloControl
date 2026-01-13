export enum UserRole {
  DEVELOPER = 'DESENVOLVEDOR',
  MANAGER = 'GERENTE',
  FINANCE = 'FINANCEIRO',
  DRIVER = 'MOTORISTA',
  MECHANIC = 'MECANICO'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string;
}

export interface Bus {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'BUSY';
  features: string[]; // List of options like 'WiFi', 'WC', 'AC'
}

export interface Part {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number; // Threshold for alert
  price: number;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'COMPLETED' | 'PENDING'; // Completed = Paid/Received, Pending = Future
  category: string;
  amount: number;
  date: string; // ISO Date (Date of payment or expected date)
  description: string;
  relatedBookingId?: string;
}

export interface Booking {
  id: string;
  busId: string;
  driverId: string | null;
  clientName: string;
  clientPhone?: string; // Contact phone for Service Order
  destination: string;
  startTime: string; // ISO Date
  endTime: string;   // ISO Date
  value: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  // Financial fields
  paymentStatus: 'PAID' | 'PENDING' | 'SCHEDULED'; 
  paymentDate: string | null; // Date paid OR Date scheduled to pay
  // Logistics fields
  departureLocation: string;
  presentationTime: string; // ISO Date (Garage presentation)
  type?: 'TURISMO' | 'FRETAMENTO'; // Distinguish between types
}

export interface TimeOff {
  id: string;
  driverId: string;
  date: string; // ISO Date (YYYY-MM-DD)
  type: 'FOLGA' | 'FERIAS';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DriverDocument {
  id: string;
  driverId: string;
  title: string;
  fileName: string;
  fileContent: string; // Base64 string for demo purposes
  uploadDate: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  busId: string;
  partId: string;
  quantityUsed: number;
  type: 'PREVENTIVA' | 'CORRETIVA';
  mechanicId: string;
}

export interface PurchaseRequest {
  id: string;
  requesterId: string;
  partName: string;
  quantity: number;
  relatedBusId?: string; // Optional
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  requestDate: string;
}

export interface MaintenanceReport {
  id: string;
  driverId: string;
  busId: string;
  date: string;
  type: string; // 'MECANICA', 'ELETRICA', 'LIMPEZA', 'OUTROS'
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface CharterContract {
  id: string;
  clientName: string; // e.g., Carbografite
  route: string; // e.g., Linha Administrativa
  busId: string;
  driverId: string;
  weekDays: number[]; // 0 = Sunday, 1 = Monday...
  morningDeparture: string; // HH:mm
  afternoonDeparture: string; // HH:mm
  startDate: string; // ISO Date
  endDate: string; // ISO Date
  status: 'ACTIVE' | 'ENDED';
}

// --- New Types for Travel Packages & Clients ---

export interface Client {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface TravelPackage {
  id: string;
  title: string; // e.g., "Trem das Montanhas"
  date: string; // ISO Date
  adultPrice: number;
  childPrice: number;
  seniorPrice: number; // Melhor Idade
  status: 'OPEN' | 'CLOSED';
}

export interface PackagePassenger {
  id: string;
  packageId: string;
  clientId: string; // Link to Client
  
  // Sale Details
  titularName: string;
  titularCpf: string;
  
  // Quantities
  qtdAdult: number;
  qtdChild: number;
  qtdSenior: number;
  
  // Financials
  agreedPrice: number; // Total to pay after discount
  discount: number;
  paidAmount: number;
  
  status: 'PENDING' | 'PARTIAL' | 'PAID';
}

export interface PackagePayment {
  id: string;
  passengerId: string;
  amount: number;
  date: string;
  method: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  installments?: number; // If credit card
  notes?: string;
}