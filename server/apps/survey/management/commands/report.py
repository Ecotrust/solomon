from django.core.management.base import BaseCommand

from survey.models import Survey


class Command(BaseCommand):
    help = 'Generate Test Data'

    def handle(self, *args, **options):
        survey = Survey.objects.get(slug='volume-and-origin')
        print survey.response_date_start
        print survey.response_date_end
    # market_question = Question.objects.get(slug = 'market', survey=survey)
    # volume_question = Question.objects.get(slug = 'total-volume', survey=survey)
    # market_responses = Response.objects.filter(question=market_question)
    # for market in market_responses.values('answer').distinct():
    # 	respondants = Respondant.objects.filter(responses__in=market_responses.filter(answer=market['answer']))
    # 	if volume_question.type in ['currency', 'integer', 'number']:
    # 		print market['answer'], Response.objects.filter(respondant__in=respondants, question=volume_question).aggregate(Sum('answer_number'))
