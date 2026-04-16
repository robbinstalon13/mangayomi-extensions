// Mangayomi Extension for HD Porn Comics
// Base URL: https://hdporncomics.com

const HD_BASE = "https://hdporncomics.com";

const HD_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Predefined popular Western artists
const HD_ARTISTS = [
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
    { name: "Simon404", value: "simon404" }
];

// Popular tags for quick filtering
const HD_TAGS = [
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
    { name: "TV / Movies", value: "tv-movies" },
    { name: "Gangbang", value: "gangbangg" },
    { name: "Threesome", value: "threesome" },
    { name: "Incest", value: "incest" },
    { name: "Straight Sex", value: "sex" }
];

// Categories
const HD_CATEGORIES = [
    { name: "Any", value: "" },
    { name: "Comics", value: "comics" },
    { name: "Manhwa", value: "manhwa" },
    { name: "Gay Manga", value: "gay-manga" }
];

// Parodies
const HD_PARODIES = [
    { name: "Any", value: "" },
    { name: "Pokemon", value: "parody-pokemon" },
    { name: "Naruto", value: "parody-naruto" },
    { name: "Dragon Ball", value: "parody-dragon-ball" },
    { name: "One Piece", value: "parody-one-piece" },
    { name: "MHA", value: "parody-my-hero-academia" },
    { name: "Star Wars", value: "parody-star-wars" },
    { name: "Marvel", value: "parody-marvel" },
    { name: "DC Comics", value: "parody-dc" },
    { name: "Disney", value: "parody-disney" },
    { name: "Overwatch", value: "parody-overwatch" },
    { name: "Genshin Impact", value: "parody-genshin-impact" },
    { name: "Zelda", value: "parody-zelda" },
    { name: "Simpsons", value: "parody-the-simpsons" },
    { name: "Family Guy", value: "parody-family-guy" }
];

// Sort options
const HD_SORT = [
    { name: "Latest", value: "" },
    { name: "Most Viewed", value: "view" },
    { name: "Most Liked", value: "like" }
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
    return safeString(str).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').trim();
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
    
    // Match post/article elements with thumbnail images
    // Each comic has: <a href="{url}">...<img ... src="{image}" .../>...</a>
    // followed by a title link
    const regex = /<a[^>]+href="(https:\/\/hdporncomics\.com\/[^"\/]+\/)"[^>]*>\s*<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]*)"/gi;
    
    htmlStr.replace(regex, function (_, url, imageUrl, alt) {
        if (!url || seen[url]) return _;
        // Filter out non-comic URLs (tag pages, category pages etc.)
        if (url.indexOf("/tag/") !== -1 || url.indexOf("/artist/") !== -1 ||
            url.indexOf("/category/") !== -1 || url.indexOf("/comics/") !== -1 ||
            url.indexOf("/page/") !== -1 || url.indexOf("?") !== -1 ||
            url.indexOf("/manhwa") !== -1 || url.indexOf("/gay-manga") !== -1 ||
            url.indexOf("/trending") !== -1 || url.indexOf("/stats") !== -1 ||
            url.indexOf("/contact") !== -1 || url.indexOf("/dmca") !== -1 ||
            url.indexOf("/18-u-s") !== -1) {
            return _;
        }
        seen[url] = true;
        let title = stripTags(alt).replace(/^Porn Comics\s*-\s*/i, "").trim();
        if (!title) {
            title = "Unknown";
        }
        cards.push({
            name: title,
            imageUrl: safeString(imageUrl),
            link: url
        });
        return _;
    });
    
    return cards;
}

