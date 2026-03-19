import { config } from './config';
import { CastData, CastMember, RapidApiTitle, RapidApiCharacter } from '../types';

// Maximum number of cast members to return
const MAX_CAST_MEMBERS = 12;

function extractCast(title: RapidApiTitle): CastMember[] {
  const cast: CastMember[] = [];
  const seenIds = new Set<string>();
  
  const principalCredits = title.principalCredits || [];
  
  for (const creditGroup of principalCredits) {
    const credits = creditGroup.credits || [];
    for (const person of credits) {
      if (!person) continue;
      
      if (person.__typename !== 'Cast') continue;
      if (!person.name) continue;

      const personId = person.name.id || '';
      if (personId && seenIds.has(personId)) continue;
      if (personId) seenIds.add(personId);

      const characters = person.characters?.map((c: RapidApiCharacter) => c?.name).filter(Boolean) || [];

      cast.push({
        id: personId,
        name: person.name.nameText?.text || '',
        character: characters[0] || '',
        image: person.name.primaryImage?.url || null,
        imageHeight: person.name.primaryImage?.height || 0,
        imageWidth: person.name.primaryImage?.width || 0
      });
    }
  }

  const creditsEdges = title.credits?.edges || [];
  for (const edge of creditsEdges) {
    const node = edge?.node;
    if (!node || node.__typename !== 'Cast' || !node.name) continue;

    const personId = node.name.id || '';
    if (personId && seenIds.has(personId)) continue;
    if (personId) seenIds.add(personId);

    const characters = node.characters?.map((c: RapidApiCharacter) => c?.name).filter(Boolean) || [];

    cast.push({
      id: personId,
      name: node.name.nameText?.text || '',
      character: characters[0] || '',
      image: node.name.primaryImage?.url || null,
      imageHeight: node.name.primaryImage?.height || 0,
      imageWidth: node.name.primaryImage?.width || 0
    });
  }

  return cast;
}

export async function getCastAndCrew(imdbId: string): Promise<CastData> {
  const apiKey = config.rapidApi.imdb8.apiKey;
  const apiHost = config.rapidApi.imdb8.apiHost;
  const baseUrl = config.rapidApi.imdb8.baseUrl;

  if (!apiKey || apiKey.trim() === '') {
    return { cast: [], error: 'RapidAPI key not configured' };
  }

  try {
    const response = await fetch(`${baseUrl}/title/v2/get-top-cast-and-crew?tconst=${imdbId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      return {
        cast: [],
        error: response.status === 429 ? 'API quota exceeded' : `HTTP error: ${response.status}`
      };
    }

    const data = await response.json();

    if (!data?.data?.title) {
      return { cast: [], error: 'No cast data found' };
    }

    const cast = extractCast(data.data.title);
    return { cast: cast.slice(0, MAX_CAST_MEMBERS) };
  } catch (error) {
    return { cast: [], error: 'Failed to fetch cast and crew' };
  }
}
