# ApplicationV2 Migration Guide (v16 Preparation)

**Status:** Deferred. FormApplication (V1) will be removed in Foundry v16, but that's likely years away. This document captures what needs to happen when migrating.

## Context

- **Current State:** Module uses FormApplication (V1 API)
- **Current Warnings:** Deprecation warning in Foundry v14+
- **Deadline:** Foundry v16 (planned removal of V1)
- **Why Deferred:** V2 API patterns are complex; FormApplication still works reliably. No urgency.

---

## Critical API Changes Required

### 1. Class Inheritance & Options Structure

**Change from V1 → V2:**
```javascript
// V1 (current)
export class BaselineModulesManager extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { ... });
  }
}

// V2 (required)
export class BaselineModulesManager extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "app-id",
    classes: ["class-names"],
    tag: "form",
    position: { width: 720, height: 760 },
    window: { title: "...", resizable: true, minimizable: true },
    form: { handler: "onFormSubmit", submitOnChange: false, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: "modules/.../template.hbs" }
  };
}
```

**Key differences:**
- `static get defaultOptions()` → `static DEFAULT_OPTIONS = { ... }` (uppercase, field not getter)
- Move `title` to `window.title`
- Move `width`/`height` to `position: { width, height }`
- Move `template` to `static PARTS` (separate from options)
- Add `form: { handler: "methodName", ... }` for form submission
- Add `tag: "form"` to indicate this is a form application
- Use `HandlebarsApplicationMixin` to get Handlebars rendering support

### 2. Data Preparation

**Change:**
```javascript
// V1
getData() {
  return { /* template context */ };
}

// V2
_prepareContext(options) {
  return { /* template context */ };
}
```

### 3. Lifecycle Methods

**Add `_onRender()` hook (V2 only):**
```javascript
async _onRender(context, options) {
  await super._onRender?.(context, options);
  this.activateListeners(this.element);
}
```

**Why:** In V2, `activateListeners()` should be called from `_onRender()` for proper lifecycle integration.

### 4. Form Submission Handling

**Change from V1 → V2:**
```javascript
// V1: Manual event handling
async _onFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(this.element.querySelector("form"));
  // ... process formData
}

// V2: Form handler via configuration + instance method
// In DEFAULT_OPTIONS: form: { handler: "onFormSubmit", ... }
// Method stays similar but V2 automatically routes form submission through it
async onFormSubmit(event, form, formData) {
  // event: submit event
  // form: HTMLFormElement
  // formData: FormDataExtended (parsed/expanded)
  // ... process
}
```

**Note:** The handler reference can be:
- String name of instance method: `"onFormSubmit"`
- Static method on class: Harder for instance access; avoid for complex logic
- Function reference: Not recommended in ApplicationV2 pattern

### 5. Render Method Calls

**Change all `render()` calls:**
```javascript
// V1
await this.render(true);      // force re-render
await this.render(false);     // normal render
d.render(true);               // Dialog

// V2
await this.render({ force: true });
await this.render();          // normal render (no args)
d.render({ force: true });    // Dialog
```

### 6. HTML Element Access

**Change:**
```javascript
// V1: jQuery object with [0] to get element
activateListeners(html) {
  const button = html[0].querySelector("button");
}

// V2: Native HTMLElement directly
activateListeners(html) {
  const button = html.querySelector("button");  // html is already the element
}
```

---

## Files Affected

### Primary Migration Targets

1. **`scripts/world-setup-tools/apps/BaselineModulesManager.js`**
   - Most complex: async form submission with dialogs
   - Key challenge: form handler needs to call instance methods (`_calculateSaveDiff`, `_showSaveDiff`, `_performApply`)

2. **`scripts/world-setup-tools/apps/ExtraVisiblePacksSelector.js`**
   - Simpler: straightforward form submission
   - Fewer instance method dependencies

3. **`scripts/apps/BaselineModulesManager.js`** (duplicate)
4. **`scripts/apps/ExtraVisiblePacksSelector.js`** (duplicate)

### Secondary Update Locations

- **`scripts/main.js`**
  - Update all `render(true)` → `render({ force: true })` calls
  - Update Dialog `render()` calls similarly

---

## Known Complexity Points

### 1. Complex Async Form Submission

**Current Pattern (V1):**
```javascript
_updateObject(event, formData) {
  // 1. Process checkboxes
  // 2. Resolve dependencies (async)
  // 3. Show save diff dialog (async)
  // 4. Conditionally save or apply based on user choice
  // 5. Re-render or reload world
}
```

