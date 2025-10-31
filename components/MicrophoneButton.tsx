import React, { useState } from 'react';
import './MicrophoneButton.css';

interface MicrophoneButtonProps {
  listening: boolean;
  volume: number;
  onStartListening: () => void;
  onStopListening: () => void;
  commandStatus: 'idle' | 'success' | 'error';
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  listening,
  volume,
  onStartListening,
  onStopListening,
  commandStatus
}) => {
  const handleClick = () => {
    if (listening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  // Calculate scale based on volume (0 to 1 range)
  const scale = listening ? 1 + volume * 0.3 : 1;

  return (
    <>
      {listening && (
        <>
          <div className="pulse-ring pulse-ring-1"></div>
          <div className="pulse-ring pulse-ring-2"></div>
          <div className="pulse-ring pulse-ring-3"></div>
        </>
      )}
      <button
        className={`microphone-button ${listening ? 'recording' : ''} ${commandStatus === 'success' ? 'success' : commandStatus === 'error' ? 'error' : ''}`}
        onClick={handleClick}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        <svg
          className="microphone-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `scale(${scale})` }}
        >
          <path
            d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z"
            fill="white"
          />
          <path
            d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
            fill="white"
          />
        </svg>
      </button>
    </>
  );
};

export default MicrophoneButton;