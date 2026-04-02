/**
 * OpenAlex MCP — wraps the OpenAlex API (scholarly works, free, no auth)
 *
 * Tools:
 * - search_works: search scholarly works by keyword
 * - search_authors: search researchers/authors by name
 * - search_institutions: search academic institutions by name
 * - get_concept: look up an academic concept/field of study
 */

interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

const BASE = 'https://api.openalex.org';

// -- API Response Types --

type OpenAlexMeta = {
  count: number;
  db_response_time_ms: number;
  page: number;
  per_page: number;
};

type OpenAlexAuthorship = {
  author: { id: string; display_name: string; orcid: string | null };
  institutions: Array<{ id: string; display_name: string; country_code: string | null }>;
};

type OpenAlexConcept = {
  id: string;
  display_name: string;
  score?: number;
  level?: number;
};

type OpenAlexWork = {
  id: string;
  doi: string | null;
  title: string | null;
  display_name: string | null;
  publication_year: number | null;
  publication_date: string | null;
  type: string | null;
  open_access: { is_oa: boolean; oa_url: string | null } | null;
  authorships: OpenAlexAuthorship[];
  cited_by_count: number;
  concepts: OpenAlexConcept[];
  primary_location: {
    source: { display_name: string | null; issn: string[] | null } | null;
  } | null;
  abstract_inverted_index: Record<string, number[]> | null;
};

type OpenAlexAuthor = {
  id: string;
  display_name: string;
  orcid: string | null;
  works_count: number;
  cited_by_count: number;
  last_known_institution: {
    display_name: string | null;
    country_code: string | null;
  } | null;
  x_concepts: OpenAlexConcept[];
  updated_date: string | null;
};

type OpenAlexInstitution = {
  id: string;
  display_name: string;
  ror: string | null;
  country_code: string | null;
  type: string | null;
  works_count: number;
  cited_by_count: number;
  homepage_url: string | null;
  x_concepts: OpenAlexConcept[];
};

type OpenAlexConceptFull = {
  id: string;
  display_name: string;
  level: number;
  description: string | null;
  works_count: number;
  cited_by_count: number;
  ancestors: Array<{ id: string; display_name: string; level: number }>;
  related_concepts: Array<{ id: string; display_name: string; level: number; score: number }>;
};

type OpenAlexListResponse<T> = {
  meta: OpenAlexMeta;
  results: T[];
};

// -- Helpers --

/**
 * Reconstruct abstract from OpenAlex's inverted index format.
 * The inverted index maps each word to the positions it appears at.
 */
function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string | null {
  if (!invertedIndex) return null;
  const entries: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      entries.push([pos, word]);
    }
  }
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(([, word]) => word).join(' ');
}

function mapWork(w: OpenAlexWork) {
  return {
    id: w.id,
    doi: w.doi ?? null,
    title: w.display_name ?? w.title ?? null,
    publication_year: w.publication_year ?? null,
    type: w.type ?? null,
    open_access: w.open_access?.is_oa ?? false,
    oa_url: w.open_access?.oa_url ?? null,
    cited_by_count: w.cited_by_count,
    journal: w.primary_location?.source?.display_name ?? null,
    authors: w.authorships.map((a) => a.author.display_name),
    concepts: w.concepts.slice(0, 5).map((c) => c.display_name),
    abstract: reconstructAbstract(w.abstract_inverted_index),
  };
}

// -- Tool Definitions --

const tools: McpToolExport['tools'] = [
  {
    name: 'search_works',
    description:
      'Search scholarly works (papers, books, datasets) in the OpenAlex index. Returns title, authors, journal, year, citation count, and abstract.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "transformer neural networks")' },
        limit: {
          type: 'number',
          description: 'Number of results to return (1-25, default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_authors',
    description:
      'Search researchers and authors by name in OpenAlex. Returns display name, ORCID, institution, works count, and citation count.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Author name to search for (e.g., "Yoshua Bengio")' },
        limit: {
          type: 'number',
          description: 'Number of results to return (1-25, default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_institutions',
    description:
      'Search academic institutions (universities, research labs) by name in OpenAlex. Returns name, country, type, works count, and top concepts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Institution name to search for (e.g., "MIT")' },
        limit: {
          type: 'number',
          description: 'Number of results to return (1-25, default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_concept',
    description:
      'Look up an academic concept or field of study by name. Returns description, works count, related concepts, and ancestor concepts in the hierarchy.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Concept name to look up (e.g., "deep learning")' },
      },
      required: ['query'],
    },
  },
];

