const HENTAINEXUS_BASE = "https://hentainexus.com";
const HENTAINEXUS_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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
    const m = safeString(url).match(/\/view\/(\d+)/i);
    return m ? m[1] : "";
}

// Parse HentaiNexus gallery cards
// Structure: <a href="/view/ID">
//   <div class="card">
//     <header class="card-header" title="TITLE">
//       <p class="card-header-title">TITLE</p>
//     </header>
//     <div class="card-image"><figure class="image">
//       <img src="https://images.hentainexus.com/v2/HASH/001.jpg.thumb.jpg">
//     </figure></div>
//   </div>
// </a>
function parseGalleryCards(html) {
    const list = [];
    const seen = {};
    const htmlStr = safeString(html);
    
    const pattern = /<a href="\/view\/(\d+)">\s*<div class="card">\s*<header class="card-header"(?:\s+title="([^"]*)")?[^>]*>\s*<p class="card-header-title">([^<]*)<\/p>\s*<\/header>\s*<div class="card-image">\s*<figure[^>]*>\s*<img src="([^"]+)"/gi;
    
    let match;
    while ((match = pattern.exec(htmlStr)) !== null) {
        const id = match[1];
        const titleFromAttr = decodeHtml(match[2] || "");
        const titleFromText = decodeHtml(stripTags(match[3]));
        const title = titleFromAttr || titleFromText || "Unknown";
        const imageUrl = match[4];
        const url = "/view/" + id;
        
        if (!id || seen[url]) continue;
        seen[url] = true;
        
        list.push({
            name: title,
            link: url,
            imageUrl: imageUrl
        });
    }
    
    // Fallback: simpler pattern if the above doesn't match
    if (list.length === 0) {
        const simplePattern = /<a href="\/view\/(\d+)">[\s\S]*?<p class="card-header-title">([\s\S]*?)<\/p>[\s\S]*?<img src="([^"]+)"/gi;
        while ((match = simplePattern.exec(htmlStr)) !== null) {
            const id = match[1];
            const url = "/view/" + id;
            if (!id || seen[url]) continue;
            seen[url] = true;
            list.push({
                name: decodeHtml(stripTags(match[2])) || "Unknown",
                link: url,
                imageUrl: match[3]
            });
        }
    }
    
    return list;
}

function parseHasNextPage(html) {
    return /class="pagination-next"[^>]+href="\/page\/\d+"/i.test(safeString(html));
}

