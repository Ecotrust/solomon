from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

import simplejson


@csrf_exempt
def authenticateUser(request):
    if request.POST:
        param = simplejson.loads(request.POST.keys()[0])
        # user = User.objects.get(username=param.get('username', None))
        user = authenticate(username=param.get('username', None),
                            password=param.get('password'))
        try:
            login(request, user)
        except:
            return HttpResponse("auth-error", status=500)

        if user:
            user_dict = {
                'username': user.username,
                'name': ' '.join([user.first_name, user.last_name]),
                'is_staff': user.is_staff,
                'api_key': user.api_key.key
            }
            return HttpResponse(simplejson.dumps({
                'success': True, 'user': user_dict
            }))
        else:
            return HttpResponse(simplejson.dumps({'success': False}))
    else:
        return HttpResponse("error", status=500)


@csrf_exempt
def createUser(request):
    if request.POST:
        param = simplejson.loads(request.POST.keys()[0])
        user, created = User.objects.get_or_create(
            username=param.get('username', None))
        if created:
            if param.get('password1') == param.get('password2'):
                user.set_password(param.get('password1'))
                user.save()
                user = authenticate(
                    username=user.username, password=param.get('password1'))
                login(request, user)
                user_dict = {
                    'username': user.username,
                    'name': ' '.join([user.first_name, user.last_name]),
                    'is_staff': user.is_staff,
                    'api_key': user.api_key.key
                }
                return HttpResponse(simplejson.dumps({'success': True, 'user': user_dict}))
        else:
            return HttpResponse("duplicate-user", status=500)
    else:
        return HttpResponse("error", status=500)


@csrf_exempt
def forgotPassword(request):
    if request.POST:
        return HttpResponse(simplejson.dumps({'success': True}))
    else:
        return HttpResponse("error", status=500)
