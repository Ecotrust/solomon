import calendar
import csv
import datetime
import json
from collections import defaultdict

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Avg, Count, Sum
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404


from apps.survey.models import Survey, Question, Response, Respondant, LocationAnswer
from .decorators import api_user_passes_test
from .models import QuestionReport
from .forms import SurveyorStatsForm


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def get_geojson(request, survey_slug, question_slug):
    survey = get_object_or_404(Survey, slug=survey_slug)
    locations = LocationAnswer.objects.filter(location__response__respondant__survey=survey,
                                              location__respondant__complete=True)

    filter_list = []
    filters = None

    if request.GET:
        filters = request.GET.get('filters', None)

    if filters is not None:
        filter_list = json.loads(filters)

    if filters is not None:
        for filter in filter_list:
            slug = filter.keys()[0]
            value = filter[slug]
            filter_question = QuestionReport.objects.get(slug=slug, survey=survey)
            locations = locations.filter(location__respondant__responses__in=filter_question.response_set.filter(answer__in=value))

    geojson = []
    for location in locations:
        d = {
            'type': "Feature",
            'properties': {
                'activity': location.answer,
                'label': location.label
            },
            'geometry': {
                'type': "Point",
                'coordinates': [location.location.lng, location.location.lat]
            }
        }
        geojson.append(d)

    return HttpResponse(json.dumps({'success': "true", 'geojson': geojson}))


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def get_distribution(request, survey_slug, question_slug):
    survey = get_object_or_404(Survey, slug=survey_slug)
    question = get_object_or_404(QuestionReport, slug=question_slug, survey=survey)

    filter_list = []

    if request.GET:
        filters = request.GET.get('filters', None)

    if filters is not None:
        filter_list = json.loads(filters)

    answer_domain = question.get_answer_domain(survey, filter_list)
    return HttpResponse(json.dumps({'success': "true", "answer_domain": list(answer_domain)}))


def _error(message='An error occurred.', **kwargs):
    return HttpResponse(json.dumps({
        'success': False,
        'message': message,
        'errors': kwargs
    }))


def _get_crosstab(request, survey_slug, question_a_slug, question_b_slug):
    start_date = request.GET.get('startdate', None)
    end_date = request.GET.get('enddate', None)
    group = request.GET.get('group', None)
    try:
        if start_date is not None:
            start_date = datetime.datetime.strptime(start_date, '%Y%m%d') - datetime.timedelta(days=1)

        if end_date is not None:
            end_date = datetime.datetime.strptime(end_date, '%Y%m%d') + datetime.timedelta(days=1)

        survey = Survey.objects.get(slug=survey_slug)

        question_a = Question.objects.get(slug=question_a_slug, survey=survey)
        question_b = Question.objects.get(slug=question_b_slug, survey=survey)
        question_a_responses = Response.objects.filter(question=question_a)

        if start_date is not None and end_date is not None:
            question_a_responses = question_a_responses.filter(respondant__ts__lte=end_date, respondant__ts__gte=start_date)
        crosstab = []
        obj = {
            'question_a': question_a.title,
            'question_b': question_b.title
        }

        for question_a_answer in question_a_responses.order_by('answer').values('answer').distinct():
            respondants = Respondant.objects.all()

            if start_date is not None and end_date is not None:
                respondants = respondants.filter(ts__lte=end_date, ts__gte=start_date)

            respondants = respondants.filter(responses__in=question_a_responses.filter(answer=question_a_answer['answer']))
            if question_b.type in ['grid']:
                obj['type'] = 'stacked-column'
                try:
                    rows = (Response.objects.filter(respondant__in=respondants, question=question_b)[0]
                                            .gridanswer_set
                                            .all()
                                            .values('row_text', 'row_label')
                                            .order_by('row_label'))
                    obj['seriesNames'] = [row['row_text'] for row in rows]
                    crosstab.append({
                        'name': question_a_answer['answer'],
                        'value': list(rows.annotate(average=Avg('answer_number')))
                    })
                except IndexError as e:
                    print "not found"
                    print e
            elif question_b.type in ['currency', 'integer', 'number']:
                if group is None:
                    obj['type'] = 'bar-chart'
                    d = {
                        'name': question_a_answer['answer'],
                        'value': (Response.objects.filter(respondant__in=respondants, question=question_b)
                                                  .aggregate(sum=Sum('answer_number'))['sum'])
                    }
                else:
                    obj['type'] = 'time-series'
                    values = (Response.objects.filter(respondant__in=respondants, question=question_b)
                                              .extra(select={'date': "date_trunc('%s', ts)" % group})
                                              .order_by('date')
                                              .values('date')
                                              .annotate(sum=Sum('answer_number')))

                    d = {
                        'name': question_a_answer['answer'],
                        'value': list(values)
                    }

                crosstab.append(d)

            obj['crosstab'] = crosstab
            obj['success'] = 'true'
        return obj
    except Exception, err:
        print Exception, err
        return _error('No records for this range.', __all__=err.message)


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def get_crosstab_csv(request, survey_slug, question_a_slug, question_b_slug):
    obj = _get_crosstab(request, survey_slug, question_a_slug, question_b_slug)
    if isinstance(obj, HttpResponse):
        return obj

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="crosstab-{0}-{1}.csv"'.format(question_a_slug, question_b_slug)
    if obj['type'] == 'stacked-column':
        fields = obj['seriesNames']
        fields.insert(0, obj['question_a'])

        writer = csv.DictWriter(response, fields)
        writer.writerow(dict((fn, fn) for fn in fields))
        for row in obj['crosstab']:
            data = {
                obj['question_a']: row['name']
            }
            for v in row['value']:
                data[v['row_text']] = v['average']
            writer.writerow(data)
    elif obj['type'] == 'bar-chart':
        writer = csv.writer(response)
        writer.writerow((obj['question_a'], obj['question_b']))
        for row in obj['crosstab']:
            writer.writerow((row['name'], row['value']))
    elif obj['type'] == 'time-series':
        writer = csv.writer(response)
        writer.writerow((obj['question_a'], 'date', obj['question_b']))
        for row in obj['crosstab']:
            for v in row['value']:
                writer.writerow((row['name'], v['date'], v['sum']))
    return response


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def get_crosstab_json(request, survey_slug, question_a_slug, question_b_slug):
    obj = _get_crosstab(request, survey_slug, question_a_slug, question_b_slug)
    if isinstance(obj, HttpResponse):
        return obj
    return HttpResponse(json.dumps(obj, cls=DjangoJSONEncoder),
                        content_type='application/json')


class DateTimeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        return super(DateTimeJSONEncoder, self).default(obj)


def _get_fullname(data):
    return ('{0} {1}'.format(data.pop('surveyor__first_name'),
                             data.pop('surveyor__last_name'))
            .strip())


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def surveyor_stats_json(request, survey_slug, interval):
    form = SurveyorStatsForm(request.GET)
    if not form.is_valid():
        return _error(**form.errors)

    res = Respondant.stats_report_filter(survey_slug, **form.cleaned_data)

    if not res.exists():
        return _error('No records for these filters.')

    res = (res.extra(select={'timestamp': "date_trunc('%s', ts)" % interval})
              .values('surveyor__first_name', 'surveyor__last_name',
                      'timestamp')
              .annotate(count=Count('pk')))

    res = res.order_by('timestamp')

    grouped_data = defaultdict(list)

    for respondant in res:
        name = _get_fullname(respondant)
        grouped_data[name].append(
            (calendar.timegm(respondant['timestamp'].utctimetuple()) * 1000,
             respondant['count'])
        )

    graph_data = []
    for name, data in grouped_data.iteritems():
        graph_data.append({'data': data, 'name': name})

    return HttpResponse(json.dumps({
        'success': True,
        'graph_data': graph_data
    }, cls=DateTimeJSONEncoder), content_type='application/json')


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def surveyor_stats_csv(request, survey_slug, interval):
    form = SurveyorStatsForm(request.GET)
    if not form.is_valid():
        return HttpResponseBadRequest(json.dumps(form.errors))

    res = Respondant.stats_report_filter(survey_slug, **form.cleaned_data)

    res = (res.extra(select={'timestamp': "date_trunc('%s', ts)" % interval})
              .values('surveyor__first_name', 'surveyor__last_name',
                      'timestamp')
              .annotate(count=Count('pk')))

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="raw_surveyor_stats.csv"'
    writer = csv.writer(response)
    writer.writerow(('Surveyor', 'timestamp', 'count'))
    for row in res:
        writer.writerow((_get_fullname(row), row['timestamp'], row['count']))

    return response


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def surveyor_stats_raw_data_csv(request, survey_slug):
    form = SurveyorStatsForm(request.GET)
    if not form.is_valid():
        return HttpResponseBadRequest(json.dumps(form.errors))

    res = (Respondant.stats_report_filter(survey_slug, **form.cleaned_data)
                     .select_related('surveyor'))
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="surveyor_stats.csv"'
    writer = csv.writer(response)
    writer.writerow(('Surveyor', 'market', 'timestamp', 'status'))
    for row in res:
        writer.writerow((row.surveyor.get_full_name() if row.surveyor else '',
                         row.survey_site, row.ts, row.review_status))

    return response
