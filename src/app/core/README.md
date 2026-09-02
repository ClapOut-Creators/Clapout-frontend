# Core Boundary

Application-wide infrastructure lives here: auth (guards, interceptor, token store, `AuthService`), API error handling, runtime/environment config, and the PrimeNG theme preset. `core/models/user.ts` stays here too — it's session/auth state, not a domain model.

Core has no feature code, no domain repositories, and no domain models. It may not import feature code.
