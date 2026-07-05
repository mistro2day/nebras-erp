"""
AI integration boundary.

The Automation Platform never hardcodes an AI model. It talks to the AI Platform
through the ``AIAssistProvider`` interface. The default provider produces
deterministic heuristic scaffolds so features work without a live model; a real
provider (backed by ``apps.ai``) can be registered via ``set_provider`` to enable
workflow/rule/form/report generation and automation suggestions.
"""
from __future__ import annotations
import abc


class AIAssistProvider(abc.ABC):
    """واجهة مزود المساعدة الذكية (يُستهلك من منصة الذكاء الاصطناعي)."""

    @abc.abstractmethod
    def generate_workflow(self, prompt: str, context: dict | None = None) -> dict: ...

    @abc.abstractmethod
    def suggest_rules(self, prompt: str, context: dict | None = None) -> list[dict]: ...

    @abc.abstractmethod
    def generate_form(self, prompt: str, context: dict | None = None) -> dict: ...

    @abc.abstractmethod
    def suggest_automations(self, prompt: str, context: dict | None = None) -> list[dict]: ...


class HeuristicAIProvider(AIAssistProvider):
    """مزود افتراضي حتمي — لا يتطلب نموذجاً حياً؛ يُنتج هياكل قابلة للتعديل."""

    def generate_workflow(self, prompt, context=None):
        return {
            'source': 'heuristic',
            'name': (prompt or 'Generated Workflow')[:80],
            'nodes': [
                {'node_key': 'start', 'node_type': 'start', 'label': 'بداية'},
                {'node_key': 'review', 'node_type': 'approval', 'label': 'مراجعة'},
                {'node_key': 'end', 'node_type': 'end', 'label': 'نهاية'},
            ],
            'edges': [
                {'edge_key': 'e1', 'source_key': 'start', 'target_key': 'review', 'trigger_action': 'submit'},
                {'edge_key': 'e2', 'source_key': 'review', 'target_key': 'end', 'trigger_action': 'approve'},
            ],
        }

    def suggest_rules(self, prompt, context=None):
        return [{'source': 'heuristic', 'name': f'Rule for: {prompt}', 'conditions': [], 'actions': []}]

    def generate_form(self, prompt, context=None):
        return {'source': 'heuristic', 'name': (prompt or 'Form')[:80],
                'fields': [{'name': 'title', 'field_type': 'string', 'required': True}]}

    def suggest_automations(self, prompt, context=None):
        return [{'source': 'heuristic', 'trigger': 'event', 'actions': ['send_notification']}]


_provider: AIAssistProvider = HeuristicAIProvider()


def set_provider(provider: AIAssistProvider) -> None:
    """تسجيل مزود ذكاء اصطناعي حقيقي مدعوم من منصة AI."""
    global _provider
    if not isinstance(provider, AIAssistProvider):
        raise TypeError('provider must implement AIAssistProvider')
    _provider = provider


def get_provider() -> AIAssistProvider:
    return _provider
