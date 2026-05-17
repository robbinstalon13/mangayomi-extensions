const mangayomiSources = [{
    "name": "ManhwaZ",
    "lang": "en",
    "baseUrl": "https://manhwaz.com",
    "apiUrl": "",
    "iconUrl": "https://manhwaz.com/apple-touch-icon.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.1.0",
    "pkgPath": "manhwaz.js"
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      Referer: this.source.baseUrl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
  }

  mangaListFromPage(res, selector = ".page-item-detail") {
    const doc = new Document(res.body);
    const list = [];
    const mangaElements = doc.select(selector);

    for (const element of mangaElements) {
      let name = "", imageUrl = "", link = "";

      if (selector === "#slide-top > .item") {
        const linkEl = element.selectFirst(".info-item a");
        const imgEl = element.selectFirst(".img-item img");
        if (linkEl) { name = linkEl.text; link = linkEl.attr("href"); }
        if (imgEl) { imageUrl = imgEl.attr("data-src") || imgEl.attr("src") || ""; }
      } else {
        const linkEl = element.selectFirst(".item-summary a");
        const imgEl = element.selectFirst(".item-thumb img");
        if (linkEl) { name = linkEl.text; link = linkEl.attr("href"); }
        if (imgEl) { imageUrl = imgEl.attr("data-src") || imgEl.attr("src") || ""; }
      }

      if (name && link) {
        list.push({ name, imageUrl, link });
      }
    }

    const hasNextPage = doc.selectFirst("ul.pager a[rel=next]") !== null;
    return { list, hasNextPage };
  }

  toStatus(status) {
    const s = status?.toLowerCase() || "";
    if (s.includes("ongoing") || s.includes("publishing")) return 0;
    else if (s.includes("completed") || s.includes("complete")) return 1;
    else if (s.includes("hiatus")) return 2;
    else if (s.includes("cancelled") || s.includes("dropped")) return 3;
    return 5;
  }

  parseRelativeDate(dateStr) {
    if (!dateStr) return String(Date.now());
    try {
      const lowerDateStr = dateStr.toLowerCase().trim();
      const match = lowerDateStr.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
      if (!match) return String(Date.now());
      
      const value = parseInt(match[1]);
      const unit = match[2];
      const calendar = new Date();
      
      switch (unit) {
        case "second": calendar.setSeconds(calendar.getSeconds() - value); break;
        case "minute": calendar.setMinutes(calendar.getMinutes() - value); break;
        case "hour": calendar.setHours(calendar.getHours() - value); break;
        case "day": calendar.setDate(calendar.getDate() - value); break;
        case "week": calendar.setDate(calendar.getDate() - value * 7); break;
        case "month": calendar.setMonth(calendar.getMonth() - value); break;
        case "year": calendar.setFullYear(calendar.getFullYear() - value); break;
      }
      return String(calendar.valueOf());
    } catch (e) {
      return String(Date.now());
    }
  }

  async getPopular(page) {
    const url = `${this.getBaseUrl()}/genre/manhwa?page=${page}&m_orderby=views`;
    const res = await new Client().get(url, this.getHeaders());
    return this.mangaListFromPage(res, ".page-item-detail");
  }

  get supportsLatest() {
    return true;
  }

  async getLatestUpdates(page) {
    const url = `${this.getBaseUrl()}/?page=${page}`;
    const res = await new Client().get(url, this.getHeaders());
    return this.mangaListFromPage(res, ".page-item-detail");
  }

  async search(query, page, filters) {
    if (query && query.trim()) {
      const url = `${this.getBaseUrl()}/search?s=${encodeURIComponent(query)}&page=${page}`;
      const res = await new Client().get(url, this.getHeaders());
      return this.mangaListFromPage(res, ".page-item-detail");
    }
    const url = `${this.getBaseUrl()}/?page=${page}`;
    const res = await new Client().get(url, this.getHeaders());
    return this.mangaListFromPage(res, ".page-item-detail");
  }

  async getDetail(url) {
    const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
    const res = await new Client().get(fullUrl, this.getHeaders());
    const doc = new Document(res.body);

    const title = doc.selectFirst("div.post-title h1")?.text || "";
    const descEl = doc.selectFirst("div.summary__content");
    const description = descEl?.text?.trim() || "";
    const imgEl = doc.selectFirst("div.summary_image img");
    const imageUrl = imgEl ? (imgEl.attr("data-src") || imgEl.attr("src") || "") : "";

    const authorEl = doc.selectFirst("div.post-content_item:has(.summary-heading:contains(Author)) .summary-content");
    const author = authorEl?.text?.trim() || "";

    const statusEl = doc.selectFirst("div.summary-heading:contains(status) + div.summary-content");
    const status = this.toStatus(statusEl?.text);

    const genre = [];
    const genreEls = doc.select("div.genres-content a[rel=tag]");
    for (const g of genreEls) {
      const t = g.text?.trim();
      if (t) genre.push(t);
    }

    const chapters = [];
    const chapEls = doc.select("li.wp-manga-chapter");
    for (const c of chapEls) {
      const linkEl = c.selectFirst("a");
      if (linkEl) {
        const dateEl = c.selectFirst("span.chapter-release-date");
        chapters.push({
          name: linkEl.text?.trim() || "",
          url: linkEl.attr("href") || "",
          dateUpload: this.parseRelativeDate(dateEl?.text)
        });
      }
    }

    return { name: title, description, imageUrl, status, author, artist: author, genre, chapters };
  }

  async getPageList(url) {
    const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
    const res = await new Client().get(fullUrl, this.getHeaders());
    const doc = new Document(res.body);

    const pages = [];
    const imgEls = doc.select("div.page-break img, div.container img[data-src]");
    for (const img of imgEls) {
      const src = img.attr("data-src") || img.attr("src") || "";
      if (src && !src.includes("data:image") && pages.indexOf(src) === -1) {
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = this.getBaseUrl() + src;
        pages.push(src);
      }
    }
    return pages;
  }

  getFilterList() {
    return [];
  }

  getBaseUrl() {
    const pref = new SharedPreferences().get("domain_url");
    return pref && pref.startsWith("http") ? pref : this.source.baseUrl;
  }

  getSourcePreferences() {
    return [{
      key: "domain_url",
      editTextPreference: {
        title: "Edit URL",
        summary: "For mirrors",
        value: this.source.baseUrl,
        dialogTitle: "URL",
        dialogMessage: ""
      }
    }];
  }
}