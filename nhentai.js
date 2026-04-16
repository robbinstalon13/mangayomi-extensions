const NHENTAI_MIRRORS = [
    { key: "xxx", base: "https://nhentai.xxx" },
    { key: "to", base: "https://nhentai.to" }
];

const NHENTAI_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Popular parodies - nhentai uses these URL slugs
const NHENTAI_PARODIES = [
    { name: "Any", value: "" },
    { name: "Pokemon", value: "pokemon" },
    { name: "Naruto", value: "naruto" },
    { name: "My Hero Academia", value: "boku-no-hero-academia" },
    { name: "One Piece", value: "one-piece" },
    { name: "Dragon Ball", value: "dragon-ball" },
    { name: "Fate Grand Order", value: "fate-grand-order" },
    { name: "Genshin Impact", value: "genshin-impact" },
    { name: "Blue Archive", value: "blue-archive" },
    { name: "Touhou Project", value: "touhou-project" },
    { name: "Sailor Moon", value: "sailor-moon" },
    { name: "Attack on Titan", value: "shingeki-no-kyojin" },
    { name: "Demon Slayer", value: "kimetsu-no-yaiba" },
    { name: "Sword Art Online", value: "sword-art-online" },
    { name: "Hololive", value: "hololive" },
    { name: "Love Live", value: "love-live" },
    { name: "Kantai Collection", value: "kantai-collection" },
    { name: "Idolmaster", value: "the-idolm-ster" },
    { name: "Neon Genesis Evangelion", value: "neon-genesis-evangelion" },
    { name: "Overwatch", value: "overwatch" },
    { name: "Final Fantasy", value: "final-fantasy-vii" },
    { name: "Zelda", value: "the-legend-of-zelda" }
];

// Common tags/categories
const NHENTAI_CATEGORIES = [
    { name: "Any", value: "" },
    { name: "Manga", value: "manga" },
    { name: "Doujinshi", value: "doujinshi" },
    { name: "Artist CG", value: "artist-cg" },
    { name: "Game CG", value: "game-cg" },
    { name: "Western", value: "western" },
    { name: "Non-H", value: "non-h" },
    { name: "Image Set", value: "image-set" }
];

// Popular tags
const NHENTAI_TAGS = [
    { name: "Any", value: "" },
    { name: "Vanilla", value: "vanilla" },
    { name: "Romance", value: "romance" },
    { name: "Big Breasts", value: "big-breasts" },
    { name: "Big Ass", value: "big-ass" },
    { name: "Nakadashi", value: "nakadashi" },
    { name: "Stockings", value: "stockings" },
    { name: "Glasses", value: "glasses" },
    { name: "Schoolgirl Uniform", value: "schoolgirl-uniform" },
    { name: "Sole Female", value: "sole-female" },
    { name: "Sole Male", value: "sole-male" },
    { name: "Milf", value: "milf" },
    { name: "Netorare", value: "netorare" },
    { name: "Yuri", value: "yuri" },
    { name: "Lolicon", value: "lolicon" },
    { name: "Shotacon", value: "shotacon" },
    { name: "Ahegao", value: "ahegao" },
    { name: "Elf", value: "elf" },
    { name: "Monster Girl", value: "monster-girl" },
    { name: "Bunny Girl", value: "bunny-girl" },
    { name: "Cosplaying", value: "cosplaying" },
    { name: "Maid", value: "maid" },
    { name: "Twintails", value: "twintails" }
];

const NHENTAI_SORT_OPTIONS = [
    { name: "Latest", value: "latest" },
    { name: "Popular", value: "popular" }
];

function safeString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value);
}

function normalizeWhitespace(value) {
    return safeString(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
    return safeString(value)
        .replace(/&nbsp;/gi, " ")
        .replace(/&#(\d+);/g, function (_, code) {
            const value = parseInt(code, 10);
            return isNaN(value) ? _ : String.fromCharCode(value);
        })
        .replace(/&#x([0-9a-fA-F]+);/g, function (_, code) {
            const value = parseInt(code, 16);
            return isNaN(value) ? _ : String.fromCharCode(value);
        })
        .replace(/&quot;/gi, "\"")
        .replace(/&#039;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");
}