// Parse gallery detail page
function parseGalleryDetail(html) {
    const htmlStr = safeString(html);
    
    // Title from h1.title
    let title = decodeHtml(stripTags(firstMatch(htmlStr, /<h1 class="title">([\s\S]*?)<\/h1>/i))) || "Unknown";
    
    // Cover image
    let imageUrl = firstMatch(htmlStr, /<a href="\/read\/\d+">\s*<figure[^>]*>\s*<img src="([^"]+)"/i);
    if (!imageUrl) {
        imageUrl = firstMatch(htmlStr, /<img src="(https:\/\/images\.hentainexus\.com\/v2\/[^"]+)"/i);
    }
    
    // Parse details table
    const tags = [];
    const artists = [];
    const parodies = [];
    const characters = [];
    let description = "";
    let pageCount = 0;
    let language = "";
    
    // Tag pattern - all detail links
    const tagPattern = /<td[^>]*class="tag-table-row-value"[^>]*>([\s\S]*?)<\/td>/gi;
    const labelPattern = /<th[^>]*class="tag-table-row-label"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*class="tag-table-row-value"[^>]*>([\s\S]*?)<\/td>/gi;
    
    let labelMatch;
    while ((labelMatch = labelPattern.exec(htmlStr)) !== null) {
        const label = decodeHtml(stripTags(labelMatch[1])).toLowerCase().replace(/:/g, "").trim();
        const valueHtml = labelMatch[2];
        const values = [];
        let valueMatch;
        const linkPattern = /<a[^>]*>([^<]+)<\/a>/gi;
        while ((valueMatch = linkPattern.exec(valueHtml)) !== null) {
            const v = decodeHtml(stripTags(valueMatch[1]));
            if (v) values.push(v);
        }
        
        if (label.indexOf("artist") !== -1) {
            for (let i = 0; i < values.length; i++) artists.push(values[i]);
        } else if (label.indexOf("parody") !== -1 || label.indexOf("series") !== -1) {
            for (let i = 0; i < values.length; i++) parodies.push(values[i]);
        } else if (label.indexOf("character") !== -1) {
            for (let i = 0; i < values.length; i++) characters.push(values[i]);
        } else if (label.indexOf("tag") !== -1) {
            for (let i = 0; i < values.length; i++) tags.push(values[i]);
        } else if (label.indexOf("language") !== -1) {
            language = values.join(", ");
        } else if (label.indexOf("pages") !== -1) {
            pageCount = parseInt(decodeHtml(stripTags(valueHtml)), 10) || 0;
        } else if (label.indexOf("description") !== -1) {
            description = decodeHtml(stripTags(valueHtml));
        }
    }
    
    return {
        title: title,
        imageUrl: imageUrl,
        pageCount: pageCount,
        tags: tags,
        artists: artists,
        parodies: parodies,
        characters: characters,
        description: description,
        language: language
    };
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
            "User-Agent": HENTAINEXUS_USER_AGENT,
            "Referer": HENTAINEXUS_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    logError(method, error) {
        console.log("[hentainexus] " + method + " error: " + stringifyError(error));
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

    buildListUrl(mode, query, page) {
        const pageValue = Math.max(1, parseInt(page, 10) || 1);
        
        if (mode === "popular") {
            return HENTAINEXUS_BASE + "/explore/hot" + (pageValue > 1 ? "?page=" + pageValue : "");
        }
        
        if (mode === "search" && safeString(query).trim()) {
            // HentaiNexus search via URL param
            return HENTAINEXUS_BASE + "/?q=" + encodeURIComponent(query) + (pageValue > 1 ? "&page=" + pageValue : "");
        }
        
        // Default: Latest (home with pagination)
        return HENTAINEXUS_BASE + "/" + (pageValue > 1 ? "page/" + pageValue : "");
    }

    async fetchList(mode, query, page) {
        const url = this.buildListUrl(mode, query, page);
        const html = await this.requestHtml(url);
        const list = parseGalleryCards(html);
        return {
            list: list,
            hasNextPage: list.length > 0 && parseHasNextPage(html)
        };
    }

    async getPopular(page) {
        try {
            return await this.fetchList("popular", "", page);
        } catch (error) {
            this.logError("getPopular", error);
            throw error;
        }
    }

    async getLatestUpdates(page) {
        try {
            return await this.fetchList("latest", "", page);
        } catch (error) {
            this.logError("getLatestUpdates", error);
            throw error;
        }
    }

    async search(query, page, filters) {
        try {
            return await this.fetchList("search", query, page);
        } catch (error) {
            this.logError("search", error);
            throw error;
        }
    }

    async getDetail(url) {
        try {
            const id = extractGalleryId(url);
            if (!id) throw new Error("Invalid gallery URL: " + url);
            
            const fullUrl = url.indexOf("http") === 0 ? url : HENTAINEXUS_BASE + url;
            const html = await this.requestHtml(fullUrl);
            const detail = parseGalleryDetail(html);
            
            const lines = [];
            if (detail.description) lines.push(detail.description);
            if (detail.parodies.length > 0) lines.push("Parodies: " + detail.parodies.join(", "));
            if (detail.characters.length > 0) lines.push("Characters: " + detail.characters.slice(0, 8).join(", "));
            if (detail.artists.length > 0) lines.push("Artists: " + detail.artists.join(", "));
            if (detail.pageCount) lines.push("Pages: " + detail.pageCount);
            if (detail.language) lines.push("Language: " + detail.language);
            if (detail.tags.length > 0) lines.push("Tags: " + detail.tags.slice(0, 15).join(", "));
            
            const genre = [].concat(detail.tags, detail.parodies);
            
            return {
                name: detail.title,
                link: url,
                imageUrl: detail.imageUrl,
                description: lines.join("\n"),
                author: detail.artists.join(", ") || "Unknown",
                artist: detail.artists.join(", "),
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
            
            // HentaiNexus images use encrypted URLs decoded client-side in /read/ID
            // Try pattern: replace .thumb.jpg with just the base jpg on thumbnail URLs
            const fullUrl = url.indexOf("http") === 0 ? url : HENTAINEXUS_BASE + url;
            const html = await this.requestHtml(fullUrl);
            
            // Collect unique image hashes from the view page
            const pages = [];
            const seen = {};
            const pattern = /src="(https:\/\/images\.hentainexus\.com\/v2\/[a-f0-9]+\/(\d+)\.jpg)(?:\.thumb\.jpg)?"/gi;
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const fullImgUrl = match[1];
                if (!seen[fullImgUrl]) {
                    seen[fullImgUrl] = true;
                    pages.push(fullImgUrl);
                }
            }
            
            // If only 1 image found from view page (just cover), try fetching /read/ page
            if (pages.length <= 1) {
                try {
                    const readUrl = HENTAINEXUS_BASE + "/read/" + id;
                    const readHtml = await this.requestHtml(readUrl);
                    
                    // The read page has initReader with encrypted data - try to find image URLs
                    const readPattern = /(?:src|data-src)="(https:\/\/images\.hentainexus\.com\/v2\/[a-f0-9]+\/\d+\.[a-z]+)(?:\.thumb\.\w+)?"/gi;
                    while ((match = readPattern.exec(readHtml)) !== null) {
                        const u = match[1];
                        if (!seen[u]) {
                            seen[u] = true;
                            pages.push(u);
                        }
                    }
                } catch (e) {
                    console.log("[hentainexus] read page fetch failed");
                }
            }
            
            if (pages.length === 0) {
                throw new Error("Could not extract page images - site uses encrypted image URLs. Try the WebView option.");
            }
            return pages;
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [];
    }
}
