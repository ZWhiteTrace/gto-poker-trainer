"""
AI Client for Hand Analysis
Supports multiple AI providers: DeepSeek, OpenAI, Claude (Anthropic)
"""

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

try:
    import httpx
except ImportError:
    httpx = None


class AIProvider(Enum):
    DEEPSEEK = "deepseek"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


@dataclass
class AIConfig:
    """Configuration for AI client."""

    provider: AIProvider
    api_key: str
    base_url: str | None = None
    model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 2000

    @classmethod
    def from_env(cls, provider: AIProvider) -> "AIConfig":
        """Create config from environment variables."""
        if provider == AIProvider.DEEPSEEK:
            return cls(
                provider=provider,
                api_key=os.getenv("DEEPSEEK_API_KEY", ""),
                base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
                model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            )
        elif provider == AIProvider.OPENAI:
            return cls(
                provider=provider,
                api_key=os.getenv("OPENAI_API_KEY", ""),
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com"),
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            )
        elif provider == AIProvider.ANTHROPIC:
            return cls(
                provider=provider,
                api_key=os.getenv("ANTHROPIC_API_KEY", ""),
                base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")


class BaseAIClient(ABC):
    """Base class for AI clients."""

    def __init__(self, config: AIConfig):
        self.config = config
        if httpx is None:
            raise ImportError("httpx is required. Install with: pip install httpx")
        self.client = httpx.Client(timeout=60.0)

    @abstractmethod
    def chat(self, messages: list[dict[str, str]], **kwargs) -> str:
        """Send chat messages and get response."""
        pass

    def analyze_hand(self, hand_description: str) -> str:
        """Analyze a poker hand and provide feedback."""
        system_prompt = """你是一位專業的撲克教練，專精於 GTO (Game Theory Optimal) 策略。
你的任務是分析玩家的手牌歷史並提供建設性的反饋。

分析時請注意：
1. 翻前決策是否符合位置的 GTO 範圍
2. 下注尺度是否合理
3. 是否有明顯的 leak (漏洞)
4. 翻後的判斷是否正確

請用繁體中文回答，並給出具體的改進建議。
評分標準：A (完美), B (良好), C (尚可), D (需要改進), F (嚴重錯誤)"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"請分析這手牌：\n\n{hand_description}"},
        ]

        return self.chat(messages)

    def close(self):
        """Close the HTTP client."""
        self.client.close()


class DeepSeekClient(BaseAIClient):
    """DeepSeek AI client."""

    def chat(self, messages: list[dict[str, str]], **kwargs) -> str:
        """Send chat messages to DeepSeek API."""
        url = f"{self.config.base_url}/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        response = self.client.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]


class OpenAIClient(BaseAIClient):
    """OpenAI client (also works with OpenAI-compatible APIs)."""

    def chat(self, messages: list[dict[str, str]], **kwargs) -> str:
        """Send chat messages to OpenAI API."""
        url = f"{self.config.base_url}/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.config.temperature),
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
        }

        response = self.client.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]


class AnthropicClient(BaseAIClient):
    """Anthropic (Claude) client."""

    def chat(self, messages: list[dict[str, str]], **kwargs) -> str:
        """Send chat messages to Anthropic API."""
        url = f"{self.config.base_url}/v1/messages"

        headers = {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        # Extract system message if present
        system_content = ""
        chat_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            else:
                chat_messages.append(msg)

        payload = {
            "model": self.config.model,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "messages": chat_messages,
        }
        if system_content:
            payload["system"] = system_content

        response = self.client.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        return data["content"][0]["text"]


def create_ai_client(
    provider: str = "deepseek",
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> BaseAIClient:
    """
    Factory function to create AI client.

    Args:
        provider: AI provider name ("deepseek", "openai", "anthropic")
        api_key: API key (if None, reads from environment)
        base_url: Custom base URL (optional)
        model: Model name (optional)

    Returns:
        AI client instance
    """
    provider_enum = AIProvider(provider.lower())
    config = AIConfig.from_env(provider_enum)

    # Override with provided values
    if api_key:
        config.api_key = api_key
    if base_url:
        config.base_url = base_url
    if model:
        config.model = model

    if not config.api_key:
        raise ValueError(
            f"API key not provided for {provider}. "
            f"Set {provider.upper()}_API_KEY environment variable or pass api_key parameter."
        )

    if provider_enum == AIProvider.DEEPSEEK:
        return DeepSeekClient(config)
    elif provider_enum == AIProvider.OPENAI:
        return OpenAIClient(config)
    elif provider_enum == AIProvider.ANTHROPIC:
        return AnthropicClient(config)
    else:
        raise ValueError(f"Unknown provider: {provider}")


# Convenience functions
def analyze_with_deepseek(hand_description: str, api_key: str) -> str:
    """Quick analysis using DeepSeek."""
    client = create_ai_client("deepseek", api_key=api_key)
    try:
        return client.analyze_hand(hand_description)
    finally:
        client.close()


def analyze_with_openai(hand_description: str, api_key: str, model: str = "gpt-4o-mini") -> str:
    """Quick analysis using OpenAI."""
    client = create_ai_client("openai", api_key=api_key, model=model)
    try:
        return client.analyze_hand(hand_description)
    finally:
        client.close()
