# OmniPlay Architectural Transfer Blueprint

> Source: Full analysis of 12 documentation files across `/docs/frontend/`, `/docs/backend/`, and `/docs/shared/` in the Lilith project.

---

## 1. Core Architectural Patterns Identified

### Feature-First Folder Structure (Domain-Driven Organization)
**How implemented:** Code is organized by domain feature — `characters/`, `chat/`, `settings/`, `media/`, `onboarding/`, `account/` — not by technical role. Each feature owns its own routes file (`chat.routes.ts`), state container (`chat.state.ts`), components, and services. The top-level split is `core/` (singleton infrastructure) / `shared/` (pure UI + utilities) / `features/` (domain logic).
**Why it worked:** Adding or removing a feature is bounded. Nothing leaks sideways. Grep for a feature name and you find everything it owns.
**Problem solved:** Prevents "scattered ownership" — the failure mode where one feature's logic is distributed across `/components`, `/services`, and `/stores` simultaneously with no clear home.
**Source:** `frontend-architecture-lilith.md`, `conventions-lilith.md`

---

### Signal-First State Design
**How implemented:** Angular Signals are the primary reactive primitive. Each feature has one `feature.state.ts` injectable class. Internal signals are `private`; components receive `.asReadonly()` projections only. `computed()` handles all derived state. `effect()` handles side effects (persistence, logging, navigation) only — never for deriving state. RxJS is used only for HTTP streams, debouncing, and long-lived async flows. `toSignal()` bridges observables at the boundary.
**Why it worked:** Synchronous mental model. No subscription lifecycle to manage. Fine-grained reactivity. State is explicit — you can always trace where it lives and who mutates it.
**Problem solved:** Eliminates subscription leaks, hidden data flow, and the `BehaviorSubject`-everywhere pattern where every piece of state is a stream that must be subscribed and unsubscribed manually.
**Source:** `state-management.md`, `frontend-architecture-lilith.md`

---

### Read-Only Signal Exposure from State Containers
**How implemented:** State containers expose only `.asReadonly()` signals externally. Internal write signals are `private`. Methods on the state class are the only mutation surface. Explicitly prohibited: exposing writable signals from stores.
**Why it worked:** Unidirectional data flow enforced at compile time. A component cannot accidentally write directly to state — it must call a named method.
**Problem solved:** Prevents "who mutated this?" debugging sessions. All state changes are traceable to explicit method calls.
**Source:** `state-management.md`

---

### Three-Layer Backend Architecture
**How implemented:** Strict pipeline: `Controller → Service → Data Access`. Controllers handle HTTP request/response translation only. Services own domain logic, validation, and orchestration. Data access layer (repositories or model adapters) owns all DB interaction. Raw DB calls in controllers are explicitly prohibited.
**Why it worked:** Each layer has one job. Services can be unit-tested without HTTP or DB setup.
**Problem solved:** Prevents "fat controller" (business logic in HTTP handlers) and "service that's a query dump" (no real abstraction between HTTP and DB).
**Source:** `backend-architecture-lilith.md`

---

### Repository / Adapter Boundary for Data Access
**How implemented:** Services call repositories or model adapters — not raw DB queries. The repository encapsulates DB logic, allowing the persistence layer to swap (in-memory → SQLite → Postgres) without touching service code.
**Why it worked:** Decouples business logic from ORM implementation. Storage migration is a repository swap, not a service rewrite.
**Problem solved:** Prevents hard-coded ORM calls scattered across services that make storage migration a full-codebase refactor.
**Source:** `backend-architecture-lilith.md` (Database Strategy section)

---

### Three Component Type Taxonomy
**How implemented:** Every component is one of three types:
- **Feature Components** (smart): inject state containers or core services, coordinate domain logic and navigation, orchestrate child components. No direct UI styling concerns.
- **Presentational Components** (pure UI): receive data via `input()`, emit events via `output()`. No service or state injection. Highly reusable.
- **Layout Components** (structure): define page structure only. No domain logic, no feature state.

**Why it worked:** Presentational components are reusable and testable in isolation. Feature components are bounded domain controllers.
**Problem solved:** Prevents the "god component" failure — a list item that knows about auth, routing, API calls, and rendering simultaneously.
**Source:** `components-lilith.md`

---

### Dependency Direction Rules
**How implemented:** Features depend on `core/` and `shared/` — never on each other directly. Cross-feature coordination happens via core services or shared state containers. Explicitly stated: "Components must never import another feature's state directly."
**Why it worked:** Prevents circular dependencies and lateral coupling that compound over time into unmaintainable import graphs.
**Problem solved:** Eliminates "I just need to import one thing from that other feature" drift that creates a web of hidden cross-feature dependencies.
**Source:** `frontend-architecture-lilith.md`, `components-lilith.md`

