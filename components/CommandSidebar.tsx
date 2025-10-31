import React from 'react';

const commands = [
    { category: 'General', items: [
        'Say "Photo" to open the camera and start a new story.',
        'Say "Upload" to choose a photo from your device.',
        'Say "Home", "Start over", or "Main screen" to return to the main screen at any time.',
    ]},
    { category: 'In Camera', items: [
        'Say "Photo", "Take a photo", "Capture", or "Snap" to snap a picture instantly.',
        'Say "Photo in 3 seconds" for a timed countdown (1-10 seconds).',
        'Say "Photo in three seconds" for a timed countdown (1-10 seconds).',
        'Say "Photo 3 seconds" for a timed countdown (1-10 seconds).',
        'Say "Back" to return to the home screen.',
    ]},
    { category: 'Story Setup', items: [
        '1. Subject: Describe the main character (e.g., "a curious fox").',
        '   Say "auto" to generate a random main character.',
        '   Say "skip" to accept the default (auto if no subject set).',
        '2. Placement: Say where the photo fits: "start", "middle", or "end" of the tale.',
        '   Say "and" as an alternative to "end".',
        '   Say "beginning" or "start" for start, "middle" for middle, "end" or "and" for end.',
        '3. Story Type: For a simple story, say a style like "funny". For a complex one, describe your idea (e.g., "a story about finding a hidden treasure").',
        '4. Language: Tell me the language for the story (e.g., "Japanese").',
        '   Only supported languages are accepted.',
        '5. Confirm: Once ready, just say "generate" or "confirm" to create your story.',
        'Navigation: Use "back" to return to the previous step or camera. Use "next" to move forward.',
        'Shortcuts: Say "skip" to accept the default, or "auto" to quickly fill a step.',
        'Auto-read: Say "check" or "enable" to turn on auto-read aloud, "uncheck" or "disable" to turn it off.',
        'Reset: Say "reset" or "raised" to return to the camera and clear all settings.',
        'Retry: Say "retry", "re try", "retrie", "try again", or "regenerate" to return to main character setup from later steps.',
    ]},
    { category: 'In Story', items: [
        'Say "Retry", "Re try", "Retrie", "Try again", or "Regenerate" to return to main character setup.',
        'Say "Reset" or "Raised" to return to the camera.',
        'Say "Export story" or "Export" to download it as an image or HTML file.',
        'Say "Back" to return to the camera view.',
    ]},
];

const CommandSidebar: React.FC = () => {
  return (
    <aside className="hidden md:flex flex-col w-72 bg-gradient-to-t from-blue-950/40 to-base-200/30 backdrop-blur-sm p-6 flex-shrink-0 border-l border-base-300">
      <h2 className="text-2xl font-bold text-content-100 mb-6 flex-shrink-0 font-display">Voice Commands</h2>
      <div className="overflow-y-auto space-y-6">
        {commands.map(({category, items}) => (
            <div key={category}>
                <h3 className="font-semibold text-brand-light text-lg mb-2">{category}</h3>
                <ul className="space-y-1 list-disc list-inside text-content-200 text-sm">
                    {items.map(item => <li key={item}>{item}</li>)}
                </ul>
            </div>
        ))}
      </div>
       <p className="mt-auto pt-4 text-center text-xs text-gray-400 flex-shrink-0">
          The app is always listening. Just speak your command.
        </p>
    </aside>
  );
};

export default CommandSidebar;
