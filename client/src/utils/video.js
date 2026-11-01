export function youtubeId(value) {
    try {
        const url = new URL(value)
        const host = url.hostname.replace(/^www\./, '')
        let id
        if (host === 'youtu.be') id = url.pathname.split('/')[1]
        if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
            id = url.searchParams.get('v') || (/^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null)
        }
        return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null
    } catch { return null }
}
