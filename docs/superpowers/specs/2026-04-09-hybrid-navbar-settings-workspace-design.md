# Hybrid Navbar Settings Workspace Design

## Context

The current POS drawer now exposes a bottom `Settings` entry, but the opened surface is still a simple single-column action sheet. The desired interaction is closer to a settings workspace: discoverable from the left drawer, visually stronger like POSNext, and scalable like ERPNext with a category rail and a detail pane.

## Goals

- Keep `Settings` discoverable from the left drawer footer.
- Replace the simple action sheet with a larger two-pane settings workspace.
- Use a hybrid model:
  - POSNext-style strong modal shell and content cards
  - ERPNext-style left menu driving right detail content
- Make the surface scalable for future settings without cluttering the top menu.

## Non-Goals

- Replacing the top-right live status indicator.
- Moving every action in the app into settings immediately.
- Copying POSNext’s exact component structure or styling one-to-one.

## Proposed UX

### Shell

- Clicking drawer `Settings` opens a large centered modal workspace.
- The workspace uses a strong header with title, subtitle, and close action.
- The body uses a two-column layout on desktop:
  - left category rail
  - right detail pane
- On small screens, the left rail collapses into a horizontal category list or stacked mobile-friendly selector.

### Left Rail

Initial categories:

- `Offline & Sync`
- `Terminal & Devices`
- `Personal`
- `System / Diagnostics`

The first category opens by default. Clicking a category updates the right pane without leaving the modal.

### Right Pane

The right pane renders selected-category content as grouped cards/sections rather than a flat action list.

- `Offline & Sync`
  - refresh offline data
  - rebuild offline data
  - clear cache
  - view diagnostics
  - summary/status copy blocks where useful
- `Terminal & Devices`
  - customer display
  - future device/printer tools
- `Personal`
  - theme
  - future language/profile preferences
- `System / Diagnostics`
  - about
  - logout
  - future maintenance controls

## Architecture

- Keep drawer trigger ownership in `NavbarDrawer.vue`.
- Keep panel open/close state and action routing in `Navbar.vue`.
- Refactor `NavbarSettingsPanel.vue` into a workspace component:
  - receives categories/sections
  - manages active category UI
  - emits selected action ids back to `Navbar.vue`
- Reuse existing navbar action handlers instead of duplicating logic.

## Visual Direction

- Large modal shell with stronger header hierarchy, inspired by POSNext.
- Left rail should feel like navigation, not a list of buttons.
- Right pane cards should look like settings groups with room for future richer controls.
- Preserve current app visual language rather than introducing an unrelated design system.

## Testing

- Verify the workspace opens from drawer settings.
- Verify left rail categories render and switch active state.
- Verify right pane changes when category changes.
- Verify existing actions still emit through the navbar integration.
- Verify existing navbar regression tests and frontend build still pass.

## Cleanup

- Remove the temporary POSNext inspection clone after implementation.
- Remove temporary spec/plan docs for this feature after the final implementation is complete.

## Recommendation

Implement the hybrid settings workspace now by refactoring the existing settings panel into a large two-pane modal, keeping the drawer footer trigger and navbar-owned action handlers intact.
