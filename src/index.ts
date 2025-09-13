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
        const path = req.path;

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

            logger.info({ requestId, path }, "Cache miss - generating new content");

            const startTime = Date.now();
            const content = await generateContent(path, req.query);
            const generationTime = Date.now() - startTime;

            await redisClient.setEx(cacheKey, 3600, content);

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

startServer().catch(console.error);
