from django.conf.urls import patterns, url
from reports.views import (get_crosstab_json, get_crosstab_csv,
                           get_distribution, get_geojson, surveyor_stats_csv,
                           surveyor_stats_json, surveyor_stats_raw_data_csv)


urlpatterns = patterns('',
    (r'/distribution/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_distribution),
    (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+).csv', get_crosstab_csv),
    (r'/crosstab/(?P<survey_slug>[\w\d-]+)/(?P<question_a_slug>[\w\d-]+)/(?P<question_b_slug>[\w\d-]+)', get_crosstab_json),
    (r'/geojson/(?P<survey_slug>[\w\d-]+)/(?P<question_slug>[\w\d-]+)', get_geojson),
    url(r'/surveyor-stats/(?P<survey_slug>[\w\d-]+).csv', surveyor_stats_raw_data_csv, name='reports_surveyor_stats_raw_data_csv'),
    url(r'/surveyor-stats/(?P<survey_slug>[\w\d-]+)/(?P<interval>[\w]+).csv', surveyor_stats_csv, name='reports_surveyor_stats_csv'),
    url(r'/surveyor-stats/(?P<survey_slug>[\w\d-]+)/(?P<interval>[\w]+)', surveyor_stats_json, name='reports_surveyor_stats_json'),
)
