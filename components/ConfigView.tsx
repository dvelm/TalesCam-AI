

import React, { useRef, useEffect } from 'react';
import { StoryConfig, ConfigStep } from '../types';
import ImageView from './ImageView';

interface ConfigViewProps {
  image: string;
  config: StoryConfig;
  onGenerate: () => void;
  onConfigChange: (config: StoryConfig) => void;
  currentStep: ConfigStep;
}

const StepIndicator = React.forwardRef<HTMLDivElement, {
  step: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  value: string | null;
  isFirst?: boolean;
}>(({ step, label, isActive, isCompleted, value, isFirst }, ref) => (
    <div ref={isFirst ? ref : null} className="flex items-center justify-between min-h-[40px]">
        <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${isActive ? 'border-brand-primary bg-brand-primary scale-110' : isCompleted ? 'border-brand-secondary bg-brand-secondary' : 'border-base-300'}`}>
                <span className={isActive || isCompleted ? 'text-white' : 'text-content-200'}>{isCompleted ? '✔' : step}</span>
            </div>
            <span className={`ml-4 text-lg font-medium ${isActive ? 'text-brand-light' : isCompleted ? 'text-content-100' : 'text-gray-500'}`}>{label}</span>
        </div>
        {value && (
            <span className={`text-sm animate-fadeIn text-right truncate pl-2 capitalize ${isActive ? 'text-brand-light' : 'text-green-400'}`}>
                {value}
            </span>
        )}
    </div>
));

const ConfigView: React.FC<ConfigViewProps> = ({ image, config, onGenerate, onConfigChange, currentStep }) => {
    const configSectionRef = useRef<HTMLDivElement>(null);
    const firstStepRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect runs on mount and whenever the currentStep changes.
        // It ensures that the view always scrolls to show the first step with some spacing above,
        // making it visible on all screen sizes.
        // A delay gives the browser time to render layout changes before scrolling.
        setTimeout(() => {
            // Try to scroll to the first step with appropriate offset for proper visibility, fallback to config section if needed
            if (firstStepRef.current) {
                firstStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Add a moderate offset by scrolling after the element is in view
                setTimeout(() => {
                    const contentWrapper = document.getElementById('story-content-wrapper');
                    if (contentWrapper) {
                        contentWrapper.scrollBy({ top: -30, behavior: 'smooth' });
                    }
                }, 300);
            } else if (configSectionRef.current) {
                configSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Add a moderate offset by scrolling after the element is in view
                setTimeout(() => {
                    const contentWrapper = document.getElementById('story-content-wrapper');
                    if (contentWrapper) {
                        contentWrapper.scrollBy({ top: -30, behavior: 'smooth' });
                    }
                }, 300);
            }
        }, 150);
    }, [currentStep]); // Dependency array ensures this runs when the step changes.

    const getTruncatedPrompt = (prompt?: string) => {
        if (!prompt) return null;
        return prompt.length > 25 ? `"${prompt.substring(0, 25)}..."` : `"${prompt}"`;
    }

    const typeValue = config.type === 'custom'
        ? getTruncatedPrompt(config.customPrompt)
        : (config.contextStyle ? `Style: ${config.contextStyle}` : 'Context');

    const steps = [
        { id: ConfigStep.SUBJECT, title: 'Main Character', prompt: 'Say a description for the main character (e.g., "a brave knight").', value: config.subject ? `"${config.subject}"` : null },
        { id: ConfigStep.POSITION, title: 'Placement', prompt: 'Say "start", "middle", or "end" to place the photo in the story.', value: config.position },
        { id: ConfigStep.TYPE, title: 'Story Type', prompt: 'Say a style (e.g., "funny") or describe the story you want.', value: typeValue },
        { id: ConfigStep.LANGUAGE, title: 'Language', prompt: 'Say a language (e.g., "Spanish").', value: config.language },
        { id: ConfigStep.CONFIRM, title: 'Confirm', prompt: 'Ready? Say "generate" or "confirm" to begin!', value: null },
    ];
    
    const activeStepInfo = steps.find(s => s.id === currentStep);

    return (
        <div className="container mx-auto p-4 md:p-8 animate-fadeIn h-full overflow-y-auto">
            <h1 className="text-4xl font-bold text-center mb-8 text-content-100 font-display">Create Your Story</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div>
                    <h2 className="text-2xl font-bold text-brand-light mb-4 font-display">Your Photo</h2>
                    <ImageView image={image} alt="Captured for story" className="w-full rounded-lg shadow-2xl object-contain" />
                </div>
                <div ref={configSectionRef} className="flex flex-col gap-6 bg-base-200 p-4 md:p-6 rounded-lg scroll-mt-8">
                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <StepIndicator
                                key={step.id}
                                step={index + 1}
                                label={step.title}
                                isActive={currentStep === step.id}
                                isCompleted={currentStep > step.id}
                                value={step.id === currentStep ? null : step.value} // Hide value for the active step's main display
                                isFirst={index === 0}
                                ref={index === 0 ? firstStepRef : null}
                            />
                        ))}
                    </div>

                    <div className="mt-6 p-6 bg-base-300 rounded-lg text-center min-h-[120px] flex flex-col justify-center items-center">
                        <h3 className="text-2xl font-bold text-brand-light animate-fadeIn font-display">{activeStepInfo?.title}</h3>
                        <p className="text-content-200 mt-2 animate-fadeIn [animation-delay:0.1s]">{activeStepInfo?.prompt}</p>
                        {currentStep === ConfigStep.CONFIRM && (
                            <div className="mt-4">
                                <div className="flex items-center justify-center mb-2">
                                    <input
                                        type="checkbox"
                                        id="autoPlay"
                                        checked={config.autoPlayAudio !== undefined ? config.autoPlayAudio : true}
                                        onChange={(e) => {
                                            onConfigChange({ ...config, autoPlayAudio: e.target.checked });
                                        }}
                                        className="mr-2 h-5 w-5 text-brand-primary focus:ring-brand-light border-base-300 rounded"
                                    />
                                    <label htmlFor="autoPlay" className="text-content-200">
                                        Read story aloud automatically
                                    </label>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Voice control: Say "check" or "enable" to turn on, "uncheck" or "disable" to turn off
                                </p>
                            </div>
                        )}
                    </div>
                     <p className="text-center text-sm text-gray-400">You can also say "back", "next", or "skip". Say "home" at any time to return to the main screen.</p>

                    <button
                        onClick={onGenerate}
                        disabled={currentStep !== ConfigStep.CONFIRM}
                        className="w-full mt-4 bg-brand-dark text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-brand-light disabled:bg-base-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        Generate!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigView;
