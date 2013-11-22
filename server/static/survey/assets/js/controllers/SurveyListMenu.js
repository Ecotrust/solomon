//'use strict';

angular.module('askApp')
    .controller('SurveyListMenuCtrl', function($scope, $http, $routeParams, $location) {

    $scope.confirmDelete = false;
    $scope.path = $location.path().slice(1,5);
    $scope.loaded=false;
    $scope.width = 0;
    $scope.updateSurveys = function () {
        $scope.hideSurveys = true;
        $scope.width = 0;
        $scope.timer = setInterval(function () {
            $scope.width = $scope.width + 10;
        }, 500);
        $http.get(app.server + '/api/v1/surveyreport/?format=json').success(function(data) {
            $scope.surveys = data.objects;
            _.each($scope.surveys, function (survey) {
                survey.updated_at = new Date();
            });
            app.surveys = $scope.surveys;
            $scope.saveState();
            $scope.hideSurveys = false;
            $scope.loaded = true;
            clearInterval($scope.timer);
        })

    }

    $scope.delete_survey = function (survey) {
        var survey_to_be_deleted = survey;
        $http({
            method: 'DELETE',
            url: survey.resource_uri,
            data: survey
        }).success(function (data) {
            $scope.surveys.splice(_.indexOf($scope.surveys,
                _.findWhere(
                    $scope.surveys,
                    { resource_uri: survey_to_be_deleted.resource_uri
                    }
                )
            ), 1);
        });
    };

    $scope.saveState = function () {
        // It seems that even referencing localStorage in ie7 kills everything. -QWP
        if (!$("html").is(".lt-ie8")) {
            localStorage.setItem('hapifish', JSON.stringify(app));
        }
    }

    if (app.user) {
        $scope.user = app.user;
    } else {
        $location.path('/');
    }

    if (app.surveys) {
        $scope.surveys = app.surveys;
    } else {
        $scope.updateSurveys();
    }
});
