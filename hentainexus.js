const HENTAINEXUS_BASE = "https://hentainexus.com";

const HENTAINEXUS_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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
    const match = safeString(url).match(/\/view\/(\d+)/i);
    return match ? match[1] : "";
}

function parseGalleryList(html) {
    const list = [];
    const seen = {};
    const htmlStr = safeString(html);
    
    // HentaiNexus gallery list pattern - looking for links to /view/{id}
    // The site lists galleries with title as the link text
    const pattern = /<a href="\/view\/(\d+)"[^>]*>([^<]+)<\/a>/gi;
    
    let match;
    while ((match = pattern.exec(htmlStr)) !== null) {
        const id = match[1];
        const name = stripTags(match[2]) || "Unknown";
        const url = "/view/" + id;
        
        if (!id || seen[url]) {
            continue;
        }
        seen[url] = true;
        
        list.push({
            name: name,
            link: url,
            imageUrl: "" // Will be fetched from detail page
        });
    }
    
    // Try to extract thumbnails if available
    // HentaiNexus may have thumbs in the listing
    if (list.length > 0) {
        const thumbPattern = /<a href="\/view\/(\d+)"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*>/gi;
        const thumbs = {};
        while ((match = thumbPattern.exec(htmlStr)) !== null) {
            thumbs["/view/" + match[1]] = match[2];
        }
        
        for (const item of list) {
            if (thumbs[item.link]) {
                item.imageUrl = thumbs[item.link];
            }
        }
    }
    
    return list;
}

function parseHasNextPage(html, currentPage) {
    const pageNum = parseInt(currentPage, 10) || 1;
    const htmlStr = safeString(html);
    
    // Check for next page navigation
    return /href="[^"]*\/page\/(\d+)"[^>]*>\s*Next/i.test(htmlStr) ||
           /class="[^"]*pagination[^"]*".*?>/i.test(htmlStr) && 
           htmlStr.indexOf(">" + (pageNum + 1) + "<") !== -1;
}

