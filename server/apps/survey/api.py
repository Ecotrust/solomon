from django.conf.urls import url

from tastypie import fields
from tastypie.authorization import Authorization
from tastypie.authentication import SessionAuthentication, ApiKeyAuthentication, MultiAuthentication
from tastypie.resources import ModelResource, ALL, ALL_WITH_RELATIONS

from survey.models import (Survey, Question, Option, Respondant, Response,
                           Page, Block, REVIEW_STATE_CHOICES, REVIEW_STATE_NEEDED,
                           REVIEW_STATE_FLAGGED, REVIEW_STATE_ACCEPTED)


class SurveyModelResource(ModelResource):
    def obj_update(self, bundle, request=None, **kwargs):
        bundle = super(SurveyModelResource, self).obj_update(bundle, **kwargs)
        for field_name in self.fields:
            field = self.fields[field_name]
            try:
                if type(field) is fields.ToOneField and field.null and bundle.data[field_name] is None:
                    setattr(bundle.obj, field_name, None)
            except KeyError:
                pass

        bundle.obj.save()

        return bundle


class StaffUserOnlyAuthorization(Authorization):

    def update_list(self, object_list, bundle):
        return bundle.request.user.is_staff

    def update_detail(self, object_list, bundle):
        return bundle.request.user.is_staff

    def delete_list(self, object_list, bundle):
        # Sorry user, no deletes for you!
        return bundle.request.user.is_staff

    def delete_detail(self, object_list, bundle):
        return bundle.request.user.is_staff


class AuthSurveyModelResource(SurveyModelResource):
    class Meta:
        authorization = StaffUserOnlyAuthorization()
        authentication = MultiAuthentication(ApiKeyAuthentication(), SessionAuthentication())


class ResponseResource(SurveyModelResource):
    question = fields.ToOneField('apps.survey.api.QuestionResource', 'question', full=True)
    answer_count = fields.IntegerField(readonly=True)

    class Meta:
        queryset = Response.objects.all()
        filtering = {
            'answer': ALL,
            'question': ALL_WITH_RELATIONS
        }
        ordering = ['question__order']


class OfflineResponseResource(AuthSurveyModelResource):
    question = fields.ToOneField('apps.survey.api.QuestionResource', 'question', null=True, blank=True)
    respondant = fields.ToOneField('apps.survey.api.OfflineRespondantResource', 'respondant')

    class Meta(AuthSurveyModelResource.Meta):
        queryset = Response.objects.all()


class OfflineRespondantResource(AuthSurveyModelResource):
    responses = fields.ToManyField(OfflineResponseResource, 'responses', null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True)

    class Meta(AuthSurveyModelResource.Meta):
        always_return_data = True
        queryset = Respondant.objects.all()
        ordering = ['-ts']

    def obj_create(self, bundle, **kwargs):
        return super(OfflineRespondantResource, self).obj_create(bundle, surveyor=bundle.request.user)

    def save_related(self, bundle):
        resource_uri = self.get_resource_uri(bundle.obj)
        for response in bundle.data.get('responses'):
            response['respondant'] = resource_uri


class ReportRespondantResource(AuthSurveyModelResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=False, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'surveyor', null=True, blank=True, full=True, readonly=True)

    class Meta(AuthSurveyModelResource.Meta):
        ALLOWED_METHODS = ['get', 'post', 'put', 'delete', 'patch']
        queryset = Respondant.objects.all().order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS,
            'survey_site': ['exact'],
            'review_status': ['exact'],
            'review_comment': ['exact'],
            'ts': ['gte', 'lte']
        }
        ordering = ['ts', 'survey', 'vendor', 'survey_site',
                    'responses', 'buy_or_catch', 'how_sold', 'user',
                    'review_status']

    def alter_list_data_to_serialize(self, request, data):
        data['meta']['statuses'] = REVIEW_STATE_CHOICES
        return data

    def alter_detail_data_to_serialize(self, request, bundle):
        if 'meta' not in bundle.data:
            bundle.data['meta'] = {}

        bundle.data['meta']['statuses'] = REVIEW_STATE_CHOICES

        bundle.data['meta']['next'] = {}

        base_filter = Respondant.objects.filter(ts__gt=bundle.obj.ts).order_by('-ts')
        if base_filter.exists():
            bundle.data['meta']['next']['unfiltered'] = base_filter[0].pk

        needed = base_filter.filter(review_status=REVIEW_STATE_NEEDED)
        if needed.exists():
            bundle.data['meta']['next']['needed'] = needed[0].pk

        flagged = base_filter.filter(review_status=REVIEW_STATE_FLAGGED)
        if flagged.exists():
            bundle.data['meta']['next']['flagged'] = flagged[0].pk

        not_accepted = base_filter.exclude(review_status=REVIEW_STATE_ACCEPTED)
        if not_accepted.exists():
            bundle.data['meta']['next']['not_accepted'] = not_accepted[0].pk

        return bundle


