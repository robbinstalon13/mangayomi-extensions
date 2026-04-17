const mangayomiSources = [{
    "name": "AnymeX Anime",
    "lang": "en",
    "baseUrl": "https://allmanga.to",
    "apiUrl": "https://api.allanime.day/api",
    "iconUrl": "https://raw.githubusercontent.com/RyanYuuki/AnymeX/main/assets/images/logo.png",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": false,
    "version": "0.0.4",
    "pkgPath": "anymex_anime.js"
}];

class DefaultExtension extends MProvider {
    async request(body) {
        const apiUrl = "https://api.allanime.day/api";
        const baseUrl = "https://allmanga.to";
        return (await new Client().get(apiUrl + body, { "Referer": baseUrl })).body;
    }

    async getPopular(page) {
        const encodedGql = `?variables=%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%22type%22:%20%22anime%22,%0A%20%20%20%20%20%20%20%20%20%20%22size%22:%2026,%0A%20%20%20%20%20%20%20%20%20%20%22dateRange%22:%201,%0A%20%20%20%20%20%20%20%20%20%20%22page%22:%20${page}%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20&query=%0A%20%20%20%20%20%20%20%20query($type:%20VaildPopularTypeEnumType!,%20$size:%20Int!,%20$dateRange:%20Int,%20$page:%20Int)%20%7B%0A%20%20%20%20%20%20%20%20%20%20queryPopular(type:%20$type,%20size:%20$size,%20dateRange:%20$dateRange,%20page:%20$page)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20recommendations%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20anyCard%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20_id%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20name%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20englishName%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20nativeName%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20thumbnail%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20slugTime%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20`;
        const resList = JSON.parse(await this.request(encodedGql)).data.queryPopular.recommendations.filter(e => e.anyCard !== null);
        const list = [];
        for (const anime of resList) {
            const name = anime.anyCard.englishName || anime.anyCard.name;
            const imageUrl = anime.anyCard.thumbnail;
            const link = `/bangumi/${anime.anyCard._id}/${anime.anyCard.name.replace(/[^a-zA-Z0-9]/g, "-").replace(/-{2,}/g, "-").toLowerCase()}`;
            list.push({ name, imageUrl, link });
        }
        return { list, hasNextPage: list.length === 26 };
    }

    get supportsLatest() {
        return true;
    }

    async getLatestUpdates(page) {
        return await this.search("", page, []);
    }

    async search(query, page, filters) {
        query = query.replace(" ", "%20");
        const encodedGql = `?variables=%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%22search%22:%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%22query%22:%20%22${query}%22,%0A%20%20%20%20%20%20%20%20%20%20%20%20%22allowAdult%22:%20false,%0A%20%20%20%20%20%20%20%20%20%20%20%20%22allowUnknown%22:%20false%0A%20%20%20%20%20%20%20%20%20%20%7D,%0A%20%20%20%20%20%20%20%20%20%20%22countryOrigin%22:%20%22ALL%22,%0A%20%20%20%20%20%20%20%20%20%20%22limit%22:%2026,%0A%20%20%20%20%20%20%20%20%20%20%22page%22:%20${page}%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20&query=%0A%20%20%20%20%20%20%20%20query($search:%20SearchInput,%20$limit:%20Int,%20$countryOrigin:%20VaildCountryOriginEnumType,%20$page:%20Int)%20%7B%0A%20%20%20%20%20%20%20%20%20%20shows(search:%20$search,%20limit:%20$limit,%20countryOrigin:%20$countryOrigin,%20page:%20$page)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20edges%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20_id%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20name%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20nativeName%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20englishName%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20thumbnail%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20slugTime%0A%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20`;
        const resList = JSON.parse(await this.request(encodedGql)).data.shows.edges;
        const list = [];
        for (const anime of resList) {
            const name = anime.englishName || anime.name;
            const imageUrl = anime.thumbnail;
            const link = `/bangumi/${anime._id}/${anime.name.replace(/[^a-zA-Z0-9]/g, "-").replace(/-{2,}/g, "-").toLowerCase()}`;
            list.push({ name, imageUrl, link });
        }
        return { list, hasNextPage: list.length === 26 };
    }

