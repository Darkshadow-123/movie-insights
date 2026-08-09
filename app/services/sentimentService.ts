import { GoogleGenAI, Type } from '@google/genai';
import { unstable_cache } from 'next/cache';
import { config } from '../lib/config';
import { SentimentData, FilteredComment } from '../types';

function parseAIResponse(text: string): SentimentData {
  try {
    // With responseSchema enforced below, Gemini's output is guaranteed
    // valid JSON with no markdown fences — but we keep this stripping
    // logic as a defensive fallback in case the SDK/model version changes.
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

// Explicit schema, enforced by the Gemini API itself (responseMimeType +
// responseSchema) instead of being spelled out as instructions inside the
// prompt text. This removes ~150 tokens of "Provide a JSON response
// with..." boilerplate from every call and removes the malformed-JSON
// failure mode that parseAIResponse's try/catch was defending against.
const SENTIMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    classification: {
      type: Type.STRING,
      enum: ['positive', 'mixed', 'negative'],
      description: 'Overall sentiment combining plot/rating and comments',
    },
    positive: { type: Type.NUMBER, description: 'Percentage 0-100' },
    mixed: { type: Type.NUMBER, description: 'Percentage 0-100' },
    negative: { type: Type.NUMBER, description: 'Percentage 0-100' },
    summary: {
      type: Type.STRING,
      description: '3-4 sentence summary of audience sentiment',
    },
  },
  required: ['classification', 'positive', 'mixed', 'negative', 'summary'],
};

async function callGemini(
  title: string,
  plot: string,
  rating: string,
  comments: FilteredComment[]
): Promise<SentimentData> {
  console.log('[gemini] callGemini invoked');
  const apiKey = config.gemini.apiKey;
  const model = config.gemini.model;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  let context = `Movie: "${title}" (IMDb Rating: ${rating}/10)\nPlot: ${plot}`;

  if (comments.length > 0) {
    const commentsList = comments.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
    context += `\n\nYouTube Trailer Comments:\n${commentsList}`;
  }

  // Schema/format instructions removed from the prompt text — they now
  // live in `config.responseSchema` below instead.
  const prompt = `Analyze the overall audience sentiment for this movie. Consider both the movie's plot and IMDb rating, as well as actual YouTube trailer comments from viewers (if available).

${context}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: SENTIMENT_SCHEMA,
    },
  });

  // Log real token usage so before/after numbers in the README are
  // measured, not estimated. Cheap to leave in; delete before shipping
  // if you don't want it in production logs.
  if (response.usageMetadata) {
    console.log(
      `[gemini] prompt tokens: ${response.usageMetadata.promptTokenCount}, ` +
      `output tokens: ${response.usageMetadata.candidatesTokenCount}`
    );
  }

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

  return parseAIResponse(text);
}

// Wraps the Gemini call in Next.js's data cache, keyed by movie title +
// rating (a stable proxy for movie identity here). Repeat visits to the
// same movie page — by the same user or different users — hit the cache
// instead of re-spending tokens. This is the single highest-leverage
// change for this app: token reduction per call helps, but eliminating
// *redundant* calls entirely is a much bigger lever for a page that gets
// revisited. Revalidates every 7 days since sentiment for a given movie
// doesn't meaningfully change day to day.
export function analyzeCombined(
  title: string,
  plot: string,
  rating: string,
  comments: FilteredComment[]
): Promise<SentimentData> {
  const cached = unstable_cache(
    async () => callGemini(title, plot, rating, comments),
    ['sentiment', title, rating],
    { revalidate: 60 * 60 * 24 * 7, tags: ['sentiment'] }
  );
  return cached();
}

export function getFallbackSentiment(rating: string, plot: string): SentimentData {
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