"""
Safe expression evaluator shared across the Automation Platform.

Used by the workflow designer (edge conditions), automation triggers/actions and
low-code validations. Evaluation is sandboxed: only a whitelist of names/operators
is exposed and no builtins are available, so tenant-authored expressions cannot
execute arbitrary code.
"""
import ast
import operator

_ALLOWED_BINOPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Mod: operator.mod, ast.Pow: operator.pow,
    ast.FloorDiv: operator.floordiv,
}
_ALLOWED_CMP = {
    ast.Eq: operator.eq, ast.NotEq: operator.ne, ast.Lt: operator.lt,
    ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge,
    ast.In: lambda a, b: a in b, ast.NotIn: lambda a, b: a not in b,
}
_ALLOWED_BOOL = {ast.And: all, ast.Or: any}
_ALLOWED_UNARY = {ast.Not: operator.not_, ast.USub: operator.neg, ast.UAdd: operator.pos}


class ExpressionError(Exception):
    pass


class SafeExpression:
    """مُقيّم تعبيرات آمن يعتمد على AST بدون تنفيذ شيفرة عشوائية."""

    @classmethod
    def evaluate(cls, expression: str, context: dict | None = None):
        if expression is None or str(expression).strip() == '':
            return True
        context = context or {}
        try:
            tree = ast.parse(str(expression), mode='eval')
            return cls._eval(tree.body, context)
        except ExpressionError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ExpressionError(f"تعذّر تقييم التعبير: {exc}") from exc

    @classmethod
    def _eval(cls, node, ctx):
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id in ('True', 'False', 'None'):
                return {'True': True, 'False': False, 'None': None}[node.id]
            return ctx.get(node.id)
        if isinstance(node, ast.Subscript):
            container = cls._eval(node.value, ctx)
            key = cls._eval(node.slice, ctx)
            try:
                return container[key]
            except (KeyError, IndexError, TypeError):
                return None
        if isinstance(node, ast.Attribute):
            # يدعم الوصول لمفاتيح القاموس عبر النقطة: obj.field
            container = cls._eval(node.value, ctx)
            if isinstance(container, dict):
                return container.get(node.attr)
            return getattr(container, node.attr, None)
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
            return _ALLOWED_BINOPS[type(node.op)](cls._eval(node.left, ctx), cls._eval(node.right, ctx))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARY:
            return _ALLOWED_UNARY[type(node.op)](cls._eval(node.operand, ctx))
        if isinstance(node, ast.BoolOp) and type(node.op) in _ALLOWED_BOOL:
            values = [cls._eval(v, ctx) for v in node.values]
            return _ALLOWED_BOOL[type(node.op)](values)
        if isinstance(node, ast.Compare):
            left = cls._eval(node.left, ctx)
            for op, comparator in zip(node.ops, node.comparators):
                right = cls._eval(comparator, ctx)
                if type(op) not in _ALLOWED_CMP:
                    raise ExpressionError("عامل مقارنة غير مسموح.")
                if not _ALLOWED_CMP[type(op)](left, right):
                    return False
                left = right
            return True
        if isinstance(node, (ast.List, ast.Tuple)):
            return [cls._eval(e, ctx) for e in node.elts]
        raise ExpressionError("عنصر تعبير غير مدعوم أو غير آمن.")
