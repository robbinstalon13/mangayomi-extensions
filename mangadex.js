// MangaDex Extension for Mangayomi
// API Documentation: https://api.mangadex.org/docs/

const MD_BASE_URL = "https://api.mangadex.org";
const MD_COVER_BASE = "https://uploads.mangadex.org";

// Popular genres/tags for filtering
const MD_GENRES = [
    { name: "Any", value: "" },
    { name: "Action", value: "action" },
    { name: "Adventure", value: "adventure" },
    { name: "Comedy", value: "comedy" },
    { name: "Drama", value: "drama" },
    { name: "Fantasy", value: "fantasy" },
    { name: "Horror", value: "horror" },
    { name: "Mystery", value: "mystery" },
    { name: "Romance", value: "romance" },
    { name: "Sci-Fi", value: "science-fiction" },
    { name: "Slice of Life", value: "slice-of-life" },
    { name: "Sports", value: "sports" },
    { name: "Supernatural", value: "supernatural" },
    { name: "Thriller", value: "thriller" },
    { name: "Isekai", value: "isekai" },
    { name: "Mecha", value: "mecha" },
    { name: "Yaoi", value: "yaoi" },
    { name: "Yuri", value: "yuri" },
    { name: "Ecchi", value: "ecchi" }
];

const MD_STATUS = [
    { name: "Any", value: "" },
    { name: "Ongoing", value: "ongoing" },
    { name: "Completed", value: "completed" },
    { name: "Hiatus", value: "hiatus" },
    { name: "Cancelled", value: "cancelled" }
];

const MD_DEMOGRAPHIC = [
    { name: "Any", value: "" },
    { name: "Shounen", value: "shounen" },
    { name: "Shoujo", value: "shoujo" },
    { name: "Seinen", value: "seinen" },
    { name: "Josei", value: "josei" }
];

const MD_SORT = [
    { name: "Latest", value: "latest" },
    { name: "Popular", value: "popular" },
    { name: "Trending", value: "trending" },
    { name: "Title A-Z", value: "title" }
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

// Get English title from manga attributes
function getEnglishTitle(attributes) {
    if (!attributes || !attributes.title) return "Unknown";
    return attributes.title.en || 
           attributes.title["en-us"] ||
           Object.values(attributes.title)[0] ||
           "Unknown";
}

// Get English description
function getEnglishDescription(attributes) {
    if (!attributes || !attributes.description) return "";
    return attributes.description.en || 
           attributes.description["en-us"] ||
           Object.values(attributes.description)[0] ||
           "";
}

// Extract cover URL from manga relationships
function getCoverUrl(mangaData) {
    const relationships = mangaData.relationships || [];
    for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i];
        if (rel.type === "cover_art") {
            const attrs = rel.attributes;
            if (attrs && attrs.fileName) {
                return MD_COVER_BASE + "/covers/" + mangaData.id + "/" + attrs.fileName + ".256.jpg";
            }
        }
    }
    return "";
}

