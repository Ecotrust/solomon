import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from tastypie.test import ResourceTestCase

from ..models import Respondant, Response, REVIEW_STATE_CHOICES, Survey


class SolomonResourceTestCase(ResourceTestCase):

    def setUp(self):
        if self.__class__ == SolomonResourceTestCase:
            self.skipTest('Base class, not actually tests.')
        self.username = 'survey_report_user'
        self.password = 'pass'
        self.user = User.objects.create_superuser(
            username=self.username,
            email=self.username + '@example.com',
            password=self.password
        )

    def get_list_url(self):
        return reverse('api_dispatch_list', kwargs={
            'resource_name': self.resource_name,
            'api_name': 'v1'
        })

    def get_detail_url(self, pk):
        return reverse('api_dispatch_detail', kwargs={
            'resource_name': self.resource_name,
            'api_name': 'v1',
            'pk': pk
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 401)

    def test_authorized(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)


class TestReportRespondantResource(SolomonResourceTestCase):
    # fixtures = ['surveys.json.gz']
    resource_name = 'reportrespondant'

    def test_list_meta_includes_statuses(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)

        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())


class TestReportRepondantDetailsResource(SolomonResourceTestCase):
    fixtures = ['surveys.json.gz']
    resource_name = 'reportrespondantdetails'

    def create_respondant(self):
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question = self.survey.questions.get(slug='survey-site')
        self.respondant = Respondant(survey=self.survey,
                                     ts=datetime.datetime.now(),
                                     surveyor=self.user)
        response = Response(question=self.question,
                            respondant=self.respondant)
        response.answer_raw = json.dumps({'text': 'Fishing Village'})
        self.respondant.save()
        response.save()

    def test_list_meta_includes_statuses(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)

        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())

    def test_detail_meta_includes_statuses(self):
        self.client.login(username=self.username, password=self.password)
        self.create_respondant()
        res = self.client.get(self.get_detail_url(pk=self.respondant.pk))
        self.assertEqual(res.status_code, 200)

        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())


class TestSurveyDashResource(SolomonResourceTestCase):
    fixtures = ['surveys.json.gz']
    resource_name = 'surveydash'

    def setUp(self):
        super(TestSurveyDashResource, self).setUp()
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