function stripTags(value) {
    return normalizeWhitespace(decodeHtml(safeString(value).replace(/<[^>]*>/g, " ")));
}

function uniqueStrings(values) {
    const seen = {};
    const result = [];
    const list = Array.isArray(values) ? values : [];
    for (let i = 0; i < list.length; i++) {
        const value = normalizeWhitespace(list[i]);
        if (!value) {
            continue;
        }
        const key = value.toLowerCase();
        if (seen[key]) {
            continue;
        }
        seen[key] = true;
        result.push(value);
    }
    return result;
}

function firstMatch(text, regex) {
    const match = safeString(text).match(regex);
    if (!match || match.length < 2) {
        return "";
    }
    return safeString(match[1]);
}

function absoluteUrl(value, fallbackBase) {
    const url = safeString(value).trim();
    if (!url) {
        return "";
    }
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    if (url.indexOf("//") === 0) {
        return "https:" + url;
    }
    if (url.indexOf("/") === 0) {
        return safeString(fallbackBase).replace(/\/$/, "") + url;
    }
    return url;
}

function normalizeGalleryPath(value) {
    const match = safeString(value).match(/\/g\/\d+\/?/);
    if (!match) {
        return "";
    }
    let link = match[0];
    if (link.charAt(link.length - 1) !== "/") {
        link += "/";
    }
    return link;
}

function buildStoredLink(value, mirrorKey) {
    const path = normalizeGalleryPath(value);
    if (!path) {
        return "";
    }
    const key = safeString(mirrorKey).toLowerCase();
    return key ? path + "#mirror=" + key : path;
}

function extractGalleryId(url) {
    return firstMatch(url, /\/g\/(\d+)/i);
}

function extractMirrorKey(url) {
    const match = safeString(url).match(/[#?&]mirror=(xxx|to)/i);
    return match ? safeString(match[1]).toLowerCase() : "";
}

function toDateUpload(value) {
    const time = Date.parse(safeString(value));
    if (isNaN(time)) {
        return "";
    }
    return String(time);
}

function parseJsonSafe(value, fallbackValue) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallbackValue;
    }
}

function getPageExtension(typeToken) {
    const token = safeString(typeToken).split(",")[0];
    if (token === "p") {
        return "png";
    }
    if (token === "g") {
        return "gif";
    }
    if (token === "w") {
        return "webp";
    }
    return "jpg";
}

function stringifyError(error) {
    if (error && error.message) {
        return safeString(error.message);
    }
    return safeString(error) || "Unknown error";
}

