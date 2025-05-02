#!/usr/bin/env python3

import sys
import json
import os
from brainbase_labs import BrainbaseLabs
from dotenv import load_dotenv

# load from .env
load_dotenv()

if len(sys.argv) < 2:
    print("Usage: python setup.py <path/to/agent.based>")
    sys.exit(1)

based_path = sys.argv[1]
api_key = os.environ.get("BRAINBASE_API_KEY")
if not api_key:
    print("Missing BRAINBASE_API_KEY in .env")
    sys.exit(1)

bb = BrainbaseLabs(api_key=api_key)

# create worker
worker = bb.workers.create(
    name=os.path.basename(based_path).replace(".based","") + "_worker",
    description="Auto-generated worker from setup.py",
    status="active"
)

# create new flow version
flow = bb.workers.flows.create(
    worker_id=worker.id,
    path=based_path,
    name=os.path.basename(based_path),
    label="v1",
    validate=False
)

print(json.dumps({
    "worker_id": worker.id,
    "flow_id": flow.id
}))
