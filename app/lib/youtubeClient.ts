import { config } from './config';
import { 
  YouTubeSearchResponse, 
  YouTubeApiError, 
  YouTubeCommentThreadResponse,
  FilteredComment,
  YouTubeResult
} from '../types';

// Minimum comment length to filter out spam/incomplete comments
const MIN_COMMENT_LENGTH = 15; // was 10 — raised slightly since spam-pattern filtering now catches short junk too
// Maximum number of comments to return after filtering (was 10)
// Fewer, higher-signal comments carry roughly the same sentiment signal
// at a lower token cost — see README "Token Optimization" section.
const MAX_COMMENTS = 10;
// Number of comments to request from YouTube API (will be filtered down)
const COMMENT_MAX_RESULTS = 50;

// Patterns that indicate spam/noise rather than genuine sentiment.
// Kept as a small, explicit list rather than a heavier NLP pass —
// this is a cheap pre-filter, not a classifier.
const SPAM_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /subscribe/i,
  /check out my channel/i,
  /^first$/i,
  /^\d+(st|nd|rd|th)$/i,
];

// Matches most common emoji ranges. Emoji rarely add sentiment signal
// beyond what the surrounding text already conveys, and they're
// token-expensive relative to their information content.
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function cleanCommentText(text: string): string {
  return text
    .replace(EMOJI_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSpam(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

function filterComments(comments: FilteredComment[]): FilteredComment[] {
  return comments
    .map(comment => ({ ...comment, text: cleanCommentText(comment.text) }))
    .filter(comment => comment.text.length > MIN_COMMENT_LENGTH && !isSpam(comment.text))
    // Rank by engagement so the comments that make it into the prompt
    // are the ones most likely to reflect actual audience sentiment,
    // not just whatever YouTube's relevance ordering returned first.
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, MAX_COMMENTS);
}

export async function getTrailerWithComments(title: string, year: string): Promise<YouTubeResult> {
  const apiKey = config.youtube.apiKey;
  const baseUrl = config.youtube.baseUrl;

  if (!apiKey || apiKey.trim() === '') {
    return {
      trailerId: null,
      comments: { videoId: '', comments: [], totalCount: 0, error: 'YouTube API key not configured' },
      status: 'no_api_key',
      statusMessage: 'YouTube API key not configured'
    };
  }

  try {
    const query = `${title} ${year} official trailer`;
    const encodedQuery = encodeURIComponent(query);
    
    const searchUrl = `${baseUrl}${config.youtube.searchEndpoint}?part=snippet&q=${encodedQuery}&type=video&videoCategoryId=${config.youtube.videoCategoryId}&maxResults=1&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl, { next: { revalidate: 86400 } });
    
    if (!searchResponse.ok) {
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0, error: `HTTP error: ${searchResponse.status}` },
        status: searchResponse.status === 403 ? 'quota_exceeded' : 'error',
        statusMessage: searchResponse.status === 403 ? 'YouTube API quota exceeded' : `YouTube API error: ${searchResponse.status}`
      };
    }

    const searchData: YouTubeSearchResponse | YouTubeApiError = await searchResponse.json();

    if ('error' in searchData) {
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0, error: searchData.error.message },
        status: searchData.error.code === 403 || searchData.error.code === 429 ? 'quota_exceeded' : 'error',
        statusMessage: searchData.error.message
      };
    }

    if (!searchData.items || searchData.items.length === 0) {
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0 },
        status: 'trailer_not_found',
        statusMessage: 'No trailer found for this movie'
      };
    }

    const trailerId = searchData.items[0].id.videoId;

    const commentsUrl = `${baseUrl}/commentThreads?part=snippet&videoId=${trailerId}&maxResults=${COMMENT_MAX_RESULTS}&textFormat=plainText&order=relevance&key=${apiKey}`;
    const commentsResponse = await fetch(commentsUrl, { next: { revalidate: 86400 } });

    if (!commentsResponse.ok) {
      return {
        trailerId,
        comments: { videoId: trailerId, comments: [], totalCount: 0, error: `HTTP error: ${commentsResponse.status}` },
        status: 'comments_disabled',
        statusMessage: commentsResponse.status === 403 ? 'YouTube API quota exceeded or comments disabled' : `YouTube API error: ${commentsResponse.status}`
      };
    }

    const commentsData: YouTubeCommentThreadResponse | YouTubeApiError = await commentsResponse.json();

    if ('error' in commentsData) {
      return {
        trailerId,
        comments: { videoId: trailerId, comments: [], totalCount: 0, error: commentsData.error.message },
        status: commentsData.error.code === 403 || commentsData.error.code === 429 ? 'quota_exceeded' : 'comments_disabled',
        statusMessage: 'YouTube API quota exceeded or comments disabled'
      };
    }

    if (!commentsData.items || commentsData.items.length === 0) {
      return {
        trailerId,
        comments: { videoId: trailerId, comments: [], totalCount: 0 },
        status: 'success',
        statusMessage: 'No comments available'
      };
    }

    const rawComments: FilteredComment[] = commentsData.items.map(item => ({
      text: item.snippet.topLevelComment.snippet.textDisplay,
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
    }));

    const filteredComments = filterComments(rawComments);

    return {
      trailerId,
      comments: {
        videoId: trailerId,
        comments: filteredComments,
        totalCount: commentsData.pageInfo.totalResults || 0
      },
      status: 'success'
    };
  } catch (error) {
    return {
      trailerId: null,
      comments: { videoId: '', comments: [], totalCount: 0, error: 'Failed to connect to YouTube API' },
      status: 'error',
      statusMessage: 'Failed to connect to YouTube API'
    };
  }
}