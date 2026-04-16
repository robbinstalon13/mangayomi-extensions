// Mangayomi Extension for HD Porn Comics
// Base URL: https://hdporncomics.com

const HD_BASE = "https://hdporncomics.com";

// Predefined popular Western artists
const WESTERN_ARTISTS = [
    { name: "Any", value: "" },
    { name: "JAB Comics", value: "jab-comics" },
    { name: "Locofuria", value: "locofuria" },
    { name: "Seiren", value: "seiren" },
    { name: "Melkor Mancin", value: "melkor-mancin" },
    { name: "ShadBase", value: "shadbase" },
    { name: "PalComix", value: "palcomix" },
    { name: "Fred Perry", value: "fred-perry" },
    { name: "Witchking00", value: "witchking00" },
    { name: "Markydaysaid", value: "markydaysaid" },
    { name: "Dave Cheung", value: "dave-cheung" },
    { name: "Creedo", value: "creedo" },
    { name: "Kogeikun", value: "kogeikun" },
    { name: "Incognitymous", value: "incognitymous" },
    { name: "BDOne", value: "bdone" },
    { name: "Manawer", value: "manawer" },
    { name: "Dsan", value: "dsan" },
    { name: "Total Drama Island", value: "total-drama-island" },
    { name: "Browse All Artists...", value: "browse_all" }
];

// Popular categories/tags for quick filtering
const POPULAR_TAGS = [
    { name: "Any", value: "" },
    { name: "Western", value: "western" },
    { name: "Full Color", value: "full-colorrr" },
    { name: "Big Breasts", value: "big-breastss" },
    { name: "Furry", value: "furryy" },
    { name: "Milf", value: "milf-comicss" },
    { name: "Anal", value: "anal-pornnn" },
    { name: "Blowjob", value: "blow-jobsss" },
    { name: "Lesbian", value: "lesbian-yuri-girls-only" },
    { name: "Superheroes", value: "superheroes" },
    { name: "Parody", value: "parody" }
];

// Sort options
const SORT_OPTIONS = [
    { name: "Latest", value: "date" },
    { name: "Most Viewed", value: "view" },
    { name: "Most Liked", value: "like" },
    { name: "A-Z", value: "az" }
];

// Utility functions
function safeString(str) {
    return str ? String(str) : "";
}

function firstMatch(str, regex) {
    const m = str.match(regex);
    return m ? m[1] : null;
}

