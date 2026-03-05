import { GoogleGenAI } from '@google/genai';
import { config } from '../lib/config';
import { SentimentData, FilteredComment } from '../types';

export class SentimentService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
  }

  // Check if Gemini API key is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  // Parse AI response - handles various formatting that AI might return
  // AI sometimes wraps JSON in markdown code blocks (```json or ```)
  private parseAIResponse(text: string): SentimentData {
    try {
      let cleaned = text.trim();
      
      // Remove markdown code block markers if present
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();
      
      // Parse JSON and validate required fields
      const parsed = JSON.parse(cleaned);
      
      // Return with defaults for any missing fields
      // Clamp percentages to 0-100 range
      return {
        classification: parsed.classification || 'mixed',
        positive: Math.min(100, Math.max(0, parsed.positive || 50)),
        mixed: Math.min(100, Math.max(0, parsed.mixed || 30)),
        negative: Math.min(100, Math.max(0, parsed.negative || 20)),
        summary: parsed.summary || 'Analysis unavailable.'
      };
    } catch (error) {
      throw new Error('Invalid JSON response from AI');
    }
  }

  // Main analysis method: combines movie metadata with YouTube comments
  // Uses AI to generate sentiment based on:
  // - Plot summary
  // - IMDb rating
  // - Real viewer comments from YouTube trailer
  async analyzeCombined(title: string, plot: string, rating: string, comments: FilteredComment[]): Promise<SentimentData> {
    // Check if API key is configured
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    // Build context string with movie info and optional comments
    let context = `Movie: "${title}" (IMDb Rating: ${rating}/10)\nPlot: ${plot}`;

    if (comments.length > 0) {
      // Include up to 10 YouTube comments for context
      const commentsList = comments.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
      context += `\n\nYouTube Trailer Comments:\n${commentsList}`;
    }

    // Detailed prompt instructing AI on expected output format
    const prompt = `Analyze the overall audience sentiment for this movie. Consider both the movie's plot and IMDb rating, as well as actual YouTube trailer comments from viewers (if available).\n\n${context}\n\nProvide a JSON response with:\n- classification: "positive", "mixed", or "negative" - overall sentiment combining both sources\n- positive: percentage (0-100)\n- mixed: percentage (0-100)\n- negative: percentage (0-100)\n- summary: A 3-4 sentence summary of audience sentiment combining insights from the movie's plot/rating and real YouTube comments\n\nReturn ONLY valid JSON, no other text.`;

    // Call Gemini AI API
    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    // Validate API response structure
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates from AI');
    }

    const candidate = response.candidates[0];
    
    // Check if response was blocked (safety filters, etc.)
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`AI response blocked: ${candidate.finishReason}`);
    }

    // Validate content exists
    if (!candidate.content?.parts?.[0]?.text) {
      throw new Error('Empty content from AI');
    }

    const text = candidate.content.parts[0].text.trim();
    if (!text) {
      throw new Error('Empty response from AI');
    }
    
    // Parse and return sentiment data
    return this.parseAIResponse(text);
  }

  // Fallback sentiment calculation when AI API is unavailable
  // Uses IMDb rating as primary signal with plot keyword analysis as secondary
  getFallbackSentiment(rating: string, plot: string): SentimentData {
    const ratingNum = parseFloat(rating) || 0;
    
    let positive = 0;
    let negative = 0;
    let mixed = 0;

    // Base sentiment from rating thresholds:
    // >= 7.0: Positive (75%)
    // 5.0-6.9: Mixed (30%)
    // < 5.0: Negative (65%)
    if (ratingNum >= 7.0) {
      positive = 75;
      mixed = 20;
      negative = 5;
    } else if (ratingNum >= 5.0) {
      positive = 30;
      mixed = 45;
      negative = 25;
    } else {
      positive = 10;
      mixed = 25;
      negative = 65;
    }

    // Adjust based on plot keywords
    // Keywords indicate genre/tone that might affect perception
    const plotLower = plot.toLowerCase();
    const positiveWords = ['love', 'great', 'amazing', 'beautiful', 'hero', 'success', 'win', 'hope', 'family', 'friend', 'happy', 'legendary', 'epic', 'masterpiece'];
    const negativeWords = ['kill', 'death', 'destroy', 'war', 'evil', 'dark', 'tragedy', 'horror', 'fight', 'blood', 'murder', 'terror', 'danger', 'threat'];

    // Increment sentiment for each keyword found (up to +3% per keyword)
    positiveWords.forEach(word => {
      if (plotLower.includes(word)) positive += 3;
    });
    negativeWords.forEach(word => {
      if (plotLower.includes(word)) negative += 3;
    });

    // Recalculate percentages with keyword adjustments
    // Use base mixed value (20) as normalizing factor
    const total = positive + negative;
    if (total > 0) {
      positive = Math.min(95, Math.round((positive / (positive + negative + 20)) * 100));
      negative = Math.min(95, Math.round((negative / (positive + negative + 20)) * 100));
      mixed = 100 - positive - negative;
    }

    // Final classification based on adjusted percentages
    let classification: 'positive' | 'mixed' | 'negative';
    if (ratingNum >= 7.0) {
      classification = 'positive';
    } else if (ratingNum >= 5.0) {
      classification = 'mixed';
    } else {
      classification = 'negative';
    }

    // Generate summary based on rating
    let summary = '';
    if (classification === 'positive') {
      summary = `With an impressive IMDb rating of ${rating}/10, this film has resonated strongly with audiences.`;
    } else if (classification === 'mixed') {
      summary = `Holding a moderate IMDb score of ${rating}/10, this movie presents a balanced mix of elements.`;
    } else {
      summary = `With a lower IMDb rating of ${rating}/10, this film struggled to connect with mainstream audiences.`;
    }

    return { classification, positive, mixed, negative, summary };
  }
}

export const sentimentService = new SentimentService();
