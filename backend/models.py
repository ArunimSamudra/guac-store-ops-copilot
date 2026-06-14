from pydantic import BaseModel
from typing import Any


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str | list  # list for assistant turns that contain tool_use blocks


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ToolCallRecord(BaseModel):
    tool_name: str
    args: dict
    result: Any
