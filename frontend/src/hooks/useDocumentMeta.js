import { useEffect } from "react";

const DEFAULT_TITLE = "ScrapConnect — Sell Your Scrap, Get Picked Up Fast";

function setMetaTag(name, content, attr = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets the document title, meta description, and robots directive for the
 * current page. Public pages (login, register) get `index, follow` so
 * search engines can surface them; authenticated/private pages should pass
 * `noindex: true` since their content is per-user and has no business being
 * in search results.
 *
 * @param {object} options
 * @param {string} options.title - shown in the browser tab and as the title tag
 * @param {string} [options.description] - meta description, also updates OG/Twitter
 * @param {boolean} [options.noindex] - true for private/authenticated pages
 */
export default function useDocumentMeta({ title, description, noindex = false }) {
  useEffect(() => {
    document.title = title ? `${title} · ScrapConnect` : DEFAULT_TITLE;

    if (description) {
      setMetaTag("description", description);
      setMetaTag("og:title", title || DEFAULT_TITLE, "property");
      setMetaTag("og:description", description, "property");
      setMetaTag("twitter:title", title || DEFAULT_TITLE);
      setMetaTag("twitter:description", description);
    }

    setMetaTag("robots", noindex ? "noindex, nofollow" : "index, follow");

    // No cleanup: the next page's own useDocumentMeta call overwrites these
    // on mount, and a stale tag lingering for one tick during navigation
    // causes no real harm.
  }, [title, description, noindex]);
}