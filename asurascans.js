const mangayomiSources = [{
    "id": 524070078,
    "name": "Asura Scans",
    "lang": "en",
    "baseUrl": "https://asuracomic.net",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/icon/en.asurascans.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.4.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "asurascans.js"
}];

class DefaultExtension extends MProvider {
    getHeaders() {
        return {
            "Referer": this.source.baseUrl,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36"
        };
    }

    async getBaseUrl() {
        const pref = new SharedPreferences().get("overrideBaseUrl1");
        return pref && pref.startsWith("http") ? pref : this.source.baseUrl;
    }

    // Extract title from URL slug like "trash-of-the-counts-family-030ff47a"
    slugToTitle(slug) {
        return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }

    // Parse manga list from HTML using regex
    parseMangaList(body, baseUrl) {
        const list = [];
        const seen = {};
        
        // Match pattern: <a href="/comics/title-hash"><img src="..."...>...</a>
        const cardRegex = /<a href="(\/comics\/[^"]+)">[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/g;
        let match;
        
        while ((match = cardRegex.exec(body)) !== null) {
            const link = match[1];
            const image = match[2];
            const name = match[3].trim();
            
            if (!seen[link]) {
                seen[link] = true;
                list.push({ name, imageUrl: image, link });
            }
        }
        
        // If above didn't work, try simpler pattern
        if (list.length === 0) {
            const simpleRegex = /<a href="(\/comics\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/g;
            while ((match = simpleRegex.exec(body)) !== null) {
                const link = match[1];
                const image = match[2];
                const name = match[3].trim();
                
                if (!seen[link]) {
                    seen[link] = true;
                    list.push({ name, imageUrl: image, link });
                }
            }
        }
        
        // Check for pagination
        const hasNext = /href="[^"]*\?page=\d+"[^>]*>\s*Next/i.test(body) || 
                       /<a[^>]*class="[^"]*next[^"]*"[^>]*>/i.test(body);
        
        return { list, hasNextPage: hasNext };
    }

    async getPopular(page) {
        try {
            const baseUrl = await this.getBaseUrl();
            const url = `${baseUrl}/series?name=&status=-1&types=-1&order=rating&page=${page}`;
            const res = await new Client().get(url, this.getHeaders());
            return this.parseMangaList(res.body, baseUrl);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        try {
            const baseUrl = await this.getBaseUrl();
            const url = `${baseUrl}/series?genres=&status=-1&types=-1&order=update&page=${page}`;
            const res = await new Client().get(url, this.getHeaders());
            return this.parseMangaList(res.body, baseUrl);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            const baseUrl = await this.getBaseUrl();
            const url = `${baseUrl}/series?name=${encodeURIComponent(query)}&page=${page}`;
            const res = await new Client().get(url, this.getHeaders());
            return this.parseMangaList(res.body, baseUrl);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    parseDetail(body, baseUrl) {
        let imageUrl = "";
        let description = "";
        const genre = [];
        const chapters = [];
        
        // Cover image
        const coverMatch = body.match(/<img[^>]+alt=["']poster["'][^>]+src="([^"]+)"/i);
        if (!coverMatch) {
            const posterImg = body.match(/<img[^>]+src="(https:\/\/cdn\.asurascans\.com[^"]+poster[^"]+)"/i);
            if (posterImg) imageUrl = posterImg[1];
        } else {
            imageUrl = coverMatch[1];
        }
        
        // Description
        const descMatch = body.match(/<span[^>]+class=["'][^"]*font-medium[^"]*text-sm["'][^>]*>([^<]+)<\/span>/i);
        if (descMatch) description = descMatch[1].trim();
        
        // Genres
        const genreMatches = body.matchAll(/<a[^>]+href=["'][^"]*browse\?genres=([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
        for (const m of genreMatches) {
            genre.push(m[2].trim());
        }
        
        // Chapters - find chapter links
        const chapRegex = /<a[^>]+href="(\/comics\/[^/]+\/chapter\/[^"]+)"[^>]*>\s*<div[^>]*>\s*([^<]+)/g;
        let chapMatch;
        while ((chapMatch = chapRegex.exec(body)) !== null) {
            const url = chapMatch[1].startsWith("http") ? chapMatch[1].replace(baseUrl, "") : chapMatch[1];
            const name = chapMatch[2].trim();
            if (name && url.includes("/chapter/")) {
                chapters.push({ name, url, dateUpload: String(Date.now()) });
            }
        }
        
        // Fallback: any chapter link
        if (chapters.length === 0) {
            const anyChap = body.matchAll(/href="(\/comics\/[^/]+\/chapter\/[^"]+)"/g);
            for (const m of anyChap) {
                const url = m[1].startsWith("http") ? m[1].replace(baseUrl, "") : m[1];
                const name = url.split("/").pop().replace(/-/g, " ");
                if (url.includes("/chapter/") && chapters.length < 500) {
                    chapters.push({ name, url, dateUpload: String(Date.now()) });
                }
            }
        }
        
        return { imageUrl, description, genre, chapters };
    }

    async getDetail(url) {
        try {
            const baseUrl = await this.getBaseUrl();
            const fullUrl = url.startsWith("http") ? url : baseUrl + "/" + url;
            const res = await new Client().get(fullUrl, this.getHeaders());
            const parsed = this.parseDetail(res.body, baseUrl);
            
            return {
                imageUrl: parsed.imageUrl,
                description: parsed.description,
                genre: parsed.genre,
                author: "",
                artist: "",
                status: 0,
                chapters: parsed.chapters.reverse()
            };
        } catch (e) {
            return { name: "Error", imageUrl: "", description: String(e), author: "", artist: "", genre: [], status: 5, chapters: [] };
        }
    }

    async getPageList(url) {
        try {
            const baseUrl = await this.getBaseUrl();
            const fullUrl = url.startsWith("http") ? url : baseUrl + "/" + url;
            const res = await new Client().get(fullUrl, this.getHeaders());
            
            const pages = [];
            
            // Look for image sources in various patterns
            const patterns = [
                /data-src="(https:\/\/cdn\.asurascans\.com\/data\/[^"]+)"/g,
                /src="(https:\/\/cdn\.asurascans\.com\/data\/[^"]+)"/g,
                /"url"\s*:\s*"([^"]+\.(jpg|png|webp)[^"]*)"/g
            ];
            
            for (const pattern of patterns) {
                const matches = res.body.matchAll(pattern);
                for (const m of matches) {
                    const src = m[1];
                    if (src && !src.includes("preview") && pages.indexOf(src) === -1) {
                        pages.push(src);
                    }
                }
            }
            
            return pages;
        } catch (e) {
            return [];
        }
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [{
            key: "overrideBaseUrl1",
            editTextPreference: {
                title: "Override BaseUrl",
                summary: "For mirror sites",
                value: "",
                dialogTitle: "Override BaseUrl",
                dialogMessage: ""
            }
        }];
    }
}