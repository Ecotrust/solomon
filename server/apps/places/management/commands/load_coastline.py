from django.core.management.base import BaseCommand

from apps.places import load


class Command(BaseCommand):

    def handle(self, *args, **options):
        load.run()
