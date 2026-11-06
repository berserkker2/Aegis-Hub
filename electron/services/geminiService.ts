import { RecommendedGame } from '../src/types/game';
import { lookupGameArtwork } from './artworkService';
import { gameDiscoveryService } from './gameDiscoveryService';

interface GeminiAiGameResponse {
  title: string;
  releaseYear?: number;
  genres?: string[];
  platforms?: string[];
  rating?: number;
  reason: string;
  stores?: string[]; // e.g. ['Steam', 'Epic Games', 'GOG']
}

export class GeminiService {
  /**
   * Queries Gemini Flash for natural language game recommendations
   * with controlled variety and high-rating enforcement.
   */
  public async getAiRecommendations(
    userPrompt: string,
    apiKey: string,
    options?: { excludeTitles?: string[]; filterAdult?: boolean }
  ): Promise<{ games: RecommendedGame[]; error?: string }> {
    if (!apiKey?.trim()) {
      return {
        games: [],
        error: 'Please enter your Google Gemini API Key in Settings to use AI Game Search.',
      };
    }

    const cleanPrompt = userPrompt.trim();
    if (!cleanPrompt) {
      return { games: [] };
    }

    const excludeTitles = (options?.excludeTitles || []).filter(Boolean);
    const filterAdult = options?.filterAdult !== false;

    try {
      const exclusionClause =
        excludeTitles.length > 0
          ? `\nVARIETY & ROTATION RULE: The user just saw these recommendations: [${excludeTitles.slice(0, 12).join(', ')}].
To keep recommendations fresh and engaging on repeated clicks, replace at least 60-75% of those titles with OTHER critically acclaimed or high-scoring games (rating >= 78) that strongly match the user's request. You may keep at most 2-3 absolute must-play classics from the previous list if they are essential matches, and vary the presentation order.`
          : `\nVARIETY & QUALITY RULE: Select a compelling mix of iconic top-rated hits and critically acclaimed fresh picks / hidden gems that strongly fit the prompt. Every recommended game MUST be a genuine, well-received game (rating >= 75, ideally 80-97) and strongly match the prompt's theme/mechanics. Do not sort strictly from most famous to least famous; arrange them in an organic, engaging order.`;

      const adultClause = filterAdult
        ? `\nCONTENT FILTER: Do NOT include adult-only, NSFW, erotic, or hentai games.`
        : '';

      const systemInstruction = `You are a knowledgeable video game recommendation engine.
When a user asks for game recommendations using natural language, understand their preferences (genres, mood, gameplay mechanics, difficulty, setting, similarities to other games).
Return a JSON array of 10 recommended games that best match the query while maintaining high review scores (rating >= 75).${exclusionClause}${adultClause}

For each game provide:
- "title": exact official title of the game
- "releaseYear": release year (number)
- "genres": array of 2 to 4 specific genres/tags (e.g. ["Action RPG", "Souls-like", "Dark Fantasy"])
- "platforms": array of platforms (e.g. ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X|S"])
- "rating": accurate Metacritic/Steam score 0-100 (number, prioritize games >= 78)
- "reason": concise, compelling 1-2 sentence explanation tailored specifically to why this game matches the user's prompt
- "stores": array of PC stores where the game is sold, from: ["Steam", "Epic Games", "GOG"]

IMPORTANT: Output ONLY the raw JSON array inside a standard JSON format, nothing else. Do not include markdown codeblocks or conversational text.`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nUser request: "${cleanPrompt}" (Variation seed: ${Math.floor(Math.random() * 10000)})`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 2048,
        },
      };

      // Models verified active and fast on Google AI Studio Free Tier
      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash-lite',
      ];

      let res: Response | null = null;
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        try {
          const attempt = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AegisHub/1.0',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(25000),
          });

          if (attempt.ok) {
            res = attempt;
            break; // Success!
          }

          const errBody = await attempt.json().catch(() => ({}));
          lastErrorMessage = errBody?.error?.message || `HTTP ${attempt.status}`;

          // If it's an API Key invalid error (400 or 403), no need to try other models
          if (attempt.status === 400 || attempt.status === 403) {
            return { games: [], error: `Gemini API Error: Invalid or expired API Key (${lastErrorMessage})` };
          }

          // Otherwise (e.g. 503 high demand, 429 rate limit, 404 model not found on account), continue to next model in list
          console.warn(`Model ${model} returned ${attempt.status}: ${lastErrorMessage}, trying next candidate...`);
        } catch (fetchErr: any) {
          lastErrorMessage = fetchErr?.message || 'Network error';
        }
      }

      if (!res || !res.ok) {
        return {
          games: [],
          error: `Gemini API: All candidate models are busy or temporarily unavailable (${lastErrorMessage}). Please retry in a few seconds.`,
        };
      }

      const data = await res.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON array even if wrapped in ```json
      let jsonString = textOutput.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }

      let parsed: GeminiAiGameResponse[] = [];
      try {
        parsed = JSON.parse(jsonString);
      } catch (jsonErr) {
        // Fallback simple regex extraction if model returned surrounding text
        const match = jsonString.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse Gemini JSON response');
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { games: [] };
      }

      // Enrich games with high-definition box art and store links
      const enrichedGames: RecommendedGame[] = await Promise.all(
        parsed.map(async (item, idx) => {
          const platforms = item.platforms && item.platforms.length > 0 ? item.platforms : ['PC'];
          const stores = gameDiscoveryService.generateStoreLinksForGame(item.title, platforms);

          // Attempt to find real cover image
          let coverUrl = '';
          let bannerUrl = '';
          try {
            const art = await lookupGameArtwork(item.title);
            if (art?.coverUrl) coverUrl = art.coverUrl;
            if (art?.bannerUrl) bannerUrl = art.bannerUrl;
          } catch {}

          if (!coverUrl) {
            coverUrl = `https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80`;
          }

          return {
            id: `gemini-rec-${idx}-${Date.now()}`,
            title: item.title,
            coverUrl,
            bannerUrl,
            rating: item.rating || 85,
            releaseDate: item.releaseYear ? String(item.releaseYear) : undefined,
            genres: item.genres || ['Action', 'Adventure'],
            platforms,
            stores,
            description: item.reason,
            aiRecommendationReason: item.reason,
          };
        })
      );

      const excludeSet = new Set(excludeTitles.map((t) => t.toLowerCase().trim()));
      const adultRegex = /\b(hentai|erotic|erotica|nsfw|porn|xxx|r18|r-18|waifu strip|strip poker|adult only|adults only)\b/i;

      const filteredAndShuffled = enrichedGames
        .filter((g) => {
          if (!filterAdult) return true;
          return !adultRegex.test(g.title) && !g.genres.some((ge) => adultRegex.test(ge));
        })
        .map((game) => {
          const rating = game.rating || 85;
          const wasRecentlyShown = excludeSet.has(game.title.toLowerCase().trim());
          // Controlled score: high ratings get a base boost, plus random jitter (0..18) so order varies organically
          const weight = rating + Math.random() * 18 - (wasRecentlyShown ? 12 : 0);
          return { game, weight };
        })
        .sort((a, b) => b.weight - a.weight)
        .map((item) => item.game);

      return { games: filteredAndShuffled };
    } catch (err: any) {
      console.error('Gemini Recommendation Error:', err);
      return {
        games: [],
        error: `Failed to consult Gemini AI: ${err?.message || 'Network timeout or API unreachable'}`,
      };
    }
  }
}

export const geminiService = new GeminiService();
