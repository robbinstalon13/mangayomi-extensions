const HENTAIFOX_BASE = "https://hentaifox.com";

const HENTAIFOX_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Popular parodies on HentaiFox
const PARODIES = [
    { name: "Pokemon", value: "pokemon" },
    { name: "Naruto", value: "naruto" },
    { name: "My Hero Academia", value: "my-hero-academia" },
    { name: "Dragon Ball Z", value: "dragon-ball-z" },
    { name: "One Piece", value: "one-piece" },
    { name: "Final Fantasy", value: "final-fantasy" },
    { name: "Sailor Moon", value: "sailor-moon" },
    { name: "Demon Slayer", value: "kimetsu-no-yaiba" },
    { name: "Bleach", value: "bleach" },
    { name: "Overwatch", value: "overwatch" },
    { name: "Genshin Impact", value: "genshin-impact" },
    { name: "Hololive", value: "hololive" },
    { name: "Love Live", value: "love-live" },
    { name: "Fate/Grand Order", value: "fate-grand-order" },
    { name: "Attack on Titan", value: "shingeki-no-kyojin" }
];

function safeString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value);
}

function stripTags(value) {
    return safeString(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function stringifyError(error) {
    if (error && error.message) {
        return safeString(error.message);
    }
    return safeString(error) || "Unknown error";
}

function isCloudflareBlocked(response) {
    if (!response) {
        return true;
    }
    const code = Number(response.statusCode || 0);
    if (code === 403 || code === 429 || code === 503) {
        return true;
    }
    const body = safeString(response.body).toLowerCase();
    if (!body) {
        return true;
    }
    const hasChallengeMarker = body.indexOf("cf-browser-verification") !== -1 ||
        body.indexOf("/cdn-cgi/challenge-platform/") !== -1 ||
        body.indexOf("<title>just a moment") !== -1 ||
        body.indexOf("attention required!") !== -1;
    return hasChallengeMarker;
}

function extractGalleryId(url) {
    const match = safeString(url).match(/\/gallery\/(\d+)/i);
    return match ? match[1] : "";
}

function parseGalleryCards(html) {
    const list = [];
    const seen = {};
    
    // HentaiFox gallery card pattern
    // Looking for: gallery link, title, thumbnail
    const pattern = /<div class="thumb">.*?<a href="\/gallery\/(\d+)\/"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*>.*?<div class="caption">([^<]*)<\/div>/gi;
    
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        const id = match[1];
        const imageUrl = match[2];
        const name = stripTags(match[3]) || "Unknown";
        const url = "/gallery/" + id + "/";
        
        if (!id || seen[url]) {
            continue;
        }
        seen[url] = true;
        
        // Convert thumbnail to full cover if possible
        const coverUrl = imageUrl.replace(/\/thumbs\//, "/covers/").replace(/_thumb\./, ".");
        
        list.push({
            name: name,
            link: url,
            imageUrl: coverUrl || imageUrl
        });
    }
    
    // Alternative pattern for different layouts
    if (list.length === 0) {
        const altPattern = /<a href="\/gallery\/(\d+)\/"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
        while ((match = altPattern.exec(safeString(html))) !== null) {
            const id = match[1];
            const imageUrl = match[2];
            const name = stripTags(match[3]) || "Unknown";
            const url = "/gallery/" + id + "/";
            
            if (!id || seen[url]) {
                continue;
            }
            seen[url] = true;
            
            list.push({
                name: name,
                link: url,
                imageUrl: imageUrl
            });
        }
    }
    
    return list;
}

function parseHasNextPage(html, currentPage) {
    const pageNum = parseInt(currentPage, 10) || 1;
    const htmlStr = safeString(html);
    // Check for next page link
    return /href="[^"]*(?:page|pag)\/(?:\d+)[^"]*"[^>]*>[Nn]ext/.test(htmlStr) ||
           /class="[^"]*next[^"]*"/.test(htmlStr) ||
           htmlStr.indexOf(">" + (pageNum + 1) + "<") !== -1;
}

function parseGalleryDetail(html) {
    const htmlStr = safeString(html);
    
    // Extract title
    const titleMatch = htmlStr.match(/<h1[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>)*[^<]*)<\/h1>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "Unknown";
    
    // Extract thumbnail/cover
    let imageUrl = "";
    const coverMatch = htmlStr.match(/<div class="cover"[^>]*>.*?<img[^>]+src="([^"]+)"/i);
    if (coverMatch) {
        imageUrl = coverMatch[1];
    }
    
    // Extract page count
    let pageCount = 0;
    const pageMatch = htmlStr.match(/(\d+)\s*(?:pages?|\/)/i) || 
                      htmlStr.match(/Pages?:?\s*(\d+)/i);
    if (pageMatch) {
        pageCount = parseInt(pageMatch[1], 10) || 0;
    }
    
    // Extract tags
    const tags = [];
    const tagPattern = /<a[^>]+href="\/tag\/[^"]+"[^>]*>([^<]*)<\/a>/gi;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(htmlStr)) !== null) {
        const tag = stripTags(tagMatch[1]);
        if (tag && tags.indexOf(tag) === -1) {
            tags.push(tag);
        }
    }
    
    // Check for English (HentaiFox is primarily English, but verify)
    const isEnglish = tags.some(tag => tag.toLowerCase().includes("english")) ||
                      htmlStr.toLowerCase().includes("language: english") ||
                      true; // HentaiFox is mostly English content
    
    // Extract artist
    let artist = "";
    const artistMatch = htmlStr.match(/<a[^>]+href="\/artist\/[^"]+"[^>]*>([^<]*)<\/a>/i);
    if (artistMatch) {
        artist = stripTags(artistMatch[1]);
    }
    
    // Extract parody
    let parody = "";
    const parodyMatch = htmlStr.match(/<a[^>]+href="\/parody\/[^"]+"[^>]*>([^<]*)<\/a>/i);
    if (parodyMatch) {
        parody = stripTags(parodyMatch[1]);
    }
    
    return {
        title: title,
        imageUrl: imageUrl,
        pageCount: pageCount,
        tags: tags,
        isEnglish: isEnglish,
        artist: artist,
        parody: parody
    };
}

