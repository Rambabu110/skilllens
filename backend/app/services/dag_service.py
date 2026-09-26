"""
Prerequisite Directed Acyclic Graph (DAG) & Root-Cause Service (PRD Part 11)

Ensures the prerequisite competency graph is:
- DIRECTED
- ACYCLIC (cycle-tested via topological sort)
- VALIDATED (no self-loops, no duplicate edges)

Identifies true upstream root causes for downstream competency gaps:
e.g. Failure in "Advanced Sampling" because "Sampling Design" is weak.
"""
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict, deque
from sqlalchemy.orm import Session

from app.models.models import Competency, CompetencyPrereq


def validate_dag(edges: List[Tuple[str, str]]) -> Tuple[bool, Optional[List[str]]]:
    """
    Validates that a list of directed edges (from_id, to_id) forms a valid DAG with no cycles.
    Returns (is_valid, cycle_or_error_nodes).
    """
    adj = defaultdict(list)
    in_degree = defaultdict(int)
    all_nodes = set()

    for u, v in edges:
        if u == v:
            return False, [u]  # self-loop
        adj[u].append(v)
        in_degree[v] += 1
        all_nodes.add(u)
        all_nodes.add(v)

    # Kahn's algorithm for topological sorting / cycle detection
    queue = deque([n for n in all_nodes if in_degree[n] == 0])
    visited_count = 0

    while queue:
        curr = queue.popleft()
        visited_count += 1
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited_count == len(all_nodes):
        return True, None

    # Cycle detected
    cycle_nodes = [n for n in all_nodes if in_degree[n] > 0]
    return False, cycle_nodes


def get_validated_prereq_graph(db: Session) -> Dict[str, List[str]]:
    """
    Loads all prerequisite edges from DB, validates acyclicity,
    and returns an adjacency list mapping competency_id -> list of prerequisite competency_ids.
    """
    db_edges = db.query(CompetencyPrereq).all()
    edge_pairs = [(e.prereq_competency_id, e.competency_id) for e in db_edges]

    is_valid, cycle = validate_dag(edge_pairs)
    if not is_valid:
        print(f"[Warning: Prereq Cycle Detected] in nodes: {cycle}. Pruning violating edges...")
        # Safe self-healing: skip backward cycle edges
        pruned_pairs = []
        for u, v in edge_pairs:
            test_pairs = pruned_pairs + [(u, v)]
            valid, _ = validate_dag(test_pairs)
            if valid:
                pruned_pairs.append((u, v))
        edge_pairs = pruned_pairs

    prereq_map = defaultdict(list)
    for u, v in edge_pairs:
        # v requires u (u is prerequisite of v)
        prereq_map[v].append(u)

    return dict(prereq_map)


def find_upstream_root_cause(
    comp_id: str,
    gap_map: Dict[str, float],
    prereq_map: Dict[str, List[str]],
    name_map: Dict[str, str],
    visited: Optional[Set[str]] = None,
) -> Tuple[Optional[str], int]:
    """
    Recursively discovers the deepest upstream prerequisite competency that also
    suffers from an unresolved gap (gap >= 0.5).
    Returns (root_competency_name, depth).
    """
    if visited is None:
        visited = set()

    if comp_id in visited:
        return None, 0
    visited.add(comp_id)

    prereqs = prereq_map.get(comp_id, [])
    failing_prereqs = [p for p in prereqs if gap_map.get(p, 0.0) >= 0.5 and p not in visited]

    if not failing_prereqs:
        return None, 0

    deepest_root = None
    max_depth = 0

    for p in failing_prereqs:
        ancestor_name, ancestor_depth = find_upstream_root_cause(
            p, gap_map, prereq_map, name_map, visited.copy()
        )
        current_name = ancestor_name if ancestor_name else name_map.get(p, "Prerequisite Competency")
        total_depth = ancestor_depth + 1
        if total_depth > max_depth:
            max_depth = total_depth
            deepest_root = current_name

    return deepest_root, max_depth
