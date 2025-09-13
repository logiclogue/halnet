import express from 'express';
import { config } from 'dotenv';
import { createClient } from 'redis';
import { generateWebsite } from './ai-generator';
import { extractDomainInfo } from './domain-parser';

config();

const app = express();
const port = process.env.PORT || 3000;

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

app.use(express.json());

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function startServer() {
    await redisClient.connect();
    console.log('Connected to Redis');

    app.use(async (req, res) => {
        console.log("HERE");

        try {
            const host = req.get('host') || 'localhost';
            const path = req.path;
            const fullUrl = `${host}${path}`;

            const cacheKey = `site:${fullUrl}`;

            const cached = await redisClient.get(cacheKey);
            if (cached) {
                console.log(`Serving cached content for ${host}`);
                return res.send(cached);
            }

            const domainInfo = extractDomainInfo(host);
            const html = await generateWebsite(domainInfo, path, req.query);

            await redisClient.setEx(cacheKey, 3600, html);

            console.log(`Generated and cached new content for ${host}`);
            res.send(html);
        } catch (error) {
            console.error('Error serving request:', error);
            res.status(500).send('<html><body><h1>Error generating website</h1><p>Please try again later.</p></body></html>');
        }
    });

    app.listen(port, () => {
        console.log(`HalNet server running at http://localhost:${port}`);
    });
}

startServer().catch(console.error);
