const mangayomiSources = [{
    "name": "AnymeX Anime",
    "lang": "en",
    "baseUrl": "https://api.2embed.cc",
    "apiUrl": "https://api.2embed.cc",
    "iconUrl": "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "multi",
    "itemType": 1,
    "version": "0.0.2",
    "pkgPath": "anymex_anime.js"
}];

class DefaultExtension extends MProvider {

    constructor() {
        super();
        this.client = new Client();
        this.apiBase = "https://api.2embed.cc";
        this.tmdbKey = "ad301b7cc82ffe19273e55e4d4206885";
        this.tmdbBase = "https://api.themoviedb.org/3";
        this.imgBase = "https://image.tmdb.org/t/p/w500";
        this.embedBase = "https://www.2embed.cc";
    }

    async apiGet(url) {
        var resp = await this.client.get(url);
        return JSON.parse(resp.body);
    }

    async tmdbGet(path) {
        var sep = path.indexOf("?") >= 0 ? "&" : "?";
        var resp = await this.client.get(this.tmdbBase + path + sep + "api_key=" + this.tmdbKey + "&language=en-US");
        return JSON.parse(resp.body);
    }

    mapTmdbItem(e, type) {
        return {
            name: e.name || e.title || "Unknown",
            link: JSON.stringify({ tmdbId: e.id, type: type }),
            imageUrl: e.poster_path ? (this.imgBase + e.poster_path) : "",
            description: e.overview || ""
        };
    }

    async getPopular(page) {
        try {
            var data = await this.tmdbGet("/discover/tv?sort_by=popularity.desc&with_genres=16&with_original_language=ja&page=" + page);
            var self = this;
            var list = (data.results || []).map(function(e) {
                return self.mapTmdbItem(e, "tv");
            });
            return { list: list, hasNextPage: page < (data.total_pages || 1) };
        } catch (e) {
            console.error("getPopular error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    get supportsLatest() {
        return true;
    }

    async getLatestUpdates(page) {
        try {
            var data = await this.tmdbGet("/discover/tv?sort_by=first_air_date.desc&with_genres=16&with_original_language=ja&page=" + page);
            var self = this;
            var list = (data.results || []).map(function(e) {
                return self.mapTmdbItem(e, "tv");
            });
            return { list: list, hasNextPage: page < (data.total_pages || 1) };
        } catch (e) {
            console.error("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            var tvUrl = this.apiBase + "/searchtv?q=" + encodeURIComponent(query) + "&page=" + page;
            var tvData = await this.apiGet(tvUrl);

            var list = (tvData.results || []).map(function(e) {
                return {
                    name: e.name || "Unknown",
                    link: JSON.stringify({
                        tmdbId: e.tmdb_id,
                        imdbId: e.imdb_id,
                        type: "tv"
                    }),
                    imageUrl: e.poster || "",
                    description: e.overview || ""
                };
            });

            return {
                list: list,
                hasNextPage: page < (tvData.total_pages || 1)
            };
        } catch (e) {
            console.error("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        try {
            var parsed = JSON.parse(url);
            var tmdbId = parsed.tmdbId;
            var imdbId = parsed.imdbId;
            var type = parsed.type || "tv";
            var isMovie = type === "movie";

            var data;
            if (imdbId) {
                var endpoint = isMovie ? "/movie?imdb_id=" : "/tv?imdb_id=";
                data = await this.apiGet(this.apiBase + endpoint + imdbId);
            } else {
                var tmdbEndpoint = isMovie ? "/movie/" : "/tv/";
                var tmdbData = await this.tmdbGet(tmdbEndpoint + tmdbId + "?append_to_response=external_ids");
                imdbId = tmdbData.imdb_id || (tmdbData.external_ids && tmdbData.external_ids.imdb_id) || null;
                data = { name: tmdbData.title || tmdbData.name, poster: tmdbData.poster_path ? (this.imgBase + tmdbData.poster_path) : "", overview: tmdbData.overview, seasons: tmdbData.seasons, imdb_id: imdbId, tmdb_id: tmdbId };
            }

            var name = data.name || data.title || "Unknown";
            var chapters = [];

            if (isMovie) {
                chapters.push({
                    name: "Movie",
                    url: JSON.stringify({
                        tmdbId: data.tmdb_id || tmdbId,
                        imdbId: data.imdb_id || imdbId,
                        type: "movie"
                    })
                });
            } else {
                var seasons = data.seasons || [];
                for (var s = 0; s < seasons.length; s++) {
                    var season = seasons[s];
                    if (season.season_number === 0) continue;
                    var epCount = season.episode_count || 0;
                    for (var ep = 1; ep <= epCount; ep++) {
                        chapters.push({
                            name: "S" + season.season_number + " E" + ep,
                            url: JSON.stringify({
                                tmdbId: data.tmdb_id || tmdbId,
                                imdbId: data.imdb_id || imdbId,
                                type: "tv",
                                season: season.season_number,
                                episode: ep
                            })
                        });
                    }
                }
                chapters.reverse();
            }

            return {
                name: name,
                imageUrl: data.poster || "",
                description: data.overview || "",
                chapters: chapters
            };
        } catch (e) {
            console.error("getDetail error: " + e);
            throw e;
        }
    }

    async getVideoList(url) {
        try {
            var parsed = JSON.parse(url);
            var imdbId = parsed.imdbId;
            var tmdbId = parsed.tmdbId;
            var season = parsed.season;
            var episode = parsed.episode;
            var isMovie = parsed.type === "movie";

            var embedUrl;
            if (isMovie) {
                embedUrl = imdbId
                    ? (this.embedBase + "/embed/" + imdbId)
                    : (this.embedBase + "/embed/" + tmdbId);
            } else {
                var id = imdbId || tmdbId;
                embedUrl = this.embedBase + "/embedtv/" + id + "&s=" + season + "&e=" + episode;
            }

            return [{
                url: embedUrl,
                quality: "2embed",
                originalUrl: embedUrl,
                subtitles: [],
                headers: {
                    "Referer": "https://www.2embed.cc/",
                    "Origin": "https://www.2embed.cc"
                }
            }];
        } catch (e) {
            console.error("getVideoList error: " + e);
            return [];
        }
    }

    async getPageList(url) {
        throw new Error("getPageList not implemented");
    }

    getFilterList() {
        throw new Error("getFilterList not implemented");
    }

    getSourcePreferences() {
        throw new Error("getSourcePreferences not implemented");
    }
}
