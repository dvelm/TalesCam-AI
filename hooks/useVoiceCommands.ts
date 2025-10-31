import { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from '../types';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const levenshtein = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

// Predefined phonetically similar words mapping to avoid expensive Levenshtein calculations
// These mappings are based on how words sound when spoken, not how they're spelled
const phoneticSimilarWordsMap: { [key: string]: string[] } = {
    // Camera commands
    'photo': ['photo', 'foto', 'shot', 'pot', 'plot', 'pro', 'show', 'goes', 'those', 'close', 'flows'],
    'take a photo': ['take a photo', 'fake a photo', 'make a photo', 'cake a photo', 'bake a photo'],
    'capture': ['capture', 'captor', 'rapture', 'chapter', 'cap tour', 'trap door', 'trap tour'],
    'snap': ['snap', 'snapped', 'snapchat', 'clap', 'slap', 'trap', 'map', 'cap', 'lap', 'gap'],

    // Navigation commands
    'home': ['home', 'hole', 'hose', 'hold', 'hope', 'cope', 'cope', 'know', 'flow', 'slow'],
    'main screen': ['main screen', 'man screen', 'men screen', 'mine screen', 'mean screen'],
    'start over': ['start over', 'starp over', 'start hover', 'heart cover', 'cart rover'],
    'back': ['back', 'pack', 'track', 'hack', 'crack', 'stack', 'lack', 'sack', 'tack'],
    'next': ['next', 'text', 'flex', 'tests', 'best', 'rest', 'gets', 'wrecks', 'decks'],
    'skip': ['skip', 'ship', 'slip', 'grip', 'trip', 'flip', 'nip', 'lip', 'zip', 'rip'],

    // Configuration commands
    'auto': ['auto', 'otto', 'out to', 'out two', 'ought to', 'ocho'],
    'reset': ['reset', 're-set', 're set', 'preset', 'regret', 're bet', 're get'],
    'raised': ['raised', 'rased', 'rays', 'raise', 'raze', 'rase', 'rease', 'race', 're set'],
    'retry': ['retry', 're try', 're try', 're tie', 're cry'],
    'try again': ['try again', 'cry again', 'tie again', 'fly again', 'die again', 'lie again'],

    // Audio commands
    'check': ['check', 'tech', 'deck', 'neck', 'beck', 'peck', 'reck', 'wreck', 'sec', 'shek'],
    'enable': ['enable', 'in able', 'in cable', 'unstable', 'in table', 'in label'],
    'uncheck': ['uncheck', 'un tech', 'on check', 'un deck', 'an check', 'on tech'],
    'disable': ['disable', 'dis able', 'dis cable', 'this able', 'dis table'],

    // Action commands
    'generate': ['generate', 'general late', 'general gate', 'gen a rate', 'general eight'],
    'confirm': ['confirm', 'con firm', 'con form', 'con farm', 'can form', 'con fern'],
    'save story': ['save story', 'safe story', 'save glory', 'safe glory', 'have story'],
    'download': ['download', 'down load', 'dawn load', 'don load', 'on load'],


    // Upload commands
    'upload': ['upload', 'up load', 'up road', 'a prod', 'up broad'],
    'upload image': ['upload image', 'up load image', 'upload im age', 'upload imige'],

    // Story position commands
    'beginning': ['beginning', 'begin in', 'begin then', 'beginning', 'begining'],
    'start': ['start', 'starp', 'heart', 'cart', 'part', 'mart'],
    'middle': ['middle', 'muddle', 'meddle', 'riddle', 'fiddle', 'piddle'],
    'end': ['end', 'and', 'and', 'land', 'hand', 'band', 'stand', 'sand'],
    'and': ['and', 'end', 'land', 'hand', 'band', 'stand', 'sand'],
};

// Simple phonetic matching function - checks if two words might sound similar
const soundsSimilar = (word1: string, word2: string): boolean => {
    // Exact match
    if (word1 === word2) return true;

    // Check phonetic similar words map
    if (phoneticSimilarWordsMap[word1] && phoneticSimilarWordsMap[word1].includes(word2)) return true;

    // Check if word1 is in any phonetic similar words list where word2 is the key
    const mainCommand1 = Object.keys(phoneticSimilarWordsMap).find(key =>
        phoneticSimilarWordsMap[key].some(word => word === word1)
    );

    if (mainCommand1 && phoneticSimilarWordsMap[mainCommand1] &&
        phoneticSimilarWordsMap[mainCommand1].includes(word2)) return true;

    // Check if word2 is in any phonetic similar words list where word1 is the key
    const mainCommand2 = Object.keys(phoneticSimilarWordsMap).find(key =>
        phoneticSimilarWordsMap[key].some(word => word === word2)
    );

    if (mainCommand2 && phoneticSimilarWordsMap[mainCommand2] &&
        phoneticSimilarWordsMap[mainCommand2].includes(word1)) return true;

    return false;
};

const findBestMatch = (commands: Command[], transcript: string) => {
    console.log('Finding best match for transcript:', transcript);
    console.log('Available commands:', commands);

    // Handle duplicate word issue (e.g., "photo photo" -> "photo")
    let processedTranscript = transcript.toLowerCase().trim();
    const words = processedTranscript.split(' ');
    if (words.length === 2 && words[0] === words[1]) {
        // If we have two identical words, use just one
        processedTranscript = words[0];
        console.log('Detected duplicate word in findBestMatch, using:', processedTranscript);
    }

    let bestMatch = { score: 0, callback: null as ((...args: any[]) => void) | null, args: [] as any[] };
    const threshold = 0.7;
    const lowerTranscript = processedTranscript;

    for (const { command, callback } of commands) {
        const phrases = Array.isArray(command) ? command : [command];
        for (const phrase of phrases) {
            const lowerPhrase = phrase.toLowerCase();

            if (lowerPhrase === '*') {
                // For wildcard commands, we want to be more selective
                // Only match if no other specific command has matched with a reasonable score
                // Also check if the transcript matches any forbidden words for config steps
                const score = bestMatch.score > 0.5 ? 0.1 : 0.81; // Very low score if specific commands matched, normal score otherwise
                if (score > bestMatch.score) {
                    bestMatch = { score, callback, args: [transcript] };
                }
            } else if (lowerPhrase.endsWith('*')) {
                const prefix = lowerPhrase.slice(0, -1).trim();
                if (lowerTranscript.startsWith(prefix)) {
                    const arg = transcript.substring(prefix.length).trim();
                    if (arg) {
                        const score = 0.9 + prefix.length / 100;
                        if (score > bestMatch.score) {
                            bestMatch = { score, callback, args: [arg] };
                        }
                    }
                }
            } else if (lowerPhrase.startsWith('*')) {
                const suffix = lowerPhrase.slice(1).trim();
                const words = lowerTranscript.split(' ');
                const lastWord = words[words.length - 1];

                let isMatch = lowerTranscript.endsWith(suffix);

                // Special fast matching for common words using predefined phonetic mappings
                if (!isMatch) {
                    // Check if the transcript matches any predefined phonetic similar words for this phrase
                    const mainCommand = Object.keys(phoneticSimilarWordsMap).find(key =>
                        phoneticSimilarWordsMap[key].some(word => word === lowerPhrase)
                    );

                    if (mainCommand && phoneticSimilarWordsMap[mainCommand]) {
                        isMatch = phoneticSimilarWordsMap[mainCommand].some(word =>
                            soundsSimilar(word, lowerTranscript)
                        );
                    }
                }

                if (isMatch) {
                    const arg = transcript.substring(0, lowerTranscript.lastIndexOf(lastWord)).trim();
                    const score = 0.9 + suffix.length / 100;
                    if (score > bestMatch.score) {
                        bestMatch = { score, callback, args: [arg] };
                    }
                }
            } else {
                // Exact match check first for better accuracy
                if (lowerTranscript === lowerPhrase) {
                    const score = 1.0; // Perfect match
                    if (score > bestMatch.score) {
                        bestMatch = { score, callback, args: [] };
                    }
                } else {
                    // Fast phonetic matching using predefined similar words mapping
                    let isMatch = false;

                    // Check if the phrase has predefined phonetic similar words
                    if (phoneticSimilarWordsMap[lowerPhrase]) {
                        isMatch = phoneticSimilarWordsMap[lowerPhrase].some(word =>
                            soundsSimilar(word, lowerTranscript)
                        );
                    }

                    // If no predefined mapping, check if this phrase is in any phonetic similar words list
                    if (!isMatch) {
                        const mainCommand = Object.keys(phoneticSimilarWordsMap).find(key =>
                            phoneticSimilarWordsMap[key].some(word => word === lowerPhrase)
                        );

                        if (mainCommand && phoneticSimilarWordsMap[mainCommand]) {
                            isMatch = soundsSimilar(phoneticSimilarWordsMap[mainCommand][0], lowerTranscript);
                        }
                    }

                    if (isMatch) {
                        // Calculate a score based on how close the match is
                        const baseScore = 0.8; // High score for predefined phonetic matches
                        const lengthDiff = Math.abs(lowerTranscript.length - lowerPhrase.length);
                        const score = baseScore - (lengthDiff * 0.05); // Slight penalty for length differences

                        if (score > bestMatch.score) {
                            bestMatch = { score, callback, args: [] };
                        }
                    } else {
                        // Fallback to Levenshtein distance for cases not covered by predefined mappings
                        const distance = levenshtein(lowerTranscript, lowerPhrase);
                        const score = 1 - distance / Math.max(lowerTranscript.length, lowerPhrase.length);
                        console.log(`Comparing "${lowerTranscript}" with "${lowerPhrase}", distance: ${distance}, score: ${score}`);
                        if (score > bestMatch.score) {
                            bestMatch = { score, callback, args: [] };
                        }
                    }
                }
            }
        }
    }

    console.log('Best match result:', bestMatch);
    console.log('Threshold check:', bestMatch.score >= threshold && bestMatch.callback);

    if (bestMatch.score >= threshold && bestMatch.callback) {
        return bestMatch;
    }
    return null;
};


export const useVoiceCommands = (commands: Command[], onProcessingStart?: () => void, onProcessingEnd?: () => void) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('Listening...');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const commandFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNetworkErrorRef = useRef(false);
  const isAbortedErrorRef = useRef(false);

  const listeningRef = useRef(false);
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const resetTranscriptToListening = useCallback(() => {
    if (listeningRef.current) {
        setTranscript('Listening...');
    } else {
        setTranscript('Mic is off.');
    }
  }, []);

  
  const setSharedListeningState = useCallback((isListening: boolean) => {
    listeningRef.current = isListening;
    setListening(isListening);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && listeningRef.current) {
      if (commandFeedbackTimer.current) clearTimeout(commandFeedbackTimer.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      setSharedListeningState(false);
      recognitionRef.current.stop();
    }
  }, [setSharedListeningState]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !listeningRef.current) {
      if (commandFeedbackTimer.current) clearTimeout(commandFeedbackTimer.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognitionRef.current.start();
        setSharedListeningState(true);
        setTranscript('Listening...');
      } catch (e) {
         console.error("Speech recognition error on start:", e);
         setSharedListeningState(false);
      }
    }
  }, [setSharedListeningState]);
  
  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported by this browser.");
      setTranscript("Voice commands not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Manually restart for better stability
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    
    recognition.onresult = (event) => {
      if (commandFeedbackTimer.current) clearTimeout(commandFeedbackTimer.current);
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const displayTranscript = interimTranscript || finalTranscript;
      setTranscript(displayTranscript);

      if (finalTranscript) {
        // Call onProcessingStart when we have a final transcript
        if (onProcessingStart) {
          onProcessingStart();
        }

        const trimmedTranscript = finalTranscript.trim();
        const cleanedTranscript = trimmedTranscript.toLowerCase().replace(/[.,?\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        const match = findBestMatch(commandsRef.current, cleanedTranscript);

        if (match) {
          try {
            match.callback(...match.args);
            setTranscript(`✔ ${trimmedTranscript}`);
          } catch (error) {
            console.error('Error executing voice command:', error);
            setTranscript(`✗ Error: ${trimmedTranscript}`);
          }
        } else {
          setTranscript(`? ${trimmedTranscript}`);
        }
        commandFeedbackTimer.current = setTimeout(() => {
          resetTranscriptToListening();
          // Call onProcessingEnd when processing is done
          if (onProcessingEnd) {
            onProcessingEnd();
          }
        }, 2000);
      }
    };
    
    recognition.onerror = (event: any) => {
      // Don't log 'aborted' or 'no-speech'. These are common and are handled gracefully by `onend`.
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'aborted') {
        isAbortedErrorRef.current = true;
        return;
      }

      console.error('Speech recognition error:', event.error, event.message);

      if (event.error === 'network') {
        isNetworkErrorRef.current = true;
        setTranscript("Network issue. Retrying...");
        return;
      }

      if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        setTranscript("Mic permission error. Stopping.");
        stopListening();
      } else {
        setTranscript(`Mic error: ${event.error}.`);
      }
    };

    recognition.onend = () => {
      // Only restart if listening is supposed to be active.
      if (!listeningRef.current) {
        setTranscript('Mic is off.');
        return;
      }

      let restartDelay = 250; // A more robust delay for normal cases like 'no-speech'.

      if (isNetworkErrorRef.current) {
        restartDelay = 2500; // Longer delay for network issues.
        isNetworkErrorRef.current = false; // Reset flag after use
      } else if (isAbortedErrorRef.current) {
        restartDelay = 500; // A small delay for browser-initiated aborts.
        isAbortedErrorRef.current = false; // Reset flag after use
      }

      restartTimerRef.current = setTimeout(() => {
        // Double-check as stopListening could have been called during the delay.
        if (listeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error("Failed to restart recognition in onend loop:", e);
            setSharedListeningState(false);
            setTranscript('Mic failed to restart.');
          }
        }
      }, restartDelay);
    };

    return () => {
      if(recognitionRef.current){
        if (commandFeedbackTimer.current) clearTimeout(commandFeedbackTimer.current);
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        listeningRef.current = false;
        recognitionRef.current.onend = null; // Prevent onend from firing after component unmount
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [resetTranscriptToListening, setSharedListeningState, stopListening]);

  return {
    listening,
    transcript,
    startListening,
    stopListening,
    browserSupportsSpeechRecognition: !!SpeechRecognition,
  };
};