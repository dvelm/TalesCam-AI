import { StoryPart } from '../types';

// Language mapping for SpeechSynthesis API
export const languageMap: { [key: string]: string } = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Dutch': 'nl-NL',
  'Polish': 'pl-PL',
  'Turkish': 'tr-TR',
  'Swedish': 'sv-SE',
  'Danish': 'da-DK',
  'Norwegian': 'no-NO',
  'Finnish': 'fi-FI',
  'Greek': 'el-GR',
  'Czech': 'cs-CZ',
  'Hungarian': 'hu-HU',
  'Thai': 'th-TH',
  'Vietnamese': 'vi-VN',
  'Indonesian': 'id-ID',
  'Malay': 'ms-MY',
  'Hindi': 'hi-IN',
  'Bengali': 'bn-IN',
  'Urdu': 'ur-PK',
  'Tamil': 'ta-IN',
  'Telugu': 'te-IN',
  'Marathi': 'mr-IN',
  'Punjabi': 'pa-IN',
  'Gujarati': 'gu-IN',
  'Malayalam': 'ml-IN',
  'Kannada': 'kn-IN',
  'Persian': 'fa-IR',
  'Hebrew': 'he-IL',
  'Afrikaans': 'af-ZA',
  'Bulgarian': 'bg-BG',
  'Catalan': 'ca-ES',
  'Croatian': 'hr-HR',
  'Estonian': 'et-EE',
  'Filipino': 'fil-PH',
  'Icelandic': 'is-IS',
  'Latvian': 'lv-LV',
  'Lithuanian': 'lt-LT',
  'Romanian': 'ro-RO',
  'Serbian': 'sr-RS',
  'Slovak': 'sk-SK',
  'Slovenian': 'sl-SI',
  'Ukrainian': 'uk-UA',
  'Welsh': 'cy-GB'
};

// Get language code from language name
export const getLanguageCode = (languageName: string): string => {
  // First try exact match
  if (languageMap[languageName]) {
    return languageMap[languageName];
  }

  // Try case insensitive match
  const lowerLanguageName = languageName.toLowerCase();
  for (const [key, value] of Object.entries(languageMap)) {
    if (key.toLowerCase() === lowerLanguageName) {
      return value;
    }
  }

  // Try partial match
  for (const [key, value] of Object.entries(languageMap)) {
    if (key.toLowerCase().includes(lowerLanguageName)) {
      return value;
    }
  }

  // Default to English
  return 'en-US';
};

// Check if a language is supported by the browser
export const isLanguageSupported = (languageCode: string): boolean => {
  const voices = window.speechSynthesis.getVoices();
  return voices.some(voice => voice.lang === languageCode);
};

// Get the best available voice for a language
export const getBestVoice = (languageCode: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();

  // Try to find exact match
  let voice = voices.find(v => v.lang === languageCode);

  // If not found, try to find a voice that starts with the same language code
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith(languageCode.split('-')[0]));
  }

  // If still not found, return the first available voice
  return voice || voices[0] || null;
};

// Speak a single text segment
export const speakText = (text: string, language: string): void => {
  if (!window.speechSynthesis) {
    console.warn('Text-to-speech is not supported in this browser');
    return;
  }

  const languageCode = getLanguageCode(language);
  const utterance = new SpeechSynthesisUtterance(text);

  // Set language
  utterance.lang = languageCode;

  // Try to set voice
  const voice = getBestVoice(languageCode);
  if (voice) {
    utterance.voice = voice;
  }

  // Set speech parameters
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

// Speak all story parts
export const speakStory = (
  storyParts: StoryPart[],
  language: string,
  onPartStart?: (index: number) => void,
  onPartEnd?: (index: number) => void,
  onFinish?: () => void
): void => {
  console.log('speakStory called:', { storyPartsLength: storyParts.length, language });
  if (!window.speechSynthesis) {
    console.warn('Text-to-speech is not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const languageCode = getLanguageCode(language);
  const voice = getBestVoice(languageCode);

  // Create utterances for each story part
  const utterances = storyParts.map((part, index) => {
    const utterance = new SpeechSynthesisUtterance(part.text);
    utterance.lang = languageCode;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set event handlers
    utterance.onstart = () => {
      if (onPartStart) onPartStart(index);
    };

    utterance.onend = () => {
      if (onPartEnd) onPartEnd(index);

      // If this is the last part, call onFinish
      if (index === storyParts.length - 1) {
        if (onFinish) onFinish();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      if (onPartEnd) onPartEnd(index);
    };

    return utterance;
  });

  // Speak each utterance in sequence
  let currentIndex = 0;

  const speakNext = () => {
    if (currentIndex < utterances.length) {
      window.speechSynthesis.speak(utterances[currentIndex]);
    } else {
      // All parts finished
      if (onFinish) onFinish();
    }
  };

  // Set up utterances to trigger the next one
  utterances.forEach((utterance, index) => {
    utterance.onend = () => {
      if (onPartEnd) onPartEnd(index);
      
      // Move to next part
      currentIndex = index + 1;
      speakNext();
    };
  });

  // Speak the first utterance
  if (utterances.length > 0) {
    speakNext();
  } else {
    // No parts to speak, call onFinish immediately
    if (onFinish) onFinish();
  }
};

// Stop speaking
export const stopSpeaking = (): void => {
  console.log('stopSpeaking called');
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Pause speaking
export const pauseSpeaking = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
};

// Resume speaking
export const resumeSpeaking = (): void => {
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

// Check if speaking is in progress
export const isSpeaking = (): boolean => {
  return window.speechSynthesis ? window.speechSynthesis.speaking : false;
};

// Check if speaking is paused
export const isPaused = (): boolean => {
  return window.speechSynthesis ? window.speechSynthesis.paused : false;
};