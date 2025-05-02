#!/usr/bin/env python3

import asyncio
import json
import aiohttp
import sys
import os

class BrainbaseRunner:
    def __init__(self, worker_id, flow_id, api_key, host="wss://brainbase-engine-python.onrender.com"):
        self.worker_id = worker_id
        self.flow_id = flow_id
        self.api_key = api_key
        self.host = host
        self.url = f"{self.host}/{self.worker_id}/{self.flow_id}?api_key={self.api_key}"
    
    async def start(self):
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(self.url) as ws:
                print(f"Connected to {self.url}")
                await self._initialize(ws)
                listen_task = asyncio.create_task(self._listen(ws))
                chat_task   = asyncio.create_task(self._chat(ws))
                done, pending = await asyncio.wait(
                    [listen_task, chat_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                for task in pending:
                    task.cancel()
    
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
    
    async def _listen(self, ws):
        stream_buffer = ""
        streaming_active = False
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    action = data.get("action")
                    if action in ["message", "response"]:
                        if streaming_active:
                            print(); streaming_active = False
                        print("Agent:", data["data"].get("message"))
                    elif action == "stream":
                        chunk = data["data"].get("message","")
                        if not streaming_active:
                            print("Agent: ", end="")
                            streaming_active = True
                        print(chunk, end=""); stream_buffer += chunk; sys.stdout.flush()
                    elif action == "error":
                        if streaming_active: print(); streaming_active = False
                        print("Error from server:", data["data"].get("message"))
                    elif action == "done":
                        if streaming_active: print(); streaming_active = False
                        print("Operation completed:", data["data"])
                    else:
                        if streaming_active: print(); streaming_active = False
                        print("Unknown action:", action)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print("WebSocket error:", ws.exception())
                    break
        except Exception as e:
            print("Listener error:", e)
    
    async def _chat(self, ws):
        loop = asyncio.get_event_loop()
        while True:
            user_input = await loop.run_in_executor(None, input, "You: ")
            if user_input.lower() in ["exit","quit"]:
                print("Exiting chat...")
                await ws.close()
                break
            try:
                await ws.send_str(json.dumps({
                    "action":"message",
                    "data":{"message": user_input}
                }))
            except Exception as e:
                print("Send error:", e)
                break

if __name__ == "__main__":
    # Read worker_id & flow_id from CLI or fall back to ENV
    if len(sys.argv) >= 3:
        worker_id, flow_id = sys.argv[1], sys.argv[2]
    else:
        worker_id = os.environ.get("WORKER_ID")
        flow_id   = os.environ.get("FLOW_ID")
    api_key = os.environ.get("BRAINBASE_API_KEY")

    if not worker_id or not flow_id or not api_key:
        print("Usage: python brainbase_runner.py <worker_id> <flow_id>")
        sys.exit(1)

    runner = BrainbaseRunner(worker_id, flow_id, api_key)
    asyncio.run(runner.start())