    async getDetail(url) {
        const id = url.substringAfter('bangumi/').substringBefore('/');
        const encodedGql = `?variables=%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%22id%22:%20%22${id}%22%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20&query=%0A%20%20%20%20%20%20%20%20query($id:%20String!)%20%7B%0A%20%20%20%20%20%20%20%20%20%20show(_id:%20$id)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20thumbnail%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20description%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20type%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20season%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20score%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20genres%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20status%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20studios%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20availableEpisodesDetail%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20`;
        const show = JSON.parse(await this.request(encodedGql)).data.show;
        const genre = show.genres || [];
        const status = this.parseStatus(show.status);
        const author = show.studios.length > 0 ? show.studios[0] : "";
        let description = "";
        description = description.concat(show.description, "\n\n", `Type: ${show.type || "Unknown"}`, `\nAired: ${show.season && show.season.quarter ? show.season.quarter : "-"} ${show.season && show.season.year ? show.season.year : "-"}`, `\nScore: ${show.score || "-"}★`);

        let episodesSub = [];
        for (const episode of show.availableEpisodesDetail.sub) {
            const num = parseInt(episode) || 1;
            const name = `Episode ${num}`;
            const url = JSON.stringify({ showId: id, translationType: ["sub"], episodeString: episode });
            episodesSub.push({ num, name, url, scanlator: "sub" });
        }
        let episodesDub = [];
        for (const episode of show.availableEpisodesDetail.dub) {
            const num = parseInt(episode) || 1;
            const name = `Episode ${num}`;
            const url = JSON.stringify({ showId: id, translationType: ["dub"], episodeString: episode });
            episodesDub.push({ num, name, url, scanlator: "dub" });
        }

        let episodes = [];
        if (episodesSub.length > 0) {
            episodes = episodesSub.map(ep => {
                const f = episodesDub.filter(e => e.num === ep.num);
                if (f.length > 0) {
                    const u = JSON.parse(ep.url);
                    return { name: ep.name, url: JSON.stringify({ showId: u.showId, translationType: ['sub', 'dub'], episodeString: u.episodeString }), scanlator: "sub, dub" };
                }
                return ep;
            });
        } else {
            episodes = episodesDub;
        }
        return { description, author, status, genre, episodes };
    }

    parseStatus(string) {
        switch (string) {
            case "Releasing": return 0;
            case "Finished": return 1;
            case "Not Yet Released": return 0;
            default: return 5;
        }
    }

    isValidUrl(url) {
        return /^(https?:\/\/)[^\s]+$/.test(url);
    }

