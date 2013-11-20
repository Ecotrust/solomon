from tastypie.resources import ModelResource

from django.contrib.auth.models import User


class UserResource(ModelResource):

    class Meta:
        queryset = User.objects.all()
        excludes = ['email', 'password', 'is_superuser']
