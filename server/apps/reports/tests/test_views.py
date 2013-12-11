import csv
import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase

from survey.models import Respondant, Response, Survey


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
