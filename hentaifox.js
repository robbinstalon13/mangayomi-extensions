const HENTAIFOX_BASE = "https://hentaifox.com";
const HENTAIFOX_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Popular parodies - verified URL slugs from HentaiFox
const PARODIES = [
    { name: "None (All)", value: "" },
    { name: "Pokemon", value: "pokemon" },
    { name: "Naruto", value: "naruto-hentai" },
    { name: "My Hero Academia", value: "my-hero-academia-hentai" },
    { name: "Dragon Ball Z", value: "dragon-ball-z-hentai" },
    { name: "One Piece", value: "one-piece-hentai" },
    { name: "Final Fantasy", value: "final-fantasy-vii" },
    { name: "Sailor Moon", value: "sailor-moon" },
    { name: "Demon Slayer", value: "kimetsu-no-yaiba-hentai" },
    { name: "Bleach", value: "bleach-hentai" },
    { name: "Overwatch", value: "overwatch" },
    { name: "Genshin Impact", value: "genshin-impact" },
    { name: "Hololive", value: "hololive" },
    { name: "Fate/Grand Order", value: "fate-grand-order-hentai" },
    { name: "Attack on Titan", value: "shingeki-no-kyojin-hentai" },
    { name: "Blue Archive", value: "blue-archive" }
];

function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
}

