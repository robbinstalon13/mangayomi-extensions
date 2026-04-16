// Mangayomi Extension for Multporn
// Base URL: https://multporn.net

const MULT_BASE = "https://multporn.net";

// Predefined popular Western artists
const POPULAR_ARTISTS = [
    { name: "Any", value: "" },
    { name: "JAB", value: "jab" },
    { name: "Midas-Bust", value: "midas-bust" },
    { name: "ShadBase", value: "shadbase" },
    { name: "Palcomix", value: "palcomix" },
    { name: "Fred Perry", value: "fred-perry" },
    { name: "Witchking00", value: "witchking00" },
    { name: "Croc", value: "croc" },
    { name: "Grimphantom", value: "grimphantom" },
    { name: "Inusen", value: "inusen" },
    { name: "Joelasko", value: "joelasko" },
    { name: "Dsan", value: "dsan" },
    { name: "KogeiKun", value: "kogeiKun" },
    { name: "Manawer", value: "manawer" },
    { name: "BDOne", value: "bdone" },
    { name: "Creedo", value: "creedo" },
    { name: "Browse All Artists...", value: "browse_all" }
];

// Popular tags for quick filtering
const POPULAR_TAGS = [
    { name: "Any", value: "" },
    { name: "Western", value: "western" },
    { name: "Parody", value: "parody" },
    { name: "Anal", value: "anal" },
    { name: "Big Breasts", value: "big_breasts" },
    { name: "Blowjob", value: "blowjob" },
    { name: "Full Color", value: "full_color" },
    { name: "Furry", value: "furry" },
    { name: "Lesbian", value: "lesbian" },
    { name: "Milf", value: "milf" },
    { name: "Incest", value: "incest" },
    { name: "Group", value: "group" }
];

// Sort options
const SORT_OPTIONS = [
    { name: "Latest", value: "new" },
    { name: "Best", value: "best" },
    { name: "Random", value: "random" }
];

// Utility functions
function safeString(str) {
    return str ? String(str) : "";
}

// Parse comic cards from listing pages
function parseComicCards(html) {
    const cards = [];
    const htmlStr = safeString(html);
    
    // Match list items containing comic data
    // Pattern for comics listing: <li>...<a href="/comics/{slug}">...</a>...</li>
    const liRegex = /<li[^>]*>[\s\S]*?<a[^>]+href="(\/comics\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<strong[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>[\s\S]*?<\/li>/gi;
    
    let match;
    while ((match = liRegex.exec(htmlStr)) !== null) {
        try {
            const url = match[1];
            const imageUrl = match[2];
            let title = match[3].replace(/<[^>]+>/g, "").trim();
            
            if (title && url) {
                cards.push({
                    name: title,
                    imageUrl: imageUrl,
                    link: MULT_BASE + url,
                    status: ""
                });
            }
        } catch (e) {
            // Skip malformed entries
        }
    }
    
    return cards;
}

// Build search URL based on filters
function buildSearchUrl(query, page, filters) {
    let url = MULT_BASE;
    
    const artist = filters.find(f => f.type === "artist")?.value || "";
    const tag = filters.find(f => f.type === "tag")?.value || "";
    const sort = filters.find(f => f.type === "sort")?.value || "new";
    
    // Build URL based on priority: artist > tag > search
    if (artist && artist !== "browse_all") {
        // Multporn uses author URLs: /authors_comics/{slug}
        url = `${MULT_BASE}/authors_comics/${artist}`;
        if (page > 1) url += `?page=${page - 1}`;
    } else if (tag) {
        // Tag filtering uses category_comic with search param
        url = `${MULT_BASE}/category_comic`;
        if (page > 1) {
            url += `?page=${page - 1}`;
        }
    } else if (query) {
        // Search uses the search page
        url = `${MULT_BASE}/search/content`;
        if (page > 1) {
            url += `?page=${page - 1}`;
        }
    } else {
        // Default - browse comics with rule34 filter
        url = `${MULT_BASE}/comics?rule34=1`;
        if (page > 1) {
            url += `&page=${page - 1}`;
        }
    }
    
    return url;
}

