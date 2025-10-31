import { StoryPart } from '../types';

interface ExportOptions {
  font: string;
  borderColor: string;
}

// Helper to load an image and return it as an HTMLImageElement
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

// Helper to measure wrapped text and return the lines and total height
// Handles both space-separated languages (like English) and non-space-separated languages (like Japanese)
const measureAndWrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): { lines: string[], height: number } => {
    const lines = [];
    let currentLine = '';

    // Check if the text contains spaces to determine the wrapping strategy
    const hasSpaces = text.includes(' ');

    if (hasSpaces) {
        // For space-separated languages (English, etc.)
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine !== '') {
            lines.push(currentLine);
        }
    } else {
        // For non-space-separated languages (Japanese, Chinese, etc.)
        // Try to break at meaningful boundaries like punctuation or character compounds
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine !== '') {
            lines.push(currentLine);
        }
    }

    return { lines, height: lines.length * lineHeight };
};


// Helper to draw the wrapped text
const drawWrappedText = (context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) => {
    lines.forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
    });
};

// Helper to draw a rounded rectangle
const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
};


const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportAsImage = async (userImage: string, storyParts: StoryPart[], storyTitle: string, options: ExportOptions) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Layout Constants ---
    const padding = 60;
    const gap = 40;
    const contentWidth = 1280;
    const columnWidth = (contentWidth - gap) / 2;
    const canvasWidth = contentWidth + padding * 2;
    const titleFont = `bold 48px ${options.font}`;
    const textFont = `bold 24px ${options.font}`;
    const placeholderFont = `italic 22px ${options.font}`;
    const textLineHeight = 36;
    const textColor = '#F9FAFB'; // content-100
    const titleColor = '#A5B4FC'; // brand-light
    const placeholderColor = '#9CA3AF'; // gray-400
    const bgColor = '#111827'; // base-100
    const cardBgColor = '#1F2937'; // base-200
    const imageFramePadding = 12;

    // --- Preload all images ---
    const allImageSources = [userImage, ...storyParts.map(p => p.image).filter(Boolean) as string[]];
    const loadedImages = await Promise.all(allImageSources.map(loadImage));
    const userImgEl = loadedImages[0];
    const storyImgEls = loadedImages.slice(1);

    // --- Calculate total canvas height (First Pass) ---
    let totalHeight = padding;

    // User Image Title
    totalHeight += 60;
    
    // User Image with Frame
    const userImgTargetWidth = columnWidth * 1.5;
    const userImgTargetHeight = (userImgEl.height / userImgEl.width) * userImgTargetWidth;
    const userImgCardHeight = userImgTargetHeight + imageFramePadding * 2;
    totalHeight += userImgCardHeight + gap;

    // "Story Unfolds" Title
    totalHeight += 70 + gap;

    // Story Parts
    ctx.font = textFont;
    for (let i = 0; i < storyParts.length; i++) {
        const part = storyParts[i];
        const textMetrics = measureAndWrapText(ctx, part.text, columnWidth - padding * 2, textLineHeight);
        const textHeight = textMetrics.height + padding * 2;
        
        let imageHeight = 0;
        if (part.image) {
            const partImg = storyImgEls.find(img => img.src === part.image);
            if(partImg) {
                const imageContentWidth = columnWidth - imageFramePadding * 2;
                const imageContentHeight = (partImg.height / partImg.width) * imageContentWidth;
                imageHeight = imageContentHeight + imageFramePadding * 2;
            }
        } else {
            imageHeight = textHeight; // Placeholder card will match text height
        }
        totalHeight += Math.max(textHeight, imageHeight) + gap;
    }
    
    totalHeight += padding - gap;

    // --- Setup Canvas and Draw (Second Pass) ---
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentY = padding;

    // --- Draw User Image Section ---
    ctx.font = titleFont;
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    ctx.fillText('Your Photo', canvasWidth / 2, currentY + 10);
    currentY += 60;

    const userImgCardWidth = userImgTargetWidth + imageFramePadding * 2;
    const userImgCardX = (canvasWidth - userImgCardWidth) / 2;

    // Draw user image with gradient border like on site
    const userImgOuterGradient = ctx.createLinearGradient(userImgCardX, currentY, userImgCardX, currentY + userImgCardHeight);
    userImgOuterGradient.addColorStop(0, '#6366F1'); // brand-secondary
    userImgOuterGradient.addColorStop(0.5, '#818CF8'); // brand-primary
    userImgOuterGradient.addColorStop(1, '#4F46E5'); // brand-dark
    ctx.fillStyle = userImgOuterGradient;
    drawRoundRect(ctx, userImgCardX, currentY, userImgCardWidth, userImgCardHeight, 16);

    // Draw inner content area
    const innerPadding = 6;
    ctx.fillStyle = cardBgColor;
    drawRoundRect(ctx, userImgCardX + innerPadding, currentY + innerPadding, userImgCardWidth - innerPadding * 2, userImgCardHeight - innerPadding * 2, 12);

    // Draw the image inside with proper padding
    ctx.drawImage(userImgEl, userImgCardX + imageFramePadding, currentY + imageFramePadding, userImgTargetWidth, userImgTargetHeight);
    currentY += userImgCardHeight + gap;
    
    // --- Draw Story Title with gradient ---
    ctx.textAlign = 'center';
    const gradient = ctx.createLinearGradient(0, currentY + 40, canvasWidth, currentY + 40);
    gradient.addColorStop(0, '#818CF8'); // Start color
    gradient.addColorStop(1, '#C7D2FE'); // End color
    ctx.fillStyle = gradient;
    ctx.font = `bold 52px ${options.font}`;
    ctx.fillText('The Story Unfolds...', canvasWidth / 2, currentY + 50);

    // Add story title if available
    if (storyTitle) {
        ctx.fillStyle = titleColor;
        ctx.font = `bold 36px ${options.font}`;
        ctx.fillText(storyTitle, canvasWidth / 2, currentY + 100);
        currentY += 130 + gap;
    } else {
        currentY += 80 + gap;
    }

    // --- Draw Story Parts ---
    for (let i = 0; i < storyParts.length; i++) {
        const part = storyParts[i];
        
        ctx.font = textFont;
        const textMetrics = measureAndWrapText(ctx, part.text, columnWidth - padding * 2, textLineHeight);
        const textBlockHeight = textMetrics.height + padding * 2;
        
        let partImgEl: HTMLImageElement | undefined;
        let imageBlockHeight = 0;
        if(part.image) {
            partImgEl = storyImgEls.find(img => img.src === part.image);
            if(partImgEl) {
                const imageContentWidth = columnWidth - imageFramePadding * 2;
                const imageContentHeight = (partImgEl.height / partImgEl.width) * imageContentWidth;
                imageBlockHeight = imageContentHeight + imageFramePadding * 2;
            }
        } else {
            imageBlockHeight = textBlockHeight;
        }

        const rowHeight = Math.max(textBlockHeight, imageBlockHeight);
        const textX = (i % 2 === 1) ? padding + columnWidth + gap : padding;
        const imageX = (i % 2 === 1) ? padding : padding + columnWidth + gap;
        
        // Draw Text Card with gradient border like on site
        // First draw the outer gradient border (simulating from-brand-secondary via-brand-primary to-brand-dark)
        const outerGradient = ctx.createLinearGradient(textX, currentY, textX, currentY + rowHeight);
        outerGradient.addColorStop(0, '#6366F1'); // brand-secondary
        outerGradient.addColorStop(0.5, '#818CF8'); // brand-primary
        outerGradient.addColorStop(1, '#4F46E5'); // brand-dark
        ctx.fillStyle = outerGradient;
        drawRoundRect(ctx, textX, currentY, columnWidth, rowHeight, 16);

        // Then draw the inner content area
        ctx.fillStyle = cardBgColor;
        drawRoundRect(ctx, textX + 6, currentY + 6, columnWidth - 12, rowHeight - 12, 12);

        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.font = textFont;
        const textYOffset = (rowHeight - textMetrics.height) / 2;
        drawWrappedText(ctx, textMetrics.lines, textX + padding, currentY + textYOffset, textLineHeight);

        // Draw Image Card with gradient border like on site
        // First draw the outer gradient border
        ctx.fillStyle = outerGradient;
        drawRoundRect(ctx, imageX, currentY, columnWidth, rowHeight, 16);

        // Then draw the inner content area
        ctx.fillStyle = cardBgColor;
        drawRoundRect(ctx, imageX + 6, currentY + 6, columnWidth - 12, rowHeight - 12, 12);

        if(partImgEl) {
            const imageContentWidth = columnWidth - imageFramePadding * 2 - 12;
            const imageContentHeight = (partImgEl.height / partImgEl.width) * imageContentWidth;
            const imageContentY = currentY + 6 + (rowHeight - 12 - imageContentHeight) / 2;
            const imageContentX = imageX + 6 + (columnWidth - 12 - imageContentWidth) / 2;

            ctx.drawImage(partImgEl, imageContentX, imageContentY, imageContentWidth, imageContentHeight);
        } else {
            ctx.font = placeholderFont;
            ctx.fillStyle = placeholderColor;
            ctx.textAlign = 'center';
            ctx.fillText('Image could not be generated.', imageX + columnWidth / 2, currentY + rowHeight / 2);
        }

        currentY += rowHeight + gap;
    }

    triggerDownload(canvas.toDataURL('image/png'), 'talescam-story.png');
};


