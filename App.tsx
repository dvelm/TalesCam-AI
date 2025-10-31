import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { AppState, StoryItem, Command, StoryPart, StoryConfig, ConfigStep } from './types';
import CameraView, { CameraActions } from './components/CameraView';
import StoryView from './components/StoryView';
import CommandSidebar from './components/CommandSidebar';
import ConfigView from './components/ConfigView';
import ExportModal from './components/ExportModal';
import MicrophoneButton from './components/MicrophoneButton';
import { generateSegmentedStoryWithImages } from './services/aiService';
import { fileToBase64 } from './utils/imageUtils';
import { parseNumberFromString } from './utils/stringUtils';
import { languageMap, speakStory } from './services/ttsService';



const Toast: React.FC<{ message: string; show: boolean }> = ({ message, show }) => (
  <div
    className={`fixed bottom-20 left-1/2 -translate-x-1/2 transform rounded-full bg-base-300 px-6 py-3 text-content-100 shadow-lg transition-all duration-300 ${
      show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
    }`}
  >
    {message}
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [storyParts, setStoryParts] = useState<StoryPart[]>([]);
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({ subject: '', position: 'start', type: 'context', language: 'English', autoPlayAudio: true });
  const [configStep, setConfigStep] = useState<ConfigStep>(ConfigStep.SUBJECT);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [commandStatus, setCommandStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showUploadButton, setShowUploadButton] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraActionsRef = useRef<CameraActions>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionsGranted(true);
      } catch (err) {
        console.error("Permissions not granted:", err);
        setPermissionsGranted(false);
      }
    };
    checkPermissions();
  }, []);
  
  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  };
  
  const handleCapture = useCallback((imageDataUrl: string) => {
    // Debug log the image data URL
    console.log('Captured image data URL length:', imageDataUrl.length);
    console.log('Captured image data URL starts with:', imageDataUrl.substring(0, 100));

    // Validate that we have a proper data URL
    if (!imageDataUrl || imageDataUrl === 'data:,' || imageDataUrl.length < 100) {
      console.error('Invalid image data URL received in handleCapture:', imageDataUrl);
      // Show an error to the user
      showToast('Failed to capture image. Please try again.');
      return;
    }

    setCapturedImage(imageDataUrl);
    setStoryParts([]);
    setStoryTitle('');
    setStoryConfig({ subject: '', position: 'start', type: 'context', language: 'English', autoPlayAudio: true });
    setConfigStep(ConfigStep.SUBJECT);
    setAppState(AppState.CONFIG_VIEW);
    setShowUploadButton(false); // Hide upload button after capture

    // Scroll to position the first step a bit higher after a short delay to allow rendering
    setTimeout(() => {
      const contentWrapper = document.getElementById('story-content-wrapper');
      if (contentWrapper) {
        contentWrapper.scrollTo({ top: -60, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const handleGenerateStory = useCallback(async (config: StoryConfig) => {
    console.log('handleGenerateStory called with config:', config);
    if (!capturedImage) return;

    const finalConfig = {
        ...config,
        subject: config.subject || 'the main character in the scene',
    };

    setAppState(AppState.STORY_VIEW);
    setIsLoading(true);
    setStoryParts([]);

    try {
      showToast("Crafting your unique story...");
      const storyData = await generateSegmentedStoryWithImages(capturedImage, finalConfig);
      setStoryTitle(storyData.title);
      setStoryParts(storyData.storyParts);
      showToast("Your story is complete!");

      // Auto-play is now handled by the StoryView component
      console.log('Story generation completed, auto-play will be handled by StoryView component');
    } catch (error) {
      console.error('Error generating segmented story:', error);
      showToast('Error generating story.');
      setStoryTitle('');
      setStoryParts([{ text: 'Sorry, I couldn\'t think of a story for this image.', image: null }]);
    } finally {
      setIsLoading(false);
    }
  }, [capturedImage]);
  
  
    const nextStep = useCallback(() => {
        setConfigStep(prev => {
            if (prev >= ConfigStep.CONFIRM) return ConfigStep.CONFIRM;
            return prev + 1;
        });
    }, []);

    const prevStep = useCallback(() => {
        setConfigStep(prev => {
            if (prev <= ConfigStep.SUBJECT) return ConfigStep.SUBJECT;
            return prev - 1;
        });
    }, []);

  const commands = useMemo<Command[]>(() => {
    const baseCommands: Command[] = [
        { command: ['home', 'start over', 'main screen'], callback: () => {
            setAppState(AppState.HOME);
            setCapturedImage(null);
            setStoryParts([]);
            setShowUploadButton(true);
        } },
        { command: ['upload', 'upload image'], callback: () => {
            // Show toast message instead of directly triggering file input
            // due to browser security restrictions on programmatic file dialog opening
            showToast('Please click the Upload Image button to select a file.');
        } },
    ];

    if (appState === AppState.CAMERA_VIEW) {
        return [
            ...baseCommands,
            { command: ['photo', 'take a photo', 'capture', 'snap'], callback: () => {
                cameraActionsRef.current?.takePicture();
            } },
            { command: 'photo * seconds', callback: (secondsStr: string) => {
                const numSec = parseNumberFromString(secondsStr);
                if(numSec && numSec > 0 && numSec < 11) {
                    cameraActionsRef.current?.startCountdown(numSec);
                } else {
                    showToast("Please say a number between 1 and 10.");
                }
            }},
            { command: 'photo *', callback: (secondsStr: string) => {
                // Handle "photo 3 seconds" format
                const cleanStr = secondsStr.toLowerCase().replace('seconds', '').trim();
                const numSec = parseNumberFromString(cleanStr);
                if(numSec && numSec > 0 && numSec < 11) {
                    cameraActionsRef.current?.startCountdown(numSec);
                } else {
                    showToast("Please say a number between 1 and 10.");
                }
            }},
            { command: 'back', callback: () => {
                setAppState(AppState.HOME);
                setCapturedImage(null);
                setStoryParts([]);
                setShowUploadButton(true);
            }},
        ];
    }
    
    if (appState === AppState.CONFIG_VIEW) {
        const configCommands: Command[] = [
            ...baseCommands,
            { command: 'back', callback: () => {
                // If in main character section, back should return to camera view
                if (configStep === ConfigStep.SUBJECT) {
                    setAppState(AppState.CAMERA_VIEW);
                    setShowUploadButton(false);
                    showToast("Returned to camera.");
                } else {
                    // Otherwise, go to previous step
                    prevStep();
                }
            }},
            { command: 'next', callback: () => {
                nextStep();
            }},
            { command: 'skip', callback: () => {
                // If in main character step and no subject is set, behave like "auto"
                if (configStep === ConfigStep.SUBJECT && !storyConfig.subject) {
                    // Generate random main character (same logic as auto command)
                    const randomCharacters = [
                        'a brave knight',
                        'a curious explorer',
                        'a clever detective',
                        'a magical wizard',
                        'a fearless pirate',
                        'a wise owl',
                        'a playful monkey',
                        'a mysterious stranger',
                        'a talented musician',
                        'a skilled artist',
                        'an adventurous child',
                        'a friendly robot',
                        'a graceful dancer',
                        'a cunning fox',
                        'a loyal dog',
                        'a wise old turtle',
                        'a mischievous cat',
                        'a gentle giant',
                        'a clever inventor',
                        'a brave firefighter'
                    ];
                    const randomCharacter = randomCharacters[Math.floor(Math.random() * randomCharacters.length)];
                    setStoryConfig(prev => ({...prev, subject: randomCharacter}));
                    showToast(`Subject set to "${randomCharacter}"`);
                    nextStep();
                } else {
                    nextStep();
                }
            }},
            { command: ['reset', 'raised'], callback: () => {
                // Reset command should return to camera view, not home
                setAppState(AppState.CAMERA_VIEW);
                setStoryConfig({ subject: '', position: 'start', type: 'context', language: 'English', autoPlayAudio: true });
                setConfigStep(ConfigStep.SUBJECT);
                setShowUploadButton(false);
                showToast("Returned to camera. Configuration reset.");
            }},
            { command: ['retry', 're try', 'retrie', 'try again', 'regenerate'], callback: () => {
                // Retry command should reset all options to default and return to first option (main character)
                setStoryConfig({ subject: '', position: 'start', type: 'context', language: 'English', autoPlayAudio: true });
                setConfigStep(ConfigStep.SUBJECT);
                setAppState(AppState.CONFIG_VIEW);
                setShowUploadButton(false);
                showToast("Configuration reset. Returned to main character option.");
            }},
            { command: 'auto', callback: () => {
                let autoSetMessage = '';
                switch(configStep) {
                    case ConfigStep.SUBJECT:
                        // Generate random main character
                        const randomCharacters = [
                            'a brave knight',
                            'a curious explorer',
                            'a clever detective',
                            'a magical wizard',
                            'a fearless pirate',
                            'a wise owl',
                            'a playful monkey',
                            'a mysterious stranger',
                            'a talented musician',
                            'a skilled artist',
                            'an adventurous child',
                            'a friendly robot',
                            'a graceful dancer',
                            'a cunning fox',
                            'a loyal dog',
                            'a wise old turtle',
                            'a mischievous cat',
                            'a gentle giant',
                            'a clever inventor',
                            'a brave firefighter'
                        ];
                        const randomCharacter = randomCharacters[Math.floor(Math.random() * randomCharacters.length)];
                        setStoryConfig(prev => ({...prev, subject: randomCharacter}));
                        autoSetMessage = `Subject set to "${randomCharacter}"`;
                        break;
                    case ConfigStep.POSITION:
                        setStoryConfig(prev => ({...prev, position: 'start'}));
                        autoSetMessage = 'Placement set to "start"';
                        break;
                    case ConfigStep.TYPE:
                        setStoryConfig(prev => ({...prev, type: 'context', contextStyle: undefined, customPrompt: undefined}));
                        autoSetMessage = 'Type set to "based on image"';
                        break;
                    case ConfigStep.LANGUAGE:
                        setStoryConfig(prev => ({...prev, language: 'English'}));
                        autoSetMessage = 'Language set to "English"';
                        break;
                    default:
                        // Check if user wants to toggle auto-play
                        if (configStep === ConfigStep.CONFIRM) {
                            setStoryConfig(prev => ({...prev, autoPlayAudio: !prev.autoPlayAudio}));
                            autoSetMessage = `Auto-play ${!storyConfig.autoPlayAudio ? 'enabled' : 'disabled'}`;
                        } else {
                            autoSetMessage = "Moving to next step.";
                        }
                        break;
                }
                showToast(autoSetMessage);
                nextStep();
            }},
            { command: ['check', 'enable'], callback: () => {
                if (configStep === ConfigStep.CONFIRM) {
                    setStoryConfig(prev => ({...prev, autoPlayAudio: true}));
                    showToast("Auto-read aloud enabled");
                } else {
                    showToast("Auto-read option is only available in the final step");
                }
            }},
            { command: ['uncheck', 'disable'], callback: () => {
                if (configStep === ConfigStep.CONFIRM) {
                    setStoryConfig(prev => ({...prev, autoPlayAudio: false}));
                    showToast("Auto-read aloud disabled");
                } else {
                    showToast("Auto-read option is only available in the final step");
                }
            }},
            { command: ['generate', 'confirm'], callback: () => {
                if(configStep === ConfigStep.CONFIRM) {
                    handleGenerateStory(storyConfig);
                } else {
                    showToast("Please complete all steps first.");
                }
            }},
        ];

        switch (configStep) {
            case ConfigStep.SUBJECT:
                configCommands.push({
                    command: '*',
                    callback: (subject: string) => {
                        // Filter out commands that shouldn't be treated as subject input
                        const trimmedSubject = subject.trim().toLowerCase();
                        const forbiddenSubjects = ['photo', 'take a photo', 'capture', 'snap', 'back', 'next', 'skip', 'reset', 'raised', 'retry', 're try', 'retrie', 'try again', 'regenerate', 'auto', 'check', 'enable', 'uncheck', 'disable', 'generate', 'confirm', 'upload', 'upload image', 'beginning', 'start', 'middle', 'end', 'and'];

                        if (forbiddenSubjects.includes(trimmedSubject)) {
                            // Don't process forbidden subjects, just show a message
                            showToast(`"${subject}" is a command, not a character name.`);
                            return;
                        }

                        setStoryConfig(prev => ({ ...prev, subject }));
                        nextStep();
                    }
                });
                break;
            case ConfigStep.POSITION:
                configCommands.push({ command: ['beginning', 'start'], callback: () => { setStoryConfig(prev => ({ ...prev, position: 'start' })); nextStep(); } });
                configCommands.push({ command: 'middle', callback: () => { setStoryConfig(prev => ({ ...prev, position: 'middle' })); nextStep(); } });
                configCommands.push({ command: ['end', 'and'], callback: () => { setStoryConfig(prev => ({ ...prev, position: 'end' })); nextStep(); } });
                break;
            case ConfigStep.TYPE:
                configCommands.push({
                    command: '*',
                    callback: (text: string) => {
                        const trimmedText = text.trim();
                        if (!trimmedText) return; // Ignore empty commands

                        // Filter out commands that shouldn't be treated as story type input
                        const forbiddenTypes = ['photo', 'take a photo', 'capture', 'snap', 'back', 'next', 'skip', 'reset', 'raised', 'retry', 're try', 'retrie', 'try again', 'regenerate', 'auto', 'check', 'enable', 'uncheck', 'disable', 'generate', 'confirm', 'upload', 'upload image', 'beginning', 'start', 'middle', 'end', 'and'];

                        const normalizedText = trimmedText.toLowerCase();
                        if (forbiddenTypes.includes(normalizedText)) {
                            // Don't process forbidden types, just show a message
                            showToast(`"${trimmedText}" is a command, not a story type.`);
                            return;
                        }

                        const words = trimmedText.split(/\s+/);
                        // If 3 words or less, treat as a style. Otherwise, a custom prompt.
                        if (words.length <= 3) {
                            setStoryConfig(prev => ({ ...prev, type: 'context', contextStyle: trimmedText, customPrompt: undefined }));
                            showToast(`Style set to: "${trimmedText}"`);
                        } else {
                            setStoryConfig(prev => ({ ...prev, type: 'custom', customPrompt: trimmedText, contextStyle: undefined }));
                            showToast(`Custom story set.`);
                        }
                        nextStep();
                    }
                });
                break;
            case ConfigStep.LANGUAGE:
                configCommands.push({ command: '*', callback: (lang: string) => {
                    // Only accept supported languages with exact match (case insensitive)
                    const supportedLanguages = Object.keys(languageMap);
                    const normalizedLang = lang.trim();
                    let matchedLanguage = null;

                    // Find the exact matching supported language
                    for (const supportedLang of supportedLanguages) {
                        if (supportedLang.toLowerCase() === normalizedLang.toLowerCase()) {
                            matchedLanguage = supportedLang;
                            break;
                        }
                    }

                    if (matchedLanguage) {
                        setStoryConfig(prev => ({ ...prev, language: matchedLanguage }));
                        nextStep();
                    } else {
                        // Throw error to make microphone appear red
                        throw new Error(`Language "${normalizedLang}" is not supported. Please try another language.`);
                    }
                }});
                break;
        }
        return configCommands;
    }
    
    if (appState === AppState.STORY_VIEW && capturedImage) {
        return [
            ...baseCommands,
            { command: ['retry', 're try', 'retrie', 'try again', 'regenerate'], callback: () => {
                // Retry command should reset all options to default and return to first option (main character)
                setStoryConfig({ subject: '', position: 'start', type: 'context', language: 'English', autoPlayAudio: true });
                setConfigStep(ConfigStep.SUBJECT);
                setAppState(AppState.CONFIG_VIEW);
                setShowUploadButton(false);
                showToast("Configuration reset. Returned to main character option.");
            }},
            { command: ['export', 'export story'], callback: () => {
                setIsExportModalOpen(true);
            }},
        ];
    }

    // Default commands for HOME and other states
    return [
        ...baseCommands,
        { command: ['photo', 'take a photo'], callback: () => {
            setShowUploadButton(false);
            setAppState(AppState.CAMERA_VIEW);
        } },
    ];

  }, [appState, handleGenerateStory, capturedImage, storyConfig, configStep, nextStep, prevStep]);


  const { listening, transcript, startListening, stopListening, browserSupportsSpeechRecognition } = useVoiceCommands(
    commands,
    () => setIsProcessing(true),
    () => setIsProcessing(false)
  );

  
  useEffect(() => {
    if (transcript.startsWith('✔')) {
      setCommandStatus('success');
    } else if (transcript.startsWith('?')) {
      setCommandStatus('error');
    } else {
      setCommandStatus('idle');
    }
  }, [transcript]);

  // Manage upload button visibility
  useEffect(() => {
    if (appState === AppState.HOME || appState === AppState.CAMERA_VIEW) {
      // Show upload button in home and camera views
      setShowUploadButton(true);
    }
  }, [appState]);


  useEffect(() => {
    // This effect should only run once to initialize listening.
    if (permissionsGranted && isInitialMount.current) {
      startListening();
      isInitialMount.current = false;
    }
  }, [permissionsGranted, startListening]);

  useEffect(() => {
    const setupAudioContext = async () => {
        if (listening) {
            try {
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = audioContext;
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;
                const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
                sourceRef.current = source;
                source.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const draw = () => {
                    if (!analyserRef.current) return;
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
                    setMicVolume(avg / 128);
                    animationFrameId.current = requestAnimationFrame(draw);
                };
                draw();
            } catch (err) {
                console.error("Error setting up audio context for visualization:", err);
            }
        } else {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setMicVolume(0);
        }
    };

    setupAudioContext();

    return () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, [listening]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          showToast('Please select an image file.');
          return;
        }

        // Check file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showToast('File size too large. Please select an image under 5MB.');
          return;
        }

        const base64 = await fileToBase64(file);
        // Debug log the base64 data
        console.log('Uploaded file base64 length:', base64.length);
        console.log('Uploaded file base64 starts with:', base64.substring(0, 100));
        handleCapture(base64);
      } catch (error) {
        console.error('Error processing file:', error);
        showToast('Error processing image file.');
      }
    }
    // Reset the file input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.CAMERA_VIEW:
        return <CameraView onCapture={handleCapture} ref={cameraActionsRef} />;
      case AppState.CONFIG_VIEW:
        return <ConfigView
                    image={capturedImage!}
                    config={storyConfig}
                    onGenerate={() => handleGenerateStory(storyConfig)}
                    onConfigChange={setStoryConfig}
                    currentStep={configStep}
                />;
      case AppState.STORY_VIEW:
        return <StoryView userImage={capturedImage} storyParts={storyParts} storyTitle={storyTitle} isLoading={isLoading} onExport={() => setIsExportModalOpen(true)} language={storyConfig.language} autoPlayAudio={storyConfig.autoPlayAudio} isExporting={isExporting} />;
      case AppState.HOME:
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h1 className="text-5xl md:text-7xl font-bold text-content-100 animate-fadeIn font-display">TalesCam AI</h1>
            <p className="mt-4 text-lg md:text-xl text-content-200 animate-fadeIn [animation-delay:0.2s] max-w-2xl mx-auto">
              Welcome to your personal, voice-powered storyteller. Turn your photos into unique tales with companion images, all without touching the keyboard.
            </p>
            <div className="mt-4 text-left text-content-200 space-y-4 max-w-xl mx-auto animate-fadeIn [animation-delay:0.4s]">
              <p className="font-bold text-center">Here's how it works:</p>
              <ul className="list-disc list-inside space-y-2">
                  <li><strong>Capture the Moment:</strong> Say <span className="text-brand-light font-semibold">"Photo"</span> to open the camera, or <span className="text-brand-light font-semibold">"Upload"</span> to choose a photo from your device.</li>
                  <li><strong>Customize Your Tale:</strong> Use your voice to describe the main character, where the photo fits in the story (start, middle, or end), and the narrative style.</li>
                  <li><strong>Watch the Magic:</strong> Our AI generates a multi-part story complete with unique, style-matched images for each paragraph.</li>
                  <li><strong>Export Your Story:</strong> Say <span className="text-brand-light font-semibold">"Export story"</span> to download it as an image or HTML file.</li>
              </ul>
            </div>
            <p className="mt-4 text-lg text-brand-light animate-fadeIn [animation-delay:0.6s]">
              Your voice is the shutter. Say <span className="font-bold">"Photo"</span> to begin.
            </p>
          </div>
        );
    }
  };
  
  if (!browserSupportsSpeechRecognition) {
    return <div className="flex items-center justify-center h-screen text-content-100">Your browser does not support voice commands. Please use a Chromium-based browser.</div>;
  }
  
  if (!permissionsGranted) {
    return <div className="flex items-center justify-center h-screen text-content-100 p-4 text-center">Please grant microphone and camera permissions to use TalesCam AI. You might need to refresh the page.</div>
  }

  const micButtonColor = {
    idle: 'bg-brand-primary hover:bg-brand-dark',
    success: 'bg-green-500 hover:bg-green-600',
    error: 'bg-red-500 hover:bg-red-600',
  }[commandStatus];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-black via-[#000033] to-black text-content-100 flex flex-col overflow-hidden animate-fadeIn" style={{ backgroundSize: '150% 150%', animation: 'backgroundMove 15s ease infinite' }}>
        <div className="flex flex-grow overflow-hidden">
            <main id="story-content-wrapper" className="flex-grow overflow-y-auto relative">
                {renderContent()}
            </main>
            <CommandSidebar />
        </div>
      <footer className="w-full flex flex-col items-center justify-center py-2 bg-transparent flex-shrink-0">
        <div className="footer-container flex items-center w-full px-4 relative" style={{ minHeight: '70px' }}>
          <div className="upload-container absolute left-40">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`upload-button flex items-center justify-center gap-2 px-5 py-4 rounded-full border-none bg-gradient-to-br from-blue-500 to-indigo-600 cursor-pointer z-10 transition-all duration-300 ${showUploadButton && (appState === AppState.HOME || appState === AppState.CAMERA_VIEW) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} transition-transform duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30`}
              aria-label="Upload image"
            >
            <svg
              className="upload-icon w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 15L7 10H11V6H13V10H17L12 15ZM6 18C5.45 18 4.979 17.804 4.587 17.412C4.195 17.02 3.99934 16.5493 4 16V6C4 5.45 4.196 4.979 4.588 4.587C4.98 4.195 5.45067 3.99934 6 4H14L20 10V16C20 16.55 19.804 17.021 19.412 17.413C19.02 17.805 18.5493 18.0007 18 18H6Z"
                fill="white"
              />
            </svg>
            <span className="text-white font-medium text-sm">Upload</span>
          </button>
        </div>
          <div className="microphone-section flex items-center absolute left-1/2 transform -translate-x-1/2 z-0" style={{ zIndex: 0, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="microphone-button-wrapper">
              <MicrophoneButton
                listening={listening}
                volume={micVolume}
                onStartListening={startListening}
                onStopListening={stopListening}
                commandStatus={commandStatus}
              />
            </div>
            <div className={`ml-4 text-sm text-content-200 h-5 transition-all duration-300 ${transcript ? 'text-brand-light font-semibold animate-textGlow' : ''}`}>
              {isProcessing ? (
                <div className="flex flex-col">
                  <span className="flex items-center">
                    <span className="flex space-x-1">
                      <span className="h-2 w-2 bg-brand-light rounded-full animate-bounce [animation-delay:0ms]"></span>
                      <span className="h-2 w-2 bg-brand-light rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="h-2 w-2 bg-brand-light rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </span>
                    <span className="ml-2">Processing...</span>
                  </span>
                  {transcript && transcript !== 'Listening...' && (
                    <span className="text-xs text-content-200 mt-1">{transcript}</span>
                  )}
                </div>
              ) : transcript && transcript !== 'Listening...' ? transcript : 'Listening...'}
            </div>
          </div>
          <div className="w-8"></div> {/* Spacer to balance layout */}
        </div>
      </footer>
      <Toast message={toast.message} show={toast.show} />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ position: 'absolute', top: '-1000px', left: '-1000px', width: '1px', height: '1px' }} />
      {isExportModalOpen && capturedImage && (
        <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            userImage={capturedImage}
            storyParts={storyParts}
            storyTitle={storyTitle}
            onExportStart={() => setIsExporting(true)}
            onExportEnd={() => setIsExporting(false)}
        />
      )}
    </div>
  );
};

export default App;
