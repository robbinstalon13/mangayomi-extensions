// Mangayomi Extension for Multporn
// Base URL: https://multporn.net

const MULT_BASE = "https://multporn.net";

const MULT_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Manga parodies - URL slugs from /manga/{slug}
const MULT_MANGA_PARODIES = [
    { name: "Any", value: "" },
    { name: "One Piece", value: "one_piece" },
    { name: "Pokemon", value: "pokemon" },
    { name: "Naruto", value: "naruto" },
    { name: "My Hero Academia", value: "my_hero_academia" },
    { name: "Dragon Ball", value: "dragon_ball" },
    { name: "Attack on Titan", value: "attack_on_titan" },
    { name: "Genshin Impact", value: "genshin_impact" },
    { name: "Sword Art Online", value: "sword_art_online" },
    { name: "Overwatch", value: "overwatch" },
    { name: "Fairy Tail", value: "fairy_tail" },
    { name: "Bleach", value: "bleach" },
    { name: "Azur Lane", value: "azur_lane" },
    { name: "Demon Slayer", value: "kimetsu_no_yaiba" },
    { name: "Kantai Collection", value: "kantai_collection" },
    { name: "Hololive", value: "hololive" },
    { name: "Final Fantasy", value: "final_fantasy" },
    { name: "Neon Genesis Evangelion", value: "neon_genesis_evangelion" },
    { name: "Touhou Project", value: "touhou_project" },
    { name: "Fate/Grand Order", value: "fate_grand_order" }
];

// Popular Western artists (Multporn uses URL slugs)
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

