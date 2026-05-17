// MangaDex Extension for Mangayomi
// API: https://api.mangadex.org

var MD_BASE = "https://api.mangadex.org";
var MD_COVER = "https://uploads.mangadex.org";

var MD_GENRES = [
    { name: "Any", value: "" },
    { name: "Action", value: "action" },
    { name: "Adventure", value: "adventure" },
    { name: "Comedy", value: "comedy" },
    { name: "Drama", value: "drama" },
    { name: "Fantasy", value: "fantasy" },
    { name: "Romance", value: "romance" },
    { name: "Sci-Fi", value: "science-fiction" },
    { name: "Slice of Life", value: "slice-of-life" },
    { name: "Supernatural", value: "supernatural" },
    { name: "Horror", value: "horror" },
    { name: "Mystery", value: "mystery" },
    { name: "Thriller", value: "thriller" },
    { name: "Sports", value: "sports" },
    { name: "Isekai", value: "isekai" }
];

var MD_STATUS = [
    { name: "Any", value: "" },
    { name: "Ongoing", value: "ongoing" },
    { name: "Completed", value: "completed" },
    { name: "Hiatus", value: "hiatus" }
];

var MD_SORT = [
    { name: "Latest", value: "latest" },
    { name: "Popular", value: "popular" },
    { name: "Title A-Z", value: "title" }
];

function safeStr(s) {
    if (s === null || s === undefined) return "";
    return String(s);
}

function getMangaTitle(attrs) {
    if (!attrs || !attrs.title) return "Unknown";
    return attrs.title.en || attrs.title["en-us"] || Object.values(attrs.title)[0] || "Unknown";
}

function getMangaDesc(attrs) {
    if (!attrs || !attrs.description) return "";
    return attrs.description.en || attrs.description["en-us"] || "";
}

function getCoverUrl(manga) {
    var rels = manga.relationships || [];
    for (var i = 0; i < rels.length; i++) {
        var r = rels[i];
        if (r.type === "cover_art" && r.attributes && r.attributes.fileName) {
            return MD_COVER + "/covers/" + manga.id + "/" + r.attributes.fileName + ".256.jpg";
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
                return safeStr(f.values[f.state].value || "");
            }
        }
    }
    return "";
}

class DefaultExtension extends MProvider {
    async api(path) {
        var resp = await new Client().get(MD_BASE + path);
        return JSON.parse(resp.body);
    }
    
    mapManga(m) {
        return {
            name: getMangaTitle(m.attributes),
            imageUrl: getCoverUrl(m),
            link: m.id
        };
    }
    
    async getPopular(page) {
        try {
            var pageNum = Math.max(1, parseInt(page, 10) || 1);
            var limit = 20;
            var offset = (pageNum - 1) * limit;
            
            var data = await this.api("/manga?limit=" + limit + "&offset=" + offset + 
                "&order[followedCount]=desc&includes[]=cover_art");
            
            var results = data.results || [];
            var list = [];
            for (var i = 0; i < results.length; i++) {
                list.push(this.mapManga(results[i]));
            }
            
            var total = data.total || 0;
            var hasNext = (offset + limit) < total;
            
            return { list: list, hasNextPage: hasNext };
        } catch (e) {
            console.log("[mangadex] getPopular error: " + e.message);
            return { list: [], hasNextPage: false };
        }
    }
    
    get supportsLatest() {
        return true;
    }
    
    async getLatestUpdates(page) {
        try {
            var pageNum = Math.max(1, parseInt(page, 10) || 1);
            var limit = 20;
            var offset = (pageNum - 1) * limit;
            
            var data = await this.api("/manga?limit=" + limit + "&offset=" + offset + 
                "&order[latestUploadedChapter]=desc&includes[]=cover_art");
            
            var results = data.results || [];
            var list = [];
            for (var i = 0; i < results.length; i++) {
                list.push(this.mapManga(results[i]));
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
            
            var path = "/manga?limit=" + limit + "&offset=" + offset + 
                "&title=" + encodeURIComponent(query.trim()) +
                "&includes[]=cover_art";
            
            var genre = getFilterVal(filters, "genre");
            if (genre) path += "&includedTags[]=" + genre;
            
            var sort = getFilterVal(filters, "sort");
            if (sort === "popular") {
                path += "&order[followedCount]=desc";
            } else if (sort === "title") {
                path += "&order[title]=asc";
            }
            
            var data = await this.api(path);
            
            var results = data.results || [];
            var list = [];
            for (var i = 0; i < results.length; i++) {
                list.push(this.mapManga(results[i]));
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
            
            var mangaData = await this.api("/manga/" + mangaId + "?includes[]=cover_art&includes[]=author");
            var attrs = mangaData.data.attributes;
            
            var title = getMangaTitle(attrs);
            var desc = getMangaDesc(attrs);
            var cover = getCoverUrl(mangaData.data);
            
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
                var r = rels[j];
                if (r.type === "author" && !author && r.attributes) {
                    author = r.attributes.name || "";
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
            var data = await this.api("/manga/" + mangaId + "/feed?" +
                "limit=100&offset=0&translatedLanguage[]=en" +
                "&order[chapter]=asc&order[volume]=asc&includes[]=scanlation_group");
            
            var chapters = [];
            var results = data.results || [];
            
            for (var i = 0; i < results.length; i++) {
                var ch = results[i];
                var cattrs = ch.attributes;
                
                // Get scanlation group
                var scanlator = "";
                var crels = ch.relationships || [];
                for (var j = 0; j < crels.length; j++) {
                    var cr = crels[j];
                    if (cr.type === "scanlation_group" && cr.attributes) {
                        scanlator = cr.attributes.name || "";
                        break;
                    }
                }
                
                // Format name
                var vol = cattrs.volume || "";
                var num = cattrs.chapter || "";
                var name = "";
                
                if (vol && num) {
                    name = "Ch. " + vol + "." + num;
                } else if (num) {
                    name = "Ch. " + num;
                } else if (vol) {
                    name = "Vol. " + vol;
                } else {
                    name = "Oneshot";
                }
                
                if (cattrs.title) {
                    name += " - " + cattrs.title;
                }
                
                // Date
                var pubAt = cattrs.publishAt || cattrs.createdAt || "";
                var dateMs = pubAt ? new Date(pubAt).getTime() : 0;
                
                chapters.push({
                    name: name,
                    url: ch.id,
                    scanlator: scanlator || "Unknown",
                    dateUpload: String(dateMs)
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
            
            var resp = await new Client().get(MD_BASE + "/at-home/server/" + chapterId);
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
            }
        ];
    }
}