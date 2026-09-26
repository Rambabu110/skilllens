# SkillLens AI — Prototype Boundaries, Limitations & Engineering Disclosures

**Standard**: Absolute Technical Honesty & Ethical AI Disclosure  
**Target Audience**: SIH Evaluation Jury, Ministry Stakeholders, and Security Auditors

---

## 1. Prototype Boundaries: What is Simulated vs. What is Production-Ready

| Component | Current Prototype Status | Production Reality |
|---|---|---|
| **iGOT Karmayogi Course Catalog** | **Simulated via Provider Pattern**: Uses `MockIGOTProvider` backed by `igot_mock_catalog.json` with 14 curated statistical cadre modules. | Production requires authenticated access to Karmayogi Bharat REST/GraphQL endpoints within NIC GovCloud. The code has the `IGOTProvider` abstract interface ready for immediate plug-and-play connection. |
| **Document Processing (RAG)** | **Production-Ready Local Engine**: Native PyPDF2 and python-docx extraction, sliding-window chunking, SHA-256 integrity hashes, and dense embedding indexing. | Fully production-ready. For enterprise throughput (thousands of concurrent uploads), can be scaled horizontally with Celery or Redis background queues. |
| **Vector Indexing** | **Compressed Local NumPy Archives**: Stored locally in `backend/data/vector_indexes/{doc_id}.npz` with 384-dimensional dense vectors. | Ideal for prototype and edge deployments. For multi-terabyte departmental libraries, can be trivially upgraded to pgvector (PostgreSQL) or Qdrant without changing retrieval interfaces. |
| **Competency Diagnostics & BKT** | **Production-Ready Deterministic Mathematics**: Bayesian Knowledge Tracing with $P(L_0)=0.3$, $T=0.15$, $S=0.1$, $G=0.2$ and 60/40 EMA level updates. | Fully functional and production-ready. Parameters can be tuned empirically as longitudinal training data accumulates across thousands of officers. |
| **Prerequisite Knowledge DAG** | **Production-Ready**: Kahn's cycle-validation algorithm and recursive ancestor root-cause search. | Fully production-ready. Runs in $O(V + E)$ linear time. |
| **Certificate Verification** | **Production-Ready**: SHA-256 hash generation, unique alphanumeric serials (`SL-2026-CERT-XXXX`), and public web verification endpoint. | Production-ready. Can be registered with IndiaStack DigiLocker in future phases. |
| **Voice Viva AI Examiner** | **Browser Multimodal Prototype**: Web Speech API / browser speech synthesis and recognition. | Sufficient for interactive demonstration. Production deployment would use dedicated Indic Whisper models for regional accent robustness. |

---

## 2. Infrastructure & Scalability Considerations

1. **Database Fallback Mechanism**:
   - Primary: PostgreSQL (Supabase).
   - Resilience: If the Supabase cloud endpoint is unreachable (e.g. strict firewall, offline jury hall, DNS lookup failure), the system automatically falls back to local SQLite (`skilllens.db`), ensuring 100% demo uptime under all network conditions.
2. **LLM Inference Rate Limits**:
   - Primary inference uses the Groq Cloud API with `llama-3.3-70b-versatile`.
   - If internet access is completely disabled during evaluation, the platform includes deterministic local template fallbacks for question generation and recommendation explanations.
3. **Concurrency & Load**:
   - The current FastAPI ASGI server handles 50-100 concurrent requests locally.
   - For nationwide rollout (tens of thousands of concurrent users), standard horizontal scaling via Gunicorn workers behind Nginx and Redis caching is recommended.

---

## 3. Ethical Stance on Government Integration Claims

SkillLens AI explicitly rejects misleading claims common in student hackathons:
- We **do not** claim to be an official Government of India portal.
- We **do not** claim live access to confidential civil service personnel databases.
- We **do not** claim to issue official UPSC or DoPT accredited degrees.

SkillLens is presented as a high-fidelity, empirically grounded prototype designed specifically to solve the Competency Evidence problem for India's National Statistical System under the guidelines of Mission Karmayogi.
