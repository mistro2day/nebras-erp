from django.test import SimpleTestCase
from apps.automation_platform.application.expressions import SafeExpression, ExpressionError


class SafeExpressionTests(SimpleTestCase):
    def test_empty_is_true(self):
        self.assertTrue(SafeExpression.evaluate('', {}))
        self.assertTrue(SafeExpression.evaluate(None, {}))

    def test_comparison(self):
        self.assertTrue(SafeExpression.evaluate('amount > 100', {'amount': 200}))
        self.assertFalse(SafeExpression.evaluate('amount > 100', {'amount': 50}))

    def test_boolean_logic(self):
        ctx = {'grade': 90, 'attendance': 95}
        self.assertTrue(SafeExpression.evaluate('grade >= 60 and attendance >= 75', ctx))
        self.assertFalse(SafeExpression.evaluate('grade >= 95 and attendance >= 75', ctx))

    def test_membership_and_dict_access(self):
        ctx = {'status': 'approved', 'user': {'role': 'admin'}}
        self.assertTrue(SafeExpression.evaluate("status in ['approved', 'pending']", ctx))
        self.assertTrue(SafeExpression.evaluate("user.role == 'admin'", ctx))

    def test_arithmetic(self):
        self.assertTrue(SafeExpression.evaluate('a + b == 30', {'a': 10, 'b': 20}))

    def test_rejects_unsafe(self):
        with self.assertRaises(ExpressionError):
            SafeExpression.evaluate("__import__('os').system('x')", {})
