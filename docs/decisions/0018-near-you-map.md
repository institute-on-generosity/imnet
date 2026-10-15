# 0018 Near you map: location stays in the browser
**Status:** accepted, 2026-10-15.

`/nearby` shows volunteer calls and needs, upcoming events and communities on a map around you (F-101).

**Privacy:** the browser asks for your location only when you tap "Use my location" (or uses it silently if you already allowed it for imnet). The position never leaves the browser: the server sends every mappable place once, and distances and filtering happen on the device. Before you share, the map centers on your profile city if we know it.
**Places:** a built-in `cities` table turns "City, ST" into coordinates (no outside geocoding service, no API key). Orgs and communities get coordinates from their location text by trigger; new events start at their org's spot. Places only as precise as a city; street addresses aren't geocoded.
**Map:** Leaflet with OpenStreetMap's standard tiles (attribution shown, no key), softened to grey so pins carry the color. Heavy traffic would need a tile provider with an agreement.
**Honest emptiness:** if nothing is within the chosen distance, the page says so and names the nearest place instead of padding the list.
**Not yet:** server-side radius queries (needed once there are thousands of places), street-level event locations, and community locations editable in the UI (set in data today).
