# NordArc — Professional Focus Architecture

## Project Essence
NordArc is a distraction-blocking browser extension built on the principle of "Commitment Locking." It addresses the core psychological barrier to productivity: the ease of bypassing self-imposed restrictions. By enforcing a monthly maintenance window and a secure passcode system, NordArc transforms a simple blocklist into a disciplined focus environment.

## Architecture Deep Dive
The system is engineered using a robust **Layered Repository Pattern**, ensuring strict separation of concerns and long-term maintainability.

### 1. Controller Layer
Acts as the interface between browser events and system logic. 
- **Background Controller:** Handles `onBeforeNavigate`, installation lifecycle, and message routing.
- **UI Controllers:** Manage the state and user interactions for the Popup, Onboarding, and Lockscreen interfaces.

### 2. Service Layer
The brain of the application. It orchestrates complex business rules without direct knowledge of storage or UI implementation.
- **BlockService:** Handles URL validation, keyword extraction, and commitment logic.
- **Security Logic:** Manages SHA-256 hashing and credential verification.

### 3. Repository Layer
Strictly responsible for data access and local persistence.
- **StorageRepository:** Wraps `chrome.storage.local` and `chrome.storage.session`. It implements an **In-Memory Cache** (L1) to eliminate blocking I/O during navigation checks, ensuring zero-latency protection.

## Tech Stack & Rationale
- **Vanilla JavaScript (ES6+):** Chosen for maximum performance and zero dependency overhead in the extension environment.
- **ES Modules (ESM):** Provides native code organization, enabling the clean layered architecture.
- **SubtleCrypto API:** Used for industry-standard SHA-256 hashing without external libraries.
- **Chrome Storage API:** Utilizes both `local` for persistence and `session` for temporary, security-sensitive context.

## Core Logic Flow
1. **Request Interception:** The Background Controller catches a navigation event.
2. **Service Validation:** The `BlockService` queries the `StorageRepository` cache.
3. **Keyword Parsing:** If the site isn't in the blocklist, the Service parses URL parameters for restricted keywords.
4. **Action:** If blocked, the Controller generates a unique `blockId`, stores metadata in `session` storage, and redirects the tab to the Lockscreen.
5. **UI Rendering:** The Lockscreen UI Controller retrieves the context via the `blockId` and presents the centered breathing exercise.

## Edge Case Handling
- **Malicious Redirection:** All redirections are validated against internal extension protocols.
- **XSS Prevention:** All UI rendering utilizes `textContent` and `DocumentFragment` to prevent DOM-based injection.
- **Memory Leaks:** `MutationObserver` and event listeners are surgically managed to prevent background process bloat.
- **Data Integrity:** The Import Service validates JSON schemas before committing to storage.
- **Cold Starts:** The Repository handles asynchronous initialization to ensure data is available before the first navigation event.

## Future Scalability
- **Remote Sync:** The Repository layer is designed to be easily extended with a Sync Repository for cross-device blocklists.
- **Custom Rule Engine:** The Service layer can accommodate complex regex or time-based rules without affecting the storage or UI layers.
- **API Integration:** The Controller layer is ready to support external focus-tracking APIs or team-based productivity dashboards.

## Commitment Policy
To ensure discipline, the system enforces a strict "No Removal" policy. Modifications to the blocklist are only permitted during the **Maintenance Window**: the last day of every month, from 23:50 to 00:00.

---
*Architected for Discipline by NordArc Engineering*
