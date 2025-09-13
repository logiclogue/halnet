import axios from "axios";

export interface DomainInfo {
    domain: string;
    subdomain?: string;
    keywords: string[];
    tld: string;
}

export const generateWebsite = async (
    domainInfo: DomainInfo,
    path: string,
    queryParams: any
): Promise<string> => {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    const prompt = createPrompt(domainInfo, path, queryParams);

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: process.env.AI_MODEL || "anthropic/claude-3.5-sonnet",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                max_tokens: 4000,
            },
            {
                headers: {
                    Authorization: `Bearer ${openRouterApiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/logiclogue/halnet",
                    "X-Title": "HalNet - AI Website Generator",
                },
            }
        );

        const generatedContent = response.data.choices[0]?.message?.content;

        if (!generatedContent) {
            throw new Error("No content generated from AI");
        }

        return generatedContent;
    } catch (error) {
        const logger = require("pino")();
        logger.error({ error, domainInfo, path }, "Error calling OpenRouter API");
        throw new Error("Failed to generate website content");
    }
};

const createPrompt = (domainInfo: DomainInfo, path: string, queryParams: any): string => {
    const keywords = domainInfo.keywords.join(", ");
    const domain = domainInfo.domain;
    const subdomain = domainInfo.subdomain ? `${domainInfo.subdomain}.` : "";

    return `Generate a complete, professional HTML website for the domain "${subdomain}${domain}".

Domain Analysis:
- Main domain: ${domain}
- Subdomain: ${domainInfo.subdomain || "none"}
- Keywords: ${keywords}
- Path: ${path}
- Query parameters: ${JSON.stringify(queryParams)}

Requirements:
1. Create a full HTML document with <!DOCTYPE html>, proper head section, and body
2. Include modern CSS styling (embedded in <style> tags or inline)
3. Make the website responsive and professional-looking
4. Base the content and theme on the domain name and keywords
5. If the domain suggests a specific business or purpose, create appropriate content
6. Include navigation, main content, and footer sections
7. Use semantic HTML5 elements
8. Make it look like a real, functional website

Style Guidelines:
- Use modern design principles
- Include proper meta tags
- Make it mobile-friendly
- Use appropriate colors and typography
- Include placeholder content that makes sense for the domain

Return ONLY the complete HTML code, no explanations or markdown formatting.`;
};
