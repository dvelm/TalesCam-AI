
import React, { useState } from 'react';
import { StoryPart } from '../types';
import { exportAsImage, exportAsHTML } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userImage: string;
  storyParts: StoryPart[];
  storyTitle?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

type ExportFormat = 'image' | 'html';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, userImage, storyParts, storyTitle = '', onExportStart, onExportEnd }) => {
  const [format, setFormat] = useState<ExportFormat>('image');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    onExportStart?.();
    try {
      const options = { font: 'serif', borderColor: '#6366F1' }; // Example options
      switch (format) {
        case 'image':
          // For image export, it's now async, so handle accordingly
          try {
            await exportAsImage(userImage, storyParts, storyTitle, options);
          } catch (error) {
            console.error('Error exporting image:', error);
          }
          break;
        case 'html':
          exportAsHTML(userImage, storyParts, storyTitle, options);
          break;
      }
      // Close the modal after export for all formats
      // Since all are now async, we'll close after a short delay to allow processing
      setTimeout(onClose, 500);
    } finally {
      setIsExporting(false);
      onExportEnd?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-base-200 rounded-lg shadow-2xl p-8 w-full max-w-md m-4 transform animate-slideIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-content-100 font-display">Export Story</h2>
          <button onClick={onClose} className="text-content-200 hover:text-white">&times;</button>
        </div>
        
        <div className="space-y-4">
            <p className="text-content-200">Choose your desired format:</p>
            <div className="flex space-x-2 rounded-lg bg-base-300 p-1">
                {(['image', 'html'] as ExportFormat[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-all duration-300
                            ${format === f ? 'bg-brand-primary text-white shadow' : 'text-gray-300 hover:bg-white/[0.12] hover:text-white'}`}
                    >
                        {f.toUpperCase()}
                    </button>
                ))}
            </div>
             <p className="text-xs text-gray-400 text-center pt-2">
                {format === 'image' && 'Creates a single composite PNG image.'}
                {format === 'html' && 'Saves a self-contained HTML file.'}
            </p>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-base-300 text-content-100 hover:bg-opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleExport()}
            disabled={isExporting}
            className={`px-6 py-2 rounded-lg font-bold transition-colors flex items-center justify-center ${
              isExporting
                ? 'bg-brand-primary text-white cursor-not-allowed'
                : 'bg-brand-dark text-white hover:bg-opacity-90'
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
              'Export Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;