    async getVideoList(url) {
        const baseUrl = "https://allmanga.to";
        const ep = JSON.parse(url);
        const translationTypes = ep.translationType;
        const videos = [];

        for (const translationType of translationTypes) {
            const encodedGql = `?variables=%0A%20%20%20%20%20%20%20%20%7B%0A%20%20%20%20%20%20%20%20%20%20%22showId%22:%20%22${ep.showId}%22,%0A%20%20%20%20%20%20%20%20%20%20%22episodeString%22:%20%22${ep.episodeString}%22,%0A%20%20%20%20%20%20%20%20%20%20%22translationType%22:%20%22${translationType}%22%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20&query=%0A%20%20%20%20%20%20%20%20query(%0A%20%20%20%20%20%20%20%20%20%20$showId:%20String!%0A%20%20%20%20%20%20%20%20%20%20$episodeString:%20String!%0A%20%20%20%20%20%20%20%20%20%20$translationType:%20VaildTranslationTypeEnumType!%0A%20%20%20%20%20%20%20%20)%20%7B%0A%20%20%20%20%20%20%20%20%20%20episode(%0A%20%20%20%20%20%20%20%20%20%20%20%20showId:%20$showId%0A%20%20%20%20%20%20%20%20%20%20%20%20episodeString:%20$episodeString%0A%20%20%20%20%20%20%20%20%20%20%20%20translationType:%20$translationType%0A%20%20%20%20%20%20%20%20%20%20)%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20sourceUrls%0A%20%20%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20%20%20`;
            try {
                const videoJson = JSON.parse(await this.request(encodedGql));
                for (const video of videoJson.data.episode.sourceUrls) {
                    const videoUrl = this.decryptSource(video.sourceUrl).trim();
                    if (!this.isValidUrl(videoUrl)) continue;
                    try {
                        if (videoUrl.includes("/apivtwo/")) {
                            const quality = `${translationType} - internal ${video.sourceName}`;
                            const vids = await new AllAnimeExtractor({ "Referer": baseUrl }, "https://allanime.to").videoFromUrl(videoUrl, quality);
                            for (const vid of vids) videos.push(vid);
                        } else if (["vidstreaming", "https://gogo", "playgo1.cc", "playtaku", "vidcloud"].some(e => videoUrl.includes(e))) {
                            const vids = await gogoCdnExtractor(videoUrl);
                            for (const vid of vids) videos.push(vid);
                        } else if (["dood", "d0"].some(e => videoUrl.includes(e))) {
                            const vids = await doodExtractor(videoUrl);
                            for (const vid of vids) videos.push(vid);
                        } else if (["ok.ru", "okru"].some(e => videoUrl.includes(e))) {
                            const vids = await okruExtractor(videoUrl);
                            for (const vid of vids) videos.push(vid);
                        } else if (videoUrl.includes("mp4upload.com")) {
                            const vids = await mp4UploadExtractor(videoUrl);
                            for (const vid of vids) videos.push(vid);
                        } else if (["filemoon", "moonplayer"].some(e => videoUrl.includes(e))) {
                            const vids = await filemoonExtractor(videoUrl);
                            for (const vid of vids) videos.push(vid);
                        } else if (videoUrl.includes("wish")) {
                            const vids = await streamWishExtractor(videoUrl, `${translationType} - StreamWish`);
                            for (const vid of vids) videos.push(vid);
                        }
                    } catch (e) {}
                }
            } catch (e) {}
        }

        // dub first
        videos.sort((a, b) => {
            const aIsDub = a.quality && a.quality.toLowerCase().includes("dub") ? 0 : 1;
            const bIsDub = b.quality && b.quality.toLowerCase().includes("dub") ? 0 : 1;
            return aIsDub - bIsDub;
        });
        return videos;
    }

    decryptSource(str) {
        if (str.startsWith("-")) {
            return str.substring(str.lastIndexOf('-') + 1)
                .match(/.{1,2}/g)
                .map(hex => parseInt(hex, 16))
                .map(byte => String.fromCharCode(byte ^ 56))
                .join("");
        }
        return str;
    }

    getSourcePreferences() {
        return [
            {
                "key": "preferred_sub",
                "listPreference": {
                    "title": "Prefer subs or dubs?",
                    "summary": "",
                    "valueIndex": 1,
                    "entries": ["Subs", "Dubs"],
                    "entryValues": ["sub", "dub"]
                }
            }
        ];
    }

    getFilterList() {
        throw new Error("getFilterList not implemented");
    }
}

class AllAnimeExtractor {
    constructor(headers, baseUrl) {
        this.headers = headers;
        this.baseUrl = baseUrl;
    }

    bytesIntoHumanReadable(bytes) {
        const kilobyte = 1000;
        const megabyte = kilobyte * 1000;
        const gigabyte = megabyte * 1000;
        const terabyte = gigabyte * 1000;
        if (bytes >= 0 && bytes < kilobyte) return `${bytes} b/s`;
        else if (bytes >= kilobyte && bytes < megabyte) return `${Math.floor(bytes / kilobyte)} kb/s`;
        else if (bytes >= megabyte && bytes < gigabyte) return `${Math.floor(bytes / megabyte)} mb/s`;
        else if (bytes >= gigabyte && bytes < terabyte) return `${Math.floor(bytes / gigabyte)} gb/s`;
        else if (bytes >= terabyte) return `${Math.floor(bytes / terabyte)} tb/s`;
        else return `${bytes} bits/s`;
    }

