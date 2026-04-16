// Mangayomi Extension for Multporn
// Base URL: https://multporn.net

const MULT_BASE = "https://multporn.net";

const MULT_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Predefined popular Western artists (Multporn uses URL slugs)
const MULT_ARTISTS = [
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
    { name: "Kogeikun", value: "kogeikun" },
    { name: "Manawer", value: "manawer" },
    { name: "BDOne", value: "bdone" },
    { name: "Creedo", value: "creedo" }
];

// Popular tags (use Multporn's slug format)
const MULT_TAGS = [
    { name: "Any", value: "" },
    { name: "Western", value: "western" },
    { name: "Full Color", value: "full_color" },
    { name: "Anal", value: "anal" },
    { name: "Big Breasts", value: "big_breasts" },
    { name: "Blowjob", value: "blowjob" },
    { name: "Furry", value: "furry" },
    { name: "Lesbian", value: "lesbian" },
    { name: "Milf", value: "milf" },
    { name: "Incest", value: "incest" },
    { name: "Group", value: "group" },
    { name: "Parody", value: "parody" }
];

// Sort options
const MULT_SORT = [
    { name: "Latest", value: "" },
    { name: "Popular", value: "popular" },
    { name: "Best", value: "best" }
];

// Utility functions
function safeString(str) {
    if (str === null || str === undefined) return "";
    return String(str);
}

function firstMatch(str, regex) {
    const m = safeString(str).match(regex);
    return m ? m[1] : null;
}

function stripTags(str) {
    return safeString(str)
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .trim();
}

function extractFilterValue(filters, type) {
    if (!filters || !Array.isArray(filters)) return "";
    for (let i = 0; i < filters.length; i++) {
        const f = filters[i];
        if (f && f.type === type) {
            if (typeof f.state === "number" && Array.isArray(f.values) && f.values[f.state]) {
                return safeString(f.values[f.state].value || "");
            }
        }
    }
    return "";
}

