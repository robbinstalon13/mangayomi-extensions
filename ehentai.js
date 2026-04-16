const EHENTAI_BASE = "https://e-hentai.org";
const EHENTAI_API = "https://api.e-hentai.org/api.php";

const EHENTAI_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function safeString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value);
}

function stripTags(value) {
    return safeString(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseJsonSafe(value, fallbackValue) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallbackValue;
    }
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

function extractGalleryIdAndToken(url) {
    const match = safeString(url).match(/\/g\/(\d+)\/([a-f0-9]+)/i);
    if (match) {
        return { gid: parseInt(match[1], 10), token: match[2] };
    }
    return null;
}

function parseGalleryCards(html) {
    const list = [];
    const seen = {};
    // E-Hentai gallery list pattern
    const pattern = /<div class="gl[1-6]?t\s*"[^>]*>.*?<a href="(https?:\/\/e-hentai\.org\/g\/\d+\/[^\/"]+)\/?"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*>.*?<div class="gld\d?">([^<]*)<\/div>/gi;
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        const url = match[1];
        const imageUrl = match[2];
        const name = stripTags(match[3]) || "Unknown";
        if (!url || seen[url]) {
            continue;
        }
        seen[url] = true;
        list.push({
            name: name,
            link: url,
            imageUrl: imageUrl
        });
    }
    // Alternative pattern for different E-Hentai layouts
    if (list.length === 0) {
        const altPattern = /<a href="(https?:\/\/e-hentai\.org\/g\/(\d+)\/([a-f0-9]+))\/?"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*>.*?<div[^>]*>([^<]+)<\/div>/gi;
        while ((match = altPattern.exec(safeString(html))) !== null) {
            const url = match[1];
            const imageUrl = match[4];
            const name = stripTags(match[5]) || "Unknown";
            if (!url || seen[url]) {
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

function parseHasNextPage(html) {
    return /next[^>]*>[Nn]ext<\/a>/.test(safeString(html)) ||
           /href="[^"]*?\?[^"]*?page=\d+"/.test(safeString(html));
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 10
        };
        this.currentBase = EHENTAI_BASE;
    }

    get supportsLatest() {
        return true;
    }

    getHeaders() {
        return {
            "User-Agent": EHENTAI_USER_AGENT,
            "Referer": this.currentBase + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    logError(method, error) {
        console.log("[e-hentai] " + method + " error: " + stringifyError(error));
    }

    // Add English language filter to search query
    addEnglishFilter(query) {
        const baseQuery = safeString(query);
        if (baseQuery) {
            return baseQuery + " language:english";
        }
        return "language:english";
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

    async requestJson(body) {
        const client = new Client(this.clientConfig);
        const response = await client.post(EHENTAI_API, this.getHeaders(), body);
        if (isCloudflareBlocked(response)) {
            throw new Error("Cloudflare blocked for API");
        }
        const statusCode = Number(response.statusCode || 0);
        if (statusCode >= 400) {
            throw new Error("API request failed with status " + statusCode);
        }
        const responseBody = safeString(response.body);
        if (!responseBody) {
            throw new Error("Empty API response");
        }
        return parseJsonSafe(responseBody, null);
    }

    buildListUrl(mode, query, page) {
        const pageValue = Math.max(0, parseInt(page, 10) - 1 || 0); // E-Hentai uses 0-indexed pages
        const englishQuery = this.addEnglishFilter(query);
        if (mode === "popular") {
            // E-Hentai popular sorting via advanced search
            return EHENTAI_BASE + "/?page=" + pageValue + "&f_search=" + encodeURIComponent(englishQuery) + "&f_srdd=2";
        }
        return EHENTAI_BASE + "/?page=" + pageValue + "&f_search=" + encodeURIComponent(englishQuery);
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
            const galleryInfo = extractGalleryIdAndToken(url);
            if (!galleryInfo) {
                throw new Error("Invalid gallery URL: " + url);
            }
            
            // Use E-Hentai JSON API for metadata
            const apiBody = JSON.stringify({
                method: "gdata",
                gidlist: [[galleryInfo.gid, galleryInfo.token]],
                namespace: 1
            });
            
            const data = await this.requestJson(apiBody);
            if (!data || !data.gmetadata || !data.gmetadata[0]) {
                throw new Error("Failed to fetch gallery metadata");
            }
            
            const meta = data.gmetadata[0];
            
            // Check if English
            const tags = meta.tags || [];
            const isEnglish = tags.some(tag => tag === "language:english" || tag === "language:English");
            if (!isEnglish) {
                console.log("[e-hentai] Warning: Gallery may not be English");
            }
            
            // Parse tags
            const artists = [];
            const parodies = [];
            const characters = [];
            const generalTags = [];
            
            for (const tag of tags) {
                if (tag.startsWith("artist:")) {
                    artists.push(tag.replace("artist:", ""));
                } else if (tag.startsWith("parody:")) {
                    parodies.push(tag.replace("parody:", ""));
                } else if (tag.startsWith("character:")) {
                    characters.push(tag.replace("character:", ""));
                } else {
                    generalTags.push(tag);
                }
            }
            
            const author = artists.join(", ") || meta.uploader || "Unknown";
            const genre = tags;
            
            // Build description
            const lines = [];
            if (meta.title_jpn) {
                lines.push("Japanese: " + meta.title_jpn);
            }
            if (meta.category) {
                lines.push("Category: " + meta.category);
            }
            if (meta.filecount) {
                lines.push("Pages: " + meta.filecount);
            }
            if (meta.rating) {
                lines.push("Rating: " + meta.rating + "/5");
            }
            if (parodies.length > 0) {
                lines.push("Parodies: " + parodies.join(", "));
            }
            if (artists.length > 0) {
                lines.push("Artists: " + artists.join(", "));
            }
            if (characters.length > 0) {
                lines.push("Characters: " + characters.join(", "));
            }
            if (generalTags.length > 0) {
                lines.push("Tags: " + generalTags.slice(0, 15).join(", "));
            }
            
            const description = lines.join("\n");
            const pageCount = parseInt(meta.filecount, 10) || 0;
            
            return {
                name: meta.title || "Unknown",
                link: url,
                imageUrl: meta.thumb || "",
                description: description,
                author: author,
                genre: genre,
                status: 1,
                chapters: [{
                    name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
                    url: url,
                    dateUpload: meta.posted ? String(parseInt(meta.posted, 10) * 1000) : ""
                }]
            };
        } catch (error) {
            this.logError("getDetail", error);
            throw error;
        }
    }

    async getPageList(url) {
        try {
            // E-Hentai pages require HTML scraping from the gallery pages
            // First get the gallery page to find the first page link
            const galleryInfo = extractGalleryIdAndToken(url);
            if (!galleryInfo) {
                throw new Error("Invalid gallery URL: " + url);
            }
            
            const html = await this.requestHtml(url);
            
            // Extract page links from the gallery page
            const pageLinks = [];
            const seen = {};
            
            // Pattern for page links in E-Hentai
            const pattern = /href="(https?:\/\/e-hentai\.org\/s\/[a-f0-9]+\/\d+-\d+)"/gi;
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const pageUrl = match[1];
                if (!seen[pageUrl]) {
                    seen[pageUrl] = true;
                    pageLinks.push(pageUrl);
                }
            }
            
            // If we found page links, fetch each page to get image URLs
            const pages = [];
            for (const pageUrl of pageLinks) {
                try {
                    const pageHtml = await this.requestHtml(pageUrl);
                    // Extract image URL from the page
                    const imgMatch = pageHtml.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/i);
                    if (imgMatch) {
                        pages.push(imgMatch[1]);
                    }
                } catch (e) {
                    console.log("[e-hentai] Failed to fetch page: " + pageUrl);
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
        return [];
    }
}
