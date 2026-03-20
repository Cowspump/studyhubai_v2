import smtplib
from email.message import EmailMessage

from app.shared.core.config import settings


def send_verification_email(to_email: str, verification_code: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "StudyHubAI: Your verification code"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(
        "Welcome to StudyHubAI!\n\n"
        "Use this code to verify your email:\n"
        f"{verification_code}\n\n"
        "The code expires in 15 minutes.\n\n"
        "If you did not sign up, ignore this email."
    )

    if settings.smtp_secure:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
