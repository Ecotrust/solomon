import calendar
import csv
import datetime
import json
from collections import defaultdict
from decimal import Decimal

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Avg, Count, Min, Max, Sum
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404

from ordereddict import OrderedDict

from apps.survey.models import Survey, Question, Response, Respondant, LocationAnswer, GridAnswer, MultiAnswer
from .decorators import api_user_passes_test
from .forms import SurveyorStatsForm
from .models import QuestionReport
from .utils import SlugCSVWriter


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

    answer_domain = question.get_answer_domain(survey, filter_list)
    return HttpResponse(json.dumps({'success': "true", "answer_domain": list(answer_domain)}))


def _error(message='An error occurred.', **kwargs):
    return HttpResponse(json.dumps({
        'success': False,
        'message': message,
        'errors': kwargs
    }))


def _get_crosstab(filters, survey_slug, question_a_slug, question_b_slug):
    start_date = filters.get('startdate', None)
    end_date = filters.get('enddate', None)
    group = filters.get('group', None)
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
            question_a_responses = question_a_responses.filter(respondant__ts__range=(start_date, end_date))
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
            if question_b.type == 'grid':
                obj['type'] = 'stacked-column'
                rows = (GridAnswer.objects.filter(response__respondant__in=respondants,
                                                  response__question=question_b)
                                          .values('row_text', 'row_label')
                                          .order_by('row_label')
                                          .distinct()
                                          .annotate(average=Avg('answer_number')))
                obj['seriesNames'] = list(rows.values_list('row_text', flat=True))
                for row in rows:
                    row['average'] = int(row['average'])
                crosstab.append({
                    'name': question_a_answer['answer'],
                    'value': list(rows)
                })
            elif question_b.type == 'multi-select':
                obj['type'] = 'stacked-column-count'
                rows = (MultiAnswer.objects.filter(response__respondant__in=respondants,
                                                   response__question=question_b)
                                           .values('answer_text', 'answer_label')
                                           .order_by('answer_text')
                                           .annotate(count=Count('answer_text')))

                row_vals = rows.values_list('answer_text', flat=True)
                # For some reason I was occasionally getting answers to questions that weren't complete, or something.
                # For instance: If everyone only answers 'Caught' to bought or caught and it happens to be the last
                # question, it'll overwrite the series names for all the others and we're left with just 'Caught'
                # which messes up the graph. This will work for now, ideally something smarter should happen here. -QWP
                if obj.get('seriesNames', None) is None or \
                    (len(row_vals) > obj['seriesNames']):
                    obj['seriesNames'] = list(row_vals)

                crosstab.append({
                    'name': question_a_answer['answer'],
                    'value': list(rows)
                })
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
                                              .extra(select={'date': "date_trunc(%s, ts)"},
                                                     select_params=(group,))
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
        return _error('No records for this range.', __all__=str(err))


def _create_csv_response(filename):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="{0}"'.format(filename)
    return response


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def get_crosstab_csv(request, survey_slug, question_a_slug, question_b_slug):
    obj = _get_crosstab(request.GET, survey_slug, question_a_slug, question_b_slug)
    if isinstance(obj, HttpResponse):
        return obj

    response = _create_csv_response('crosstab-{0}-{1}.csv'.format(question_a_slug, question_b_slug))
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
    obj = _get_crosstab(request.GET, survey_slug, question_a_slug, question_b_slug)
    if isinstance(obj, HttpResponse):
        return obj
    return HttpResponse(json.dumps(obj, cls=DjangoJSONEncoder),
                        content_type='application/json')


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return str(obj)
        return super(CustomJSONEncoder, self).default(obj)


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

    res = (res.extra(select={'timestamp': "date_trunc(%s, ts)"},
                     select_params=(interval,))
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
    }, cls=CustomJSONEncoder), content_type='application/json')


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def surveyor_stats_csv(request, survey_slug, interval):
    form = SurveyorStatsForm(request.GET)
    if not form.is_valid():
        return HttpResponseBadRequest(json.dumps(form.errors))

    res = Respondant.stats_report_filter(survey_slug, **form.cleaned_data)

    res = (res.extra(select={'timestamp': "date_trunc(%s, ts)"},
                     select_params=(interval,))
              .values('surveyor__first_name', 'surveyor__last_name',
                      'timestamp')
              .annotate(count=Count('pk')))

    response = _create_csv_response('raw_surveyor_stats.csv')
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

    response = _create_csv_response('surveyor_stats.csv')
    writer = csv.writer(response)
    writer.writerow(('Surveyor', 'market', 'timestamp', 'status'))
    for row in res:
        writer.writerow((row.surveyor.get_full_name() if row.surveyor else '',
                         row.survey_site, row.ts, row.review_status))

    return response


def _grid_standard_deviation(interval, question_slug, row_label=None, market=None):
    rows = (GridAnswer.objects.filter(response__question__slug=question_slug)
                              .extra(select={'date': "date_trunc(%s, survey_response.ts)"},
                                     select_params=(interval,),
                                     tables=('survey_response',)))
    if row_label is not None:
        rows = rows.filter(row_label=row_label)
    if market is not None:
        rows = rows.filter(response__respondant__survey_site=market)
    labels = list(rows.values_list('row_label', flat=True))
    rows = (rows.values('row_text', 'row_label', 'date')
                .order_by('date')
                .annotate(minimum=Min('answer_number'),
                          average=Avg('answer_number'),
                          maximum=Max('answer_number'),
                          total=Sum('answer_number')))
    return rows, labels


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def grid_standard_deviation_json(request, question_slug, interval):
    rows, labels = _grid_standard_deviation(interval, question_slug)
    for row in rows:
        row['date'] = calendar.timegm(row['date'].utctimetuple()) * 1000

    return HttpResponse(json.dumps({
        'success': True,
        'graph_data': list(rows),
        'labels': list(labels),
    }, cls=CustomJSONEncoder), content_type='application/json')


@api_user_passes_test(lambda u: u.is_staff or u.is_superuser)
def full_data_dump_csv(request, survey_slug):
    survey = Survey.objects.get(slug=survey_slug)
    response = _create_csv_response('full_dump_{0}.csv'.format(
        datetime.date.today().strftime('%d-%m-%Y')))
    fields = OrderedDict(Respondant.get_field_names().items() +
                         survey.generate_field_names().items())

    writer = SlugCSVWriter(response, fields)
    writer.writeheader()
    for resp in survey.respondant_set.all():
        writer.writerow(resp.generate_flat_dict())
    return response
