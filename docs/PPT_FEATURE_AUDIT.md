# SkillLens AI — Pitch Deck Claim-by-Claim Feature Audit

**Target Presentation**: SIH Evaluation Deck  
**Audit Conducted By**: Zero Day Nextron Engineering Team  
**Status Key**:
- `[IMPLEMENTED & TESTED]`: Feature exists, functions end-to-end, and passes automated pytest suite.
- `[HONEST PROTOTYPE SIMULATION]`: Implemented via transparent provider/mock pattern; false government claim eliminated.
- `[REMOVED / REFRAINED]`: Definitively stripped to protect credibility against judge scrutiny.

---

## 1. Feature Audit Matrix

| Slide / Claim | Original Deck Claim | Current Technical Reality | Audit Status | SIH Defense Recommendation |
|---|---|---|---|---|
| **Claim 1: Live iGOT API Integration** | "Integrated directly with iGOT Karmayogi national APIs for real-time course sync." | iGOT production APIs are non-public government intranets. Implemented `IGOTProvider` abstraction with `MockIGOTProvider` and `igot_mock_catalog.json`. | **[HONEST PROTOTYPE SIMULATION]** | State: *"We designed a production-ready Provider Pattern aligned with iGOT's FRAC schema, currently running against an institutional mock catalog until government API keys are issued."* |
| **Claim 2: RAG Pipeline** | "RAG pipeline that extracts content from uploaded circulars to create quizzes." | Implemented sliding-window token chunking (800-1200 tokens), SHA-256 chunk hashes, 384-dim dense vector embeddings, top-k cosine similarity retrieval, and verbatim source citations. | **[IMPLEMENTED & TESTED]** | Demo live document upload (`nss_guidelines.txt`) and show the exact source excerpt and page number in generated questions. |
| **Claim 3: Continuous Competency Intelligence** | "AI continuously monitors competency level and updates profiles." | Built Bayesian Knowledge Tracing (BKT) engine with prior $P(L_0)=0.3$, transition $T=0.15$, slip $S=0.1$, guess $G=0.2$, topic-level mastery states, and 60/40 exponential moving average competency updates. | **[IMPLEMENTED & TESTED]** | Walk through the mathematical formula: $P(L_{t+1}) = P(L_t \mid \text{Obs}) + (1 - P(L_t \mid \text{Obs})) \cdot T$. Judges love deterministic transparency. |
| **Claim 4: Prerequisite Knowledge Graph** | "Knowledge graph identifies root causes of learning gaps." | Built cycle-validated Directed Acyclic Graph (DAG) with Kahn's algorithm cycle detection and recursive ancestor traversal (`find_root_gap`). | **[IMPLEMENTED & TESTED]** | Show the prerequisite diagram on `/gaps` and point out the root gap indicator (e.g. *Sampling Error & Bias* caused by upstream *Statistical Sampling Methods*). |
| **Claim 5: Adaptive Recommender Engine** | "AI recommends courses based on learner needs." | Built 6-factor hybrid scoring model (gap relevance 35%, prereq priority 20%, content similarity 15%, difficulty fit 10%, history 10%, mastery potential 10%) with itemized rationales and CPD fallback. | **[IMPLEMENTED & TESTED]** | Highlight the transparent "Why recommended" breakdown for each course card. |
| **Claim 6: Reassessment & Gap Reduction** | "Tracks improvement and reduces gaps after training." | Implemented `POST /quiz/reassess/{competency_id}` which calculates before level, after level, numerical delta, and logs immutable evidence in `CompetencyEvidence` table. | **[IMPLEMENTED & TESTED]** | Demo the reassessment flow: score 85% raises level from 1.8 to 2.8 and transitions status from Critical to Developing. |
| **Claim 7: Verifiable Certificates** | "Issues official iGOT Karmayogi certified credentials." | Reframed to **SkillLens Achievement Certificate** with unique code (`SL-2026-CERT-XXXX`), SHA-256 hash, and a publicly accessible verification page (`/verify/certificate/:id`). | **[IMPLEMENTED & TESTED]** | Emphasize: *"We do not falsely claim to issue official Karmayogi degrees. SkillLens issues tamper-evident proof-of-competency certificates verifiable by QR code."* |
| **Claim 8: Syllabus Pattern Watcher** | "Monitors syllabus changes and alerts administrators." | Implemented set differential topic parser (ADDED, REMOVED, MODIFIED, UNCHANGED) and automatic question version lifecycle (`ACTIVE` -> `REVIEW`). | **[IMPLEMENTED & TESTED]** | Run the syllabus comparison between v1 and v2 in the Admin Console. |
| **Claim 9: Security & Auditing** | "Enterprise-grade government security." | Removed hardcoded admin string matching. Implemented strict email allowlist (`ADMIN_EMAILS`), DB role check (`is_admin`), sanitized operational audit logger (`AuditEvent`), and timing-safe password verification. | **[IMPLEMENTED & TESTED]** | Display the sanitized audit log in the Admin Console showing redacted tokens and sensitive parameters. |
| **Claim 10: Official MoSPI Integration** | "Officially endorsed and deployed by MoSPI." | Reframed: Prototype built specifically for MoSPI's statistical cadres (Junior Statistical Officer, Survey Supervisor, Data Analyst) based on public job descriptions. | **[REMOVED / REFRAINED]** | Clarify: *"SkillLens is a prototype engineered to solve MoSPI's capacity building requirements under Mission Karmayogi guidelines."* |

---

## 2. Risk Mitigation Summary

1. **The "Live Government API" Trap**: If a judge asks *"Can we see your live connection to the Government of India portal?"*, an unprepared team fails. Zero Day Nextron will confidently showcase the `IGOTProvider` architecture, the mock catalog provenance label, and explain why simulated sandboxing is standard security practice for non-cleared prototypes.
2. **The "Hallucinating AI" Trap**: If a judge asks *"What if the LLM makes up a government regulation?"*, we demonstrate the True RAG prompt constraint: if the evidence does not contain the rule, the model returns `INSUFFICIENT_EVIDENCE`.
3. **The "Black Box AI" Trap**: If a judge asks *"Why did the system give Aditi Level 2.8 instead of 3.0?"*, we show the exact BKT formula and the 60/40 moving average weights in the code.
