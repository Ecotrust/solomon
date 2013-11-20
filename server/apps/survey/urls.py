from django.conf.urls.defaults import patterns
from survey.views import answer, complete, delete_responses


urlpatterns = patterns('',
    (r'delete/(?P<uuid>[\w\d-]+)', delete_responses),
    (r'/answer/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', answer),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)/(?P<action>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', complete),
    (r'/complete/(?P<survey_slug>[\w\d-]+)/(?P<uuid>[\w\d-]+)', complete),

)
