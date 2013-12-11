from django import forms

from survey.models import REVIEW_STATE_CHOICES


class SurveyorStatsForm(forms.Form):
    start_date = forms.DateTimeField(input_formats=('%Y-%m-%d',),
                                     required=False)
    end_date = forms.DateTimeField(input_formats=('%Y-%m-%d',),
                                   required=False)
    surveyor = forms.IntegerField(required=False)
    market = forms.CharField(required=False)
    status = forms.ChoiceField(choices=REVIEW_STATE_CHOICES, required=False)

    # Change 'empty value' of the field to None
    def clean_status(self):
        if 'status' not in self.data:
            return None
        return self.cleaned_data['status']

    # Change 'empty value' of the field to None
    def clean_market(self):
        if 'market' not in self.data:
            return None
        return self.cleaned_data['market']
