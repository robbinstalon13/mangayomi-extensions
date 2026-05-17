// Mangayomi Extension for Multporn
// Base URL: https://multporn.net

const MULT_BASE = "https://multporn.net";

const MULT_USER_AGENT =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Manga parodies - URL slugs from /manga/{slug}
// Newer anime under comics section use /comics/{slug} instead (western cartoon style art)
const MULT_MANGA_PARODIES = [
    { name: "Any", value: "" },
    // N - New/Trending Anime (under /comics/)
    { name: "N-BL", value: "_newblue" },
    // A
    { name: "A Certain Magical Index", value: "a_certain_magical_index" },
    { name: "Amagi Brilliant Park", value: "amagi_brilliant_park" },
    { name: "Angel Beats!", value: "angel_beats" },
    { name: "Arknights", value: "arknights" },
    { name: "Attack on Titan", value: "attack_on_titan" },
    { name: "Avatar: The Last Airbender", value: "avatar_the_last_airbender" },
    { name: "Ayakashi Triangle", value: "ayakashi_triangle" },
    { name: "Azur Lane", value: "azur_lane" },
    // B
    { name: "Baka and Test", value: "baka_and_test_summon_the_beasts" },
    { name: "Bakemonogatari", value: "bakemonogatari" },
    { name: "BanG Dream!", value: "bang_dream" },
    { name: "Beastars", value: "beastars" },
    { name: "Berserk", value: "berserk" },
    { name: "Black Clover", value: "black_clover" },
    { name: "Blue Archive", value: "blue_archive" },
    { name: "Blue Exorcist", value: "blue_exorcist" },
    { name: "BNA: Brand New Animal", value: "bna_brand_new_animal" },
    { name: "Bocchi the Rock!", value: "bocchi_the_rock" },
    { name: "Boruto", value: "boruto_naruto_next_generations" },
    // C
    { name: "Cardcaptor Sakura", value: "cardcaptor_sakura" },
    { name: "Cells at Work!", value: "cells_at_work" },
    { name: "Chainsaw Man", value: "chainsaw_man" },
    { name: "Clannad", value: "clannad" },
    { name: "Code Geass", value: "code_geass" },
    { name: "Cowboy Bebop", value: "cowboy_bebop" },
    { name: "Cyberpunk Edgerunners", value: "cyberpunk" },
    // D
    { name: "Dandadan", value: "dandadan" },
    { name: "Death Note", value: "death_note" },
    { name: "Delicious in Dungeon", value: "delicious_in_dungeon" },
    { name: "Deltarune", value: "deltarune" },
    { name: "Demon Slayer", value: "demon_slayer_kimetsu_no_yaiba" },
    { name: "Digimon", value: "digimon" },
    { name: "Doki Doki Literature Club", value: "doki_doki_literature_club" },
    { name: "Dragon Ball", value: "dragon_ball" },
    { name: "Dragon Quest", value: "dragon_quest" },
    { name: "Dragon's Dogma", value: "dragons_dogma" },
    // E
    { name: "Elden Ring", value: "elden_ring" },
    { name: "Eromanga-sensei", value: "eromanga_sensei" },
    { name: "Evangelion", value: "evangelion" },
    // F
    { name: "Fairy Tail", value: "fairy_tail" },
    { name: "Fate/Grand Order", value: "fate_grand_order" },
    { name: "Fate/Stay Night", value: "fate_stay_night" },
    { name: "Fire Emblem", value: "fire_emblem" },
    { name: "Food Wars", value: "food_wars_shokugeki_no_soma" },
    { name: "Frieren", value: "frieren_beyond_journeys_end" },
    { name: "Fruits Basket", value: "fruits_basket" },
    { name: "Fullmetal Alchemist", value: "fullmetal_alchemist" },
    { name: "Future Diary", value: "future_diary" },
    // G
    { name: "Genshin Impact", value: "genshin_impact" },
    { name: "Gintama", value: "gintama" },
    { name: "Goblin Slayer", value: "goblin_slayer" },
    { name: "Granblue Fantasy", value: "granblue_fantasy" },
    { name: "Guilty Gear", value: "guilty_gear" },
    { name: "Gurren Lagann", value: "gurren_lagann" },
    // H
    { name: "Hazbin Hotel", value: "hazbin_hotel" },
    { name: "Hell's Paradise", value: "hells_paradise" },
    { name: "Helltaker", value: "helltaker" },
    { name: "High School DxD", value: "highschool_dxd" },
    { name: "Hinamatsuri", value: "hinamatsuri" },
    { name: "Honkai: Star Rail", value: "honkai_star_rail" },
    { name: "Honkai Impact 3rd", value: "honkai_impact_3rd" },
    { name: "Hyperdimension Neptunia", value: "hyperdimension_neptunia" },
    // I
    { name: "Ikkitousen", value: "ikkitousen" },
    { name: "InuYasha", value: "inuyasha" },
    { name: "Is It Wrong to Try to Pick Up Girls in a Dungeon?", value: "is_it_wrong_to_try_to_pick_up_girls_in_a_dungeon" },
    // J
    { name: "JoJo's Bizarre Adventure", value: "jojos_bizarre_adventure" },
    { name: "Jujutsu Kaisen", value: "jujutsu_kaisen" },
    // K
    { name: "Kaguya-sama", value: "kaguya_sama_love_is_war" },
    { name: "Kantai Collection", value: "kantai_collection" },
    { name: "Kemono Friends", value: "kemono_friends" },
    { name: "Kill la Kill", value: "kill_la_kill" },
    { name: "Kimi ni Todoke", value: "kimi_ni_todoke" },
    { name: "KonoSuba", value: "konosuba" },
    { name: "Kuroko's Basketball", value: "kuroko_no_basket" },
    // L
    { name: "Laid-Back Camp", value: "laid_back_camp" },
    { name: "League of Legends", value: "league_of_legends" },
    { name: "Little Witch Academia", value: "little_witch_academia" },
    { name: "Love Live!", value: "love_live" },
    { name: "Lucky Star", value: "lucky_star" },
    { name: "Lycoris Recoil", value: "lycoris_recoil" },
    // M
    { name: "Made in Abyss", value: "made_in_abyss" },
    { name: "Magical Girl Lyrical Nanoha", value: "magical_girl_lyrical_nanoha" },
    { name: "Maid-sama", value: "maid_sama" },
    { name: "Miss Kobayashi's Dragon Maid", value: "miss_kobayashis_dragon_maid" },
    { name: "Mobile Suit Gundam", value: "mobile_suit_gundam" },
    { name: "Monster Hunter", value: "monster_hunter" },
    { name: "Mushoku Tensei", value: "mushoku_tensei" },
    { name: "My Dress-Up Darling", value: "my_dress_up_darling" },
    { name: "My Hero Academia", value: "my_hero_academia" },
    // N
    { name: "Naruto", value: "naruto" },
    { name: "Nier: Automata", value: "nier_automata" },
    // O
    { name: "One Piece", value: "one_piece" },
    { name: "One-Punch Man", value: "one_punch_man" },
    { name: "Oshi no Ko", value: "oshi_no_ko" },
    { name: "Overlord", value: "overlord" },
    { name: "Overwatch", value: "overwatch" },
    // P
    { name: "Panty & Stocking", value: "panty_stocking_with_garterbelt" },
    { name: "Persona", value: "persona" },
    { name: "Persona 3", value: "persona_3" },
    { name: "Persona 4", value: "persona_4" },
    { name: "Persona 5", value: "persona_5" },
    { name: "Pokemon", value: "pokemon" },
    { name: "Princess Connect!", value: "princess_connect" },
    { name: "Project SEKAI", value: "project_sekai" },
    { name: "Psycho Pass", value: "psycho_pass" },
    { name: "Puella Magi Madoka Magica", value: "puella_magi_madoka_magica" },
    // R
    { name: "Re:Zero", value: "rezero" },
    { name: "Redo of Healer", value: "redo_of_healer" },
    { name: "Resident Evil", value: "resident_evil" },
    { name: "Rosario + Vampire", value: "rosario_vampire" },
    { name: "Rurouni Kenshin", value: "rurouni_kenshin" },
    { name: "RWBY", value: "rwby" },
    // S
    { name: "Sailor Moon", value: "sailor_moon" },
    { name: "Senran Kagura", value: "senran_kagura" },
    { name: "Shaman King", value: "shaman_king" },
    { name: "Skullgirls", value: "skullgirls" },
    { name: "Slayers", value: "slayers" },
    { name: "Sonic the Hedgehog", value: "sonic_the_hedgehog" },
    { name: "Soul Eater", value: "soul_eater" },
    { name: "Space Battleship Yamato", value: "space_battleship_yamato_2199" },
    { name: "Spice and Wolf", value: "spice_and_wolf" },
    { name: "Splatoon", value: "splatoon" },
    { name: "Spy x Family", value: "spy_x_family" },
    { name: "Star Fox", value: "star_fox" },
    { name: "Steins;Gate", value: "steins_gate" },
    { name: "Steven Universe", value: "steven_universe" },
    { name: "Strike Witches", value: "strike_witches" },
    { name: "Super Mario", value: "super_mario_bros" },
    { name: "Sword Art Online", value: "sword_art_online" },
    { name: "Symphogear", value: "symphogear" },
    // T
    { name: "Tales of Symphonia", value: "tales_of_symphonia" },
    { name: "Tensei shitara Slime", value: "tensei_shitara_slime_datta_ken" },
    { name: "That Time I Got Reincarnated as a Slime", value: "that_time_i_got_reincarnated_as_a_slime" },
    { name: "The 100 Girlfriends", value: "the_100_girlfriends_who_really_really_really_love_you" },
    { name: "The Amazing World of Gumball", value: "the_amazing_world_of_gumball" },
    { name: "The Demon Girl Next Door", value: "the_demon_girl_next_door" },
    { name: "The Devil is a Part-Timer", value: "the_devil_is_a_part_timer" },
    { name: "The Eminence in Shadow", value: "the_eminence_in_shadow" },
    { name: "The Idolmaster", value: "the_idolmaster" },
    { name: "The Legend of Zelda", value: "the_legend_of_zelda" },
    { name: "The Melancholy of Haruhi Suzumiya", value: "the_melancholy_of_haruhi_suzumiya" },
    { name: "The Quintessential Quintuplets", value: "the_quintessential_quintuplets" },
    { name: "The Rising of the Shield Hero", value: "the_rising_of_the_shield_hero" },
    { name: "The Saga of Tanya the Evil", value: "the_saga_of_tanya_the_evil" },
    { name: "The Seven Deadly Sins", value: "the_seven_deadly_sins" },
    { name: "To Love-Ru", value: "to_love_ru" },
    { name: "Tokyo Ghoul", value: "tokyo_ghoul" },
    { name: "Toradora!", value: "toradora" },
    { name: "Touhou Project", value: "touhou_project" },
    { name: "Trigun", value: "trigun" },
    { name: "Tsukihime", value: "tsukihime" },
    // U-V
    { name: "Valkyrie Profile", value: "valkyrie_profile" },
    { name: "Vampire Knight", value: "vampire_knight" },
    // W
    { name: "Witch Craft", value: "witch_craft" },
    // Y
    { name: "Yama no Susume", value: "yama_no_susume" },
    { name: "Yuruyuri", value: "yuruyuri" },
    // Z
    { name: "Zombieland Saga", value: "zombieland_saga" }
];

