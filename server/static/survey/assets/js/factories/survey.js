angular.module('askApp').factory('surveyShared', function($http, $routeParams) {
    return {
        survey : {},
        getSurvey: function(callback) {
            var self = this;
            if ($routeParams.surveySlug) {
                $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
                    self.survey = data;
                }).success(callback);
            }
        }
    }
});
