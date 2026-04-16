const NHENTAI_MIRRORS = [
    { key: "xxx", base: "https://nhentai.xxx" },
    { key: "to", base: "https://nhentai.to" }
];

const NHENTAI_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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

function normalizeLink(value) {
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

function extractGalleryId(url) {
    return firstMatch(url, /\/g\/(\d+)/i);
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
    return body.indexOf("cf-browser-verification") !== -1 ||
        body.indexOf("/cdn-cgi/challenge-platform/") !== -1 ||
        body.indexOf("<title>just a moment") !== -1 ||
        body.indexOf("attention required!") !== -1;
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

function parseGalleryCards(html, domainBase) {
    const list = [];
    const seen = {};
    const pattern = /<a href="(\/g\/\d+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(safeString(html))) !== null) {
        if (match[0].indexOf("<img") === -1 || match[0].indexOf("caption") === -1) {
            continue;
        }
        const link = normalizeLink(match[1]);
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

function buildDetailObject(link, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, scanlator) {
    const author = artists.length > 0 ? artists.join(", ") : "";
    const uploadedText = uploadedIso ? safeString(uploadedIso) : "";
    return {
        name: name || "Unknown",
        link: normalizeLink(link),
        imageUrl: imageUrl || "",
        description: buildDescription(subtitle, pageCount, artists, languages, categories, tags, uploadedText),
        author: author,
        artist: author,
        genre: uniqueStrings(tags.concat(languages).concat(categories)),
        status: 1,
        chapters: [{
            name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
            url: normalizeLink(link),
            scanlator: scanlator || "",
            dateUpload: toDateUpload(uploadedIso)
        }]
    };
}

function parseXxxDetail(html, link) {
    const name = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || "Unknown";
    const subtitle = stripTags(firstMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i));
    let imageUrl = absoluteUrl(
        firstMatch(html, /<div id="cover"[\s\S]*?<img[^>]+src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i)
    );
    if (!imageUrl) {
        imageUrl = absoluteUrl(firstMatch(html, /<img[^>]+data-src="(https?:\/\/[^"]+\/cover\.[^"]+)"/i));
    }
    const sections = parseXxxTagSections(html);
    const tags = uniqueStrings(sections.tags || []);
    const artists = uniqueStrings(sections.artists || []);
    const languages = uniqueStrings(sections.languages || []);
    const categories = uniqueStrings(sections.category || sections.categories || []);
    const pageCount = parseInt(firstMatch(html, /<span class="tag_name pages">(\d+)<\/span>/i), 10) || 0;
    const uploadedIso = firstMatch(html, /data-utc="([^"]+)"/i);
    return buildDetailObject(link, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, "");
}

function parseToDetail(html, link) {
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
    return buildDetailObject(link, name, imageUrl, subtitle, artists, languages, categories, tags, pageCount, uploadedIso, "");
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

    async tryWithFallback(callback) {
        let lastError = null;
        for (let i = 0; i < this.mirrors.length; i++) {
            const domain = this.mirrors[i];
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

    buildListPath(domain, mode, query, page) {
        const pageValue = Math.max(1, parseInt(page, 10) || 1);
        if (domain.key === "xxx") {
            const encoded = encodeURIComponent(safeString(query));
            if (mode === "popular") {
                return "/search/?key=" + encoded + "&sort=popular&page=" + pageValue;
            }
            return "/search/?key=" + encoded + "&page=" + pageValue;
        }
        if (mode === "popular") {
            return "/popular?page=" + pageValue;
        }
        if (mode === "search") {
            return "/search?q=" + encodeURIComponent(safeString(query)) + "&page=" + pageValue;
        }
        return pageValue <= 1 ? "/" : "/?page=" + pageValue;
    }

    parseListResponse(html, page, domain) {
        const list = parseGalleryCards(html, domain.base);
        return {
            list: list,
            hasNextPage: list.length > 0 && parseHasNextPage(html, page)
        };
    }

    async fetchList(mode, query, page) {
        return await this.tryWithFallback(async function (domain) {
            const html = await this.requestHtml(domain, this.buildListPath(domain, mode, query, page));
            const parsed = this.parseListResponse(html, page, domain);
            if (parsed.list.length === 0 && domain.key === "to" && mode === "latest" && page <= 1) {
                const fallbackHtml = await this.requestHtml(domain, "/");
                return this.parseListResponse(fallbackHtml, page, domain);
            }
            return parsed;
        });
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
            const mode = normalizeWhitespace(query) ? "search" : "latest";
            return await this.fetchList(mode, safeString(query), page);
        } catch (error) {
            this.logError("search", error);
            throw error;
        }
    }

    async getDetail(url) {
        try {
            const link = normalizeLink(url);
            if (!link) {
                throw new Error("Invalid gallery url: " + safeString(url));
            }
            return await this.tryWithFallback(async function (domain) {
                const html = await this.requestHtml(domain, link);
                if (isXxxHtml(html)) {
                    return parseXxxDetail(html, link);
                }
                return parseToDetail(html, link);
            });
        } catch (error) {
            this.logError("getDetail", error);
            throw error;
        }
    }

    async buildToPageList(domain, link) {
        const html = await this.requestHtml(domain, link);
        const galleryId = extractGalleryId(link);
        if (!galleryId) {
            throw new Error("Missing gallery id for " + link);
        }
        const pageLinks = collectToPageLinks(html, galleryId);
        if (pageLinks.length === 0) {
            throw new Error("Could not find page links for " + link);
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
            const link = normalizeLink(url);
            if (!link) {
                throw new Error("Invalid gallery url: " + safeString(url));
            }
            return await this.tryWithFallback(async function (domain) {
                const html = await this.requestHtml(domain, link);
                if (isXxxHtml(html)) {
                    const pages = buildXxxPageList(html);
                    if (pages.length > 0) {
                        return pages;
                    }
                }
                return await this.buildToPageList(domain, link);
            });
        } catch (error) {
            this.logError("getPageList", error);
            throw error;
        }
    }

    getFilterList() {
        return [];
    }
}
