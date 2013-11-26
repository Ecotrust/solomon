from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from tastypie.test import ResourceTestCase

from ..models import Survey


class TestSurveyDashResource(ResourceTestCase):
    fixtures = ['surveys.json.gz']

    def setUp(self):
        self.username = 'survey_report_user'
        self.password = 'pass'
        self.user = User.objects.create_superuser(
            username=self.username,
            email=self.username + '@example.com',
            password=self.password
        )
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')

    def get_url(self):
        return reverse('api_dispatch_list', kwargs={
            'resource_name': 'surveydash',
            'api_name': 'v1'
        })

    def test_unauthorized(self):
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 401)

    def test_authorized(self):
        self.client.login(username=self.username, password=self.password)
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 200)
