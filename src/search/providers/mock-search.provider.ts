import { Injectable } from '@nestjs/common';
import {
  SearchProvider,
  SearchResultItem,
} from '../interfaces/search-provider.interface';

@Injectable()
export class MockSearchProvider implements SearchProvider {
  async search(query: string): Promise<SearchResultItem[]> {
    return [
      {
        title: `Mock Result 1 for "${query}"`,
        url: 'https://example.com/result-1',
        snippet: `This is a mock search snippet providing information about "${query}".`,
      },
      {
        title: `Mock Result 2 for "${query}"`,
        url: 'https://example.com/result-2',
        snippet: `Additional mock search details and documentation related to "${query}".`,
      },
      {
        title: `Mock Result 3 for "${query}"`,
        url: 'https://example.com/result-3',
        snippet: `Further sample resources and references regarding "${query}".`,
      },
    ];
  }
}