class ReportRespondantDetailsResource(ReportRespondantResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=True, null=True, blank=True)


class RespondantResource(AuthSurveyModelResource):
    responses = fields.ToManyField(ResponseResource, 'responses', full=True, null=True, blank=True)
    survey = fields.ToOneField('apps.survey.api.SurveyResource', 'survey', null=True, blank=True, full=True, readonly=True)
    user = fields.ToOneField('apps.account.api.UserResource', 'surveyor', null=True, blank=True, full=True, readonly=True)

    class Meta(AuthSurveyModelResource.Meta):
        queryset = Respondant.objects.all().order_by('-ts')
        filtering = {
            'survey': ALL_WITH_RELATIONS,
            'responses': ALL_WITH_RELATIONS
        }
        ordering = ['-ts']


class OptionResource(AuthSurveyModelResource):
    class Meta(AuthSurveyModelResource.Meta):
        always_return_data = True
        queryset = Option.objects.all().order_by('order')

    def save_m2m(self, bundle):
        pass


class PageResource(AuthSurveyModelResource):
    question = fields.ForeignKey('apps.survey.api.QuestionResource', 'question', related_name='question', full=True, null=True, blank=True)
    survey = fields.ForeignKey('apps.survey.api.SurveyResource', 'survey', related_name='survey', full=True, null=True, blank=True)

    class Meta(AuthSurveyModelResource.Meta):
        queryset = Page.objects.all()
        always_return_data = True

    def save_m2m(self, bundle):
        pass


class BlockResource(AuthSurveyModelResource):
    skip_question = fields.ToOneField('apps.survey.api.QuestionResource', 'skip_question', null=True, blank=True)

    class Meta(AuthSurveyModelResource.Meta):
        queryset = Block.objects.all()
        always_return_data = True


class QuestionResource(AuthSurveyModelResource):
    options = fields.ToManyField(OptionResource, 'options', full=True, null=True, blank=True)
    grid_cols = fields.ToManyField(OptionResource, 'grid_cols', full=True, null=True, blank=True)
    modalQuestion = fields.ToOneField('self', 'modalQuestion', full=True, null=True, blank=True)
    hoist_answers = fields.ToOneField('self', 'hoist_answers', full=True, null=True, blank=True)
    foreach_question = fields.ToOneField('self', 'foreach_question', full=True, null=True, blank=True)
    question_types = fields.DictField(attribute='question_types', readonly=True)
    report_types = fields.DictField(attribute='report_types', readonly=True)
    answer_domain = fields.ListField(attribute='answer_domain', readonly=True, null=True)
    filter_questions = fields.ToManyField('self', 'filter_questions', null=True, blank=True)
    skip_question = fields.ToOneField('self', 'skip_question', null=True, blank=True)
    blocks = fields.ToManyField('apps.survey.api.BlockResource', 'blocks', null=True, blank=True, full=True)

    class Meta(AuthSurveyModelResource.Meta):
        queryset = Question.objects.all()
        always_return_data = True
        filtering = {
            'slug': ALL,
            'surveys': ALL_WITH_RELATIONS
        }


class BaseSurveyResource(AuthSurveyModelResource):

    class Meta(AuthSurveyModelResource.Meta):
        detail_uri_name = 'slug'
        queryset = Survey.objects.all()
        always_return_data = True
        filtering = {
            'slug': ['exact']
        }

    def save_m2m(self, bundle):
        pass

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/(?P<slug>[\w\d_.-]+)/$" % self._meta.resource_name, self.wrap_view('dispatch_detail'), name="api_dispatch_detail"),
        ]


class SurveyResource(BaseSurveyResource):
    questions = fields.ToManyField(QuestionResource, 'questions', full=True, null=True, blank=True)


class SurveyDashResource(BaseSurveyResource):
    completes = fields.IntegerField(attribute='completes', readonly=True)
    survey_responses = fields.IntegerField(attribute='survey_responses', readonly=True)
    reviews_needed = fields.IntegerField(attribute='reviews_needed', readonly=True)
    flagged = fields.IntegerField(attribute='flagged', readonly=True)
    today = fields.IntegerField(attribute='today', readonly=True, null=True, blank=True)


class SurveyReportResource(SurveyDashResource):
    questions = fields.ToManyField(QuestionResource, 'questions', null=True, blank=True, full=True)
    activity_points = fields.IntegerField(attribute='activity_points', readonly=True)
    response_date_start = fields.DateField(attribute='response_date_start', readonly=True, null=True, blank=True)
    response_date_end = fields.DateField(attribute='response_date_end', readonly=True, null=True, blank=True)