function hasUsableNhentaiContent(body) {
    const html = safeString(body);
    if (!html) {
        return false;
    }
    return /href=["']\/g\/\d+\/?["']/i.test(html) ||
        /id="load_server"/i.test(html) ||
        /var g_th = \$\.parseJSON\('/i.test(html) ||
        /<h1[^>]*>/i.test(html) && /<img[^>]+(?:src|data-src)=["'][^"']+\/cover\.[^"']+["']/i.test(html);
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
    if (!hasChallengeMarker) {
        return false;
    }
    return !hasUsableNhentaiContent(body);
}

function parseHasNextPage(html, currentPage) {
    let maxPage = Number(currentPage || 1);
    safeString(html).replace(/page=(\d+)/gi, function (_, page) {
        const value = parseInt(page, 10);
        if (!isNaN(value) && value > maxPage) {
            maxPage = value;
        }
        return _;
    });
    if (maxPage > Number(currentPage || 1)) {
        return true;
    }
    return /href=["'][^"']*page=\d+[^"']*["'][^>]*>\s*Next\b/i.test(html) ||
        /class=["'][^"']*\bnext\b[^"']*["'][^>]*href=["'][^"#][^"']*["']/i.test(html);
}

function getBestImage(cardHtml, fallbackBase) {
    let imageUrl = absoluteUrl(firstMatch(cardHtml, /data-src="([^"]+)"/i), fallbackBase);
    if (!imageUrl || imageUrl.indexOf("data:image") === 0) {
        imageUrl = absoluteUrl(firstMatch(cardHtml, /src="([^"]+)"/i), fallbackBase);
    }
    if ((!imageUrl || imageUrl.indexOf("data:image") === 0) && /data-fallbacks="/i.test(cardHtml)) {
        const rawFallbacks = decodeHtml(firstMatch(cardHtml, /data-fallbacks="([^"]+)"/i));
        const fallbacks = parseJsonSafe(rawFallbacks, []);
        if (Array.isArray(fallbacks) && fallbacks.length > 0) {
            imageUrl = absoluteUrl(fallbacks[0], fallbackBase);
        }
    }
    if (imageUrl.indexOf("data:image") === 0) {
        return "";
    }
    return imageUrl;
}

function parseGalleryCards(html, domainBase, domainKey) {
    const list = [];
    const seen = {};
    const pattern = /<a href="(\/g\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        if (match[0].indexOf("<img") === -1 || match[0].indexOf("caption") === -1) {
            continue;
        }
        const link = buildStoredLink(match[1], domainKey);
        if (!link || seen[link]) {
            continue;
        }
        const anchorHtml = match[2];
        const name = stripTags(firstMatch(anchorHtml, /<div class="caption">([\s\S]*?)<\/div>/i)) ||
            stripTags(firstMatch(match[0], /title="([^"]*)"/i)) ||
            stripTags(firstMatch(match[0], /alt="([^"]*)"/i)) ||
            "Unknown";
        const imageUrl = getBestImage(match[0], domainBase);
        if (!imageUrl) {
            continue;
        }
        seen[link] = true;
        list.push({
            name: name,
            link: link,
            imageUrl: imageUrl
        });
    }
    return list;
}

function parseXxxTagSections(html) {
    const sections = {};
    const pattern = /<li class=['"]tags['"][\s\S]*?<span class=['"]text['"]>([\s\S]*?)<\/span>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        const label = normalizeWhitespace(stripTags(match[1])).replace(/:$/, "").toLowerCase();
        const values = [];
        match[2].replace(/<span class=['"]tag_name(?:\s+pages)?['"]>([\s\S]*?)<\/span>/gi, function (_, value) {
            values.push(stripTags(value));
            return _;
        });
        sections[label] = uniqueStrings(values);
    }
    return sections;
}

function parseToTagSections(html) {
    const sections = {};
    const pattern = /<div class="tag-container field-name[^"]*">([\s\S]*?)<span class="tags">([\s\S]*?)<\/span>\s*<\/div>/gi;
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        const label = normalizeWhitespace(stripTags(match[1])).replace(/:$/, "").toLowerCase();
        const values = [];
        match[2].replace(/<span class="name">([\s\S]*?)<\/span>/gi, function (_, value) {
            values.push(stripTags(value));
            return _;
        });
        sections[label] = uniqueStrings(values);
    }
    return sections;
}

function buildDescription(subtitle, pageCount, artists, languages, categories, tags, uploadedText) {
    const lines = [];
    if (subtitle) {
        lines.push(subtitle);
    }
    if (pageCount > 0) {
        lines.push("Pages: " + pageCount);
    }
    if (artists.length > 0) {
        lines.push("Artists: " + artists.join(", "));
    }
    if (languages.length > 0) {
        lines.push("Languages: " + languages.join(", "));
    }
    if (categories.length > 0) {
        lines.push("Categories: " + categories.join(", "));
    }
    if (tags.length > 0) {
        lines.push("Tags: " + tags.join(", "));
    }
    if (uploadedText) {
        lines.push("Uploaded: " + uploadedText);
    }
    return lines.join("\n");
}

function buildDetailObject(storedLink, path, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, scanlator) {
    const author = artists.length > 0 ? artists.join(", ") : "";
    const uploadedText = uploadedIso ? safeString(uploadedIso) : "";
    return {
        name: name || "Unknown",
        link: safeString(storedLink) || path,
        imageUrl: imageUrl || "",
        description: buildDescription(subtitle, pageCount, artists, languages, categories, tags, uploadedText),
        author: author,
        artist: author,
        genre: uniqueStrings(tags.concat(languages).concat(categories)),
        status: 1,
        chapters: [{
            name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
            url: safeString(storedLink) || path,
            scanlator: scanlator || "",
            dateUpload: toDateUpload(uploadedIso)
        }]
    };
}

function parseXxxDetail(html, storedLink, path) {
    const name = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || "Unknown";
    const subtitle = stripTags(firstMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i));
    let imageUrl = absoluteUrl(
        firstMatch(html, /<div id="cover"[\s\S]*?<img[^>]+src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i)
    );
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /<img[^>]+data-src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i));
    }
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /<img[^>]+src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i));
    }
    const sections = parseXxxTagSections(html);
    const tags = uniqueStrings(sections.tags || []);
    const artists = uniqueStrings(sections.artists || []);
    const languages = uniqueStrings(sections.languages || []);
    const categories = uniqueStrings(sections.category || sections.categories || []);
    const pageCount = parseInt(firstMatch(html, /<span class="tag_name pages">(\d+)<\/span>/i), 10) || 0;
    const uploadedIso = firstMatch(html, /data-utc="([^"]+)"/i);
    return buildDetailObject(storedLink, path, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, "");
}

