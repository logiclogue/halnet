import express from "express";
import { config } from "dotenv";
import { createClient } from "redis";
import pino from "pino";
import { generateContent } from "./ai-generator";

config();

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: true,
        },
    },
});

const app = express();
const port = process.env.PORT || 3000;

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

app.use(express.json());

redisClient.on("error", err => logger.error({ err }, "Redis Client Error"));
redisClient.on("connect", () => logger.info("Connecting to Redis..."));
redisClient.on("ready", () => logger.info("Redis client ready"));

async function startServer() {
    await redisClient.connect();
    logger.info("Connected to Redis");

    app.use(async (req, res) => {
        const requestId = Math.random().toString(36).substring(7);
        // Normalize path: remove trailing slash (except for root)
        const path = req.path === "/" ? "/" : req.path.replace(/\/$/, "");

        logger.info(
            {
                requestId,
                path,
                method: req.method,
                userAgent: req.get("user-agent"),
                ip: req.ip,
            },
            "Incoming request"
        );

        try {
            const cacheKey = `halnet:${path}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info({ requestId, path, cacheKey }, "Serving cached content");

                // Set appropriate content type based on file extension
                const contentType = getContentType(path);
                res.setHeader("Content-Type", contentType);

                return res.send(cached);
            }

            // Check if parent page exists (404 if parent doesn't exist, except for root)
            const pathSegments = path.split("/").filter(segment => segment !== "");
            if (pathSegments.length > 1) {
                const parentPath = "/" + pathSegments.slice(0, -1).join("/");
                const parentCacheKey = `halnet:${parentPath}`;

                const parentExists = await redisClient.exists(parentCacheKey);
                if (!parentExists) {
                    logger.info(
                        { requestId, path, parentPath },
                        "Parent page not found - returning 404"
                    );
                    res.status(404);
                    const contentType = getContentType(path);
                    res.setHeader("Content-Type", contentType);

                    // Return 404 content without caching
                    const notFoundContent = generate404Content(path, parentPath);
                    return res.send(notFoundContent);
                }
            }

            logger.info({ requestId, path }, "Cache miss - generating new content");

            const startTime = Date.now();
            const content = await generateContent(path, req.query, redisClient);
            const generationTime = Date.now() - startTime;

            await redisClient.set(cacheKey, content);

            logger.info(
                {
                    requestId,
                    path,
                    cacheKey,
                    generationTime: `${generationTime}ms`,
                    contentLength: content.length,
                },
                "Generated and cached new content"
            );

            // Set appropriate content type
            const contentType = getContentType(path);
            res.setHeader("Content-Type", contentType);

            res.send(content);
        } catch (error) {
            logger.error({ requestId, path, error }, "Error serving request");
            res.status(500).send(
                "<html><body><h1>Error generating content</h1><p>Please try again later.</p></body></html>"
            );
        }
    });

    app.listen(port, () => {
        logger.info({ port }, "HalNet server started");
    });
}

function getContentType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();

    switch (ext) {
        case "css":
            return "text/css";
        case "js":
            return "application/javascript";
        case "json":
            return "application/json";
        case "png":
            return "image/png";
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "gif":
            return "image/gif";
        case "svg":
            return "image/svg+xml";
        case "ico":
            return "image/x-icon";
        default:
            return "text/html";
    }
}

function generate404Content(requestedPath: string, missingParentPath: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - HalNet</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #4c1d95 0%, #1e40af 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 { font-size: 3rem; margin: 0 0 1rem 0; color: #e5e7eb; }
        h2 { font-size: 1.5rem; margin: 0 0 1rem 0; color: #c7d2fe; }
        p { font-size: 1.1rem; line-height: 1.6; margin: 1rem 0; }
        .path { 
            font-family: monospace; 
            background: rgba(0, 0, 0, 0.3); 
            padding: 0.5rem; 
            border-radius: 5px; 
            color: #fbbf24; 
        }
        a {
            color: #60a5fa;
            text-decoration: none;
            font-weight: bold;
        }
        a:hover { color: #93c5fd; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page <span class="path">${requestedPath}</span> cannot be accessed because its parent page <span class="path">${missingParentPath}</span> doesn't exist yet.</p>
        <p>In HalNet, pages must be explored in hierarchical order. Please navigate to <a href="${missingParentPath}">${missingParentPath}</a> first to unlock access to deeper content.</p>
        <p><a href="/">← Return to Main Page</a></p>
    </div>
</body>
</html>`;
}

startServer().catch(console.error);