---

### Explicit Request Pipeline (Ordered Middleware)
**How implemented:** Request flow is a strict ordered pipeline:
`CORS → Rate Limiting → Body Parsing → Route Matching → Auth → Content Mode → Validation → Controller → Service → Data Access → Response`

Each concern has exactly one position. No per-handler duplication of middleware.
**Why it worked:** A new route inherits all pipeline concerns automatically. No handler can "forget" auth — it's in the pipeline position.
**Problem solved:** Avoids "I forgot to add auth to this endpoint" and scattered per-handler safety logic.
**Source:** `backend-architecture-lilith.md`

---

### Domain-First Data Modeling with First-Class Safety Fields
**How implemented:** Every data model touching content (Message, MemoryItem, ChatSession, MediaAsset, Character) carries `contentMode` as a first-class field — not metadata or a tag. Enums are shared across layers. Models include explicit index guidance alongside the schema definition.
**Why it worked:** Safety constraints are queryable and auditable at the data level, not just enforced in application code.
**Problem solved:** Prevents content mode from being "enforced" only in application logic, which can be bypassed or forgotten in a new code path.
**Source:** `data-models-lilith.md`

---

### Standard API Response Envelope
**How implemented:**
```json
{ "success": true, "data": {}, "message": "optional" }
{ "success": false, "error": "message", "statusCode": 400 }
```
Error handling centralized in a single error middleware. Custom error types map to HTTP status codes (`ValidationError → 400`, `UnauthorizedError → 401`, `ForbiddenError → 403`, `NotFoundError → 404`).
**Why it worked:** Frontend never guesses response shape. Error handling is one code path, not N per-endpoint.
**Problem solved:** Eliminates inconsistent API responses where some endpoints return `{ error }`, others `{ message }`, others raw status codes.
**Source:** `api-design-lilith.md`, `backend-architecture-lilith.md`

---

### Explicit MVP Scope with Named Deferrals
**How implemented:** Every architecture doc has a "Non-Goals (MVP)" or "Deferred" section with named, specific features. `PROJECT_OVERVIEW.md` has a dedicated "MVP v0.1 – Success Criteria" section with a positive success list and an explicit "Out of Scope for MVP v0.1" list. Features like For You algorithm, Community worlds, NSFW rail, rollback, action formatting, and AI image generation are explicitly named as deferred — not vaguely acknowledged.
**Why it worked:** Deferred features are documented, not forgotten or accidentally included. Prevents "what about X?" from becoming "let's add X now."
**Problem solved:** Keeps Phase 1 focused. Prevents premature abstraction for features that don't exist yet.
**Source:** `PROJECT_OVERVIEW.md`, `frontend-architecture-lilith.md`, `api-design-lilith.md`, `data-models-lilith.md`

---

### Privacy / Isolation as a Hard Architectural Constraint
**How implemented:** Bot Instances (per-user conversation timelines) are isolated at the data model level — separate `ChatSession`, `MemoryItem`, and `Message` records per user. No cross-user memory or behavior leakage is architecturally possible. "No conversation data, memory, or state is ever shared between users" is a product non-negotiable stated in the project overview.
**Why it worked:** Isolation is enforced by data structure, not application code convention that can be accidentally bypassed.
**Problem solved:** Prevents "shared state creep" where caching or convenience shortcuts start leaking user data between sessions.
**Source:** `PROJECT_OVERVIEW.md`, `data-models-lilith.md`

---

## 2. Structural Conventions Worth Porting

### File Naming Conventions
**Source:** `conventions-lilith.md`

| File Type | Convention | OmniPlay Example |
|---|---|---|
| Components | `.component.ts/.html/.css` | `track-card.component.ts` |
| Feature state | `.state.ts` | `player.state.ts` |
| Services | `.service.ts` | `library.service.ts` |
| Routes | `.routes.ts` | `player.routes.ts` |
| Tests | `.spec.ts` | `player.state.spec.ts` |

Apply immediately to all new files. Do not rename existing files for its own sake.

---

### Variable and Constant Naming
**Source:** `conventions-lilith.md`, `code-style-lilith.md`

- `camelCase` — variables and functions
- `PascalCase` — classes and interfaces
- `UPPER_SNAKE_CASE` — constants
- Boolean signals prefixed: `isLoading`, `hasError`, `canPlay`, `isBuffering`
- All magic numbers replaced with named constants: `const DEBOUNCE_MS = 300;`

---

### Component Internal Structure Order
**Source:** `conventions-lilith.md`, `components-lilith.md`

