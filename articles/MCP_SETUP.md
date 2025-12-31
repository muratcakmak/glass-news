# Cloudflare MCP Setup (Optional)

While I don't currently have access to the Cloudflare MCP server, you can set it up for enhanced local development with Claude Code.

## What is Cloudflare MCP?

Model Context Protocol (MCP) servers give Claude Code direct access to Cloudflare resources (KV, R2, Workers, etc.) for easier debugging and development.

## Installation

1. Install the Cloudflare MCP server:

```bash
# Using npx (recommended)
npx -y @cloudflare/mcp-server-cloudflare init
```

2. Follow the prompts to:
   - Select your Cloudflare account
   - Choose which resources to expose (KV, R2, Workers)
   - Configure authentication

3. The MCP server will be added to your Claude Code configuration automatically

## Benefits

With Cloudflare MCP, Claude Code can:
- Read/write to your KV namespaces directly
- List and fetch files from R2 buckets
- View Worker logs in real-time
- Deploy and manage Workers
- Debug issues faster

## Without MCP (What We're Doing Now)

You can still use:
- `bunx wrangler` commands for deployment
- `bun run dev` for local testing
- `bun run tail` for log monitoring
- Cloudflare Dashboard for resource management

## Future Setup

If you want to add MCP later:

1. Run the setup command above
2. Restart Claude Code
3. I'll be able to help you debug by directly accessing your Cloudflare resources

For now, we're using the standard Wrangler CLI which works great!

## Resources

- Cloudflare MCP Docs: https://github.com/cloudflare/mcp-server-cloudflare
- Model Context Protocol: https://modelcontextprotocol.io/
