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

console.log('[CONFIG] OMDB_API_KEY:', process.env.OMDB_API_KEY ? 'present' : 'MISSING');
console.log('[CONFIG] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'present' : 'MISSING');
console.log('[CONFIG] YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'present' : 'MISSING');
console.log('[CONFIG] RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY ? 'present' : 'MISSING');

export const apiKeys = {
  omdb: process.env.OMDB_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  rapidApi: process.env.RAPIDAPI_KEY,
};
