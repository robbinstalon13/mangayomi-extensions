# Mangayomi nhentai Extension - Build Plan
## V1.0
## Overview
Create a JavaScript extension for Mangayomi iOS app that allows users to browse and read content from nhentai.net with automatic fallback to less-protected mirror domains when Cloudflare blocks the primary domain.

## CRITICAL CONSTRAINTS
- Runtime is **QuickJS** (NOT Node.js) - no require(), no npm imports
- Only the built-in `Client` class is available for HTTP requests
- The extension class MUST be the **last class defined** in the file
- Mangayomi auto-detects the last class extending `MProvider`
- All async methods must return the exact object shapes shown below
- Image CDN domains (`i.nhentai.net`, `t.nhentai.net`) are SEPARATE from the API domain and should NEVER be changed by fallback logic
- Add null checks everywhere - API fields can be missing or null

## Project Structure

```
mangayomi-extensions/
├── index.json          # Repository manifest (metadata)
├── nhentai.js          # Main extension code
└── README.md           # Documentation (optional)
```

## File 1: index.json

**Purpose:** Repository manifest that Mangayomi reads to discover available extensions.

**Requirements:**
- Must be valid JSON array
- Each extension is an object with specific fields
- `sourceCodeLanguage: 1` means JavaScript (0 = Dart)

**Template:**
```json
[{
    "name": "nhentai",
    "id": 177013133,
    "baseUrl": "https://nhentai.net",
    "lang": "en",
    "typeSource": "single",
    "iconUrl": "https://nhentai.net/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": true,
    "hasCloudflare": true,
    "sourceCodeUrl": "https://raw.githubusercontent.com/YOUR_USERNAME/mangayomi-extensions/main/nhentai.js",
    "apiUrl": "https://nhentai.net/api",
    "version": "1.0.0",
    "isManga": true,
    "itemType": 0,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "Primary: nhentai.net | Fallbacks: nhentai.to, nhentai.xxx"
}]
```

## File 2: nhentai.js

**Purpose:** Extension implementation class that extends MProvider.

**Class Requirements:**

### Constructor
- Must extend `MProvider`
- Set `this.baseUrl = "https://nhentai.net"`
- Set `this.apiUrl = "https://nhentai.net/api"`
- Set `this.isNsfw = true`
- Define fallback domains array: `["https://nhentai.to", "https://nhentai.xxx"]`
- Track current working domain

### Required Methods

#### 1. `getPopular(page)`
**Input:** `page` (number, starts at 1)
**Output:** Object with shape:
```javascript
{
    list: [
        {
            url: "/g/{id}",      // Gallery path
            name: "Title",       // Gallery title
            link: "https://t.nhentai.net/galleries/{media_id}/thumb.jpg"  // Thumbnail
        }
    ],
    hasNextPage: boolean  // true if more pages available
}
```
**API Endpoint:** `GET {apiUrl}/galleries/search?query=&page={page}&sort=popular`
**Note:** Empty query string `query=` is required even for popular browsing.
**Title extraction:** `item.title.english || item.title.pretty || item.title.japanese || 'Unknown'` (title is an object, NOT a string)

#### 2. `getLatestUpdates(page)`
Same as `getPopular` but with `sort=date` parameter.
**API Endpoint:** `GET {apiUrl}/galleries/search?query=&page={page}&sort=date`
**Title extraction:** Same as getPopular - use `item.title.english || item.title.pretty`

#### 3. `search(query, page, filters)`
**Input:** 
- `query` (string, search term)
- `page` (number)
- `filters` (array, can ignore for now)
**Output:** Same shape as `getPopular`
**API Endpoint:** `GET {apiUrl}/galleries/search?query={encodedQuery}&page={page}`
**Note:** Use `encodeURIComponent(query)` for the query parameter.
**Title extraction:** Same as getPopular - use `item.title.english || item.title.pretty`

#### 4. `getDetail(url)`
**Input:** `url` (string, like "/g/177013")
**Output:** Object with shape:
```javascript
{
    title: "English Title",
    description: "Pages: X\nTags: tag1, tag2...",
    author: "Artist names",
    genre: ["tag1", "tag2", ...],  // All tag names as array
    status: 1,  // 0=ongoing, 1=complete, 2=hiatus, 3=canceled, 4=publishingFinished, 5=unknown
    chapters: [
        {
            name: "Read (X pages)",
            url: "/g/{id}",
            scanlator: "Group name or empty",
            dateUpload: "timestamp in milliseconds"  // upload_date * 1000
        }
    ]
}
```
**API Endpoint:** `GET {apiUrl}/gallery/{id}`
**Extraction:** Parse ID from URL with regex `/\/g\/(\d+)/`

