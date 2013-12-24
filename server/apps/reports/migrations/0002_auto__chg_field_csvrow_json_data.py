# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'CSVRow.json_data'
        db.alter_column(u'reports_csvrow', 'json_data', self.gf('django.db.models.fields.TextField')(null=True))

    def backwards(self, orm):

        # Changing field 'CSVRow.json_data'
        db.alter_column(u'reports_csvrow', 'json_data', self.gf('django.db.models.fields.TextField')(default=''))

    models = {
        u'reports.csvrow': {
            'Meta': {'object_name': 'CSVRow'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'json_data': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['reports']