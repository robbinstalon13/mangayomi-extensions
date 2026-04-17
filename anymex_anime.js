const mangayomiSources = [{
    "name": "AnymeX Anime",
    "lang": "en",
    "baseUrl": "https://api.jikan.moe",
    "apiUrl": "https://api.jikan.moe/v4",
    "iconUrl": "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": false,
    "version": "0.0.5",
    "pkgPath": "anymex_anime.js"
}];

class DefaultExtension extends MProvider {
    async jikan(path) {
        var resp = await new Client().get("https://api.jikan.moe/v4" + path);
        return JSON.parse(resp.body);
    }

    async getImdbId(malId) {
        try {
            var resp = await new Client().get("https://api.ani.zip/mappings?mal_id=" + malId);
            var data = JSON.parse(resp.body);
            return (data.mappings && data.mappings.imdb_id) ? data.mappings.imdb_id : null;
        } catch (e) {
            return null;
        }
    }

    mapAnime(e) {
        return {
            name: e.title_english || e.title || "Unknown",
            link: String(e.mal_id),
            imageUrl: (e.images && e.images.jpg && e.images.jpg.large_image_url) ? e.images.jpg.large_image_url : "",
            description: e.synopsis || ""
        };
    }

    async getPopular(page) {
        try {
            var data = await this.jikan("/top/anime?type=tv&filter=bypopularity&page=" + page);
            var list = (data.data || []).map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: data.pagination && data.pagination.has_next_page };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    get supportsLatest() {
        return true;
    }

    async getLatestUpdates(page) {
        try {
            var data = await this.jikan("/top/anime?type=tv&filter=airing&page=" + page);
            var list = (data.data || []).map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: data.pagination && data.pagination.has_next_page };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            var data = await this.jikan("/anime?q=" + encodeURIComponent(query) + "&page=" + page + "&limit=25&sfw=true");
            var list = (data.data || []).map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: data.pagination && data.pagination.has_next_page };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        var malId = url;
        var anime = await this.jikan("/anime/" + malId + "/full");
        var info = anime.data;
        var imdbId = await this.getImdbId(malId);

        var genre = [];
        if (info.genres) {
            for (var i = 0; i < info.genres.length; i++) {
                genre.push(info.genres[i].name);
            }
        }
        var status = info.status === "Currently Airing" ? 0 : info.status === "Finished Airing" ? 1 : 5;
        var author = (info.studios && info.studios.length > 0) ? info.studios[0].name : "";
        var description = (info.synopsis || "") + "\n\nScore: " + (info.score || "?") + " | Episodes: " + (info.episodes || "?");

        var epData = await this.jikan("/anime/" + malId + "/episodes");
        var epList = epData.data || [];
        var totalEps = info.episodes || epList.length;

        var episodes = [];
        if (epList.length > 0) {
            for (var j = 0; j < epList.length; j++) {
                var ep = epList[j];
                episodes.push({
                    name: "Episode " + ep.mal_id + (ep.title ? " - " + ep.title : ""),
                    url: JSON.stringify({ malId: malId, imdbId: imdbId, ep: ep.mal_id })
                });
            }
        } else {
            for (var k = 1; k <= totalEps; k++) {
                episodes.push({
                    name: "Episode " + k,
                    url: JSON.stringify({ malId: malId, imdbId: imdbId, ep: k })
                });
            }
        }

        return {
            name: info.title_english || info.title || "Unknown",
            imageUrl: (info.images && info.images.jpg) ? info.images.jpg.large_image_url : "",
            description: description,
            genre: genre,
            status: status,
            author: author,
            episodes: episodes
        };
    }

    async getVideoList(url) {
        var parsed = JSON.parse(url);
        var imdbId = parsed.imdbId;
        var ep = parsed.ep;
        var videos = [];

        if (imdbId) {
            videos.push({
                url: "https://vidsrc.me/embed/tv?imdb=" + imdbId + "&season=1&episode=" + ep,
                quality: "VidSrc",
                originalUrl: "https://vidsrc.me/embed/tv?imdb=" + imdbId + "&season=1&episode=" + ep
            });
            videos.push({
                url: "https://vidsrc.net/embed/tv?imdb=" + imdbId + "&season=1&episode=" + ep,
                quality: "VidSrc.net",
                originalUrl: "https://vidsrc.net/embed/tv?imdb=" + imdbId + "&season=1&episode=" + ep
            });
        }
        videos.push({
            url: "https://vidsrc.me/embed/tv?mal=" + parsed.malId + "&episode=" + ep,
            quality: "VidSrc (MAL)",
            originalUrl: "https://vidsrc.me/embed/tv?mal=" + parsed.malId + "&episode=" + ep
        });

        return videos;
    }

    getFilterList() {
        throw new Error("getFilterList not implemented");
    }

    getSourcePreferences() {
        throw new Error("getSourcePreferences not implemented");
    }
}
