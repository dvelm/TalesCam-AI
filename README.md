# TalesCam AI

TalesCam AI is a voice-powered storytelling application that turns your photos into unique tales with companion images. Capture moments, customize your story with voice commands, and watch as AI generates a multi-part story complete with style-matched images.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `API_KEY` in [.env.local](.env.local) to your AI API key
3. Run the app:
   `npm run dev`

## System Requirements

### Browser Compatibility
- **Recommended Browsers**: Chrome, Edge, or other Chromium-based browsers
- **Voice Recognition**: Requires Web Speech API support (limited or unavailable in Firefox and Safari)
- **Camera Access**: Modern browser with camera permissions support
- **Audio Input**: Microphone access for voice commands

### Hardware Requirements
- Webcam or camera for photo capture
- Microphone for voice commands
- Speakers or headphones for audio feedback (optional)

### Software Requirements
- Node.js (version 14 or higher)
- npm (Node Package Manager)
- Modern web browser (Chrome/Chromium-based recommended)
- Internet connection for API access and CDN resources

## Features

- Voice-controlled camera operation ("Photo", "Photo in 5 seconds", etc.)
- Story customization through voice commands
- AI-powered story generation with companion images
- Gallery for saving and viewing stories
- Export stories as images, PDF, or HTML
- Text-to-speech narration in multiple languages
- Responsive design for various screen sizes

## Voice Commands

### General Commands
- "Photo" - Open camera and start a new story
- "Upload" - Choose a photo from your device
- "Show gallery" - View all saved stories
- "Home" - Return to the main screen

### Camera Commands
- "Photo" - Take a picture instantly
- "Photo in [1-10] seconds" - Timed countdown capture

### Story Setup Commands
1. "Subject: [description]" - Describe the main character
2. "Placement: start/middle/end" - Where the photo fits in the story
3. "Story Type: [style/idea]" - Simple style or complex story idea
4. "Language: [language]" - Story language
5. "Generate" - Create your story

### Story View Commands
- "Read story aloud" - Have the story read to you in the selected language
- "Stop narration" - Stop the story reading
- "Save story" - Save the story to your gallery
- "Export story" - Export the story in various formats

### Navigation Commands
- "Back" and "Next" - Move between steps
- "Skip" - Accept default settings
- "Auto" - Quickly fill a step
- "Reset" - Clear all settings

### In-Story Commands
- "Retry" or "Reset" - Change story settings
- "Save story" - Add to gallery
- "Export story" - Download in various formats

## Known Issues

- Firefox: Voice recognition features do not work due to lack of Web Speech API support
- Safari: Limited voice recognition support
- Mobile browsers: Some features may have limitations

## Development

This project uses:
- React with TypeScript
- Tailwind CSS (via CDN for development)
- Web Speech API for voice recognition
- AI for story generation
- HTML5 Canvas for image processing