import csv
import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.utils.timezone import utc
from django.test import TestCase

from survey.models import Question, Respondant, Response, Survey
from ..views import _get_crosstab, _grid_standard_deviation


class BaseSurveyorStatsCase(TestCase):
    fixtures = ['reef.json', 'users.json']

    def setUp(self):
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question = self.survey.questions.get(slug='survey-site')
        self.respondant_user = User.objects.get(username='superuser_alpha')
        self.ts = datetime.datetime(2013, 11, 30).replace(tzinfo=utc)
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


class ResponseMixin(object):
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

    def create_grid_response(self, question, respondant, when, prices):
        grid_response = Response(question=question, respondant=respondant,
                                 ts=when, answer_raw=self.cost_grid.format(*prices))
        grid_response.save()
        return grid_response

    def create_text_response(self, question, respondant, when, text):
        text_response = Response(question=question, respondant=respondant,
                                 ts=when, answer_raw=json.dumps({'text': text}))
        text_response.save()
        return text_response

    def create_multi_select_response(self, question, respondant, when, answers):
        raw_answer = [{'text': a.title(), 'label': a.lower(),
                       'checked': True, 'isGroupName': False}
                      for a in answers]
        ms_response = Response(question=question, respondant=respondant,
                               ts=when, answer_raw=json.dumps(raw_answer))
        ms_response.save()
        return ms_response


class TestCrossTabGrid(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    question_a_slug = 'survey-site'
    question_b_slug = 'cost'
    survey_slug = 'reef-fish-market-survey'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug=self.survey_slug)
        self.question_a = Question.objects.get(slug=self.question_a_slug)
        self.question_b = Question.objects.get(slug=self.question_b_slug)

    def create_respondant(self, when, market, prices):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)

        respondant.save()

        response_a = self.create_text_response(self.question_a,
                                               respondant, when, market)
        respondant.responses.add(response_a)

        response_b = self.create_grid_response(self.question_b,
                                               respondant, when, prices)
        respondant.responses.add(response_b)
        respondant.save()
        return respondant

    def request(self, filters):
        return _get_crosstab(filters, self.survey_slug, self.question_a_slug,
                             self.question_b_slug)

    def test_stacked_column(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        # These price sets are picked so that the average is twice the first
        # price set
        self.create_respondant(now, 'Ball Beach', range(1, 8))
        self.create_respondant(now, 'Ball Beach', range(3, 24, 3))

        obj = self.request({})
        self.assertIn('crosstab', obj)
        expected = 1
        count = 0
        for market in obj['crosstab']:
            for row in market['value']:
                if row['row_label'] == 'air-transport-ticket':
                    self.assertEqual(row['average'], 14)
                    count += 1
        self.assertEqual(expected, count)


class TestCrossTabMultiSelect(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    survey_slug = 'reef-fish-market-survey'
    question_a_slug = 'survey-site'
    question_b_slug = 'buy-or-catch'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug=self.survey_slug)
        self.question_a = Question.objects.get(slug=self.question_a_slug)
        self.question_b = Question.objects.get(slug=self.question_b_slug)

    def request(self, filters):
        return _get_crosstab(filters, self.survey_slug, self.question_a_slug,
                             self.question_b_slug)

    def create_respondant(self, when, market, answers):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)

        respondant.save()

        response_a = self.create_text_response(self.question_a,
                                               respondant, when, market)
        respondant.responses.add(response_a)

        response_b = self.create_multi_select_response(self.question_b,
                                                       respondant, when, answers)
        respondant.responses.add(response_b)
        respondant.save()
        return respondant

    def test_stacked_column(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        self.create_respondant(now, 'Ball Beach', ('caught',))
        self.create_respondant(now, 'Ball Beach', ('caught', 'bought'))

        obj = self.request({})
        self.assertIn('crosstab', obj)
        expected = 2
        count = 0
        for market in obj['crosstab']:
            for row in market['value']:
                if row['answer_label'] == 'caught':
                    self.assertEqual(row['count'], 2)
                    count += 1
                elif row['answer_label'] == 'bought':
                    self.assertEqual(row['count'], 1)
                    count += 1
        self.assertEqual(expected, count)


class TestGridStandardDeviation(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    survey_slug = 'reef-fish-market-survey'
    question_slug = 'cost'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug=self.survey_slug)
        self.question = Question.objects.get(slug=self.question_slug)
        self.market_question = Question.objects.get(slug='survey-site')

    def create_respondant(self, when, prices, market=None):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        respondant.save()
        grid_response = self.create_grid_response(self.question, respondant,
                                                  when, prices)
        respondant.responses.add(grid_response)
        if market is not None:
            market_response = self.create_text_response(self.market_question,
                                                        respondant, when, market)
            respondant.responses.add(market_response)
        respondant.save()

    def request(self, interval, market=None):
        return _grid_standard_deviation(interval, self.question_slug, market=market)

    def test_time_series(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week = datetime.timedelta(days=7)
        # These price sets are picked so that the average is twice the first
        # price set, and thrice for the other set.
        self.create_respondant(now, range(1, 8))
        self.create_respondant(now, range(3, 24, 3))
        self.create_respondant(now - week, range(1, 8))
        self.create_respondant(now - week, range(5, 40, 5))

        rows, labels = self.request('day')
        expected = 2
        count = 0
        for row in rows:
            if row['row_label'] == 'air-transport-ticket':
                # Replace is used to truncate to day.
                if row['date'] == now.replace(hour=0, minute=0, second=0, microsecond=0):
                    self.assertEqual(row['average'], 14)
                    count += 1
                elif row['date'] == (now - week).replace(hour=0, minute=0, second=0, microsecond=0):
                    self.assertEqual(row['average'], 21)
                    count += 1
        self.assertEqual(count, expected)

    def test_time_series_market_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week = datetime.timedelta(days=7)
        self.create_respondant(now, range(1, 8), market='Ball Beach')
        self.create_respondant(now, range(3, 24, 3), market='Maro Maro')
        self.create_respondant(now - week, range(1, 8), market='Ball Beach')
        self.create_respondant(now - week, range(5, 40, 5), market='Ball Beach')

        rows, labels = self.request('day', market='Ball Beach')
        expected = 2
        count = 0
        for row in rows:
            if row['row_label'] == 'air-transport-ticket':
                # Replace is used to truncate to day.
                if row['date'] == now.replace(hour=0, minute=0, second=0, microsecond=0):
                    self.assertEqual(row['average'], 7)
                    count += 1
                elif row['date'] == (now - week).replace(hour=0, minute=0, second=0, microsecond=0):
                    self.assertEqual(row['average'], 21)
                    count += 1
        self.assertEqual(count, expected)

    def test_json_view(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week = datetime.timedelta(days=7)
        # These price sets are picked so that the average is twice the first
        # price set, and thrice for the other set.
        self.create_respondant(now, range(1, 8))
        self.create_respondant(now, range(3, 24, 3))
        self.create_respondant(now - week, range(1, 8))
        self.create_respondant(now - week, range(5, 40, 5))

        self.client.login(username=self.user.username, password='password')

        res = self.client.get(reverse('reports_grid_standard_deviation_json',
                                      kwargs={'question_slug': 'cost',
                                              'interval': 'day'}))
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.content)
        self.assertIn('labels', body)
        self.assertIn('graph_data', body)
