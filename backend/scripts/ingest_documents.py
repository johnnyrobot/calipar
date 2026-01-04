#!/usr/bin/env python3
"""
ISMP and ACCJC Documents Ingestion Script

This script uploads institutional documents to Google Gemini File Search
for RAG (Retrieval Augmented Generation) functionality in the Compliance Copilot.

Documents indexed:
- CCC Integrated Strategic Master Plan (ISMP) 2019-2024
- CCC ISMP Executive Summary
- ACCJC Accreditation Standards 2024
- ACCJC Eligibility Requirements
- Various ACCJC policy documents

Usage:
    python scripts/ingest_documents.py

Environment Variables Required:
    GOOGLE_API_KEY - Google AI API key

Output:
    Creates or updates a File Search store and prints the store name
    to be saved in GEMINI_FILE_SEARCH_STORE_NAME environment variable.
"""

import os
import sys
import time
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("ERROR: google-genai package not installed.")
    print("Install with: pip install google-genai")
    sys.exit(1)


# Document configurations with metadata
ISMP_DOCUMENTS = [
    {
        "path": "reference_data/2019-2024-CCC-Integrated-Strategic-Master-Plan.pdf",
        "display_name": "CCC ISMP 2019-2024 Full Plan",
        "metadata": [
            {"key": "document_type", "string_value": "strategic_plan"},
            {"key": "institution", "string_value": "CCC"},
            {"key": "year_range", "string_value": "2019-2024"},
        ],
    },
    {
        "path": "reference_data/CCC_2019-24_ISMP_Exec_Summary_8-10-20.pdf",
        "display_name": "CCC ISMP 2019-2024 Executive Summary",
        "metadata": [
            {"key": "document_type", "string_value": "strategic_plan"},
            {"key": "institution", "string_value": "CCC"},
            {"key": "year_range", "string_value": "2019-2024"},
            {"key": "summary", "string_value": "true"},
        ],
    },
]

ACCJC_DOCUMENTS = [
    {
        "path": "ACCJC/ACCJC-2024-Accreditation-Standards.pdf",
        "display_name": "ACCJC Accreditation Standards 2024",
        "metadata": [
            {"key": "document_type", "string_value": "accreditation_standards"},
            {"key": "organization", "string_value": "ACCJC"},
            {"key": "year", "numeric_value": 2024},
        ],
    },
    {
        "path": "ACCJC/Eligibility-Requirements-for-Accreditation.pdf",
        "display_name": "ACCJC Eligibility Requirements",
        "metadata": [
            {"key": "document_type", "string_value": "accreditation_requirements"},
            {"key": "organization", "string_value": "ACCJC"},
        ],
    },
    {
        "path": "ACCJC/Policy-on-Substantive-Change.pdf",
        "display_name": "ACCJC Policy on Substantive Change",
        "metadata": [
            {"key": "document_type", "string_value": "accreditation_policy"},
            {"key": "organization", "string_value": "ACCJC"},
            {"key": "policy_area", "string_value": "substantive_change"},
        ],
    },
    {
        "path": "ACCJC/Policy-on-Distance-and-on-Correspondence-Education.pdf",
        "display_name": "ACCJC Policy on Distance Education",
        "metadata": [
            {"key": "document_type", "string_value": "accreditation_policy"},
            {"key": "organization", "string_value": "ACCJC"},
            {"key": "policy_area", "string_value": "distance_education"},
        ],
    },
    {
        "path": "ACCJC/Policy-on-Institutional-Integrity-and-Ethics.pdf",
        "display_name": "ACCJC Policy on Institutional Integrity",
        "metadata": [
            {"key": "document_type", "string_value": "accreditation_policy"},
            {"key": "organization", "string_value": "ACCJC"},
            {"key": "policy_area", "string_value": "integrity_ethics"},
        ],
    },
]

# Combine all documents
ALL_DOCUMENTS = ISMP_DOCUMENTS + ACCJC_DOCUMENTS


def get_project_root() -> Path:
    """Get the project root directory (calipar repo root)."""
    # Script is in backend/scripts/, go up 3 levels to get repo root
    script_dir = Path(__file__).parent
    return script_dir.parent.parent.parent.parent


def find_document(relative_path: str) -> Optional[Path]:
    """Find a document by relative path from project root."""
    project_root = get_project_root()
    full_path = project_root / relative_path

    if full_path.exists():
        return full_path

    # Try alternative paths
    alt_paths = [
        project_root / "calipar" / relative_path,
        Path(__file__).parent.parent.parent / relative_path,
    ]

    for alt_path in alt_paths:
        if alt_path.exists():
            return alt_path

    return None