```
1. Dependency injection
2. Input signals
3. Output events
4. Local state
5. Computed values
6. Lifecycle hooks
7. Public event handlers
8. Private helpers
```

Apply to new components. Do not reorder existing ones unless already editing.

---

### Import Order Priority
**Source:** `conventions-lilith.md`, `code-style-lilith.md`

```
1. Framework core
2. Third-party libraries
3. Application-absolute imports
4. Relative imports
```

Enforce via ESLint rule. Single config change.

---

### Feature Folder Structure
**Source:** `frontend-architecture-lilith.md`, `conventions-lilith.md`

```
src/app/
├── core/          # Singleton infrastructure, guards, interceptors, API clients
├── shared/        # Reusable UI, layout primitives, pure utils
│   ├── ui/
│   ├── layout/
│   └── utils/
├── features/      # One folder per domain
│   ├── player/
│   ├── library/
│   ├── queue/
│   └── settings/
└── models/        # Shared TypeScript interfaces and enums
```

Apply to new features immediately. Do not restructure existing code — let new additions set the pattern.

---

### Backend Service-Per-Domain Structure
**Source:** `backend-architecture-lilith.md`, `conventions-lilith.md`

Each domain gets: one routes file, one controller, one service. No cross-service lateral calls. Shared concerns live in `middleware/`. Same naming: `player.routes.js`, `player.controller.js`, `player.service.js`.

---

### Git and Commit Conventions
**Source:** `conventions-lilith.md`

- Branches: `feature/*`, `fix/*`, `refactor/*`, `docs/*`
- Commits: `<type>: <description>` — types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

Zero code impact. Apply immediately.

---

### CSS Variable-Based Design Tokens
**Source:** `ui-ux-guidelines.md`, `code-style-lilith.md`

All colors, spacing, typography, shadows, radii, breakpoints, and timing functions defined as CSS custom properties on `:root`. No hardcoded hex or pixel values in component styles. BEM-like class naming (`block__element--modifier`).

---

### Accessibility Baseline
**Source:** `ui-ux-guidelines.md`

- Semantic HTML over `<div>` soup
- `aria-label` on all icon-only buttons
- `role="status" aria-live="polite"` on loading state containers
- `aria-describedby` + `aria-invalid` for form validation errors
- `*:focus-visible` outline always visible and on-brand
- Minimum 44px touch targets
- Never convey information through color alone

Apply as new UI components are built.

---

### Cursor-Based Pagination
**Source:** `api-design-lilith.md`

List endpoints return `{ items: [], nextCursor: string | null }`. Clients pass `cursor` + `limit` query params. Sorting fields allow-listed on the backend.

Apply when library or playlist listing endpoints are built at real scale.

---

### Route Data for Metadata
**Source:** `routing.md`

```ts
{ path: 'player', data: { title: 'Now Playing', requiresAuth: true } }
```

Attach static metadata to route config — not hardcoded in component `ngOnInit`.

---

### Lazy-Loading by Feature
**Source:** `routing.md`, `frontend-architecture-lilith.md`

All feature routes use `loadChildren` or `loadComponent`. Guards use functional form (`CanActivateFn`). No class-based guards.

---

### Code Comments — Why, Not What
**Source:** `conventions-lilith.md`

```ts
// ✅ Delay prevents rapid duplicate submissions
const SEND_DELAY_MS = 300;

// ❌ Set delay to 300ms
const SEND_DELAY_MS = 300;
```

JSDoc on public APIs and utility functions only.

---

### Effect / Cleanup Pattern
**Source:** `state-management.md`

Effects that create timers or subscriptions use `onCleanup()`:
```ts
effect((onCleanup) => {
  const id = setTimeout(() => doWork(), delay);
  onCleanup(() => clearTimeout(id));
});
```

Apply whenever an effect creates a side resource.

---

## 3. Anti-Patterns Avoided in That System

### Fat Controllers
Business logic in controllers is explicitly prohibited. Controllers translate HTTP ↔ service calls only.
**Source:** `backend-architecture-lilith.md`

### God Components
The three-component-type taxonomy structurally prevents any component from mixing rendering, state management, routing, and API calls.
**Source:** `components-lilith.md`

### Lateral Service Coupling
Services do not call other services directly. Cross-domain coordination is an explicit orchestration concern, not hidden inside a service.
**Source:** `backend-architecture-lilith.md`

### Global State for Everything
Feature-scoped state stays in feature state containers. `providedIn: 'root'` reserved for cross-cutting concerns (auth, theme, session) only.
**Source:** `state-management.md`, `frontend-architecture-lilith.md`

