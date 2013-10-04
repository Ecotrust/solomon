//'use strict';

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams) {
  
    $scope.filter = null;

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            $scope.charts = [];
            var url = ['/reports/crosstab', $routeParams.surveySlug, 'survey-site', 'total-weight'].join('/');
                url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');;
                url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

            $http.get(url).success(function(data) {
                $scope.charts.push({
                    title: "Total Fish Weight by Market",
                    type: data.type,
                    labels: _.pluck(data.crosstab, 'name'),
                    data: _.pluck(data.crosstab, 'value'),
                    xLabel: 'Market',
                    yLabel: 'Total Weight (kg)',
                    order: 2
                });
                $scope.charts.sort(function (a,b) { return a-b;})
            });

            url = ['/reports/crosstab', $routeParams.surveySlug, 'province-purchased-caught', 'total-weight'].join('/');
                url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');
                url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

            $http.get(url).success(function(data) {
                $scope.charts.push({
                    title: "Total Fish Weight by Province",
                    type: data.type,
                    labels: _.pluck(data.crosstab, 'name'),
                    data: _.pluck(data.crosstab, 'value'),
                    xLabel: 'Province',
                    yLabel: 'Total Weight (kg)',
                    order: 3
                });
                $scope.charts.sort(function (a,b) { return a-b;})
            });    

            url = ['/reports/crosstab', $routeParams.surveySlug, 'survey-site', 'cost'].join('/');
                url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');
                url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

            $http.get(url).success(function(data) {
                console.log(data.type);
                $scope.charts.push({
                    labels: _.pluck(data.crosstab, 'name'),
                    seriesNames: data.seriesNames,
                    type: data.type,
                    data: data.crosstab,
                    xLabel: 'Market',
                    yLabel: 'Average Trip Costs',
                    order: 1
                });
                $scope.charts.sort(function (a,b) { return a-b;})
            });    

        }
        
    }, true);
    


    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        console.log($scope.survey);

        $scope.filter = {
            startDate: new Date($scope.survey.response_date_start),
            endDate: new Date($scope.survey.response_date_end).add(1).day(),
        }


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
        $http.get('/api/v1/reportrespondant/?format=json&limit=30&survey__slug__exact=' + $routeParams.surveySlug).success(function(data) {
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
