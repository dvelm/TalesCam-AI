
import React, { useState, useEffect, useRef } from 'react';
import { StoryPart } from '../types';
import { speakStory, stopSpeaking } from '../services/ttsService';

interface StoryViewProps {
  userImage: string | null;
  storyParts: StoryPart[];
  storyTitle: string;
  isLoading: boolean;
  onExport: () => void;
  language?: string; // Add language prop
  autoPlayAudio?: boolean; // Add auto-play prop
  isExporting?: boolean; // Add export state prop
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-t-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-content-200">Generating your tale...</p>
    </div>
);

const StoryView: React.FC<StoryViewProps> = ({ userImage, storyParts, storyTitle, isLoading, onExport, language = 'English', autoPlayAudio = false, isExporting = false }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingPartIndex, setCurrentlySpeakingPartIndex] = useState<number | null>(null);
  const partRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasAutoPlayed = useRef(false);

  const hasStory = storyParts.length > 0 && storyParts[0]?.text !== 'Sorry, I couldn\'t think of a story for this image.';

  useEffect(() => {
    partRefs.current = partRefs.current.slice(0, storyParts.length);
    // Reset auto-play flag when story changes
    hasAutoPlayed.current = false;
  }, [storyParts]);

  
  useEffect(() => {
    if (currentlySpeakingPartIndex !== null && partRefs.current[currentlySpeakingPartIndex]) {
        partRefs.current[currentlySpeakingPartIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
}, [currentlySpeakingPartIndex]);

  // Auto-play story when story is loaded and autoPlayAudio is true
  useEffect(() => {
    if (autoPlayAudio && storyParts.length > 0 && !isSpeaking && !hasAutoPlayed.current) {
      // Mark as auto-played to prevent re-triggering
      hasAutoPlayed.current = true;
      
      // Small delay to ensure UI is fully rendered before starting speech
      const timer = setTimeout(() => {
        handleStartSpeech();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoPlayAudio, storyParts, isSpeaking]);

  // Text-to-speech functions
  const handleStartSpeech = () => {
    if (storyParts.length > 0) {
      setIsSpeaking(true);
      setCurrentlySpeakingPartIndex(0);

      speakStory(
        storyParts,
        language,
        (index) => {
          setCurrentlySpeakingPartIndex(index);
        },
        (index) => {
          // Part ended
        },
        () => {
          // All parts finished
          setIsSpeaking(false);
          setCurrentlySpeakingPartIndex(null);
        }
      );
    }
  };

  const handleStopSpeech = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setCurrentlySpeakingPartIndex(null);
  };

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      handleStopSpeech();
    } else {
      handleStartSpeech();
    }
  };

  if (isLoading && storyParts.length === 0) {
    return (
        <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
        </div>
    );
  }

  if (!userImage) {
    return <div className="p-4 text-center">No image captured.</div>;
  }

  return (
    <>
    <style>
        {`
            @media print {
                html, body, #root, #story-content-wrapper {
                    height: auto !important;
                    width: auto !important;
                    overflow: visible !important;
                    background-color: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0;
                    padding: 0;
                }
                body {
                    padding: 0.5in;
                    font-size: 12pt;
                }
                aside, footer, #export-button, #tts-button {
                    display: none !important;
                }
                .container {
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100%;
                }
                .story-content {
                    page-break-inside: avoid;
                    box-shadow: none !important;
                    border: 1px solid #ddd !important;
                    margin-bottom: 1.5rem;
                    -webkit-print-color-adjust: exact;
                }
                .prose {
                   color: black !important;
                }
                h2, h3 {
                    color: black !important;
                }
                .grid {
                    display: block; /* Simplify layout for printing */
                }
                img {
                    max-width: 100% !important;
                    border-radius: 8px;
                }
            }
        `}
    </style>
    <div className="container mx-auto p-4 md:p-8 animate-fadeIn h-full overflow-y-auto">
        <div className="flex flex-col gap-12">
            <div className="story-content p-1.5 bg-gradient-to-br from-brand-secondary via-brand-primary to-brand-dark rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="bg-base-100 rounded-lg p-1">
                    <h2 className="text-2xl font-bold text-brand-light my-4 text-center font-display">Your Photo</h2>
                    {userImage ? (
  <img
    src={userImage}
    alt="Captured"
    className="w-full max-w-lg mx-auto rounded-md object-contain"
    onError={(e) => {
      console.error('StoryView image loading error:', e);
      console.error('StoryView image data:', userImage?.substring(0, 200));
    }}
  />
) : (
  <div className="text-content-200 p-4 text-center">No image available</div>
)}
                </div>
            </div>
            
            <div className="text-center">
                <div className="inline-block">
                    <h2 className="text-3xl font-bold font-display bg-gradient-to-r from-brand-light via-white to-brand-light bg-clip-text text-transparent bg-[length:200%_auto] animate-illuminate">
                        The Story Unfolds...
                    </h2>
                    {storyTitle && (
                        <h3 className="text-2xl font-semibold font-display text-brand-light mt-2 animate-fadeIn">
                            {storyTitle}
                        </h3>
                    )}
                </div>
            </div>

            {storyParts.map((part, index) => (
                <div
                    key={index}
                    ref={el => { partRefs.current[index] = el; }}
                    className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn story-content p-4 rounded-2xl transition-all duration-500 ${currentlySpeakingPartIndex === index ? 'bg-brand-primary/20 scale-105' : 'bg-transparent'}`}
                    style={{ animationDelay: `${index * 200}ms` }}
                >
                    <div className={`h-full ${index % 2 === 1 ? 'lg:order-last' : ''}`}>
                        <div className="p-1.5 bg-base-300 rounded-xl shadow-lg h-full">
                            <div className="bg-base-200 p-6 rounded-lg prose prose-invert prose-lg text-content-100 h-full flex flex-col justify-center">
                                <p className="whitespace-pre-wrap">{part.text}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        {part.image ? (
                           <div className="p-1.5 bg-base-300 rounded-xl shadow-lg">
                             <img src={part.image} alt={`Story part ${index + 1}`} className="w-full rounded-lg shadow-2xl object-contain" />
                           </div>
                        ) : (
                            <div className="w-full aspect-square bg-base-200 rounded-lg flex items-center justify-center p-1.5 border-2 border-dashed border-base-300">
                                <p className="text-content-200">Image could not be generated.</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
             {storyParts.length === 0 && !isLoading && (
                <div className="text-center text-content-200 p-8">
                    <h3 className="text-2xl font-bold font-display">Oh no!</h3>
                    <p className="mt-2">The story couldn't be generated. Please go home and try again.</p>
                </div>
             )}

             {hasStory && !isLoading && (
                <div className="text-center my-8 flex justify-center items-center gap-4">
                    <button
                        id="tts-button"
                        onClick={handleToggleSpeech}
                        className="bg-brand-secondary text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-brand-light"
                    >
                        {isSpeaking ? 'Stop Narration' : 'Read Story Aloud'}
                    </button>
                    <button
                        id="export-button"
                        onClick={onExport}
                        disabled={isExporting}
                        className={`font-bold py-3 px-8 rounded-lg transition-all transform focus:outline-none focus:ring-4 focus:ring-brand-light flex items-center justify-center ${
                          isExporting
                            ? 'bg-brand-primary text-white cursor-not-allowed'
                            : 'bg-brand-dark text-white hover:scale-105'
                        }`}
                    >
                        {isExporting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Exporting...
                          </>
                        ) : (
                          'Export Story'
                        )}
                    </button>
                </div>
             )}
        </div>
    </div>
    </>
  );
};

export default StoryView;