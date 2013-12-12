
angular.module('askApp')
    .controller('RespondantDetailCtrl', function($scope, $routeParams, $http, $location) {

    $scope.statuses = [];
    $scope.current_status = "";
    $scope.filtered_list_url = atob($location.search().filtered_list_url);
    $scope.viewPath = app.viewPath;
    $http.get('/api/v1/reportrespondantdetails/'  + $routeParams.uuidSlug + '/?format=json&survey__slug=' + $routeParams.surveySlug).success(function(data) {
        //order responses to reflect the order in which they were presented in the survey
        data.responses = _.sortBy(data.responses, function(response) { return response.question.order; });
        _.each(data.responses, function (response) {

            response.answer_parsed = JSON.parse(response.answer_raw);
        });
        $scope.respondent = data;
        $scope.statuses = data.meta.statuses;
        $scope.current_status = _.reduce(data.meta.statuses,
            // Left fold 'cuz I'm dangerous
            function (accum, val) { return accum[0] == data.review_status ? accum : val; }, "");
    });

    $http.get('/api/v1/surveydash/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        $scope.survey = data;
    });

    $scope.uuid = $routeParams.uuidSlug;
    $scope.surveySlug = $routeParams.surveySlug;

    $scope.map = {
        center: {
            lat: 47,
            lng: -124
        },
        zoom: 7
    }

    $scope.updateStatus = function() {
        $http.patch("/api/v1/reportrespondant/" + $survey.uri).success(function(data) {
        });
    }

    $scope.getResponseBySlug = function(slug) {
        var question = _.filter($scope.response.responses, function(item) {
            return item.question.slug === slug;
        });

        return _.first(question);
    }
});
