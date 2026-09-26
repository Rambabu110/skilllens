# SkillLens AI — Security, Governance & Data Protection Specification

**Framework**: Zero-Trust Government Architecture Guidelines  
**Standard**: OWASP Top 10 API Security & India Digital Personal Data Protection (DPDP) Act Aligned  
**Service Implementation**: `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/services/audit_service.py`

---

## 1. Authentication & Session Management

### 1.1 JSON Web Tokens (JWT)
- **Algorithm**: HMAC-SHA256 (`HS256`).
- **Secret Management**: Loaded from environment variables (`SECRET_KEY`). Fails loudly if unconfigured in production.
- **Expiry**: Configurable session lifespan (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440` / 24 hours).
- **Transport**: Transmitted exclusively via standard `Authorization: Bearer <token>` HTTP headers.

### 1.2 Password Hashing
- **Cryptographic Hash**: Passlib `bcrypt` with automated salt generation.
- **Timing Attacks**: Password comparisons execute in constant time, preventing timing-based credential enumeration attacks.

### 1.3 Firebase ID Token Verification
- Integrated via Firebase Admin SDK with fallback to unverified claims only in explicit mock development environments.
- Unverified email addresses or forged tokens return `401 Unauthorized` or `403 Forbidden`.

---

## 2. Role-Based Access Control (RBAC)

SkillLens enforces strict multi-tenant authorization barriers:

| Role | Scope | Accessible Routes | Denied Routes |
|---|---|---|---|
| **Learner (Cadre Officer)** | Personal competency, assessments, recommendations, certificates. | `/competency/*`, `/gaps/*`, `/quiz/*`, `/learning-path/*`, `/recommendations/*`, `/certificate/issue`, `/gamification/*`, `/notifications/*`, `/export/*` | `/admin/*` (Strictly Rejected with `403 Forbidden`) |
| **Training Administrator** | Institutional analytics, cohort deficit heatmaps, syllabus pattern watcher, audit logs, question item bank. | `/admin/*` + all standard learner endpoints. | None. |

### Elimination of Insecure Admin Checks
Previous legacy code used naive string matching (`"admin" in email`), which allowed unauthorized accounts like `badadmin@malicious.com` to gain system privileges.
SkillLens replaces this with a two-tier verification check:
1. **Allowlist Verification**: Email must exist in `settings.ADMIN_EMAILS` (configured in `backend/app/core/config.py`).
2. **Database Role Enforcement**: User record must have `is_admin == True` in the database.

---

## 3. Operational Audit Logging & Sensitive Data Sanitization

### 3.1 Audit Event Ledger
Every critical security and operational event is permanently logged in the `audit_events` table:
- User logins and failed authentication attempts.
- Password updates and role escalations.
- Assessment submissions and competency level updates.
- Syllabus uploads and question version status changes.

### 3.2 Automated Sensitive Data Redaction
Before any payload is persisted to the database or rendered in the administrative UI, the `audit_service.py` runs recursive sanitization:

```python
SENSITIVE_KEYS = {
    "password", "hashed_password", "token", "access_token",
    "authorization", "secret", "private_key", "api_key",
}

def _sanitize_data(data: Any) -> Any:
    if isinstance(data, dict):
        clean = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                clean[k] = "[REDACTED]"
            else:
                clean[k] = _sanitize_data(v)
        return clean
    return data
```

---

## 4. Input Validation & SQL Injection Prevention

- **Parameterized Queries**: All database queries are constructed via SQLAlchemy ORM expressions or parameterized queries, eliminating SQL injection vectors.
- **Strict Pydantic Validation**: All API request bodies are parsed into strongly typed Pydantic models. Malformed payloads or extra unrecognized fields are rejected with `422 Unprocessable Entity`.
- **Upload Content Whitelist**: Document uploads (`/quiz/upload`) only accept valid PDF, DOCX, and TXT files, capped at 15MB to prevent memory exhaustion and buffer overflow attacks.

---

## 5. Compliance with DPDP Act 2023 Principles

- **Purpose Limitation**: Competency and assessment data is collected solely for capacity building and Training Needs Analysis.
- **Data Minimization**: Passwords and biometric data are never stored in plain text.
- **Right to Verification**: Officers can inspect their complete immutable evidence ledger at any time via their Competency Passbook.
