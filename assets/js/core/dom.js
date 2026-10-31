const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const $ = (selector, root = document) => root.querySelector(selector);