// Main extension class
class DefaultExtension {
    async search(query, page, filters) {
        const url = buildSearchUrl(query, page, filters);
        
        const res = await new Client().get(url);
        const html = res.body;
        
        const cards = parseComicCards(html);
        
        return {
            list: cards,
            hasNextPage: cards.length >= 10 // Multporn shows fewer items per page
        };
    }
    
    async getDetail(url) {
        const res = await new Client().get(url);
        const html = res.body;
        const htmlStr = safeString(html);
        
        // Extract title - look for h1 or the comic title in the content
        let title = "Unknown";
        const titleMatch = htmlStr.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
            title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
        }
        
        // Fallback: look for meta title
        if (title === "Unknown") {
            const metaTitle = htmlStr.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
            if (metaTitle) {
                title = metaTitle[1].replace(/\s*-\s*Multporn$/i, "").trim();
            }
        }
        
        // Extract cover image from first image or og:image
        let cover = "";
        const ogImage = htmlStr.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        if (ogImage) {
            cover = ogImage[1];
        }
        
        // Extract author/artist from tags section
        let author = "";
        const authorMatch = htmlStr.match(/<a[^>]+href="\/authors_comics\/([^"]+)"[^>]*>(.*?)<\/a>/i);
        if (authorMatch) {
            author = authorMatch[2].replace(/<[^>]+>/g, "").trim();
        }
        
        // Extract tags
        const tags = [];
        const tagMatches = htmlStr.matchAll(/<a[^>]+href="\/category_comic\/([^"]+)"[^>]*>(.*?)<\/a>/gi);
        for (const match of tagMatches) {
            const tagName = match[2].replace(/<[^>]+>/g, "").trim();
            if (tagName && !tagName.includes("View")) {
                tags.push(tagName);
            }
        }
        
        // Count images
        let pageCount = 0;
        const imgMatches = htmlStr.matchAll(/<img[^>]+src="[^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/comics\/[^"]+"/gi);
        for (const _ of imgMatches) {
            pageCount++;
        }
        
        return {
            name: title,
            imageUrl: cover,
            link: url,
            artist: author,
            status: pageCount > 0 ? `${pageCount} pages` : "",
            genre: tags.slice(0, 5).join(", "),
            description: "",
            chapters: [] // Multporn doesn't use chapters
        };
    }
    
    async getPageList(url) {
        const res = await new Client().get(url);
        const html = res.body;
        const htmlStr = safeString(html);
        
        const pages = [];
        
        // Find all comic page images
        // Pattern: /sites/default/files/styles/juicebox_square_thumbnail_comics/public/comics/...
        const imgMatches = htmlStr.matchAll(/<img[^>]+src="([^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/comics\/[^"]+\.(?:jpg|jpeg|png))"[^>]*>/gi);
        
        for (const match of imgMatches) {
            const imgUrl = match[1];
            if (imgUrl && !imgUrl.includes("anonymous")) {
                // Convert thumbnail URL to full image URL if possible
                // Thumbnail: .../styles/juicebox_square_thumbnail_comics/public/...
                // Full: .../files/comics/... (remove the styles path)
                let fullUrl = imgUrl;
                if (imgUrl.includes("/styles/")) {
                    fullUrl = imgUrl.replace(/\/styles\/[^/]+\/public/, "");
                }
                pages.push(fullUrl);
            }
        }
        
        // Remove duplicates
        return [...new Set(pages)];
    }
    
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "artist",
                name: "Artist",
                values: POPULAR_ARTISTS.map(a => ({
                    type_name: "SelectOption",
                    name: a.name,
                    value: a.value
                }))
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: POPULAR_TAGS.map(t => ({
                    type_name: "SelectOption",
                    name: t.name,
                    value: t.value
                }))
            },
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: SORT_OPTIONS.map(s => ({
                    type_name: "SelectOption",
                    name: s.name,
                    value: s.value
                }))
            }
        ];
    }
}