def create_file_search_store(client: genai.Client, store_name: str) -> str:
    """Create a new File Search store."""
    print(f"\nCreating File Search store: {store_name}")

    try:
        file_search_store = client.file_search_stores.create(
            config={"display_name": store_name}
        )
        print(f"  Created store: {file_search_store.name}")
        return file_search_store.name
    except Exception as e:
        print(f"  ERROR creating store: {e}")
        raise


def list_existing_stores(client: genai.Client) -> list:
    """List existing File Search stores."""
    print("\nListing existing File Search stores...")
    stores = []
    try:
        for store in client.file_search_stores.list():
            stores.append(store)
            print(f"  - {store.name} ({store.display_name})")
    except Exception as e:
        print(f"  ERROR listing stores: {e}")
    return stores


def upload_document(
    client: genai.Client,
    store_name: str,
    file_path: Path,
    display_name: str,
    metadata: list,
) -> bool:
    """Upload a document to the File Search store."""
    print(f"\n  Uploading: {display_name}")
    print(f"    File: {file_path}")

    try:
        # Upload file to File Search store directly
        operation = client.file_search_stores.upload_to_file_search_store(
            file=str(file_path),
            file_search_store_name=store_name,
            config={
                "display_name": display_name,
                "chunking_config": {
                    "white_space_config": {
                        "max_tokens_per_chunk": 512,
                        "max_overlap_tokens": 50,
                    }
                },
            },
        )

        # Wait for operation to complete
        print("    Processing...", end="", flush=True)
        wait_count = 0
        while not operation.done:
            time.sleep(3)
            operation = client.operations.get(operation)
            wait_count += 1
            print(".", end="", flush=True)
            if wait_count > 60:  # 3 minute timeout
                print("\n    WARNING: Operation taking too long, continuing...")
                break

        print(" Done!")
        return True

    except Exception as e:
        print(f"\n    ERROR: {e}")
        return False


def test_file_search(client: genai.Client, store_name: str) -> None:
    """Test the File Search store with a sample query."""
    print("\n" + "=" * 60)
    print("TESTING FILE SEARCH")
    print("=" * 60)

    test_queries = [
        "What are the 5 ISMP Strategic Goals for CCC?",
        "What is ACCJC Standard I.B.6 about?",
        "What is the course completion rate target for CCC?",
    ]

    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 40)

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=query,
                config=types.GenerateContentConfig(
                    tools=[
                        types.Tool(
                            file_search=types.FileSearch(
                                file_search_store_names=[store_name]
                            )
                        )
                    ],
                    temperature=0.2,
                ),
            )

            print(f"Response: {response.text[:500]}...")

            # Check for citations
            if hasattr(response.candidates[0], 'grounding_metadata'):
                grounding = response.candidates[0].grounding_metadata
                if grounding:
                    print(f"Grounding metadata: {grounding}")

        except Exception as e:
            print(f"ERROR: {e}")


def main():
    """Main function to run document ingestion."""
    print("=" * 60)
    print("CALIPAR - ISMP/ACCJC DOCUMENT INGESTION")
    print("=" * 60)

    # Check for API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("\nERROR: GOOGLE_API_KEY environment variable not set")
        print("Please set your Google AI API key:")
        print("  export GOOGLE_API_KEY='your-api-key'")
        sys.exit(1)

    # Initialize client
    print("\nInitializing Gemini client...")
    client = genai.Client(api_key=api_key)

    # List existing stores
    existing_stores = list_existing_stores(client)

    # Create new store or use existing
    store_name = "calipar-compliance-docs"
    full_store_name = None

    # Check if store already exists
    for store in existing_stores:
        if store.display_name == store_name:
            print(f"\nFound existing store: {store.name}")
            full_store_name = store.name
            break

    if not full_store_name:
        full_store_name = create_file_search_store(client, store_name)

    # Upload documents
    print("\n" + "=" * 60)
    print("UPLOADING DOCUMENTS")
    print("=" * 60)

    success_count = 0
    fail_count = 0

    for doc in ALL_DOCUMENTS:
        file_path = find_document(doc["path"])

        if file_path is None:
            print(f"\n  SKIPPED: {doc['display_name']}")
            print(f"    File not found: {doc['path']}")
            fail_count += 1
            continue

        success = upload_document(
            client=client,
            store_name=full_store_name,
            file_path=file_path,
            display_name=doc["display_name"],
            metadata=doc.get("metadata", []),
        )

        if success:
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("INGESTION SUMMARY")
    print("=" * 60)
    print(f"  Successful: {success_count}")
    print(f"  Failed: {fail_count}")
    print(f"  File Search Store: {full_store_name}")

    # Test the store
    if success_count > 0:
        test_file_search(client, full_store_name)

    # Output for .env
    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("\nAdd the following to your .env file:")
    print(f"\n  GEMINI_FILE_SEARCH_STORE_NAME={full_store_name}")
    print("\nThis enables the Compliance Copilot RAG functionality.")

    return full_store_name


if __name__ == "__main__":
    main()
