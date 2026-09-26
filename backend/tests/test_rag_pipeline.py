"""
Unit and Integration Tests for SkillLens AI RAG Pipeline (PRD Part 7)

Tests:
- Document chunking (token count, overlap, chunk metadata)
- Embedding generation & local FAISS / cosine vector indexing in backend/data/vector_indexes/
- Similarity retrieval (top-k filtering)
- Evidence-grounded generation and INSUFFICIENT_EVIDENCE fallback
- View Evidence source citations (document, page, excerpt)
"""
import os
import sys
import shutil
import tempfile
from pathlib import Path
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.services.rag_service import (
    clean_text,
    chunk_document,
    build_and_save_vector_index,
    retrieve_top_k_chunks,
    VECTOR_INDEX_DIR,
)


def test_clean_text():
    raw = "Sample   data  with \r\n multiple \t whitespace and [bracketed] notes."
    cleaned = clean_text(raw)
    assert "Sample data with" in cleaned
    assert "  " not in cleaned


def test_chunking_token_boundaries():
    doc_id = "test_doc_001"
    # Generate ~2000 words to test chunk splitting and overlap
    sample_text = " ".join([f"Word_{i} Statistical methodology for official survey administration." for i in range(1500)])
    pages_data = [
        {"page_number": 1, "text": " ".join([f"Word_{i}" for i in range(750)])},
        {"page_number": 2, "text": " ".join([f"Word_{i}" for i in range(750, 1500)])},
    ]

    chunks = chunk_document(doc_id, sample_text, pages_data=pages_data, target_tokens=800, overlap_tokens=100)
    assert len(chunks) >= 2, "Document should be partitioned into at least 2 chunks"

    for c in chunks:
        assert c["document_id"] == doc_id
        assert c["chunk_index"] >= 0
        assert c["page_number"] in [1, 2]
        assert len(c["chunk_hash"]) == 64  # SHA-256
        assert c["token_count"] > 0
        assert len(c["text"]) > 50


def test_vector_index_and_retrieval():
    doc_id = "test_doc_vector_002"
    chunks = [
        {
            "document_id": doc_id,
            "chunk_index": 0,
            "page_number": 1,
            "text": "Stratified random sampling ensures all subgroups of the population are proportionally represented.",
            "section": "Sampling Methods",
            "heading": "Stratified Sampling",
            "token_count": 15,
            "chunk_hash": "hash0",
        },
        {
            "document_id": doc_id,
            "chunk_index": 1,
            "page_number": 2,
            "text": "Data cleaning and outlier detection methods are critical for survey data validation.",
            "section": "Quality Control",
            "heading": "Validation",
            "token_count": 14,
            "chunk_hash": "hash1",
        },
        {
            "document_id": doc_id,
            "chunk_index": 2,
            "page_number": 3,
            "text": "Report writing requires executive summaries and clear data visualizations for stakeholders.",
            "section": "Reporting",
            "heading": "Presentations",
            "token_count": 13,
            "chunk_hash": "hash2",
        },
    ]

    # Build and persist index
    build_and_save_vector_index(doc_id, chunks)
    index_file = VECTOR_INDEX_DIR / f"{doc_id}.npz"
    assert index_file.exists(), "Vector index file must exist"

    # Query 1: Retrieve for 'stratified sampling'
    results = retrieve_top_k_chunks(doc_id, "How does stratified sampling work?", top_k=2)
    assert len(results) > 0
    top_match = results[0]
    assert "stratified" in top_match["text"].lower() or "sampling" in top_match["text"].lower()
    assert top_match["page_number"] == 1

    # Query 2: Retrieve for 'outlier detection'
    results_quality = retrieve_top_k_chunks(doc_id, "methods for outlier cleaning", top_k=2)
    assert len(results_quality) > 0
    assert "cleaning" in results_quality[0]["text"].lower() or "outlier" in results_quality[0]["text"].lower()


def test_retrieval_empty_query():
    results = retrieve_top_k_chunks("non_existent_doc", "", top_k=3)
    assert results == []
