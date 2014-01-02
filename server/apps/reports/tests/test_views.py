import csv
import datetime
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.utils.text import slugify
from django.utils.timezone import utc
from django.test import TestCase

from survey.models import (Question, Respondant, Response, Survey,
                           REVIEW_STATE_ACCEPTED, REVIEW_STATE_NEEDED)
from ..views import (_get_crosstab, _grid_standard_deviation,
                     _single_select_count, _gear_type_frequency,
                     _vendor_resource_type_frequency)


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
        raw_answer = [{'text': a, 'label': slugify(unicode(a)),
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

    def create_respondant(self, when, market, answers, status=None):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        if status is not None:
            respondant.review_status = status

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
        self.create_respondant(now, 'Ball Beach', ('Caught',))
        self.create_respondant(now, 'Ball Beach', ('Caught', 'Bought'))

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

    def test_market_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        self.create_respondant(now, 'Ball Beach', ('Caught',))
        self.create_respondant(now, 'Maro Maro', ('Bought',))

        obj = self.request({'market': 'Ball Beach'})
        self.assertIn('crosstab', obj)
        expected = 1
        count = 0
        for market in obj['crosstab']:
            self.assertEqual('Ball Beach', market['name'])
            count += 1
        self.assertEqual(expected, count)

    def test_status_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        self.create_respondant(now, 'Ball Beach', ('Caught',), status=REVIEW_STATE_NEEDED)
        self.create_respondant(now, 'Maro Maro', ('Bought',), status=REVIEW_STATE_ACCEPTED)

        obj = self.request({'status': REVIEW_STATE_ACCEPTED})
        self.assertIn('crosstab', obj)
        expected = 1
        count = 0
        for market in obj['crosstab']:
            self.assertEqual('Maro Maro', market['name'])
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

    def create_respondant(self, when, prices, market=None, status=None):
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        if status is not None:
            respondant.review_status = status

        respondant.save()

        grid_response = self.create_grid_response(self.question, respondant,
                                                  when, prices)
        respondant.responses.add(grid_response)
        if market is not None:
            market_response = self.create_text_response(self.market_question,
                                                        respondant, when, market)
            respondant.responses.add(market_response)
        respondant.save()

    def request(self, interval, **kwargs):
        return _grid_standard_deviation(interval, self.question_slug, **kwargs)

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

    def test_time_series_status_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week = datetime.timedelta(days=7)
        self.create_respondant(now, range(1, 8), status=REVIEW_STATE_ACCEPTED)
        self.create_respondant(now, range(3, 24, 3), status=REVIEW_STATE_NEEDED)
        self.create_respondant(now - week, range(1, 8), status=REVIEW_STATE_ACCEPTED)
        self.create_respondant(now - week, range(5, 40, 5), status=REVIEW_STATE_ACCEPTED)

        rows, labels = self.request('day', status=REVIEW_STATE_ACCEPTED)
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

    def test_json_view_ts_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week_ago = now - datetime.timedelta(days=7)
        week_from_now = now + datetime.timedelta(days=7)
        two_days_ago = now - datetime.timedelta(days=2)
        two_days_from_now = now + datetime.timedelta(days=2)
        # These price sets are picked so that the average is twice the first
        # price set, and thrice for the other set.
        self.create_respondant(week_ago, range(1, 8))
        self.create_respondant(week_ago, range(5, 40, 5))
        self.create_respondant(now, range(1, 8))
        self.create_respondant(now, range(3, 24, 3))
        self.create_respondant(week_from_now, range(1, 8))
        self.create_respondant(week_from_now, range(5, 40, 5))

        self.client.login(username=self.user.username, password='password')

        res = self.client.get(reverse('reports_grid_standard_deviation_json',
                                      kwargs={'question_slug': 'cost',
                                              'interval': 'day'}),
                              data={
                                  'start_date': two_days_ago.strftime('%Y-%m-%d'),
                                  'end_date': two_days_from_now.strftime('%Y-%m-%d')
                              })
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.content)
        self.assertIn('labels', body)
        self.assertIn('graph_data', body)
        air_text = 'Air transport (ticket)'
        self.assertIn(air_text, body['graph_data'])

        expected = 1
        count = 0
        for row in body['graph_data'][air_text]:
            self.assertEqual(row['average'], 14)
            count += 1
        self.assertEqual(expected, count)


class TestVendorResourceFrequency(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    vendor_a = 'Cathrine Molea'
    vendor_b = 'Charles Darwin'
    fish_a = 'Kingfish'
    fish_b = 'Ratfish'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question_vendor = Question.objects.get(slug='vendor')
        self.question_fishes = Question.objects.get(slug='type-of-fish')
        self.question_market = Question.objects.get(slug='survey-site')

    def create_respondant(self, vendor, fishes, market=None, status=None,
                          when=None):
        if when is None:
            when = datetime.datetime.utcnow().replace(tzinfo=utc)
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        if status is not None:
            respondant.review_status = status

        respondant.save()

        if market is not None:
            response_market = self.create_text_response(self.question_market,
                                                        respondant, when, market)
            respondant.responses.add(response_market)

        response_vendor = self.create_text_response(self.question_vendor,
                                                    respondant, when, vendor)
        respondant.responses.add(response_vendor)

        response_fishes = self.create_multi_select_response(self.question_fishes,
                                                            respondant, when, fishes)
        respondant.responses.add(response_fishes)
        respondant.save()
        return respondant

    def test_percents(self):
        self.create_respondant(self.vendor_a, (self.fish_a, self.fish_b))
        self.create_respondant(self.vendor_b, (self.fish_a,))
        rows, vendor_count = _vendor_resource_type_frequency()

        expected = 2
        count = 0
        for row in rows:
            if row['answer_text'] == self.fish_a:
                count += 1
                self.assertEqual(row['count'], 2)
                self.assertEqual(row['percent'], '%.2f' % (2.0 / vendor_count))
            elif row['answer_text'] == self.fish_b:
                count += 1
                self.assertEqual(row['count'], 1)
                self.assertEqual(row['percent'], '%.2f' % (1.0 / vendor_count))
        self.assertEqual(count, expected)

    def test_json_view_ts_filter(self):
        now = datetime.datetime.utcnow().replace(tzinfo=utc)
        week_ago = now - datetime.timedelta(days=7)
        week_from_now = now + datetime.timedelta(days=7)
        self.create_respondant(self.vendor_b, (self.fish_b,),
                               when=week_ago)
        self.create_respondant(self.vendor_a, (self.fish_a, self.fish_b),
                               when=now)
        self.create_respondant(self.vendor_b, (self.fish_a,),
                               when=week_from_now)

        self.client.login(username=self.user.username, password='password')
        res = self.client.get(reverse('vendor_resource_type_frequency_json'),
                              data={
                                  'start_date': (now - datetime.timedelta(days=2)).strftime('%Y-%m-%d'),
                                  'end_date': (now + datetime.timedelta(days=2)).strftime('%Y-%m-%d')
                              })

        self.assertEqual(200, res.status_code)
        body = json.loads(res.content)

        self.assertIn('graph_data', body)

        expected = 2
        count = 0
        for row in body['graph_data']:
            row['count'] = 1
            count += 1
        self.assertEqual(count, expected)


class TestSingleSelectCount(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    market_a = 'Ball Beach'
    market_b = 'Maro Maro'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question_market = Question.objects.get(slug='survey-site')

    def create_respondant(self, market, status=None, when=None):
        if when is None:
            when = datetime.datetime.utcnow().replace(tzinfo=utc)
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        if status is not None:
            respondant.review_status = status

        respondant.save()

        response_market = self.create_text_response(self.question_market,
                                                    respondant, when, market)
        respondant.responses.add(response_market)

        respondant.save()
        return respondant

    def test_market_servey_count(self):
        self.create_respondant(self.market_a)
        self.create_respondant(self.market_a)
        self.create_respondant(self.market_b)

        rows, labels = _single_select_count('survey-site')
        for row in rows:
            if row['answer'] == self.market_a:
                self.assertEqual(row['count'], 2)
            elif row['answer'] == self.market_b:
                self.assertEqual(row['count'], 1)


class TestGearTypeFrequency(TestCase, ResponseMixin):
    fixtures = ['reef.json', 'users.json']
    market_a = 'Ball Beach'
    market_b = 'Maro Maro'
    gear_a = 'Spear'
    gear_b = 'Net'

    def setUp(self):
        self.user = User.objects.get(username='superuser_alpha')
        self.survey = Survey.objects.get(slug='reef-fish-market-survey')
        self.question_gear = Question.objects.get(slug='type-of-gear')
        self.question_market = Question.objects.get(slug='survey-site')

    def create_respondant(self, market, gear_types, status=None, when=None):
        if when is None:
            when = datetime.datetime.utcnow().replace(tzinfo=utc)
        respondant = Respondant(survey=self.survey,
                                ts=when,
                                surveyor=self.user)
        if status is not None:
            respondant.review_status = status

        respondant.save()

        response_market = self.create_text_response(self.question_market,
                                                    respondant, when, market)
        respondant.responses.add(response_market)

        response_gear = self.create_multi_select_response(self.question_gear,
                                                          respondant, when,
                                                          gear_types)
        respondant.responses.add(response_gear)
        respondant.save()
        return respondant

    def test_gear_frequency(self):
        self.create_respondant(self.market_a, (self.gear_a,))
        self.create_respondant(self.market_a, (self.gear_a, self.gear_b))
        self.create_respondant(self.market_b, (self.gear_a, self.gear_b))

        rows = _gear_type_frequency()

        self.assertIn(self.market_a, rows)
        expected = 2
        count = 0
        for row in rows[self.market_a]:
            if row['type'] == self.gear_a:
                self.assertEqual(row['percent'], '0.67')
                count += 1
            else:
                self.assertEqual(row['percent'], '0.33')
                count += 1
        self.assertEqual(expected, count)

    def test_gear_frequency_json(self):
        self.create_respondant(self.market_a, (self.gear_a,))
        self.create_respondant(self.market_a, (self.gear_a, self.gear_b))

        self.client.login(username=self.user.username, password='password')
        res = self.client.get(reverse('gear_type_frequency_json'))

        self.assertEqual(200, res.status_code)

        body = json.loads(res.content)

        self.assertIn(self.market_a, body['graph_data'])
        expected = 2
        count = 0
        for row in body['graph_data'][self.market_a]:
            if row['type'] == self.gear_a:
                self.assertEqual(row['percent'], '0.67')
                count += 1
            else:
                self.assertEqual(row['percent'], '0.33')
                count += 1
        self.assertEqual(expected, count)