// Parse comic cards from listing pages
function parseComicCards(html) {
    const cards = [];
    const htmlStr = safeString(html);
    
    // Match article elements containing comic data
    const articleRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
    const articles = htmlStr.match(articleRegex) || [];
    
    for (const article of articles) {
        try {
            // Extract title and link
            const titleMatch = article.match(/<h[2-4][^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/i);
            if (!titleMatch) continue;
            
            const url = titleMatch[1];
            let title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
            
            // Extract image
            let imageUrl = "";
            const imgMatch = article.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
            if (imgMatch) {
                imageUrl = imgMatch[1];
            }
            
            // Extract views/pages if available
            let views = "";
            const viewsMatch = article.match(/(\d+\.?\d*[kM]?)\s*Views/i);
            if (viewsMatch) {
                views = viewsMatch[1] + " views";
            }
            
            cards.push({
                name: title,
                imageUrl: imageUrl,
                link: url,
                status: views
            });
        } catch (e) {
            // Skip malformed entries
        }
    }
    
    return cards;
}

// Build search URL based on filters
function buildSearchUrl(query, page, filters) {
    let url = HD_BASE;
    
    const artist = filters.find(f => f.type === "artist")?.value || "";
    const tag = filters.find(f => f.type === "tag")?.value || "";
    const category = filters.find(f => f.type === "category")?.value || "";
    const parody = filters.find(f => f.type === "parody")?.value || "";
    const sort = filters.find(f => f.type === "sort")?.value || "date";
    
    // Build URL based on priority: artist > category > tag > parody > search
    if (artist && artist !== "browse_all") {
        url = `${HD_BASE}/artist/${artist}/`;
        if (page > 1) url += `page/${page}/`;
    } else if (category) {
        url = `${HD_BASE}/comics/categories/`;
        if (page > 1) url += `page/${page}/`;
    } else if (tag) {
        url = `${HD_BASE}/tag/${tag}/`;
        if (page > 1) url += `page/${page}/`;
    } else if (parody) {
        url = `${HD_BASE}/comics/parodies/`;
        if (page > 1) url += `page/${page}/`;
    } else if (query) {
        url = `${HD_BASE}/?s=${encodeURIComponent(query)}`;
        if (page > 1) url += `&paged=${page}`;
    } else {
        // Default latest
        url = `${HD_BASE}/?sort=${sort}`;
        if (page > 1) url += `&paged=${page}`;
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
            hasNextPage: cards.length >= 20 // Assume pagination if we got a full page
        };
    }
    
    async getDetail(url) {
        const res = await new Client().get(url);
        const html = res.body;
        const htmlStr = safeString(html);
        
        // Extract title
        const titleMatch = htmlStr.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown";
        
        // Extract cover image
        const coverMatch = htmlStr.match(/<img[^>]+class="[^"]*attachment[^"]*"[^>]+src="([^"]+)"/i);
        const cover = coverMatch ? coverMatch[1] : "";
        
        // Extract artist
        const artistMatch = htmlStr.match(/Artist[^:]*:\s*<a[^>]+href="[^"]*\/artist\/([^"\/]+)[^"]*"[^>]*>(.*?)<\/a>/i);
        const artistSlug = artistMatch ? artistMatch[1] : "";
        const artistName = artistMatch ? artistMatch[2].replace(/<[^>]+>/g, "").trim() : "";
        
        // Extract image count
        const countMatch = htmlStr.match(/(\d+)\s*Images/i);
        const pageCount = countMatch ? parseInt(countMatch[1], 10) : 0;
        
        // Extract tags
        const tags = [];
        const tagMatches = htmlStr.matchAll(/<a[^>]+href="[^"]*\/tag\/([^"\/]+)[^"]*"[^>]*>(.*?)<\/a>/gi);
        for (const match of tagMatches) {
            tags.push({
                name: match[2].replace(/<[^>]+>/g, "").trim(),
                url: `${HD_BASE}/tag/${match[1]}/`
            });
        }
        
        // Extract description if available
        let description = "";
        const descMatch = htmlStr.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/i);
        if (descMatch) {
            description = descMatch[1].replace(/<[^>]+>/g, "").trim();
        }
        
        return {
            name: title,
            imageUrl: cover,
            link: url,
            artist: artistName,
            status: pageCount > 0 ? `${pageCount} pages` : "",
            genre: tags.slice(0, 5).map(t => t.name).join(", "),
            description: description,
            chapters: [] // HD Porn Comics doesn't use chapters, pages are on same page
        };
    }
    
    async getPageList(url) {
        const res = await new Client().get(url);
        const html = res.body;
        const htmlStr = safeString(html);
        
        const pages = [];
        
        // Find all image figures in the gallery
        const figureMatches = htmlStr.matchAll(/<figure[^>]*>[\s\S]*?<a[^>]+href="(https:\/\/e\.hdporncomics\.com\/uploads\/[^"]+)"[^>]*>[\s\S]*?<\/figure>/gi);
        
        for (const match of figureMatches) {
            const fullImageUrl = match[1];
            if (fullImageUrl && fullImageUrl.endsWith('.jpg')) {
                pages.push(fullImageUrl);
            }
        }
        
        // Fallback: look for any e.hdporncomics.com image URLs
        if (pages.length === 0) {
            const imgMatches = htmlStr.matchAll(/https:\/\/e\.hdporncomics\.com\/uploads\/[^\s"<>]+\.jpg/gi);
            for (const match of imgMatches) {
                pages.push(match[0]);
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
                values: WESTERN_ARTISTS.map(a => ({
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
                type: "category",
                name: "Category",
                values: [
                    { type_name: "SelectOption", name: "Any", value: "" },
                    { type_name: "SelectOption", name: "Comics", value: "comics" },
                    { type_name: "SelectOption", name: "Manhwa", value: "manhwa" },
                    { type_name: "SelectOption", name: "Gay Manga", value: "gay-manga" }
                ]
            },
            {
                type_name: "SelectFilter",
                type: "parody",
                name: "Parody",
                values: [
                    { type_name: "SelectOption", name: "Any", value: "" },
                    { type_name: "SelectOption", name: "Pokemon", value: "pokemon" },
                    { type_name: "SelectOption", name: "Naruto", value: "naruto" },
                    { type_name: "SelectOption", name: "Dragon Ball", value: "dragon-ball" },
                    { type_name: "SelectOption", name: "One Piece", value: "one-piece" },
                    { type_name: "SelectOption", name: "MHA", value: "my-hero-academia" },
                    { type_name: "SelectOption", name: "Star Wars", value: "star-wars" },
                    { type_name: "SelectOption", name: "Marvel", value: "marvel" },
                    { type_name: "SelectOption", name: "DC", value: "dc" }
                ]
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