#### 5. `getPageList(url)`
**Input:** `url` (string, like "/g/177013")
**Output:** Array of image URLs (strings)
```javascript
[
    "https://i.nhentai.net/galleries/{media_id}/1.jpg",
    "https://i.nhentai.net/galleries/{media_id}/2.png",
    ...
]
```
**API Endpoint:** `GET {apiUrl}/gallery/{id}`
**Image URL Format:** `https://i.nhentai.net/galleries/{media_id}/{page_num}.{ext}`
**Extension Mapping:**
- `t: "p"` → `png`
- `t: "j"` → `jpg`
- `t: "g"` → `gif`

**IMPORTANT:** Image domains `i.nhentai.net` (full images) and `t.nhentai.net` (thumbnails) are CDN servers. These are ALWAYS the same regardless of which API domain (nhentai.net vs nhentai.to vs nhentai.xxx) is being used. Do NOT change these image domains in the fallback logic.

#### 6. `getFilterList()` (Optional)
**Output:** Empty array `[]` for now.

### HTTP Client Usage

Mangayomi provides a `Client` class:

```javascript
const client = new Client();
const response = await client.get(url, headers);
// response.body contains the response body as string
// response.statusCode contains HTTP status
```

### Cloudflare Handling

#### 1. Client Configuration (reqcopyWith)
Pass configuration to the Client constructor to improve iOS Cloudflare bypass.
Mangayomi's Client class accepts an optional config object that controls TLS, redirects, and timeout behavior.

```javascript
// In constructor, define default client config:
this.clientConfig = {
    verifyCertificates: false,  // Skip SSL cert verification (helps with mirrors)
    timeout: 10                 // 10 second timeout before trying next domain
};
```

Use it when creating clients:
```javascript
const client = new Client(this.clientConfig);
```

#### 2. Request Headers
Always send headers that mimic a real browser. Cloudflare checks User-Agent and Referer.

```javascript
getHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": this.currentBase + "/",
        "Accept": "application/json"
    };
}
```

Pass headers in every request:
```javascript
const res = await client.get(url, this.getHeaders());
```

#### 3. Cloudflare Detection
Check response status code AND body for Cloudflare markers before falling back.

```javascript
isCloudflareBlock(res) {
    // Check status code
    if (res.statusCode === 403 || res.statusCode === 503) {
        return true;
    }
    // Check if body contains Cloudflare challenge HTML instead of JSON
    if (res.body && typeof res.body === 'string') {
        if (res.body.includes('cloudflare') || res.body.includes('cf-browser-verification')) {
            return true;
        }
    }
    return false;
}
```

#### 4. Fallback Domain Logic
Implement retry logic that tries primary domain first, then falls back to mirrors on Cloudflare errors.

The fallback ONLY applies to API calls. Image/thumbnail URLs always use `i.nhentai.net` / `t.nhentai.net`.

```javascript
async tryWithFallback(apiCall, ...args) {
    const domains = [
        { base: "https://nhentai.net", api: "https://nhentai.net/api" },
        { base: "https://nhentai.to", api: "https://nhentai.to/api" },
        { base: "https://nhentai.xxx", api: "https://nhentai.xxx/api" }
    ];
    
    for (const domain of domains) {
        try {
            this.currentBase = domain.base;
            this.currentApi = domain.api;
            const result = await apiCall.call(this, ...args);
            return result;
        } catch (e) {
            console.log(`Failed on ${domain.base}: ${e.message}`);
            // If it's the last domain, throw the error
            if (domain === domains[domains.length - 1]) throw e;
            // Otherwise continue to next domain
        }
    }
}
```

#### 5. Use Detection Inside API Methods
Each API method should check for Cloudflare before parsing JSON:

```javascript
async _getPopular(page) {
    const client = new Client(this.clientConfig);
    const res = await client.get(
        `${this.currentApi}/galleries/search?query=&page=${page}&sort=popular`,
        this.getHeaders()
    );
    // Detect Cloudflare block BEFORE parsing
    if (this.isCloudflareBlock(res)) {
        throw new Error("Cloudflare blocked: " + res.statusCode);
    }
    const d = JSON.parse(res.body);
    return this.formatList(d, page);
}
```