function parseToDetail(html, storedLink, path) {
    const name = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || "Unknown";
    const subtitle = stripTags(firstMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i));
    let imageUrl = absoluteUrl(
        firstMatch(html, /<div id="cover"[\s\S]*?<img[^>]+src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i)
    );
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /<div id="cover"[\s\S]*?<img[^>]+data-src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i));
    }
    const sections = parseToTagSections(html);
    const tags = uniqueStrings(sections.tags || []);
    const artists = uniqueStrings(sections.artists || []);
    const languages = uniqueStrings(sections.languages || []);
    const categories = uniqueStrings(sections.category || sections.categories || []);
    const pageCount = parseInt((sections.pages && sections.pages[0]) || "0", 10) || 0;
    const uploadedIso = firstMatch(html, /<time[^>]+datetime="([^"]+)"/i);
    return buildDetailObject(storedLink, path, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, "");
}

function isXxxHtml(html) {
    return /id="load_server"/i.test(html) || /var g_th = \$\.parseJSON\('/i.test(html) || /nhentaimg\.com/i.test(html);
}

function buildXxxPageList(html) {
    const loadServer = firstMatch(html, /id="load_server"[^>]*value="([^"]+)"/i);
    const loadDir = firstMatch(html, /id="load_dir"[^>]*value="([^"]+)"/i);
    const loadId = firstMatch(html, /id="load_id"[^>]*value="([^"]+)"/i);
    const loadPages = parseInt(firstMatch(html, /id="load_pages"[^>]*value="(\d+)"/i), 10);
    const gthRaw = firstMatch(html, /var g_th = \$\.parseJSON\('([\s\S]*?)'\);/i);
    if (!loadServer || !loadDir || !loadId || !loadPages || !gthRaw) {
        return [];
    }
    const metadata = parseJsonSafe(gthRaw, {});
    const files = metadata && metadata.fl ? metadata.fl : {};
    const baseUrl = "https://i" + loadServer + ".nhentaimg.com/" + loadDir + "/" + loadId + "/";
    const pages = [];
    for (let page = 1; page <= loadPages; page++) {
        const fileInfo = safeString(files[String(page)]);
        if (!fileInfo) {
            return [];
        }
        pages.push(baseUrl + page + "." + getPageExtension(fileInfo));
    }
    return pages;
}

function collectToPageLinks(html, galleryId) {
    const links = [];
    const seen = {};
    const pattern = new RegExp("href=['\"](/g/" + galleryId + "/\\d+/)['\"]", "gi");
    safeString(html).replace(pattern, function (_, link) {
        const normalized = normalizeWhitespace(link);
        if (!normalized || seen[normalized]) {
            return _;
        }
        seen[normalized] = true;
        links.push(normalized);
        return _;
    });
    return links;
}

function parseReaderImage(html) {
    let imageUrl = absoluteUrl(firstMatch(html, /id="image-container"[\s\S]*?<img[^>]+src="([^"]+)"/i));
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /id="page-container"[\s\S]*?<img[^>]+data-src="([^"]+)"/i));
    }
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /<img[^>]+id="fimg"[^>]+data-src="([^"]+)"/i));
    }
    return imageUrl;
}

