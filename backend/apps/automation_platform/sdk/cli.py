"""
Nebras Automation Platform — Developer CLI.

Usage:
    python -m apps.automation_platform.sdk.cli <command> [args...]

Commands:
    flows                 List automation flows (requires NEBRAS_HOST/TOKEN/TENANT env vars)
    run-flow <id>         Trigger a flow manually
    diagrams              List workflow diagrams
    publish <id>          Publish a workflow diagram
    ops                   Print operations overview
    scaffold-module <code>  Print a DDD module skeleton for a new module

The CLI is intentionally dependency-light and safe: read/list commands only make
GET calls; the scaffold command prints code to stdout for review (never writes).
"""
from __future__ import annotations
import os
import sys

MODULE_SKELETON = '''\
# apps/{code}/domain/models.py
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class {Cls}(CombinedSharedModel):
    name = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_{code}'

# apps/{code}/interfaces/views.py
from apps.shared.interfaces.views import BaseCRUDViewSet
# ... register {Cls}ViewSet with a DefaultRouter in interfaces/urls.py
'''


def _client():
    from apps.automation_platform.sdk.python_client import NebrasAutomationClient
    return NebrasAutomationClient(
        host=os.environ.get("NEBRAS_HOST", "http://localhost:8000"),
        token=os.environ.get("NEBRAS_TOKEN"),
        tenant_id=os.environ.get("NEBRAS_TENANT"),
    )


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]

    if cmd == "scaffold-module":
        code = rest[0] if rest else "sample"
        cls = "".join(p.capitalize() for p in code.split("_"))
        print(MODULE_SKELETON.format(code=code, Cls=cls))
        return 0

    try:
        client = _client()
    except Exception as exc:  # noqa: BLE001
        print(f"SDK unavailable: {exc}", file=sys.stderr)
        return 1

    handlers = {
        "flows": lambda: client.list_flows(),
        "diagrams": lambda: client.list_diagrams(),
        "ops": lambda: client.operations_overview(),
        "run-flow": lambda: client.run_flow(rest[0]),
        "publish": lambda: client.publish_diagram(rest[0]),
    }
    handler = handlers.get(cmd)
    if handler is None:
        print(f"Unknown command: {cmd}\n{__doc__}", file=sys.stderr)
        return 2
    print(handler())
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
