# SkillLens AI — iGOT Karmayogi Integration Architecture

**Document Type**: Technical Integration Specification & Provenance Standard  
**Service Implementation**: `backend/app/services/igot_provider.py`  
**Mock Catalog**: `backend/data/igot_mock_catalog.json`  
**Router**: `backend/app/routers/mock_igot.py`

---

## 1. Context: What is iGOT Karmayogi?

**iGOT Karmayogi** (Integrated Government Online Training) is the Government of India's flagship digital learning platform under the **National Programme for Civil Services Capacity Building (NPCSCB)**. It hosts tens of thousands of courses aligned with the **FRAC (Framework for Roles, Activities, and Competencies)** dictionary to upskill civil servants across Union and State ministries.

---

## 2. The Prototype Reality: Why SkillLens Uses a Provider Pattern

### The Government Access Reality
Direct, production REST/GraphQL APIs for iGOT Karmayogi are hosted within secure National Informatics Centre (NIC) and Karmayogi Bharat network enclaves. They are **not publicly accessible** via the open internet for hackathons, student developers, or unauthorized external endpoints.

### The Honest Engineering Solution
Rather than hardcoding fake API responses or claiming a non-existent live integration with Karmayogi Bharat, SkillLens AI implements a production-grade **Provider Pattern (`IGOTProvider`)**:
1. An **Abstract Base Class (`IGOTProvider`)** defines the strict contract:
   - `search_courses(query, competency_id, page, limit)`
   - `get_course_details(course_id)`
   - `get_learner_enrollments(learner_id)`
   - `sync_competency_completion(learner_id, competency_id, evidence)`
2. The **`MockIGOTProvider`** implements this contract using a curated institutional training catalog (`backend/data/igot_mock_catalog.json`) based on actual MoSPI and DoPT course taxonomies.
3. Every response is transparently tagged with provenance metadata:
   ```json
   {
     "_provenance": {
       "source": "MockIGOTProvider",
       "is_live_government_api": false,
       "notice": "Prototype simulation aligned with official FRAC taxonomy"
     }
   }
   ```

---

## 3. Connecting to the Real iGOT Karmayogi Production API

When institutional MoUs and API credentials are provided by Karmayogi Bharat, the platform transitions to live production with **zero changes** to application business logic:

```python
class RealIGOTProvider(IGOTProvider):
    def __init__(self, base_url: str, api_key: str, client_cert: str):
        self.base_url = base_url
        self.session = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"},
            cert=client_cert,
        )

    def search_courses(self, query: str = None, competency_id: str = None, limit: int = 10):
        resp = self.session.get(f"{self.base_url}/api/v1/courses", params={"q": query, "comp": competency_id})
        resp.raise_for_status()
        return resp.json()["results"]
```

In `backend/app/core/config.py`, toggle:
```ini
IGOT_PROVIDER_TYPE=real
IGOT_API_ENDPOINT=https://api.igotkarmayogi.gov.in
IGOT_API_KEY=your_secured_production_key
```

---

## 4. The Competency Evidence Loop

The primary value proposition of SkillLens is not replacing iGOT, but **closing the loop**:

```
+-------------------------------------------------------------+
|                      iGOT KARMAYOGI                         |
|                                                             |
|   "What should an officer learn?"                           |
|   - 10,000+ Online Modules                                  |
|   - Video Lectures & Reading Materials                      |
|   - Course Completion Certificates                          |
+------------------------------+------------------------------+
                               │ Course Enrolled & Completed
                               v
+-------------------------------------------------------------+
|                      SKILLLENS AI                           |
|                                                             |
|   "Can the officer actually apply and demonstrate it?"      |
|   - Objective Cadre Baseline Diagnostics                    |
|   - True RAG from Operational Guidelines & Field Manuals    |
|   - Granular Bayesian Knowledge Tracing (BKT)               |
|   - Pre/Post Learning Delta Verification                    |
|   - Immutable Competency Evidence Ledger                    |
+------------------------------+------------------------------+
                               │ Verified Competency Delta
                               v
+-------------------------------------------------------------+
|               CADRE TRAINING ADMINISTRATOR                  |
|   - Objective Evidence for Training Needs Analysis (TNA)    |
|   - Empirical Verification of Capacity Development          |
+-------------------------------------------------------------+
```

---

## 5. Mock Catalog Structure

The catalog includes 14 curated modules addressing MoSPI statistical cadres:
- **`mod_01`**: Advanced Stratified & Multi-Stage Sampling (Domain / Level 4)
- **`mod_02`**: Field Investigation Standard Operating Procedures (Functional / Level 3)
- **`mod_03`**: Statistical Audit & Data Sanitization Rules (Domain / Level 3)
- **`mod_04`**: Stakeholder Communication & Respondent Rapport (Behavioral / Level 3)
- **`mod_05`**: Advanced Survey Error Estimation & Imputation (Domain / Level 4)

Each module specifies duration, prerequisites, and mapped competencies, ensuring seamless compatibility with the SkillLens 6-factor hybrid recommender.
