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

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  private parseAIResponse(text: string): SentimentData {
    try {
      let cleaned = text.trim();
      
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();
      
      const parsed = JSON.parse(cleaned);
      
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

  async analyzeCombined(title: string, plot: string, rating: string, comments: FilteredComment[]): Promise<SentimentData> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    let context = `Movie: "${title}" (IMDb Rating: ${rating}/10)\nPlot: ${plot}`;

    if (comments.length > 0) {
      const commentsList = comments.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
      context += `\n\nYouTube Trailer Comments:\n${commentsList}`;
    }

    const prompt = `Analyze the overall audience sentiment for this movie. Consider both the movie's plot and IMDb rating, as well as actual YouTube trailer comments from viewers (if available).\n\n${context}\n\nProvide a JSON response with:\n- classification: \"positive\", \"mixed\", or \"negative\" - overall sentiment combining both sources\n- positive: percentage (0-100)\n- mixed: percentage (0-100)\n- negative: percentage (0-100)\n- summary: A 3-4 sentence summary of audience sentiment combining insights from the movie's plot/rating and real YouTube comments\n\nReturn ONLY valid JSON, no other text.`;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates from AI');
    }

    const candidate = response.candidates[0];
    
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`AI response blocked: ${candidate.finishReason}`);
    }

    if (!candidate.content?.parts?.[0]?.text) {
      throw new Error('Empty content from AI');
    }

    const text = candidate.content.parts[0].text.trim();
    if (!text) {
      throw new Error('Empty response from AI');
    }
    
    return this.parseAIResponse(text);
  }

  getFallbackSentiment(rating: string, plot: string): SentimentData {
    const ratingNum = parseFloat(rating) || 0;
    
    let positive = 0;
    let negative = 0;
    let mixed = 0;

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

    const plotLower = plot.toLowerCase();
    const positiveWords = ['love', 'great', 'amazing', 'beautiful', 'hero', 'success', 'win', 'hope', 'family', 'friend', 'happy', 'legendary', 'epic', 'masterpiece'];
    const negativeWords = ['kill', 'death', 'destroy', 'war', 'evil', 'dark', 'tragedy', 'horror', 'fight', 'blood', 'murder', 'terror', 'danger', 'threat'];

    positiveWords.forEach(word => {
      if (plotLower.includes(word)) positive += 3;
    });
    negativeWords.forEach(word => {
      if (plotLower.includes(word)) negative += 3;
    });

    const total = positive + negative;
    if (total > 0) {
      positive = Math.min(95, Math.round((positive / (positive + negative + 20)) * 100));
      negative = Math.min(95, Math.round((negative / (positive + negative + 20)) * 100));
      mixed = 100 - positive - negative;
    }

    let classification: 'positive' | 'mixed' | 'negative';
    if (ratingNum >= 7.0) {
      classification = 'positive';
    } else if (ratingNum >= 5.0) {
      classification = 'mixed';
    } else {
      classification = 'negative';
    }

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
