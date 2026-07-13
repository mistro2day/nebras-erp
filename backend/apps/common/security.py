# -*- coding: utf-8 -*-
"""
أدوات أمنية مشتركة عبر الموديولات.
"""
import secrets
import string


def generate_temp_password(length: int = 12) -> str:
    """
    يولّد كلمة مرور مؤقتة قوية وعشوائية.

    تضمن وجود حرف كبير وصغير ورقم ورمز واحد على الأقل لتجاوز سياسة كلمات المرور.
    """
    if length < 8:
        length = 8

    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    symbol = secrets.choice("!@#$%*?")

    alphabet = string.ascii_letters + string.digits + "!@#$%*?"
    remaining = [secrets.choice(alphabet) for _ in range(length - 4)]

    chars = [upper, lower, digit, symbol] + remaining
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)
