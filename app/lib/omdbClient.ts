import { config } from './config';
import { OmdbApiResponse } from '../types';

export class OmdbClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.omdb.apiKey;
    this.baseUrl = config.omdb.baseUrl;
  }

  async getMovieById(imdbId: string): Promise<OmdbApiResponse> {
    const url = `${this.baseUrl}?i=${imdbId}&plot=full&apikey=${this.apiKey}`;
    const response = await fetch(url);
    const data: OmdbApiResponse = await response.json();
    return data;
  }

  async searchByTitle(title: string): Promise<OmdbApiResponse> {
    const url = `${this.baseUrl}?t=${encodeURIComponent(title)}&plot=full&apikey=${this.apiKey}`;
    const response = await fetch(url);
    const data: OmdbApiResponse = await response.json();
    return data;
  }
}

export const omdbClient = new OmdbClient();
