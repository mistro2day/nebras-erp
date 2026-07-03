from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

class StandardResponse(Response):
    """
    صيغة الاستجابة الموحدة للنجاح (Success Format)
    """
    def __init__(self, data=None, message=None, success=True, status=None, **kwargs):
        formatted_data = {
            'success': success,
            'message': message,
            'data': data
        }
        super().__init__(data=formatted_data, status=status, **kwargs)


class StandardPagination(PageNumberPagination):
    """
    صيغة الترقيم الموحدة (Standard Pagination Format)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'metadata': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'current_page': self.page.number,
                'total_pages': self.page.paginator.num_pages
            },
            'data': data
        })