**V2 Equivalent:**
```javascript
async onFormSubmit(event, form, formData) {
  // Same logic, but formData comes pre-parsed
  // Needs to call instance methods: this._calculateSaveDiff(), etc.
  // Must NOT be a static method if calling instance methods
}
```

**Risk:** V2's form handler pattern may not support this level of complexity. Consider:
- Refactoring to separate form submission (simple) from workflow logic (complex)
- Using `_onSubmit()` override if form handler doesn't provide enough control

### 2. Dialog Patterns May Change

Current code creates Dialog instances in multiple places with custom buttons and callbacks. Verify:
- Dialog.confirm() still returns a Promise<boolean> in V2
- Dialog with render hooks still works
- Button callbacks still fire correctly

### 3. Duplicate App Files

Both app classes exist in two locations:
- `/scripts/apps/` (legacy, used by main.js imports)
- `/scripts/world-setup-tools/apps/` (current, after Phase 1 reorganization)

**Strategy:** Update primary location first, test thoroughly, then mirror to duplicate.

---

## Testing Checklist for V2 Migration

After implementing changes:

- [ ] Module loads with no init/ready errors
- [ ] No ApplicationV2 deprecation warnings in console
- [ ] Manager opens from settings menu ✓
- [ ] Manager opens from `Ctrl+Shift+B` keybinding ✓
- [ ] UI renders with correct sizing (720x760 for baseline, 640x720 for pack selector) ✓
- [ ] Module checkboxes can be checked/unchecked ✓
- [ ] Search and filter buttons work ✓
- [ ] "Save Preset" button shows diff dialog ✓
- [ ] Preset can be saved successfully ✓
- [ ] "Apply Preset to World" button shows preview dialog ✓
- [ ] Preset can be applied (with dependency prompts if needed) ✓
- [ ] World reloads when module activation changes ✓
- [ ] Manager re-opens after reload ✓
- [ ] Pack selector opens and works correctly ✓
- [ ] Curated pack filtering still works ✓
- [ ] Quick Insert restrictions still sync ✓

---

## Why This Was Deferred

**Attempted Migration (2026-06-06):**
- ✅ Successfully changed class inheritance to ApplicationV2
- ✅ Added HandlebarsApplicationMixin
- ✅ Updated activateListeners for native HTMLElement
- ✅ Updated render() call syntax
- ⚠️ Form handler reference pattern incomplete
- ❌ Final result: UI rendered but empty (template or context issue)

**Conclusion:** V2 API has different shape than expected. Full migration requires:
1. Testing changes in isolation (one app at a time)
2. Understanding exact V2 form handler protocol
3. Validating template rendering with new DEFAULT_OPTIONS structure
4. Debugging what changed in lifecycle (when templates render, when listeners attach)

**Effort Estimate:** ~2-3 hours of careful testing and iteration per migration.

---

## Migration Strategy (When Ready)

### Phase 1: Research
1. Find working ApplicationV2 examples in Foundry core or community modules
2. Document exact form handler signature and timing
3. Test simple V2 app in isolation

### Phase 2: ExtraVisiblePacksSelector (Simpler First)
1. Migrate to V2 with all pattern changes
2. Test form submission, listeners, re-render
3. Validate packs are saved/loaded correctly

### Phase 3: BaselineModulesManager (Complex)
1. Migrate to V2
2. Test form handler with dialog flow
3. Test dependency resolution and apply workflow
4. Test world reload and re-open behavior

### Phase 4: Sync & Release
1. Copy changes to duplicate app files
2. Update main.js render() calls
3. Test full workflow in Foundry v14+
4. Create v0.6.0 or v0.6.1 release with V2 migration

### Phase 5: Deprecation Removal (v0.7.x or later)
- Once V2 is stable, remove old V1 compatibility shims
- Clean up any remaining FormApplication references

---

## References

- Foundry API: ApplicationV2 documentation (check Foundry core docs for v14+)
- Module Examples: Search community modules for `ApplicationV2` implementations
- Relevant Files:
  - `DEVELOPMENT.md` — roadmap item for ApplicationV2 migration (v0.5.2)
  - `scripts/world-setup-tools/apps/` — target files for migration
  - `scripts/main.js` — render() call locations

---

## Notes

- V1 FormApplication is still reliable; no rush to migrate
- V16 removal is years away; this is future-proofing
- Migrate only when FormApplication causes real issues or when v15/v16 is on the horizon
- Keep this document updated with new findings as V2 matures
