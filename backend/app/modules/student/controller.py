from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.deps import require_role
from app.shared.db import get_session
from app.modules.users import repository as user_repo
from app.modules.groups import repository as group_repo
from app.modules.materials import repository as material_repo
from app.modules.tests import repository as test_repo
from app.modules.messages import repository as message_repo
from app.modules.tests.schemas import SubmitTestRequest
from app.modules.messages.schemas import SendMessageRequest

router = APIRouter(prefix="/api/student", tags=["student"])

student_dep = require_role("student")


# ── Profile / Home ───────────────────────────────────────

@router.get("/me")
async def get_profile(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    group = await group_repo.get_group_by_id(session, user.group_id) if user.group_id else None
    results = await test_repo.get_results_by_user(session, user.id)
    tests = await test_repo.get_tests_by_group(session, user.group_id) if user.group_id else []

    avg = 0
    if results:
        avg = round(sum((r.score / r.total) * 100 for r in results) / len(results))

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "group_id": user.group_id,
        "group_name": group.name if group else None,
        "available_tests": len(tests),
        "submitted": len(results),
        "average": avg,
    }


@router.get("/teacher")
async def get_teacher_info(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict | None:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user or not user.group_id:
        return None
    teacher = await user_repo.get_teacher_for_student(session, user.group_id)
    if not teacher:
        return None
    return {
        "id": teacher.id,
        "name": teacher.name,
        "email": teacher.email,
        "position": teacher.position,
        "phone": teacher.phone,
        "telegram": teacher.telegram,
        "bio": teacher.bio,
        "photo": teacher.photo,
    }


# ── Materials ────────────────────────────────────────────

@router.get("/materials")
async def list_materials(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user or not user.group_id:
        return {"items": [], "total": 0, "skip": skip, "limit": limit}
    mats, total = await material_repo.get_materials_by_group(session, user.group_id, skip, limit)
    return {
        "items": [
            {
                "id": m.id,
                "topic": m.topic,
                "title": m.title,
                "type": m.type,
                "url": m.url,
                "file_name": m.file_name,
                "group_ids": m.group_ids,
            }
            for m in mats
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ── Tests ────────────────────────────────────────────────

@router.get("/tests")
async def list_tests(
    skip: int = 0,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user or not user.group_id:
        return {"items": [], "total": 0, "skip": skip, "limit": limit}
    tests, total = await test_repo.get_tests_by_group(session, user.group_id, skip, limit)
    
    # Efficiently load results for all tests at once
    test_ids = [t.id for t in tests]
    result_map = await test_repo.get_results_by_test_ids(session, user.id, test_ids)

    return {
        "items": [
            {
                "id": t.id,
                "title": t.title,
                "question_count": len(t.questions),
                "result": (
                    {
                        "score": result_map[t.id].score,
                        "total": result_map[t.id].total,
                        "answers": result_map[t.id].answers,
                        "created_at": result_map[t.id].created_at.isoformat(),
                    }
                    if t.id in result_map
                    else None
                ),
            }
            for t in tests
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/tests/{test_id}")
async def get_test(
    test_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    test = await test_repo.get_test_by_id(session, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    questions = [
        {"q": q["q"], "opts": q["opts"]}
        for q in test.questions
    ]
    return {"id": test.id, "title": test.title, "questions": questions}


@router.post("/tests/{test_id}/submit", status_code=201)
async def submit_test(
    test_id: int,
    payload: SubmitTestRequest,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    test = await test_repo.get_test_by_id(session, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    score = 0
    for i, q in enumerate(test.questions):
        user_answer = payload.answers[i] if i < len(payload.answers) else -1
        if user_answer == q.get("answer"):
            score += 1

    result = await test_repo.create_result(
        session,
        test_id=test_id,
        user_id=current["userId"],
        score=score,
        total=len(test.questions),
        answers=payload.answers,
    )
    await session.commit()
    return {"id": result.id, "score": score, "total": len(test.questions)}


@router.get("/tests/{test_id}/result")
async def get_test_result(
    test_id: int,
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    test = await test_repo.get_test_by_id(session, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    result = await test_repo.get_result_by_test_and_user(session, test_id, current["userId"])
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return {
        "test": {
            "id": test.id,
            "title": test.title,
            "questions": test.questions,
        },
        "result": {
            "score": result.score,
            "total": result.total,
            "answers": result.answers,
            "created_at": result.created_at.isoformat(),
        },
    }


@router.get("/results")
async def list_results(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> list[dict]:
    rows = await test_repo.get_results_with_tests(session, current["userId"])
    return [
        {
            "id": r.id,
            "test_id": r.test_id,
            "test_title": test_title or "Deleted",
            "score": r.score,
            "total": r.total,
            "created_at": r.created_at.isoformat(),
        }
        for r, test_title in rows
    ]


# ── Messages ─────────────────────────────────────────────

@router.get("/messages")
async def get_messages(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> list[dict]:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user or not user.group_id:
        return []
    teacher = await user_repo.get_teacher_for_student(session, user.group_id)
    if not teacher:
        return []

    await message_repo.mark_read(session, from_id=teacher.id, to_id=current["userId"])
    await session.commit()

    msgs = await message_repo.get_conversation(session, current["userId"], teacher.id)
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
    current: dict = Depends(student_dep),
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


@router.get("/messages/unread-count")
async def unread_count(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    count = await message_repo.get_unread_count(session, current["userId"])
    return {"count": count}


# ── OpenAI key (from teacher) ────────────────────────────

@router.get("/openai-key")
async def get_openai_key(
    session: AsyncSession = Depends(get_session),
    current: dict = Depends(student_dep),
) -> dict:
    user = await user_repo.get_user_by_id(session, current["userId"])
    if not user or not user.group_id:
        return {"openai_key": ""}
    teacher = await user_repo.get_teacher_for_student(session, user.group_id)
    if not teacher:
        return {"openai_key": ""}
    return {"openai_key": teacher.openai_key or ""}
