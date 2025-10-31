// Simple test file to verify text-to-speech service functionality
import { getLanguageCode, isLanguageSupported, getBestVoice } from './ttsService';

// Test language mapping
console.log('Testing language mapping...');
console.log('English ->', getLanguageCode('English'));
console.log('Spanish ->', getLanguageCode('Spanish'));
console.log('French ->', getLanguageCode('French'));
console.log('Chinese ->', getLanguageCode('Chinese'));
console.log('Japanese ->', getLanguageCode('Japanese'));

// Test case insensitive matching
console.log('english (lowercase) ->', getLanguageCode('english'));
console.log('SPANISH (uppercase) ->', getLanguageCode('SPANISH'));

// Test partial matching
console.log('Chines ->', getLanguageCode('Chines')); // Should match Chinese
console.log('Jap ->', getLanguageCode('Jap')); // Should match Japanese

// Test unsupported language (should default to English)
console.log('Klingon ->', getLanguageCode('Klingon'));

// Test language support (this would require a browser environment)
console.log('Browser supports speechSynthesis:', typeof window !== 'undefined' && 'speechSynthesis' in window);

// Note: The following functions require a browser environment with speechSynthesis API
// isLanguageSupported and getBestVoice would be tested in a browser environment