// New/Trending Anime in comics section (western cartoon art style on multporn)
const MULT_NEW_ANIME = [
    { name: "Blue Lock", value: "_newblue_lock" },
    { name: "Chainsaw Man", value: "_newchainsaw_man" },
    { name: "Dandadan", value: "_newdandadan" },
    { name: "Frieren", value: "_newfrieren_beyond_journeys_end" },
    { name: "Jujutsu Kaisen", value: "_newjujutsu_kaisen" },
    { name: "Kaiju No. 8", value: "_newkaiju_no_8" },
    { name: "KonoSuba", value: "_newkonosuba" },
    { name: "Mushoku Tensei", value: "_newmushoku_tensei" },
    { name: "Oshi no Ko", value: "_newoshi_no_ko" },
    { name: "Sakamoto Days", value: "_newsakamoto_days" },
    { name: "Solo Leveling", value: "_newsolo_leveling" },
    { name: "Spy x Family", value: "_newspy_x_family" },
    { name: "Undead Unluck", value: "_newundead_unluck" },
    { name: "Vinland Saga", value: "_newvinland_saga" }
];

// Popular Western artists (Multporn uses URL slugs)
const MULT_ARTISTS = [
    { name: "Any", value: "" },
    { name: "JAB", value: "jab" },
    { name: "Midas-Bust", value: "midas-bust" },
    { name: "ShadBase", value: "shadbase" },
    { name: "Palcomix", value: "palcomix" },
    { name: "Fred Perry", value: "fred-perry" },
    { name: "Witchking00", value: "witchking00" },
    { name: "Croc", value: "croc" },
    { name: "Grimphantom", value: "grimphantom" },
    { name: "Inusen", value: "inusen" },
    { name: "Joelasko", value: "joelasko" },
    { name: "Dsan", value: "dsan" },
    { name: "Kogeikun", value: "kogeikun" },
    { name: "Manawer", value: "manawer" },
    { name: "BDOne", value: "bdone" },
    { name: "Creedo", value: "creedo" }
];

