from django.core.management.base import BaseCommand
from survey.models import Respondant


class Command(BaseCommand):
    help = 'Delete Test Data'

    def handle(self, *args, **options):
        respondents = Respondant.objects.filter(test_data=True)
        for r in respondents:
            r.delete()

        respondents = Respondant.objects.filter(surveyor__username="trainer")
        for r in respondents:
            r.delete()
