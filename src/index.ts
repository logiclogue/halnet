import express from "express";
import { config } from "dotenv";
import { createClient } from "redis";
import pino from "pino";
import { generateWebsite } from "./ai-generator";
import { extractDomainInfo } from "./domain-parser";

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
        const host = req.get("host") || "localhost";
        const path = req.path;
        const fullUrl = `${host}${path}`;

        logger.info(
            {
                requestId,
                host,
                path,
                method: req.method,
                userAgent: req.get("user-agent"),
                ip: req.ip,
            },
            "Incoming request"
        );

        try {
            const cacheKey = `site:${fullUrl}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                logger.info({ requestId, host, cacheKey }, "Serving cached content");
                return res.send(cached);
            }

            logger.info({ requestId, host }, "Cache miss - generating new content");

            const domainInfo = extractDomainInfo(host);
            logger.debug({ requestId, domainInfo }, "Extracted domain info");

            const startTime = Date.now();
            const html = await generateWebsite(domainInfo, path, req.query);
            const generationTime = Date.now() - startTime;

            await redisClient.setEx(cacheKey, 3600, html);

            logger.info(
                {
                    requestId,
                    host,
                    cacheKey,
                    generationTime: `${generationTime}ms`,
                    htmlLength: html.length,
                },
                "Generated and cached new content"
            );

            res.send(html);
        } catch (error) {
            logger.error({ requestId, host, error }, "Error serving request");
            res.status(500).send(
                "<html><body><h1>Error generating website</h1><p>Please try again later.</p></body></html>"
            );
        }
    });

    app.listen(port, () => {
        logger.info({ port }, "HalNet server started");
    });
}

startServer().catch(console.error);
