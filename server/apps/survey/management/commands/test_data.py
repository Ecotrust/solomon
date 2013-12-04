import datetime
from random import choice, randint

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

import simplejson

from survey.models import Respondant, Response, Question, Survey


centers = [
    'Honiara Central Market',
    'Fishing Village',
    'Ball Beach',
    'Maro Maro',
    'Gizo'
]

provinces = [
    'Honiara',
    'Central',
    'Western',
    'Guadalcanal',
    'Isabel',
    'Malaita',
    'Makira',
    'Temotu',
    'Renbel',
    'Choiseul'
]

cost_grid = """
[
    {"text":"Ice","label":"ice","checked":false,"isGroupName":false,"activitySlug":"ice","activityText":"Ice","cost":%d},
    {"text":"Ice transport","label":"ice-transport","checked":false,"isGroupName":false,"activitySlug":"icetransport","activityText":"Ice transport","cost":%d},
    {"text":"Land transport (taxi/truck)","label":"land-transport-taxitruck","checked":false,"isGroupName":false,"activitySlug":"landtransporttaxitruck","activityText":"Land transport (taxi/truck)","cost":%d},
    {"text":"Land freight","label":"land-freight","checked":false,"isGroupName":false,"activitySlug":"landfreight","activityText":"Land freight","cost":%d},
    {"text":"Boat transport (ticket)","label":"boat-transport-ticket","checked":false,"isGroupName":false,"activitySlug":"boattransportticket","activityText":"Boat transport (ticket)","cost":%d},
    {"text":"Boat freight","label":"boat-freight","checked":false,"isGroupName":false,"activitySlug":"boatfreight","activityText":"Boat freight","cost":%d},
    {"text":"Air transport (ticket)","label":"air-transport-ticket","checked":false,"isGroupName":false,"activitySlug":"airtransportticket","activityText":"Air transport (ticket)","cost":%d}
]
"""


class Command(BaseCommand):
    help = 'Generate Test Data'

    def handle(self, *args, **options):
        respondants = Respondant.objects.filter(test_data=True)
        Response.objects.filter(respondant__in=respondants).delete()
        respondants.delete()
        survey = Survey.objects.get(slug='reef-fish-market-survey')
        market_question = Question.objects.get(
            slug='survey-site', survey=survey)
        volume_question = Question.objects.get(
            slug='total-weight', survey=survey)
        origin_question = Question.objects.get(
            slug='province-purchased-caught', survey=survey)
        cost_question = Question.objects.get(slug='cost', survey=survey)
        date_question = Question.objects.get(
            slug='survey-date', survey=survey)
        users = []
        for i in range(7):
            users.append(User.objects.create_user(username='user{0}'.format(i),
                                                  first_name='user',
                                                  last_name=i,
                                                  password='pass'))

        for i in range(100):
            date = datetime.date.today() + datetime.timedelta(-randint(0, 365))
            respondant = Respondant(survey=survey, test_data=True, ts=date, surveyor=choice(users))
            market_response = Response(
                question=market_question, respondant=respondant)
            volume_response = Response(
                question=volume_question, respondant=respondant, ts=date)
            origin_response = Response(
                question=origin_question, respondant=respondant)
            date_response = Response(
                question=date_question, respondant=respondant)
            cost_response = Response(
                question=cost_question, respondant=respondant)
            volume_response.answer_raw = simplejson.dumps(randint(1, 1000))
            date_response.answer_raw = simplejson.dumps(date.isoformat())
            market_response.answer_raw = simplejson.dumps(
                {'text': centers[randint(0, len(centers) - 1)]})
            origin_response.answer_raw = simplejson.dumps(
                {'text': provinces[randint(0, len(provinces) - 1)]})
            cost_response.answer_raw = cost_grid % (randint(1, 20), randint(1, 20), randint(
                1, 20), randint(1, 20), randint(1, 20), randint(1, 20), randint(1, 20))
            print date
            respondant.save()
            market_response.save()
            volume_response.save()
            origin_response.save()
            date_response.save()
            cost_response.save()
            volume_response.ts = date
            volume_response.save()
            respondant.responses.add(market_response)
            respondant.responses.add(volume_response)
            respondant.responses.add(origin_response)
            respondant.responses.add(date_response)
            respondant.responses.add(cost_response)
            respondant.save()
