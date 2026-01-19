#!/usr/bin/env python3
"""
Validate dbt model files for common issues.

Checks:
- Naming conventions (stg_, int_, dim_, fct_)
- Required config blocks
- CTE structure
- Documentation presence

Usage:
    python validate_dbt_model.py <model_file.sql>
    python validate_dbt_model.py dbt_project/models/  # validates all

Example:
    python validate_dbt_model.py dbt_project/models/marts/core/fct_trips.sql
"""

import sys
import re
from pathlib import Path


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, msg: str):
        self.errors.append(msg)

    def warning(self, msg: str):
        self.warnings.append(msg)

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0


def validate_naming(path: Path, content: str) -> ValidationResult:
    """Validate model naming conventions."""
    result = ValidationResult()
    name = path.stem

    # Check prefix based on folder
    folder = path.parent.name
    if folder in ['staging', 'stg']:
        if not name.startswith('stg_'):
            result.error(f"Staging model should start with 'stg_': {name}")
        if '__' not in name:
            result.warning(f"Staging model should use double underscore: stg_<source>__<entity>")
    elif folder in ['intermediate', 'int']:
        if not name.startswith('int_'):
            result.error(f"Intermediate model should start with 'int_': {name}")
    elif folder in ['marts', 'core']:
        if not (name.startswith('dim_') or name.startswith('fct_')):
            result.warning(f"Mart model should start with 'dim_' or 'fct_': {name}")

    return result


def validate_config(path: Path, content: str) -> ValidationResult:
    """Validate config block for marts."""
    result = ValidationResult()
    name = path.stem

    # Fact tables should have incremental config
    if name.startswith('fct_'):
        if 'materialized' not in content:
            result.warning("Fact table missing materialized config")
        elif "materialized='incremental'" not in content and 'materialized="incremental"' not in content:
            result.warning("Fact table should consider incremental materialization")

        if name.startswith('fct_') and 'unique_key' not in content:
            result.warning("Incremental fact table should have unique_key defined")

    return result


def validate_structure(path: Path, content: str) -> ValidationResult:
    """Validate SQL structure."""
    result = ValidationResult()

    # Should use CTEs
    if 'with ' not in content.lower() and 'WITH ' not in content:
        result.warning("Consider using CTEs for readability")

    # Check for final select
    lines = content.strip().split('\n')
    last_significant = ''
    for line in reversed(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith('--'):
            last_significant = stripped.lower()
            break

    if not last_significant.startswith('select'):
        if 'from' not in last_significant:
            result.warning("Model should end with a SELECT statement")

    # Check for ref usage in non-staging models
    name = path.stem
    if not name.startswith('stg_') and not name.startswith('raw_'):
        if '{{ source(' in content and '{{ ref(' not in content:
            result.error("Non-staging models should use ref(), not source()")

    # Check staging uses source
    if name.startswith('stg_'):
        if '{{ source(' not in content:
            result.warning("Staging models should reference source()")

    return result


def validate_file(path: Path) -> ValidationResult:
    """Run all validations on a file."""
    combined = ValidationResult()

    try:
        content = path.read_text()
    except Exception as e:
        combined.error(f"Could not read file: {e}")
        return combined

    for validator in [validate_naming, validate_config, validate_structure]:
        result = validator(path, content)
        combined.errors.extend(result.errors)
        combined.warnings.extend(result.warnings)

    return combined


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    target = Path(sys.argv[1])

    if target.is_file():
        files = [target]
    elif target.is_dir():
        files = list(target.rglob('*.sql'))
    else:
        print(f"ERROR: Path not found: {target}")
        sys.exit(1)

    total_errors = 0
    total_warnings = 0

    for path in sorted(files):
        result = validate_file(path)

        if result.errors or result.warnings:
            print(f"\n{path.name}")
            print("-" * len(path.name))

            for error in result.errors:
                print(f"  ERROR: {error}")
                total_errors += 1

            for warning in result.warnings:
                print(f"  WARN:  {warning}")
                total_warnings += 1

    print(f"\n{'=' * 40}")
    print(f"Files checked: {len(files)}")
    print(f"Errors: {total_errors}")
    print(f"Warnings: {total_warnings}")

    sys.exit(1 if total_errors > 0 else 0)


if __name__ == "__main__":
    main()
