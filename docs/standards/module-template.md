# قالب ونموذج الموديول القياسي (module-template.md) - Nebras ERP

يوفر هذا القالب الهيكل المرجعي الجاهز للاستنساخ لبناء موديولات الباك إند والفرونت إند المتوافقة مع بوابات الجودة بالمنصة.

---

## 1. قالب هيكل الباك إند (Backend Code Template)

عند إنشاء موديول جديد (مثال: `teachers`)، يجب إنشاء الهيكل التالي للملفات:

### 1. الكيان الأساسي (Domain Entity)
```python
# apps/teachers/domain/models.py
from django.db import models
from apps.shared.domain.models import CombinedSharedModel

class Teacher(CombinedSharedModel):
    employee_number = models.CharField(max_length=50, unique=True)
    specialization = models.CharField(max_length=100)
    status = models.CharField(max_length=20, default='active')

    class Meta:
        db_table = 'nebras_teachers'
```

### 2. الواجهة والتحكم (Interfaces ViewSet)
```python
# apps/teachers/interfaces/views.py
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.teachers.domain.models import Teacher
from apps.teachers.interfaces.serializers import TeacherSerializer

class TeacherViewSet(BaseCRUDViewSet):
    queryset = Teacher.objects.filter(deleted_at__isnull=True)
    serializer_class = TeacherSerializer
```

---

## 2. قالب هيكل الفرونت إند (Frontend Code Template)

عند إنشاء موديول فرونت إند جديد، يجب تعريفه بالشكل التالي:

```typescript
// features/teachers/teachers.routes.ts
import { Routes } from '@angular/router';

export const TEACHERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list.component').then(m => m.TeacherListComponent)
  }
];
```