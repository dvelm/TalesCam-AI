import { GoogleGenAI as GenAI, Modality, Type } from "@google/genai";
import { StoryConfig, StoryPart, StoryData } from '../types';

let ai: InstanceType<typeof GenAI> | null = null;

const getAI = () => {
  if (!ai) {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
      throw new Error("API_KEY environment variable is not set. Please check your .env.local file.");
    }
    ai = new GenAI({ apiKey: API_KEY });
  }
  return ai;
};

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  // Validate and extract base64 data
  let base64Content = '';
  if (base64Data.startsWith('data:')) {
    base64Content = base64Data.split(',')[1];
  } else {
    base64Content = base64Data;
  }

  // Debug log the base64 data
  console.log('Base64 data length:', base64Content.length);
  console.log('Base64 data starts with:', base64Content.substring(0, 50));
  console.log('MIME type:', mimeType);

  // Validate that we have actual base64 data
  if (!base64Content || base64Content.length === 0) {
    throw new Error('Invalid base64 image data: empty or null');
  }

  // Additional validation: check if base64 data contains only valid characters
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
    console.warn('Base64 data may contain invalid characters');
  }

  return {
    inlineData: {
      data: base64Content,
      mimeType,
    },
  };
};

const analyzeImageStyle = async (
    imagePart: { inlineData: { data: string; mimeType: string; } }
): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const prompt = 'Analyze the artistic style of this image in a few words (e.g., "photorealistic", "anime sketch", "oil painting", "3D render", "watercolor"). Be concise and descriptive.';
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Sending image to analyze style... (Attempt ${attempt + 1})`);
            const response = await getAI().models.generateContent({
                model,
                contents: { parts: [imagePart, { text: prompt }] },
            });
            console.log('Style analysis response:', response.text.substring(0, 100));
            return response.text.trim();
        } catch (error: any) {
            console.error(`Error analyzing image style (Attempt ${attempt + 1}):`, error);

            // Check if it's a 503 Service Unavailable error
            if (error.message && error.message.includes('503') && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
                console.log(`Model is overloaded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If it's the last attempt or not a retryable error, return fallback
            if (attempt === MAX_RETRIES) {
                console.error("Failed to analyze image style after retries.");
                return "digital art"; // Fallback style
            }
        }
    }

    return "digital art"; // Fallback style
};

