# Security Specification - Todo List App with Reminders

## 1. Data Invariants
- **Identity Lock**: A todo document MUST have a `userId` field that matches the `request.auth.uid` of the authenticated creator.
- **Strict Size Guard**: The `title` of a todo MUST be a string shorter than or equal to 120 characters to prevent database bloating and denial-of-wallet exploitation.
- **Optional Field Boundary**: The `description` and `category` fields, if supplied, must be small string types (description <= 1000 chars, category <= 50 chars).
- **Temporal Honesty**: The `createdAt` field on document creation MUST equal `request.time` (the Firestore server-side clock). The `updatedAt` field on update MUST equal `request.time`.
- **Immutability of Key Metadata**: Once a todo is created, its `userId` and `createdAt` fields are immutable and CANNOT be altered.
- **Action-based Field Mutability**: Users can only edit papers they own. All update transactions must either be a complete update verifying schema alignment, or structured state updates.

---

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Identity Impersonation (Create)
An authenticated user `attacker123` attempts to create a todo under `victim789` ownership.
```json
{
  "title": "Stolen Identity Task",
  "completed": false,
  "userId": "victim789",
  "priority": "medium",
  "category": "Work",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 2: Timestamp Fraud (Create)
An attacker attempts to backdate a todo creation timestamp using client-side values.
```json
{
  "title": "Backdated Task",
  "completed": false,
  "userId": "attacker123",
  "priority": "low",
  "category": "Personal",
  "createdAt": "2020-01-01T00:00:00Z",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 3: Extreme Payload Injection (Create)
An attacker tries to saturate storage by creating a todo with an extremely long title (100,000 characters).
```json
{
  "title": "A".repeat(100000),
  "completed": false,
  "userId": "attacker123",
  "priority": "high",
  "category": "Personal",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 4: Key Escalation (Create)
An attacker attempts to inject a sneaky field called `isAdmin` or `isSuperUser`.
```json
{
  "title": "Privilege Escalation",
  "completed": false,
  "userId": "attacker123",
  "priority": "low",
  "category": "Personal",
  "isAdmin": true,
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 5: Missing Required Keys (Create)
An attacker tries to create an malformed todo missing `completed`.
```json
{
  "title": "Incomplete Schema",
  "userId": "attacker123",
  "priority": "medium",
  "category": "Work",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 6: Invalid Enumeration Value (Create)
An attacker sets the `priority` to a forbidden level like `extreme`.
```json
{
  "title": "Extreme Priority Target",
  "completed": false,
  "userId": "attacker123",
  "priority": "extreme",
  "category": "Personal",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 7: Thief Snooping (Get Document)
User `attacker123` attempts to fetch a specific private todo matching ID `victimTodo456` owned by user `victim789`.
*Expected Result: PERMISSION_DENIED*

### Payload 8: Blanket Scraping (List Query)
An attacker requests a broad list query for all active todos without specifying their own user identity filter.
```javascript
// Querying without: where("userId", "==", "attacker123")
db.collection("todos").get()
```
*Expected Result: PERMISSION_DENIED*

### Payload 9: Hijacked Metadata Modification (Update)
An attacker attempts to swap ownership of a todo after creation.
```json
{
  "title": "Stealing This Task",
  "completed": false,
  "userId": "victim789",
  "priority": "low",
  "category": "Personal",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 10: CreatedAt Retroactive Mutation (Update)
An attacker attempts to alter the read-only `createdAt` value of an existing todo.
```json
{
  "title": "Updated Task Name",
  "completed": false,
  "userId": "attacker123",
  "priority": "low",
  "category": "Personal",
  "createdAt": "2015-01-01T00:00:00Z",
  "updatedAt": "request.time"
}
```
*Expected Result: PERMISSION_DENIED*

### Payload 11: Invalid ID Injection (Get/Write Path Poisoning)
An attacker attempts to reference a document with a malicious, non-alphanumeric ID to trigger path traversal or server error: `../../malicious_path`.
*Expected Result: PERMISSION_DENIED*

### Payload 12: Unverified EMail Write Block (Create/Update)
An attacker with an unverified email (`request.auth.token.email_verified == false`) tries to modify the database. (If email verified check is strictly required - we will enforce `request.auth.token.email_verified == true` for standard actions to avoid spoofing).
*Expected Result: PERMISSION_DENIED*

---

## 3. The Test Runner Reference (firestore.rules.test.ts)

A TypeScript mock description of how our Firestore emulator suite checks these constraints:

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

// This template logs and runs verification tests for all payloads above against firestore.rules.
```
