import unittest
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

from app.services import sheet_service


class FakeUsersCollection:
    def __init__(self, lead):
        self.lead = lead
        self.create_index = AsyncMock()
        self.find_one = AsyncMock(return_value=lead)


class FakeDatabase:
    def __init__(self, lead):
        self.users = FakeUsersCollection(lead)


class SheetResolverTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        sheet_service._user_indexes_ensured = False

    async def test_employee_uses_assigned_lead_sheet(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "manager_id": "manager1",
            "shift_sheet_name": " Lead One Shifts ",
        })

        with patch.object(sheet_service, "get_database", return_value=db):
            sheet_name = await sheet_service.resolve_lead_sheet_name(
                {"username": "employee1", "position": "employee", "lead_id": "lead1"}
            )

        self.assertEqual(sheet_name, "Lead One Shifts")
        db.users.find_one.assert_awaited_once_with(
            {"username": "lead1"},
            {"username": 1, "position": 1, "manager_id": 1, "shift_sheet_name": 1},
        )

    async def test_lead_uses_own_sheet(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "shift_sheet_name": "Lead Sheet",
        })

        with patch.object(sheet_service, "get_database", return_value=db):
            sheet_name = await sheet_service.resolve_lead_sheet_name(
                {"username": "lead1", "position": "lead"}
            )

        self.assertEqual(sheet_name, "Lead Sheet")

    async def test_manager_requires_lead_id(self):
        db = FakeDatabase(None)

        with patch.object(sheet_service, "get_database", return_value=db):
            with self.assertRaises(HTTPException) as error:
                await sheet_service.resolve_lead_sheet_name(
                    {"username": "manager1", "position": "manager"}
                )

        self.assertEqual(error.exception.status_code, 400)

    async def test_manager_can_access_assigned_lead(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "manager_id": "manager1",
            "shift_sheet_name": "Manager Lead Sheet",
        })

        with patch.object(sheet_service, "get_database", return_value=db):
            sheet_name = await sheet_service.resolve_lead_sheet_name(
                {"username": "manager1", "position": "manager"},
                lead_id="lead1",
            )

        self.assertEqual(sheet_name, "Manager Lead Sheet")

    async def test_manager_cannot_access_unassigned_lead(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "manager_id": "other_manager",
            "shift_sheet_name": "Private Sheet",
        })

        with patch.object(sheet_service, "get_database", return_value=db):
            with self.assertRaises(HTTPException) as error:
                await sheet_service.resolve_lead_sheet_name(
                    {"username": "manager1", "position": "manager"},
                    lead_id="lead1",
                )

        self.assertEqual(error.exception.status_code, 403)

    async def test_missing_lead_fails_clearly(self):
        db = FakeDatabase(None)

        with patch.object(sheet_service, "get_database", return_value=db):
            with self.assertRaises(HTTPException) as error:
                await sheet_service.resolve_lead_sheet_name(
                    {"username": "employee1", "position": "employee", "lead_id": "missing"}
                )

        self.assertEqual(error.exception.status_code, 400)

    async def test_missing_sheet_name_fails_clearly(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "manager_id": "manager1",
            "shift_sheet_name": " ",
        })

        with patch.object(sheet_service, "get_database", return_value=db):
            with self.assertRaises(HTTPException) as error:
                await sheet_service.resolve_lead_sheet_name(
                    {"username": "employee1", "position": "employee", "lead_id": "lead1"}
                )

        self.assertEqual(error.exception.status_code, 400)

    async def test_get_sheet_data_uses_resolved_worksheet_name(self):
        db = FakeDatabase({
            "username": "lead1",
            "position": "lead",
            "shift_sheet_name": "Resolved Sheet",
        })
        manager = Mock()
        manager.fetch_records.return_value = []

        with (
            patch.object(sheet_service, "get_database", return_value=db),
            patch.object(sheet_service, "ZohoSheetManager", return_value=manager) as manager_class,
        ):
            result = await sheet_service.get_zoho_sheet_data(
                Mock(header_row=1, page=1, per_page=100, year=2026, month=5, date=None, name=None, status=None),
                {"username": "lead1", "position": "lead"},
            )

        manager_class.assert_called_once_with(worksheet_name="Resolved Sheet")
        self.assertEqual(result["data"], [])


if __name__ == "__main__":
    unittest.main()
