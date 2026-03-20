"""
Model registry — imports all module models so Alembic can discover them.
"""
from app.shared.db.base import Base

from app.modules.users.models import User
from app.modules.auth.models import EmailVerificationToken
from app.modules.groups.models import Group
from app.modules.tests.models import Test, TestResult
from app.modules.materials.models import Material
from app.modules.messages.models import Message

__all__ = [
    "Base",
    "User",
    "EmailVerificationToken",
    "Group",
    "Test",
    "TestResult",
    "Material",
    "Message",
]
