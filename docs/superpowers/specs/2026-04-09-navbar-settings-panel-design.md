# Navbar Settings Panel Design

## Context

The POS navbar currently exposes navigation routes in the left drawer and mixes operational or maintenance actions across the top menu and status surfaces. The user wants a stable, scalable place for settings that is visible from the left side of the app and can hold future settings without overloading the existing menu.

## Goals

- Add a visible `Settings` entry to the left navigation drawer.
- Keep the drawer primarily focused on navigation links.
- Provide a scalable surface for offline, terminal, personal, and diagnostics settings.
- Avoid disrupting the active POS session or invoice workflow.

## Non-Goals

- Full migration of every existing action into a separate full-page settings route.
- Replacing the existing top-right offline status panel in this change.
- Reworking the entire navbar information architecture.

## Proposed UX

### Drawer

- Keep the existing route-based drawer items unchanged.
- Add a border-separated footer area at the bottom of the drawer.
- Render a `Settings` item in that footer area so it remains visually distinct from route navigation.

### Settings Surface

- Clicking `Settings` opens a dedicated settings sheet/dialog rather than expanding inline drawer actions.
- The drawer should close when the settings surface opens so focus is clear.
- The settings surface must be lightweight and non-destructive to the active cart or current route state.

### Initial Sections

- `Offline & Sync`
  - Refresh Offline Data
  - Rebuild Offline Data
  - Clear Cache
  - View Data Diagnostics
- `Terminal & Devices`
  - Existing low-frequency device and terminal actions that fit this grouping
- `Personal`
  - Theme, language, and similar user-specific preferences
- `System / Diagnostics`
  - About and low-frequency system information/actions

## Architecture

- Extend `NavbarDrawer.vue` to support a dedicated footer settings action.
- Add a new `NavbarSettingsPanel` component owned by `Navbar.vue`.
- `Navbar.vue` remains the orchestration layer:
  - opens/closes the settings panel
  - closes the drawer before opening the panel
  - routes panel actions to the same existing handlers already used for offline/status/menu actions
- Keep the top-right status panel intact for status visibility. The new settings panel becomes the stable home for discoverable settings and maintenance actions.

## Migration Boundary

- This change is incremental.
- Only the drawer footer entry and new panel are introduced now.
- Existing handlers should be reused instead of duplicating business logic.
- Low-frequency settings actions can move out of `NavbarMenu` into the panel during this change where it improves clarity.

## Testing

- Add or update tests to verify:
  - drawer renders the footer settings entry
  - clicking the settings entry emits or opens the panel
  - offline/settings actions appear in the settings panel
  - existing navbar and drawer route behavior remain intact

## Risks

- Duplicating actions across menu and settings panel can create confusion if ownership is unclear.
- Drawer footer layout can regress on smaller screens if not tested.
- Moving too many actions at once can change cashier muscle memory unnecessarily.

## Recommendation

Implement the dedicated drawer footer `Settings` entry plus `NavbarSettingsPanel` now, keep the status panel for live status, and migrate only low-frequency settings/maintenance actions into the new panel in this first pass.
