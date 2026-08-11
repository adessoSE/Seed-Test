# Seed-Test Task Board

> **Master note**: Before dispatching new workers, always check this board. Prioritise "Test Needed" items first, then highest-priority Open items. Scopes live in `workers/`, lifecycle in `tasks/`.

## Legend
| Status | Meaning |
|---|---|
| ✅ Done | Committed or user-confirmed |
| 🔄 Test Needed | Worker done — awaiting user verification |
| 🟡 Open / 🟡 High / 🟡 Blocker | Scoped, not dispatched |
| ❌ Rejected | Changes reverted |
| 🔴 Bug | User-reported, needs triage/scoping |

## Done

| # | Task | Type | User-Confirmed |
|---|---|---|---|
| ✅ 001 | File Manager template fix | Bugfix | ✅ |
| ✅ 002 | Group create ObjectId fix | Bugfix | ✅ |
| ✅ 003 | Stories drag & drop cdkDrag | Bugfix | ✅ |
| ✅ 004 | Story numbering fallback | Bugfix | ✅ |
| ✅ 007 | Background Tab fallback | Bugfix (Worker 1) | ✅ |
| ✅ 008 | Help Hover opacity | Bugfix (Worker 2) | ✅ |
| ❌ 009 | Account Management fixes | Bugfix (Worker 3) | ❌ Reverted |
| ✅ 011 | UIkit pass 1: icons/tooltips/dropdowns | Migration | ✅ |
| ✅ 012 | Navbar fix + Help hover | Migration | Accepted |

## Test Needed (Worker said fixed)

| # | Task | Latest Update |
|---|---|---|
| 🔄 005 | Story drag endpoint | Worker added Zod schema — **user reports STILL 400** ❌ |
| 🔄 013 | Tooltip rechts | Worker done — never tested |
| 🔄 014 | Editor-Dropdowns | Worker done — never tested |

## Open (Migration Backlog)

| # | Task | Prio | Notes |
|---|---|---|---|
| 🟡 015 | uk-card → mat-card | High | 18 occ in 6 files |
| 🟡 016 | uk-form-* → mat-form-field | High | 43 occ in 16 files |
| 🟡 017 | uk-steps → CSS steps | Med | 2 occ in base-editor |
| 🟡 018 | uk-list + uk-button-group → CSS | Med | 8 occ |
| 🟡 019 | uk-flex + uk-search → CSS | Low | 2 occ |
| 🟡 020 | uk-switcher → mat-tabs | **Blocker** | Last UIKit JS directive |
| 🟡 021 | Remove UIKit JS from angular.json | High | After #020 |

## Active Bugs (2026-08-10)

| # | Bug | Component | Severity | Note |
|---|---|---|---|---|
| 🔴 005 | Story drag PUT → 400 | story.backend | **High** | Worker added Zod schema, still 400 |
| 🔴 022 | Help dropdown flickers | app.component | Medium | Worker attempted fix, user says still flickers |
| 🔴 026 | Story selection: wrong description shown | stories-bar | **High** | Must switch stories twice to update description — Worker fix was insufficient |
| 🔴 028 | Add-step button positioned left, overlaps | base-editor | Medium | Migration regression |
| 🔴 029 | File upload POST → 400 | file.backend | **High** | Worker said "no fix needed" — needs re-investigation |
| 🔴 030 | Groups: can't open/execute/edit | groups (all) | **Critical** | Worker's mergeById fix may have broken more. User: "funktionieren gar nicht mehr" |
| 🔴 035 | Save Project: `aiConfig.textPreparation` undefined | project-settings | **High** | Worker fixed Zod, but runtime error persists — frontend crashes on undefined access |
| 🔴 037 | Story numbering: duplicate "1" | stories-bar | Medium | Index fallback collides with real issue_number=1 |
| 🔴 038 | Logout/Login: old repoid cached → 403 | routing | **High** | localStorage `id` not cleared on logout |
| 🟡 033 | Transfer Ownership: wrong owner | account-mgmt | Medium | |
| 🟡 034 | Members: owner not shown | account-mgmt | Low | |
| 🟡 036 | Back button endless loading | routing | **High** | Worker fix added guards — still needs test |
| 🟡 024 | Version bump to 2.0.0 | meta | Low | |
| 🟡 025 | Story hover highlight only to name | stories-bar | Low | |
| 🟡 027 | Add-step modal dark mode | base-editor | Medium | |
| 🟡 032 | AI Config visible when unavailable | project-settings | Low | Worker claimed fixed — needs test |

## Architecture

| # | Task | Prio | Notes |
|---|---|---|---|
| 🟡 039 | Shared Zod Schemas + Frontend API Client | **High** | Fixes root cause of 44% of bugs. Move schemas to `shared/schemas/`, typed client in frontend. See `tasks/039-api-shared-schemas.md`. |

## Key changes since last update

- **#030/#035/#026/#022**: Worker attempted fixes, user reports they're STILL broken — need re-dispatch with more context
- **#031**: Worker's mergeById immutable fix may have made groups completely unusable — **top priority**
- **#038**: New — logout doesn't clear localStorage repoId → 403 on re-login
- **#029**: Worker dismissed as "no fix needed" but user still sees 400 — needs fresh investigation
