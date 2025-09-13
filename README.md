# HalNet - AI-Powered Dynamic Website Generator

HalNet is a web server that generates complete websites on-demand using AI, based on the domain name used to access it. It uses OpenRouter for AI generation and Redis for caching.

## TODO

- Test against any domain, almost a mini DNS running
    - pivoting so that it's going to be a self contained site

---

- Use breadcrumbs for generation to avoid duplication
- Update to be a mythical site, like Wikipedia
- Use a low cost and fast LLM
- Prevent sites using "#"
- Handle "?" get params

- Deploy the site somewhere
- Buy a domain

## Features

- 🤖 **AI-Powered**: Uses OpenRouter API to generate complete HTML websites
- 🌐 **Domain-Aware**: Creates different websites based on the domain name
- ⚡ **Redis Caching**: Caches generated websites for improved performance
- 🔄 **Wildcard Support**: Works with any subdomain or domain pointed to your server
- 🎨 **Professional Output**: Generates modern, responsive HTML with embedded CSS

## Quick Start

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Set up environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your OpenRouter API key
    ```

3. **Start Redis:**

    ```bash
    # Using Docker
    docker run -d -p 6379:6379 redis:alpine

    # Or install Redis locally
    ```

4. **Run the server:**

    ```bash
    # Development mode
    npm run dev

    # Production mode
    npm run build
    npm start
    ```

## Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)
- `AI_MODEL`: AI model to use (default: anthropic/claude-3.5-sonnet)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)
- `PORT`: Server port (default: 3000)

## How It Works

1. **Request**: Client accesses any domain pointing to your server
2. **Parse**: Server extracts keywords from the domain name
3. **Cache Check**: Checks Redis for cached version
4. **Generate**: If not cached, uses AI to generate a complete website
5. **Cache**: Stores the generated HTML in Redis (1 hour TTL)
6. **Serve**: Returns the HTML to the client

## Domain Examples

- `pizza.example.com` → Generates a pizza restaurant website
- `tech.example.com` → Generates a technology company website
- `blog.example.com` → Generates a blog website
- `portfolio.example.com` → Generates a portfolio website

## Deployment

For production deployment, point your DNS wildcard record (\*.yourdomain.com) to your server running HalNet.

## License

ISC