function parseGalleryDetail(html) {
    const htmlStr = safeString(html);
    
    // Extract title - usually in h1 or h2
    let title = "Unknown";
    const titleMatch = htmlStr.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       htmlStr.match(/<h2[^>]*>([^<]+)<\/h2>/i) ||
                       htmlStr.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
        title = stripTags(titleMatch[1]).replace(/\s*-\s*HentaiNexus$/i, "");
    }
    
    // Extract cover/thumbnail image
    let imageUrl = "";
    const coverMatch = htmlStr.match(/<img[^>]+class="[^"]*cover[^"]*"[^>]+src="([^"]+)"/i) ||
                       htmlStr.match(/<img[^>]+id="cover"[^>]+src="([^"]+)"/i) ||
                       htmlStr.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (coverMatch) {
        imageUrl = coverMatch[1];
    }
    
    // Extract page count
    let pageCount = 0;
    const pageMatch = htmlStr.match(/(\d+)\s*pages?/i) ||
                      htmlStr.match(/Pages?:?\s*(\d+)/i);
    if (pageMatch) {
        pageCount = parseInt(pageMatch[1], 10) || 0;
    }
    
    // Extract description/summary
    let description = "";
    const descMatch = htmlStr.match(/<div[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                      htmlStr.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
    if (descMatch) {
        description = stripTags(descMatch[1]);
    }
    
    // Extract tags
    const tags = [];
    const tagPattern = /<a[^>]+href="\/tag\/[^"]+"[^>]*>([^<]+)<\/a>/gi;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(htmlStr)) !== null) {
        const tag = stripTags(tagMatch[1]);
        if (tag && tags.indexOf(tag) === -1) {
            tags.push(tag);
        }
    }
    
    // Extract artist
    let artist = "";
    const artistPattern = /<a[^>]+href="\/artist\/[^"]+"[^>]*>([^<]+)<\/a>/gi;
    const artistMatch = artistPattern.exec(htmlStr);
    if (artistMatch) {
        artist = stripTags(artistMatch[1]);
    }
    
    // Extract parody
    let parody = "";
    const parodyPattern = /<a[^>]+href="\/parody\/[^"]+"[^>]*>([^<]+)<\/a>/gi;
    const parodyMatch = parodyPattern.exec(htmlStr);
    if (parodyMatch) {
        parody = stripTags(parodyMatch[1]);
    }
    
    // HentaiNexus is primarily English content
    const isEnglish = true;
    
    return {
        title: title,
        imageUrl: imageUrl,
        pageCount: pageCount,
        description: description,
        tags: tags,
        isEnglish: isEnglish,
        artist: artist,
        parody: parody
    };
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 10
        };
        this.currentBase = HENTAINEXUS_BASE;
    }

    get supportsLatest() {
        return true;
    }

    getHeaders() {
        return {
            "User-Agent": HENTAINEXUS_USER_AGENT,
            "Referer": this.currentBase + "/",
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
        
        if (mode === "popular" || mode === "hot") {
            return HENTAINEXUS_BASE + "/explore/hot" + (pageValue > 1 ? "?page=" + pageValue : "");
        }
        
        if (mode === "recommended") {
            return HENTAINEXUS_BASE + "/explore/recommend" + (pageValue > 1 ? "?page=" + pageValue : "");
        }
        
        if (mode === "search" && query) {
            // HentaiNexus search
            return HENTAINEXUS_BASE + "/?q=" + encodeURIComponent(query) + (pageValue > 1 ? "&page=" + pageValue : "");
        }
        
        // Default: Latest updates (home page)
        return HENTAINEXUS_BASE + "/" + (pageValue > 1 ? "page/" + pageValue : "");
    }

    async fetchList(mode, query, page) {
        const url = this.buildListUrl(mode, query, page);
        const html = await this.requestHtml(url);
        const list = parseGalleryList(html);
        
        // HentaiNexus is English-only, but verify
        const englishList = list.filter(item => {
            // All HentaiNexus content is English
            return true;
        });
        
        return {
            list: englishList,
            hasNextPage: list.length > 0 && parseHasNextPage(html, page)
        };
    }

    async getPopular(page) {
        try {
            return await this.fetchList("hot", "", page);
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
            if (!id) {
                throw new Error("Invalid gallery URL: " + url);
            }
            
            const fullUrl = url.startsWith("http") ? url : HENTAINEXUS_BASE + url;
            const html = await this.requestHtml(fullUrl);
            const detail = parseGalleryDetail(html);
            
            const pageCount = detail.pageCount || 0;
            const lines = [];
            if (detail.description) {
                lines.push(detail.description);
            }
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
            
            const fullUrl = url.startsWith("http") ? url : HENTAINEXUS_BASE + url;
            const html = await this.requestHtml(fullUrl);
            
            // Extract image URLs from the gallery page
            const pages = [];
            
            // HentaiNexus uses various image hosting patterns
            // Try to find image links or data
            const imagePattern = /href="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp))"/gi;
            let match;
            while ((match = imagePattern.exec(html)) !== null) {
                const imgUrl = match[1];
                if (imgUrl.indexOf("hentainexus") !== -1 || 
                    imgUrl.indexOf("nxcdn") !== -1 ||
                    imgUrl.indexOf("i.") !== -1) {
                    pages.push(imgUrl);
                }
            }
            
            // Alternative: Look for data attributes with image URLs
            if (pages.length === 0) {
                const dataPattern = /data-(?:src|url|image)="(https?:\/\/[^"]+)"/gi;
                while ((match = dataPattern.exec(html)) !== null) {
                    const imgUrl = match[1];
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(imgUrl)) {
                        pages.push(imgUrl);
                    }
                }
            }
            
            // Another approach: Look for page links and fetch them
            if (pages.length === 0) {
                const pageLinkPattern = /href="(\/view\/\d+\/\d+)"/gi;
                const pageLinks = [];
                while ((match = pageLinkPattern.exec(html)) !== null) {
                    pageLinks.push(HENTAINEXUS_BASE + match[1]);
                }
                
                // Fetch first few pages to get image URLs
                const maxPages = Math.min(pageLinks.length, 50); // Limit concurrent requests
                for (let i = 0; i < maxPages; i++) {
                    try {
                        const pageHtml = await this.requestHtml(pageLinks[i]);
                        const imgMatch = pageHtml.match(/<img[^>]+src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp))"/i);
                        if (imgMatch) {
                            pages.push(imgMatch[1]);
                        }
                    } catch (e) {
                        console.log("[hentainexus] Failed to fetch page: " + pageLinks[i]);
                    }
                }
            }
            
            // Remove duplicates while preserving order
            const uniquePages = [];
            const seen = {};
            for (const url of pages) {
                if (!seen[url]) {
                    seen[url] = true;
                    uniquePages.push(url);
                }
            }
            
            if (uniquePages.length === 0) {
                throw new Error("Could not extract page images");
            }
            
            return uniquePages;
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [];
    }
}