### Writable Signals Exposed from Stores
```ts
// Prohibited
items = signal([]);  // public + writable

// Required
private itemsSignal = signal([]);
items = this.itemsSignal.asReadonly();
```
**Source:** `state-management.md`

### Effects for Derived State
`effect()` for setting other signals is prohibited. All derived state uses `computed()`.
**Source:** `state-management.md`

### Direct Signal Mutation
```ts
// Prohibited
items().push(newItem);

// Required
items.update(list => [...list, newItem]);
```
**Source:** `state-management.md`

### Scattered Safety Checks
Content mode enforcement is a middleware layer — a new route cannot forget it.
**Source:** `backend-architecture-lilith.md`

### Magic Numbers
All meaningful numeric or string values are named constants.
**Source:** `code-style-lilith.md`

### Hardcoded URLs in Navigation
All navigation uses `router.navigate(['/path'])` — never `window.location.href`.
**Source:** `routing.md`

### Premature Abstraction / Pre-Building for Hypothetical Futures
Non-goals are documented explicitly. Building for hypothetical future requirements is treated as a defect, not a virtue.
**Source:** `PROJECT_OVERVIEW.md`, `frontend-architecture-lilith.md`

### Linting Disabled to "Make Something Work"
ESLint and Prettier rules are never bypassed to resolve a build issue.
**Source:** `code-style-lilith.md`

### Circular Signal Dependencies
```ts
// Prohibited — creates infinite loop
const b = computed(() => a() + c());
const c = computed(() => b() + 1);
```
**Source:** `state-management.md`

---

## 4. Direct Portability Assessment to OmniPlay

| Pattern | Apply When | Method |
|---|---|---|
| Feature-first folder structure | **Now** | Apply to any new feature going forward |
| Read-only signal exposure from state | **Now** | Enforce in all new state containers |
| Feature state containers per domain | **Now** | Create `player.state.ts`, `queue.state.ts`, `library.state.ts` |
| Standard API response envelope | **Now** | Wrap all new endpoints; retrofit existing passively |
| Three-layer backend | **Now** | Enforce for new domains |
| Service ownership boundaries (no lateral) | **Now** | Enforce going forward |
| Component type classification | **Now** | Classify existing; enforce on new components |
| Dependency direction rules | **Now** | ESLint rule or code review convention |
| File naming conventions | **Now** | Apply to new files only |
| Import order enforcement | **Now** | Single ESLint config change |
| Git + commit conventions | **Now** | Zero code impact |
| CSS variable design tokens | **Now** | Verify existing tokens match naming |
| Explicit non-goals documentation | **Now** | Writing exercise only |
| Accessibility baseline | **Now** | Enforce on new UI components |
| Named constants (no magic numbers) | **Now** | Enforce going forward |
| Functional route guards | **Now** | Apply for any new guards |
| Lazy-loading by feature | **Now** | Apply for any new routes |
| Route data for metadata | **Now** | Apply for any new route definitions |
| Effect cleanup pattern | **Now** | Apply whenever an effect creates a timer/subscription |
| Repository / adapter for DB | **Gradual** | Add when first DB swap scenario appears |
| Cursor-based pagination | **Gradual** | Apply when listing endpoints hit real scale |
| Normalized state pattern | **Gradual** | Apply when entities need efficient by-ID lookup |
| Route resolvers for pre-loading | **Gradual** | Apply when route transitions need pre-fetched data |
| Structured logging (tagged, privacy-aware) | **Gradual** | Apply when moving toward production deployment |
| Domain-first `contentMode` on models | **Post-Phase 1** | Only if OmniPlay introduces content gating |
| Full ordered middleware pipeline | **Post-Phase 1** | Adopt incrementally as production needs emerge |
| Consent state model | **Post-Phase 1** | Only if OmniPlay has a consent-gated feature |
| Moderation event audit trail | **Post-Phase 1** | Only if moderation is a product requirement |

---

## 5. Safe Incremental Improvements for OmniPlay

All additive. No existing working code is rewritten.

**1. Create `/docs` folder with architecture docs**
Mirror the Lilith structure: `frontend-architecture.md`, `api-design.md`, `conventions.md`, `state-management.md`. Writing forces architectural clarity. Zero code changes.

**2. Create `GLOSSARY.md` for OmniPlay domain terms**
Define: `track`, `queue`, `session`, `provider`, `adapter`, `library`, `playlist`. Aligns frontend + backend vocabulary. Zero code changes.

**3. Add non-goals section to every active spec or plan**
List what is explicitly out of scope for Phase 1. Makes scope boundary visible and enforceable.

