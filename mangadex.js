const mangayomiSources = [{
    "name": "MangaDex",
    "lang": "en",
    "baseUrl": "https://mangadex.org",
    "apiUrl": "https://api.mangadex.org",
    "iconUrl": "https://api.mangadex.org/static/favicon.svg",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "version": "1.0.0",
    "pkgPath": "mangadex.js"
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getHeaders() {
        return {
            "user-agent": "Dalvik/2.1.0 (Linux; U; Android 14; 22081212UG Build/UKQ1.230917.001)"
        };
    }

    async getPopular(page) {
        try {
            const offset = 20 * (page - 1);
            const url = `${this.source.apiUrl}/manga?limit=20&offset=${offset}` +
                `&availableTranslatedLanguage[]=en` +
                `&hasAvailableChapters=true` +
                `&includes[]=cover_art` +
                `&contentRating[]=safe` +
                `&contentRating[]=suggestive` +
                `&originalLanguage[]=ja` +
                `&originalLanguage[]=ko` +
                `&originalLanguage[]=zh` +
                `&order[followedCount]=desc`;

            const response = await this.client.get(url, this.getHeaders());
            return this.mangaRes(response.body);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        try {
            const offset = 20 * (page - 1);
            // Get recent chapters first
            const chapterUrl = `${this.source.apiUrl}/chapter?limit=20&offset=${offset}` +
                `&translatedLanguage[]=en` +
                `&includeFutureUpdates=0` +
                `&order[publishAt]=desc` +
                `&includeFuturePublishAt=0` +
                `&includeEmptyPages=0`;

            const chapterRes = await this.client.get(chapterUrl, this.getHeaders());
            const chapterData = JSON.parse(chapterRes.body).data || [];

            // Get unique manga IDs
            const mangaIds = [...new Set(
                chapterData
                    .flatMap(item => item.relationships || [])
                    .filter(rel => rel.type === "manga")
                    .map(m => m.id)
            )];

            if (mangaIds.length === 0) {
                return { list: [], hasNextPage: false };
            }

            // Fetch manga details
            const idsParam = mangaIds.map(id => `ids[]=${id}`).join("&");
            const mangaUrl = `${this.source.apiUrl}/manga?includes[]=cover_art` +
                `&limit=${mangaIds.length}` +
                `&contentRating[]=safe` +
                `&contentRating[]=suggestive` +
                `&originalLanguage[]=ja` +
                `&originalLanguage[]=ko` +
                `&originalLanguage[]=zh` +
                `&${idsParam}`;

            const mangaRes = await this.client.get(mangaUrl, this.getHeaders());
            return this.mangaRes(mangaRes.body);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            const offset = 20 * (page - 1);
            let url = `${this.source.apiUrl}/manga?includes[]=cover_art` +
                `&offset=${offset}&limit=20&title=${encodeURIComponent(query)}` +
                `&availableTranslatedLanguage[]=en` +
                `&hasAvailableChapters=true` +
                `&contentRating[]=safe&contentRating[]=suggestive`;

            // Apply filters
            if (filters && Array.isArray(filters)) {
                for (const filter of filters) {
                    if (filter.type === "status") {
                        const status = this.getFilterValue(filter);
                        if (status) url += `&status[]=${status}`;
                    }
                    if (filter.type === "sort") {
                        const sort = this.getFilterValue(filter);
                        if (sort === "popular") url += "&order[followedCount]=desc";
                        else if (sort === "latest") url += "&order[latestUploadedChapter]=desc";
                        else if (sort === "title") url += "&order[title]=asc";
                    }
                }
            }

            const response = await this.client.get(url, this.getHeaders());
            return this.mangaRes(response.body);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    getFilterValue(filter) {
        if (typeof filter.state === "number" && Array.isArray(filter.values)) {
            const selected = filter.values[filter.state];
            return selected ? selected.value : "";
        }
        return "";
    }

    async getDetail(url) {
        try {
            const mangaId = url.startsWith("/manga/") ? url.split("/")[2] : url;
            const detailUrl = `${this.source.apiUrl}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
            const response = await this.client.get(detailUrl, this.getHeaders());
            const data = JSON.parse(response.body).data;
            const attrs = data.attributes;

            // Cover
            const coverRel = (data.relationships || []).find(r => r.type === "cover_art");
            const imageUrl = coverRel && coverRel.attributes
                ? `https://uploads.mangadex.org/covers/${data.id}/${coverRel.attributes.fileName}.256.jpg`
                : "";

            // Authors
            const authors = (data.relationships || [])
                .filter(r => r.type === "author")
                .map(r => r.attributes.name);
            const author = authors.join(", ");

            // Description
            const description = attrs.description?.en || attrs.description?.["en-us"] || "";

            // Tags
            const genre = (attrs.tags || [])
                .filter(t => t.attributes && t.attributes.name && t.attributes.name.en)
                .map(t => t.attributes.name.en);

            // Status
            let status = 5;
            if (attrs.status === "ongoing") status = 0;
            else if (attrs.status === "completed") status = 1;
            else if (attrs.status === "hiatus") status = 2;

            // Fetch chapters
            const chapters = await this.fetchChapters(mangaId);

            return {
                name: this.findTitle(data),
                link: `/manga/${data.id}`,
                imageUrl: imageUrl,
                description: description,
                author: author,
                artist: author,
                genre: genre,
                status: status,
                chapters: chapters
            };
        } catch (e) {
            return {
                name: "Error",
                link: url,
                imageUrl: "",
                description: e.message || "Failed to load",
                author: "",
                artist: "",
                genre: [],
                status: 5,
                chapters: []
            };
        }
    }

    findTitle(data) {
        const titles = data.attributes.title || {};
        if (titles.en) return titles.en;
        if (titles["en-us"]) return titles["en-us"];
        return Object.values(titles)[0] || "Unknown";
    }

    async fetchChapters(mangaId) {
        try {
            const url = `${this.source.apiUrl}/manga/${mangaId}/feed` +
                `?limit=100&offset=0` +
                `&translatedLanguage[]=en` +
                `&includes[]=scanlation_group` +
                `&includes[]=user` +
                `&order[volume]=asc` +
                `&order[chapter]=asc` +
                `&includeFuturePublishAt=0` +
                `&includeEmptyPages=0`;

            const res = await this.client.get(url, this.getHeaders());
            const data = JSON.parse(res.body);
            const results = data.data || [];

            return results.map(ch => {
                const attrs = ch.attributes || {};

                // Scanlation group
                let scanlator = "No Group";
                const groups = (ch.relationships || []).filter(
                    r => r.type === "scanlation_group" && r.id !== "00e03853-1b96-4f41-9542-c71b8692033b"
                );
                if (groups.length > 0 && groups[0].attributes) {
                    scanlator = groups[0].attributes.name || scanlator;
                }

                // Chapter name
                const vol = attrs.volume || "";
                const num = attrs.chapter || "";
                let name = "";
                if (vol && num) name = `Vol.${vol} Ch.${num}`;
                else if (num) name = `Ch.${num}`;
                else name = "Oneshot";

                if (attrs.title) name += ` - ${attrs.title}`;

                // Date
                const dateUpload = attrs.publishAt
                    ? new Date(attrs.publishAt).getTime().toString()
                    : "0";

                return {
                    name: name,
                    url: ch.id,
                    scanlator: scanlator,
                    dateUpload: dateUpload
                };
            });
        } catch (e) {
            return [];
        }
    }

    async getPageList(url) {
        try {
            const chapterId = url;
            const pageUrl = `${this.source.apiUrl}/at-home/server/${chapterId}`;
            const response = await this.client.get(pageUrl, this.getHeaders());
            const data = JSON.parse(response.body);

            const host = data.baseUrl || "https://uploads.mangadex.org";
            const chapter = data.chapter;
            const hash = chapter.hash;
            const pages = chapter.data || [];

            return pages.map(file => `${host}/data/${hash}/${file}`);
        } catch (e) {
            return [];
        }
    }

    mangaRes(body) {
        try {
            const json = JSON.parse(body);
            const data = json.data || [];
            const list = data.map(e => ({
                name: this.findTitle(e),
                imageUrl: this.getCover(e),
                link: `/manga/${e.id}`
            }));
            return { list, hasNextPage: list.length >= 20 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    getCover(data) {
        const coverRel = (data.relationships || []).find(r => r.type === "cover_art");
        if (coverRel && coverRel.attributes && coverRel.attributes.fileName) {
            return `https://uploads.mangadex.org/covers/${data.id}/${coverRel.attributes.fileName}.256.jpg`;
        }
        return "";
    }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: [
                    { type_name: "SelectOption", name: "Popular", value: "popular" },
                    { type_name: "SelectOption", name: "Latest", value: "latest" },
                    { type_name: "SelectOption", name: "Title A-Z", value: "title" }
                ]
            },
            {
                type_name: "SelectFilter",
                type: "status",
                name: "Status",
                values: [
                    { type_name: "SelectOption", name: "Any", value: "" },
                    { type_name: "SelectOption", name: "Ongoing", value: "ongoing" },
                    { type_name: "SelectOption", name: "Completed", value: "completed" },
                    { type_name: "SelectOption", name: "Hiatus", value: "hiatus" }
                ]
            }
        ];
    }

    getSourcePreferences() {
        return [];
    }
}
