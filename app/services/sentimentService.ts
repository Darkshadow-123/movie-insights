import { GoogleGenAI, Type } from '@google/genai';
import { unstable_cache } from 'next/cache';
import { config } from '../lib/config';
import { SentimentData, FilteredComment } from '../types';

function parseAIResponse(text: string): SentimentData {
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

const inFlightRequests = new Map<string, Promise<SentimentData>>();

const REDIS_LOCK_TTL_MS = 20_000;       // 20 seconds lock TTL (Emergency cleanup)
const REDIS_RESULT_HANDOFF_TTL_S = 604800; // 7 days persistent cache
const REDIS_POLL_INTERVAL_MS = 150;      // Poll Redis every 150ms for instant handoff
const REDIS_MAX_WAIT_MS = 10_000;        // 10 seconds max wait cap (Optimal completion vs UX balance)


async function withDistributedLock(
  key: string,
  compute: () => Promise<SentimentData>
): Promise<SentimentData> {
  console.log(
    '[debug] UPSTASH_REDIS_REST_URL present:', !!process.env.UPSTASH_REDIS_REST_URL,
    '| UPSTASH_REDIS_REST_TOKEN present:', !!process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return compute();
  }

  const lockKey = `lock:sentiment:${key}`;
  const resultKey = `result:sentiment:${key}`;

  // 1. Check if result is ALREADY cached in Redis from a previous run (7-day persistent cache)
  try {
    const { redis } = await import('../lib/redis');
    const preCached = await redis.get<SentimentData>(resultKey);
    if (preCached) {
      console.log(`[source:redis-cache-hit] retrieved 7-day persistent result from Upstash Redis for "${key}"`);
      return preCached;
    }
  } catch (err) {
    console.error('[redis] pre-lock cache check failed, proceeding to lock:', err);
  }

  let token: string | null = null;
  try {
    const { acquireLock } = await import('../lib/distributedLock');
    token = await acquireLock(lockKey, REDIS_LOCK_TTL_MS);
  } catch (err) {
    console.error('[redis] lock acquire failed, proceeding without distributed coordination:', err);
    return compute();
  }

  if (token) {
    console.log(`[redis] acquired lock for "${key}"`);
    try {
      console.log(`[source:gemini-live-call] firing live Gemini API call for "${key}"`);
      const result = await compute();
      const { redis } = await import('../lib/redis');
      redis
        .set(resultKey, result, { ex: REDIS_RESULT_HANDOFF_TTL_S })
        .catch((err) => console.error('[redis] result handoff write failed:', err));
      return result;
    } finally {
      const { releaseLock } = await import('../lib/distributedLock');
      await releaseLock(lockKey, token)
        .then(() => console.log(`[redis] released lock for "${key}"`))
        .catch((err) =>
          console.error('[redis] lock release failed (will expire via TTL):', err)
        );
    }
  }

  const { redis } = await import('../lib/redis');
  const deadline = Date.now() + REDIS_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, REDIS_POLL_INTERVAL_MS));
    const cached = await redis.get<SentimentData>(resultKey).catch(() => null);
    if (cached) {
      console.log(`[source:redis-handoff] retrieved result from Upstash Redis handoff for "${key}"`);
      return cached;
    }
  }

  console.error('[redis] wait for in-flight result timed out, computing independently');
  return compute();
}

export function analyzeCombined(
  title: string,
  plot: string,
  rating: string,
  comments: FilteredComment[]
): Promise<SentimentData> {
  const key = `${title}::${rating}`;

  const existing = inFlightRequests.get(key);
  if (existing) {
    console.log(`[source:in-flight-memory] reusing active in-memory Promise for "${key}"`);
    return existing;
  }

  const cached = unstable_cache(
    async () => withDistributedLock(key, () => callGemini(title, plot, rating, comments)),
    ['sentiment', title, rating],
    { revalidate: 60 * 60 * 24 * 7, tags: ['sentiment'] }
  );

  const promise = cached().then((res) => {
    console.log(`[source:nextjs-cache-hit] returned result for "${key}"`);
    return res;
  }).finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
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