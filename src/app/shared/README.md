# Shared Boundary

Cross-domain presentation and utilities used by 2+ features live here: `components/` (e.g. `page-header`, `clippers-table`, `campaign-compact-card`, `brand-logo-tile`, `stat-card`, `wizard-shell`, `clock`, `form-errors`), `utils/` (e.g. `campaign-format`, `csv`), and `constants/` (e.g. `admin-options`). `directives/`, `models/`, `pipes/`, and `ui/` are reserved for future use as those categories gain cross-domain content.

A component used by only one feature belongs in that feature's own `components/`, not here — promote it to `shared/` only once a second feature needs it.

Shared code may not import feature code or call business APIs directly.
