const mangayomiSources = [{
    "id": 524070078,
    "name": "Asura Scans",
    "lang": "en",
    "baseUrl": "https://asuracomic.net",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/icon/en.asurascans.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.2.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "asurascans.js"
}];

class DefaultExtension extends MProvider {
    getHeaders() {
        return {
            "Referer": this.source.baseUrl + "/",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        };
    }

    async getBaseUrl() {
        const pref = new SharedPreferences().get("overrideBaseUrl1");
        return pref && pref.startsWith("http") ? pref : this.source.baseUrl;
    }

    async mangaListFromPage(path) {
        const baseUrl = await this.getBaseUrl();
        const res = await new Client().get(baseUrl + path, this.getHeaders());
        const doc = new Document(res.body);
        const list = [];
        
        // Try different selectors for manga cards
        const mangaElements = doc.select("a[href*='/comics/']");
        for (const element of mangaElements) {
            const href = element.getHref;
            if (!href || !href.includes("/comics/")) continue;
            
            const name = element.selectFirst("span")?.text || element.selectFirst("h3")?.text || "";
            const img = element.selectFirst("img");
            const imageUrl = img?.getSrc || "";
            
            if (name && href) {
                list.push({ name: name.trim(), imageUrl, link: href });
            }
        }
        
        // Remove duplicates
        const seen = {};
        const uniqueList = list.filter(item => {
            if (seen[item.link]) return false;
            seen[item.link] = true;
            return true;
        });
        
        // Check for next page
        const nextBtn = doc.selectFirst("a:contains('Next')");
        const hasNextPage = !!nextBtn;
        
        return { list: uniqueList, hasNextPage };
    }

    toStatus(status) {
        if (status == "Ongoing") return 0;
        else if (status == "Completed") return 1;
        else if (status == "Hiatus") return 2;
        else if (status == "Dropped") return 3;
        return 5;
    }

    parseDate(dateStr) {
        if (!dateStr) return String(Date.now());
        dateStr = dateStr.toLowerCase();
        
        const months = {
            "january": "01", "february": "02", "march": "03", "april": "04",
            "may": "05", "june": "06", "july": "07", "august": "08",
            "september": "09", "october": "10", "november": "11", "december": "12"
        };
        
        try {
            dateStr = dateStr.replace(/(st|nd|rd|th)/g, "").trim();
            const parts = dateStr.split(" ");
            
            if (months[parts[0]] && parts[2]) {
                parts[0] = months[parts[0]];
                const formatted = `${parts[2]}-${parts[0]}-${parts[1].padStart(2, "0")}`;
                return String(new Date(formatted).getTime());
            }
        } catch (e) {}
        
        return String(Date.now());
    }

    async getPopular(page) {
        try {
            return await this.mangaListFromPage(`/series?name=&status=-1&types=-1&order=rating&page=${page}`);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        try {
            return await this.mangaListFromPage(`/series?genres=&status=-1&types=-1&order=update&page=${page}`);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        try {
            return await this.mangaListFromPage(`/series?name=${encodeURIComponent(query)}&page=${page}`);
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        try {
            const baseUrl = await this.getBaseUrl();
            const fullUrl = url.startsWith("http") ? url : baseUrl + "/" + url;
            const res = await new Client().get(fullUrl, this.getHeaders());
            const doc = new Document(res.body);
            
            const imageUrl = doc.selectFirst("img[alt*='poster']")?.getSrc || "";
            const description = doc.selectFirst("span.font-medium.text-sm")?.text?.trim() || "";
            
            // Get info from labels
            let author = "", artist = "", status = 5, genre = [];
            const infoBlocks = doc.select("div:has(h3:contains('Author'))");
            
            // Try to find info labels
            const allText = doc.selectFirst("body")?.text || "";
            
            // Genres
            const genreBtns = doc.select("button.text-white, a[href*='/browse?genres=']");
            for (const btn of genreBtns) {
                const text = btn.text?.trim();
                if (text && text.length < 30) genre.push(text);
            }
            
            // Chapters - look for chapter links
            const chapters = [];
            const chapterLinks = doc.select("a[href*='/chapter/']");
            let chapCount = 0;
            for (const link of chapterLinks) {
                if (chapCount >= 500) break;
                const href = link.getHref;
                const name = link.text?.trim() || "";
                if (href && href.includes("/chapter/")) {
                    chapters.push({ name, url: href.replace(baseUrl, ""), dateUpload: String(Date.now()) });
                    chapCount++;
                }
            }
            
            return {
                imageUrl,
                description,
                genre,
                author,
                artist,
                status,
                chapters: chapters.reverse()
            };
        } catch (e) {
            return { name: "Error", imageUrl: "", description: e.message, author: "", artist: "", genre: [], status: 5, chapters: [] };
        }
    }

    async getPageList(url) {
        try {
            const baseUrl = await this.getBaseUrl();
            const fullUrl = url.startsWith("http") ? url : baseUrl + url;
            const res = await new Client().get(fullUrl, this.getHeaders());
            const doc = new Document(res.body);
            
            const pages = [];
            const pageImgs = doc.select("img[src*='/pages/'], img[data-src*='/pages/']");
            for (const img of pageImgs) {
                const src = img.getSrc || img.getAttribute("data-src") || "";
                if (src) pages.push(src);
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
                summary: "Leave empty to use default",
                value: "",
                dialogTitle: "Override BaseUrl",
                dialogMessage: "For mirror sites only"
            }
        }];
    }
}