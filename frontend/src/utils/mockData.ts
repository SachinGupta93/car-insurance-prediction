/**
 * Mock data for testing the application
 * This file contains dummy data for various parts of the application.
 */

// Mock user data
export interface MockUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 'user1',
    displayName: 'John Doe',
    email: 'john@example.com',
    photoURL: 'https://randomuser.me/api/portraits/men/1.jpg',
    createdAt: '2023-01-15T08:30:00Z',
  },
  {
    id: 'user2',
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    photoURL: 'https://randomuser.me/api/portraits/women/2.jpg',
    createdAt: '2023-02-20T14:15:00Z',
  },
];

// Mock vehicle data
export interface MockVehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
  vin?: string;
}

export const mockVehicles: MockVehicle[] = [
  {
    id: 'vehicle1',
    userId: 'user1',
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    color: 'Silver',
    licensePlate: 'ABC1234',
    vin: 'JT2BF22K1W0123456',
  },
  {
    id: 'vehicle2',
    userId: 'user1',
    make: 'Honda',
    model: 'Accord',
    year: 2018,
    color: 'Black',
    licensePlate: 'XYZ7890',
    vin: 'JH4KA8270MC001234',
  },
  {
    id: 'vehicle3',
    userId: 'user2',
    make: 'Ford',
    model: 'Escape',
    year: 2021,
    color: 'Blue',
    licensePlate: 'DEF4567',
    vin: '1FMCU0G91MUA12345',
  },
];

// Mock insurance data
export interface MockInsurance {
  id: string;
  userId: string;
  vehicleId: string;
  provider: string;
  policyNumber: string;
  coverageType: string;
  startDate: string;
  endDate: string;
  contactPhone: string;
}

export const mockInsurances: MockInsurance[] = [
  {
    id: 'ins1',
    userId: 'user1',
    vehicleId: 'vehicle1',
    provider: 'Safe Auto Insurance',
    policyNumber: 'SA-123456',
    coverageType: 'Comprehensive',
    startDate: '2023-01-01T00:00:00Z',
    endDate: '2023-12-31T23:59:59Z',
    contactPhone: '1-800-123-4567',
  },
  {
    id: 'ins2',
    userId: 'user1',
    vehicleId: 'vehicle2',
    provider: 'Progressive',
    policyNumber: 'PG-789012',
    coverageType: 'Liability Only',
    startDate: '2023-02-15T00:00:00Z',
    endDate: '2024-02-14T23:59:59Z',
    contactPhone: '1-800-987-6543',
  },
  {
    id: 'ins3',
    userId: 'user2',
    vehicleId: 'vehicle3',
    provider: 'State Farm',
    policyNumber: 'SF-345678',
    coverageType: 'Full Coverage',
    startDate: '2023-03-10T00:00:00Z',
    endDate: '2024-03-09T23:59:59Z',
    contactPhone: '1-800-555-1212',
  }
];

// Mock repair shops data
export interface MockRepairShop {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website?: string;
  rating: number; // 1-5 stars
  services: string[];
}

export const mockRepairShops: MockRepairShop[] = [
  {
    id: 'shop1',
    name: 'City Auto Body',
    address: '123 Main Street',
    city: 'Anytown',
    state: 'CA',
    zip: '90210',
    phone: '(555) 123-4567',
    website: 'https://www.cityautobody.example',
    rating: 4.5,
    services: ['Collision Repair', 'Paint', 'Dent Removal'],
  },
  {
    id: 'shop2',
    name: 'Express Collision Center',
    address: '456 Oak Avenue',
    city: 'Somewhere',
    state: 'NY',
    zip: '10001',
    phone: '(555) 987-6543',
    rating: 4.2,
    services: ['Collision Repair', 'Glass Replacement', 'Frame Straightening'],
  },
  {
    id: 'shop3',
    name: 'Premium Auto Care',
    address: '789 Pine Road',
    city: 'Elsewhere',
    state: 'TX',
    zip: '75001',
    phone: '(555) 456-7890',
    website: 'https://www.premiumauto.example',
    rating: 4.8,
    services: ['Collision Repair', 'Custom Paint', 'Restoration', 'Detailing'],
  },
];

// Mock damage analysis images (local placeholders)
export const mockDamageImages = [
  '/mock-images/damage1.jpg',
  '/mock-images/damage2.jpg',
  '/mock-images/damage3.jpg',
  '/mock-images/damage4.jpg',
  '/mock-images/damage5.jpg',
];

// Helper function to get a random item from an array
export const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export default {
  users: mockUsers,
  vehicles: mockVehicles,
  insurances: mockInsurances,
  repairShops: mockRepairShops,
  damageImages: mockDamageImages,
  getRandomItem
};