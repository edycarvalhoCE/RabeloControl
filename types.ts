
export enum UserRole {
  DEVELOPER = 'DEVELOPER',
  MANAGER = 'GERENTE',
  FINANCE = 'FINANCEIRO',
  DRIVER = 'MOTORISTA',
  MECHANIC = 'MECANICO'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string; // Allow string for legacy data compatibility
  avatar: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED'; // New field for access control
}

export interface Bus {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
  features: string[];
}

export interface Booking {
  id: string;
  busId: string;
  driverId: string | null;
  freelanceDriverName?: string | null;
  clientName: string;
  clientPhone?: string;
  destination: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  value: number;
  paymentStatus: 'PAID' | 'PENDING' | 'SCHEDULED';
  paymentDate?: string | null;
  departureLocation?: string;
  presentationTime?: string;
  observations?: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface Part {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  price: number;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'COMPLETED' | 'PENDING';
  category: string;
  amount: number;
  date: string;
  description: string;
  relatedBookingId?: string;
  // New fields for Expenses/Installments
  nfe?: string;
  paymentMethod?: 'BOLETO' | 'CARTAO_CREDITO' | 'PIX' | 'DINHEIRO' | 'OUTROS';
  installment?: {
    current: number;
    total: number;
  };
}

export interface TimeOff {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  type: 'FOLGA' | 'FERIAS';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface DriverDocument {
  id: string;
  driverId: string;
  title: string;
  fileName: string;
  fileContent: string; // Base64
  uploadDate: string;
}

export interface MaintenanceRecord {
  id: string;
  busId: string;
  partId: string;
  quantityUsed: number;
  type: 'CORRETIVA' | 'PREVENTIVA';
  date: string;
  mechanicId: string;
}

export interface PurchaseRequest {
  id: string;
  partName: string;
  quantity: number;
  relatedBusId?: string;
  requesterId: string;
  status: 'PENDING' | 'COMPLETED';
  requestDate: string;
}

export interface MaintenanceReport {
  id: string;
  busId: string;
  driverId: string;
  type: string; // MECANICA, ELETRICA, etc.
  description: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface CharterContract {
  id: string;
  clientName: string;
  route: string;
  busId: string;
  driverId: string;
  weekDays: number[];
  morningDeparture: string;
  afternoonDeparture: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface TravelPackage {
  id: string;
  title: string;
  date: string;
  adultPrice: number;
  childPrice: number;
  seniorPrice: number;
  status: 'OPEN' | 'CLOSED';
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
}

export interface PackagePassenger {
  id: string;
  packageId: string;
  clientId: string;
  titularName: string;
  titularCpf: string;
  qtdAdult: number;
  qtdChild: number;
  qtdSenior: number;
  discount: number;
  agreedPrice: number;
  paidAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  
  // Commission Fields
  saleType?: 'DIRECT' | 'AGENCY';
  agencyName?: string;
  agencyPhone?: string;
  paxList?: string; // Text field for PAX names in agency sale
  commissionRate?: number; // 0.01 or 0.12
  commissionValue?: number;
  sellerId?: string;
}

export interface PackagePayment {
  id: string;
  passengerId: string;
  amount: number;
  date: string;
  method: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  installments?: number;
  notes?: string;
}

export interface FuelRecord {
  id: string;
  date: string;
  busId: string;
  dieselLiters: number;
  hasArla: boolean;
  arlaLiters: number;
  location: 'GARAGE' | 'STREET';
  cost: number;
  stationName?: string;
  loggedBy: string;
}

export interface FuelSupply {
  id: string;
  date: string;
  liters: number;
  cost: number;
  receiverName: string;
  registeredInFinance: boolean;
  type: 'DIESEL'; 
}

export interface DriverLiability {
  id: string;
  driverId: string;
  type: 'AVARIA' | 'MULTA';
  date: string; 
  description: string; 
  totalAmount: number;
  paidAmount: number; 
  installments: number; 
  status: 'OPEN' | 'PAID';
}
