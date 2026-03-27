import json
import smtplib
import urllib.request
from email.message import EmailMessage

from app.shared.core.config import settings

MAIL_BODY = (
    "Welcome to StudyHubAI!\n\n"
    "Use this code to verify your email:\n"
    "{code}\n\n"
    "The code expires in 15 minutes.\n\n"
    "If you did not sign up, ignore this email."
)


def send_verification_email(to_email: str, verification_code: str) -> None:
    if settings.resend_api_key:
        _send_via_resend(to_email, verification_code)
    else:
        _send_via_smtp(to_email, verification_code)


def _send_via_resend(to_email: str, verification_code: str) -> None:
    payload = json.dumps({
        "from": settings.smtp_from,
        "to": [to_email],
        "subject": "StudyHubAI: Your verification code",
        "text": MAIL_BODY.format(code=verification_code),
    }).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    urllib.request.urlopen(req)


def _send_via_smtp(to_email: str, verification_code: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "StudyHubAI: Your verification code"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(MAIL_BODY.format(code=verification_code))

    if settings.smtp_secure:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
