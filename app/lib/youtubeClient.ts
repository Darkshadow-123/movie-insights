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

const MIN_COMMENT_LENGTH = 10;
const MAX_COMMENTS = 10;
const COMMENT_MAX_RESULTS = 50;

export class YouTubeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.youtube.apiKey;
    this.baseUrl = config.youtube.baseUrl;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  async getTrailerWithComments(title: string, year: string): Promise<YouTubeResult> {
    if (!this.isConfigured()) {
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
      
      const searchUrl = `${this.baseUrl}${config.youtube.searchEndpoint}?part=snippet&q=${encodedQuery}&type=video&videoCategoryId=${config.youtube.videoCategoryId}&maxResults=1&key=${this.apiKey}`;

      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
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

      if ('error' in searchData) {
        const errorCode = searchData.error.code;
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

      if (!searchData.items || searchData.items.length === 0) {
        return {
          trailerId: null,
          comments: { videoId: '', comments: [], totalCount: 0 },
          status: 'trailer_not_found',
          statusMessage: 'No trailer found for this movie'
        };
      }

      const trailerId = searchData.items[0].id.videoId;

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

      if (!commentsData.items || commentsData.items.length === 0) {
        return {
          trailerId,
          comments: { videoId: trailerId, comments: [], totalCount: 0 },
          status: 'success',
          statusMessage: 'No comments available'
        };
      }

      let rawComments: FilteredComment[] = [];
      try {
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
      return {
        trailerId: null,
        comments: { videoId: '', comments: [], totalCount: 0, error: 'Failed to connect to YouTube API' },
        status: 'error',
        statusMessage: 'Failed to connect to YouTube API'
      };
    }
  }

  private filterComments(comments: FilteredComment[]): FilteredComment[] {
    return comments
      .filter(comment => comment.text.length > MIN_COMMENT_LENGTH)
      .slice(0, MAX_COMMENTS);
  }
}

export const youtubeClient = new YouTubeClient();
