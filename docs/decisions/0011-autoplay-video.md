# 0011 Feed videos autoplay, muted, only while on screen
**Status:** accepted, 2026-10-13

Native video posts play muted when 60% visible and pause when scrolled away. YouTube and Vimeo embeds start muted when scrolled into view. Nothing autoplays when the device asks to reduce motion, and native controls are always shown.

**Why:** the product is media-first and the owner asked for autoplay, as on LinkedIn.
**Guardrails (principle #4):** muted by default, no autoplay-next, no infinite video feed, reduced-motion respected.
**Trade-off:** native video means imnet hosts files (cost, moderation). For now only seed data uses native video; staff still post videos as links.
