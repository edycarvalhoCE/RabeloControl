import { Bus, Part, User, UserRole } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Carlos Silva', role: UserRole.MANAGER, email: 'carlos@busfleet.com', avatar: 'https://picsum.photos/id/1005/200/200' },
  { id: 'u2', name: 'Ana Souza', role: UserRole.FINANCE, email: 'ana@busfleet.com', avatar: 'https://picsum.photos/id/1011/200/200' },
  { id: 'u3', name: 'Roberto Dias', role: UserRole.DRIVER, email: 'roberto@busfleet.com', avatar: 'https://picsum.photos/id/1012/200/200' },
  { id: 'u4', name: 'João Paulo', role: UserRole.DRIVER, email: 'joao@busfleet.com', avatar: 'https://picsum.photos/id/1025/200/200' },
];

export const MOCK_BUSES: Bus[] = [
  { id: 'b1', plate: 'ABC-1234', model: 'Mercedes-Benz O500', capacity: 46, status: 'AVAILABLE', features: ['Ar Condicionado', 'WiFi', 'Banheiro'] },
  { id: 'b2', plate: 'XYZ-9876', model: 'Scania K360', capacity: 50, status: 'AVAILABLE', features: ['Ar Condicionado', 'TV', 'Frigobar', 'Leito'] },
  { id: 'b3', plate: 'DEF-5555', model: 'Volvo B340', capacity: 42, status: 'MAINTENANCE', features: ['Ar Condicionado'] },
];

export const MOCK_PARTS: Part[] = [
  { id: 'p1', name: 'Óleo Motor 15W40', quantity: 50, minQuantity: 10, price: 45.00 },
  { id: 'p2', name: 'Filtro de Ar', quantity: 5, minQuantity: 8, price: 120.00 },
  { id: 'p3', name: 'Pneu 295/80', quantity: 12, minQuantity: 4, price: 2500.00 },
];