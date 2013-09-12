from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Max, Min, Count
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Sum
import simplejson

from apps.survey.models import Survey, Question, Response, Respondant, Location, LocationAnswer
from apps.reports.models import QuestionReport

@staff_member_required
def get_geojson(request, survey_slug, question_slug):
    survey = get_object_or_404(Survey, slug=survey_slug)
    question = get_object_or_404(QuestionReport, slug=question_slug, survey=survey)
    locations = LocationAnswer.objects.filter(location__response__respondant__survey=survey, location__respondant__complete=True)
    
    filter_list = []
    filters = None

    if request.GET:    
        filters = request.GET.get('filters', None)

    if filters is not None:
        filter_list = simplejson.loads(filters)

    if filters is not None:    
        for filter in filter_list:
            slug = filter.keys()[0]
            value = filter[slug]
            filter_question = QuestionReport.objects.get(slug=slug, survey=survey)
            locations = locations.filter(location__respondant__responses__in=filter_question.response_set.filter(answer__in=value))

    geojson = [];
    for location in locations:
        d = {
            'type': "Feature",
            'properties': {
                'activity': location.answer,
                'label': location.label
            },
            'geometry': {
                'type': "Point",
                'coordinates': [location.location.lng,location.location.lat]
            }
        }
        geojson.append(d)

    
    return HttpResponse(simplejson.dumps({'success': "true", 'geojson': geojson}))

@staff_member_required
def get_distribution(request, survey_slug, question_slug):
    survey = get_object_or_404(Survey, slug=survey_slug)
    question = get_object_or_404(QuestionReport, slug=question_slug, survey=survey)

    filter_question_slug = None
    filter_value = None

    filter_list = []

    if request.GET:
        filter_value = request.GET.get('filter_value')
        filter_question_slug = request.GET.get('filter_question')
        filters = request.GET.get('filters', None)

    if filters is not None:
        filter_list = simplejson.loads(filters)
        
    else:
        filter_question = None
    answer_domain = question.get_answer_domain(survey, filter_list)
    return HttpResponse(simplejson.dumps({'success': "true", "answer_domain": list(answer_domain)}))

@staff_member_required
def get_crosstab(request, survey_slug, question_a_slug, question_b_slug):
    survey = Survey.objects.get(slug = survey_slug)
    question_a = Question.objects.get(slug = question_a_slug, survey=survey)
    question_b = Question.objects.get(slug = question_b_slug, survey=survey)
    question_a_responses = Response.objects.filter(question=question_a)
    crosstab = []
    for question_a_answer in question_a_responses.values('answer').distinct():
        respondants = Respondant.objects.filter(responses__in=question_a_responses.filter(answer=question_a_answer['answer']))
        if question_b.type in ['currency', 'integer', 'number']:
            crosstab.append({
                'name': question_a_answer['answer'],
                'value': Response.objects.filter(respondant__in=respondants, question=question_b).aggregate(sum=Sum('answer_number'))['sum']
            })
    return HttpResponse(simplejson.dumps({'success': "true", "crosstab": list(crosstab)}))