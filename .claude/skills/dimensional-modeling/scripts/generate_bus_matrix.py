#!/usr/bin/env python3
"""
Generate a dimensional bus matrix from dbt models.

Analyzes fact and dimension tables to show which dimensions are used by which facts.

Usage:
    python generate_bus_matrix.py <dbt_project_path>

Example:
    python generate_bus_matrix.py dbt_project
"""

import sys
import os
import re
from pathlib import Path


def find_refs(sql_content: str) -> list[str]:
    """Extract all ref() calls from SQL content."""
    pattern = r"\{\{\s*ref\(['\"]([^'\"]+)['\"]\)\s*\}\}"
    return re.findall(pattern, sql_content)


def categorize_model(name: str, refs: list[str]) -> str:
    """Categorize model as fact, dimension, or other."""
    if name.startswith('fct_'):
        return 'fact'
    elif name.startswith('dim_'):
        return 'dimension'
    elif name.startswith('stg_') or name.startswith('int_'):
        return 'staging'
    return 'other'


def build_bus_matrix(dbt_path: str) -> dict:
    """Build the bus matrix from dbt models."""
    models_path = Path(dbt_path) / 'models'

    if not models_path.exists():
        raise FileNotFoundError(f"Models directory not found: {models_path}")

    facts = {}
    dimensions = set()

    # First pass: identify all dimensions
    for sql_file in models_path.rglob('*.sql'):
        model_name = sql_file.stem
        if model_name.startswith('dim_'):
            dimensions.add(model_name)

    # Second pass: find dimension refs in facts
    for sql_file in models_path.rglob('*.sql'):
        model_name = sql_file.stem
        if not model_name.startswith('fct_'):
            continue

        content = sql_file.read_text()
        refs = find_refs(content)

        # Find which dimensions this fact references (directly or indirectly)
        fact_dims = set()
        for ref in refs:
            if ref.startswith('dim_'):
                fact_dims.add(ref)

        facts[model_name] = fact_dims

    return {
        'facts': facts,
        'dimensions': sorted(dimensions)
    }


def print_bus_matrix(matrix: dict):
    """Print the bus matrix in a readable format."""
    facts = matrix['facts']
    dimensions = matrix['dimensions']

    if not facts:
        print("No fact tables found (fct_* prefix)")
        return

    if not dimensions:
        print("No dimension tables found (dim_* prefix)")
        return

    # Calculate column widths
    fact_width = max(len(f) for f in facts.keys()) + 2
    dim_width = 12

    # Header
    header = 'Fact Table'.ljust(fact_width)
    for dim in dimensions:
        short_name = dim.replace('dim_', '')[:10]
        header += short_name.center(dim_width)
    print(header)
    print('-' * len(header))

    # Rows
    for fact, fact_dims in sorted(facts.items()):
        row = fact.ljust(fact_width)
        for dim in dimensions:
            if dim in fact_dims:
                row += 'X'.center(dim_width)
            else:
                row += '.'.center(dim_width)
        print(row)

    print()
    print("Legend: X = dimension used, . = not used")
    print()

    # Conformed dimensions (used by multiple facts)
    conformed = []
    for dim in dimensions:
        usage_count = sum(1 for f in facts.values() if dim in f)
        if usage_count > 1:
            conformed.append((dim, usage_count))

    if conformed:
        print("Conformed Dimensions:")
        for dim, count in sorted(conformed, key=lambda x: -x[1]):
            print(f"  {dim}: used by {count} facts")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    dbt_path = sys.argv[1]

    try:
        matrix = build_bus_matrix(dbt_path)
        print_bus_matrix(matrix)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