function stripTags(value) {
    return safeString(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
    return safeString(value)
        .replace(/&nbsp;/gi, " ")
        .replace(/&#(\d+);/g, function (_, code) {
            const v = parseInt(code, 10);
            return isNaN(v) ? _ : String.fromCharCode(v);
        })
        .replace(/&quot;/gi, "\"")
        .replace(/&#039;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function firstMatch(text, regex) {
    const m = safeString(text).match(regex);
    if (!m || m.length < 2) return "";
    return safeString(m[1]);
}

function parseJsonSafe(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (e) {
        return fallback;
    }
}

function stringifyError(error) {
    if (error && error.message) return safeString(error.message);
    return safeString(error) || "Unknown error";
}

function isCloudflareBlocked(response) {
    if (!response) return true;
    const code = Number(response.statusCode || 0);
    if (code === 403 || code === 429 || code === 503) return true;
    const body = safeString(response.body).toLowerCase();
    if (!body) return true;
    return body.indexOf("cf-browser-verification") !== -1 ||
        body.indexOf("/cdn-cgi/challenge-platform/") !== -1 ||
        body.indexOf("<title>just a moment") !== -1;
}

function extractGalleryId(url) {
    const m = safeString(url).match(/\/gallery\/(\d+)/i);
    return m ? m[1] : "";
}

// Parse HentaiFox gallery listings
// Structure: <div class="thumb">...<a href="/gallery/ID/"><img data-src="THUMB"/></a>
//   <div class="caption"><h2 class="g_title"><a href="/gallery/ID/">TITLE</a></h2></div></div>
function parseGalleryCards(html) {
    const list = [];
    const seen = {};
    const htmlStr = safeString(html);
    
    const pattern = /<div class="thumb"[\s\S]*?<a href="\/gallery\/(\d+)\/"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[\s\S]*?<h2 class="g_title"><a href="\/gallery\/\d+\/"[^>]*>([\s\S]*?)<\/a><\/h2>/gi;
    
    let match;
    while ((match = pattern.exec(htmlStr)) !== null) {
        const id = match[1];
        let imageUrl = match[2];
        const title = decodeHtml(stripTags(match[3])) || "Unknown";
        const url = "/gallery/" + id + "/";
        
        if (!id || seen[url]) continue;
        seen[url] = true;
        
        // Skip SVG placeholders
        if (imageUrl.indexOf("data:image") === 0) {
            imageUrl = "";
        }
        
        list.push({
            name: title,
            link: url,
            imageUrl: imageUrl
        });
    }
    
    return list;
}

function parseHasNextPage(html) {
    const htmlStr = safeString(html);
    // Look for "Next" link with a real (non-#) href inside pagination
    // Pattern: <a class='page-link' href='//hentaifox.com/page/N/'>Next</a>
    return /<a[^>]+class=['"]page-link['"][^>]+href=['"](?!#)[^'"]+['"][^>]*>\s*Next\s*<\/a>/i.test(htmlStr);
}

// Parse gallery detail page
function parseGalleryDetail(html, url) {
    const htmlStr = safeString(html);
    
    // Title from h1 inside gallery info
    let title = decodeHtml(stripTags(firstMatch(htmlStr, /<h1[^>]*>([\s\S]*?)<\/h1>/i))) || "Unknown";
    
    // Cover image
    let imageUrl = firstMatch(htmlStr, /<img[^>]+alt="[^"]*"[^>]+src="(https:\/\/i\d?\.hentaifox\.com\/[^"]+\/cover\.[^"]+)"/i);
    if (!imageUrl) {
        imageUrl = firstMatch(htmlStr, /<img[^>]+src="(https:\/\/i\d?\.hentaifox\.com\/[^"]+\/cover\.[^"]+)"/i);
    }
    
    // Page count
    let pageCount = 0;
    const pageMatch = htmlStr.match(/Pages:\s*(\d+)/i);
    if (pageMatch) {
        pageCount = parseInt(pageMatch[1], 10) || 0;
    }
    
    // Tags
    const tags = [];
    const tagPattern = /<a[^>]+href="\/tag\/[^"]+\/"[^>]*>([^<]+?)(?:\s*<span[^>]*>[^<]*<\/span>)?\s*<\/a>/gi;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(htmlStr)) !== null) {
        const t = decodeHtml(stripTags(tagMatch[1]));
        if (t && tags.indexOf(t) === -1) tags.push(t);
    }
    
    // Artist
    let artist = "";
    const artistMatch = htmlStr.match(/<a[^>]+href="\/artist\/[^"]+\/"[^>]*>([^<]+?)(?:\s*<span[^>]*>[^<]*<\/span>)?\s*<\/a>/i);
    if (artistMatch) {
        artist = decodeHtml(stripTags(artistMatch[1]));
    }
    
    // Parody
    const parodies = [];
    const parodyPattern = /<a[^>]+href="\/parody\/[^"]+\/"[^>]*>([^<]+?)(?:\s*<span[^>]*>[^<]*<\/span>)?\s*<\/a>/gi;
    let parodyMatch;
    while ((parodyMatch = parodyPattern.exec(htmlStr)) !== null) {
        const p = decodeHtml(stripTags(parodyMatch[1]));
        if (p && parodies.indexOf(p) === -1) parodies.push(p);
    }
    
    // Characters
    const characters = [];
    const charPattern = /<a[^>]+href="\/character\/[^"]+\/"[^>]*>([^<]+?)(?:\s*<span[^>]*>[^<]*<\/span>)?\s*<\/a>/gi;
    let charMatch;
    while ((charMatch = charPattern.exec(htmlStr)) !== null) {
        const c = decodeHtml(stripTags(charMatch[1]));
        if (c && characters.indexOf(c) === -1) characters.push(c);
    }
    
    // Extract gallery_id (internal CDN ID) for building image URLs
    let galleryId = firstMatch(htmlStr, /id="load_id"\s+value="(\d+)"/i) ||
                    firstMatch(htmlStr, /name="load_id"[^>]+value="(\d+)"/i) ||
                    firstMatch(htmlStr, /id="gallery_id"\s+value="(\d+)"/i);
    let dirValue = firstMatch(htmlStr, /name="load_dir"[^>]+value="(\w+)"/i) ||
                   firstMatch(htmlStr, /id="load_dir"[^>]+value="(\w+)"/i);
    
    // Fallback: derive from cover URL pattern https://{srv}.hentaifox.com/{dir}/{loadId}/cover.{ext}
    if ((!galleryId || !dirValue) && imageUrl) {
        const coverMatch = imageUrl.match(/https:\/\/i\d?\.hentaifox\.com\/(\w+)\/(\d+)\//i);
        if (coverMatch) {
            if (!dirValue) dirValue = coverMatch[1];
            if (!galleryId) galleryId = coverMatch[2];
        }
    }
    
    // Extract g_th for image type info
    const gThMatch = htmlStr.match(/g_th\s*=\s*\$\.parseJSON\('([\s\S]*?)'\)/i);
    const gTh = gThMatch ? parseJsonSafe(gThMatch[1], null) : null;
    
    // Extract server from cover URL
    let server = "i";
    if (imageUrl) {
        const serverMatch = imageUrl.match(/https:\/\/(i\d?)\.hentaifox\.com/);
        if (serverMatch) server = serverMatch[1];
    }
    
    return {
        title: title,
        imageUrl: imageUrl,
        pageCount: pageCount,
        tags: tags,
        artist: artist,
        parodies: parodies,
        characters: characters,
        galleryId: galleryId,
        dir: dirValue,
        gTh: gTh,
        server: server
    };
}

