# Security Specification for L'Art du Lien

## Data Invariants
1. A user can only read and write their own profile, history, and souvenirs.
2. History items and souvenirs are permanently linked to a user and cannot be moved/orphaned.
3. Stats must remain within the 0-100 range (enforced by code, but rules should restrict junk).
4. `updatedAt` and `timestamp` fields must be validated against `request.time`.

## The Dirty Dozen Payloads (Targeted for Rejection)
1. **Identity Theft**: Update `/users/ibrahim_id` using `auth.uid = souadou_id`.
2. **Stat Poisoning**: Set `confiance: 999999` or `complicite: -50`.
3. **Shadow Field Injection**: Add `isAdmin: true` to user profile.
4. **Orphaned History**: Create a history item in someone else's subcollection.
5. **Timestamp Spoofing**: Send a `createdAt` value from 1970 or the future.
6. **ID Poisoning**: Use a 2MB string as a `souvenirId`.
7. **Cross-User Leak**: Attempt to `list` all users in the root `/users` collection.
8. **Malicious Enum**: Set `category` to `HackValue` in souvenirs.
9. **Mutation Gap**: Update `email` (immutable after creation).
10. **Resource Exhaustion**: Send a history message of 5MB.
11. **Spoofed Role**: Set `naturel: 101` to trigger "Lien Réussi" artificially.
12. **Self-Promotion**: Add an `isAdmin` field to the root `userId` map during profile creation.

## The Test Runner (Plan)
Creating `firestore.rules.test.ts` to verify these rejections using the Firebase Emulator / unit tests logic.

(Since I can't run a full test suite in this environment easily, I will focus on perfect rules generation).
