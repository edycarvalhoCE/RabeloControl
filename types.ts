
export enum UserRole {
  DEVELOPER = 'DEVELOPER',
  MANAGER = 'GERENTE',
  FINANCE = 'FINANCEIRO',
  DRIVER = 'MOTORISTA',
  MECHANIC = 'MECANICO',
  GARAGE_AUX = 'AUX_GARAGEM',
  AGENT = 'AGENTE' // Novo perfil comercial
}

export interface PaymentRateProfile {
  debit: number;
  creditCash: number; // À vista
  creditInstallment2to6: number;
  creditInstallment7to12: number;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  logoUrl: string; // Base64 or URL
  cnpj?: string;
  phone?: string;
  address?: string;
  aiApiKey?: string; // Nova chave para IA
  
  // Payment Rates Configuration
  paymentRates?: {
    maquininha: PaymentRateProfile;
    ecommerce: PaymentRateProfile; // Link de Pagamento
    site: PaymentRateProfile;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string; // Allow string for legacy data compatibility
  avatar: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED'; // New field for access control
  dailyRate?: number; // Valor padrão da diária
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
  startTime: string; // ISO string
  endTime: string; // ISO string
  passengerCount: number;
  price?: number; // Defined by manager
  observations?: string;
  status: 'NEW' | 'PRICED' | 'SENT' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  convertedBookingId?: string; // Link if converted
}

export interface PriceRoute {
  id: string;
  origin: string;
  destination: string;
  vehicleType: string; // e.g. "Micro", "Convencional 46", "LD"
  price: number;
  description?: string; // e.g. "Ida e Volta", "Apenas Ida"
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
  lastSupplier?: string; // Fornecedor da última compra
  lastNfe?: string;      // Nota Fiscal da última compra
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

export interface DriverFee {
  id: string;
  driverId: string | null; // Pode ser null se for freelance
  freelanceDriverName?: string; // Nome se for freelance
  amount: number;
  date: string; // Data da viagem ou referência
  description: string; // Ex: "Viagem para Aparecida"
  status: 'PENDING' | 'PAID';
  paymentDate?: string; // Data que a empresa pagou
  relatedBookingId?: string;
}

export interface TimeOff {
  id: string;
  driverId: string;
  date: string; // YYYY-MM-DD (Start Date)
  endDate?: string; // YYYY-MM-DD (End Date for Vacations)
  type: 'FOLGA' | 'FERIAS' | 'PLANTAO';
  startTime?: string; // HH:mm for Plantão
  endTime?: string; // HH:mm for Plantão
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
  driverId: string | null;
  freelanceDriverName?: string | null; // Added support for freelance
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
  code?: string; // Código manual da planilha
  type: 'PF' | 'PJ';
  name: string;
  cpf: string; // CPF ou CNPJ
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
  
  // Commission Fields
  saleType?: 'DIRECT' | 'AGENCY' | 'PROMOTER';
  agencyName?: string;
  agencyPhone?: string;
  paxList?: string; // Text field for PAX names in agency sale
  commissionRate?: number; // 0.01 or 0.12 or 0.10
  commissionValue?: number;
  sellerId?: string;
}

export interface PackageLead {
  id: string;
  name: string;
  phone: string;
  packageId: string;
  notes: string;
  callbackDate: string; // YYYY-MM-DD
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'LOST';
  createdAt: string;
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
  // NEW KM FIELDS (Optional to support legacy data)
  kmStart?: number;
  kmEnd?: number;
  averageConsumption?: number; // KM/L
  arlaCost?: number; // Custo específico do Arla quando na rua
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

export interface ScheduleConfirmation {
  id: string;
  driverId: string;
  type: 'BOOKING' | 'CHARTER';
  referenceId: string; // Booking ID or Charter Contract ID
  date: string; // YYYY-MM-DD
  status: 'CONFIRMED';
  confirmedAt: string;
}
