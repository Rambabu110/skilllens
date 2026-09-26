"""
SkillLens AI — iGOT Karmayogi Integration Architecture (PRD Part 18, 19, 20)

Provides a standardized provider abstraction for iGOT Karmayogi integration:
- IGOTProvider (abstract contract)
- MockIGOTProvider (backed by local verified prototype catalog)
- FutureRealIGOTProvider (adapter ready for institutional REST/GraphQL endpoints)
- IGOTSSOProvider (single sign-on abstraction)

Explicitly disclaims live government API claims while maintaining production-ready contract architecture.
"""
import json
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "igot_mock_catalog.json"


class IGOTProvider(ABC):
    """Abstract Interface for iGOT Karmayogi ecosystem connectivity."""

    @abstractmethod
    def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Validates institutional connection token/credentials."""
        pass

    @abstractmethod
    def get_courses(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves available capacity building courses."""
        pass

    @abstractmethod
    def search_courses(self, query: str) -> List[Dict[str, Any]]:
        """Searches course catalog by keyword or phrase."""
        pass

    @abstractmethod
    def get_course(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Fetches detailed course metadata."""
        pass

    @abstractmethod
    def get_competencies(self) -> List[str]:
        """Retrieves list of all FRAC competencies addressed across courses."""
        pass

    @abstractmethod
    def get_course_competencies(self, competency_name: str) -> List[Dict[str, Any]]:
        """Pulls courses mapped to a specific FRAC competency."""
        pass

    @abstractmethod
    def recommend_courses(self, competency_gaps: List[str], top_n: int = 5) -> List[Dict[str, Any]]:
        """Recommends courses addressing target competency deficits."""
        pass

    @abstractmethod
    def notify(self, learner_id: str, message: str) -> Dict[str, Any]:
        """Dispatches an institutional notification."""
        pass


class MockIGOTProvider(IGOTProvider):
    """
    Prototype adapter implementing the IGOTProvider contract using
    the verified prototype mock catalog in backend/data/igot_mock_catalog.json.
    """

    def __init__(self):
        self._catalog = []
        if CATALOG_PATH.exists():
            try:
                with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                    self._catalog = json.load(f)
            except Exception as e:
                print(f"[MockIGOTProvider] Error loading mock catalog: {e}")

    def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "status": "authenticated",
            "provider": "MockIGOTProvider",
            "adapter_type": "prototype_simulation",
            "contract_version": "v1.0_FRAC",
        }

    def get_courses(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._catalog[:limit]

    def search_courses(self, query: str) -> List[Dict[str, Any]]:
        q = query.lower().strip()
        return [
            c for c in self._catalog
            if q in c["title"].lower() or q in c["description"].lower() or any(q in comp.lower() for comp in c.get("competencies", []))
        ]

    def get_course(self, course_id: str) -> Optional[Dict[str, Any]]:
        for c in self._catalog:
            if c["course_id"] == course_id:
                return c
        return None

    def get_competencies(self) -> List[str]:
        comps = set()
        for c in self._catalog:
            comps.update(c.get("competencies", []))
        return sorted(list(comps))

    def get_course_competencies(self, competency_name: str) -> List[Dict[str, Any]]:
        target = competency_name.lower().strip()
        return [
            c for c in self._catalog
            if any(target in comp.lower() for comp in c.get("competencies", []))
        ]

    def recommend_courses(self, competency_gaps: List[str], top_n: int = 5) -> List[Dict[str, Any]]:
        matched = []
        seen = set()
        for gap in competency_gaps:
            for c in self.get_course_competencies(gap):
                if c["course_id"] not in seen:
                    matched.append(c)
                    seen.add(c["course_id"])
                    if len(matched) >= top_n:
                        return matched
        return matched[:top_n]

    def notify(self, learner_id: str, message: str) -> Dict[str, Any]:
        return {
            "status": "queued",
            "provider": "MockIGOTProvider",
            "recipient_id": learner_id,
            "message": message,
            "simulation_note": "Simulated institutional notification queue.",
        }


class FutureRealIGOTProvider(IGOTProvider):
    """
    Placeholder adapter for live Karmayogi Bharat / iGOT REST API access.
    To be activated when official institutional API keys and endpoints are provisioned.
    """

    def __init__(self, api_base_url: str, client_id: str, client_secret: str):
        self.api_base_url = api_base_url
        self.client_id = client_id
        self.client_secret = client_secret

    def authenticate(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError("Live iGOT API credentials not configured.")

    def get_courses(self, limit: int = 50) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def search_courses(self, query: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def get_course(self, course_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def get_competencies(self) -> List[str]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def get_course_competencies(self, competency_name: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def recommend_courses(self, competency_gaps: List[str], top_n: int = 5) -> List[Dict[str, Any]]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")

    def notify(self, learner_id: str, message: str) -> Dict[str, Any]:
        raise NotImplementedError("Live iGOT API endpoint not configured.")


class IGOTSSOProvider:
    """SSO interface contract for Karmayogi single sign-on."""

    @staticmethod
    def authenticate_user(token: str) -> Dict[str, Any]:
        return {
            "valid": bool(token),
            "provider": "iGOT SSO Simulation",
            "authenticated": bool(token),
            "simulation_notice": "Institutional SSO simulation for SIH prototype evaluation.",
        }


# Default singleton instance
default_igot_provider: IGOTProvider = MockIGOTProvider()
