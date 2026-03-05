import { config } from './config';
import { CastData, CastMember } from '../types';

// Maximum number of cast members to return
const MAX_CAST_MEMBERS = 12;

export class Imdb8Client {
  private apiKey: string;
  private apiHost: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.rapidApi.imdb8.apiKey;
    this.apiHost = config.rapidApi.imdb8.apiHost;
    this.baseUrl = config.rapidApi.imdb8.baseUrl;
  }

  // Check if RapidAPI key is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  // Fetch cast and crew data for a movie using IMDb ID
  async getCastAndCrew(imdbId: string): Promise<CastData> {
    // Return early if API key not configured
    if (!this.isConfigured()) {
      return {
        cast: [],
        error: 'RapidAPI key not configured'
      };
    }

    try {
      const url = `${this.baseUrl}/title/v2/get-top-cast-and-crew`;
      
      // RapidAPI requires API key in headers
      const response = await fetch(`${url}?tconst=${imdbId}`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': this.apiHost
        }
      });

      if (!response.ok) {
        return {
          cast: [],
          error: response.status === 429 ? 'API quota exceeded' : `HTTP error: ${response.status}`
        };
      }

      const data = await response.json();

      // Validate response structure
      if (!data?.data?.title) {
        return {
          cast: [],
          error: 'No cast data found'
        };
      }

      const title = data.data.title;
      // Extract and process cast members
      const cast = this.extractCast(title);

      return {
        cast: cast.slice(0, MAX_CAST_MEMBERS)
      };
    } catch (error) {
      return {
        cast: [],
        error: 'Failed to fetch cast and crew'
      };
    }
  }

  // Extract and normalize cast data from IMDb API response
  // Handles two possible structures: principalCredits and credits.edges
  private extractCast(title: any): CastMember[] {
    const cast: CastMember[] = [];
    // Use Set to track seen IDs and avoid duplicates
    const seenIds = new Set<string>();
    
    // Primary source: principalCredits (main cast)
    const principalCredits = title.principalCredits || [];
    
    for (const creditGroup of principalCredits) {
      const credits = creditGroup.credits || [];
      for (const person of credits) {
        if (!person) continue;
        
        // Only process Cast members (filter out directors, writers, etc.)
        const typename = person.__typename || '';
        if (typename !== 'Cast') continue;
        
        const name = person.name;
        if (!name) continue;

        const personId = name.id || '';
        // Skip duplicate entries
        if (personId && seenIds.has(personId)) continue;
        if (personId) seenIds.add(personId);

        // Extract character name (some actors play multiple characters)
        const characters = person.characters?.map((c: any) => c?.name).filter(Boolean) || [];
        const character = characters[0] || '';

        cast.push({
          id: personId,
          name: name.nameText?.text || '',
          character: character,
          image: name.primaryImage?.url || null,
          imageHeight: name.primaryImage?.height || 0,
          imageWidth: name.primaryImage?.width || 0
        });
      }
    }

    // Secondary source: credits.edges (additional cast members)
    const creditsEdges = title.credits?.edges || [];
    for (const edge of creditsEdges) {
      const node = edge?.node;
      if (!node) continue;
      
      const typename = node.__typename || '';
      if (typename !== 'Cast') continue;
      
      const name = node.name;
      if (!name) continue;

      const personId = name.id || '';
      if (personId && seenIds.has(personId)) continue;
      if (personId) seenIds.add(personId);

      const characters = node.characters?.map((c: any) => c?.name).filter(Boolean) || [];
      const character = characters[0] || '';

      cast.push({
        id: personId,
        name: name.nameText?.text || '',
        character: character,
        image: name.primaryImage?.url || null,
        imageHeight: name.primaryImage?.height || 0,
        imageWidth: name.primaryImage?.width || 0
      });
    }

    return cast;
  }
}

export const imdb8Client = new Imdb8Client();