function getImageExtension(typeToken) {
    const token = safeString(typeToken).split(",")[0].toLowerCase();
    if (token === "w") return "webp";
    if (token === "p") return "png";
    if (token === "g") return "gif";
    return "jpg";
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 15
        };
    }

    get supportsLatest() {
        return true;
    }

    getHeaders() {
        return {
            "User-Agent": HENTAIFOX_USER_AGENT,
            "Referer": HENTAIFOX_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    logError(method, error) {
        console.log("[hentaifox] " + method + " error: " + stringifyError(error));
    }

    async requestHtml(url) {
        const client = new Client(this.clientConfig);
        const response = await client.get(url, this.getHeaders());
        if (isCloudflareBlocked(response)) {
            throw new Error("Cloudflare blocked for " + url);
        }
        const statusCode = Number(response.statusCode || 0);
        if (statusCode >= 400) {
            throw new Error("Request failed with status " + statusCode + " for " + url);
        }
        const body = safeString(response.body);
        if (!body) {
            throw new Error("Empty response body for " + url);
        }
        return body;
    }

    buildListUrl(mode, query, page, filters) {
        const pageValue = Math.max(1, parseInt(page, 10) || 1);
        
        // Check for parody filter
        let parodySlug = "";
        if (filters && Array.isArray(filters)) {
            for (let i = 0; i < filters.length; i++) {
                if (filters[i] && filters[i].type === "parody" && filters[i].values && filters[i].values.length > 0) {
                    parodySlug = safeString(filters[i].values[0]);
                    break;
                }
            }
        }
        
        // Parody browsing
        if (parodySlug) {
            const pageSuffix = pageValue > 1 ? "pag/" + pageValue + "/" : "";
            if (mode === "popular") {
                return HENTAIFOX_BASE + "/parody/" + parodySlug + "/popular/" + pageSuffix;
            }
            return HENTAIFOX_BASE + "/parody/" + parodySlug + "/" + pageSuffix;
        }
        
        // Search
        if (mode === "search" && safeString(query).trim()) {
            return HENTAIFOX_BASE + "/search/?q=" + encodeURIComponent(query) + "&page=" + pageValue;
        }
        
        // Popular = home page (HentaiFox has no dedicated popular, but default sort works)
        // Latest/home: /pag/N/ for pagination
        return HENTAIFOX_BASE + "/" + (pageValue > 1 ? "pag/" + pageValue + "/" : "");
    }

    async fetchList(mode, query, page, filters) {
        const url = this.buildListUrl(mode, query, page, filters);
        const html = await this.requestHtml(url);
        const list = parseGalleryCards(html);
        return {
            list: list,
            hasNextPage: list.length > 0 && parseHasNextPage(html)
        };
    }

    async getPopular(page) {
        try {
            return await this.fetchList("popular", "", page, null);
        } catch (error) {
            this.logError("getPopular", error);
            throw error;
        }
    }

    async getLatestUpdates(page) {
        try {
            return await this.fetchList("latest", "", page, null);
        } catch (error) {
            this.logError("getLatestUpdates", error);
            throw error;
        }
    }

    async search(query, page, filters) {
        try {
            return await this.fetchList("search", query, page, filters);
        } catch (error) {
            this.logError("search", error);
            throw error;
        }
    }

    async getDetail(url) {
        try {
            const id = extractGalleryId(url);
            if (!id) throw new Error("Invalid gallery URL: " + url);
            
            const fullUrl = url.indexOf("http") === 0 ? url : HENTAIFOX_BASE + url;
            const html = await this.requestHtml(fullUrl);
            const detail = parseGalleryDetail(html, url);
            
            const lines = [];
            if (detail.parodies.length > 0) lines.push("Parodies: " + detail.parodies.join(", "));
            if (detail.characters.length > 0) lines.push("Characters: " + detail.characters.slice(0, 8).join(", "));
            if (detail.artist) lines.push("Artist: " + detail.artist);
            if (detail.pageCount) lines.push("Pages: " + detail.pageCount);
            if (detail.tags.length > 0) lines.push("Tags: " + detail.tags.slice(0, 15).join(", "));
            
            const genre = [].concat(detail.tags, detail.parodies);
            
            return {
                name: detail.title,
                link: url,
                imageUrl: detail.imageUrl,
                description: lines.join("\n"),
                author: detail.artist || "Unknown",
                artist: detail.artist || "",
                genre: genre,
                status: 1,
                chapters: [{
                    name: detail.pageCount > 0 ? "Read (" + detail.pageCount + " pages)" : "Read",
                    url: url,
                    scanlator: "",
                    dateUpload: ""
                }]
            };
        } catch (error) {
            this.logError("getDetail", error);
            throw error;
        }
    }

    async getPageList(url) {
        try {
            const id = extractGalleryId(url);
            if (!id) throw new Error("Invalid gallery URL: " + url);
            
            const fullUrl = url.indexOf("http") === 0 ? url : HENTAIFOX_BASE + url;
            const html = await this.requestHtml(fullUrl);
            const detail = parseGalleryDetail(html, url);
            
            if (!detail.galleryId || !detail.dir) {
                throw new Error("Could not extract gallery image data (id=" + detail.galleryId + ", dir=" + detail.dir + ")");
            }
            
            const pages = [];
            const gTh = detail.gTh || {};
            const totalPages = detail.pageCount || Object.keys(gTh).length;
            if (totalPages === 0) {
                throw new Error("Gallery has no pages");
            }
            const server = detail.server || "i";
            
            for (let i = 1; i <= totalPages; i++) {
                // If g_th map is present, use it for type info; otherwise default to jpg
                const typeInfo = gTh[String(i)];
                const ext = typeInfo ? getImageExtension(typeInfo) : "jpg";
                pages.push("https://" + server + ".hentaifox.com/" + detail.dir + "/" + detail.galleryId + "/" + i + "." + ext);
            }
            
            if (pages.length === 0) {
                throw new Error("Could not extract page images");
            }
            return pages;
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "parody",
                name: "Parody",
                values: PARODIES.map(p => ({ type_name: "SelectOption", name: p.name, value: p.value }))
            }
        ];
    }
}
