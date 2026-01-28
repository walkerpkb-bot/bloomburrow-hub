"""
Migration script to convert existing data to campaign-scoped structure.
Run once to migrate existing Bloomburrow data.

Usage: python migrate_to_campaigns.py
"""

import os
import json
import shutil
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DEFAULT_CAMPAIGN_ID = "bloomburrow_default"


def migrate():
    print("Starting migration to campaign-scoped data structure...")

    # Create campaigns directory
    campaigns_dir = os.path.join(DATA_DIR, "campaigns")
    os.makedirs(campaigns_dir, exist_ok=True)
    print(f"Created campaigns directory: {campaigns_dir}")

    # Create default campaign directory
    default_campaign_dir = os.path.join(campaigns_dir, DEFAULT_CAMPAIGN_ID)
    os.makedirs(default_campaign_dir, exist_ok=True)
    print(f"Created default campaign directory: {default_campaign_dir}")

    # Move existing data files
    files_to_move = ["roster.json", "town.json", "stash.json", "current_session.json"]
    for filename in files_to_move:
        src = os.path.join(DATA_DIR, filename)
        dst = os.path.join(default_campaign_dir, filename)
        if os.path.exists(src):
            if not os.path.exists(dst):
                shutil.copy2(src, dst)
                print(f"Copied {filename} to campaign directory")
            else:
                print(f"Skipped {filename} (already exists in campaign directory)")
        else:
            # Create empty default file if source doesn't exist
            if not os.path.exists(dst):
                if filename == "roster.json":
                    default_data = {"characters": []}
                elif filename == "town.json":
                    default_data = {
                        "name": "",
                        "seeds": 0,
                        "buildings": {
                            "generalStore": True,
                            "blacksmith": False,
                            "weaversHut": False,
                            "inn": False,
                            "shrine": False,
                            "watchtower": False,
                            "garden": False
                        }
                    }
                elif filename == "stash.json":
                    default_data = {"items": []}
                else:  # current_session.json
                    default_data = {"active": False}

                with open(dst, "w") as f:
                    json.dump(default_data, f, indent=2)
                print(f"Created default {filename}")

    # Move images directory
    src_images = os.path.join(DATA_DIR, "images")
    dst_images = os.path.join(default_campaign_dir, "images")
    if os.path.exists(src_images):
        if not os.path.exists(dst_images):
            shutil.copytree(src_images, dst_images)
            print("Copied images directory to campaign directory")
        else:
            print("Skipped images directory (already exists in campaign directory)")
    else:
        os.makedirs(dst_images, exist_ok=True)
        print("Created empty images directory in campaign directory")

    # Create campaigns.json
    campaigns_file = os.path.join(DATA_DIR, "campaigns.json")
    if not os.path.exists(campaigns_file):
        campaigns_data = {
            "activeCampaignId": DEFAULT_CAMPAIGN_ID,
            "campaigns": [{
                "id": DEFAULT_CAMPAIGN_ID,
                "name": "Bloomburrow",
                "description": "A cozy woodland adventure with tiny woodland creatures",
                "bannerImage": None,
                "currencyName": "seeds",
                "lastPlayed": datetime.utcnow().isoformat() + "Z",
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }]
        }
        with open(campaigns_file, "w") as f:
            json.dump(campaigns_data, f, indent=2)
        print("Created campaigns.json")
    else:
        print("Skipped campaigns.json (already exists)")

    print("\nMigration complete!")
    print(f"\nNew structure:")
    print(f"  {DATA_DIR}/")
    print(f"    campaigns.json")
    print(f"    campaigns/")
    print(f"      {DEFAULT_CAMPAIGN_ID}/")
    print(f"        roster.json")
    print(f"        town.json")
    print(f"        stash.json")
    print(f"        current_session.json")
    print(f"        images/")


if __name__ == "__main__":
    migrate()
