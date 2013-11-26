from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from tastypie.test import ResourceTestCase

from ..models import Survey, Question


class TestSurveyDashResource(ResourceTestCase):
    fixtures = ['surveys.json.gz']

    def setUp(self):
        super(TestSurveyDashResource, self).setUp()
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

    def get_credentials(self):
        result = self.api_client.client.login(username=self.username,
                                              password=self.password)
        return result

    def test_put_question(self):
        # get a grid question change it and save it
        self.client.login(username=self.username, password=self.password)
        url = reverse('api_dispatch_detail', kwargs={
            'resource_name': 'question',
            'api_name': 'v1',
            'pk': 340
        })

        original_data = self.deserialize(self.client.get(url,
            format='json'))

        self.assertEqual(original_data['order'],
            Question.objects.get(pk=340).order)
        self.assertEqual(len(original_data['grid_cols']), 1)
        self.assertEqual(len(original_data['blocks']), 1)
        new_data = original_data.copy()

        new_data['order'] = 10

        res = self.api_client.put(original_data['resource_uri'],
            format='json', data=new_data,
            authentication=self.get_credentials())

        self.assertHttpAccepted(res)
        self.assertNotEqual(new_data['order'], original_data['order'])
        self.assertEqual(Question.objects.get(pk=340).order, 10)
        self.assertEqual(Question.objects.get(pk=340).grid_cols.count(), 1)
        self.assertEqual(Question.objects.get(pk=340).blocks.count(), 1)
