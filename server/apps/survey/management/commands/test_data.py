from django.core.management.base import BaseCommand, CommandError
import simplejson
from survey.models import Respondant, Response, Question, Survey
from random import randint
import datetime

centers = [
	'Honiara Central Market',
	'Fishing Village',
	'Ball Beach',
	'Maro Maro',
	'Gizo'
]

provinces = [
	"Honiara",
	"Central",
	"Western",
	"Guadalcanal",
	"Isabel",
	"Malaita",
	"Makira",
	"Temotu",
	"Renbel",
	"Choiseul"
]

class Command(BaseCommand):
    help = 'Generate Test Data'
    
    def handle(self, *args, **options):
    	respondants = Respondant.objects.filter(test_data=True)
    	Response.objects.filter(respondant__in=respondants).delete()
    	respondants.delete()
    	survey = Survey.objects.get(slug = 'volume-and-origin')
        market_question = Question.objects.get(slug = 'market', survey=survey)
        volume_question = Question.objects.get(slug = 'total-volume', survey=survey)
        origin_question = Question.objects.get(slug = 'source-province', survey=survey)
        date_question = Question.objects.get(slug = 'survey-date', survey=survey)
        for i in range(10000):
        	date = (datetime.date.today() + datetime.timedelta(-randint(0, 365))).isoformat()
	        respondant = Respondant(survey=survey, test_data=True)
	        market_response = Response(question=market_question, respondant=respondant)
	        volume_response = Response(question=volume_question, respondant=respondant)
	        origin_response = Response(question=origin_question, respondant=respondant)
	        date_response = Response(question=date_question, respondant=respondant)
	        volume_response.answer_raw = simplejson.dumps(randint(1,500))
	        date_response.answer_raw = simplejson.dumps(date)
	        market_response.answer_raw = simplejson.dumps({'text': centers[randint(0, len(centers)-1)]})
	        origin_response.answer_raw = simplejson.dumps({'text': provinces[randint(0, len(provinces)-1)]})
	       	print date_response.answer_raw, origin_response.answer_raw, market_response.answer_raw, volume_response.answer_raw
	        respondant.save()
	        market_response.save()
	        volume_response.save()
	        origin_response.save()
	        date_response.save()
	        respondant.responses.add(market_response)
	        respondant.responses.add(volume_response)
	        respondant.responses.add(origin_response)
	        respondant.responses.add(date_response)
	        respondant.save()