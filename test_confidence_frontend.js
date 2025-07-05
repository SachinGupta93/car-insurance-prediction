// Test confidence calculation in browser console
// Open browser console and run this code

console.log('🧪 Testing confidence calculation...');

// Test confidence display calculation
const testConfidenceValues = [0.89, 0.75, 0.92, 0.65];

testConfidenceValues.forEach(confidence => {
  const displayValue = (confidence * 100).toFixed(1);
  console.log(`Confidence ${confidence} → Display: ${displayValue}%`);
});

// Test demo mode vs dev mode
const devModeResult = {
  damageType: 'Test Damage',
  confidence: 0.89, // Should be decimal
  isDemoMode: false, // Should be false for dev mode
  quotaExceeded: false
};

const demoModeResult = {
  damageType: 'Test Damage', 
  confidence: 0.75, // Should be decimal
  isDemoMode: true, // Should be true for demo mode
  quotaExceeded: true
};

console.log('Dev Mode Result:', devModeResult);
console.log('Demo Mode Result:', demoModeResult);

// Test display formatting
console.log('Dev Mode Display:', `${(devModeResult.confidence * 100).toFixed(1)}%`);
console.log('Demo Mode Display:', `${(demoModeResult.confidence * 100).toFixed(1)}%`);

console.log('✅ Test complete - check output above');
