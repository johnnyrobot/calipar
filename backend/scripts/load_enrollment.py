#!/usr/bin/env python3
"""
Enrollment Data Loading Script

Parses Excel enrollment files from CCC and loads them into the enrollment_snapshots table.
Supports Fall, Spring, Summer, and Winter term data.

Usage:
    python -m scripts.load_enrollment [--data-dir PATH] [--dry-run]

Examples:
    # Load from default reference data location
    python -m scripts.load_enrollment

    # Dry run (parse but don't insert)
    python -m scripts.load_enrollment --dry-run

    # Custom data directory
    python -m scripts.load_enrollment --data-dir /path/to/enrollment/data
"""

import argparse
import logging
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

import pandas as pd
from sqlmodel import Session, select

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine
from models.enrollment import EnrollmentSnapshot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Default data directory (relative to project root)
DEFAULT_DATA_DIR = Path(__file__).parent.parent.parent.parent / "reference_data" / "enrollment"


def parse_term_from_filename(filename: str) -> Tuple[str, date]:
    """
    Parse term name and snapshot date from filename.

    Examples:
        "Fall_2024 (11-13-24).xlsx" -> ("Fall 2024", date(2024, 11, 13))
        "Spring_2025_5-7-25.xlsx" -> ("Spring 2025", date(2025, 5, 7))
        "Winter_2026_12-10-25.xlsx" -> ("Winter 2026", date(2025, 12, 10))

    Returns:
        Tuple of (term_name, snapshot_date)
    """
    # Remove extension
    name = filename.replace(".xlsx", "").replace(".xls", "")

    # Try pattern with parentheses: "Fall_2024 (11-13-24)"
    match = re.match(r"(\w+)_(\d{4})\s*\((\d{1,2})-(\d{1,2})-(\d{2})\)", name)
    if match:
        term_type = match.group(1)
        term_year = match.group(2)
        month = int(match.group(3))
        day = int(match.group(4))
        year_short = int(match.group(5))
        year = 2000 + year_short if year_short < 50 else 1900 + year_short
        return f"{term_type} {term_year}", date(year, month, day)

    # Try pattern with underscores: "Spring_2025_5-7-25"
    match = re.match(r"(\w+)_(\d{4})_(\d{1,2})-(\d{1,2})-(\d{2})", name)
    if match:
        term_type = match.group(1)
        term_year = match.group(2)
        month = int(match.group(3))
        day = int(match.group(4))
        year_short = int(match.group(5))
        year = 2000 + year_short if year_short < 50 else 1900 + year_short
        return f"{term_type} {term_year}", date(year, month, day)

    # Fallback: just extract term info
    match = re.match(r"(\w+)_(\d{4})", name)
    if match:
        term_type = match.group(1)
        term_year = match.group(2)
        return f"{term_type} {term_year}", date.today()

    raise ValueError(f"Could not parse term from filename: {filename}")


