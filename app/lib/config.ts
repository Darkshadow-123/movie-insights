export const config = {
  omdb: {
    apiKey: process.env.OMDB_API_KEY || '',
    baseUrl: 'https://www.omdbapi.com/',
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    searchEndpoint: '/search',
    videoCategoryId: 1,
  },
  rapidApi: {
    imdb8: {
      apiKey: process.env.RAPIDAPI_KEY || '',
      apiHost: 'imdb8.p.rapidapi.com',
      baseUrl: 'https://imdb8.p.rapidapi.com',
    }
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
  },
} as const;

export const apiKeys = {
  omdb: process.env.OMDB_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  rapidApi: process.env.RAPIDAPI_KEY,
};
