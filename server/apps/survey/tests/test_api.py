import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from tastypie.test import ResourceTestCase

from ..models import REVIEW_STATE_CHOICES, Survey


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

    def get_url(self):
        return reverse('api_dispatch_list', kwargs={
            'resource_name': self.resource_name,
            'api_name': 'v1'
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 401)

    def test_authorized(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 200)


class TestReportRespondantResource(SolomonResourceTestCase):
    fixtures = ['surveys.json.gz']
    resource_name = 'reportrespondant'

    def test_meta_includes_statuses(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_url())
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
