import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    cors_origin: str

    pghost: str
    pgport: int
    pgdatabase: str
    pguser: str
    pgpassword: str

    jwt_secret: str
    jwt_expires: str

    smtp_host: str
    smtp_port: int
    smtp_secure: bool
    smtp_user: str
    smtp_pass: str
    smtp_from: str
    is_mvp: bool

    database_url: str


settings = Settings(
    app_name="StudyHubAI Backend",
    app_version="1.0.0",
    cors_origin=os.getenv("CORS_ORIGIN", "*"),
    pghost=os.getenv("PGHOST", "localhost"),
    pgport=int(os.getenv("PGPORT", "5432")),
    pgdatabase=os.getenv("PGDATABASE", "studyhubai"),
    pguser=os.getenv("PGUSER", "studyhubai"),
    pgpassword=os.getenv("PGPASSWORD", "studyhubai_password"),
    jwt_secret=os.getenv("JWT_SECRET", "replace_with_long_random_string"),
    jwt_expires=os.getenv("JWT_EXPIRES", "7d"),
    smtp_host=os.getenv("SMTP_HOST", "smtp.gmail.com"),
    smtp_port=int(os.getenv("SMTP_PORT", "587")),
    smtp_secure=os.getenv("SMTP_SECURE", "false").lower() == "true",
    smtp_user=os.getenv("SMTP_USER", ""),
    smtp_pass=os.getenv("SMTP_PASS", ""),
    smtp_from=os.getenv("SMTP_FROM", "StudyHubAI <noreply@example.com>"),
    is_mvp=os.getenv("IS_MVP", "true").lower() == "true",
    database_url=(
        f"postgresql+asyncpg://"
        f"{os.getenv('PGUSER', 'studyhubai')}:{os.getenv('PGPASSWORD', 'studyhubai_password')}"
        f"@{os.getenv('PGHOST', 'localhost')}:{os.getenv('PGPORT', '5432')}"
        f"/{os.getenv('PGDATABASE', 'studyhubai')}"
    ),
)
