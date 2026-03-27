import asyncio
import uuid

from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete as sa_delete, select

from app.main import app
from app.modules.auth import repository as auth_repo
from app.modules.auth.models import EmailVerificationToken
from app.modules.groups.models import Group
from app.modules.materials import repository as material_repo
from app.modules.materials.models import Material
from app.modules.messages import repository as message_repo
from app.modules.messages.models import Message
from app.modules.tests import repository as test_repo
from app.modules.tests.models import Test, TestResult
from app.modules.users import repository as user_repo
from app.modules.users.models import User
from app.shared.core.security import hash_password
from app.shared.db import engine as db_engine
from app.shared.db.session import async_session_maker

TEST_SECRET = "e2e-test-secret"


def _teacher_headers(teacher_id: int, email: str) -> dict:
    return {
        "X-Test-Auth-Secret": TEST_SECRET,
        "X-Test-UserId": str(teacher_id),
        "X-Test-Role": "teacher",
        "X-Test-Email": email,
    }


def _student_headers(student_id: int, email: str) -> dict:
    return {
        "X-Test-Auth-Secret": TEST_SECRET,
        "X-Test-UserId": str(student_id),
        "X-Test-Role": "student",
        "X-Test-Email": email,
    }


def _superadmin_headers() -> dict:
    return {
        "X-Test-Auth-Secret": TEST_SECRET,
        "X-Test-UserId": "0",
        "X-Test-Role": "superadmin",
        "X-Test-Email": "admin@studyhubai.kz",
    }


async def _fetch_latest_active_token(session, *, user_id: int) -> str:
    token_code = await session.scalar(
        select(EmailVerificationToken.token)
        .where(EmailVerificationToken.user_id == user_id)
        .where(EmailVerificationToken.used == False)  # noqa: E712
        .order_by(EmailVerificationToken.created_at.desc())
        .limit(1)
    )
    if not token_code:
        raise AssertionError("Email verification token not found")
    return token_code


async def _cleanup(
    *,
    teacher_id: int,
    student_id: int,
    auth_user_id: int | None,
    group_id: int,
    test_ids: list[int],
    material_ids: list[int],
    message_ids: list[int],
) -> None:
    async with async_session_maker() as session:
        if message_ids:
            await session.execute(sa_delete(Message).where(Message.id.in_(message_ids)))
        if material_ids:
            await session.execute(sa_delete(Material).where(Material.id.in_(material_ids)))
        if test_ids:
            await session.execute(
                sa_delete(TestResult).where(
                    TestResult.user_id == student_id, TestResult.test_id.in_(test_ids)
                )
            )
            await session.execute(sa_delete(Test).where(Test.id.in_(test_ids)))
        await session.execute(sa_delete(User).where(User.id.in_([teacher_id, student_id] + ([auth_user_id] if auth_user_id else []))))
        await session.execute(sa_delete(Group).where(Group.id == group_id))
        if auth_user_id:
            await session.execute(
                sa_delete(EmailVerificationToken).where(EmailVerificationToken.user_id == auth_user_id)
            )
        await session.commit()
        await db_engine.dispose()


