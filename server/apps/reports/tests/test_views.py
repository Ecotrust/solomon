import csv
import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase

from survey.models import Question, Respondant, Response, Survey
from ..views import _get_crosstab


class BaseSurveyorStatsCase(TestCase):
    fixtures = ['reef.json', 'users.json']

    def setUp(self):
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question = self.survey.questions.get(slug='survey-site')
        self.respondant_user = User.objects.get(username='superuser_alpha')
        self.ts = datetime.datetime(2013, 11, 30)
        self.respondant = Respondant(survey=self.survey,
                                     ts=self.ts,
                                     surveyor=self.respondant_user)
        response = Response(question=self.question,
                            respondant=self.respondant)
        response.answer_raw = json.dumps({'text': 'Fishing Village'})
        self.respondant.save()
        response.save()

    def login(self):
        self.client.login(username=self.respondant_user.username,
                          password='password')


class TestSurveyorStatsJson(BaseSurveyorStatsCase):
    def get_url(self, interval):
        return reverse('reports_surveyor_stats_json', kwargs={
            'survey_slug': self.survey.slug,
            'interval': interval
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 403)

    def test_authorized(self):
        self.login()
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.content)
        self.assertEqual(body['graph_data'][0]['name'],
                         self.respondant_user.get_full_name())


class TestSurveyorStatsCsv(BaseSurveyorStatsCase):
    def get_url(self, interval):
        return reverse('reports_surveyor_stats_csv', kwargs={
            'survey_slug': self.survey.slug,
            'interval': interval
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 403)

    def test_authorized(self):
        self.login()
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 200)

        data = csv.reader(res.content.splitlines())

        # This is a bit janky, but required if we are using the CSV lib.
        for i, row in enumerate(data):
            if i == 1:
                self.assertEqual(row[0],
                                 self.respondant_user.get_full_name())


class TestSurveyorStatsRawDataCsv(BaseSurveyorStatsCase):
    def get_url(self):
        return reverse('reports_surveyor_stats_raw_data_csv', kwargs={
            'survey_slug': self.survey.slug,
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 403)

    def test_authorized(self):
        self.login()
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 200)

        data = csv.reader(res.content.splitlines())

        # This is a bit janky, but required if we are using the CSV lib.
        for i, row in enumerate(data):
            if i == 1:
                self.assertEqual(row[0],
                                 self.respondant_user.get_full_name())


class TestCrossTabTimeSeries(TestCase):
    fixtures = ['reef.json', 'users.json']
    question_a_slug = 'survey-site'
    question_b_slug = 'cost'
    survey_slug = 'reef-fish-market-survey'
    cost_grid = """
    [
        {{"text":"Ice","label":"ice","checked":false,"isGroupName":false,"activitySlug":"ice","activityText":"Ice","cost":{0}}},
        {{"text":"Ice transport","label":"ice-transport","checked":false,"isGroupName":false,"activitySlug":"icetransport","activityText":"Ice transport","cost":{1}}},
        {{"text":"Land transport (taxi/truck)","label":"land-transport-taxitruck","checked":false,"isGroupName":false,"activitySlug":"landtransporttaxitruck","activityText":"Land transport (taxi/truck)","cost":{2}}},
        {{"text":"Land freight","label":"land-freight","checked":false,"isGroupName":false,"activitySlug":"landfreight","activityText":"Land freight","cost":{3}}},
        {{"text":"Boat transport (ticket)","label":"boat-transport-ticket","checked":false,"isGroupName":false,"activitySlug":"boattransportticket","activityText":"Boat transport (ticket)","cost":{4}}},
        {{"text":"Boat freight","label":"boat-freight","checked":false,"isGroupName":false,"activitySlug":"boatfreight","activityText":"Boat freight","cost":{5}}},
        {{"text":"Air transport (ticket)","label":"air-transport-ticket","checked":false,"isGroupName":false,"activitySlug":"airtransportticket","activityText":"Air transport (ticket)","cost":{6}}}
    ]
    """

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug=self.survey_slug)
        self.question_a = Question.objects.get(slug=self.question_a_slug)
        self.question_b = Question.objects.get(slug=self.question_b_slug)

    def create_respondant(self, when, market, prices):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)

        response_a = Response(question=self.question_a,
                              respondant=respondant,
                              ts=when)
        response_a.answer_raw = json.dumps({'text': market})

        response_b = Response(question=self.question_b,
                              respondant=respondant,
                              ts=when)
        response_b.answer_raw = self.cost_grid.format(*prices)

        respondant.save()
        response_a.save()
        response_b.save()
        respondant.responses.add(response_a)
        respondant.responses.add(response_b)
        respondant.save()
        return respondant

    def request(self, filters):
        return _get_crosstab(filters, self.survey_slug, self.question_a_slug,
                             self.question_b_slug)

    def test_time_series(self):
        self.create_respondant(datetime.datetime.utcnow(), 'Ball Beach',
                               (1, 2, 3, 4, 5, 6, 7))
        self.create_respondant(datetime.datetime.utcnow(), 'Ball Beach',
                               (3, 6, 9, 12, 15, 18, 21))

        obj = self.request({})
        self.assertIn('crosstab', obj)
        for market in obj['crosstab']:
            for row in market['value']:
                if row['row_label'] == 'air-transport-ticket':
                    self.assertEqual(row['average'], 14)