// Parse comic cards from listing pages (handles both /comics/ and /hentai_manga/)
function parseComicCards(html) {
    const cards = [];
    const htmlStr = safeString(html);
    const seen = {};
    
    // Comics: /comics/{slug} with <a href="/comics/..."><img src="..." alt="...">
    const comicRegex = /<a[^>]+href="(\/comics\/[^"?#]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    
    htmlStr.replace(comicRegex, function (_, path, imageUrl, alt) {
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
    
    // Manga: /hentai_manga/{slug} with <a href="/hentai_manga/..."><img src="..." alt="Hentai manga ... on {Parody}">
    const mangaRegex = /<a[^>]+href="(\/hentai_manga\/[^"?#]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    
    htmlStr.replace(mangaRegex, function (_, path, imageUrl, alt) {
        if (!path || seen[path]) return _;
        seen[path] = true;
        // alt format: "Hentai manga {Title} on {Parody}"
        let title = stripTags(alt)
            .replace(/^Hentai manga\s*/i, "")
            .replace(/\s+on\s+[\s\S]+$/i, "")
            .replace(/\s+Porn comic[\s\S]*$/i, "")
            .replace(/\s+Cartoon porn comics[\s\S]*$/i, "")
            .trim();
        if (!title) {
            title = path.replace(/^\/hentai_manga\//, "").replace(/[_\-]/g, " ");
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

// Build URL for comics section (original behavior)
function buildComicsUrl(mode, query, page, artist, tag, sort) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    const pageParam = pageValue > 1 ? (pageValue - 1) : 0;
    
    // Text search takes priority
    if (query) {
        let url = MULT_BASE + "/search/content/" + encodeURIComponent(query.trim());
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Artist filter
    if (artist) {
        let url = MULT_BASE + "/authors_comics/" + artist;
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Tag filter
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
    
    if (mode === "best" || sort === "best") {
        let url = MULT_BASE + "/best?rule34=1";
        if (pageParam > 0) {
            url += "&page=" + pageParam;
        }
        return url;
    }
    
    // Latest
    let url = MULT_BASE + "/new?rule34=1&type=1";
    if (pageParam > 0) {
        url += "&page=" + pageParam;
    }
    return url;
}

// Build URL for manga section
function buildMangaUrl(mode, query, page, parody, sort) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    
    // Specific parody selected
    if (parody) {
        // Format: ?page=0,N (0-indexed, comma-separated)
        const pageParam = pageValue > 1 ? "?page=0%2C" + (pageValue - 1) : "";
        return MULT_BASE + "/manga/" + parody + "?rule34=1" + pageParam;
    }
    
    // Text search - use content search (works across all content)
    if (query) {
        const pageParam = pageValue > 1 ? "?page=" + (pageValue - 1) : "";
        return MULT_BASE + "/search/content/" + encodeURIComponent(query.trim()) + pageParam;
    }
    
    // Popular manga by rating
    if (mode === "popular" || sort === "popular") {
        const pageParam = pageValue > 1 ? "&page=" + (pageValue - 1) : "";
        return MULT_BASE + "/manga?sort_by=rating" + pageParam;
    }
    
    // Latest manga
    const pageParam = pageValue > 1 ? "&page=" + (pageValue - 1) : "";
    return MULT_BASE + "/manga" + pageParam;
}

function hasNextPage(html, currentPage) {
    const htmlStr = safeString(html);
    const pageIdx = Math.max(0, parseInt(currentPage, 10) - 1);
    const nextPagePattern = new RegExp('[?&]page=' + (pageIdx + 1) + '\\b', 'i');
    if (nextPagePattern.test(htmlStr)) {
        return true;
    }
    // Check for "next" link class (Drupal pagination)
    return /class="pager-next"/i.test(htmlStr) || /rel="next"/i.test(htmlStr);
}

// Check for manga-style pagination (?page=0,N or ?page=0%2CN)
function hasMangaNextPage(html, currentPage) {
    const htmlStr = safeString(html);
    const pageIdx = Math.max(0, parseInt(currentPage, 10) - 1);
    
    // Check for ?page=0,N pattern (manga pagination)
    const nextPattern = new RegExp('[?&]page=0[%,](' + (pageIdx + 1) + ')', 'i');
    if (nextPattern.test(htmlStr)) {
        return true;
    }
    
    // Also check for Drupal-style next link
    return /class="pager-next"/i.test(htmlStr) || /rel="next"/i.test(htmlStr);
}

// Convert thumbnail URL to full image URL
function thumbnailToFull(thumbUrl) {
    if (!thumbUrl) return "";
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
    
    // Fetch comics section
    async fetchComics(mode, query, page, filters) {
        const artist = extractFilterValue(filters, "artist");
        const tag = extractFilterValue(filters, "tag");
        const sort = extractFilterValue(filters, "sort");
        const url = buildComicsUrl(mode, query, page, artist, tag, sort);
        const html = await this.requestHtml(url);
        const cards = parseComicCards(html);
        return {
            list: cards,
            hasNextPage: hasNextPage(html, page)
        };
    }
    
    // Fetch manga section
    async fetchManga(mode, query, page, filters) {
        const parody = extractFilterValue(filters, "parody");
        const sort = extractFilterValue(filters, "sort");
        const url = buildMangaUrl(mode, query, page, parody, sort);
        const html = await this.requestHtml(url);
        const cards = parseComicCards(html);
        const hasNext = parody ? hasMangaNextPage(html, page) : hasNextPage(html, page);
        return {
            list: cards,
            hasNextPage: hasNext
        };
    }
    
    async fetchList(mode, query, page, filters) {
        const parody = extractFilterValue(filters, "parody");
        
        // If specific parody selected, use manga section
        if (parody) {
            return await this.fetchManga(mode, query, page, filters);
        }
        
        // Otherwise use comics section
        return await this.fetchComics(mode, query, page, filters);
    }
    
    // getPopular: fetch both comics and manga, merge results
    async getPopular(page) {
        try {
            const artist = extractFilterValue(null, "artist");
            const tag = extractFilterValue(null, "tag");
            const sort = "popular";
            
            // Fetch both sources in parallel
            const [comicsResult, mangaResult] = await Promise.all([
                this.fetchComics("popular", "", page, null, null, sort),
                this.fetchManga("popular", "", page, null, sort)
            ]);
            
            // Merge results from both sources
            const seen = {};
            const merged = [];
            
            // Comics first
            for (let i = 0; i < comicsResult.list.length; i++) {
                const item = comicsResult.list[i];
                if (!seen[item.link]) {
                    seen[item.link] = true;
                    merged.push(item);
                }
            }
            
            // Then manga
            for (let i = 0; i < mangaResult.list.length; i++) {
                const item = mangaResult.list[i];
                if (!seen[item.link]) {
                    seen[item.link] = true;
                    merged.push(item);
                }
            }
            
            // hasNextPage if either source has more
            const hasNextPage = comicsResult.hasNextPage || mangaResult.hasNextPage;
            
            return {
                list: merged,
                hasNextPage: hasNextPage
            };
        } catch (error) {
            console.log("[multporn] getPopular error: " + (error && error.message ? error.message : String(error)));
            // Fallback to comics only
            try {
                return await this.fetchComics("popular", "", page, null, null, "popular");
            } catch (e) {
                return { list: [], hasNextPage: false };
            }
        }
    }
    
    async getLatestUpdates(page) {
        return await this.fetchList("latest", "", page, null);
    }
    
    async search(query, page, filters) {
        return await this.fetchList("search", query, page, filters);
    }
    
    // Check if URL is a manga detail page
    isMangaUrl(url) {
        return /\/hentai_manga\//i.test(url);
    }
    
    // Check if URL is a comic detail page
    isComicUrl(url) {
        return /\/comics\//i.test(url);
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
        
        // Extract author (try both manga and comic selectors)
        let artist = "";
        const artistMatch = html.match(/<a[^>]+href="\/authors_comics\/[^"]+"[^>]*>([^<]+)<\/a>/i);
        if (artistMatch) {
            artist = stripTags(artistMatch[1]);
        } else {
            // Try manga author pattern
            const mangaArtistMatch = html.match(/<a[^>]+href="\/authors_hentai\/[^"]+"[^>]*>([^<]+)<\/a>/i);
            if (mangaArtistMatch) {
                artist = stripTags(mangaArtistMatch[1]);
            }
        }
        
        // Extract tags from category links (works for both comics and manga)
        const tagList = [];
        const tagSeen = {};
        
        // Comics tags
        safeString(html).replace(/<a[^>]+href="\/category_comic\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Manga tags
        safeString(html).replace(/<a[^>]+href="\/manga_tags\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Character tags
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
        safeString(html).replace(/<img[^>]+src="[^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/[^"]+\.(?:jpg|jpeg|png)"/gi, function (match) {
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
                name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
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
        
        // Find all comic/manga page image sources
        safeString(html).replace(/<img[^>]+src="([^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/[^"]+\.(?:jpg|jpeg|png))[^"]*"/gi, function (_, thumbUrl) {
            const fullUrl = thumbnailToFull(thumbUrl);
            if (fullUrl && !seen[fullUrl]) {
                seen[fullUrl] = true;
                pages.push(fullUrl);
            }
            return _;
        });
        
        // Fallback: direct image URLs
        if (pages.length === 0) {
            safeString(html).replace(/https:\/\/multporn\.net\/sites\/default\/files\/[^"\s<>]+\.(?:jpg|jpeg|png)/gi, function (match) {
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
                type: "parody",
                name: "Parody (Manga)",
                values: MULT_MANGA_PARODIES.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: MULT_SORT.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "artist",
                name: "Artist (Western)",
                values: MULT_ARTISTS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: MULT_TAGS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            }
        ];
    }
}