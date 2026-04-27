# ARREO App — UI Kit

## Overview
Interactive prototype of the ARREO web dashboard app. Covers the main flows for both **Ganadero** (rancher) and **Transportista** (carrier) roles.

## Screens
1. **Login** — dark (Verde Bosque) background, orange CTA
2. **Dashboard** — metrics overview, recent trips
3. **Mis Viajes** — trip list with status filters
4. **Seguimiento** — live tracking mockup
5. **Disponibilidades** — carrier availability board

## Components
- `Sidebar.jsx` — navigation sidebar (collapsible)
- `TripCard.jsx` — trip card (available / active / completed states)
- `Header.jsx` — top header bar with user info
- `StatusBadge.jsx` — semantic status chip

## Usage
Open `index.html` to see the interactive prototype. Click nav items to switch screens.

## Notes
- Font: DM Sans (Google Fonts) — substitute for General Grotesk
- Icons: Lucide (CDN) — substitute for ARREO's own icon set (none provided)
- All data is mock/fake
