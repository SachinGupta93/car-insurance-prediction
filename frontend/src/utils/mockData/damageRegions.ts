// Mock data for damage regions on car images
// These represent bounding boxes for damaged areas with damage types and confidence scores

export interface MockDamageRegion {
  x: number; // x-coordinate as percentage of image width
  y: number; // y-coordinate as percentage of image height
  width: number; // width as percentage of image width
  height: number; // height as percentage of image height
  damageType: string;
  confidence: number;
}

export const mockDamageRegions: Record<string, MockDamageRegion[]> = {
  // Regions for a car with front bumper damage
  'frontBumperDamage': [
    {
      x: 20,
      y: 65,
      width: 35,
      height: 20,
      damageType: 'Scratch',
      confidence: 0.92
    },
    {
      x: 45,
      y: 70,
      width: 20,
      height: 15,
      damageType: 'Dent',
      confidence: 0.87
    }
  ],
  
  // Regions for a car with side damage
  'sideDamage': [
    {
      x: 30,
      y: 40,
      width: 40,
      height: 25,
      damageType: 'Dent',
      confidence: 0.95
    },
    {
      x: 60,
      y: 45,
      width: 15,
      height: 20,
      damageType: 'Paint Scratch',
      confidence: 0.89
    }
  ],
  
  // Regions for a car with rear damage
  'rearDamage': [
    {
      x: 40,
      y: 50,
      width: 35,
      height: 20,
      damageType: 'Broken Taillight',
      confidence: 0.98
    },
    {
      x: 25,
      y: 60,
      width: 30,
      height: 15,
      damageType: 'Bumper Damage',
      confidence: 0.94
    }
  ],
  
  // Regions for a car with windshield damage
  'windshieldDamage': [
    {
      x: 45,
      y: 30,
      width: 30,
      height: 15,
      damageType: 'Crack',
      confidence: 0.97
    },
    {
      x: 40,
      y: 35,
      width: 10,
      height: 10,
      damageType: 'Chip',
      confidence: 0.93
    }
  ],
  
  // Add more region sets as needed
};

// Helper to get random damage regions for testing
export const getRandomDamageRegions = (): MockDamageRegion[] => {
  const keys = Object.keys(mockDamageRegions);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return mockDamageRegions[randomKey];
};
