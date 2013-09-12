from django.core.management.base import BaseCommand, CommandError
import simplejson
from survey.models import Respondant, Response, Question, Survey
from random import randint

centers = [
	'Honiara Central Market',
	'Fishing Village',
	'Ball Beach',
	'Maro Maro',
	'Gizo'
]
class Command(BaseCommand):
    help = 'Generate Test Data'
    
    def handle(self, *args, **options):
    	survey = Survey.objects.get(slug = 'volume-and-origin')
        market_question = Question.objects.get(slug = 'market', survey=survey)
        volume_question = Question.objects.get(slug = 'total-volume', survey=survey)

        for i in range(1000):
	        respondant = Respondant(survey=survey)
	        market_response = Response(question=market_question, respondant=respondant)
	        volume_response = Response(question=volume_question, respondant=respondant)
	        volume_response.answer_raw = simplejson.dumps(randint(1,500))
	        market_response.answer_raw = simplejson.dumps({'text': centers[randint(0, len(centers)-1)]})
	       	print market_response.answer_raw, volume_response.answer_raw
	        respondant.save()
	        market_response.save()
	        volume_response.save()
	        respondant.responses.add(market_response)
	        respondant.responses.add(volume_response)
	        respondant.save()