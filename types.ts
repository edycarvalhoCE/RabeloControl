
export enum UserRole {
  DEVELOPER = 'DEVELOPER',
  MANAGER = 'GERENTE',
  FINANCE = 'FINANCEIRO',
  DRIVER = 'MOTORISTA',
  MECHANIC = 'MECANICO',
  GARAGE_AUX = 'AUX_GARAGEM',
  AGENT = 'AGENTE'
}

export interface PaymentRateProfile {
  debit: number;
  creditCash: number;
  creditInstallment2to6: number;
  creditInstallment7to12: number;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  logoUrl: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  aiApiKey?: string;
  paymentRates?: {
    maquininha: PaymentRateProfile;
    ecommerce: PaymentRateProfile;
    site: PaymentRateProfile;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  avatar: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  dailyRate?: number;
}

export interface Bus {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
  features: string[];
}

export interface Quote {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  destination: string;
  departureLocation: string;
  startTime: string;
  endTime: string;
  passengerCount: number;
  price?: number;
  observations?: string;
  status: 'NEW' | 'PRICED' | 'SENT' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  convertedBookingId?: string;
}

export interface Booking {
  id: string;
  busId: string;
  driverId: string | null;
  freelanceDriverName?: string | null;
  driver2Id?: string | null;
  freelanceDriver2Name?: string | null;
  clientName: string;
  clientPhone?: string;
  destination: string;
  startTime: string;
  endTime: string;
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
  lastSupplier?: string;
  lastNfe?: string;
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
  nfe?: string;
  paymentMethod?: string;
  installment?: { current: number; total: number; };
}

export interface DriverFee {
  id: string;
  driverId: string | null;
  freelanceDriverName?: string;
  amount: number;
  date: string;
  description: string;
  status: 'PENDING' | 'PAID';
  paymentDate?: string | null;
  relatedBookingId?: string;
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
  code?: string;
  type: 'PF' | 'PJ';
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  observations?: string;
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
  saleType?: 'DIRECT' | 'AGENCY' | 'PROMOTER';
  agencyName?: string;
  agencyPhone?: string;
  paxList?: string;
  commissionValue?: number;
  paymentMethod?: string;
  installments?: number;
}

export interface PackagePayment {
  id: string;
  passengerId: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
}

export interface PackageLead {
  id: string;
  name: string;
  phone: string;
  packageId: string;
  notes: string;
  callbackDate: string;
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'LOST';
  createdAt: string;
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

export interface ScheduleConfirmation {
  id: string;
  driverId: string;
  type: 'BOOKING' | 'CHARTER';
  referenceId: string;
  date: string;
  status: 'CONFIRMED';
  confirmedAt: string;
}

export interface CharterContract {
  id: string;
  clientName: string;
  route: string;
  busId: string;
  driverId: string | null;
  freelanceDriverName?: string | null;
  weekDays: number[];
  morningDeparture: string;
  afternoonDeparture: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'INACTIVE';
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
  kmStart?: number;
  kmEnd?: number;
  averageConsumption?: number;
  arlaCost?: number;
}

export interface FuelSupply {
  id: string;
  date: string;
  liters: number;
  cost: number;
  supplier: string;
  nfe: string;
  receiverName: string;
  registeredInFinance: boolean;
  type: 'DIESEL' | 'ARLA';
}

export interface PriceRoute {
  id: string;
  origin: string;
  destination: string;
  vehicleType: string;
  price: number;
  description?: string;
}

export interface TimeOff {
  id: string;
  driverId: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  type: 'FOLGA' | 'FERIAS' | 'PLANTAO' | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DriverDocument {
  id: string;
  driverId: string;
  title: string;
  fileName: string;
  fileContent: string;
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
  requesterId: string;
  relatedBusId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
}

export interface MaintenanceReport {
  id: string;
  busId: string;
  driverId: string;
  type: string;
  description: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
}