**4. Create isolated state containers per domain**
Add `player.state.ts`, `queue.state.ts`, `library.state.ts` with private writable signals and public `.asReadonly()` exposure. Components can migrate to them incrementally — no existing component must change.

**5. Adopt the standard API response envelope on all new endpoints**
`{ success, data, message }` / `{ success, error, statusCode }`. Retrofit existing endpoints at the controller level when next touched — no service changes needed.

**6. Add `constants.ts` per feature**
Extract hardcoded values (buffer sizes, retry limits, polling intervals, debounce delays) into named constants. No logic changes.

**7. Classify existing components as Feature / Presentational / Layout**
Review pass only — no code changes. Creates shared vocabulary for future reviews and identifies responsibility drift.

**8. Stop adding new cross-feature imports**
Do not move existing imports. If Feature A needs something from Feature B, route it through `core/` or `shared/`. One ESLint rule; zero migrations required today.

**9. Add `*:focus-visible` CSS outline globally**
One CSS rule. Immediate accessibility improvement across the entire app.

**10. Adopt commit type convention**
`feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`. Zero code impact.

**11. Add `aria-label` to all icon-only interactive elements**
One attribute per element when next encountered. No refactor needed.

**12. Add `role="status" aria-live="polite"` to loading state containers**
Apply when next touching a loading state component.

**13. Add a health check endpoint**
`GET /health` — returns `{ status: 'ok' }`. One route, zero business logic. Immediately useful for deployment verification.

---

## 6. Red Flags

### Angular-Specific Patterns Are Not Portable as Code
`state-management.md`, `routing.md`, and `components-lilith.md` contain Angular-specific APIs: `signal()`, `computed()`, `effect()`, `input()`, `output()`, `inject()`, `@Component`, `loadChildren`, `CanActivateFn`, `toSignal()`. If OmniPlay uses React, Vue, or another framework, the **concepts** are portable — the **API surface** is not. Do not copy Angular syntax into a non-Angular codebase.

### The "Store" Naming Conflict
Lilith renames "store" to "Feature State Container" specifically to avoid ecommerce confusion. OmniPlay should define its own term — do not import Lilith's terminology wholesale if it conflicts with OmniPlay's domain language.

### Three-Component Taxonomy Only Works with Enforcement
Feature / Presentational / Layout holds only if enforced at review time or via lint. Without that, it becomes a meaningless label under deadline pressure.

### Repository Pattern Adds Premature Abstraction Cost
If OmniPlay has a single, stable data source with no planned swap, adding a full repository abstraction layer is over-engineering. Apply when the swap scenario is concrete and near.

### SFW-First Safety Architecture is Entirely Domain-Specific
The content mode enforcement system — `contentMode` on every model, content mode middleware, `ConsentState`, `ModerationEvent`, SFW-only API enforcement — is specific to Lilith's AI character roleplay domain. Porting this to OmniPlay without an equivalent content gating requirement adds significant complexity with zero product value.

### Full Middleware Pipeline is Heavy for Local-First MVP
The complete ordered middleware stack (CORS → rate limiting → body parsing → auth → content mode → validation → controller) is production multi-user infrastructure. OmniPlay Phase 1 local-first MVP does not need all of this up front. Add middleware incrementally as production requirements emerge.

### Cursor Pagination is Premature at Small Scale
Cursor pagination is correct for large datasets. If OmniPlay Phase 1 operates on a local library with hundreds (not millions) of items, offset pagination or full-list responses are simpler and entirely adequate. Apply when scale justifies it.

### Do Not Port the Lilith Glossary Verbatim
`glossary-lilith.md` defines terms for AI characters, personas, sessions, content gates, safety boundaries, and consent — all Lilith domain terms. Using Lilith's vocabulary in OmniPlay creates category confusion immediately. OmniPlay needs its own glossary.

### Normalized State Pattern — Apply Only When Needed
The `NormalizedState<T>` pattern (`{ ids: string[], entities: Record<string, T> }`) is valuable for large entity collections requiring efficient by-ID lookup. For small collections or simple lists, it adds boilerplate with no benefit. Apply when the use case is real, not preemptively.

### Privacy / Isolation Architecture is Overkill for Single-User Local MVP
The per-user conversation isolation model (`ChatSession`, `MemoryItem`, and `Message` scoped per user) is essential for a multi-user platform where multiple users share the same AI characters. If OmniPlay Phase 1 is single-user and local-first, this level of isolation architecture is premature. Port the concept when multi-user or shared-library scenarios are on the roadmap.

---

*Last Updated: February 2026 — Based on full read of all 12 docs in `/docs/frontend/`, `/docs/backend/`, `/docs/shared/`.*
