import { useMemo } from 'react'

export default function RichText({ html, className = '' }) {
    const safeHtml = useMemo(() => {
        const document = new DOMParser().parseFromString(html || '', 'text/html')
        const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'S', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'SPAN'])
        document.body.querySelectorAll('script, style, iframe, object, embed, form, svg, math, template').forEach(node => node.remove())
        document.body.querySelectorAll('*').forEach(node => {
            if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); return }
            const href = node.tagName === 'A' ? node.getAttribute('href') : null
            Array.from(node.attributes).forEach(attribute => node.removeAttribute(attribute.name))
            if (href && /^https?:\/\//i.test(href)) { node.setAttribute('href', href); node.setAttribute('rel', 'noopener noreferrer') }
        })
        return document.body.innerHTML
    }, [html])
    return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
