from django.core.exceptions import ValidationError
from apps.shared.application.services import BaseService
from apps.master_data.domain.models import MasterItem

class HierarchyValidationService(BaseService):
    """
    خدمة التحقق من العلاقات الهرمية لمنع الدوران الحلقي (Circular Reference Check)
    """
    @staticmethod
    def check_circular_reference(item_id, parent_id) -> bool:
        if not item_id or not parent_id:
            return False
        if item_id == parent_id:
            return True
            
        current_parent_id = parent_id
        visited = set()
        
        while current_parent_id:
            if current_parent_id in visited:
                return True
            visited.add(current_parent_id)
            try:
                parent_item = MasterItem.objects.get(id=current_parent_id)
                current_parent_id = parent_item.parent_id
            except MasterItem.DoesNotExist:
                break
                
            if current_parent_id == item_id:
                return True
                
        return False