function findMirrorByKey(mirrors, mirrorKey) {
    const key = safeString(mirrorKey).toLowerCase();
    const list = Array.isArray(mirrors) ? mirrors : [];
    for (let i = 0; i < list.length; i++) {
        if (safeString(list[i] && list[i].key).toLowerCase() === key) {
            return list[i];
        }
    }
    return null;
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 10
        };
        this.mirrors = NHENTAI_MIRRORS.slice();
        this.currentBase = this.mirrors[0].base;
    }

    get supportsLatest() {
        return true;
    }

    getHeaders(referer) {
        return {
            "User-Agent": NHENTAI_USER_AGENT,
            "Referer": referer || (this.currentBase + "/"),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache"
        };
    }

    logError(method, error) {
        console.log("[nhentai] " + method + " error: " + stringifyError(error));
    }

    async requestHtml(domain, pathOrUrl) {
        const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : domain.base.replace(/\/$/, "") + pathOrUrl;
        const client = new Client(this.clientConfig);
        const response = await client.get(url, this.getHeaders(domain.base + "/"));
        if (isCloudflareBlocked(response)) {
            throw new Error("Cloudflare blocked " + domain.base + " for " + url);
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

    async tryWithMirrors(mirrors, callback) {
        let lastError = null;
        const domains = Array.isArray(mirrors) && mirrors.length > 0 ? mirrors : this.mirrors;
        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            try {
                this.currentBase = domain.base;
                return await callback.call(this, domain);
            } catch (error) {
                lastError = error;
                console.log("[nhentai] mirror failed " + domain.base + ": " + stringifyError(error));
            }
        }
        throw lastError || new Error("All nhentai mirrors failed");
    }

    async tryWithFallback(callback) {
        return await this.tryWithMirrors(this.mirrors, callback);
    }

    getMirrorsForLink(mirrorKey) {
        const forcedMirror = findMirrorByKey(this.mirrors, mirrorKey);
        if (forcedMirror) {
            return [forcedMirror];
        }
        return this.mirrors;
    }

    extractFilterValue(filters, type) {
        if (!filters || !Array.isArray(filters)) return "";
        for (let i = 0; i < filters.length; i++) {
            const f = filters[i];
            if (f && f.type === type) {
                // SelectFilter has values array, state is index
                if (typeof f.state === "number" && Array.isArray(f.values) && f.values[f.state]) {
                    const val = safeString(f.values[f.state].value || "");
                    console.log("[nhentai] Filter " + type + " state=" + f.state + " value=" + val);
                    return val;
                }
                if (Array.isArray(f.values) && f.values.length > 0) {
                    return safeString(f.values[0].value || f.values[0] || "");
                }
            }
        }
        return "";
    }

    buildListPath(domain, mode, query, page, filters) {
        const pageValue = Math.max(1, parseInt(page, 10) || 1);
        const hasQuery = !!safeString(query).trim();
        
        // Extract filter selections
        const parody = this.extractFilterValue(filters, "parody");
        const category = this.extractFilterValue(filters, "category");
        const tag = this.extractFilterValue(filters, "tag");
        const sort = this.extractFilterValue(filters, "sort");
        
        // If query or ANY filter is active, use search endpoint with combined query
        const filterActive = parody || category || tag || hasQuery;
        
        if (filterActive) {
            const parts = [];
            if (hasQuery) parts.push(safeString(query).trim());
            if (parody) parts.push("parody:" + parody.replace(/-/g, "+"));
            if (category) parts.push("category:" + category.replace(/-/g, "+"));
            if (tag) parts.push("tag:" + tag.replace(/-/g, "+"));
            parts.push("language:english");
            const combinedQuery = parts.join(" ");
            
            const useSort = sort === "popular" ? "&sort=popular" : "";
            
            let result;
            if (domain.key === "xxx") {
                result = "/search/?key=" + encodeURIComponent(combinedQuery) + "&page=" + pageValue + useSort;
            } else {
                result = "/search?q=" + encodeURIComponent(combinedQuery) + "&page=" + pageValue + useSort;
            }
            console.log("[nhentai] Search URL: " + result);
            return result;
        }
        
        // No filters - use default English browsing
        const wantPopular = mode === "popular" || sort === "popular";
        
        if (domain.key === "xxx") {
            if (wantPopular) {
                return "/language/english/popular/" + (pageValue > 1 ? "?page=" + pageValue : "");
            }
            return "/language/english/" + (pageValue > 1 ? "?page=" + pageValue : "");
        }
        
        // nhentai.to
        if (wantPopular) {
            return "/language/english/popular" + (pageValue > 1 ? "?page=" + pageValue : "");
        }
        return "/language/english" + (pageValue > 1 ? "?page=" + pageValue : "");
    }

    parseListResponse(html, page, domain) {
        const list = parseGalleryCards(html, domain.base, domain.key);
        return {
            list: list,
            hasNextPage: list.length > 0 && parseHasNextPage(html, page)
        };
    }

    async fetchList(mode, query, page, filters) {
        return await this.tryWithFallback(async function (domain) {
            const html = await this.requestHtml(domain, this.buildListPath(domain, mode, query, page, filters));
            const parsed = this.parseListResponse(html, page, domain);
            if (parsed.list.length === 0 && domain.key === "to" && mode === "latest" && page <= 1 && !filters) {
                const fallbackHtml = await this.requestHtml(domain, "/");
                return this.parseListResponse(fallbackHtml, page, domain);
            }
            return parsed;
        });
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
            const mode = normalizeWhitespace(query) ? "search" : "latest";
            return await this.fetchList(mode, safeString(query), page, filters);
        } catch (error) {
            this.logError("search", error);
            throw error;
        }
    }

    async getDetail(url) {
        try {
            const storedLink = safeString(url);
            const path = normalizeGalleryPath(storedLink);
            if (!path) {
                throw new Error("Invalid gallery url: " + safeString(url));
            }
            const mirrorKey = extractMirrorKey(storedLink);
            return await this.tryWithMirrors(this.getMirrorsForLink(mirrorKey), async function (domain) {
                const html = await this.requestHtml(domain, path);
                if (isXxxHtml(html)) {
                    return parseXxxDetail(html, storedLink, path);
                }
                return parseToDetail(html, storedLink, path);
            });
        } catch (error) {
            this.logError("getDetail", error);
            throw error;
        }
    }

    async buildToPageList(domain, path) {
        const html = await this.requestHtml(domain, path);
        const galleryId = extractGalleryId(path);
        if (!galleryId) {
            throw new Error("Missing gallery id for " + path);
        }
        const pageLinks = collectToPageLinks(html, galleryId);
        if (pageLinks.length === 0) {
            throw new Error("Could not find page links for " + path);
        }
        const pages = [];
        for (let i = 0; i < pageLinks.length; i++) {
            const pageHtml = await this.requestHtml(domain, pageLinks[i]);
            const imageUrl = parseReaderImage(pageHtml);
            if (!imageUrl) {
                throw new Error("Missing page image for " + pageLinks[i]);
            }
            pages.push(imageUrl);
        }
        return pages;
    }

    async getPageList(url) {
        try {
            const storedLink = safeString(url);
            const path = normalizeGalleryPath(storedLink);
            if (!path) {
                throw new Error("Invalid gallery url: " + safeString(url));
            }
            const mirrorKey = extractMirrorKey(storedLink);
            return await this.tryWithMirrors(this.getMirrorsForLink(mirrorKey), async function (domain) {
                const html = await this.requestHtml(domain, path);
                if (isXxxHtml(html)) {
                    const pages = buildXxxPageList(html);
                    if (pages.length > 0) {
                        return pages;
                    }
                }
                return await this.buildToPageList(domain, path);
            });
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: NHENTAI_SORT_OPTIONS.map(o => ({ type_name: "SelectOption", name: o.name, value: o.value }))
            },
            {
                type_name: "SelectFilter",
                type: "parody",
                name: "Parody",
                values: NHENTAI_PARODIES.map(o => ({ type_name: "SelectOption", name: o.name, value: o.value }))
            },
            {
                type_name: "SelectFilter",
                type: "category",
                name: "Category",
                values: NHENTAI_CATEGORIES.map(o => ({ type_name: "SelectOption", name: o.name, value: o.value }))
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: NHENTAI_TAGS.map(o => ({ type_name: "SelectOption", name: o.name, value: o.value }))
            }
        ];
    }
}
