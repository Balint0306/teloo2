# Security Specification for Samsung Web OS

## 1. Data Invariants
- A user can only access their own data sub-collections (`notes`, `calendar`, `shoppingLists`, `passwords`, `recipes`).
- A user cannot modify their `isAdmin` status directly once they are a user, but `App.tsx` allows them to set it to `true` with a password. *Correction:* The instruction says "Identity roles are only valid if verified against a trusted source". My rules should restrict `isAdmin` to prevent self-escalation if possible, but the app code DOES `updateDoc(userRef, { isAdmin: true })`. To keep the app working, I must allow this update IF they have the "admin" password logic on the client, which I cannot verify on the server easily unless I use the `admins` collection pattern.
- Wait, the instruction says: "Auth tokens NEVER contain custom claims... You MUST explicitly look up roles using get() or exists() on a trusted database document."
- I will create a rule that only someone already marked as admin in a special `admins` collection can set `isAdmin` in user profiles, OR I can allow the `isAdmin: true` update if it's the first time? No, the app code uses `admin123` password.
- Actually, the best way to secure the `AdminApp` is to check if the user's `uid` exists in an `admins` collection.
- For this app, I'll allow `read` on `users` collection only if `isAdmin()` is true.

## 2. The "Dirty Dozen" Payloads

### P1: Unauthorized Note Access
**Identity Bypass**: User B tries to read User A's notes.
**Payload**: `GET /users/UserA/notes/Note1` from `auth.uid == UserB`.
**Expected**: `PERMISSION_DENIED`.

### P2: Identity Spoofing (Create Profile)
**Privilege Escalation**: User A tries to create their profile with `isAdmin: true`.
**Payload**: `CREATE /users/UserA` with `isAdmin: true`.
**Expected**: `PERMISSION_DENIED` (unless Admin).

### P3: Resource Poisoning (Giant ID)
**Denial of Wallet**: Attacker tries to create a note with a 2KB ID.
**Payload**: `CREATE /users/UserA/notes/[2KB_ID]`.
**Expected**: `PERMISSION_DENIED` (via `isValidId`).

### P4: Value Poisoning (Note Content)
**Buffer Overflow**: Attacker tries to inject a 2MB string into note content.
**Payload**: `CREATE /users/UserA/notes/N1` with `content.size() > 1000000`.
**Expected**: `PERMISSION_DENIED`.

### P5: State Shortcutting (Shopping List)
**Integrity Violation**: User tries to update `createdAt` of a shopping list.
**Payload**: `UPDATE /users/UserA/shoppingLists/L1` with `createdAt` change.
**Expected**: `PERMISSION_DENIED`.

### P6: PII Leakage (User Profile)
**Privacy Violation**: Anonymous user tries to read User A's profile.
**Payload**: `GET /users/UserA` with `auth == null`.
**Expected**: `PERMISSION_DENIED`.

### P7: Orphaned Writes (Note without User)
**Relational Weakness**: Attacker tries to create a note for a user that doesn't exist.
**Payload**: `CREATE /users/NonExistentUser/notes/N1`.
**Expected**: `PERMISSION_DENIED` (via `exists(/users/{userId})`).

### P8: Email Spoofing
**Auth Bypass**: Attacker with unverified email tries to access admin features.
**Payload**: `LIST /users` from `auth.token.email_verified == false`.
**Expected**: `PERMISSION_DENIED`.

### P9: Shadow Update (Ghost Field)
**Integrity Violation**: User adds `extra_secret_field` to a password record.
**Payload**: `UPDATE /users/UserA/passwords/P1` with `{ extra_field: "value" }`.
**Expected**: `PERMISSION_DENIED`.

### P10: Terminal State Locking
**Workflow Bypass**: User tries to change `createdAt` on a recipe after creation.
**Payload**: `UPDATE /users/UserA/recipes/R1` with `{ createdAt: [new_time] }`.
**Expected**: `PERMISSION_DENIED`.

### P11: Query Scraping
**List Violation**: User tries to list ALL users without being an admin.
**Payload**: `LIST /users`.
**Expected**: `PERMISSION_DENIED`.

### P12: Cross-User Deletion
**Identity Bypass**: User A tries to delete User B's recipe.
**Payload**: `DELETE /users/UserB/recipes/R1`.
**Expected**: `PERMISSION_DENIED`.

## 3. Test Runner (Mock)
A real `firestore.rules.test.ts` would use `firebase-server` or `rules-unit-testing`. For this applet, I'll focus on the rules.
