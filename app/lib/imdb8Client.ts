import { config } from './config';
import { CastData, CastMember } from '../types';

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

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  async getCastAndCrew(imdbId: string): Promise<CastData> {
    if (!this.isConfigured()) {
      return {
        cast: [],
        error: 'RapidAPI key not configured'
      };
    }

    try {
      const url = `${this.baseUrl}/title/v2/get-top-cast-and-crew`;
      
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

      if (!data?.data?.title) {
        return {
          cast: [],
          error: 'No cast data found'
        };
      }

      const title = data.data.title;
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

  private extractCast(title: any): CastMember[] {
    const cast: CastMember[] = [];
    const seenIds = new Set<string>();
    
    const principalCredits = title.principalCredits || [];
    
    for (const creditGroup of principalCredits) {
      const credits = creditGroup.credits || [];
      for (const person of credits) {
        if (!person) continue;
        
        const typename = person.__typename || '';
        if (typename !== 'Cast') continue;
        
        const name = person.name;
        if (!name) continue;

        const personId = name.id || '';
        if (personId && seenIds.has(personId)) continue;
        if (personId) seenIds.add(personId);

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
