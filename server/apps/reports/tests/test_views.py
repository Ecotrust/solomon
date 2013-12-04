import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase

from survey.models import Respondant, Response, Survey


class TestSurveyorStats(TestCase):
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

    def get_url(self, interval):
        return reverse('reports_surveyor_stats', kwargs={
            'survey_slug': self.survey.slug,
            'interval': interval
        })

    def test_get_unauthorized(self):
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 403)

    def test_get_authorized(self):
        self.login()
        res = self.client.get(self.get_url('month'))
        self.assertEqual(res.status_code, 200)
        print res.content
        body = json.loads(res.content)
        self.assertEqual(body['graph_data'][0]['name'],
                         self.respondant_user.get_full_name())
