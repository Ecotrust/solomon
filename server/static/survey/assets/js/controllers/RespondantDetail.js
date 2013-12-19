
// using jQuery
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

angular.module('askApp')
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.defaults.headers.patch = {
            'Content-Type': 'application/json;charset=utf-8',
            'X-CSRFToken': getCookie('csrftoken')
        }
    }])
    .controller('RespondantDetailCtrl', function($scope, $routeParams, $http, $location) {

    $scope.statuses = [];
    // We don't want to show a non-functioning back button if we have no url to go back to:
    $scope.filtered_list_url = $location.search().filtered_list_url ? atob(unescape($location.search().filtered_list_url)) : "";
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
        $scope.last_status = $scope.current_status;
        $scope.review_comment = data.review_comment;
    });

    $http.get('/api/v1/surveydash/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        // Need this for the sidenav
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


    //$scope.$watch('review_comment', function (newValue) {
    //    $scope.updateStatus(newValue);
    //}, false);

    //$scope.$watch('current_status', function (newValue) {
    //    $scope.updateStatus(newValue);
    //}, false);

    $scope.updateStatus = function() {
        $http({
            url: "/api/v1/reportrespondant/" + $scope.respondent.uuid + "/",
            data: { 'review_status': $scope.current_status[0], 'review_comment': $scope.review_comment },
            method: 'PATCH'
        }).success(function(data) {
            $scope.last_status = $scope.current_status;
        });
    }

    $scope.getResponseBySlug = function(slug) {
        var question = _.filter($scope.response.responses, function(item) {
            return item.question.slug === slug;
        });

        return _.first(question);
    }
});
