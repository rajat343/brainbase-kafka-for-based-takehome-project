#!/usr/bin/env python3

import asyncio
import json
import aiohttp
import sys
import os

class BrainbaseChecker:
    def __init__(self, worker_id, flow_id, api_key, host="wss://brainbase-engine-python.onrender.com"):
        self.worker_id = worker_id
        self.flow_id = flow_id
        self.api_key = api_key
        self.host = host
        self.url = f"{self.host}/{self.worker_id}/{self.flow_id}?api_key={self.api_key}"

    async def validate(self):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(self.url) as ws:
                    print(f"Connected to {self.url}")
                    await self._initialize(ws)

                    # Listen for response after initialization
                    while True:
                        msg = await ws.receive(timeout=10)
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            action = data.get("action")
                            if action == "error":
                                print("❌ Validation Failed:", data["data"].get("message"))
                                sys.exit(1)
                            elif action in ["message", "stream", "response", "done"]:
                                print("✅ Based file is valid.")
                                sys.exit(0)
                            else:
                                continue
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            print("WebSocket error:", ws.exception())
                            sys.exit(1)
        except Exception as e:
            print("❌ Validation Exception:", e)
            sys.exit(1)

    async def _initialize(self, ws):
        init_data = {
            "streaming": True,
            "deploymentType": os.environ.get("DEPLOYMENT_TYPE", "production")
        }
        init_message = {
            "action": "initialize",
            "data": json.dumps(init_data)
        }
        await ws.send_str(json.dumps(init_message))
        print("Initialization message sent.")

if __name__ == "__main__":
    worker_id = os.environ.get("WORKER_ID")
    flow_id = os.environ.get("FLOW_ID")
    api_key = os.environ.get("BRAINBASE_API_KEY")

    if not worker_id or not flow_id or not api_key:
        print("Missing environment variables: WORKER_ID, FLOW_ID, BRAINBASE_API_KEY")
        sys.exit(1)

    checker = BrainbaseChecker(worker_id, flow_id, api_key)
    asyncio.run(checker.validate())
