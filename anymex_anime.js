const mangayomiSources = [{
    "name": "AnymeX Anime",
    "lang": "en",
    "baseUrl": "https://api.themoviedb.org",
    "apiUrl": "https://api.themoviedb.org/3",
    "iconUrl": "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "multi",
    "itemType": 1,
    "version": "0.0.1",
    "pkgPath": "anymex_anime.js"
}];

class DefaultExtension extends MProvider {

    constructor() {
        super();
        this.client = new Client();
        this.tmdbKey = "ad301b7cc82ffe19273e55e4d4206885";
        this.tmdbBase = "https://api.themoviedb.org/3";
        this.imgBase = "https://image.tmdb.org/t/p/w500";
        this.streamBase = "https://himer365ery.com";
        this.streamHost = "https://jarvi366dow.com";
    }

    getStreamHeaders() {
        return {
            "Referer": "https://himer365ery.com/",
            "Origin": "https://himer365ery.com"
        };
    }

    mapItem(e, type) {
        var poster = e.poster_path || e.backdrop_path;
        return {
            name: e.title || e.name || "Unknown",
            link: JSON.stringify({ tmdbId: e.id, type: type }),
            imageUrl: poster ? (this.imgBase + poster) : "",
            description: e.overview || ""
        };
    }

    async tmdbGet(path) {
        var sep = path.indexOf("?") >= 0 ? "&" : "?";
        var resp = await this.client.get(this.tmdbBase + path + sep + "api_key=" + this.tmdbKey + "&language=en-US");
        return JSON.parse(resp.body);
    }

