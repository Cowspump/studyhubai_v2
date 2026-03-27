import aiosmtplib
from email.message import EmailMessage

from app.shared.core.config import settings

MAIL_BODY = (
    "Welcome to StudyHubAI!\n\n"
    "Use this code to verify your email:\n"
    "{code}\n\n"
    "The code expires in 15 minutes.\n\n"
    "If you did not sign up, ignore this email."
)


async def send_verification_email(to_email: str, verification_code: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "StudyHubAI: Your verification code"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(MAIL_BODY.format(code=verification_code))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_pass,
        start_tls=True,
    )