async def _run_all_endpoints_smoke(subset: str | None = None) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique = uuid.uuid4().hex
        teacher_email = f"t-{unique}@example.com"
        student_email = f"s-{unique}@example.com"

        teacher_id: int
        student_id: int
        group_id: int
        test_ids: list[int] = []
        material_ids: list[int] = []
        message_ids: list[int] = []
        auth_user_id: int | None = None

        try:
            async with async_session_maker() as session:
                teacher = await auth_repo.create_user(
                    session,
                    name=f"Teacher {unique}",
                    email=teacher_email,
                    password_hash=hash_password("pass12345"),
                    role="teacher",
                    group_id=None,
                )

                group = Group(
                    name=f"Group {unique}",
                    teacher_id=teacher.id,
                    invite_code=f"INV-{unique}".upper(),
                )
                session.add(group)
                await session.flush()

                student = await auth_repo.create_user(
                    session,
                    name=f"Student {unique}",
                    email=student_email,
                    password_hash=hash_password("pass12345"),
                    role="student",
                    group_id=group.id,
                )

                await user_repo.update_user_profile(
                    session,
                    teacher.id,
                    position="Head",
                    phone="+100000000",
                    telegram="@teacher",
                    bio="Teacher bio",
                    photo="teacher.png",
                    openai_key=f"oaikey-{unique}",
                )

                test_zero = await test_repo.create_test(
                    session,
                    title=f"Zero {unique}",
                    teacher_id=teacher.id,
                    group_ids=[group.id],
                    questions=[],
                )
                test_scored = await test_repo.create_test(
                    session,
                    title=f"Scored {unique}",
                    teacher_id=teacher.id,
                    group_ids=[group.id],
                    questions=[
                        {"q": "2+2?", "opts": ["3", "4", "5"], "answer": 1},
                        {"q": "5-2?", "opts": ["1", "2", "3"], "answer": 2},
                    ],
                )

                # Result for zero-total test.
                await test_repo.create_result(
                    session,
                    test_id=test_zero.id,
                    user_id=student.id,
                    score=0,
                    total=0,
                    answers=[],
                )
                # Result for scored test.
                await test_repo.create_result(
                    session,
                    test_id=test_scored.id,
                    user_id=student.id,
                    score=1,
                    total=2,
                    answers=[-1, 2],
                )

                material = await material_repo.create_material(
                    session,
                    topic="Math",
                    title=f"Material {unique}",
                    type_="pdf",
                    url="https://example.com/doc.pdf",
                    teacher_id=teacher.id,
                    group_ids=[group.id],
                    file_name=f"doc-{unique}.pdf",
                )

                msg_teacher_to_student = await message_repo.send_message(
                    session,
                    from_id=teacher.id,
                    to_id=student.id,
                    text="teacher->student",
                )
                msg_student_to_teacher = await message_repo.send_message(
                    session,
                    from_id=student.id,
                    to_id=teacher.id,
                    text="student->teacher",
                )

                await session.commit()

                teacher_id = teacher.id
                student_id = student.id
                group_id = group.id
                test_ids = [test_zero.id, test_scored.id]
                material_ids = [material.id]
                message_ids = [msg_teacher_to_student.id, msg_student_to_teacher.id]

            # Health.
            resp = await client.get("/health")
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

            # Public groups list.
            resp = await client.get("/api/public/groups")
            assert resp.status_code == 200
            assert any(g["id"] == group_id for g in resp.json())

            if subset == "health_public":
                return

            # Auth endpoints.
            auth_unique = uuid.uuid4().hex
            auth_email = f"auth-{auth_unique}@example.com"
            auth_password = "password12345"

            register_headers = {"X-Test-Auth-Secret": TEST_SECRET}
            resp = await client.post(
                "/api/auth/register",
                headers=register_headers,
                json={
                    "name": f"AuthUser {auth_unique}",
                    "email": auth_email,
                    "password": auth_password,
                    "role": "student",
                    "group_id": None,
                },
            )
            assert resp.status_code == 201
            reg_payload = resp.json()
            assert reg_payload["user"]["email"] == auth_email
            assert reg_payload["user"]["role"] == "student"

            resp = await client.post(
                "/api/auth/login",
                headers=register_headers,
                json={"email": auth_email, "password": auth_password},
            )
            assert resp.status_code == 200
            login_payload = resp.json()
            assert isinstance(login_payload["token"], str)

            async with async_session_maker() as session:
                token_user = await auth_repo.find_user_by_email(session, auth_email)
                assert token_user is not None
                auth_user_id = token_user.id
                token_code = await _fetch_latest_active_token(session, user_id=token_user.id)

            resp = await client.post(
                "/api/auth/verify-email-code",
                json={"email": auth_email, "code": token_code},
            )
            assert resp.status_code == 200
            assert resp.json()["message"] == "Email verified successfully"

            resp = await client.post(
                "/api/auth/login",
                json={"email": auth_email, "password": auth_password},
            )
            assert resp.status_code == 200

            # Admin endpoints.
            resp = await client.post(
                "/api/admin/login",
                json={"username": "admin2077", "password": "RusAli2077"},
            )
            assert resp.status_code == 200
            assert isinstance(resp.json()["token"], str)

            admin_headers = _superadmin_headers()
            resp = await client.get("/api/admin/teachers", headers=admin_headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

            admin_teacher_email = f"adminteach-{unique}@example.com"
            resp = await client.post(
                "/api/admin/teachers",
                headers=admin_headers,
                json={"name": f"AdminTeacher {unique}", "email": admin_teacher_email, "password": "pass12345"},
            )
            assert resp.status_code == 201
            created_admin_teacher = resp.json()
            created_admin_teacher_id = created_admin_teacher["id"]

            resp = await client.get("/api/admin/teachers", headers=admin_headers)
            assert resp.status_code == 200
            assert any(t["id"] == created_admin_teacher_id for t in resp.json())

            resp = await client.put(
                f"/api/admin/teachers/{created_admin_teacher_id}",
                headers=admin_headers,
                json={"name": f"AdminTeacherUpdated {unique}", "email": None},
            )
            assert resp.status_code == 200
            assert resp.json()["id"] == created_admin_teacher_id

            resp = await client.get("/api/admin/stats", headers=admin_headers)
            assert resp.status_code == 200
            assert set(resp.json().keys()) == {"total_users", "teachers", "students", "verified"}

            resp = await client.delete(
                f"/api/admin/teachers/{created_admin_teacher_id}", headers=admin_headers
            )
            assert resp.status_code == 204

            resp = await client.get("/api/admin/teachers", headers=admin_headers)
            assert resp.status_code == 200
            assert not any(t["id"] == created_admin_teacher_id for t in resp.json())

            if subset == "auth_admin":
                return

            # Teacher endpoints.
            teacher_headers = _teacher_headers(teacher_id, teacher_email)

            resp = await client.get("/api/teacher/me", headers=teacher_headers)
            assert resp.status_code == 200
            me_payload = resp.json()
            assert me_payload["id"] == teacher_id
            assert me_payload["position"] == "Head"
            assert me_payload["telegram"] == "@teacher"

            resp = await client.put(
                "/api/teacher/me",
                headers=teacher_headers,
                json={"name": f"TeacherUpdated {unique}", "bio": "New bio"},
            )
            assert resp.status_code == 200
            me_payload = resp.json()
            assert me_payload["name"].startswith("TeacherUpdated")
            assert me_payload["bio"] == "New bio"

            new_openai_key = f"oaikey2-{unique}"
            resp = await client.put(
                "/api/teacher/me/api-key",
                headers=teacher_headers,
                json={"openai_key": new_openai_key},
            )
            assert resp.status_code == 200
            resp = await client.get("/api/teacher/me/api-key", headers=teacher_headers)
            assert resp.status_code == 200
            assert resp.json()["openai_key"] == new_openai_key

            resp = await client.get("/api/teacher/groups", headers=teacher_headers)
            assert resp.status_code == 200
            assert any(g["id"] == group_id for g in resp.json())

            resp = await client.post(
                "/api/teacher/groups",
                headers=teacher_headers,
                json={"name": f"GroupNew {unique}"},
            )
            assert resp.status_code == 201
            new_group_id = resp.json()["id"]
            assert isinstance(resp.json()["created_at"], str)

            resp = await client.get(
                f"/api/teacher/groups/{new_group_id}/students", headers=teacher_headers
            )
            assert resp.status_code == 200
            assert resp.json() == []

            resp = await client.delete(
                f"/api/teacher/groups/{new_group_id}", headers=teacher_headers
            )
            assert resp.status_code == 204

            # Baseline group students.
            resp = await client.get(
                f"/api/teacher/groups/{group_id}/students", headers=teacher_headers
            )
            assert resp.status_code == 200
            group_students = resp.json()
            assert any(s["id"] == student_id for s in group_students)

            # Bulk create students.
            bulk_payload = {
                "group_id": group_id,
                "students": [
                    {
                        "name": f"BulkStudent1 {unique}",
                        "email": f"bulk1-{unique}@example.com",
                        "password": "pass12345",
                    },
                    {
                        "name": f"BulkDup {unique}",
                        "email": student_email,
                        "password": "pass12345",
                    },
                ],
            }
            resp = await client.post(
                "/api/teacher/groups/bulk-students",
                headers=teacher_headers,
                json=bulk_payload,
            )
            assert resp.status_code == 201
            created_students = resp.json()
            assert len(created_students) == 1
            bulk_student_id = created_students[0]["id"]

            resp = await client.delete(
                f"/api/teacher/students/{bulk_student_id}", headers=teacher_headers
            )
            assert resp.status_code == 204

            # Teacher materials.
            resp = await client.get("/api/teacher/materials", headers=teacher_headers)
            assert resp.status_code == 200
            mats = resp.json()
            assert any(m["id"] == material_ids[0] for m in mats)

            resp = await client.post(
                "/api/teacher/materials",
                headers=teacher_headers,
                json={
                    "topic": "Science",
                    "title": f"MaterialNew {unique}",
                    "type": "pdf",
                    "url": "https://example.com/new.pdf",
                    "group_ids": [group_id],
                    "file_name": f"new-{unique}.pdf",
                },
            )
            assert resp.status_code == 201
            created_material_id = resp.json()["id"]

            resp = await client.delete(
                f"/api/teacher/materials/{created_material_id}", headers=teacher_headers
            )
            assert resp.status_code == 204

            # Teacher tests.
            resp = await client.get("/api/teacher/tests", headers=teacher_headers)
            assert resp.status_code == 200
            tests_payload = resp.json()
            assert any(t["id"] == test_ids[1] for t in tests_payload)

            created_test_questions = [
                {"q": "1+1?", "opts": ["1", "2", "3"], "answer": 1},
                {"q": "10/2?", "opts": ["3", "4", "5"], "answer": 2},
            ]
            resp = await client.post(
                "/api/teacher/tests",
                headers=teacher_headers,
                json={"title": f"TestNew {unique}", "group_ids": [group_id], "questions": created_test_questions},
            )
            assert resp.status_code == 201
            created_test = resp.json()
            created_test_id = created_test["id"]
            test_ids.append(created_test_id)

            resp = await client.get("/api/teacher/tests", headers=teacher_headers)
            assert resp.status_code == 200
            assert any(t["id"] == created_test_id for t in resp.json())

            updated_questions = [
                {"q": "Color of sky?", "opts": ["Blue", "Green", "Red"], "answer": 0},
                {"q": "2*3?", "opts": ["5", "6", "7"], "answer": 1},
            ]
            resp = await client.put(
                f"/api/teacher/tests/{created_test_id}",
                headers=teacher_headers,
                json={"title": f"TestUpdated {unique}", "group_ids": [group_id], "questions": updated_questions},
            )
            assert resp.status_code == 200

            # Teacher results should be empty before any submission.
            resp = await client.get(
                f"/api/teacher/tests/{created_test_id}/results", headers=teacher_headers
            )
            assert resp.status_code == 200
            assert resp.json() == []

            # Teacher stats/rating before submissions:
            # groups=1, students=1, tests=3 (two baseline + one created_test), results=2 (baseline results only).
            resp = await client.get("/api/teacher/stats", headers=teacher_headers)
            assert resp.status_code == 200
            stats_before = resp.json()
            assert stats_before["groups"] == 1
            assert stats_before["students"] == 1
            assert stats_before["tests"] == 3
            assert stats_before["results"] == 2

            resp = await client.get("/api/teacher/rating", headers=teacher_headers)
            assert resp.status_code == 200
            rating_before = resp.json()
            assert len(rating_before) == 1
            assert rating_before[0]["id"] == student_id
            assert rating_before[0]["test_count"] == 2

            # Student submit created_test.
            student_headers = _student_headers(student_id, student_email)
            resp = await client.post(
                f"/api/student/tests/{created_test_id}/submit",
                headers=student_headers,
                json={"answers": [0, 1]},
            )
            assert resp.status_code == 201
            submit_payload = resp.json()
            assert submit_payload["result"]["score"] == 2
            assert submit_payload["result"]["total"] == 2

            resp = await client.get(
                f"/api/student/tests/{created_test_id}/result", headers=student_headers
            )
            assert resp.status_code == 200
            result_payload = resp.json()
            assert result_payload["test"]["id"] == created_test_id
            assert result_payload["result"]["score"] == 2

            resp = await client.get(
                f"/api/teacher/tests/{created_test_id}/results", headers=teacher_headers
            )
            assert resp.status_code == 200
            teacher_results = resp.json()
            assert any(r["user_id"] == student_id for r in teacher_results)

            # Teacher stats/rating after submission should reflect invalidation.
            resp = await client.get("/api/teacher/stats", headers=teacher_headers)
            assert resp.status_code == 200
            stats_after_submit_created = resp.json()
            assert stats_after_submit_created["results"] == 3

            resp = await client.get("/api/teacher/rating", headers=teacher_headers)
            assert resp.status_code == 200
            rating_after_created = resp.json()
            assert rating_after_created[0]["test_count"] == 3

            # Student me average after created_test submission:
            # contributions: zero-test(0/0)->0, scored-test(1/2)->50, created-test(2/2)->100 => avg=round(150/3)=50.
            resp = await client.get("/api/student/me", headers=student_headers)
            assert resp.status_code == 200
            me_after_created = resp.json()
            assert me_after_created["submitted"] == 3
            assert me_after_created["average"] == 50

            # Student teacher info.
            resp = await client.get("/api/student/teacher", headers=student_headers)
            assert resp.status_code == 200
            teacher_info = resp.json()
            assert teacher_info["id"] == teacher_id
            assert teacher_info["position"] == "Head"
            assert teacher_info["telegram"] == "@teacher"

            # Student materials list.
            resp = await client.get("/api/student/materials", headers=student_headers)
            assert resp.status_code == 200
            student_mats = resp.json()
            assert any(m["id"] == material_ids[0] for m in student_mats)

            # Submit scored test again to validate second invalidation.
            resp = await client.post(
                f"/api/student/tests/{test_ids[1]}/submit",
                headers=student_headers,
                json={"answers": [1, 2]},
            )
            assert resp.status_code == 201

            resp = await client.get("/api/teacher/stats", headers=teacher_headers)
            assert resp.status_code == 200
            stats_after_submit_scored = resp.json()
            assert stats_after_submit_scored["results"] == 4

            resp = await client.get("/api/student/me", headers=student_headers)
            assert resp.status_code == 200
            me_after_scored = resp.json()
            assert me_after_scored["submitted"] == 4
            assert me_after_scored["average"] == 62

            if subset == "teacher_student_stats_rating_student_me":
                return

            # Student tests list and detail.
            resp = await client.get("/api/student/tests", headers=student_headers)
            assert resp.status_code == 200
            assert any(t["id"] == created_test_id for t in resp.json())

            resp = await client.get(
                f"/api/student/tests/{created_test_id}", headers=student_headers
            )
            assert resp.status_code == 200

            # Student results list.
            resp = await client.get("/api/student/results", headers=student_headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

            # Student messages endpoints.
            resp = await client.get("/api/student/messages", headers=student_headers)
            assert resp.status_code == 200
            msgs = resp.json()
            assert any(m["text"] == "teacher->student" and m["is_read"] is True for m in msgs)

            resp = await client.post(
                "/api/student/messages",
                headers=student_headers,
                json={"to_id": teacher_id, "text": "student->teacher2"},
            )
            assert resp.status_code == 201
            student_sent = resp.json()
            message_ids.append(student_sent["id"])
            assert student_sent["is_read"] is False

            resp = await client.get(
                "/api/student/messages/unread-count", headers=student_headers
            )
            assert resp.status_code == 200
            assert "count" in resp.json()

            resp = await client.get("/api/student/openai-key", headers=student_headers)
            assert resp.status_code == 200
            assert resp.json()["openai_key"] == new_openai_key

            # Teacher messaging endpoints.
            resp = await client.get(
                "/api/teacher/messages/conversations", headers=teacher_headers
            )
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

            resp = await client.get(
                f"/api/teacher/messages/{student_id}", headers=teacher_headers
            )
            assert resp.status_code == 200
            teacher_msgs = resp.json()
            assert any(
                m["text"] in ("student->teacher", "student->teacher2") and m["is_read"] is True
                for m in teacher_msgs
            )

            resp = await client.post(
                "/api/teacher/messages",
                headers=teacher_headers,
                json={"to_id": student_id, "text": "teacher->student2"},
            )
            assert resp.status_code == 201
            teacher_sent = resp.json()
            message_ids.append(teacher_sent["id"])
            assert teacher_sent["is_read"] is False

            # Teacher students list.
            resp = await client.get("/api/teacher/students", headers=teacher_headers)
            assert resp.status_code == 200
            assert any(s["id"] == student_id for s in resp.json())

            # After new teacher->student2 message, student unread count should be >= 1.
            resp = await client.get(
                "/api/student/messages/unread-count", headers=student_headers
            )
            assert resp.status_code == 200
            assert resp.json()["count"] >= 1

            if subset == "messaging":
                return

            # Delete created test (covers DELETE /api/teacher/tests/{test_id}).
            resp = await client.delete(
                f"/api/teacher/tests/{created_test_id}", headers=teacher_headers
            )
            assert resp.status_code == 204
            resp = await client.get("/api/teacher/tests", headers=teacher_headers)
            assert resp.status_code == 200
            assert not any(t["id"] == created_test_id for t in resp.json())

            # Covered teacher tests/results endpoint earlier; cleanup uses `test_ids`.

        finally:
            # Best-effort cleanup for baseline entities only.
            if "teacher_id" in locals() and "student_id" in locals() and "group_id" in locals():
                await _cleanup(
                    teacher_id=teacher_id,
                    student_id=student_id,
                    auth_user_id=auth_user_id,
                    group_id=group_id,
                    test_ids=test_ids,
                    material_ids=material_ids,
                    message_ids=message_ids,
                )


def test_health_public_groups():
    asyncio.run(_run_all_endpoints_smoke(subset="health_public"))


def test_auth_and_admin_endpoints():
    asyncio.run(_run_all_endpoints_smoke(subset="auth_admin"))


def test_teacher_student_stats_rating_and_student_me():
    asyncio.run(_run_all_endpoints_smoke(subset="teacher_student_stats_rating_student_me"))


def test_messaging_endpoints():
    asyncio.run(_run_all_endpoints_smoke(subset="messaging"))


def test_full_endpoints():
    asyncio.run(_run_all_endpoints_smoke())