def parse_enrollment_excel(filepath: Path) -> Dict[str, Any]:
    """
    Parse an enrollment Excel file and extract structured data.

    Returns a dictionary with:
    - summary: Overall enrollment statistics
    - by_mode: Breakdown by Mode of Instruction (In-Person, Online, Hybrid, etc.)
    - by_term_length: Breakdown by term length (Full-term, Short-term, etc.)
    - by_discipline: Breakdown by academic discipline/department
    - raw_data: List of course-level records
    """
    logger.info(f"Parsing: {filepath.name}")

    try:
        # Read the Excel file - try multiple sheet approaches
        excel_file = pd.ExcelFile(filepath)
        sheet_names = excel_file.sheet_names
        logger.debug(f"Found sheets: {sheet_names}")

        # Try to find the main data sheet
        df = None
        for sheet_name in sheet_names:
            temp_df = pd.read_excel(excel_file, sheet_name=sheet_name)
            if len(temp_df) > 10:  # Assume main sheet has substantial data
                df = temp_df
                logger.debug(f"Using sheet: {sheet_name}")
                break

        if df is None:
            df = pd.read_excel(excel_file, sheet_name=0)

        # Clean column names
        df.columns = df.columns.str.strip()

        # Log available columns for debugging
        logger.debug(f"Columns: {list(df.columns)}")

        # Initialize result structure
        result = {
            "summary": {},
            "by_mode": {},
            "by_term_length": {},
            "by_discipline": {},
            "by_credit_type": {},
            "raw_records_count": 0,
        }

        # Try to identify common enrollment columns
        enrollment_col = None
        seats_col = None
        sections_col = None
        fill_rate_col = None
        mode_col = None
        term_length_col = None
        discipline_col = None

        # Map columns by common names
        column_mapping = {
            "enrollment": ["enrollment", "enrolled", "enrl", "enroll", "total_enrollment"],
            "seats": ["seats", "cap", "capacity", "total_seats"],
            "sections": ["sections", "section", "sec", "total_sections"],
            "fill_rate": ["fill_rate", "fill rate", "fill %", "fill", "fill_pct"],
            "mode": ["mode", "mode of instruction", "modality", "instruction_mode", "mode_of_instruction"],
            "term_length": ["term_length", "term length", "session", "term", "length"],
            "discipline": ["discipline", "dept", "department", "subject", "subj", "subject_area"],
        }

        for col in df.columns:
            col_lower = col.lower().strip()
            for key, patterns in column_mapping.items():
                if any(p in col_lower for p in patterns):
                    if key == "enrollment" and enrollment_col is None:
                        enrollment_col = col
                    elif key == "seats" and seats_col is None:
                        seats_col = col
                    elif key == "sections" and sections_col is None:
                        sections_col = col
                    elif key == "fill_rate" and fill_rate_col is None:
                        fill_rate_col = col
                    elif key == "mode" and mode_col is None:
                        mode_col = col
                    elif key == "term_length" and term_length_col is None:
                        term_length_col = col
                    elif key == "discipline" and discipline_col is None:
                        discipline_col = col

        logger.debug(f"Identified columns - enrollment: {enrollment_col}, seats: {seats_col}, "
                    f"sections: {sections_col}, mode: {mode_col}, discipline: {discipline_col}")

        # Calculate summary statistics
        if enrollment_col:
            df[enrollment_col] = pd.to_numeric(df[enrollment_col], errors="coerce")
            result["summary"]["total_enrollment"] = int(df[enrollment_col].sum())
        if seats_col:
            df[seats_col] = pd.to_numeric(df[seats_col], errors="coerce")
            result["summary"]["total_seats"] = int(df[seats_col].sum())
        if sections_col:
            df[sections_col] = pd.to_numeric(df[sections_col], errors="coerce")
            result["summary"]["total_sections"] = int(df[sections_col].sum())

        # Calculate fill rate
        if result["summary"].get("total_enrollment") and result["summary"].get("total_seats"):
            seats = result["summary"]["total_seats"]
            if seats > 0:
                result["summary"]["fill_rate"] = round(
                    result["summary"]["total_enrollment"] / seats * 100, 2
                )

        # Group by Mode of Instruction
        if mode_col and enrollment_col:
            mode_groups = df.groupby(mode_col).agg({
                enrollment_col: "sum",
                **(({seats_col: "sum"}) if seats_col else {}),
                **(({sections_col: "sum"}) if sections_col else {}),
            }).to_dict("index")

            for mode, stats in mode_groups.items():
                if pd.notna(mode):
                    mode_str = str(mode).strip()
                    result["by_mode"][mode_str] = {
                        "enrollment": int(stats.get(enrollment_col, 0) or 0),
                        "seats": int(stats.get(seats_col, 0) or 0) if seats_col else None,
                        "sections": int(stats.get(sections_col, 0) or 0) if sections_col else None,
                    }

        # Group by Term Length (if available)
        if term_length_col and enrollment_col:
            length_groups = df.groupby(term_length_col).agg({
                enrollment_col: "sum",
                **(({seats_col: "sum"}) if seats_col else {}),
            }).to_dict("index")

            for length, stats in length_groups.items():
                if pd.notna(length):
                    length_str = str(length).strip()
                    result["by_term_length"][length_str] = {
                        "enrollment": int(stats.get(enrollment_col, 0) or 0),
                        "seats": int(stats.get(seats_col, 0) or 0) if seats_col else None,
                    }

        # Group by Discipline/Department
        if discipline_col and enrollment_col:
            disc_groups = df.groupby(discipline_col).agg({
                enrollment_col: "sum",
                **(({seats_col: "sum"}) if seats_col else {}),
                **(({sections_col: "sum"}) if sections_col else {}),
            }).to_dict("index")

            for disc, stats in disc_groups.items():
                if pd.notna(disc):
                    disc_str = str(disc).strip()
                    result["by_discipline"][disc_str] = {
                        "enrollment": int(stats.get(enrollment_col, 0) or 0),
                        "seats": int(stats.get(seats_col, 0) or 0) if seats_col else None,
                        "sections": int(stats.get(sections_col, 0) or 0) if sections_col else None,
                    }

        # Record count
        result["raw_records_count"] = len(df)

        logger.info(f"  Parsed {result['raw_records_count']} records, "
                   f"Total enrollment: {result['summary'].get('total_enrollment', 'N/A')}")

        return result

    except Exception as e:
        logger.error(f"Error parsing {filepath.name}: {e}")
        raise


