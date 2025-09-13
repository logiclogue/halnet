import axios from "axios";

export const generateContent = async (path: string, queryParams: any): Promise<string> => {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    const prompt = createPrompt(path, queryParams);

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
        logger.error({ error, path }, "Error calling OpenRouter API");
        throw new Error("Failed to generate website content");
    }
};

const createPrompt = (path: string, queryParams: any): string => {
    const fileExtension = path.split(".").pop()?.toLowerCase();

    if (fileExtension === "css") {
        return createCSSPrompt(path);
    } else if (fileExtension === "js") {
        return createJSPrompt(path);
    } else if (["png", "jpg", "jpeg", "gif", "svg", "ico"].includes(fileExtension || "")) {
        return createImagePrompt(path);
    } else {
        return createHTMLPrompt(path, queryParams);
    }
};

const createHTMLPrompt = (path: string, queryParams: any): string => {
    return `Generate a complete, professional HTML page for HalNet - an AI-powered dynamic website generator.

Path: ${path}
Query parameters: ${JSON.stringify(queryParams)}

HalNet Brand Identity:
- HalNet is a cutting-edge AI website generator
- Modern, sleek, tech-forward aesthetic
- Colors: Deep blues, electric accents, clean whites
- Professional but innovative feel

Requirements:
1. Create a full HTML document with <!DOCTYPE html>, proper head section, and body
2. ALL resources must be self-contained within HalNet:
   - CSS: Link to /styles/main.css or /css/style.css (NOT external CDNs)
   - JS: Link to /js/app.js or similar (NOT external libraries)
   - Images: Use /images/ paths (NOT external URLs)
   - Fonts: Use web-safe fonts or /fonts/ paths (NO Google Fonts)
3. Include consistent HalNet navigation with links like:
   - Home (/)
   - About (/about)
   - Blog (/blog)
   - Services (/services)
   - Contact (/contact)
4. Generate content appropriate for the path (e.g., /about = about HalNet)
5. Make it responsive and professional
6. Use semantic HTML5 elements

CRITICAL: NO external resources. Everything must resolve to the same domain.

Return ONLY the complete HTML code, no explanations or markdown formatting.`;
};

const createCSSPrompt = (path: string): string => {
    return `Generate CSS stylesheet content for HalNet.

Path: ${path}

HalNet Brand Guidelines:
- Modern, tech-forward design
- Colors: Deep blues (#1a365d, #2d3748), electric blue accents (#3182ce), clean whites
- Typography: Clean, modern fonts (system fonts preferred)
- Responsive design
- Smooth animations and transitions

Generate appropriate CSS for:
- Base styles and typography
- Navigation styling
- Layout and grid systems
- Component styles
- Responsive breakpoints
- Hover effects and transitions

Return ONLY the CSS code, no comments or explanations.`;
};

const createJSPrompt = (path: string): string => {
    return `Generate JavaScript code for HalNet functionality.

Path: ${path}

Requirements:
- Modern vanilla JavaScript (ES6+)
- NO external dependencies or libraries
- Focus on UI interactions, animations, form handling
- Clean, well-structured code
- Performance optimized

Generate appropriate JavaScript for:
- Navigation interactions
- Form submissions
- Dynamic content updates
- Smooth scrolling and animations
- Mobile menu toggles

Return ONLY the JavaScript code, no comments or explanations.`;
};

const createImagePrompt = (path: string): string => {
    return `Generate SVG image content for HalNet.

Path: ${path}

HalNet Brand:
- Modern, tech aesthetic
- Deep blues and electric accents
- Clean, professional design

Create an appropriate SVG for the requested path:
- Logo files: HalNet branding
- Icons: Modern, minimal style
- Graphics: Tech-themed illustrations

Return ONLY the SVG XML code, no explanations.`;
};
