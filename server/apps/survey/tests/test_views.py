import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase

from ..models import Respondant, Response, Survey


class TestAnswer(TestCase):
    fixtures = ['reef.json', 'users.json']

    def setUp(self):
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question = self.survey.questions.get(slug='survey-site')
        self.respondant_user = User.objects.get(username='superuser_alpha')
        self.respondant = Respondant(survey=self.survey,
                                     ts=datetime.datetime.now(),
                                     surveyor=self.respondant_user)
        response = Response(question=self.question,
                            respondant=self.respondant)
        response.answer_raw = json.dumps({'text': 'Fishing Village'})
        self.respondant.save()
        response.save()

    def login(self):
        self.client.login(username='superuser_alpha', password='password')

    def get_url(self):
        return reverse('survey_answer', kwargs={
            'survey_slug': self.survey.slug,
            'question_slug': self.question.slug,
            'uuid': self.respondant.uuid
        })

    def test_get(self):
        res = self.client.get(self.get_url())
        self.assertEqual(res.status_code, 200)

    def test_edit_with_same_user(self):
        self.login()
        res = self.client.post(self.get_url(), data={
            json.dumps({
                'answer': {
                    'text': 'Ball Beach'
                }
            }): None
        })
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.content)
        self.assertNotEqual(body['success'], False)
        respondant = Respondant.objects.get(pk=self.respondant.pk)
        self.assertEqual(respondant.surveyor, self.respondant_user)

    def test_edit_with_new_user(self):
        self.new_user = User.objects.get(username='superuser_beta')
        self.client.login(username='superuser_beta', password='password')
        res = self.client.post(self.get_url(), data={
            json.dumps({
                'answer': {
                    'text': 'Ball Beach'
                }
            }): None
        })
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.content)
        self.assertNotEqual(body['success'], False)
        respondant = Respondant.objects.get(pk=self.respondant.pk)
        self.assertEqual(respondant.surveyor, self.respondant_user)