#### 6. WebView Manual Solve (Last Resort)
When `hasCloudflare: true` is set in index.json, Mangayomi shows a WebView icon in the source.
If ALL domains fail, the user can:
1. Tap the WebView icon on the source
2. Solve the Cloudflare challenge manually in the browser
3. Go back - cookies sync to the HTTP client automatically
4. Retry browsing - the synced cookies should bypass Cloudflare

This is handled by Mangayomi's built-in `MClient` (not by extension code), but setting `hasCloudflare: true` enables it.

#### 7. iOS Cookie Sync Issue (Known Problem)
On iOS, the WebView may load nhentai perfectly (no visible Cloudflare challenge), but the `cf_clearance` cookie doesn't always sync to the HTTP client used by the extension. This is a known iOS WKWebView limitation.

**Workaround built into our extension:**
- The fallback domain logic (Layer 4) is the PRIMARY defense for this scenario
- If nhentai.net's cookies don't sync, the extension automatically tries nhentai.to and nhentai.xxx which may have lighter or no Cloudflare
- The `hasCloudflare: true` flag still helps because Mangayomi's `MClient` will attempt automatic headless WebView cookie extraction via its `ResolveCloudFlareChallenge` retry policy before the extension's own fallback kicks in

**User-facing flow:**
1. Extension tries nhentai.net → Cloudflare blocks → auto-fallback to .to/.xxx
2. If ALL fail, user sees error → taps WebView icon → browses nhentai.net → goes back
3. Mangayomi's MClient stores `cf_clearance` cookie + user-agent from WebView
4. Next request automatically includes those cookies
5. If cookies still don't work (iOS sync bug), fallback domains handle it

### Null Safety Helpers

Add helper methods for safe field access:
```javascript
getTitle(item) {
    if (!item || !item.title) return 'Unknown';
    return item.title.english || item.title.pretty || item.title.japanese || 'Unknown';
}

getExt(type) {
    const map = { p: 'png', j: 'jpg', g: 'gif' };
    return map[type] || 'jpg';
}

getThumbUrl(mediaId) {
    return `https://t.nhentai.net/galleries/${mediaId}/thumb.jpg`;
}
```

### nhentai API Response Structure

**Search/Popular Response:**
```javascript
{
    "num_results": 11706,
    "num_pages": 469,
    "result": [
        {
            "id": 263511,
            "media_id": "1367411",
            "title": {
                "english": "English Title Here",
                "japanese": "Japanese Title Here",
                "pretty": "Pretty Title Here"
            },
            "images": {
                "cover": { "t": "j", "w": 350, "h": 493 },
                "thumbnail": { "t": "j", "w": 250, "h": 352 }
            },
            "tags": [ ... ],
            "num_pages": 24,
            "upload_date": 1550445627
        }
    ]
}
// IMPORTANT: title is an OBJECT with english/japanese/pretty, NOT a plain string
// IMPORTANT: field name is "result" (singular), NOT "results" (plural)
```

**Gallery Detail Response:**
```javascript
{
    "id": 263492,
    "media_id": "1367250",
    "title": {
        "english": "English Title",
        "japanese": "Japanese Title",
        "pretty": "Pretty Title"
    },
    "images": {
        "pages": [
            { "t": "p", "w": 1280, "h": 1803 },  // t = type: p=png, j=jpg, g=gif
            ...
        ],
        "cover": { "t": "p", "w": 350, "h": 493 },
        "thumbnail": { "t": "p", "w": 250, "h": 352 }
    },
    "scanlator": "",
    "upload_date": 1550445627,  // Unix timestamp in seconds
    "tags": [
        { "id": 1841, "type": "artist", "name": "artist name", "url": "/artist/.../", "count": 11888 },
        { "id": 1842, "type": "group", "name": "group name", ... },
        { "id": 1843, "type": "parody", "name": "parody name", ... },
        { "id": 1844, "type": "character", "name": "character name", ... },
        { "id": 1845, "type": "language", "name": "english", ... },
        { "id": 1846, "type": "category", "name": "doujinshi", ... }
    ],
    "num_pages": 24,
    "num_favorites": 0
}
```

## Implementation Checklist

- [ ] Class extends MProvider
- [ ] Constructor sets all required properties
- [ ] `getPopular` returns correct format with pagination
- [ ] `getLatestUpdates` returns correct format with pagination
- [ ] `search` properly URL-encodes the query
- [ ] `getDetail` extracts ID from URL correctly
- [ ] `getDetail` returns status as integer (1 for complete)
- [ ] `getDetail` converts upload_date to milliseconds
- [ ] `getPageList` returns array of full image URLs
- [ ] `getPageList` handles image extension mapping (p/j/g)
- [ ] Fallback domain logic implemented
- [ ] All methods use `this.currentApi` for base URL

## Testing Steps

1. **Create GitHub repo** named `mangayomi-extensions`
2. **Upload both files** (index.json and nhentai.js)
3. **Enable GitHub Pages:** Settings → Pages → Source: Deploy from main branch
4. **Wait 2 minutes** for GitHub Pages to deploy
5. **Get repo URL:** `https://YOUR_USERNAME.github.io/mangayomi-extensions/index.json`
6. **In Mangayomi app:**
   - Go to Browse → Extensions
   - Tap "Add Repository"
   - Paste the GitHub Pages URL
   - Tap "Add"
