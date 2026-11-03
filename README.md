# OpenAlex — Open Catalog of Scholarly Works

OpenAlex is a free, open replacement for Microsoft Academic Graph (which shut down in 2022). 240M+ scholarly works with structured data on authors, institutions, concepts, citations, and venues. Open-source data model, generous API. Free, no auth (polite User-Agent + email recommended).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1867+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Why this matters for AI agents

Where [Semantic Scholar](/docs/reference/semantic-scholar) is search-focused and [Crossref](/docs/reference/crossref) is DOI-focused, OpenAlex is the most comprehensive structured graph: papers + authors + institutions + funders + concepts, all linked. For institutional analysis, citation networks, or systematic literature review, OpenAlex covers ground the others don't.

Common flows:

- **Work lookup.** Find a paper by DOI, title, or OpenAlex ID; get full structured record.
- **Author / institution.** Search Yale's CS department's papers in 2024.
- **Concept browsing.** Papers tagged with "transformer architecture" or "CRISPR Cas9."
- **Journal publishing model.** Is a journal subscription, hybrid or open access? Look up by ISSN (print or electronic).
- **Citation graph.** "Who cites paper X?" or "What does paper X cite?"

Citable URI: `pipeworx://openalex/work/{work_id}`.

## Auth

Free, public. OpenAlex strongly encourages identifying yourself via `mailto=` query parameter or User-Agent for "polite pool" priority. Pipeworx forwards `mailto=support@pipeworx.io` and `User-Agent: Pipeworx (mailto:support@pipeworx.io)` automatically.

## Entity types

OpenAlex models 5 entity types, each with stable IDs:

| Entity | ID prefix | Example |
|---|---|---|
| Work (paper) | W | W2741809807 |
| Author | A | A1234567890 |
| Institution | I | I97018004 (Yale) |
| Venue (journal/conference) | V | V202381698 |
| Concept (subject taxonomy) | C | C41008148 (computer science) |

Works are linked to authors, institutions (where authors are affiliated), venues (where they were published), and concepts (what they're about). Cross-entity queries are powerful.

## Common pitfalls

- **Author disambiguation.** OpenAlex makes a serious effort but isn't perfect. The same person may have separate Author IDs across early-career vs late-career; common-name authors split across entities. Cross-reference with ORCID where available.
- **Concept hierarchy depth.** OpenAlex concepts form a 6-level tree. "Computer science" level 0 is too coarse for most queries; level 3-4 ("transformer model", "BERT model") is more useful.
- **Open access status.** OpenAlex tracks `oa_status` (gold, green, hybrid, bronze, closed). Use it to surface free-to-read versions in your output.
- **Citation count vs. cited-by.** OpenAlex computes citation counts from its own corpus. Same paper can show different counts in Google Scholar (broader) and Web of Science (narrower).
- **Lag.** New papers appear within weeks. Citations to those papers take longer because citing papers must themselves be indexed.
- **Tied to Semantic Scholar?** OpenAlex and Semantic Scholar are separate projects with separate data. Some overlap in coverage; some divergence in metadata. Use both for comprehensive lookups.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "openalex": {
      "url": "https://gateway.pipeworx.io/openalex/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/openalex/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1867+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/openalex_search_works \
  -H 'Content-Type: application/json' \
  -d '{"query":"transformer neural networks"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/openalex_search_works`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-openalex` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/openalex/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "openalex": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-openalex"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Openalex data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
