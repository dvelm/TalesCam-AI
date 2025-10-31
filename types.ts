
export enum AppState {
  HOME,
  CAMERA_VIEW,
  CONFIG_VIEW,
  STORY_VIEW,
}

export enum ConfigStep {
  SUBJECT,
  POSITION,
  TYPE,
  LANGUAGE,
  CONFIRM,
}

export interface StoryPart {
  text: string;
  image: string | null; // base64 string
}

export interface StoryData {
  title: string;
  storyParts: StoryPart[];
}


export interface Command {
  command: string | string[];
  callback: (...args: any[]) => void;
  isFuzzyMatch?: boolean;
  matchInterim?: boolean;
  bestMatchOnly?: boolean;
}

export type StoryPosition = 'start' | 'middle' | 'end';
export type StoryType = 'context' | 'custom';

export interface StoryConfig {
    subject: string;
    position: StoryPosition;
    type: StoryType;
    language: string;
    customPrompt?: string;
    contextStyle?: string;
    style?: string; // To hold the analyzed style
    autoPlayAudio?: boolean; // To control automatic text-to-speech playback
}