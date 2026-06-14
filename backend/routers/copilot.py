import json
import os
import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import anthropic
from models import ChatRequest, ToolCallRecord
from tools.copilot_tools import TOOLS, execute_tool

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "system.txt")

client = anthropic.AsyncAnthropic()


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


def build_system_prompt() -> str:
    config = _load("store_config.json")
    now = datetime.datetime.now().strftime("%A, %B %-d, %Y at %-I:%M %p")
    template = open(PROMPT_PATH).read()
    return template.format(store_name=config["store_name"], store_id=config["store_id"], now=now)


@router.post("/copilot/chat")
async def chat(req: ChatRequest):
    async def event_stream():
        tool_calls_made: list[ToolCallRecord] = []
        messages = [m.model_dump() for m in req.messages]

        MAX_TURNS = 10
        for _ in range(MAX_TURNS):
            tool_uses: dict[int, dict] = {}
            stop_reason = None

            async with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=build_system_prompt(),
                tools=TOOLS,
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        block = event.content_block
                        if block.type == "tool_use":
                            tool_uses[event.index] = {"id": block.id, "name": block.name, "input_json": ""}
                    elif event.type == "content_block_delta":
                        delta = event.delta
                        if delta.type == "text_delta":
                            yield f"data: {json.dumps({'type': 'text_delta', 'text': delta.text})}\n\n"
                        elif delta.type == "input_json_delta":
                            if event.index in tool_uses:
                                tool_uses[event.index]["input_json"] += delta.partial_json
                    elif event.type == "message_delta":
                        stop_reason = event.delta.stop_reason

                final_message = await stream.get_final_message()
                assistant_content = []
                for block in final_message.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                    elif block.type == "tool_use":
                        assistant_content.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})

            if stop_reason == "tool_use":
                tool_results = []
                for tu in tool_uses.values():
                    tool_input = json.loads(tu["input_json"]) if tu["input_json"] else {}
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool_name': tu['name'], 'args': tool_input})}\n\n"
                    result = execute_tool(tu["name"], tool_input)
                    record = ToolCallRecord(tool_name=tu["name"], args=tool_input, result=result)
                    tool_calls_made.append(record)
                    yield f"data: {json.dumps({'type': 'tool_done', 'tool_name': tu['name'], 'result': result})}\n\n"
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tu["id"],
                        "content": json.dumps(result),
                    })

                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})
            else:
                yield f"data: {json.dumps({'type': 'done', 'tool_calls_made': [r.model_dump() for r in tool_calls_made]})}\n\n"
                break
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Max tool-use turns reached'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
