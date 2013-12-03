import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

from tastypie.test import ResourceTestCase

from ..models import Respondant, Response, REVIEW_STATE_CHOICES, Survey


class SolomonResourceTestCase(ResourceTestCase):

    def setUp(self):
#        super(TestSurveyDashResource, self).setUp()
        if self.__class__ == SolomonResourceTestCase:
            self.skipTest('Base class, not actually tests.')

        self.username = 'superuser_alpha'
        self.user = User.objects.get(username=self.username)

    def login(self):
        self.client.login(username=self.username, password='password')

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
        self.login()
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)


class TestReportRespondantResource(SolomonResourceTestCase):
    fixtures = ['users.json']
    resource_name = 'reportrespondant'

    def test_list_meta_includes_statuses(self):
        self.login()
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)

        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())


class TestReportRepondantDetailsResource(SolomonResourceTestCase):
    fixtures = ['reef.json', 'users.json']
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
        self.login()
        res = self.client.get(self.get_list_url())
        self.assertEqual(res.status_code, 200)

        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())

    def test_detail_meta_includes_statuses(self):
        self.login()
        self.create_respondant()
        res = self.client.get(self.get_detail_url(pk=self.respondant.pk))
        self.assertEqual(res.status_code, 200)
        content = json.loads(res.content)
        self.assertIn('statuses', content['meta'])
        for item in REVIEW_STATE_CHOICES:
            self.assertIn(item[0], content['meta']['statuses'].keys())


# class AuthoringResource(ResourceTestCase):
#     fixtures = ['surveys.json.gz']
#     resource_name = 'reportrespondantdetails'

#     def setUp(self):
#         super(AuthoringResource, self).setUp()
#         self.username = 'survey_report_user'
#         self.password = 'pass'

#     def get_credentials(self):
#         result = self.api_client.client.login(username=self.username,
#                                               password=self.password)
#         return result

#     def test_put_question(self):
#         # get a grid question change it and save it
#         self.client.login(username=self.username, password=self.password)
#         url = reverse('api_dispatch_detail', kwargs={
#             'resource_name': 'question',
#             'api_name': 'v1',
#             'pk': 340
#         })

#         original_data = self.deserialize(self.client.get(url,
#             format='json'))

#         self.assertEqual(original_data['order'],
#             Question.objects.get(pk=340).order)
#         self.assertEqual(len(original_data['grid_cols']), 1)
#         self.assertEqual(len(original_data['blocks']), 1)
#         new_data = original_data.copy()

#         new_data['order'] = 10

#         res = self.api_client.put(original_data['resource_uri'],
#             format='json', data=new_data,
#             authentication=self.get_credentials())

#         self.assertHttpAccepted(res)
#         self.assertNotEqual(new_data['order'], original_data['order'])
#         self.assertEqual(Question.objects.get(pk=340).order, 10)
#         self.assertEqual(Question.objects.get(pk=340).grid_cols.count(), 1)
#         self.assertEqual(Question.objects.get(pk=340).blocks.count(), 1)


class TestSurveyDashResource(SolomonResourceTestCase):
    fixtures = ['reef.json', 'users.json']
    resource_name = 'surveydash'

    def setUp(self):
        super(TestSurveyDashResource, self).setUp()
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
