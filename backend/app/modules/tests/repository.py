from __future__ import annotations

from sqlalchemy import delete, func, select, update, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tests.models import Test, TestResult
from app.modules.users.models import User


# ── Test CRUD ──────────────────────────────────────────

async def get_tests_by_teacher(session: AsyncSession, teacher_id: int, skip: int = 0, limit: int = 100) -> tuple[list[Test], int]:
    """Get tests by teacher with pagination"""
    count_result = await session.execute(
        select(func.count(Test.id)).where(Test.teacher_id == teacher_id)
    )
    total = count_result.scalar() or 0
    
    result = await session.execute(
        select(Test)
        .where(Test.teacher_id == teacher_id)
        .order_by(Test.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_tests_by_group(session: AsyncSession, group_id: int, skip: int = 0, limit: int = 100) -> tuple[list[Test], int]:
    """Get tests by group with pagination"""
    count_result = await session.execute(
        select(func.count(Test.id)).where(Test.group_ids.any(group_id))
    )
    total = count_result.scalar() or 0
    
    result = await session.execute(
        select(Test)
        .where(Test.group_ids.any(group_id))
        .order_by(Test.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


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


async def get_results_by_test_ids(session: AsyncSession, user_id: int, test_ids: list[int]) -> dict[int, TestResult]:
    """Get latest result for each test_id efficiently"""
    if not test_ids:
        return {}
    result = await session.execute(
        select(TestResult)
        .where(TestResult.user_id == user_id, TestResult.test_id.in_(test_ids))
        .order_by(TestResult.test_id, TestResult.created_at.desc())
    )
    results = result.scalars().all()
    result_map = {}
    for r in results:
        if r.test_id not in result_map:  # Keep only the latest result for each test
            result_map[r.test_id] = r
    return result_map


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


async def get_results_with_users(session: AsyncSession, test_id: int) -> list[tuple[TestResult, str]]:
    """Get test results with user names via JOIN. Returns list of (TestResult, user_name)."""
    result = await session.execute(
        select(TestResult, User.name)
        .join(User, TestResult.user_id == User.id)
        .where(TestResult.test_id == test_id)
        .order_by(TestResult.created_at.desc())
    )
    return list(result.all())


async def get_results_with_tests(session: AsyncSession, user_id: int) -> list[tuple[TestResult, str]]:
    """Get user results with test titles via JOIN. Returns list of (TestResult, test_title)."""
    result = await session.execute(
        select(TestResult, Test.title)
        .outerjoin(Test, TestResult.test_id == Test.id)
        .where(TestResult.user_id == user_id)
        .order_by(TestResult.created_at.desc())
    )
    return list(result.all())


async def count_results_by_student_ids(session: AsyncSession, student_ids: set[int]) -> int:
    """Count total results for a set of student IDs."""
    if not student_ids:
        return 0
    result = await session.execute(
        select(func.count(TestResult.id)).where(TestResult.user_id.in_(student_ids))
    )
    return result.scalar() or 0


async def get_results_stats_by_students(session: AsyncSession, student_ids: set[int]) -> dict[int, dict]:
    """Get {user_id: {count, avg}} for students using GROUP BY. avg is percentage 0-100."""
    if not student_ids:
        return {}
    result = await session.execute(
        select(
            TestResult.user_id,
            func.count(TestResult.id).label("cnt"),
            func.avg(TestResult.score * 100.0 / TestResult.total).label("avg_pct"),
        )
        .where(TestResult.user_id.in_(student_ids))
        .group_by(TestResult.user_id)
    )
    return {
        row.user_id: {"count": row.cnt, "avg": round(row.avg_pct) if row.avg_pct else 0}
        for row in result.all()
    }


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