const generateStoryTitle = async (
    imagePart: { inlineData: { data: string; mimeType: string; }; },
    config: StoryConfig,
    storySegments: string[]
): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second

    // Combine the first few segments to create context for title generation
    const storyContext = storySegments.slice(0, 2).join(' ');

    const prompt = `Based on this image and the beginning of the story about "${config.subject}" in ${config.language}, create exactly one short, catchy title (3-8 words) for the story. The title should capture the essence of the story. Do not provide multiple title options. Story beginning: "${storyContext}"`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await getAI().models.generateContent({
                model,
                contents: { parts: [imagePart, { text: prompt }] },
            });
            let title = response.text.trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes if any

            // Additional processing to ensure we only get one title
            // If the response contains multiple titles (numbered or bulleted), extract the first one
            if (title.includes('\n') || title.includes('\r')) {
                // Split by lines and take the first non-empty line that looks like a title
                const lines = title.split(/[\r\n]+/);
                for (const line of lines) {
                    const cleanedLine = line.trim();
                    // Skip lines that are just numbers, bullets, or formatting
                    if (cleanedLine && !/^[0-9]+[.)]?\s*\**\s*$/.test(cleanedLine) && cleanedLine.length > 3) {
                        title = cleanedLine.replace(/^[0-9]+[.)]?\s*\**\s*|\s*\**\s*$/g, ''); // Remove leading numbers/bullets
                        break;
                    }
                }
            }

            // If we still have multiple titles separated by numbers or bullets, take the first one
            const titleParts = title.split(/[\r\n]+|[0-9]+[.)]|\*\s+/);
            if (titleParts.length > 1) {
                title = titleParts[0].trim();
            }

            // Remove any remaining markdown or formatting
            title = title.replace(/^["'*]+|["'*]+$/g, '').trim();

            // Ensure we have a valid title
            if (!title || title.length < 3) {
                title = "Untitled Story";
            }

            return title;
        } catch (error: any) {
            console.error(`Error generating story title (Attempt ${attempt + 1}):`, error);

            // Check if it's a 503 Service Unavailable error
            if (error.message && error.message.includes('503') && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
                console.log(`Model is overloaded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If it's the last attempt or not a retryable error, return fallback
            if (attempt === MAX_RETRIES) {
                console.error("Failed to generate story title after retries.");
                return "Untitled Story"; // Fallback title
            }
        }
    }

    return "Untitled Story"; // Fallback title
};

const generateStorySegments = async (
    imagePart: { inlineData: { data: string; mimeType: string; }; },
    config: StoryConfig
): Promise<string[]> => {
    const model = 'gemini-2.5-flash';
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second

    let storyPrompt = '';
    switch (config.type) {
        case 'context':
            let contextDesc = config.contextStyle ? ` with a ${config.contextStyle} tone` : '';
            if (config.contextStyle?.toLowerCase().includes('funny')) {
                contextDesc = ` with an extremely funny, humorous, and witty tone`;
            }
            storyPrompt = `Based on the scene in this image, write an intriguing story${contextDesc} in 3 to 5 short paragraphs. The story must be about "${config.subject}". Make it genuinely hilarious if a funny tone was requested.`;
            break;
        case 'custom':
            storyPrompt = `Based on this image, write a short story in 3 to 5 paragraphs about "${config.subject}" following this specific prompt: "${config.customPrompt}"`;
            break;
    }

    let positionPrompt = '';
    switch (config.position) {
        case 'start':
            positionPrompt = 'This image is the very beginning of the story.';
            break;
        case 'end':
            positionPrompt = 'This image is the very end of the story; write the events that led up to it.';
            break;
        case 'middle':
            positionPrompt = 'This image represents the central event or turning point of the story. Write what happened before and after this moment.';
            break;
    }


    const fullPrompt = `${storyPrompt} ${positionPrompt} The story must be written entirely in ${config.language}. The response must be a JSON array of strings, where each string is a paragraph.`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Sending image and prompt to generate story segments... (Attempt ${attempt + 1})`);
            console.log('Full prompt:', fullPrompt.substring(0, 200) + '...');
            const response = await getAI().models.generateContent({
                model,
                contents: { parts: [imagePart, { text: fullPrompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });

            console.log('Story generation response:', response.text.substring(0, 100));

            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                return parsed;
            }
            throw new Error("Invalid JSON response from story generation model.");
        } catch (error: any) {
            console.error(`Error generating story segments (Attempt ${attempt + 1}):`, error);

            // Check if it's a 503 Service Unavailable error
            if (error.message && error.message.includes('503') && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
                console.log(`Model is overloaded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If it's the last attempt or not a retryable error, throw the error
            throw new Error("Failed to generate story segments.");
        }
    }

    throw new Error("Failed to generate story segments after retries.");
};

const generateImageForSegment = async (
    originalImagePart: { inlineData: { data: string; mimeType: string; }; },
    storySegment: string,
    subject: string,
    style: string
): Promise<string | null> => {
    const model = 'gemini-2.5-flash-image';
    const prompt = `REFERENCE IMAGE PROVIDED. Create a new image in the EXACT same artistic style as the reference: "${style}". The main character, "${subject}", MUST be IDENTICAL to the character in the reference image. Pay extreme attention to the subject's physical attributes: facial structure, hair style and color (e.g., bald, long hair), skin tone, and clothing. Replicate these features with the highest possible fidelity. The subject in the new image must be unmistakably the same individual. The new scene should depict this part of the story: "${storySegment}"`;
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 second

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await getAI().models.generateContent({
                model,
                contents: { parts: [originalImagePart, { text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            // Safety check to prevent crash if the API returns no candidates or parts
            if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
                console.warn(`No valid image content returned from the AI service for this segment. (Attempt ${attempt + 1})`);
                if (attempt < MAX_RETRIES) {
                    const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
                    console.log(`Retrying image generation in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                return null;
            }

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  return part.inlineData.data;
                }
            }
            return null;

        } catch(error: any) {
            console.error(`Error generating image for segment (Attempt ${attempt + 1}):`, error);

            // Check if it's a 503 Service Unavailable error
            if (error.message && error.message.includes('503') && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY * Math.pow(2, attempt); // Exponential backoff
                console.log(`Model is overloaded. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // If it's the last attempt or not a retryable error, return null
            if (attempt === MAX_RETRIES) {
                console.error("Failed to generate image for segment after retries.");
                return null;
            }
        }
    }

    return null;
};


export const generateSegmentedStoryWithImages = async (
    imageDataUrl: string,
    config: StoryConfig
): Promise<StoryData> => {
    const MAX_RETRIES = 2; // Original attempt + 2 retries
    const BASE_DELAY = 1000; // 1 second

    // Validate image data URL
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        throw new Error('Invalid image data URL format');
    }

    // Check image size (max 5MB for base64 data)
    if (imageDataUrl.length > 5 * 1024 * 1024) {
        console.warn('Image data is very large, which may cause issues with the AI service');
    }

    // Debug log the image data URL
    console.log('Image data URL length:', imageDataUrl.length);
    console.log('Image data URL starts with:', imageDataUrl.substring(0, 50));

    // More robust MIME type extraction that handles different data URL formats
    const mimeTypeMatch = imageDataUrl.match(/data:([^;]+)(?:;base64)?,/);
    console.log('MIME type match result:', mimeTypeMatch);
    const mimeType = mimeTypeMatch?.[1] || 'image/jpeg';
    console.log('Extracted MIME type:', mimeType);
    let imagePart;

    try {
        imagePart = fileToGenerativePart(imageDataUrl, mimeType);
    } catch (error) {
        console.error('Error processing image data:', error);
        throw new Error('Failed to process image data for AI service');
    }

    const style = await analyzeImageStyle(imagePart);
    const finalConfig = { ...config, style };

    const storySegments = await generateStorySegments(imagePart, finalConfig);

    if (!storySegments || storySegments.length === 0) {
        throw new Error("Story segments could not be generated.");
    }

    // Initial image generation attempt
    let imagePromises = storySegments.map(segment =>
        generateImageForSegment(imagePart, segment, finalConfig.subject, finalConfig.style!)
    );
    let generatedImages = await Promise.all(imagePromises);

    // Retry logic for failed images
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const failedIndices: number[] = [];
        generatedImages.forEach((img, index) => {
            if (!img) {
                failedIndices.push(index);
            }
        });

        if (failedIndices.length === 0) {
            break; // All images generated successfully
        }

        console.log(`Image generation failed for ${failedIndices.length} segments. Retrying... (Attempt ${attempt + 1})`);

        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));

        const retryPromises = failedIndices.map(index =>
            generateImageForSegment(imagePart, storySegments[index], finalConfig.subject, finalConfig.style!)
        );

        const retriedImages = await Promise.all(retryPromises);

        // Fill in the successfully retried images
        failedIndices.forEach((originalIndex, retryIndex) => {
            if (retriedImages[retryIndex]) {
                generatedImages[originalIndex] = retriedImages[retryIndex];
            }
        });
    }

    // Generate story title
    const title = await generateStoryTitle(imagePart, finalConfig, storySegments);

    const storyParts: StoryPart[] = storySegments.map((segment, index) => ({
        text: segment,
        image: generatedImages[index] ? `data:image/png;base64,${generatedImages[index]}` : null,
    }));

    return { title, storyParts };
};
