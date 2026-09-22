"""
دوال التفقيط باللغة العربية وتحويل الأرقام إلى نصوص بالجنيه السوداني
"""
from decimal import Decimal
import math


def tafqeet_arabic(num, currency: str = "جنيه سوداني") -> str:
    """
    تحويل أي قيمة عددية أو Decimal إلى نص مكتوب باللغة العربية مطابق للسياق السوداني.
    مثال: 500000 -> خمسمائة ألف جنيه سوداني فقط لا غير
    """
    if num is None:
        return ""
    try:
        val = float(Decimal(str(num)))
    except Exception:
        return ""

    if val == 0:
        return f"صفر {currency} فقط لا غير"

    is_negative = val < 0
    val = abs(val)

    ones = [
        "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
        "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
        "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"
    ]
    tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"]
    hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"]
    scales = ["", "ألف", "مليون", "مليار", "تريليون"]

    int_part = int(math.floor(val))
    frac_part = int(round((val - int_part) * 100))

    def convert_3_digits(n: int) -> str:
        if n == 0:
            return ""
        h = n // 100
        r = n % 100
        parts = []
        if h > 0:
            parts.append(hundreds[h])
        if r > 0:
            if r < 20:
                parts.append(ones[r])
            else:
                o = r % 10
                t = r // 10
                if o > 0:
                    parts.append(f"{ones[o]} و{tens[t]}")
                else:
                    parts.append(tens[t])
        return " و".join(parts)

    groups = []
    temp = int_part
    while temp > 0:
        groups.append(temp % 1000)
        temp //= 1000

    text_parts = []
    for i in range(len(groups) - 1, -1, -1):
        grp = groups[i]
        if grp == 0:
            continue
        part = convert_3_digits(grp)
        if i > 0 and i < len(scales):
            scale_name = scales[i]
            if grp == 1:
                part = scale_name
            elif grp == 2:
                part = f"{scale_name}ان"
            elif 3 <= grp <= 10 and i == 1:
                part = "آلاف" if grp == 0 else f"{part} آلاف"
            elif 3 <= grp <= 10 and i == 2:
                part = f"{part} ملايين"
            else:
                part = f"{part} {scale_name}"
        text_parts.append(part)

    result_text = " و".join(text_parts) if text_parts else "صفر"
    if currency:
        result_text = f"{result_text} {currency}"

    if frac_part > 0:
        frac_words = convert_3_digits(frac_part)
        result_text = f"{result_text} و{frac_words} قرش"

    prefix = "سالب " if is_negative else ""
    return f"{prefix}{result_text} فقط لا غير".strip()
