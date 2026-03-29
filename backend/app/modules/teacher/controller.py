from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.deps import require_role
from app.shared.core.security import hash_password
from app.shared.core.file_handler import save_profile_photo, delete_profile_photo, save_material_file
from app.shared.db import get_session
from app.modules.users import repository as user_repo
from app.modules.users.models import User
from app.modules.users.schemas import ProfileUpdateRequest, ApiKeyUpdateRequest
from app.modules.groups import repository as group_repo
from app.modules.groups.schemas import GroupCreateRequest, BulkStudentsRequest
from app.modules.materials import repository as material_repo
from app.modules.materials.schemas import MaterialCreateRequest
from app.modules.tests import repository as test_repo
from app.modules.tests.schemas import TestCreateRequest, TestUpdateRequest
from app.modules.messages import repository as message_repo
from app.modules.messages.schemas import SendMessageRequest
from app.modules.auth import repository as auth_repo

router = APIRouter(prefix="/api/teacher", tags=["teacher"])

teacher_dep = require_role("teacher")


def _serialize_user(u):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "group_id": u.group_id,
        "is_verified": u.is_verified,
        "position": u.position,
        "phone": u.phone,
        "telegram": u.telegram,
        "bio": u.bio,
        "photo": u.photo,
    }


def _serialize_student(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "group_id": u.group_id,
    }


async def _require_teacher_group(session: AsyncSession, teacher_id: int, group_id: int):
    group = await group_repo.get_group_by_id(session, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="Group does not belong to current teacher")
    return group


async def _require_teacher_test(session: AsyncSession, teacher_id: int, test_id: int):
    test = await test_repo.get_test_by_id(session, test_id)
    if not test or test.teacher_id != teacher_id:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


async def _require_teacher_material(session: AsyncSession, teacher_id: int, material_id: int):
    mat = await material_repo.get_material_by_id(session, material_id)
    if not mat or mat.teacher_id != teacher_id:
        raise HTTPException(status_code=404, detail="Material not found")
    return mat


# ── Profile ──────────────────────────────────────────────

