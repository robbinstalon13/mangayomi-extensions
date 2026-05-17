// MangaDex Extension for Mangayomi
// API Documentation: https://api.mangadex.org/docs/

const MD_BASE = "https://api.mangadex.org";
const MD_COVER = "https://uploads.mangadex.org";

// Genre tags
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

const MD_DEMO = [
    { name: "Any", value: "" },
    { name: "Shounen", value: "shounen" },
    { name: "Shoujo", value: "shoujo" },
    { name: "Seinen", value: "seinen" },
    { name: "Josei", value: "josei" }
];

const MD_SORT = [
    { name: "Latest", value: "latest" },
    { name: "Popular", value: "popular" },
    { name: "Title A-Z", value: "title" }
];

function safe(str) {
    if (str === null || str === undefined) return "";
    return String(str);
}

function getTitle(attrs) {
    if (!attrs || !attrs.title) return "Unknown";
    return attrs.title.en || attrs.title["en-us"] || Object.values(attrs.title)[0] || "Unknown";
}

function getDesc(attrs) {
    if (!attrs || !attrs.description) return "";
    return attrs.description.en || attrs.description["en-us"] || "";
}

function getCover(manga) {
    var rels = manga.relationships || [];
    for (var i = 0; i < rels.length; i++) {
        var rel = rels[i];
        if (rel.type === "cover_art" && rel.attributes && rel.attributes.fileName) {
            return MD_COVER + "/covers/" + manga.id + "/" + rel.attributes.fileName + ".256.jpg";
        }
    }
    return "";
}

