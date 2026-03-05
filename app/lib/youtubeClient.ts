import { config } from './config';
import { 
  YouTubeSearchResponse, 
  YouTubeApiError, 
  YouTubeCommentThreadResponse,
  TrailerComments,
  FilteredComment,
  YouTubeResult,
  YouTubeStatus
} from '../types';

// Minimum comment length to filter out spam/incomplete comments
const MIN_COMMENT_LENGTH = 10;
// Maximum number of comments to return after filtering
const MAX_COMMENTS = 10;
// Number of comments to request from YouTube API (will be filtered down)
const COMMENT_MAX_RESULTS = 50;

export class YouTubeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.youtube.apiKey;
    this.baseUrl = config.youtube.baseUrl;
  }

  // Check if YouTube API key is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  // Main method: search for movie trailer and fetch comments
  // Returns trailer ID, comments, and status information
  async getTrailerWithComments(title: string, year: string): Promise<YouTubeResult> {
    // Return early with error status if API key not configured
    if (!this.isConfigured()) {
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0, error: 'YouTube API key not configured' },
        status: 'no_api_key',
        statusMessage: 'YouTube API key not configured'
      };
    }

    try {
      // Step 1: Search for official trailer
      // Construct search query: "Movie Title Year official trailer"
      const query = `${title} ${year} official trailer`;
      const encodedQuery = encodeURIComponent(query);
      
      // Search for videos in "Movies" category (categoryId: 24)
      const searchUrl = `${this.baseUrl}${config.youtube.searchEndpoint}?part=snippet&q=${encodedQuery}&type=video&videoCategoryId=${config.youtube.videoCategoryId}&maxResults=1&key=${this.apiKey}`;

      const searchResponse = await fetch(searchUrl);
      
      // Handle HTTP-level errors
      if (!searchResponse.ok) {
        // 403 indicates quota exceeded
        if (searchResponse.status === 403) {
          return {
            trailerId: null,
            comments: { videoId: '', comments: [], totalCount: 0, error: 'Quota exceeded' },
            status: 'quota_exceeded',
            statusMessage: 'YouTube API quota exceeded'
          };
        }
        return {
          trailerId: null,
          comments: { videoId: '', comments: [], totalCount: 0, error: `HTTP error: ${searchResponse.status}` },
          status: 'error',
          statusMessage: `YouTube API error: ${searchResponse.status}`
        };
      }

      const searchData: YouTubeSearchResponse | YouTubeApiError = await searchResponse.json();

      // Handle YouTube API-level errors
      if ('error' in searchData) {
        const errorCode = searchData.error.code;
        // 403 or 429 indicates quota exceeded
        if (errorCode === 403 || errorCode === 429) {
          return {
            trailerId: null,
            comments: { videoId: '', comments: [], totalCount: 0, error: 'Quota exceeded' },
            status: 'quota_exceeded',
            statusMessage: 'YouTube API quota exceeded'
          };
        }
        return {
          trailerId: null,
          comments: { videoId: '', comments: [], totalCount: 0, error: searchData.error.message },
          status: 'error',
          statusMessage: searchData.error.message
        };
      }

      // No search results found
      if (!searchData.items || searchData.items.length === 0) {
        return {
          trailerId: null,
          comments: { videoId: '', comments: [], totalCount: 0 },
          status: 'trailer_not_found',
          statusMessage: 'No trailer found for this movie'
        };
      }

      // Extract trailer video ID from search results
      const trailerId = searchData.items[0].id.videoId;

      // Step 2: Fetch comments for the found video
      // Order by relevance (most liked comments first)
      const commentsUrl = `${this.baseUrl}/commentThreads?part=snippet&videoId=${trailerId}&maxResults=${COMMENT_MAX_RESULTS}&textFormat=plainText&order=relevance&key=${this.apiKey}`;
      const commentsResponse = await fetch(commentsUrl);

      if (!commentsResponse.ok) {
        if (commentsResponse.status === 403) {
          return {
            trailerId,
            comments: { videoId: trailerId, comments: [], totalCount: 0, error: 'Comments disabled or quota exceeded' },
            status: 'comments_disabled',
            statusMessage: 'YouTube API quota exceeded or comments disabled'
          };
        }
        return {
          trailerId,
          comments: { videoId: trailerId, comments: [], totalCount: 0, error: `HTTP error: ${commentsResponse.status}` },
          status: 'comments_disabled',
          statusMessage: `YouTube API error: ${commentsResponse.status}`
        };
      }

      const commentsData: YouTubeCommentThreadResponse | YouTubeApiError = await commentsResponse.json();

      // Handle comment API errors
      if ('error' in commentsData) {
        if (commentsData.error.code === 403 || commentsData.error.code === 429) {
          return {
            trailerId,
            comments: { videoId: trailerId, comments: [], totalCount: 0, error: 'Comments disabled or quota exceeded' },
            status: 'quota_exceeded',
            statusMessage: 'YouTube API quota exceeded or comments disabled'
          };
        }
        return {
          trailerId,
          comments: { videoId: trailerId, comments: [], totalCount: 0, error: commentsData.error.message },
          status: 'comments_disabled',
          statusMessage: 'Comments are disabled for this video'
        };
      }

      // No comments available
      if (!commentsData.items || commentsData.items.length === 0) {
        return {
          trailerId,
          comments: { videoId: trailerId, comments: [], totalCount: 0 },
          status: 'success',
          statusMessage: 'No comments available'
        };
      }

      // Step 3: Transform and filter comments
      let rawComments: FilteredComment[] = [];
      try {
        // Extract relevant fields from YouTube API response
        rawComments = commentsData.items.map(item => ({
          text: item.snippet.topLevelComment.snippet.textDisplay,
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          likeCount: item.snippet.topLevelComment.snippet.likeCount,
          publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        }));
      } catch (mapError) {
        return {
          trailerId,
          comments: { videoId: trailerId, comments: [], totalCount: 0, error: 'Failed to parse comments' },
          status: 'error',
          statusMessage: 'Failed to parse YouTube comments'
        };
      }

      // Filter out short/spam comments and limit count
      const filteredComments = this.filterComments(rawComments);

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
      // Network or unexpected errors
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0, error: 'Failed to connect to YouTube API' },
        status: 'error',
        statusMessage: 'Failed to connect to YouTube API'
      };
    }
  }

  // Filter comments: remove short comments and limit to max count
  private filterComments(comments: FilteredComment[]): FilteredComment[] {
    return comments
      .filter(comment => comment.text.length > MIN_COMMENT_LENGTH)
      .slice(0, MAX_COMMENTS);
  }
}

export const youtubeClient = new YouTubeClient();