class HentaiFox extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 10
        };
        this.currentBase = HENTAIFOX_BASE;
    }

    get supportsLatest() {
        return true;
    }

    getHeaders() {
        return {
            "User-Agent": HENTAIFOX_USER_AGENT,
            "Referer": this.currentBase + "/",
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
        const parodyFilter = filters && filters.find(f => f.type === "parody");
        
        if (parodyFilter && parodyFilter.value) {
            // Parody category browsing
            if (mode === "popular") {
                return HENTAIFOX_BASE + "/parody/" + parodyFilter.value + "/popular/" + (pageValue > 1 ? "page/" + pageValue + "/" : "");
            }
            return HENTAIFOX_BASE + "/parody/" + parodyFilter.value + "/" + (pageValue > 1 ? "page/" + pageValue + "/" : "");
        }
        
        if (mode === "popular") {
            return HENTAIFOX_BASE + "/popular/" + (pageValue > 1 ? "page/" + pageValue + "/" : "");
        }
        
        if (mode === "search" && query) {
            // HentaiFox search - filter for English implicitly
            return HENTAIFOX_BASE + "/search/?q=" + encodeURIComponent(query) + "&page=" + pageValue;
        }
        
        // Latest updates
        return HENTAIFOX_BASE + "/" + (pageValue > 1 ? "page/" + pageValue + "/" : "");
    }

    async fetchList(mode, query, page, filters) {
        const url = this.buildListUrl(mode, query, page, filters);
        const html = await this.requestHtml(url);
        const list = parseGalleryCards(html);
        
        // Filter for English content (HentaiFox is mostly English, but double-check)
        const englishList = list.filter(item => {
            // For now, assume all HentaiFox content is English
            // Could add detail-page check here if needed
            return true;
        });
        
        return {
            list: englishList,
            hasNextPage: list.length > 0 && parseHasNextPage(html, page)
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
            if (!id) {
                throw new Error("Invalid gallery URL: " + url);
            }
            
            const fullUrl = url.startsWith("http") ? url : HENTAIFOX_BASE + url;
            const html = await this.requestHtml(fullUrl);
            const detail = parseGalleryDetail(html);
            
            const pageCount = detail.pageCount || 0;
            const lines = [];
            if (detail.parody) {
                lines.push("Parody: " + detail.parody);
            }
            if (detail.artist) {
                lines.push("Artist: " + detail.artist);
            }
            if (detail.pageCount) {
                lines.push("Pages: " + detail.pageCount);
            }
            if (detail.tags.length > 0) {
                lines.push("Tags: " + detail.tags.slice(0, 10).join(", "));
            }
            
            return {
                name: detail.title,
                link: url,
                imageUrl: detail.imageUrl,
                description: lines.join("\n"),
                author: detail.artist || "Unknown",
                genre: detail.tags,
                status: 1,
                chapters: [{
                    name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
                    url: url,
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
            if (!id) {
                throw new Error("Invalid gallery URL: " + url);
            }
            
            const fullUrl = url.startsWith("http") ? url : HENTAIFOX_BASE + url;
            const html = await this.requestHtml(fullUrl);
            
            // Extract image server and paths from gallery page
            // HentaiFox uses a specific pattern for images
            const pages = [];
            
            // Try to find the image loader script/data
            const imageDataMatch = html.match(/var\s+images\s*=\s*(\[.*?\]);/i) ||
                                   html.match(/var\s+gallery\s*=\s*({.*?});/i);
            
            if (imageDataMatch) {
                try {
                    const imageData = JSON.parse(imageDataMatch[1] || imageDataMatch[2]);
                    if (Array.isArray(imageData)) {
                        for (const img of imageData) {
                            if (typeof img === "string") {
                                pages.push(img);
                            } else if (img && img.url) {
                                pages.push(img.url);
                            }
                        }
                    }
                } catch (e) {
                    console.log("[hentaifox] Failed to parse image data");
                }
            }
            
            // Fallback: Try to extract from thumbnail grid and infer full images
            if (pages.length === 0) {
                const thumbPattern = /data-src="(https:\/\/i\.hentaifox\.com\/[^"]+)"/gi;
                let match;
                while ((match = thumbPattern.exec(html)) !== null) {
                    const thumbUrl = match[1];
                    // Convert thumbnail URL to full image URL
                    // Pattern: i.hentaifox.com/{path}/{id}/{page}_thumb.jpg -> i.hentaifox.com/{path}/{id}/{page}.jpg
                    const fullUrl = thumbUrl.replace(/_thumb\./, ".");
                    pages.push(fullUrl);
                }
            }
            
            // Another fallback: Look for page links
            if (pages.length === 0) {
                const pagePattern = /href="(\/g\/\d+\/\d+\/[^"]+)"/gi;
                const pageLinks = [];
                let match;
                while ((match = pagePattern.exec(html)) !== null) {
                    pageLinks.push(HENTAIFOX_BASE + match[1]);
                }
                
                // Fetch first page to get image pattern
                if (pageLinks.length > 0) {
                    const firstPageHtml = await this.requestHtml(pageLinks[0]);
                    const imgMatch = firstPageHtml.match(/<img[^>]+src="(https:\/\/i\.hentaifox\.com\/[^"]+)"/i);
                    if (imgMatch) {
                        const baseImgUrl = imgMatch[1];
                        // Extract pattern and generate all page URLs
                        const basePattern = baseImgUrl.replace(/\d+\.\w+$/, "");
                        const ext = baseImgUrl.match(/\.\w+$/) ? baseImgUrl.match(/\.\w+$/)[0] : ".jpg";
                        const pageCount = pageLinks.length;
                        for (let i = 1; i <= pageCount; i++) {
                            pages.push(basePattern + i + ext);
                        }
                    }
                }
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
                type: "parody",
                name: "Parody",
                options: PARODIES
            }
        ];
    }
}