// Extract filter value from filters array
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

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 30
        };
    }
    
    getHeaders() {
        return {
            "User-Agent": "Mangayomi/1.0 (MangaDex Extension)",
            "Accept": "application/json"
        };
    }
    
    async requestJson(url) {
        const client = new Client(this.clientConfig);
        const response = await client.get(url, this.getHeaders());
        if (response.statusCode !== 200) {
            throw new Error("Request failed: " + response.statusCode);
        }
        return JSON.parse(response.body);
    }
    
    async getPopular(page) {
        try {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limit = 20;
            const offset = (pageNum - 1) * limit;
            
            // Build URL for popular manga (followed count)
            const url = MD_BASE_URL + "/manga?limit=" + limit + 
                "&offset=" + offset + 
                "&includes[]=cover_art" +
                "&order[followedCount]=desc";
            
            const data = await this.requestJson(url);
            const list = [];
            const results = data.results || [];
            
            for (let i = 0; i < results.length; i++) {
                const manga = results[i];
                const title = getEnglishTitle(manga.attributes);
                const coverUrl = getCoverUrl(manga);
                
                list.push({
                    name: title,
                    imageUrl: coverUrl,
                    link: manga.id
                });
            }
            
            const total = data.total || 0;
            const hasNextPage = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNextPage };
            
        } catch (error) {
            console.log("[mangadex] getPopular error: " + (error && error.message ? error.message : String(error)));
            return { list: [], hasNextPage: false };
        }
    }
    
    async getLatestUpdates(page) {
        try {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limit = 20;
            const offset = (pageNum - 1) * limit;
            
            const url = MD_BASE_URL + "/manga?limit=" + limit + 
                "&offset=" + offset + 
                "&includes[]=cover_art" +
                "&order[latestUploadedChapter]=desc";
            
            const data = await this.requestJson(url);
            const list = [];
            const results = data.results || [];
            
            for (let i = 0; i < results.length; i++) {
                const manga = results[i];
                const title = getEnglishTitle(manga.attributes);
                const coverUrl = getCoverUrl(manga);
                
                list.push({
                    name: title,
                    imageUrl: coverUrl,
                    link: manga.id
                });
            }
            
            const total = data.total || 0;
            const hasNextPage = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNextPage };
            
        } catch (error) {
            console.log("[mangadex] getLatestUpdates error: " + (error && error.message ? error.message : String(error)));
            return { list: [], hasNextPage: false };
        }
    }
    
    async search(query, page, filters) {
        try {
            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limit = 20;
            const offset = (pageNum - 1) * limit;
            
            // Build search params
            let url = MD_BASE_URL + "/manga?limit=" + limit + 
                "&offset=" + offset + 
                "&includes[]=cover_art" +
                "&title=" + encodeURIComponent(query.trim());
            
            // Add filters
            const genre = extractFilterValue(filters, "genre");
            const status = extractFilterValue(filters, "status");
            const demographic = extractFilterValue(filters, "demographic");
            const sort = extractFilterValue(filters, "sort");
            
            if (genre) {
                url += "&includedTags[]=" + genre;
            }
            if (status) {
                url += "&status[]=" + status;
            }
            if (demographic) {
                url += "&publicationDemographic[]=" + demographic;
            }
            
            // Order
            if (sort === "popular") {
                url += "&order[followedCount]=desc";
            } else if (sort === "title") {
                url += "&order[title]=asc";
            } else {
                url += "&order[relevance]=desc";
            }
            
            const data = await this.requestJson(url);
            const list = [];
            const results = data.results || [];
            
            for (let i = 0; i < results.length; i++) {
                const manga = results[i];
                const title = getEnglishTitle(manga.attributes);
                const coverUrl = getCoverUrl(manga);
                
                list.push({
                    name: title,
                    imageUrl: coverUrl,
                    link: manga.id
                });
            }
            
            const total = data.total || 0;
            const hasNextPage = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNextPage };
            
        } catch (error) {
            console.log("[mangadex] search error: " + (error && error.message ? error.message : String(error)));
            return { list: [], hasNextPage: false };
        }
    }
    
    async getDetail(url) {
        try {
            const mangaId = url;
            
            // Get manga details with relationships
            const mangaUrl = MD_BASE_URL + "/manga/" + mangaId + 
                "?includes[]=cover_art&includes[]=author&includes[]=artist";
            const mangaData = await this.requestJson(mangaUrl);
            
            const attrs = mangaData.data.attributes;
            const title = getEnglishTitle(attrs);
            const description = getEnglishDescription(attrs);
            const coverUrl = getCoverUrl(mangaData.data);
            
            // Get tags
            const tags = [];
            const tagList = attrs.tags || [];
            for (let i = 0; i < tagList.length; i++) {
                const tag = tagList[i];
                if (tag.attributes && tag.attributes.name && tag.attributes.name.en) {
                    tags.push(tag.attributes.name.en);
                }
            }
            
            // Get author/artist
            let author = "";
            const relationships = mangaData.data.relationships || [];
            for (let i = 0; i < relationships.length; i++) {
                const rel = relationships[i];
                if (rel.type === "author" && !author) {
                    author = rel.attributes ? rel.attributes.name : "";
                }
            }
            
            // Get status (0=ongoing, 1=completed, 5=unknown)
            let status = 5;
            if (attrs.status === "ongoing") status = 0;
            else if (attrs.status === "completed") status = 1;
            else if (attrs.status === "hiatus") status = 0;
            else if (attrs.status === "cancelled") status = 1;
            
            // Fetch chapters
            const chapters = await this.fetchChapters(mangaId);
            
            return {
                name: title,
                link: mangaId,
                imageUrl: coverUrl,
                description: description,
                author: author,
                artist: author,
                genre: tags,
                status: status,
                chapters: chapters
            };
            
        } catch (error) {
            console.log("[mangadex] getDetail error: " + (error && error.message ? error.message : String(error)));
            return {
                name: "Error",
                link: url,
                imageUrl: "",
                description: "Failed to load manga details",
                author: "",
                artist: "",
                genre: [],
                status: 5,
                chapters: []
            };
        }
    }
    
    async fetchChapters(mangaId) {
        try {
            const url = MD_BASE_URL + "/manga/" + mangaId + "/feed?" +
                "limit=100" +
                "&offset=0" +
                "&translatedLanguage[]=en" +
                "&order[chapter]=asc" +
                "&order[volume]=asc" +
                "&includes[]=scanlation_group";
            
            const data = await this.requestJson(url);
            const results = data.results || [];
            
            const chapters = [];
            for (let i = 0; i < results.length; i++) {
                const chapter = results[i];
                const attrs = chapter.attributes;
                
                // Get scanlation group
                let scanlator = "";
                const relationships = chapter.relationships || [];
                for (let j = 0; j < relationships.length; j++) {
                    if (relationships[j].type === "scanlation_group") {
                        scanlator = relationships[j].attributes ? relationships[j].attributes.name : "";
                        break;
                    }
                }
                
                // Format chapter name
                const volume = attrs.volume || "";
                const chapNum = attrs.chapter || "";
                let name = "";
                
                if (volume && chapNum) {
                    name = "Ch. " + volume + "." + chapNum;
                } else if (chapNum) {
                    name = "Ch. " + chapNum;
                } else if (volume) {
                    name = "Vol. " + volume;
                } else {
                    name = "Oneshot";
                }
                
                // Add title if exists
                if (attrs.title) {
                    name += " - " + attrs.title;
                }
                
                // Get publish date
                const publishAt = attrs.publishAt || attrs.createdAt || "";
                const dateUpload = publishAt ? new Date(publishAt).getTime() : 0;
                
                chapters.push({
                    name: name,
                    url: chapter.id,
                    scanlator: scanlator || "Unknown",
                    dateUpload: String(dateUpload)
                });
            }
            
            return chapters;
            
        } catch (error) {
            console.log("[mangadex] fetchChapters error: " + (error && error.message ? error.message : String(error)));
            return [];
        }
    }
    
    async getPageList(url) {
        try {
            const chapterId = url;
            
            // Get at-home server for pages
            const client = new Client(this.clientConfig);
            const response = await client.get(
                MD_BASE_URL + "/at-home/server/" + chapterId,
                this.getHeaders()
            );
            
            if (response.statusCode !== 200) {
                throw new Error("Failed to get chapter pages: " + response.statusCode);
            }
            
            const data = JSON.parse(response.body);
            
            if (!data.data || !data.data.attributes) {
                throw new Error("Invalid chapter response");
            }
            
            const attrs = data.data.attributes;
            const hash = attrs.hash;
            const pages = attrs.data || [];
            const serverBase = data.baseUrl || MD_COVER_BASE;
            
            // Build page URLs
            const pageUrls = [];
            for (let i = 0; i < pages.length; i++) {
                const filename = pages[i];
                pageUrls.push(serverBase + "/data/" + hash + "/" + filename);
            }
            
            return pageUrls;
            
        } catch (error) {
            console.log("[mangadex] getPageList error: " + (error && error.message ? error.message : String(error)));
            return [];
        }
    }
    
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: MD_SORT
            },
            {
                type_name: "SelectFilter",
                type: "genre",
                name: "Genre",
                values: MD_GENRES
            },
            {
                type_name: "SelectFilter",
                type: "status",
                name: "Status",
                values: MD_STATUS
            },
            {
                type_name: "SelectFilter",
                type: "demographic",
                name: "Demographic",
                values: MD_DEMOGRAPHIC
            }
        ];
    }
}