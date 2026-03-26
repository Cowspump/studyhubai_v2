import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.shared.db import get_session
from app.shared.core.exceptions import ApiError
from app.shared.core.security import create_jwt


class _FakeSession:
    async def commit(self) -> None:
        return None


async def _override_get_session():
    yield _FakeSession()


class StudentAssignmentEndpointsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        app.dependency_overrides[get_session] = _override_get_session
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()

    def test_teacher_can_assign_existing_student_by_email(self):
        token = create_jwt(user_id=7, email="teacher@example.com", role="teacher")
        headers = {"Authorization": f"Bearer {token}"}

        with (
            patch(
                "app.modules.teacher.controller.group_repo.get_group_by_id",
                new=AsyncMock(return_value=SimpleNamespace(id=10, name="IS-203", teacher_id=7)),
            ),
            patch(
                "app.modules.teacher.controller.user_repo.get_user_by_email",
                new=AsyncMock(return_value=SimpleNamespace(id=17, role="student")),
            ),
            patch(
                "app.modules.teacher.controller.user_repo.assign_student_to_group",
                new=AsyncMock(),
            ) as assign_mock,
            patch(
                "app.modules.teacher.controller.user_repo.get_user_by_id",
                new=AsyncMock(
                    return_value=SimpleNamespace(
                        id=17,
                        name="John Student",
                        email="student@example.com",
                        role="student",
                        group_id=10,
                    )
                ),
            ),
        ):
            response = self.client.post(
                "/api/teacher/groups/10/students/by-email",
                json={"email": "student@example.com"},
                headers=headers,
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], 17)
        self.assertEqual(body["group_id"], 10)
        self.assertEqual(body["group_name"], "IS-203")
        assign_mock.assert_awaited_once_with(unittest.mock.ANY, 17, 10)

    def test_teacher_cannot_assign_student_to_foreign_group(self):
        token = create_jwt(user_id=7, email="teacher@example.com", role="teacher")
        headers = {"Authorization": f"Bearer {token}"}

        with patch(
            "app.modules.teacher.controller.group_repo.get_group_by_id",
            new=AsyncMock(return_value=SimpleNamespace(id=10, name="IS-203", teacher_id=999)),
        ):
            response = self.client.post(
                "/api/teacher/groups/10/students/by-email",
                json={"email": "student@example.com"},
                headers=headers,
            )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_assign_existing_student_by_email(self):
        token = create_jwt(user_id=0, email="admin@studyhubai.kz", role="superadmin")
        headers = {"Authorization": f"Bearer {token}"}

        with patch(
            "app.modules.admin.controller.admin_service.assign_student_to_group_by_email",
            new=AsyncMock(
                return_value={
                    "id": 17,
                    "name": "John Student",
                    "email": "student@example.com",
                    "role": "student",
                    "group_id": 10,
                    "group_name": "IS-203",
                    "teacher_id": 7,
                    "teacher_name": "Teacher One",
                }
            ),
        ):
            response = self.client.post(
                "/api/admin/groups/10/students/by-email",
                json={"email": "student@example.com"},
                headers=headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["group_id"], 10)

    def test_admin_gets_not_found_for_missing_student(self):
        token = create_jwt(user_id=0, email="admin@studyhubai.kz", role="superadmin")
        headers = {"Authorization": f"Bearer {token}"}

        with patch(
            "app.modules.admin.controller.admin_service.assign_student_to_group_by_email",
            new=AsyncMock(side_effect=ApiError(status_code=404, detail="Student not found")),
        ):
            response = self.client.post(
                "/api/admin/groups/10/students/by-email",
                json={"email": "missing@example.com"},
                headers=headers,
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Student not found")


if __name__ == "__main__":
    unittest.main()
