import { useEffect } from "react";

export const SITE_URL = "https://prodxstore.com";
const DEFAULT_IMAGE = "https://creatorflowai.prodxstore.com/walkthroughs/video.jpg";

const setTag = (selector, attrs) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith("link") ? "link" : "meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
};

// Per-route title, description, canonical and share-card tags (read by Google and prerendered crawlers).
export const usePageMeta = ({ title, description, path = "/", image = DEFAULT_IMAGE, type = "website" }) => {
  useEffect(() => {
    if (!title) return;
    const url = `${SITE_URL}${path}`;
    const img = image?.startsWith("/api/") ? `${SITE_URL}${image}` : image || DEFAULT_IMAGE;
    document.title = title;
    setTag('meta[name="description"]', { name: "description", content: description });
    setTag('link[rel="canonical"]', { rel: "canonical", href: url });
    setTag('meta[property="og:type"]', { property: "og:type", content: type });
    setTag('meta[property="og:title"]', { property: "og:title", content: title });
    setTag('meta[property="og:description"]', { property: "og:description", content: description });
    setTag('meta[property="og:url"]', { property: "og:url", content: url });
    setTag('meta[property="og:image"]', { property: "og:image", content: img });
    setTag('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    setTag('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    setTag('meta[name="twitter:image"]', { name: "twitter:image", content: img });
  }, [title, description, path, image, type]);
};