// Popular tags (use Multporn's slug format)
const MULT_TAGS = [
    { name: "Any", value: "" },
    { name: "Western", value: "western" },
    { name: "Full Color", value: "full_color" },
    { name: "Anal", value: "anal" },
    { name: "Big Breasts", value: "big_breasts" },
    { name: "Blowjob", value: "blowjob" },
    { name: "Furry", value: "furry" },
    { name: "Lesbian", value: "lesbian" },
    { name: "Milf", value: "milf" },
    { name: "Incest", value: "incest" },
    { name: "Group", value: "group" },
    { name: "Parody", value: "parody" }
];

// Sort options
const MULT_SORT = [
    { name: "Latest", value: "" },
    { name: "Popular", value: "popular" },
    { name: "Best", value: "best" }
];

// Utility functions
function safeString(str) {
    if (str === null || str === undefined) return "";
    return String(str);
}

function firstMatch(str, regex) {
    const m = safeString(str).match(regex);
    return m ? m[1] : null;
}

function stripTags(str) {
    return safeString(str)
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .trim();
}

function extractFilterValue(filters, type) {
    if (!filters || !Array.isArray(filters)) return "";
    for (let i = 0; i < filters.length; i++) {
        const f = filters[i];
        if (f && f.type === type) {
            if (typeof f.state === "number" && Array.isArray(f.values) && f.values[f.state]) {
                return safeString(f.values[f.state].value || "");
            }
        }
    }
    return "";
}

