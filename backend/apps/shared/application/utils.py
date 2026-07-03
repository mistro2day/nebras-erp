import uuid
import random
import string
from django.utils.text import slugify

class StringUtils:
    @staticmethod
    def generate_random_string(length: int = 10) -> str:
        letters = string.ascii_letters + string.digits
        return ''.join(random.choice(letters) for _ in range(length))

    @staticmethod
    def generate_slug(text: str) -> str:
        return slugify(text)


class CodeGenerator:
    @staticmethod
    def generate_serial_code(prefix: str, sequence_num: int, length: int = 6) -> str:
        """توليد كود تسلسلي موحد بالتنسيق: PREFIX-000123"""
        seq_str = str(sequence_num).zfill(length)
        return f"{prefix}-{seq_str}"