function getFilterVal(filters, type) {
    if (!filters || !Array.isArray(filters)) return "";
    for (var i = 0; i < filters.length; i++) {
        var f = filters[i];
        if (f && f.type === type) {
            if (typeof f.state === "number" && Array.isArray(f.values) && f.values[f.state]) {
                return safe(f.values[f.state].value || "");
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
            "User-Agent": "Mangayomi/1.0",
            "Accept": "application/json"
        };
    }
    
    async fetchJson(url) {
        var client = new Client(this.clientConfig);
        var resp = await client.get(url, this.getHeaders());
        var status = Number(resp.statusCode || 0);
        if (status >= 400) {
            throw new Error("HTTP " + status + " for " + url);
        }
        var body = safe(resp.body);
        if (!body) {
            throw new Error("Empty response for " + url);
        }
        try {
            return JSON.parse(body);
        } catch (e) {
            throw new Error("JSON parse error: " + e.message);
        }
    }
    
    async getPopular(page) {
        try {
            var pageNum = Math.max(1, parseInt(page, 10) || 1);
            var limit = 20;
            var offset = (pageNum - 1) * limit;
            
            var url = MD_BASE + "/manga?limit=" + limit + "&offset=" + offset + 
                "&order[followedCount]=desc&includes[]=cover_art&includes[]=author";
            
            var data = await this.fetchJson(url);
            var list = [];
            var results = data.results || [];
            
            for (var i = 0; i < results.length; i++) {
                var manga = results[i];
                list.push({
                    name: getTitle(manga.attributes),
                    imageUrl: getCover(manga),
                    link: manga.id
                });
            }
            
            var total = data.total || 0;
            var hasNext = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNext };
        } catch (e) {
            console.log("[mangadex] getPopular error: " + e.message);
            return { list: [], hasNextPage: false };
        }
    }
    
    async getLatestUpdates(page) {
        try {
            var pageNum = Math.max(1, parseInt(page, 10) || 1);
            var limit = 20;
            var offset = (pageNum - 1) * limit;
            
            var url = MD_BASE + "/manga?limit=" + limit + "&offset=" + offset + 
                "&order[latestUploadedChapter]=desc&includes[]=cover_art&includes[]=author";
            
            var data = await this.fetchJson(url);
            var list = [];
            var results = data.results || [];
            
            for (var i = 0; i < results.length; i++) {
                var manga = results[i];
                list.push({
                    name: getTitle(manga.attributes),
                    imageUrl: getCover(manga),
                    link: manga.id
                });
            }
            
            var total = data.total || 0;
            var hasNext = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNext };
        } catch (e) {
            console.log("[mangadex] getLatestUpdates error: " + e.message);
            return { list: [], hasNextPage: false };
        }
    }
    
    async search(query, page, filters) {
        try {
            var pageNum = Math.max(1, parseInt(page, 10) || 1);
            var limit = 20;
            var offset = (pageNum - 1) * limit;
            
            var url = MD_BASE + "/manga?limit=" + limit + "&offset=" + offset + 
                "&title=" + encodeURIComponent(query.trim()) +
                "&includes[]=cover_art&includes[]=author";
            
            var genre = getFilterVal(filters, "genre");
            var status = getFilterVal(filters, "status");
            var demo = getFilterVal(filters, "demographic");
            var sort = getFilterVal(filters, "sort");
            
            if (genre) url += "&includedTags[]=" + genre;
            if (status) url += "&status[]=" + status;
            if (demo) url += "&publicationDemographic[]=" + demo;
            
            if (sort === "popular") {
                url += "&order[followedCount]=desc";
            } else if (sort === "title") {
                url += "&order[title]=asc";
            } else {
                url += "&order[relevance]=desc";
            }
            
            var data = await this.fetchJson(url);
            var list = [];
            var results = data.results || [];
            
            for (var i = 0; i < results.length; i++) {
                var manga = results[i];
                list.push({
                    name: getTitle(manga.attributes),
                    imageUrl: getCover(manga),
                    link: manga.id
                });
            }
            
            var total = data.total || 0;
            var hasNext = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNext };
        } catch (e) {
            console.log("[mangadex] search error: " + e.message);
            return { list: [], hasNextPage: false };
        }
    }
    
    async getDetail(url) {
        try {
            var mangaId = url;
            
            // Fetch manga details
            var detailUrl = MD_BASE + "/manga/" + mangaId + 
                "?includes[]=cover_art&includes[]=author&includes[]=artist";
            var mangaData = await this.fetchJson(detailUrl);
            var attrs = mangaData.data.attributes;
            
            var title = getTitle(attrs);
            var desc = getDesc(attrs);
            var cover = getCover(mangaData.data);
            
            // Get tags
            var tags = [];
            var tagList = attrs.tags || [];
            for (var i = 0; i < tagList.length; i++) {
                var tag = tagList[i];
                if (tag.attributes && tag.attributes.name && tag.attributes.name.en) {
                    tags.push(tag.attributes.name.en);
                }
            }
            
            // Get author
            var author = "";
            var rels = mangaData.data.relationships || [];
            for (var j = 0; j < rels.length; j++) {
                var rel = rels[j];
                if (rel.type === "author" && !author && rel.attributes) {
                    author = rel.attributes.name || "";
                }
            }
            
            // Status: 0=ongoing, 1=completed, 5=unknown
            var status = 5;
            if (attrs.status === "ongoing") status = 0;
            else if (attrs.status === "completed") status = 1;
            
            // Fetch chapters
            var chapters = await this.fetchChapters(mangaId);
            
            return {
                name: title,
                link: mangaId,
                imageUrl: cover,
                description: desc,
                author: author,
                artist: author,
                genre: tags,
                status: status,
                chapters: chapters
            };
        } catch (e) {
            console.log("[mangadex] getDetail error: " + e.message);
            return {
                name: "Error",
                link: url,
                imageUrl: "",
                description: e.message,
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
            var url = MD_BASE + "/manga/" + mangaId + "/feed?" +
                "limit=100&offset=0&translatedLanguage[]=en" +
                "&order[chapter]=asc&order[volume]=asc&includes[]=scanlation_group";
            
            var data = await this.fetchJson(url);
            var chapters = [];
            var results = data.results || [];
            
            for (var i = 0; i < results.length; i++) {
                var chapter = results[i];
                var cattrs = chapter.attributes;
                
                // Get scanlation group
                var scanlator = "";
                var crels = chapter.relationships || [];
                for (var j = 0; j < crels.length; j++) {
                    if (crels[j].type === "scanlation_group" && crels[j].attributes) {
                        scanlator = crels[j].attributes.name || "";
                        break;
                    }
                }
                
                // Format chapter name
                var vol = cattrs.volume || "";
                var ch = cattrs.chapter || "";
                var name = "";
                
                if (vol && ch) {
                    name = "Ch. " + vol + "." + ch;
                } else if (ch) {
                    name = "Ch. " + ch;
                } else if (vol) {
                    name = "Vol. " + vol;
                } else {
                    name = "Oneshot";
                }
                
                if (cattrs.title) {
                    name += " - " + cattrs.title;
                }
                
                // Date
                var publishAt = cattrs.publishAt || cattrs.createdAt || "";
                var dateUpload = publishAt ? new Date(publishAt).getTime() : 0;
                
                chapters.push({
                    name: name,
                    url: chapter.id,
                    scanlator: scanlator || "Unknown",
                    dateUpload: String(dateUpload)
                });
            }
            
            return chapters;
        } catch (e) {
            console.log("[mangadex] fetchChapters error: " + e.message);
            return [];
        }
    }
    
    async getPageList(url) {
        try {
            var chapterId = url;
            
            var client = new Client(this.clientConfig);
            var resp = await client.get(
                MD_BASE + "/at-home/server/" + chapterId,
                this.getHeaders()
            );
            
            if (resp.statusCode !== 200) {
                throw new Error("HTTP " + resp.statusCode);
            }
            
            var data = JSON.parse(resp.body);
            
            if (!data.data || !data.data.attributes) {
                throw new Error("Invalid chapter response");
            }
            
            var dattrs = data.data.attributes;
            var hash = dattrs.hash;
            var pages = dattrs.data || [];
            var server = data.baseUrl || MD_COVER;
            
            var pageUrls = [];
            for (var i = 0; i < pages.length; i++) {
                pageUrls.push(server + "/data/" + hash + "/" + pages[i]);
            }
            
            return pageUrls;
        } catch (e) {
            console.log("[mangadex] getPageList error: " + e.message);
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
                values: MD_DEMO
            }
        ];
    }
}