// Parse comic cards from listing pages (handles both /comics/ and /hentai_manga/)
function parseComicCards(html) {
    const cards = [];
    const htmlStr = safeString(html);
    const seen = {};
    
    // Comics: /comics/{slug} with <a href="/comics/..."><img src="..." alt="...">
    const comicRegex = /<a[^>]+href="(\/comics\/[^"?#]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    
    htmlStr.replace(comicRegex, function (_, path, imageUrl, alt) {
        if (!path || seen[path]) return _;
        seen[path] = true;
        let title = stripTags(alt)
            .replace(/\s+Porn comic[\s\S]*$/i, "")
            .replace(/\s+Cartoon porn comics[\s\S]*$/i, "")
            .trim();
        if (!title) {
            title = path.replace(/^\/comics\//, "").replace(/[_\-]/g, " ");
        }
        cards.push({
            name: title,
            imageUrl: safeString(imageUrl),
            link: MULT_BASE + path
        });
        return _;
    });
    
    // Manga: /hentai_manga/{slug} with <a href="/hentai_manga/..."><img src="..." alt="Hentai manga ... on {Parody}">
    const mangaRegex = /<a[^>]+href="(\/hentai_manga\/[^"?#]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    
    htmlStr.replace(mangaRegex, function (_, path, imageUrl, alt) {
        if (!path || seen[path]) return _;
        seen[path] = true;
        // alt format: "Hentai manga {Title} on {Parody}"
        let title = stripTags(alt)
            .replace(/^Hentai manga\s*/i, "")
            .replace(/\s+on\s+[\s\S]+$/i, "")
            .replace(/\s+Porn comic[\s\S]*$/i, "")
            .replace(/\s+Cartoon porn comics[\s\S]*$/i, "")
            .trim();
        if (!title) {
            title = path.replace(/^\/hentai_manga\//, "").replace(/[_\-]/g, " ");
        }
        cards.push({
            name: title,
            imageUrl: safeString(imageUrl),
            link: MULT_BASE + path
        });
        return _;
    });
    
    return cards;
}

// Build URL for comics section (original behavior)
function buildComicsUrl(mode, query, page, artist, tag, sort) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    const pageParam = pageValue > 1 ? (pageValue - 1) : 0;
    
    // Text search takes priority
    if (query) {
        let url = MULT_BASE + "/search/content/" + encodeURIComponent(query.trim());
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Artist filter
    if (artist) {
        let url = MULT_BASE + "/authors_comics/" + artist;
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Tag filter
    if (tag) {
        let url = MULT_BASE + "/category_comic/" + tag;
        if (pageParam > 0) {
            url += "?page=" + pageParam;
        }
        return url;
    }
    
    // Default modes
    if (mode === "popular" || sort === "popular") {
        let url = MULT_BASE + "/best?rule34=1";
        if (pageParam > 0) {
            url += "&page=" + pageParam;
        }
        return url;
    }
    
    if (mode === "best" || sort === "best") {
        let url = MULT_BASE + "/best?rule34=1";
        if (pageParam > 0) {
            url += "&page=" + pageParam;
        }
        return url;
    }
    
    // Latest
    let url = MULT_BASE + "/new?rule34=1&type=1";
    if (pageParam > 0) {
        url += "&page=" + pageParam;
    }
    return url;
}

// Build URL for manga section
function buildMangaUrl(mode, query, page, parody, sort) {
    const pageValue = Math.max(1, parseInt(page, 10) || 1);
    
    // Specific parody selected
    if (parody) {
        // Check if it's a "new anime" (western art style) - prefixed with "_new"
        if (parody.indexOf("_new") === 0) {
            // Route to comics section for new anime
            const slug = parody.substring(5); // strip "_new" prefix
            const pageParam = pageValue > 1 ? "?page=" + (pageValue - 1) : "";
            return MULT_BASE + "/comics/" + slug + pageParam;
        }
        // Regular manga parody - format: ?page=0,N (0-indexed, comma-separated)
        const pageParam = pageValue > 1 ? "?page=0%2C" + (pageValue - 1) : "";
        return MULT_BASE + "/manga/" + parody + "?rule34=1" + pageParam;
    }
    
    // Text search - use content search (works across all content)
    if (query) {
        const pageParam = pageValue > 1 ? "?page=" + (pageValue - 1) : "";
        return MULT_BASE + "/search/content/" + encodeURIComponent(query.trim()) + pageParam;
    }
    
    // Popular manga by rating
    if (mode === "popular" || sort === "popular") {
        const pageParam = pageValue > 1 ? "&page=" + (pageValue - 1) : "";
        return MULT_BASE + "/manga?sort_by=rating" + pageParam;
    }
    
    // Latest manga
    const pageParam = pageValue > 1 ? "&page=" + (pageValue - 1) : "";
    return MULT_BASE + "/manga" + pageParam;
}

function hasNextPage(html, currentPage) {
    const htmlStr = safeString(html);
    const pageIdx = Math.max(0, parseInt(currentPage, 10) - 1);
    const nextPagePattern = new RegExp('[?&]page=' + (pageIdx + 1) + '\\b', 'i');
    if (nextPagePattern.test(htmlStr)) {
        return true;
    }
    // Check for "next" link class (Drupal pagination)
    return /class="pager-next"/i.test(htmlStr) || /rel="next"/i.test(htmlStr);
}

// Check for manga-style pagination (?page=0,N or ?page=0%2CN)
function hasMangaNextPage(html, currentPage) {
    const htmlStr = safeString(html);
    const pageIdx = Math.max(0, parseInt(currentPage, 10) - 1);
    
    // Check for ?page=0,N pattern (manga pagination)
    const nextPattern = new RegExp('[?&]page=0[%,](' + (pageIdx + 1) + ')', 'i');
    if (nextPattern.test(htmlStr)) {
        return true;
    }
    
    // Also check for Drupal-style next link
    return /class="pager-next"/i.test(htmlStr) || /rel="next"/i.test(htmlStr);
}

// Convert thumbnail URL to full image URL
function thumbnailToFull(thumbUrl) {
    if (!thumbUrl) return "";
    if (thumbUrl.indexOf("/styles/") !== -1) {
        return thumbUrl.replace(/\/styles\/[^\/]+\/public/, "").replace(/\?itok=[^&]*$/, "").replace(/\?.*$/, "");
    }
    return thumbUrl.replace(/\?itok=[^&]*$/, "").replace(/\?.*$/, "");
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 15
        };
    }
    
    get supportsLatest() {
        return true;
    }
    
    getHeaders(referer) {
        return {
            "User-Agent": MULT_USER_AGENT,
            "Referer": referer || (MULT_BASE + "/"),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache"
        };
    }
    
    async requestHtml(url) {
        const client = new Client(this.clientConfig);
        const response = await client.get(url, this.getHeaders());
        const statusCode = Number(response.statusCode || 0);
        if (statusCode >= 400) {
            throw new Error("Request failed with status " + statusCode + " for " + url);
        }
        const body = safeString(response.body);
        if (!body) {
            throw new Error("Empty response body for " + url);
        }
        return body;
    }
    
    // Fetch comics section
    async fetchComics(mode, query, page, filters) {
        const artist = extractFilterValue(filters, "artist");
        const tag = extractFilterValue(filters, "tag");
        const sort = extractFilterValue(filters, "sort");
        const url = buildComicsUrl(mode, query, page, artist, tag, sort);
        const html = await this.requestHtml(url);
        const cards = parseComicCards(html);
        return {
            list: cards,
            hasNextPage: hasNextPage(html, page)
        };
    }
    
    // Fetch manga section
    async fetchManga(mode, query, page, filters) {
        const parody = extractFilterValue(filters, "parody");
        const sort = extractFilterValue(filters, "sort");
        const url = buildMangaUrl(mode, query, page, parody, sort);
        const html = await this.requestHtml(url);
        const cards = parseComicCards(html);
        const hasNext = parody ? hasMangaNextPage(html, page) : hasNextPage(html, page);
        return {
            list: cards,
            hasNextPage: hasNext
        };
    }
    
    async fetchList(mode, query, page, filters) {
        const parody = extractFilterValue(filters, "parody");
        
        // If specific parody selected, use manga section
        if (parody) {
            return await this.fetchManga(mode, query, page, filters);
        }
        
        // Otherwise use comics section
        return await this.fetchComics(mode, query, page, filters);
    }
    
    // getPopular: fetch both comics and manga, merge results
    async getPopular(page) {
        try {
            const artist = extractFilterValue(null, "artist");
            const tag = extractFilterValue(null, "tag");
            const sort = "popular";
            
            // Fetch both sources in parallel
            const [comicsResult, mangaResult] = await Promise.all([
                this.fetchComics("popular", "", page, null, null, sort),
                this.fetchManga("popular", "", page, null, sort)
            ]);
            
            // Merge results from both sources
            const seen = {};
            const merged = [];
            
            // Comics first
            for (let i = 0; i < comicsResult.list.length; i++) {
                const item = comicsResult.list[i];
                if (!seen[item.link]) {
                    seen[item.link] = true;
                    merged.push(item);
                }
            }
            
            // Then manga
            for (let i = 0; i < mangaResult.list.length; i++) {
                const item = mangaResult.list[i];
                if (!seen[item.link]) {
                    seen[item.link] = true;
                    merged.push(item);
                }
            }
            
            // hasNextPage if either source has more
            const hasNextPage = comicsResult.hasNextPage || mangaResult.hasNextPage;
            
            return {
                list: merged,
                hasNextPage: hasNextPage
            };
        } catch (error) {
            console.log("[multporn] getPopular error: " + (error && error.message ? error.message : String(error)));
            // Fallback to comics only
            try {
                return await this.fetchComics("popular", "", page, null, null, "popular");
            } catch (e) {
                return { list: [], hasNextPage: false };
            }
        }
    }
    
    async getLatestUpdates(page) {
        return await this.fetchList("latest", "", page, null);
    }
    
    async search(query, page, filters) {
        return await this.fetchList("search", query, page, filters);
    }
    
    // Check if URL is a manga detail page
    isMangaUrl(url) {
        return /\/hentai_manga\//i.test(url);
    }
    
    // Check if URL is a comic detail page
    isComicUrl(url) {
        return /\/comics\//i.test(url);
    }
    
    async getDetail(url) {
        const html = await this.requestHtml(url);
        
        // Extract title
        let title = stripTags(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
        if (!title) {
            title = stripTags(firstMatch(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i));
            title = title.replace(/\s*-\s*Multporn$/i, "").replace(/\s*Porn comic$/i, "").trim();
        }
        if (!title) title = "Unknown";
        
        // Extract cover image from og:image
        let cover = firstMatch(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        if (!cover) {
            cover = firstMatch(html, /<img[^>]+src="([^"]*\/sites\/default\/files\/[^"]+)"/i);
        }
        
        // Extract author (try both manga and comic selectors)
        let artist = "";
        const artistMatch = html.match(/<a[^>]+href="\/authors_comics\/[^"]+"[^>]*>([^<]+)<\/a>/i);
        if (artistMatch) {
            artist = stripTags(artistMatch[1]);
        } else {
            // Try manga author pattern
            const mangaArtistMatch = html.match(/<a[^>]+href="\/authors_hentai\/[^"]+"[^>]*>([^<]+)<\/a>/i);
            if (mangaArtistMatch) {
                artist = stripTags(mangaArtistMatch[1]);
            }
        }
        
        // Extract tags from category links (works for both comics and manga)
        const tagList = [];
        const tagSeen = {};
        
        // Comics tags
        safeString(html).replace(/<a[^>]+href="\/category_comic\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Manga tags
        safeString(html).replace(/<a[^>]+href="\/manga_tags\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Character tags
        safeString(html).replace(/<a[^>]+href="\/characters\/[^"]+"[^>]*>([^<]+)<\/a>/gi, function (_, name) {
            const n = stripTags(name);
            if (n && !tagSeen[n] && n.length < 50) {
                tagSeen[n] = true;
                tagList.push(n);
            }
            return _;
        });
        
        // Count images
        let pageCount = 0;
        const countSeen = {};
        safeString(html).replace(/<img[^>]+src="[^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/[^"]+\.(?:jpg|jpeg|png)"/gi, function (match) {
            if (!countSeen[match]) {
                countSeen[match] = true;
                pageCount++;
            }
            return match;
        });
        
        // Extract description
        let description = "";
        const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
        if (descMatch) {
            description = stripTags(descMatch[1]);
        }
        
        const status = 2; // Complete
        
        return {
            name: title,
            imageUrl: safeString(cover),
            link: url,
            author: artist,
            artist: artist,
            description: description,
            status: status,
            genre: tagList,
            chapters: [{
                name: pageCount > 0 ? "Read (" + pageCount + " pages)" : "Read",
                url: url,
                scanlator: artist || "",
                dateUpload: ""
            }]
        };
    }
    
    async getPageList(url) {
        const html = await this.requestHtml(url);
        const pages = [];
        const seen = {};
        
        // Find all comic/manga page image sources
        safeString(html).replace(/<img[^>]+src="([^"]*\/sites\/default\/files\/styles\/juicebox_[^"]+\/public\/[^"]+\.(?:jpg|jpeg|png))[^"]*"/gi, function (_, thumbUrl) {
            const fullUrl = thumbnailToFull(thumbUrl);
            if (fullUrl && !seen[fullUrl]) {
                seen[fullUrl] = true;
                pages.push(fullUrl);
            }
            return _;
        });
        
        // Fallback: direct image URLs
        if (pages.length === 0) {
            safeString(html).replace(/https:\/\/multporn\.net\/sites\/default\/files\/[^"\s<>]+\.(?:jpg|jpeg|png)/gi, function (match) {
                if (!seen[match]) {
                    seen[match] = true;
                    pages.push(match);
                }
                return match;
            });
        }
        
        return pages;
    }
    
    getFilterList() {
        // Combine new anime (western art) with manga parodies - new anime first
        const allParodies = MULT_NEW_ANIME.concat(MULT_MANGA_PARODIES);
        return [
            {
                type_name: "SelectFilter",
                type: "parody",
                name: "Parody",
                values: allParodies.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "sort",
                name: "Sort",
                values: MULT_SORT.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "artist",
                name: "Artist (Western)",
                values: MULT_ARTISTS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            },
            {
                type_name: "SelectFilter",
                type: "tag",
                name: "Tag",
                values: MULT_TAGS.map(function (o) { return { type_name: "SelectOption", name: o.name, value: o.value }; })
            }
        ];
    }
}