from tastypie.resources import ModelResource, ALL

from places.models import Place


class PlaceResource(ModelResource):

    class Meta:
        queryset = Place.objects.all().order_by("name")
        filtering = {
            'name': ['exact', 'startswith', 'endswith', 'icontains'],
            'state': ALL
        }