export const exportAsHTML = (userImage: string, storyParts: StoryPart[], storyTitle: string, options: ExportOptions) => {
    const storyHTML = storyParts.map((part, index) => `
        <div class="story-section">
            <div class="text-card-container">
                <div class="text-card">
                    <p style="font-size: 1.1rem; line-height: 1.6; margin: 0;">${part.text}</p>
                </div>
            </div>
            <div class="image-card-container">
                <div class="image-card">
                    ${part.image ?
                        `<img src="${part.image}" alt="Story part ${index + 1}" class="story-image" />` :
                        `<div class="placeholder">Image could not be generated.</div>`
                    }
                </div>
            </div>
        </div>
    `).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your TalesCam Story</title>
            <style>
                body {
                    font-family: ${options.font}, sans-serif;
                    background-color: #111827;
                    color: #F9FAFB;
                    padding: 2rem;
                    max-width: 1200px;
                    margin: auto;
                }
                h1 {
                    color: #A5B4FC;
                    text-align: center;
                }
                .main-image-container {
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto 2rem;
                    padding: 1.5rem;
                    background: linear-gradient(135deg, #6366F1, #818CF8, #4F46E5);
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                }
                .main-image {
                    width: 100%;
                    border-radius: 12px;
                    display: block;
                    background-color: #1F2937;
                    padding: 0.5rem;
                }
                .story-title {
                    text-align: center;
                    font-size: 2.5rem;
                    margin: 3rem 0;
                    background: linear-gradient(90deg, #818CF8, #C7D2FE);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    color: transparent;
                    animation: glow 2s ease-in-out infinite alternate;
                }
                .story-subtitle {
                    text-align: center;
                    font-size: 1.8rem;
                    margin: 1rem 0 3rem 0;
                    color: #A5B4FC;
                    font-weight: bold;
                }
                @keyframes glow {
                    from {
                        text-shadow: 0 0 5px #818CF8, 0 0 10px #818CF8;
                    }
                    to {
                        text-shadow: 0 0 10px #C7D2FE, 0 0 20px #C7D2FE;
                    }
                }
                .story-section {
                    display: flex;
                    gap: 2rem;
                    margin: 3rem 0;
                    align-items: stretch;
                }
                .story-section:nth-child(even) {
                    flex-direction: row-reverse;
                }
                .text-card-container, .image-card-container {
                    flex: 1;
                    padding: 6px;
                    background: linear-gradient(135deg, #6366F1, #818CF8, #4F46E5);
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                }
                .text-card, .image-card {
                    border-radius: 12px;
                    background-color: #1F2937;
                    padding: 1.5rem;
                    height: 100%;
                    display: flex;
                    align-items: center;
                }
                .text-card {
                    justify-content: center;
                }
                .story-image {
                    max-width: 100%;
                    border-radius: 8px;
                }
                .placeholder {
                    color: #9CA3AF;
                    font-style: italic;
                    text-align: center;
                    padding: 2rem;
                }
                @media (max-width: 768px) {
                    .story-section {
                        flex-direction: column;
                    }
                    .story-section:nth-child(even) {
                        flex-direction: column;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Your Story</h1>
            <div class="main-image-container">
                <img src="${userImage}" alt="Your photo" class="main-image" />
            </div>
            <div class="story-title">The Story Unfolds...</div>
            ${storyTitle ? `<div class="story-subtitle">${storyTitle}</div>` : ''}
            ${storyHTML}
        </body>
        </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, 'talescam-story.html');
    URL.revokeObjectURL(url);
};


// Export as PDF using html2pdf.js with improved implementation
export const exportAsPDF = async (userImage: string, storyParts: StoryPart[], storyTitle: string, options: ExportOptions) => {
  try {
    // Import html2pdf.js
    const html2pdf = (await import('html2pdf.js')).default;

    // Create a wrapper element with fixed styling
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -9999;
      overflow: hidden;
      pointer-events: none;
      opacity: 0;
    `;
    
    // Create the content container - full A4 size with background extending to edges
    const container = document.createElement('div');
    container.style.cssText = `
      width: 210mm;
      min-height: 297mm;
      background-color: #111827;
      color: #F9FAFB;
      padding: 10mm;
      font-family: ${options.font}, sans-serif;
      box-sizing: border-box;
    `;

    // Build the HTML structure programmatically for better control
    const contentHTML = buildPDFContent(userImage, storyParts, storyTitle, options);
    container.innerHTML = contentHTML;
    
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    // Wait for all images to load
    const images = container.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continue even if image fails
            // Timeout fallback
            setTimeout(resolve, 3000);
          }
        });
      })
    );

    // Additional delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Configure html2pdf with optimized settings
    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: 'talescam-story.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#111827',
        logging: false,
        windowWidth: 794, // Full A4 width at 96 DPI
        windowHeight: 1123, // Full A4 height at 96 DPI
        onclone: (clonedDoc: Document) => {
          // Find the cloned container
          const clonedContainer = clonedDoc.querySelector('div[style*="210mm"]') as HTMLElement;
          if (clonedContainer) {
            // Make container visible in clone and ensure it fills the page
            clonedContainer.style.opacity = '1';
            clonedContainer.style.position = 'relative';
            clonedContainer.style.zIndex = '1';
            clonedContainer.style.minHeight = '297mm';
          }
        }
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.story-section',
        avoid: ['.story-section', '.main-image-container']
      }
    };

    // Generate and save the PDF
    await html2pdf().set(opt).from(container).save();

    // Clean up
    document.body.removeChild(wrapper);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    // Try to clean up if error occurs
    const wrapper = document.querySelector('div[style*="z-index: -9999"]');
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    throw error;
  }
};

// Helper function to build PDF content structure with optimized spacing
const buildPDFContent = (userImage: string, storyParts: StoryPart[], storyTitle: string, options: ExportOptions): string => {
  // Function to create a story section
  const createStorySection = (part: StoryPart, index: number) => {
    const isEven = index % 2 === 1;
    return `
      <div class="story-section" style="
        display: flex;
        gap: 10px;
        margin: 8px 0;
        ${isEven ? 'flex-direction: row-reverse;' : ''}
      ">
        <div style="flex: 1; padding: 4px; background: #6366F1; border-radius: 10px; min-width: 0;">
          <div style="border-radius: 8px; background-color: #1F2937; padding: 10px; height: 100%; display: flex; align-items: center; justify-content: center;">
            <p style="font-size: 0.8rem; line-height: 1.35; margin: 0; color: #F9FAFB; word-wrap: break-word;">${part.text}</p>
          </div>
        </div>
        <div style="flex: 1; padding: 4px; background: #6366F1; border-radius: 10px; min-width: 0;">
          <div style="border-radius: 8px; background-color: #1F2937; padding: 8px; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${part.image
              ? `<img src="${part.image}" alt="Story part ${index + 1}" style="max-width: 100%; max-height: 180px; width: auto; height: auto; border-radius: 6px; display: block; object-fit: contain;" crossorigin="anonymous" />`
              : `<div style="color: #9CA3AF; font-style: italic; text-align: center; padding: 10px; font-size: 0.75rem;">Image could not be generated.</div>`
            }
          </div>
        </div>
      </div>
    `;
  };

  // First page: header, user image, title, and FIRST story section
  const firstSection = storyParts.length > 0 ? createStorySection(storyParts[0], 0) : '';
  
  // Group remaining sections into sets of 3 per page
  let pageGroups = '';
  for (let i = 1; i < storyParts.length; i += 3) {
    const sectionsInGroup = [];
    // Collect up to 3 sections for this page
    for (let j = 0; j < 3 && (i + j) < storyParts.length; j++) {
      sectionsInGroup.push(createStorySection(storyParts[i + j], i + j));
    }
    
    // Wrap the group of 3 sections in a container that breaks as a unit
    pageGroups += `
      <div class="page-group" style="
        page-break-before: always;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: auto;
      ">
        ${sectionsInGroup.join('')}
      </div>
    `;
  }

  return `
    <div style="font-family: ${options.font}, sans-serif; width: 100%; min-height: 297mm;">
      <h1 style="color: #A5B4FC; text-align: center; margin-bottom: 12px; margin-top: 5px; font-size: 1.5rem;">Your Story</h1>
      
      <div class="main-image-container" style="
        max-width: 320px;
        margin: 0 auto 18px;
        padding: 7px;
        background: #6366F1;
        border-radius: 10px;
      ">
        <div style="background-color: #1F2937; border-radius: 8px; padding: 7px;">
          <img src="${userImage}" alt="Your photo" style="width: 100%; max-width: 100%; border-radius: 6px; display: block;" crossorigin="anonymous" />
        </div>
      </div>
      
      <div style="
        text-align: center;
        font-size: 1.3rem;
        margin: 18px 0 12px;
        color: #818CF8;
        font-weight: bold;
      ">
        The Story Unfolds...
      </div>
      
      ${storyTitle ? `<div style="text-align: center; font-size: 1.1rem; margin: 8px 0 18px; color: #A5B4FC; font-weight: bold;">${storyTitle}</div>` : ''}
      
      ${firstSection}
      
      ${pageGroups}
      
      <div style="min-height: 50px;"></div>
    </div>
  `;
};

// Helper function to convert HTML to Image using html2canvas
const htmlToImage = async (htmlContent: string, filename: string) => {
  const html2canvas = (await import('html2canvas')).default;

  // Create a temporary container to hold the HTML content
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px'; // Reasonable width for image
  container.style.backgroundColor = '#111827';
  container.style.color = '#F9FAFB';
  container.style.padding = '2rem';
  container.style.fontSize = '16px';
  container.style.fontFamily = 'sans-serif';
  document.body.appendChild(container);

  try {
    // Enhanced ignoreElements function to handle more problematic elements
    const ignoreElements = (element: Element): boolean => {
      const tagName = element.tagName.toUpperCase();
      // Ignore problematic elements that can cause iframe errors
      const ignoredTags = ['IFRAME', 'SCRIPT', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED', 'APPLET', 'FRAME', 'FRAMESET'];
      const isIgnoredTag = ignoredTags.includes(tagName);

      // Also ignore elements with specific attributes that might cause issues
      const hasProblematicAttrs = element.hasAttribute('src') &&
        (element.getAttribute('src')?.includes('javascript:') ||
         element.getAttribute('src')?.includes('data:text/html'));

      return isIgnoredTag || hasProblematicAttrs;
    };

    // Use html2canvas to convert the HTML to an image
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      backgroundColor: '#111827',
      width: container.scrollWidth,
      height: container.scrollHeight,
      logging: false,
      allowTaint: true,
      foreignObjectRendering: true,
      ignoreElements: ignoreElements,
      onclone: (clonedDoc) => {
        // Remove or hide problematic elements in the cloned document
        const iframes = clonedDoc.querySelectorAll('iframe, script, video, audio, object, embed, applet, frame, frameset');
        iframes.forEach(el => {
          el.remove();
        });

        // Also remove elements with problematic src attributes
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.hasAttribute('src') &&
              (el.getAttribute('src')?.includes('javascript:') ||
               el.getAttribute('src')?.includes('data:text/html'))) {
            el.remove();
          }
        });
      }
    });

    // Convert canvas to data URL and trigger download
    const imageData = canvas.toDataURL('image/png');
    triggerDownload(imageData, filename);

    // Clean up
    document.body.removeChild(container);
  } catch (error) {
    // Clean up in case of error
    document.body.removeChild(container);
    console.error('Error converting HTML to Image:', error);
    throw error;
  }
};


// Helper function to generate HTML content (extracted from exportAsHTML)
// Includes CSS properties to help with page breaks when converting to PDF
const generateHtmlContent = (userImage: string, storyParts: StoryPart[], storyTitle: string, options: ExportOptions): string => {
  const storyHTML = storyParts.map((part, index) => `
      <div class="story-section">
          <div class="text-card-container">
              <div class="text-card">
                  <p style="font-size: 1.1rem; line-height: 1.6; margin: 0;">${part.text}</p>
              </div>
          </div>
          <div class="image-card-container">
              <div class="image-card">
                  ${part.image ?
                      `<img src="${part.image}" alt="Story part ${index + 1}" class="story-image" />` :
                      `<div class="placeholder">Image could not be generated.</div>`
                  }
              </div>
          </div>
      </div>
  `).join('');

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your TalesCam Story</title>
          <style>
              body {
                  font-family: ${options.font}, sans-serif;
                  background-color: #111827;
                  color: #F9FAFB;
                  padding: 2rem;
                  max-width: 1200px;
                  margin: auto;
              }
              h1 {
                  color: #A5B4FC;
                  text-align: center;
              }
              .main-image-container {
                  width: 100%;
                  max-width: 600px;
                  margin: 0 auto 2rem;
                  padding: 1.5rem;
                  background: #6366F1;
                  border: 2px solid #818CF8;
                  border-radius: 16px;
              }
              .main-image {
                  width: 100%;
                  border-radius: 12px;
                  display: block;
                  background-color: #1F2937;
                  padding: 0.5rem;
              }
              .story-title {
                  text-align: center;
                  font-size: 2.5rem;
                  margin: 3rem 0;
                  color: #818CF8;
                  font-weight: bold;
              }
              .story-subtitle {
                  text-align: center;
                  font-size: 1.8rem;
                  margin: 1rem 0 3rem 0;
                  color: #A5B4FC;
                  font-weight: bold;
              }
              .story-section {
                  display: flex;
                  gap: 2rem;
                  margin: 3rem 0;
                  align-items: stretch;
                  page-break-inside: avoid;
                  break-inside: avoid;
                  page-break-after: always;
              }
              .story-section:nth-child(even) {
                  flex-direction: row-reverse;
              }
              .text-card-container, .image-card-container {
                  flex: 1;
                  padding: 6px;
                  background: #6366F1;
                  border: 2px solid #818CF8;
                  border-radius: 16px;
              }
              .text-card, .image-card {
                  border-radius: 12px;
                  background-color: #1F2937;
                  padding: 1.5rem;
                  height: 100%;
                  display: flex;
                  align-items: center;
              }
              .text-card {
                  justify-content: center;
              }
              .story-image {
                  max-width: 100%;
                  border-radius: 8px;
              }
              .placeholder {
                  color: #9CA3AF;
                  font-style: italic;
                  text-align: center;
                  padding: 2rem;
              }
              @media (max-width: 768px) {
                  .story-section {
                      flex-direction: column;
                  }
                  .story-section:nth-child(even) {
                      flex-direction: column;
                  }
              }
          </style>
      </head>
      <body>
          <h1>Your Story</h1>
          <div class="main-image-container">
              <img src="${userImage}" alt="Your photo" class="main-image" />
          </div>
          <div class="story-title">The Story Unfolds...</div>
          ${storyTitle ? `<div class="story-subtitle">${storyTitle}</div>` : ''}
          ${storyHTML}
      </body>
      </html>
  `;
};

