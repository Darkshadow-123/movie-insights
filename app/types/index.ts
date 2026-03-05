export interface MovieData {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  Poster: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Language?: string;
  sentiment?: SentimentData;
  trailerId?: string | null;
  trailerComments?: TrailerComments | null;
  youtubeStatus?: YouTubeStatus;
  youtubeMessage?: string;
  castAndCrew?: CastData;
}

export interface CastMember {
  id: string;
  name: string;
  character: string;
  image: string | null;
  imageHeight: number;
  imageWidth: number;
}

export interface CastData {
  cast: CastMember[];
  error?: string;
}

export type SentimentType = 'positive' | 'mixed' | 'negative';

export interface SentimentData {
  classification: SentimentType;
  positive: number;
  mixed: number;
  negative: number;
  summary: string;
}

export interface OmdbApiResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  Poster: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Response: string;
  Error?: string;
}

export interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeSearchItem[];
}

export interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime: string;
  };
}

export interface YouTubeApiError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

export interface YouTubeCommentThreadResponse {
  kind: string;
  etag: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: YouTubeCommentThread[];
}

export interface YouTubeCommentThread {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    channelId: string;
    videoId: string;
    topLevelComment: YouTubeComment;
    canReply: boolean;
    totalReplyCount: number;
    isPublic: boolean;
  };
}

export interface YouTubeComment {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    channelId: string;
    videoId: string;
    textDisplay: string;
    textOriginal: string;
    authorDisplayName: string;
    authorChannelId: {
      value: string;
    };
    authorChannelUrl: string;
    canRate: boolean;
    viewerRating: string;
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
  };
}

export interface FilteredComment {
  text: string;
  author: string;
  likeCount: number;
  publishedAt: string;
}

export interface TrailerComments {
  videoId: string;
  comments: FilteredComment[];
  totalCount: number;
  error?: string;
}

export type YouTubeStatus = 
  | 'success'
  | 'no_api_key'
  | 'trailer_not_found'
  | 'comments_disabled'
  | 'quota_exceeded'
  | 'error';

export interface YouTubeResult {
  trailerId: string | null;
  comments: TrailerComments;
  status: YouTubeStatus;
  statusMessage?: string;
}
