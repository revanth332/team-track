import unittest
from types import SimpleNamespace
from unittest.mock import patch

from bson import ObjectId

from app.schemas.user import UserPositionAssign, UserUpdate
from app.services import user_service


class FakeUsersCollection:
    def __init__(self, users):
        self.users = users
        self.update_many_calls = []

    async def find_one(self, query):
        for user in self.users:
            if self._matches(user, query):
                return user
        return None

    async def update_one(self, query, update):
        for user in self.users:
            if self._matches(user, query):
                modified = 0
                for key, value in update.get("$set", {}).items():
                    if user.get(key) != value:
                        modified = 1
                    user[key] = value
                return SimpleNamespace(matched_count=1, modified_count=modified)
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def update_many(self, query, update):
        self.update_many_calls.append((query, update))
        matched = 0
        modified = 0
        for user in self.users:
            if self._matches(user, query):
                matched += 1
                for key, value in update.get("$set", {}).items():
                    if user.get(key) != value:
                        modified += 1
                    user[key] = value
        return SimpleNamespace(matched_count=matched, modified_count=modified)

    def _matches(self, user, query):
        return all(user.get(key) == value for key, value in query.items())


class FakeDatabase:
    def __init__(self, users):
        self.users = FakeUsersCollection(users)


def make_user(username, position, **overrides):
    user = {
        "_id": ObjectId(),
        "name": username.title(),
        "username": username,
        "email": f"{username}@example.com",
        "position": position,
        "active_projects": [],
    }
    user.update(overrides)
    return user


class UserServicePositionTests(unittest.IsolatedAsyncioTestCase):
    async def test_assign_position_demotes_lead_and_clears_reports(self):
        lead = make_user("lead1", "lead")
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([lead, employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.assign_user_position(
                UserPositionAssign(username="lead1", position="Employee")
            )

        self.assertEqual(result["position"], "employee")
        self.assertIsNone(employee["lead_id"])
        self.assertEqual(employee["manager_id"], "manager1")
        self.assertEqual(
            db.users.update_many_calls,
            [({"lead_id": "lead1"}, {"$set": {"lead_id": None}})],
        )

    async def test_assign_position_non_lead_change_does_not_clear_reports(self):
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.assign_user_position(
                UserPositionAssign(username="employee1", position="Manager")
            )

        self.assertEqual(result["position"], "manager")
        self.assertIsNone(result["lead_id"])
        self.assertIsNone(result["manager_id"])
        self.assertEqual(db.users.update_many_calls, [])

    async def test_assign_position_noop_keeps_user_assignments(self):
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.assign_user_position(
                UserPositionAssign(username="employee1", position="Employee")
            )

        self.assertEqual(result["position"], "employee")
        self.assertEqual(result["lead_id"], "lead1")
        self.assertEqual(result["manager_id"], "manager1")
        self.assertEqual(db.users.update_many_calls, [])

    async def test_assign_position_demotes_manager_and_clears_manager_reports(self):
        manager = make_user("manager1", "manager")
        lead = make_user(
            "lead1",
            "lead",
            manager_id="manager1",
        )
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([manager, lead, employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.assign_user_position(
                UserPositionAssign(username="manager1", position="Employee")
            )

        self.assertEqual(result["position"], "employee")
        self.assertIsNone(lead["manager_id"])
        self.assertIsNone(employee["manager_id"])
        self.assertEqual(employee["lead_id"], "lead1")
        self.assertEqual(
            db.users.update_many_calls,
            [({"manager_id": "manager1"}, {"$set": {"manager_id": None}})],
        )

    async def test_update_user_without_position_does_not_clear_reports(self):
        lead = make_user(
            "lead1",
            "lead",
            role="Frontend Lead",
            lead_id="other_lead",
            manager_id="manager1",
        )
        employee = make_user("employee1", "employee", lead_id="lead1")
        db = FakeDatabase([lead, employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.update_user(
                str(lead["_id"]),
                UserUpdate(role="Staff Engineer"),
            )

        self.assertEqual(result["role"], "Staff Engineer")
        self.assertEqual(result["lead_id"], "other_lead")
        self.assertEqual(result["manager_id"], "manager1")
        self.assertEqual(employee["lead_id"], "lead1")
        self.assertEqual(db.users.update_many_calls, [])

    async def test_update_user_position_change_clears_user_assignments(self):
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.update_user(
                str(employee["_id"]),
                UserUpdate(position="Lead"),
            )

        self.assertEqual(result["position"], "lead")
        self.assertIsNone(result["lead_id"])
        self.assertIsNone(result["manager_id"])
        self.assertEqual(db.users.update_many_calls, [])

    async def test_update_user_noop_position_keeps_user_assignments(self):
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.update_user(
                str(employee["_id"]),
                UserUpdate(position="Employee"),
            )

        self.assertEqual(result["position"], "employee")
        self.assertEqual(result["lead_id"], "lead1")
        self.assertEqual(result["manager_id"], "manager1")
        self.assertEqual(db.users.update_many_calls, [])

    async def test_update_user_demotes_lead_and_clears_reports(self):
        lead = make_user("lead1", "lead")
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([lead, employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.update_user(
                str(lead["_id"]),
                UserUpdate(position="Employee"),
            )

        self.assertEqual(result["position"], "employee")
        self.assertIsNone(employee["lead_id"])
        self.assertEqual(employee["manager_id"], "manager1")
        self.assertEqual(
            db.users.update_many_calls,
            [({"lead_id": "lead1"}, {"$set": {"lead_id": None}})],
        )

    async def test_update_user_demotes_manager_and_clears_manager_reports(self):
        manager = make_user("manager1", "manager")
        lead = make_user(
            "lead1",
            "lead",
            manager_id="manager1",
        )
        employee = make_user(
            "employee1",
            "employee",
            lead_id="lead1",
            manager_id="manager1",
        )
        db = FakeDatabase([manager, lead, employee])

        with patch.object(user_service, "get_database", return_value=db):
            result = await user_service.update_user(
                str(manager["_id"]),
                UserUpdate(position="Employee"),
            )

        self.assertEqual(result["position"], "employee")
        self.assertIsNone(lead["manager_id"])
        self.assertIsNone(employee["manager_id"])
        self.assertEqual(employee["lead_id"], "lead1")
        self.assertEqual(
            db.users.update_many_calls,
            [({"manager_id": "manager1"}, {"$set": {"manager_id": None}})],
        )


if __name__ == "__main__":
    unittest.main()
