const EHENTAI_BASE = "https://e-hentai.org";
const EHENTAI_API = "https://api.e-hentai.org/api.php";
const EHENTAI_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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
        .replace(/&#x([0-9a-fA-F]+);/g, function (_, code) {
            const v = parseInt(code, 16);
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

function extractGidToken(url) {
    const m = safeString(url).match(/\/g\/(\d+)\/([a-f0-9]+)/i);
    if (!m) return null;
    // Return full URL with base, not just the path
    const fullUrl = EHENTAI_BASE + m[0];
    return { gid: parseInt(m[1], 10), token: m[2], url: m[0], fullUrl: fullUrl };
}

// Parse E-Hentai gallery list rows
// Structure: <tr><td class="gl1c glcat">...</td><td class="gl2c"><img data-src="THUMB"/></td>
// <td class="gl3c glname"><a href="URL"><div class="glink">TITLE</div>...</a></td></tr>
function parseGalleryCards(html) {
    const list = [];
    const seen = {};
    const htmlStr = safeString(html);
    
    // Match each gallery row - extensions compact/thumbnail/extended layouts all have gl3c glname with glink
    const rowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*class="gl2c"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="gl3c glname"[^>]*>([\s\S]*?)<\/td>/gi;
    
    let match;
    while ((match = rowPattern.exec(htmlStr)) !== null) {
        const thumbCell = match[1];
        const nameCell = match[2];
        
        // Extract title from glink div
        const title = decodeHtml(stripTags(firstMatch(nameCell, /<div class="glink">([\s\S]*?)<\/div>/i)));
        if (!title) continue;
        
        // Extract URL from anchor
        const url = firstMatch(nameCell, /<a href="(https?:\/\/e-hentai\.org\/g\/\d+\/[a-f0-9]+\/?)"/i);
        if (!url || seen[url]) continue;
        
        // Extract thumbnail - prefer data-src over src
        let imageUrl = firstMatch(thumbCell, /data-src="([^"]+)"/i);
        if (!imageUrl || imageUrl.indexOf("data:image") === 0) {
            imageUrl = firstMatch(thumbCell, /<img[^>]+src="([^"]+)"/i);
        }
        if (imageUrl && imageUrl.indexOf("data:image") === 0) {
            imageUrl = "";
        }
        
        seen[url] = true;
        list.push({
            name: title,
            link: url,
            imageUrl: imageUrl
        });
    }
    
    // Fallback: minimal layout without gl2c/gl3c (e.g. thumbnail view)
    if (list.length === 0) {
        const thumbPattern = /<div class="id1"[^>]*>[\s\S]*?<a href="(https?:\/\/e-hentai\.org\/g\/\d+\/[a-f0-9]+\/?)"[^>]*>[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>[\s\S]*?<div class="id3"[^>]*>([\s\S]*?)<\/div>/gi;
        while ((match = thumbPattern.exec(htmlStr)) !== null) {
            const url = match[1];
            if (seen[url]) continue;
            seen[url] = true;
            list.push({
                name: decodeHtml(stripTags(match[3])) || "Unknown",
                link: url,
                imageUrl: match[2] && match[2].indexOf("data:image") !== 0 ? match[2] : ""
            });
        }
    }
    
    return list;
}

