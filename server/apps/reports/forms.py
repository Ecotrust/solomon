import datetime

from django import forms

from survey.models import REVIEW_STATE_CHOICES


class APIFilterForm(forms.Form):
    market = forms.CharField(required=False)
    status = forms.ChoiceField(choices=REVIEW_STATE_CHOICES, required=False)
    start_date = forms.DateTimeField(input_formats=('%Y-%m-%d',),
                                     required=False)
    end_date = forms.DateTimeField(input_formats=('%Y-%m-%d',),
                                   required=False)

    def clean_end_date(self):
        data = self.cleaned_data['end_date']
        if data is not None:
            data += datetime.timedelta(days=1)
        return data

    # Change 'empty value' of the field to None
    def clean(self):
        cleaned_data = super(APIFilterForm, self).clean()
        for key in cleaned_data.iterkeys():
            if key not in self.data:
                cleaned_data[key] = None
        return cleaned_data


class SurveyorStatsForm(APIFilterForm):
    surveyor = forms.IntegerField(required=False)


class GridStandardDeviationForm(APIFilterForm):
    col = forms.CharField(required=False)
    row = forms.CharField(required=False)