def load_enrollment_data(
    data_dir: Path,
    dry_run: bool = False,
) -> List[EnrollmentSnapshot]:
    """
    Load all enrollment Excel files from a directory.

    Args:
        data_dir: Directory containing enrollment Excel files
        dry_run: If True, parse but don't insert into database

    Returns:
        List of created EnrollmentSnapshot objects
    """
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    # Find Excel files
    excel_files = list(data_dir.glob("*.xlsx")) + list(data_dir.glob("*.xls"))
    if not excel_files:
        logger.warning(f"No Excel files found in {data_dir}")
        return []

    logger.info(f"Found {len(excel_files)} enrollment files in {data_dir}")

    snapshots = []
    errors = []

    for filepath in sorted(excel_files):
        try:
            # Parse term info from filename
            term_name, snapshot_date = parse_term_from_filename(filepath.name)

            # Parse the Excel file
            data = parse_enrollment_excel(filepath)

            # Create snapshot object
            snapshot = EnrollmentSnapshot(
                term=term_name,
                snapshot_date=snapshot_date,
                data=data,
            )
            snapshots.append(snapshot)

        except Exception as e:
            logger.error(f"Failed to process {filepath.name}: {e}")
            errors.append((filepath.name, str(e)))

    if errors:
        logger.warning(f"Encountered {len(errors)} errors during parsing")
        for filename, error in errors:
            logger.warning(f"  {filename}: {error}")

    if dry_run:
        logger.info("Dry run - not inserting into database")
        for snap in snapshots:
            logger.info(f"  Would insert: {snap.term} ({snap.snapshot_date})")
        return snapshots

    # Insert into database
    with Session(engine) as session:
        for snapshot in snapshots:
            # Check if already exists
            existing = session.exec(
                select(EnrollmentSnapshot).where(
                    EnrollmentSnapshot.term == snapshot.term,
                    EnrollmentSnapshot.snapshot_date == snapshot.snapshot_date,
                )
            ).first()

            if existing:
                logger.info(f"Updating existing: {snapshot.term} ({snapshot.snapshot_date})")
                existing.data = snapshot.data
            else:
                logger.info(f"Inserting: {snapshot.term} ({snapshot.snapshot_date})")
                session.add(snapshot)

        session.commit()

    logger.info(f"Successfully loaded {len(snapshots)} enrollment snapshots")
    return snapshots


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Load enrollment data from Excel files into the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help=f"Directory containing enrollment Excel files (default: {DEFAULT_DATA_DIR})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse files but don't insert into database",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        snapshots = load_enrollment_data(args.data_dir, args.dry_run)
        print(f"\n{'='*60}")
        print(f"Enrollment Data Loading Complete")
        print(f"{'='*60}")
        print(f"Files processed: {len(snapshots)}")
        for snap in snapshots:
            summary = snap.data.get("summary", {})
            print(f"  - {snap.term}: {summary.get('total_enrollment', 'N/A')} enrolled")
        print()

    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to load enrollment data: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
