from django.test import SimpleTestCase
from apps.automation_platform.sdk.cli import main
from apps.automation_platform.sdk.python_client import NebrasAutomationClient


class FakeResponse:
    def __init__(self, data):
        self._data = data

    def json(self):
        return {'success': True, 'data': self._data}


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, headers=None, params=None):
        self.calls.append(('GET', url))
        return FakeResponse([{'code': 'X'}])

    def post(self, url, headers=None, json=None):
        self.calls.append(('POST', url, json))
        return FakeResponse({'ok': True})


class SdkTests(SimpleTestCase):
    def test_client_unwraps_standard_response(self):
        session = FakeSession()
        client = NebrasAutomationClient('http://h', token='t', tenant_id='tid', session=session)
        self.assertEqual(client.list_flows(), [{'code': 'X'}])
        self.assertEqual(session.calls[0][0], 'GET')

    def test_client_headers_include_tenant(self):
        client = NebrasAutomationClient('http://h', token='t', tenant_id='tid', session=FakeSession())
        headers = client._headers()
        self.assertEqual(headers['X-Tenant-ID'], 'tid')
        self.assertIn('Bearer t', headers['Authorization'])

    def test_run_flow_posts_payload(self):
        session = FakeSession()
        client = NebrasAutomationClient('http://h', session=session)
        client.run_flow('fid', {'score': 90})
        self.assertEqual(session.calls[0][0], 'POST')
        self.assertIn('flows/fid/run/', session.calls[0][1])

    def test_cli_scaffold_module(self):
        # scaffold-module لا يتطلب اتصالاً ويطبع هيكل DDD
        rc = main(['scaffold-module', 'clubs'])
        self.assertEqual(rc, 0)

    def test_cli_unknown_command(self):
        rc = main(['nope-not-real'])
        self.assertIn(rc, (1, 2))
