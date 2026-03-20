from __future__ import annotations

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tests.models import Test, TestResult


# ── Test CRUD ──────────────────────────────────────────

async def get_tests_by_teacher(session: AsyncSession, teacher_id: int) -> list[Test]:
    result = await session.execute(
        select(Test).where(Test.teacher_id == teacher_id).order_by(Test.created_at.desc())
    )
    return list(result.scalars().all())


async def get_tests_by_group(session: AsyncSession, group_id: int) -> list[Test]:
    result = await session.execute(
        select(Test).where(Test.group_ids.any(group_id)).order_by(Test.created_at.desc())
    )
    return list(result.scalars().all())


async def get_test_by_id(session: AsyncSession, test_id: int) -> Test | None:
    result = await session.execute(select(Test).where(Test.id == test_id))
    return result.scalar_one_or_none()


async def create_test(
    session: AsyncSession,
    title: str,
    teacher_id: int,
    group_ids: list[int],
    questions: list[dict],
) -> Test:
    test = Test(
        title=title,
        teacher_id=teacher_id,
        group_ids=group_ids,
        questions=questions,
    )
    session.add(test)
    await session.flush()
    return test


async def update_test(
    session: AsyncSession,
    test_id: int,
    title: str,
    group_ids: list[int],
    questions: list[dict],
) -> None:
    await session.execute(
        update(Test)
        .where(Test.id == test_id)
        .values(title=title, group_ids=group_ids, questions=questions)
    )


async def delete_test(session: AsyncSession, test_id: int) -> None:
    await session.execute(delete(Test).where(Test.id == test_id))


# ── Results ────────────────────────────────────────────

async def get_results_by_user(session: AsyncSession, user_id: int) -> list[TestResult]:
    result = await session.execute(
        select(TestResult).where(TestResult.user_id == user_id).order_by(TestResult.created_at.desc())
    )
    return list(result.scalars().all())


async def get_results_by_test(session: AsyncSession, test_id: int) -> list[TestResult]:
    result = await session.execute(
        select(TestResult).where(TestResult.test_id == test_id).order_by(TestResult.created_at.desc())
    )
    return list(result.scalars().all())


async def get_result_by_test_and_user(
    session: AsyncSession, test_id: int, user_id: int
) -> TestResult | None:
    result = await session.execute(
        select(TestResult)
        .where(TestResult.test_id == test_id, TestResult.user_id == user_id)
        .order_by(TestResult.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_all_results(session: AsyncSession) -> list[TestResult]:
    result = await session.execute(
        select(TestResult).order_by(TestResult.created_at.desc())
    )
    return list(result.scalars().all())


async def create_result(
    session: AsyncSession,
    test_id: int,
    user_id: int,
    score: int,
    total: int,
    answers: list[int],
) -> TestResult:
    res = TestResult(
        test_id=test_id,
        user_id=user_id,
        score=score,
        total=total,
        answers=answers,
    )
    session.add(res)
    await session.flush()
    return res
