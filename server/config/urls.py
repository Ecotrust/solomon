from django.conf.urls import patterns, include, url
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf import settings
from django.contrib import admin
from django.http import HttpResponseRedirect

from tastypie.api import Api

from apps.survey import urls as survey_urls
from apps.reports import urls as report_urls

from apps.survey.api import *
from apps.places.api import *
from apps.account.api import *

v1_api = Api(api_name='v1')

v1_api.register(SurveyResource())
v1_api.register(RespondantResource())
v1_api.register(ReportRespondantResource())
v1_api.register(ReportRespondantDetailsResource())
v1_api.register(OfflineRespondantResource())
v1_api.register(OfflineResponseResource())
v1_api.register(PlaceResource())
v1_api.register(QuestionResource())
v1_api.register(ResponseResource())
v1_api.register(PageResource())
v1_api.register(OptionResource())
v1_api.register(UserResource())
v1_api.register(BlockResource())

v1_api.register(SurveyDashResource())
v1_api.register(SurveyReportResource())

admin.autodiscover()

urlpatterns = patterns('',

    # Password reset URLs:
    url(r'^admin/password_reset/$', 'django.contrib.auth.views.password_reset', name='admin_password_reset'),
    (r'^admin/password_reset/done/$', 'django.contrib.auth.views.password_reset_done'),
    (r'^reset/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'django.contrib.auth.views.password_reset_confirm'),
    (r'^reset/done/$', 'django.contrib.auth.views.password_reset_complete'),
    url(r'^admin/', include(admin.site.urls)),

    url(r'^grappelli/', include('grappelli.urls')),
    (r'^api/', include(v1_api.urls)),

    url(r'^account/', include('apps.account.urls')),
    url(r'^report', include(report_urls)),
    #anon survey user for specific survey
    url(r'^respond/(?P<survey_slug>[\w\d-]+)$', 'apps.survey.views.survey'),
    #survey responder with preassigned uuid
    url(r'^respond$', 'apps.survey.views.survey'),
    #other survey urls
    url(r'^respond', include(survey_urls)),

    # backend urls
    url(r'^dash/(?P<survey_slug>[\w\d-]+)$', 'apps.survey.views.dash'),
    #survey responder with preassigned uuid
    url(r'^dash$', 'apps.survey.views.dash', name='dashboard'),
    #other survey urls
    url(r'^dash', include(survey_urls)),

    # Redirect / to /dash
    url(r'^$', lambda r: HttpResponseRedirect('/dash')),
    # (r'^register', survey_urls.register),
    #(r'^survey/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.SURVEY_ROOT}),
    # (r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),
)

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