function parseHasNextPage(html) {
    const htmlStr = safeString(html);
    return /id="unext"[^>]*href=/i.test(htmlStr) ||
           /id="dnext"[^>]*href=/i.test(htmlStr);
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
            "User-Agent": EHENTAI_USER_AGENT,
            "Referer": EHENTAI_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    logError(method, error) {
        console.log("[e-hentai] " + method + " error: " + stringifyError(error));
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

    async requestJson(bodyStr) {
        const client = new Client(this.clientConfig);
        const headers = this.getHeaders();
        headers["Content-Type"] = "application/json";
        const response = await client.post(EHENTAI_API, headers, bodyStr);
        if (isCloudflareBlocked(response)) {
            throw new Error("Cloudflare blocked for API");
        }
        const statusCode = Number(response.statusCode || 0);
        if (statusCode >= 400) {
            throw new Error("API request failed with status " + statusCode);
        }
        return parseJsonSafe(safeString(response.body), null);
    }

    // Add language:english filter to queries
    buildSearchQuery(query) {
        const q = safeString(query).trim();
        return q ? q + " language:english" : "language:english";
    }

    buildListUrl(mode, query, page) {
        // E-Hentai uses 0-indexed pagination via ?page=N
        const pageValue = Math.max(0, (parseInt(page, 10) || 1) - 1);
        const searchQuery = this.buildSearchQuery(query);
        const qParam = "f_search=" + encodeURIComponent(searchQuery);
        const pageParam = pageValue > 0 ? "&page=" + pageValue : "";
        
        if (mode === "popular") {
            // Sort by rating (f_srdd=2 = min rating 2 stars, ensures quality)
            return EHENTAI_BASE + "/?" + qParam + pageParam + "&f_sr=on&f_srdd=2";
        }
        return EHENTAI_BASE + "/?" + qParam + pageParam;
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
            const info = extractGidToken(url);
            if (!info) throw new Error("Invalid gallery URL: " + url);
            
            const fullUrl = url.indexOf("http") === 0 ? url : EHENTAI_BASE + url;
            const html = await this.requestHtml(fullUrl);
            
            // Title from <h1 id="gn">
            const title = decodeHtml(stripTags(firstMatch(html, /<h1 id="gn"[^>]*>([\s\S]*?)<\/h1>/i))) || "Unknown";
            const titleJpn = decodeHtml(stripTags(firstMatch(html, /<h1 id="gj"[^>]*>([\s\S]*?)<\/h1>/i)));
            
            // Cover image from <div id="gd1"><div style="...url(URL)...
            let imageUrl = firstMatch(html, /id="gd1"[^>]*>\s*<div[^>]+url\(([^)]+)\)/i);
            
            // Category
            const category = decodeHtml(stripTags(firstMatch(html, /<div id="gdc"[^>]*>[\s\S]*?<div[^>]+>([^<]+)<\/div>/i)));
            
            // Page count from Length row
            let pageCount = 0;
            const lengthMatch = html.match(/class="gdt1">Length:<\/td>\s*<td[^>]*>(\d+)\s*pages?/i);
            if (lengthMatch) pageCount = parseInt(lengthMatch[1], 10) || 0;
            
            // Posted date
            const postedMatch = html.match(/class="gdt1">Posted:<\/td>\s*<td[^>]*>([^<]+)</i);
            const posted = postedMatch ? postedMatch[1].trim() : "";
            
            // Rating
            const ratingMatch = html.match(/id="rating_label"[^>]*>Average:\s*([\d.]+)/i);
            const rating = ratingMatch ? ratingMatch[1] : "";
            
            // Tags from #taglist
            const artists = [];
            const parodies = [];
            const characters = [];
            const generalTags = [];
            const allGenre = [];
            
            const taglistMatch = html.match(/id="taglist"[\s\S]*?<\/table>/i);
            if (taglistMatch) {
                const taglist = taglistMatch[0];
                // Each row: <tr><td class="tc">CATEGORY:</td><td>...<a>TAG</a>...</td></tr>
                const rowPattern = /<tr>\s*<td class="tc">([^<]+):<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
                let rowMatch;
                while ((rowMatch = rowPattern.exec(taglist)) !== null) {
                    const cat = decodeHtml(stripTags(rowMatch[1])).toLowerCase().trim();
                    const values = [];
                    const linkPattern = /<a[^>]*>([^<]+)<\/a>/gi;
                    let linkMatch;
                    while ((linkMatch = linkPattern.exec(rowMatch[2])) !== null) {
                        const tag = decodeHtml(stripTags(linkMatch[1]));
                        if (tag) {
                            values.push(tag);
                            allGenre.push(cat + ":" + tag);
                        }
                    }
                    if (cat === "artist") {
                        for (let i = 0; i < values.length; i++) artists.push(values[i]);
                    } else if (cat === "parody") {
                        for (let i = 0; i < values.length; i++) parodies.push(values[i]);
                    } else if (cat === "character") {
                        for (let i = 0; i < values.length; i++) characters.push(values[i]);
                    } else {
                        for (let i = 0; i < values.length; i++) generalTags.push(values[i]);
                    }
                }
            }
            
            const author = artists.length > 0 ? artists.join(", ") : "Unknown";
            
            const lines = [];
            if (titleJpn) lines.push("Japanese: " + titleJpn);
            if (category) lines.push("Category: " + category);
            if (pageCount) lines.push("Pages: " + pageCount);
            if (rating) lines.push("Rating: " + rating + "/5");
            if (posted) lines.push("Posted: " + posted);
            if (parodies.length > 0) lines.push("Parodies: " + parodies.join(", "));
            if (artists.length > 0) lines.push("Artists: " + artists.join(", "));
            if (characters.length > 0) lines.push("Characters: " + characters.slice(0, 8).join(", "));
            if (generalTags.length > 0) lines.push("Tags: " + generalTags.slice(0, 20).join(", "));
            
            return {
                name: title,
                link: info.url,
                imageUrl: imageUrl,
                description: lines.join("\n"),
                author: author,
                artist: artists.join(", "),
                genre: allGenre,
                status: 1,
                chapters: [{
                    name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
                    url: info.url,
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
            const info = extractGidToken(url);
            if (!info) throw new Error("Invalid gallery URL: " + url);
            
            const pageImages = [];
            let currentPage = 0;
            const seenPageUrls = {};
            
            // E-Hentai gallery shows thumbnails and links to /s/hash/gid-n pages
            // Iterate gallery pagination to collect all page links
            while (currentPage < 20) { // safety limit
                const galleryUrl = info.fullUrl + (currentPage > 0 ? "?p=" + currentPage : "");
                const html = await this.requestHtml(galleryUrl);
                
                // Extract page links: /s/{hash}/{gid}-{pagenum}
                const pagePattern = new RegExp("href=\"(https?://e-hentai\\.org/s/[a-f0-9]+/" + info.gid + "-\\d+)\"", "gi");
                const pageLinks = [];
                let m;
                while ((m = pagePattern.exec(html)) !== null) {
                    if (!seenPageUrls[m[1]]) {
                        seenPageUrls[m[1]] = true;
                        pageLinks.push(m[1]);
                    }
                }
                
                if (pageLinks.length === 0) break;
                
                // Fetch each page to extract full image URL
                for (let i = 0; i < pageLinks.length; i++) {
                    try {
                        const pageHtml = await this.requestHtml(pageLinks[i]);
                        const imgUrl = firstMatch(pageHtml, /<img[^>]+id="img"[^>]+src="([^"]+)"/i);
                        if (imgUrl) {
                            pageImages.push(imgUrl);
                        }
                    } catch (e) {
                        console.log("[e-hentai] page fetch failed: " + pageLinks[i]);
                    }
                }
                
                // Check if there's a next gallery page
                const nextPagePattern = new RegExp("href=\"[^\"]*?\\?p=" + (currentPage + 1) + "\"", "i");
                if (!nextPagePattern.test(html)) break;
                currentPage++;
            }
            
            if (pageImages.length === 0) {
                throw new Error("Could not extract page images");
            }
            return pageImages;
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [];
    }
}
