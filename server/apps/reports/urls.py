from django.conf.urls import patterns, url
from reports.views import get_crosstab, get_distribution, get_geojson, surveyor_stats


urlpatterns = patterns('',
    (r'/distribution/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_distribution),
    (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+)', get_crosstab),
    (r'/geojson/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_geojson),
    url(r'/surveyor-stats/(?P<survey_slug>[\w\d-]+)/(?P<interval>[\w]+)', surveyor_stats, name='reports_surveyor_stats'),
)
