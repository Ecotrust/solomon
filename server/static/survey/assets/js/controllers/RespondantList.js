//'use strict';

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams) {
    $scope.filter = {
        startDate: Date.today().add(-365).days(),
        endDate:Date.today()
    }



    $scope.$watch('filter', function () {
        $scope.charts = [];
        var url = ['/reports/crosstab', $routeParams.surveySlug, 'market', 'total-volume'].join('/');
            url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');;
            url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

        $http.get(url).success(function(data) {
            $scope.charts.push({
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                xLabel: 'market',
                yLabel: 'total-volume'
            });
        });

        url = ['/reports/crosstab', $routeParams.surveySlug, 'source-province', 'total-volume'].join('/');
            url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');
            url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

        $http.get(url).success(function(data) {
            $scope.charts.push({
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                xLabel: 'source-province',
                yLabel: 'total-volume'
            });
        });
    }, true);
    


    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        console.log($scope.survey);

        _.each($scope.survey.questions, function (question) {
            // save a reference to filter questions which are specified by uri
            question.filters = {};
            if (question.visualize && question.filter_questions) {
                question.filterQuestions = [];
                _.each(question.filter_questions, function (filterQuestion) {
                    question.filterQuestions.push($scope.getQuestionByUri(filterQuestion));
                });

            }
        });
        

    }).success(function() {
        $http.get('/api/v1/reportrespondant/?format=json&limit=5&survey__slug__exact=' + $routeParams.surveySlug).success(function(data) {
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
        });
         
    });

    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
		return _.findWhere($scope.survey.questions, {'slug': slug});
    };
});