// Build URL based on filters and mode
function buildListUrl(mode, query, page, filters) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    const hasQuery = !!safeString(query).trim();
    
    const artist = extractFilterValue(filters, "artist");
    const tag = extractFilterValue(filters, "tag");
    const category = extractFilterValue(filters, "category");
    const parody = extractFilterValue(filters, "parody");
    const sort = extractFilterValue(filters, "sort");
    
    // Text search takes priority
    if (hasQuery) {
        let url = HD_BASE + "/?s=" + encodeURIComponent(safeString(query).trim());
        if (pageValue > 1) url = HD_BASE + "/page/" + pageValue + "/?s=" + encodeURIComponent(safeString(query).trim());
        return url;
    }
    
    // Build filter path with priority: artist > parody > tag > category > sort/mode
    let basePath = "/";
    if (artist) {
        basePath = "/artist/" + artist + "/";
    } else if (parody) {
        basePath = "/tag/" + parody + "/";
    } else if (tag) {
        basePath = "/tag/" + tag + "/";
    } else if (category === "manhwa") {
        basePath = "/manhwa/";
    } else if (category === "gay-manga") {
        basePath = "/gay-manga/";
    }
    
    // Add pagination
    let url = HD_BASE + basePath;
    if (pageValue > 1) {
        url = HD_BASE + basePath + "page/" + pageValue + "/";
    }
    
    // Add sort parameter for Popular/Latest mode
    if (mode === "popular") {
        url += (url.indexOf("?") === -1 ? "?" : "&") + "sort=view";
    } else if (sort) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + "sort=" + sort;
    }
    
    return url;
}

// Detect if there's a next page
function hasNextPage(html, currentPage) {
    const nextRegex = new RegExp('href="[^"]*\\/page\\/' + (parseInt(currentPage, 10) + 1) + '\\/?[^"]*"', 'i');
    if (nextRegex.test(safeString(html))) {
        return true;
    }
    // Fallback: check for "next" link
    return /rel="next"/i.test(safeString(html)) || /<a[^>]+class="[^"]*next[^"]*"/i.test(safeString(html));
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
            "User-Agent": HD_USER_AGENT,
            "Referer": referer || (HD_BASE + "/"),
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
        const title = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || "Unknown";
        
        // Extract cover image
        let cover = firstMatch(html, /<img[^>]+alt="[^"]+thumbnail[^"]*"[^>]+src="([^"]+)"/i);
        if (!cover) {
            cover = firstMatch(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        }
        
        // Extract artist
        let artist = "";
        const artistMatch = html.match(/<a[^>]+href="[^"]*\/artist\/[^"]+"[^>]*>([^<]+)<\/a>/i);
        if (artistMatch) {
            artist = stripTags(artistMatch[1]);
        }
        
        // Extract tags
        const tagList = [];
        const tagSeen = {};
        safeString(html).replace(/<a[^>]+href="[^"]*\/tag\/([^"\/]+)[^"]*"[^>]*>([^<]+)<\/a>/gi, function (_, slug, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n]) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Extract image count
        let pageCount = 0;
        const countMatch = html.match(/(\d+)\s*Images/i);
        if (countMatch) {
            pageCount = parseInt(countMatch[1], 10) || 0;
        }
        
        // Extract description
        let description = "";
        const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
        if (descMatch) {
            description = stripTags(descMatch[1]);
        }
        
        const status = pageCount > 0 ? 2 : 5; // 2=complete, 5=unknown
        
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
        
        // Find all figure > a > href pointing to full-res images
        safeString(html).replace(/<a[^>]+href="(https:\/\/e\.hdporncomics\.com\/uploads\/[^"]+\.(?:jpg|jpeg|png))"[^>]*>/gi, function (_, imgUrl) {
            if (imgUrl && !seen[imgUrl]) {
                seen[imgUrl] = true;
                pages.push(imgUrl);
            }
            return _;
        });
        
        // Fallback: look for any e.hdporncomics.com image URLs directly
        if (pages.length === 0) {
            safeString(html).replace(/https:\/\/e\.hdporncomics\.com\/uploads\/[a-zA-Z0-9_\-\/]+\.(?:jpg|jpeg|png)/gi, function (match) {
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
                values: HD_ARTISTS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: HD_TAGS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "category",
                name: "Category",
                values: HD_CATEGORIES.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "parody",
                name: "Parody",
                values: HD_PARODIES.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: HD_SORT.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            }
        ];
    }
}