    async getPopular(page) {
        try {
            var data = await this.tmdbGet("/discover/tv?sort_by=popularity.desc&with_genres=16&with_original_language=ja&page=" + page);
            var list = (data.results || []).map(function(e) {
                return {
                    name: e.name || "Unknown",
                    link: JSON.stringify({ tmdbId: e.id, type: "tv" }),
                    imageUrl: e.poster_path ? ("https://image.tmdb.org/t/p/w500" + e.poster_path) : "",
                    description: e.overview || ""
                };
            });
            return {
                list: list,
                hasNextPage: page < (data.total_pages || 1)
            };
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
            var list = (data.results || []).map(function(e) {
                return {
                    name: e.name || "Unknown",
                    link: JSON.stringify({ tmdbId: e.id, type: "tv" }),
                    imageUrl: e.poster_path ? ("https://image.tmdb.org/t/p/w500" + e.poster_path) : "",
                    description: e.overview || ""
                };
            });
            return {
                list: list,
                hasNextPage: page < (data.total_pages || 1)
            };
        } catch (e) {
            console.error("getLatestUpdates error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            var tvData = await this.tmdbGet("/search/tv?query=" + encodeURIComponent(query) + "&page=" + page + "&include_adult=false");
            var movieData = await this.tmdbGet("/search/movie?query=" + encodeURIComponent(query) + "&page=" + page + "&include_adult=false");

            var tvResults = (tvData.results || []).filter(function(e) {
                return e.original_language === "ja";
            }).map(function(e) {
                return {
                    name: e.name || "Unknown",
                    link: JSON.stringify({ tmdbId: e.id, type: "tv" }),
                    imageUrl: e.poster_path ? ("https://image.tmdb.org/t/p/w500" + e.poster_path) : "",
                    description: e.overview || ""
                };
            });

            var movieResults = (movieData.results || []).filter(function(e) {
                return e.original_language === "ja";
            }).map(function(e) {
                return {
                    name: e.title || "Unknown",
                    link: JSON.stringify({ tmdbId: e.id, type: "movie" }),
                    imageUrl: e.poster_path ? ("https://image.tmdb.org/t/p/w500" + e.poster_path) : "",
                    description: e.overview || ""
                };
            });

            var maxLen = Math.max(tvResults.length, movieResults.length);
            var mixed = [];
            for (var i = 0; i < maxLen; i++) {
                if (i < tvResults.length) mixed.push(tvResults[i]);
                if (i < movieResults.length) mixed.push(movieResults[i]);
            }

            var hasNext = page < Math.max(tvData.total_pages || 1, movieData.total_pages || 1);
            return { list: mixed, hasNextPage: hasNext };
        } catch (e) {
            console.error("search error: " + e);
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        try {
            var parsed = JSON.parse(url);
            var tmdbId = parsed.tmdbId;
            var type = parsed.type;
            var isMovie = type === "movie";
            var endpoint = isMovie ? "/movie/" : "/tv/";

            var data = await this.tmdbGet(endpoint + tmdbId + "?append_to_response=external_ids");
            var imdbId = data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || null;

            var name = data.title || data.name || "Unknown";
            var chapters = [];

            if (isMovie) {
                chapters.push({
                    name: "Movie",
                    url: JSON.stringify({
                        tmdbId: tmdbId,
                        type: "movie",
                        imdbId: imdbId
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
                                tmdbId: tmdbId,
                                type: "tv",
                                imdbId: imdbId,
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
                imageUrl: data.poster_path ? ("https://image.tmdb.org/t/p/w500" + data.poster_path) : "",
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
            var season = parsed.season;
            var episode = parsed.episode;
            var isMovie = parsed.type === "movie";

            if (!imdbId) {
                console.warn("No IMDB ID available for this title");
                return [];
            }

            var playUrl = this.streamBase + "/play/" + imdbId;
            var resp = await this.client.get(playUrl, this.getStreamHeaders());
            var html = resp.body;

            var fileMatch = html.match(/"file":"([^"]+)"/);
            if (!fileMatch) {
                console.warn("Could not extract file URL from stream page");
                return [];
            }

            var fileUrl = fileMatch[1].replace(/\\\//g, "/");
            var decodedFileUrl = decodeURIComponent(fileUrl);

            var keyMatch = html.match(/"key":"([^"]+)"/);
            if (!keyMatch) {
                console.warn("Could not extract key from stream page");
                return [];
            }
            var key = keyMatch[1];

            var finalUrl = decodedFileUrl.indexOf("https") >= 0
                ? decodedFileUrl
                : this.streamHost + decodedFileUrl;

            var headers = {
                "Referer": "https://himer365ery.com/",
                "Origin": "https://himer365ery.com",
                "X-CSRF-TOKEN": key
            };

            var playerResp = await this.client.get(finalUrl, headers);
            var playerData = JSON.parse(playerResp.body);

            var videoList = [];
            var streamHost = this.streamHost;

            if (isMovie) {
                for (var i = 0; i < playerData.length; i++) {
                    var src = playerData[i];
                    if (src.file && src.title) {
                        var playlistUrl = streamHost + "/playlist/" + src.file.replace(/~/g, "") + ".txt";
                        try {
                            var streamResp = await this.client.get(playlistUrl, headers);
                            videoList.push({
                                url: streamResp.body,
                                quality: src.title,
                                originalUrl: streamResp.body,
                                subtitles: [],
                                headers: {
                                    "Referer": "https://himer365ery.com/",
                                    "Origin": "https://himer365ery.com"
                                }
                            });
                        } catch (err) {
                            console.error("Stream fetch error: " + err);
                        }
                    }
                }
            } else {
                if (!season || !episode) {
                    console.warn("Season/episode required for TV");
                    return [];
                }

                var seasonBlock = null;
                for (var si = 0; si < playerData.length; si++) {
                    if (playerData[si].id == season) {
                        seasonBlock = playerData[si];
                        break;
                    }
                }
                if (!seasonBlock || !Array.isArray(seasonBlock.folder)) {
                    console.warn("Season block not found for season " + season);
                    return [];
                }

                var episodeBlock = null;
                for (var ei = 0; ei < seasonBlock.folder.length; ei++) {
                    if (seasonBlock.folder[ei].episode == episode) {
                        episodeBlock = seasonBlock.folder[ei];
                        break;
                    }
                }
                if (!episodeBlock || !Array.isArray(episodeBlock.folder)) {
                    console.warn("Episode block not found for episode " + episode);
                    return [];
                }

                for (var vi = 0; vi < episodeBlock.folder.length; vi++) {
                    var vsrc = episodeBlock.folder[vi];
                    if (vsrc.file && vsrc.title) {
                        var strippedUri = decodeURIComponent(vsrc.file.replace(/~/g, ""));
                        var vPlaylistUrl = strippedUri.indexOf("playlist") >= 0
                            ? streamHost + "/" + strippedUri
                            : streamHost + "/playlist/" + strippedUri + ".txt";
                        try {
                            var vResp = await this.client.get(vPlaylistUrl, headers);
                            videoList.push({
                                url: vResp.body,
                                quality: vsrc.title,
                                originalUrl: vResp.body,
                                subtitles: [],
                                headers: {
                                    "Referer": "https://himer365ery.com/",
                                    "Origin": "https://himer365ery.com"
                                }
                            });
                        } catch (verr) {
                            console.error("Stream fetch error: " + verr);
                        }
                    }
                }

                // Dub-first: sort so dub entries appear first
                videoList.sort(function(a, b) {
                    var aIsDub = a.quality && a.quality.toLowerCase().indexOf("dub") >= 0 ? 0 : 1;
                    var bIsDub = b.quality && b.quality.toLowerCase().indexOf("dub") >= 0 ? 0 : 1;
                    return aIsDub - bIsDub;
                });
            }

            return videoList;
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