@router.get("/me")
async def get_profile(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(user)


@router.put("/me")
async def update_profile(
    payload: ProfileUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    await user_repo.update_user_profile(
        session,
        current["userId"],
        name=payload.name,
        position=payload.position,
        phone=payload.phone,
        telegram=payload.telegram,
        bio=payload.bio,
        photo=payload.photo,
    )
    await session.commit()
    user = await user_repo.get_user_by_id(session, current["userId"])
    return _serialize_user(user)


@router.put("/me/api-key")
async def update_api_key(
    payload: ApiKeyUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    await user_repo.update_user_profile(
        session, current["userId"], openai_key=payload.openai_key
    )
    await session.commit()
    return {"ok": True}


@router.get("/me/api-key")
async def get_api_key(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"openai_key": user.openai_key or ""}


@router.post("/me/photo", status_code=200)
async def upload_profile_photo(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    # Save the uploaded file
    photo_path = await save_profile_photo(file)
    
    # Get current user and delete old photo if exists
    user = await user_repo.get_user_by_id(session, current["userId"])
    if user and user.photo:
        await delete_profile_photo(user.photo)
    
    # Update user profile with new photo path
    await user_repo.update_user_profile(
        session, current["userId"], photo=photo_path
    )
    await session.commit()
    
    return {"photo": photo_path}


# ── Groups ───────────────────────────────────────────────

@router.get("/groups")
async def list_groups(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    groups = await group_repo.get_groups_by_teacher(session, current["userId"])
    return [
        {"id": g.id, "name": g.name, "created_at": g.created_at.isoformat()}
        for g in groups
    ]


@router.post("/groups", status_code=201)
async def create_group(
    payload: GroupCreateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    group = await group_repo.create_group(session, payload.name, current["userId"])
    await session.commit()
    return {"id": group.id, "name": group.name, "created_at": group.created_at.isoformat()}


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> None:
    await _require_teacher_group(session, current["userId"], group_id)
    await group_repo.delete_group(session, group_id)
    await session.commit()


@router.get("/groups/{group_id}/students")
async def group_students(
    group_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    await _require_teacher_group(session, current["userId"], group_id)
    students = await user_repo.get_students_by_group(session, group_id)
    return [_serialize_student(s) for s in students]


@router.post("/groups/bulk-students", status_code=201)
async def bulk_create_students(
    payload: BulkStudentsRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    await _require_teacher_group(session, current["userId"], payload.group_id)
    emails = [s["email"] for s in payload.students]
    taken = await auth_repo.get_existing_emails(session, emails)
    created = []
    for s in payload.students:
        if s["email"] in taken:
            continue
        user = await auth_repo.create_user(
            session,
            name=s["name"],
            email=s["email"],
            password_hash=hash_password(s["password"]),
            role="student",
            group_id=payload.group_id,
        )
        taken.add(s["email"])
        created.append({"id": user.id, "name": s["name"], "email": s["email"], "password": s["password"]})
    await session.commit()
    return created



@router.delete("/students/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> None:
    student = await user_repo.get_user_by_id(session, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    if student.group_id is None:
        raise HTTPException(status_code=400, detail="Student is not assigned to a group")

    await _require_teacher_group(session, current["userId"], student.group_id)
    await session.execute(
        sa_delete(User).where(User.id == student_id, User.role == "student")
    )
    await session.commit()


# ── Materials ────────────────────────────────────────────

@router.get("/materials")
async def list_materials(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    mats, total = await material_repo.get_materials_by_teacher(session, current["userId"], skip, limit)
    return {
        "items": [
            {
                "id": m.id,
                "topic": m.topic,
                "title": m.title,
                "type": m.type,
                "url": m.url if m.type == "video" else None,
                "file_name": m.file_name,
                "group_ids": m.group_ids,
                "created_at": m.created_at.isoformat(),
            }
            for m in mats
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/materials", status_code=201)
async def create_material(
    payload: MaterialCreateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    mat = await material_repo.create_material(
        session,
        topic=payload.topic,
        title=payload.title,
        type_=payload.type,
        url=payload.url,
        teacher_id=current["userId"],
        group_ids=payload.group_ids,
        file_name=payload.file_name,
    )
    await session.commit()
    return {
        "id": mat.id,
        "topic": mat.topic,
        "title": mat.title,
        "type": mat.type,
        "url": mat.url,
        "group_ids": mat.group_ids,
    }


@router.delete("/materials/{material_id}", status_code=204)
async def delete_material(
    material_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> None:
    await _require_teacher_material(session, current["userId"], material_id)
    await material_repo.delete_material(session, material_id)
    await session.commit()


@router.get("/materials/{material_id}/url")
async def get_material_url(
    material_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    mat = await _require_teacher_material(session, current["userId"], material_id)
    return {"url": mat.url, "file_name": mat.file_name}


@router.post("/materials/upload")
async def upload_material_file(
    file: UploadFile = File(...),
    current: dict = Depends(teacher_dep),
) -> dict:
    url = await save_material_file(file)
    return {"url": url}


# ── Tests ────────────────────────────────────────────────

@router.get("/tests")
async def list_tests(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    tests, total = await test_repo.get_tests_by_teacher(session, current["userId"], skip, limit)
    return {
        "items": [
            {
                "id": t.id,
                "title": t.title,
                "group_ids": t.group_ids,
                "questions": t.questions,
                "created_at": t.created_at.isoformat(),
            }
            for t in tests
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/tests", status_code=201)
async def create_test(
    payload: TestCreateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    test = await test_repo.create_test(
        session,
        title=payload.title,
        teacher_id=current["userId"],
        group_ids=payload.group_ids,
        questions=payload.questions,
    )
    await session.commit()
    return {
        "id": test.id,
        "title": test.title,
        "group_ids": test.group_ids,
        "questions": test.questions,
    }


@router.put("/tests/{test_id}")
async def update_test(
    test_id: int,
    payload: TestUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    await _require_teacher_test(session, current["userId"], test_id)
    await test_repo.update_test(
        session, test_id, payload.title, payload.group_ids, payload.questions
    )
    await session.commit()
    test = await test_repo.get_test_by_id(session, test_id)
    return {
        "id": test.id,
        "title": test.title,
        "group_ids": test.group_ids,
        "questions": test.questions,
    }


@router.delete("/tests/{test_id}", status_code=204)
async def delete_test(
    test_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> None:
    await _require_teacher_test(session, current["userId"], test_id)
    await test_repo.delete_test(session, test_id)
    await session.commit()


@router.get("/tests/{test_id}/results")
async def test_results(
    test_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    await _require_teacher_test(session, current["userId"], test_id)
    rows = await test_repo.get_results_with_users(session, test_id)
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user_name or "N/A",
            "score": r.score,
            "total": r.total,
            "created_at": r.created_at.isoformat(),
        }
        for r, user_name in rows
    ]


# ── Stats ────────────────────────────────────────────────

@router.get("/stats")
async def teacher_stats(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    groups = await group_repo.get_groups_by_teacher(session, current["userId"])
    students_with_groups = await user_repo.get_students_by_teacher(session, current["userId"])
    student_ids = {s.id for s, _ in students_with_groups}
    tests_total = await test_repo.count_tests_by_teacher(session, current["userId"])
    results_count = await test_repo.count_results_by_student_ids(session, student_ids)

    return {
        "groups": len(groups),
        "students": len(students_with_groups),
        "tests": tests_total,
        "results": results_count,
    }


# ── Student rating ───────────────────────────────────────

@router.get("/rating")
async def student_rating(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    students_with_groups = await user_repo.get_students_by_teacher(session, current["userId"])
    student_ids = {s.id for s, _ in students_with_groups}
    stats = await test_repo.get_results_stats_by_students(session, student_ids)

    rating = []
    for s, group_name in students_with_groups:
        st = stats.get(s.id, {"count": 0, "avg": 0})
        rating.append({
            "id": s.id,
            "name": s.name,
            "group_name": group_name,
            "test_count": st["count"],
            "avg": st["avg"],
        })
    rating.sort(key=lambda x: (-x["avg"], -x["test_count"]))
    return rating


# ── Messages ─────────────────────────────────────────────

@router.get("/messages/conversations")
async def get_conversations(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    convos = await message_repo.get_conversations_for_user(session, current["userId"])
    partner_ids = [c["partner_id"] for c in convos]
    users_map = await user_repo.get_users_by_ids(session, partner_ids)
    for c in convos:
        user = users_map.get(c["partner_id"])
        c["partner_name"] = user.name if user else "Unknown"
        c["partner_group_id"] = user.group_id if user else None
    return convos


@router.get("/messages/{partner_id}")
async def get_messages(
    partner_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    await message_repo.mark_read(session, from_id=partner_id, to_id=current["userId"])
    await session.commit()

    msgs = await message_repo.get_conversation(session, current["userId"], partner_id)
    return [
        {
            "id": m.id,
            "from_id": m.from_id,
            "to_id": m.to_id,
            "text": m.text,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]


@router.post("/messages", status_code=201)
async def send_message(
    payload: SendMessageRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> dict:
    msg = await message_repo.send_message(
        session, from_id=current["userId"], to_id=payload.to_id, text=payload.text
    )
    await session.commit()
    return {
        "id": msg.id,
        "from_id": msg.from_id,
        "to_id": msg.to_id,
        "text": msg.text,
        "created_at": msg.created_at.isoformat(),
    }


# ── All students (for messaging) ────────────────────────

@router.get("/students")
async def get_all_students(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(teacher_dep),
) -> list[dict]:
    students_with_groups = await user_repo.get_students_by_teacher(session, current["userId"])
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "group_id": s.group_id,
            "group_name": group_name,
        }
        for s, group_name in students_with_groups
    ]