// Parse comic cards from listing pages
function parseComicCards(html) {
    const cards = [];
    const htmlStr = safeString(html);
    const seen = {};
    
    // Multporn comic URLs: /comics/{slug}
    // Look for links with thumbnails: <a href="/comics/{slug}"><img src="..."></a>
    const regex = /<a[^>]+href="(\/comics\/[^"?#]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    
    htmlStr.replace(regex, function (_, path, imageUrl, alt) {
        if (!path || seen[path]) return _;
        seen[path] = true;
        let title = stripTags(alt)
            .replace(/\s+Porn comic[\s\S]*$/i, "")
            .replace(/\s+Cartoon porn comics[\s\S]*$/i, "")
            .trim();
        if (!title) {
            title = path.replace(/^\/comics\//, "").replace(/[_\-]/g, " ");
        }
        cards.push({
            name: title,
            imageUrl: safeString(imageUrl),
            link: MULT_BASE + path
        });
        return _;
    });
    
    return cards;
}

// Build URL based on filters and mode
function buildListUrl(mode, query, page, filters) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    const hasQuery = !!safeString(query).trim();
    const pageParam = pageValue > 1 ? (pageValue - 1) : 0; // Drupal uses 0-indexed pages
    
    const artist = extractFilterValue(filters, "artist");
    const tag = extractFilterValue(filters, "tag");
    const sort = extractFilterValue(filters, "sort");
    
    // Text search takes priority
    if (hasQuery) {
        let url = MULT_BASE + "/search/content/" + encodeURIComponent(safeString(query).trim());
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Build filter URL with priority: artist > tag > mode
    if (artist) {
        let url = MULT_BASE + "/authors_comics/" + artist;
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    if (tag) {
        let url = MULT_BASE + "/category_comic/" + tag;
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Default modes
    if (mode === "popular" || sort === "popular") {
        let url = MULT_BASE + "/best?rule34=1";
        if (pageParam > 0) {
            url += "&page=" + pageParam;
        }
        return url;
    }
    
    if (mode === "latest" || !sort) {
        let url = MULT_BASE + "/new?rule34=1&type=1";
        if (pageParam > 0) {
            url += "&page=" + pageParam;
        }
        return url;
    }
    
    // Fallback
    let url = MULT_BASE + "/comics?rule34=1";
    if (pageParam > 0) {
        url += "&page=" + pageParam;
    }
    return url;
}

function hasNextPage(html, currentPage) {
    const htmlStr = safeString(html);
    const pageIdx = Math.max(0, parseInt(currentPage, 10) - 1);
    const nextPagePattern = new RegExp('[?&]page=' + (pageIdx + 1) + '\\b', 'i');
    if (nextPagePattern.test(htmlStr)) {
        return true;
    }
    // Check for "next" link class
    return /class="pager-next"/i.test(htmlStr) || /rel="next"/i.test(htmlStr);
}

// Convert thumbnail URL to full image URL
function thumbnailToFull(thumbUrl) {
    if (!thumbUrl) return "";
    // Thumbnail: .../styles/juicebox_square_thumbnail_comics/public/comics/...
    // Full: .../files/comics/... (remove /styles/{style}/public)
    if (thumbUrl.indexOf("/styles/") !== -1) {
        return thumbUrl.replace(/\/styles\/[^\/]+\/public/, "").replace(/\?itok=[^&]*$/, "").replace(/\?.*$/, "");
    }
    return thumbUrl.replace(/\?itok=[^&]*$/, "").replace(/\?.*$/, "");
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
    
    getHeaders(referer) {
        return {
            "User-Agent": MULT_USER_AGENT,
            "Referer": referer || (MULT_BASE + "/"),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache"
        };
    }
    
    async requestHtml(url) {
        const client = new Client(this.clientConfig);
        const response = await client.get(url, this.getHeaders());
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
    
    async fetchList(mode, query, page, filters) {
        const url = buildListUrl(mode, query, page, filters);
        const html = await this.requestHtml(url);
        const cards = parseComicCards(html);
        return {
            list: cards,
            hasNextPage: hasNextPage(html, page)
        };
    }
    
    async getPopular(page) {
        return await this.fetchList("popular", "", page, null);
    }
    
    async getLatestUpdates(page) {
        return await this.fetchList("latest", "", page, null);
    }
    
    async search(query, page, filters) {
        return await this.fetchList("search", query, page, filters);
    }
    
    async getDetail(url) {
        const html = await this.requestHtml(url);
        
        // Extract title
        let title = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
        if (!title) {
            title = stripTags(firstMatch(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i));
            title = title.replace(/\s*-\s*Multporn$/i, "").replace(/\s*Porn comic$/i, "").trim();
        }
        if (!title) title = "Unknown";
        
        // Extract cover image from og:image
        let cover = firstMatch(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        if (!cover) {
            cover = firstMatch(html, /<img[^>]+src="([^"]*\/sites\/default\/files\/[^"]+)"/i);
        }
        
        // Extract author
        let artist = "";
        const artistMatch = html.match(/<a[^>]+href="\/authors_comics\/[^"]+"[^>]*>([^<]+)<\/a>/i);
        if (artistMatch) {
            artist = stripTags(artistMatch[1]);
        }
        
        // Extract tags from category_comic links
        const tagList = [];
        const tagSeen = {};
        safeString(html).replace(/<a[^>]+href="\/category_comic\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Extract character tags too
        safeString(html).replace(/<a[^>]+href="\/characters\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Count images
        let pageCount = 0;
        const countSeen = {};
        safeString(html).replace(/<img[^>]+src="[^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/comics\/[^"]+\.(?:jpg|jpeg|png)"/gi, function (match) {
            if (!countSeen[match]) {
                countSeen[match] = true;
                pageCount++;
            }
            return match;
        });
        
        // Extract description
        let description = "";
        const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
        if (descMatch) {
            description = stripTags(descMatch[1]);
        }
        
        const status = 2; // Complete
        
        return {
            name: title,
            imageUrl: safeString(cover),
            link: url,
            author: artist,
            artist: artist,
            description: description,
            status: status,
            genre: tagList,
            chapters: [{
                name: "Comic",
                url: url,
                scanlator: artist || "",
                dateUpload: ""
            }]
        };
    }
    
    async getPageList(url) {
        const html = await this.requestHtml(url);
        const pages = [];
        const seen = {};
        
        // Find all comic page image sources
        safeString(html).replace(/<img[^>]+src="([^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/comics\/[^"]+\.(?:jpg|jpeg|png))[^"]*"/gi, function (_, thumbUrl) {
            const fullUrl = thumbnailToFull(thumbUrl);
            if (fullUrl && !seen[fullUrl]) {
                seen[fullUrl] = true;
                pages.push(fullUrl);
            }
            return _;
        });
        
        // Fallback: direct image URLs
        if (pages.length === 0) {
            safeString(html).replace(/https:\/\/multporn\.net\/sites\/default\/files\/comics\/[^\s"<>]+\.(?:jpg|jpeg|png)/gi, function (match) {
                if (!seen[match]) {
                    seen[match] = true;
                    pages.push(match);
                }
                return match;
            });
        }
        
        return pages;
    }
    
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "artist",
                name: "Artist",
                values: MULT_ARTISTS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: MULT_TAGS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: MULT_SORT.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            }
        ];
    }
}
