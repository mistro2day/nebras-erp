#!/usr/bin/env python
import os
import sys

def main():
    import sys
    sys.path = [os.path.abspath(p).lower() for p in sys.path if 'backend' not in os.path.abspath(p).lower()]
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)).lower())
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()