    async videoFromUrl(url, name) {
        const videoList = [];
        const endPointResponse = JSON.parse((await new Client().get(`${this.baseUrl}/getVersion`, this.headers)).body);
        const endPoint = endPointResponse.episodeIframeHead;
        const resp = await new Client().get(endPoint + url.replace("/clock?", "/clock.json?"), this.headers);
        if (resp.statusCode !== 200) return [];
        const linkJson = JSON.parse(resp.body);
        for (const link of linkJson.links) {
            try {
                const subtitles = [];
                if (link.subtitles && link.subtitles.length > 0) {
                    subtitles.push(...link.subtitles.map(sub => {
                        const label = sub.label ? ` - ${sub.label}` : '';
                        return { file: sub.src, label: `${sub.lang}${label}` };
                    }));
                }
                if (link.mp4) {
                    videoList.push({ url: link.link, quality: `Original (${name} - ${link.resolutionStr})`, originalUrl: link.link, subtitles });
                } else if (link.hls) {
                    const headers = {
                        'Host': link.link.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/)[1],
                        'Origin': endPoint,
                        'Referer': `${endPoint}/`
                    };
                    const resp = await new Client().get(link.link, headers);
                    if (resp.statusCode === 200) {
                        const masterPlaylist = resp.body;
                        const audios = [];
                        if (masterPlaylist.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
                            const audioInfo = masterPlaylist.substringAfter('#EXT-X-MEDIA:TYPE=AUDIO').substringBefore('\n');
                            const language = audioInfo.substringAfter('NAME="').substringBefore('"');
                            const url = audioInfo.substringAfter('URI="').substringBefore('"');
                            audios.push({ file: url, label: language });
                        }
                        if (!masterPlaylist.includes('#EXT-X-STREAM-INF:')) {
                            videoList.push({ url: link.link, quality: `${name} - ${link.resolutionStr}`, originalUrl: link.link, subtitles, headers });
                        } else {
                            masterPlaylist.substringAfter('#EXT-X-STREAM-INF:').split('#EXT-X-STREAM-INF:').forEach(it => {
                                let bandwidth = '';
                                if (it.includes('AVERAGE-BANDWIDTH')) {
                                    bandwidth = ` ${this.bytesIntoHumanReadable(it.substringAfter('AVERAGE-BANDWIDTH=').substringBefore(','))}`;
                                }
                                const quality = `${it.substringAfter('RESOLUTION=').substringAfter('x').substringBefore(',')}p${bandwidth} (${name} - ${link.resolutionStr})`;
                                let videoUrl = it.substringAfter('\n').substringBefore('\n');
                                if (!videoUrl.startsWith('http')) {
                                    videoUrl = resp.request.url.substringBeforeLast('/') + `/${videoUrl}`;
                                }
                                const hdrs = {
                                    'Host': videoUrl.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/)[1],
                                    'Origin': endPoint,
                                    'Referer': `${endPoint}/`
                                };
                                if (audios.length === 0) {
                                    videoList.push({ url: videoUrl, quality, originalUrl: videoUrl, subtitles, headers: hdrs });
                                } else {
                                    videoList.push({ url: videoUrl, quality, originalUrl: videoUrl, subtitles, audios, headers: hdrs });
                                }
                            });
                        }
                    }
                } else if (link.crIframe) {
                    for (const stream of link.portData.streams) {
                        if (stream.format === 'adaptive_hls') {
                            const resp = await new Client().get(stream.url, { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0' });
                            if (resp.statusCode === 200) {
                                resp.body.substringAfter('#EXT-X-STREAM-INF:').split('#EXT-X-STREAM-INF:').forEach(t => {
                                    const quality = `${t.substringAfter('RESOLUTION=').substringAfter('x').substringBefore(',')}p (AC - HLS${stream.hardsub_lang.length === 0 ? '' : ` - Hardsub: ${stream.hardsub_lang}`})`;
                                    const videoUrl = t.substringAfter('\n').substringBefore('\n');
                                    videoList.push({ url: videoUrl, quality, originalUrl: videoUrl, subtitles });
                                });
                            }
                        }
                    }
                } else if (link.dash) {
                    const audios = link.rawUrls && link.rawUrls.audios ? link.rawUrls.audios.map(it => ({ file: it.url, label: this.bytesIntoHumanReadable(it.bandwidth) })) : [];
                    const videos = link.rawUrls && link.rawUrls.vids ? link.rawUrls.vids.map(it => ({
                        url: it.url, quality: `${name} - ${it.height} ${this.bytesIntoHumanReadable(it.bandwidth)}`, originalUrl: it.url, audios, subtitles
                    })) : [];
                    if (videos.length > 0) videoList.push(...videos);
                }
            } catch (_) {}
        }
        return videoList;
    }
}