// -- Tool Implementations --

async function searchWorks(query: string, limit: number) {
  const perPage = Math.min(25, Math.max(1, limit));
  const params = new URLSearchParams({ search: query, per_page: String(perPage) });

  const res = await fetch(`${BASE}/works?${params}`);
  if (!res.ok) throw new Error(`OpenAlex works search error: ${res.status}`);

  const data = (await res.json()) as OpenAlexListResponse<OpenAlexWork>;

  return {
    total: data.meta.count,
    results: data.results.map(mapWork),
  };
}

async function searchAuthors(query: string, limit: number) {
  const perPage = Math.min(25, Math.max(1, limit));
  const params = new URLSearchParams({ search: query, per_page: String(perPage) });

  const res = await fetch(`${BASE}/authors?${params}`);
  if (!res.ok) throw new Error(`OpenAlex authors search error: ${res.status}`);

  const data = (await res.json()) as OpenAlexListResponse<OpenAlexAuthor>;

  return {
    total: data.meta.count,
    results: data.results.map((a) => ({
      id: a.id,
      display_name: a.display_name,
      orcid: a.orcid ?? null,
      works_count: a.works_count,
      cited_by_count: a.cited_by_count,
      last_known_institution: a.last_known_institution?.display_name ?? null,
      institution_country: a.last_known_institution?.country_code ?? null,
      top_concepts: a.x_concepts.slice(0, 5).map((c) => c.display_name),
    })),
  };
}

async function searchInstitutions(query: string, limit: number) {
  const perPage = Math.min(25, Math.max(1, limit));
  const params = new URLSearchParams({ search: query, per_page: String(perPage) });

  const res = await fetch(`${BASE}/institutions?${params}`);
  if (!res.ok) throw new Error(`OpenAlex institutions search error: ${res.status}`);

  const data = (await res.json()) as OpenAlexListResponse<OpenAlexInstitution>;

  return {
    total: data.meta.count,
    results: data.results.map((i) => ({
      id: i.id,
      display_name: i.display_name,
      ror: i.ror ?? null,
      country_code: i.country_code ?? null,
      type: i.type ?? null,
      works_count: i.works_count,
      cited_by_count: i.cited_by_count,
      homepage_url: i.homepage_url ?? null,
      top_concepts: i.x_concepts.slice(0, 5).map((c) => c.display_name),
    })),
  };
}

async function getConcept(query: string) {
  const params = new URLSearchParams({ search: query, per_page: '1' });

  const res = await fetch(`${BASE}/concepts?${params}`);
  if (!res.ok) throw new Error(`OpenAlex concepts search error: ${res.status}`);

  const data = (await res.json()) as OpenAlexListResponse<OpenAlexConceptFull>;

  if (data.results.length === 0) {
    throw new Error(`No concept found for: "${query}"`);
  }

  const c = data.results[0];

  return {
    id: c.id,
    display_name: c.display_name,
    level: c.level,
    description: c.description ?? null,
    works_count: c.works_count,
    cited_by_count: c.cited_by_count,
    ancestors: c.ancestors.map((a) => ({ name: a.display_name, level: a.level })),
    related_concepts: c.related_concepts
      .slice(0, 10)
      .map((r) => ({ name: r.display_name, level: r.level, score: r.score })),
  };
}

// -- Dispatcher --

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_works':
      return searchWorks(args.query as string, (args.limit as number) ?? 10);
    case 'search_authors':
      return searchAuthors(args.query as string, (args.limit as number) ?? 10);
    case 'search_institutions':
      return searchInstitutions(args.query as string, (args.limit as number) ?? 10);
    case 'get_concept':
      return getConcept(args.query as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool } satisfies McpToolExport;
