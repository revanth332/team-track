import unittest
import time
import asyncio
from unittest.mock import AsyncMock, Mock, patch
import httpx

from app.core.token_manager import TokenManager
from app.services.zoho_sheet_manager import ZohoSheetManager, ZohoAPIError


class FakeResponse:
    def __init__(self, status_code, json_data, text=""):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code != 200:
            raise httpx.HTTPStatusError("Error", request=None, response=self)


class TestTokenManager(unittest.IsolatedAsyncioTestCase):
    async def test_get_zoho_token_success(self):
        token_manager = TokenManager()
        
        # Mock httpx.AsyncClient.post
        mock_client = AsyncMock()
        mock_client.post.return_value = FakeResponse(
            status_code=200,
            json_data={"access_token": "fake_access_token_123", "expires_in": 3600}
        )

        with patch("app.core.token_manager.get_http_client", return_value=mock_client):
            token = await token_manager.get_zoho_token()

        self.assertEqual(token, "fake_access_token_123")
        self.assertEqual(token_manager.access_token, "fake_access_token_123")
        self.assertGreater(token_manager.expires_at, time.time())
        mock_client.post.assert_called_once()

    async def test_get_zoho_token_caching(self):
        token_manager = TokenManager()
        token_manager.access_token = "cached_token"
        token_manager.expires_at = time.time() + 1000

        mock_client = AsyncMock()
        with patch("app.core.token_manager.get_http_client", return_value=mock_client):
            token = await token_manager.get_zoho_token()

        self.assertEqual(token, "cached_token")
        mock_client.post.assert_not_called()

    async def test_get_zoho_token_concurrency_lock(self):
        token_manager = TokenManager()
        mock_client = AsyncMock()
        
        # Simulate small delay during token refresh
        async def slow_post(*args, **kwargs):
            await asyncio.sleep(0.05)
            return FakeResponse(
                status_code=200,
                json_data={"access_token": "concurrent_token", "expires_in": 3600}
            )
        
        mock_client.post.side_effect = slow_post

        with patch("app.core.token_manager.get_http_client", return_value=mock_client):
            # Run multiple token requests concurrently
            tokens = await asyncio.gather(
                token_manager.get_zoho_token(),
                token_manager.get_zoho_token(),
                token_manager.get_zoho_token()
            )

        # All requests should return the same token
        for t in tokens:
            self.assertEqual(t, "concurrent_token")
        
        # And HTTP POST should only have been called EXACTLY ONCE
        mock_client.post.assert_called_once()


class TestZohoSheetManager(unittest.IsolatedAsyncioTestCase):
    def test_manager_raises_value_error_if_not_configured(self):
        manager = ZohoSheetManager()
        manager.resource_id = None
        with self.assertRaises(ValueError):
            _ = manager.url

    async def test_fetch_records_success(self):
        token_manager = Mock()
        token_manager.get_zoho_token = AsyncMock(return_value="token123")

        manager = ZohoSheetManager(
            token_manager=token_manager,
            domain="com",
            resource_id="res_id",
            worksheet_name="sheet_name"
        )

        mock_client = AsyncMock()
        mock_client.request.return_value = FakeResponse(
            status_code=200,
            json_data={"records": [{"Name": "Alice"}]}
        )

        with patch("app.services.zoho_sheet_manager.get_http_client", return_value=mock_client):
            records = await manager.fetch_records(header_row=1, criteria='"Name"="Alice"')

        self.assertEqual(records, [{"Name": "Alice"}])
        mock_client.request.assert_called_once()
        args, kwargs = mock_client.request.call_args
        self.assertEqual(args[0], "GET")
        self.assertEqual(args[1], "https://sheet.zoho.com/api/v2/res_id")
        self.assertEqual(kwargs["headers"]["Authorization"], "Zoho-oauthtoken token123")
        self.assertEqual(kwargs["params"]["criteria"], '"Name"="Alice"')

    async def test_add_records_success(self):
        token_manager = Mock()
        token_manager.get_zoho_token = AsyncMock(return_value="token123")

        manager = ZohoSheetManager(
            token_manager=token_manager,
            resource_id="res_id",
            worksheet_name="sheet_name"
        )

        mock_client = AsyncMock()
        mock_client.request.return_value = FakeResponse(
            status_code=200,
            json_data={"status": "success"}
        )

        with patch("app.services.zoho_sheet_manager.get_http_client", return_value=mock_client):
            response = await manager.add_records([{"Name": "Bob"}])

        self.assertEqual(response["status"], "success")
        mock_client.request.assert_called_once()
        args, kwargs = mock_client.request.call_args
        self.assertEqual(args[0], "POST")
        self.assertIn("worksheet.records.add", kwargs["data"]["method"])

    async def test_zoho_api_error_bubbling(self):
        token_manager = Mock()
        token_manager.get_zoho_token = AsyncMock(return_value="token123")

        manager = ZohoSheetManager(
            token_manager=token_manager,
            resource_id="res_id",
            worksheet_name="sheet_name"
        )

        mock_client = AsyncMock()
        mock_client.request.return_value = FakeResponse(
            status_code=400,
            json_data={},
            text="Invalid Criteria"
        )

        with patch("app.services.zoho_sheet_manager.get_http_client", return_value=mock_client):
            with self.assertRaises(ZohoAPIError) as err:
                await manager.fetch_records()

        self.assertEqual(err.exception.status_code, 400)
        self.assertIn("Invalid Criteria", str(err.exception))

    async def test_zoho_sheet_manager_uses_shared_token_manager_by_default(self):
        from app.services.zoho_sheet_manager import default_token_manager
        default_token_manager.access_token = "shared_token"
        default_token_manager.expires_at = time.time() + 1000

        manager1 = ZohoSheetManager()
        manager2 = ZohoSheetManager()

        self.assertIs(manager1.token_manager, default_token_manager)
        self.assertIs(manager2.token_manager, default_token_manager)

        token1 = await manager1.token_manager.get_zoho_token()
        token2 = await manager2.token_manager.get_zoho_token()
        self.assertEqual(token1, "shared_token")
        self.assertEqual(token2, "shared_token")


if __name__ == "__main__":
    unittest.main()
