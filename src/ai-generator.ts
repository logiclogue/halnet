import axios from "axios";

export const generateContent = async (
    path: string,
    queryParams: any,
    redisClient?: any
): Promise<string> => {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    const prompt = await createPrompt(path, queryParams, redisClient);

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

const createPrompt = async (path: string, queryParams: any, redisClient?: any): Promise<string> => {
    const fileExtension = path.split(".").pop()?.toLowerCase();

    if (fileExtension === "css") {
        return createCSSPrompt(path);
    } else if (fileExtension === "js") {
        return createJSPrompt(path);
    } else if (["png", "jpg", "jpeg", "gif", "svg", "ico"].includes(fileExtension || "")) {
        return createImagePrompt(path);
    } else {
        return await createHTMLPrompt(path, queryParams, redisClient);
    }
};

const createHTMLPrompt = async (
    path: string,
    queryParams: any,
    redisClient?: any
): Promise<string> => {
    const pathSegments = path.split("/").filter(segment => segment !== "");
    const parentPath = pathSegments.length > 1 ? "/" + pathSegments.slice(0, -1).join("/") : "/";
    const currentPage = pathSegments[pathSegments.length - 1] || "home";

    // Get parent page HTML for style consistency
    let parentHTML = "";
    if (redisClient && parentPath !== path) {
        try {
            const parentCacheKey = `halnet:${parentPath}`;
            parentHTML = (await redisClient.get(parentCacheKey)) || "";
            if (parentHTML) {
                // Truncate if too long to avoid token limits
                parentHTML =
                    parentHTML.length > 2000 ? parentHTML.substring(0, 2000) + "..." : parentHTML;
            }
        } catch (error) {
            // Ignore cache errors
        }
    }

    const parentSection = parentHTML
        ? `

PARENT PAGE HTML (for style reference):
\`\`\`html
${parentHTML}
\`\`\`

Use the above parent page as a style and structure reference. Maintain consistent:
- Navigation structure
- CSS class names and styling approach  
- Layout patterns
- Color scheme and typography
- Header/footer structure
`
        : "";

    return `Generate a complete, professional HTML page for HalNet.

Current Path: ${path}
Parent Path: ${parentPath}
Current Page: ${currentPage}
Query parameters: ${JSON.stringify(queryParams)}

${parentSection}

HalNet World: a world you're in charge of generating as you go. The current page you're on will define how the world is shaped as we move further down the website hierarchy.

Content Guidelines:
Generate encyclopedia entries, historical records, cultural guides, or reference materials about a world you're in charge of generating.

Requirements:
1. Create a full HTML document with <!DOCTYPE html>, proper head section, and body
2. ALL resources must be self-contained within a single response:
   - CSS: All inline or <style>
   - JS: All inline or <style>
   - Images: You shouldn't generate any links or generate any images
   - Fonts: Use web-safe fonts, no external
3. Include consistent HalNet navigation with main sections, just like Wikipedia would
4. Generate rich, detailed content about the world that you've created appropriate for the current path
5. Use Wikipedia-style layout: infoboxes, references, categories, navigation
6. Make it responsive and scholarly
7. Use semantic HTML5 elements
8. If parent HTML provided, maintain consistent styling and structure
9. Each mentioned thing, must have a link to its own unique page which delves deeper into the website's path structure
     - e.g. on page /aethelgard/history and there's a title of a section "The Reign of Thorns (circa 0 to 800 AE)", there must be a link to /aethelgard/history/reign-of-thorns
     - Each page you can only reference one up the hierarchy or down. E.g. on / you cannot reference /physics/dark-matter

CRITICAL: NO external resources. Everything must resolve to the same domain.
CRITICAL: Maintain visual consistency with parent pages when available.
CRITICAL: All content must be about the world you're generating, not real world topics.

Return ONLY the complete HTML code, no explanations or markdown formatting.`;
};

const createCSSPrompt = (path: string): string => {
    return `Generate CSS stylesheet content for HalNet.

Path: ${path}

HalNet Visual Guidelines:
- Ethereal, mystical encyclopedia aesthetic
- Colors: Deep purples (#4c1d95, #6b21a8), ethereal blues (#1e40af, #3b82f6), silver accents (#e5e7eb), crystalline whites
- Typography: Scholarly, readable fonts (serif for content, sans-serif for UI)
- Ancient tome meets digital interface feel
- Soft glows, subtle animations, floating elements
- Wikipedia-inspired layout with mystical touches

Generate appropriate CSS for:
- Base typography and reading experience
- Navigation with mystical styling
- Infobox and table layouts
- Article formatting and structure
- Responsive grid systems
- Ethereal hover effects and transitions
- Mystical visual elements (glows, shadows)

Return ONLY the CSS code, no comments or explanations.`;
};

const createJSPrompt = (path: string): string => {
    return `Generate JavaScript code for HalNet.

Path: ${path}

Requirements:
- Modern vanilla JavaScript (ES6+)
- NO external dependencies or libraries
- Focus on encyclopedia interactions and mystical UI effects
- Clean, well-structured code
- Performance optimized

Generate appropriate JavaScript for:
- Navigation interactions with ethereal effects
- Search and filtering functionality
- Dynamic content loading
- Mystical animations (glows, floats, particles)
- Interactive maps and diagrams
- Collapsible sections and infoboxes
- Smooth scrolling with magical transitions

Return ONLY the JavaScript code, no comments or explanations.`;
};

const createImagePrompt = (path: string): string => {
    return `Generate SVG image content for HalNet.

Path: ${path}

Return ONLY the SVG XML code, no explanations.`;
};
