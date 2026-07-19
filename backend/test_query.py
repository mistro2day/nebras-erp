import os
import sys
import django
import time

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.attendance.domain.models import AttendanceRecord
from apps.attendance.interfaces.serializers import AttendanceRecordSerializer

print("Querying database with select_related...")
start = time.time()
try:
    records = AttendanceRecord.objects.filter(deleted_at__isnull=True, date__year=2026, date__month=6).select_related('employee')
    serializer = AttendanceRecordSerializer(records, many=True)
    data = serializer.data
    duration = time.time() - start
    print(f"Serialized records count: {len(data)}")
    print(f"Time taken: {duration:.4f} seconds")
    if data:
        print(f"First record name: {data[0]['employee_name']}")
except Exception as e:
    print(f"Error: {e}")
