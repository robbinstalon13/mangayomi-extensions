const mangayomiSources = [{
    "name": "AnymeX Anime",
    "lang": "en",
    "baseUrl": "https://api-anime-rouge.vercel.app",
    "apiUrl": "https://api-anime-rouge.vercel.app/aniwatch",
    "iconUrl": "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": false,
    "version": "0.0.6",
    "pkgPath": "anymex_anime.js"
}];

class DefaultExtension extends MProvider {
    async api(path) {
        var resp = await new Client().get("https://api-anime-rouge.vercel.app/aniwatch" + path);
        return JSON.parse(resp.body);
    }

    mapAnime(e) {
        return {
            name: e.name || "Unknown",
            link: e.id,
            imageUrl: e.img || ""
        };
    }

    async getPopular(page) {
        try {
            var data = await this.api("/top-airing?page=" + page);
            var items = data.animes || data.topAiringAnimes || [];
            var list = items.map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: list.length >= 24 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    get supportsLatest() {
        return true;
    }

    async getLatestUpdates(page) {
        try {
            var data = await this.api("/recently-updated?page=" + page);
            var items = data.animes || data.latestEpisodes || [];
            var list = items.map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: list.length >= 24 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            var data = await this.api("/search?keyword=" + encodeURIComponent(query) + "&page=" + page);
            var items = data.animes || [];
            var list = items.map(function(e) { return this.mapAnime(e); }, this);
            return { list: list, hasNextPage: data.hasNextPage || false };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        var animeId = url;
        var data = await this.api("/info?id=" + animeId);
        var info = data.anime || data;

        var genre = info.genres || info.genre || [];
        var description = info.description || info.synopsis || "";
        var status = 5;
        if (info.status) {
            var s = info.status.toLowerCase();
            if (s.includes("airing") || s.includes("ongoing")) status = 0;
            else if (s.includes("finished") || s.includes("completed")) status = 1;
        }

        var epData = await this.api("/episodes/" + animeId);
        var epList = epData.episodes || [];

        var hasDub = info.episodes && info.episodes.dub > 0;

        var episodes = [];
        for (var j = 0; j < epList.length; j++) {
            var ep = epList[j];
            var epId = ep.episodeId || ep.id;
            var epNum = ep.episodeNo || ep.number || (j + 1);
            var epName = ep.name || ep.title || ("Episode " + epNum);
            var payload = JSON.stringify({ animeId: animeId, episodeId: epId, ep: epNum, hasDub: hasDub });
            episodes.push({ name: epName, url: payload });
        }

        return {
            name: (info.name || info.title || "Unknown"),
            imageUrl: info.img || info.poster || "",
            description: description,
            genre: genre,
            status: status,
            episodes: episodes
        };
    }

    async getVideoList(url) {
        var parsed = JSON.parse(url);
        var episodeId = parsed.episodeId;
        var hasDub = parsed.hasDub;
        var videos = [];
        var servers = ["hd-1", "hd-2", "megacloud"];

        for (var s = 0; s < servers.length; s++) {
            var server = servers[s];
            try {
                var subData = await new Client().get(
                    "https://api-anime-rouge.vercel.app/aniwatch/stream?episodeId=" +
                    encodeURIComponent(episodeId) + "&server=" + server + "&category=sub"
                );
                var subJson = JSON.parse(subData.body);
                var sources = subJson.sources || subJson.streamingLink && subJson.streamingLink.sources || [];
                for (var i = 0; i < sources.length; i++) {
                    var src = sources[i];
                    if (src.url) {
                        videos.push({
                            url: src.url,
                            quality: "Sub - " + server + (src.quality ? " " + src.quality : ""),
                            originalUrl: src.url
                        });
                    }
                }
            } catch (e) {}

            if (hasDub) {
                try {
                    var dubData = await new Client().get(
                        "https://api-anime-rouge.vercel.app/aniwatch/stream?episodeId=" +
                        encodeURIComponent(episodeId) + "&server=" + server + "&category=dub"
                    );
                    var dubJson = JSON.parse(dubData.body);
                    var dubSources = dubJson.sources || dubJson.streamingLink && dubJson.streamingLink.sources || [];
                    for (var k = 0; k < dubSources.length; k++) {
                        var dubSrc = dubSources[k];
                        if (dubSrc.url) {
                            videos.push({
                                url: dubSrc.url,
                                quality: "Dub - " + server + (dubSrc.quality ? " " + dubSrc.quality : ""),
                                originalUrl: dubSrc.url
                            });
                        }
                    }
                } catch (e) {}
            }
        }

        return videos;
    }

    getFilterList() {
        throw new Error("getFilterList not implemented");
    }

    getSourcePreferences() {
        throw new Error("getSourcePreferences not implemented");
    }
}
