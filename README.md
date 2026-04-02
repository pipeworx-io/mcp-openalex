# @pipeworx/mcp-openalex

MCP server for scholarly works, authors, and institutions via the [OpenAlex API](https://openalex.org/). Free, no authentication required.

## Tools

| Tool | Description |
|------|-------------|
| `search_works` | Search scholarly works (papers, books, datasets) by keyword |
| `search_authors` | Search researchers and authors by name |
| `search_institutions` | Search academic institutions by name |
| `get_concept` | Look up an academic concept or field of study |

## Quickstart via Pipeworx Gateway

```bash
curl -X POST https://gateway.pipeworx.io/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "openalex__search_works",
      "arguments": { "query": "transformer neural networks", "limit": 5 }
    },
    "id": 1
  }'
```

## License

MIT
