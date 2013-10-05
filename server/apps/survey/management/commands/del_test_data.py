from django.core.management.base import BaseCommand, CommandError
import simplejson
from survey.models import Respondant, Response, Question, Survey
from random import randint
import datetime


class Command(BaseCommand):
    help = 'Generate Test Data'
    
    def handle(self, *args, **options):
		r = Respondant.objects.filter(test_data=True)
		r.delete()