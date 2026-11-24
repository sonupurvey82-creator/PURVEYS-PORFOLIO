# PURVEY Portfolio Security Specification

## 1. Data Invariants
1. **Owner-Only Mutations**: Only the verified portfolio owner (`request.auth.token.email == 'justdivebyflare@gmail.com' && request.auth.token.email_verified == true` or an entry in `/admins/{uid}`) may `create`, `update`, or `delete` documents across `/videos`, `/engines`, `/services`, `/channels`, `/presets`, and `/media_chunks`.
2. **Public Read-Only Showcase**: Unauthenticated visitors and non-owner signed-in users may ONLY read showcase documents where `resource.data.isPublic == true`, and may never write to any collection.
3. **Zero PII in Public Collections**: No email addresses, phone numbers, physical addresses, or user profile records are stored in any publicly readable collection. `/admins/{adminId}` is locked down with zero client writes and zero public reads.
4. **Strict Document IDs & Schema**: Every document ID must satisfy `^[a-zA-Z0-9_-]+$` (`<= 128` chars). Every write must match `hasAll(...) && hasOnly(...)` and strict field-level type/bounds/enum validation helpers.
5. **Bounded Media Chunks**: `/media_chunks/{chunkId}` documents hold at most `550,000` characters per `data` chunk, `0 <= chunkIndex <= 100`, immutable once created, and fetched by deterministic key (`allow list: if false`).
6. **Temporal & Ownership Immutability**: `createdAt == request.time` on `create` and remains immutable (`incoming().createdAt == existing().createdAt`) on `update`. `ownerUid == request.auth.uid` on `create` and remains immutable on `update`. `updatedAt == request.time` on `create` and `update`.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Video Post (`videos` create)**: Unauthenticated visitor attempts `setDoc('/videos/vid1', validVideoPayload)` -> DENIED (not admin).
2. **Unauthenticated Preset Delete (`presets` delete)**: Visitor tries `deleteDoc('/presets/p1')` -> DENIED (not admin).
3. **Non-Owner Authenticated Edit (`engines` update)**: Signed-in user with `random@gmail.com` tries updating `engines/eng1.description` -> DENIED (`!isAdmin()`).
4. **Unverified Admin Email Spoof (`services` create)**: Signed-in user with `email: 'justdivebyflare@gmail.com'` and `email_verified: false` attempts to create a service -> DENIED (`email_verified == true` failed).
5. **Self-Assigned Admin Escalation (`admins` create)**: Non-owner tries `setDoc('/admins/attackerUid', { uid: 'attackerUid', role: 'admin', createdAt: serverTimestamp() })` -> DENIED (`allow create: if false`).
6. **Public Visitor Download Counter Mutation (`presets` update)**: Visitor tries to increment `downloads` on `/presets/p1` -> DENIED (`!isAdmin()`, zero visitor writes).
7. **Shadow Ghost Field Injection (`channels` create)**: Payload includes all valid channel fields plus `{ isAdminOverride: true }` -> DENIED (`hasOnly` rejects unknown keys).
8. **ID Poisoning Attack (`videos` create)**: Attempt to create document `/videos/..%2Fadmins%2Fevil` or 500-char ID -> DENIED (`isValidId` regex & length gate).
9. **Denial-of-Wallet Oversized Chunk (`media_chunks` create)**: Admin or attacker uploads chunk with `data` length `> 550,000` bytes -> DENIED (`data.size() <= 550000` fails).
10. **Collection Scrape on `/media_chunks` (`list`)**: Visitor calls `getDocs(collection(db, 'media_chunks'))` -> DENIED (`allow list: if false`).
11. **Immutable Timestamp Tampering (`engines` update)**: Owner or actor attempts to forge `createdAt` or spoof `updatedAt` in the past during update -> DENIED (`createdAt == existing().createdAt && updatedAt == request.time`).
12. **Blanket Read on `/admins` (`list` / non-owner `get`)**: Signed-in non-admin calls `getDocs(collection(db, 'admins'))` or `getDoc('/admins/otherUid')` -> DENIED.
