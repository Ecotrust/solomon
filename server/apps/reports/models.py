from django.db import models

import caching.base


class CSVRow(caching.base.CachingMixin, models.Model):
    json_data = models.TextField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
