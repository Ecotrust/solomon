from django.conf.urls.defaults import patterns, url
from survey.views import answer, complete, delete_responses


urlpatterns = patterns('',
    (r'delete/(?P<uuid>[\w\d-]+)', delete_responses),
    url(r'/answer/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', answer, name='survey_answer'),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)/(?P<action>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', complete),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', complete),

)
