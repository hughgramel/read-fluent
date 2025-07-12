import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  channelName: string;
  description?: string;
  duration?: string;
  thumbnail?: string;
}

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface ProcessedTranscript {
  videoInfo: YouTubeVideoInfo;
  transcript: TranscriptEntry[];
  fullText: string;
  wordCount: number;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^#&?]*)/,
    /youtube\.com\/shorts\/([^#&?]*)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Fetch video information from YouTube
 */
export async function fetchVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  try {
    // Use the oEmbed API to get video information
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video information');
    }
    
    const data = await response.json();
    
    return {
      videoId,
      title: data.title || 'Unknown Title',
      channelName: data.author_name || 'Unknown Channel',
      description: data.description || '',
      thumbnail: data.thumbnail_url || '',
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    // Return basic info if oEmbed fails
    return {
      videoId,
      title: 'YouTube Video',
      channelName: 'Unknown Channel',
    };
  }
}

/**
 * Fetch transcript from YouTube video
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptEntry[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en', // Default to English, could be made configurable
    });
    
    return transcript.map((entry) => ({
      text: entry.text,
      start: entry.offset / 1000, // Convert to seconds
      duration: entry.duration / 1000, // Convert to seconds
    }));
  } catch (error) {
    console.error('Error fetching transcript:', error);
    
    // Try without language specification
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript.map((entry) => ({
        text: entry.text,
        start: entry.offset / 1000,
        duration: entry.duration / 1000,
      }));
    } catch (fallbackError) {
      console.error('Fallback transcript fetch failed:', fallbackError);
      throw new Error('Could not fetch transcript for this video. The video may not have captions available.');
    }
  }
}

/**
 * Process YouTube URL to get complete transcript data
 */
export async function processYouTubeUrl(url: string): Promise<ProcessedTranscript> {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
  }
  
  try {
    // Fetch video info and transcript concurrently
    const [videoInfo, transcript] = await Promise.all([
      fetchVideoInfo(videoId),
      fetchTranscript(videoId),
    ]);
    
    // Process transcript into full text
    const fullText = transcript
      .map(entry => entry.text)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Count words
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      videoInfo,
      transcript,
      fullText,
      wordCount,
    };
  } catch (error) {
    console.error('Error processing YouTube URL:', error);
    throw error;
  }
}

/**
 * Convert transcript to book format
 */
export function convertTranscriptToBook(processedTranscript: ProcessedTranscript) {
  const { videoInfo, fullText, wordCount } = processedTranscript;
  
  // Split text into manageable sections (approximately 2000 words per section)
  const wordsPerSection = 2000;
  const words = fullText.split(/\s+/);
  const sections = [];
  
  let currentSection = [];
  let currentWordCount = 0;
  
  for (const word of words) {
    currentSection.push(word);
    currentWordCount++;
    
    if (currentWordCount >= wordsPerSection) {
      sections.push(currentSection.join(' '));
      currentSection = [];
      currentWordCount = 0;
    }
  }
  
  // Add remaining words as the final section
  if (currentSection.length > 0) {
    sections.push(currentSection.join(' '));
  }
  
  // Create book sections
  const bookSections = sections.map((sectionText, index) => ({
    id: `section-${index + 1}`,
    title: `Part ${index + 1}`,
    content: `<div class="transcript-section">
      <p>${sectionText.replace(/\n/g, '</p><p>')}</p>
    </div>`,
    wordCount: sectionText.split(/\s+/).filter(word => word.length > 0).length,
  }));
  
  return {
    title: videoInfo.title,
    author: videoInfo.channelName,
    description: `YouTube transcript from: ${videoInfo.title}`,
    sections: bookSections,
    totalWords: wordCount,
    fileName: `youtube-${videoInfo.videoId}.json`,
    css: `
      .transcript-section {
        line-height: 1.6;
        font-size: 1.1em;
      }
      .transcript-section p {
        margin-bottom: 1em;
      }
    `,
    cover: videoInfo.thumbnail || '',
  };
}