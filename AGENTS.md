# Mangayomi Extensions Repository

## Critical Constraints

- **QuickJS runtime only** (NOT Node.js) - no `require()`, no npm imports, no external modules
- Only the built-in `Client` class for HTTP requests: `new Client(config?)`
- **Extension class MUST be the last class defined** in each `.js` file
- All classes must extend `MProvider`

## Required Class Structure

```javascript
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.clientConfig = {
            verifyCertificates: false,
            timeout: 10
        };
    }

    // Required methods
    async getPopular(page) { }
    async getLatestUpdates(page) { }
    async search(query, page, filters) { }
    async getDetail(url) { }
    async getPageList(url) { }
    getFilterList() { }
}
```

## Standard Return Shapes

### List methods (getPopular, getLatestUpdates, search)
```javascript
{ list: [{ name, link, imageUrl }], hasNextPage: boolean }
```

### getDetail
```javascript
{
    name, link, imageUrl, description,
    author, artist, genre: [],
    status: 1,  // 0=ongoing, 1=complete, 5=unknown
    chapters: [{ name: "Read (X pages)", url, scanlator, dateUpload }]
}
```
- `dateUpload` must be a **string** of milliseconds, not a number
- `status` must be an **integer**

### getPageList
```javascript
["https://cdn.example.com/page1.jpg", ...]  // Array of image URLs
```

## Common Helper Functions

All extensions use these patterns (do not rewrite):
- `safeString(value)` - null/undefined to ""
- `stripTags(value)` - HTML to plain text
- `decodeHtml(value)` - HTML entities decoding
- `firstMatch(text, regex)` - regex capture group or ""
- `stringifyError(error)` - extract error message

## HTTP Patterns

```javascript
// Client usage
const client = new Client(this.clientConfig);
const res = await client.get(url, headers);
// res.body, res.statusCode

// Standard headers
{
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
    "Referer": baseUrl + "/",
    "Accept": "text/html,application/xhtml+xml..."
}
```

## Cloudflare Handling

Detect block by checking response status (403/429/503) AND body content:
```javascript
function isCloudflareBlocked(response) {
    const body = safeString(response.body).toLowerCase();
    return body.indexOf("cf-browser-verification") !== -1 ||
           body.indexOf("/cdn-cgi/challenge-platform/") !== -1;
}
```

## Repository Deployment

- `index.json` lists all extensions with metadata
- Extensions are served via GitHub Pages from raw GitHub URLs
- `sourceCodeUrl` in index.json points to the raw file URL
- `sourceCodeLanguage: 1` = JavaScript

## Filter Format

```javascript
getFilterList() {
    return [{
        type_name: "SelectFilter",
        type: "filter_key",
        name: "Display Name",
        values: NHENTAI_PARODIES.map(o => ({
            type_name: "SelectOption",
            name: o.name,
            value: o.value
        }))
    }];
}
```

## Anime Extensions (itemType: 1)

Use `getVideoList(url)` instead of `getPageList(url)`. Return:
```javascript
[{ url, quality: "Sub - server1 720p", originalUrl }]
```

## Extension Class Naming

- Use `class DefaultExtension extends MProvider` (not `class Name extends MProvider`)
- The actual extension name comes from `index.json`

## Debugging

- Use `console.log("[extension] message")` - output appears in Mangayomi console
- Wrap all async methods in try-catch and call `this.logError()`
