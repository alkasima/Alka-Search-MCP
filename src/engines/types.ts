/** Common interface for search engine results */
export interface SearchResult {
  title: string;
  url: string;
  /** Plain text snippet/description of the result */
  snippet: string;
}

/** What an engine can return */
export interface EngineSearchResponse {
  results: SearchResult[];
  /** True if we detected a CAPTCHA or block page */
  blocked: boolean;
}

/**
 * Every engine module exports a `search` function matching this type.
 * It receives the query string and an AbortSignal for timeout control.
 */
export type EngineSearchFn = (query: string, signal: AbortSignal) => Promise<EngineSearchResponse>;