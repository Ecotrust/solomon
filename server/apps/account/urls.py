from django.conf.urls import patterns
from views import authenticateUser, createUser, forgotPassword


urlpatterns = patterns('',
    (r'^authenticateUser', authenticateUser),
    (r'^createUser', createUser),
    (r'^forgotPassword', forgotPassword),
)
