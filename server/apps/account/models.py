from django.db import models
from django.contrib.auth.models import User
from tastypie.models import create_api_key


class UserProfile(models.Model):
    user = models.ForeignKey(User, unique=True)

    def __str__(self):
        return "%s" % (self.user.username)

User.profile = property(lambda u: UserProfile.objects.get_or_create(user=u)[0])
models.signals.post_save.connect(create_api_key, sender=User)