7. **Install extension:** Find nhentai in list, tap Install
8. **Test:** Browse → Sources → nhentai

## Common Issues to Avoid

1. **JSON must be valid** - Use a JSON validator for index.json
2. **JavaScript class syntax** - Must use `class Name extends MProvider`
3. **Return types matter** - Mangayomi expects exact shapes
4. **ID extraction** - URL regex must handle `/g/{id}` format
5. **Image extensions** - Map 'p' to 'png', 'j' to 'jpg', 'g' to 'gif'
6. **Date conversion** - Multiply upload_date by 1000 for milliseconds
7. **Status values** - Use integers: 0=ongoing, 1=complete, etc.

## Notes for Codex

- The extension runs in a **QuickJS sandbox**, NOT Node.js
- Only use the provided `Client` class for HTTP - do NOT use fetch(), XMLHttpRequest, or require()
- No external imports or require() calls allowed
- No `async/await` in constructor
- All async methods must return the exact object shapes specified above
- Do NOT return undefined from any method
- The extension class MUST be the LAST class defined in the file
- Class MUST extend MProvider: `class NHentai extends MProvider`
- Use `console.log()` for debugging (appears in Mangayomi console)
- Wrap every method body in try-catch and log errors
- `title` in nhentai API responses is an OBJECT `{english, japanese, pretty}`, never a plain string
- API search field name is `result` (singular), NOT `results` (plural)
- Image CDN domains (`i.nhentai.net`, `t.nhentai.net`) never change even when using mirror API domains
- `dateUpload` must be a STRING of milliseconds, not a number
- `status` must be an INTEGER (1 for complete)
- Always provide fallback values: `item.title.english || item.title.pretty || 'Unknown'`
- Keep `new Client()` calls inside each method, do not store client in constructor

## Codex Prompt

Use this prompt when giving this plan to Codex:

> Read plan.md fully. Implement TWO files:
> 1. `index.json` - copy the template exactly, replace YOUR_USERNAME with the actual GitHub username
> 2. `nhentai.js` - implement the full extension class following every specification in the plan
>
> Pay special attention to:
> - title is an OBJECT {english, japanese, pretty} not a string
> - API field is "result" (singular) not "results"
> - Image URLs always use i.nhentai.net regardless of fallback domain
> - dateUpload must be a string, not a number
> - Class must be last in file and extend MProvider
> - Add console.log debugging in catch blocks
> - Add null/undefined checks on all API field access
> - Implement ALL 6 Cloudflare handling layers from the plan:
>   1. Client config with verifyCertificates: false and timeout: 10
>   2. getHeaders() method returning User-Agent, Referer, Accept headers
>   3. isCloudflareBlock(res) detection checking 403/503 and body content
>   4. tryWithFallback() domain rotation (nhentai.net → nhentai.to → nhentai.xxx)
>   5. Check isCloudflareBlock BEFORE JSON.parse in every API method
>   6. hasCloudflare: true in index.json (enables WebView manual solve)

## Success Criteria

- [ ] Extension appears in Mangayomi after adding repo
- [ ] Can browse popular galleries
- [ ] Can search for specific galleries
- [ ] Can view gallery details
- [ ] Can read pages (images load)
- [ ] Falls back to mirror domains if primary is blocked
